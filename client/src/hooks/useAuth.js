import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { toast } from '../components/ui/toast';

export function useAuth() {
  const [usuario, setUsuario] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token armazenado no localStorage ao montar o componente
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');

    if (token && usuarioData) {
      try {
        const usuario = JSON.parse(usuarioData);
        setUsuario(usuario);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro ao recuperar dados do usuário:', error);
        logout();
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      const response = await authService.login(email, senha);
      
      // Armazenar token e dados do usuário
      localStorage.setItem('token', response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      
      setUsuario(response.usuario);
      setIsAuthenticated(true);
      toast.success('Login realizado com sucesso!');
      return true;
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer login');
      console.error('Erro ao fazer login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setIsAuthenticated(false);
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  return {
    usuario,
    isAuthenticated,
    loading,
    login,
    logout,
    getToken,
  };
}

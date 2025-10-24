import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { toast } from '../components/ui/toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');

    if (token && usuarioData) {
      try {
        const parsedUsuario = JSON.parse(usuarioData);
        setUsuario(parsedUsuario);
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

  const value = {
    usuario,
    isAuthenticated,
    loading,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}

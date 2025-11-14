import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { toast } from '../components/ui/toast';

const AuthContext = createContext(null);

// Limite de sessão em minutos (defina conforme necessário)
const SESSION_TIMEOUT_MINUTES = 120; // 2 horas

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionTimeoutRef = React.useRef(null);

  /**
   * Função para deslogar o usuário
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionExpiryTime');
    setUsuario(null);
    setIsAuthenticated(false);
    
    // Limpar timeout se houver
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
  };

  /**
   * Função para validar se o token expirou
   */
  const isSessionExpired = () => {
    const expiryTime = localStorage.getItem('sessionExpiryTime');
    if (!expiryTime) return false;
    
    const currentTime = new Date().getTime();
    return currentTime > parseInt(expiryTime);
  };

  /**
   * Função para configurar timeout de sessão
   */
  const setupSessionTimeout = () => {
    // Limpar timeout anterior se houver
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    // Configurar novo timeout
    sessionTimeoutRef.current = setTimeout(() => {
      logout();
      toast.error('Sua sessão expirou. Por favor, faça login novamente.');
    }, SESSION_TIMEOUT_MINUTES * 60 * 1000); // Converter para milissegundos
  };

  // Inicializar autenticação ao carregar a página
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');

    // Verificar se a sessão expirou
    if (isSessionExpired()) {
      logout();
      setLoading(false);
      return;
    }

    if (token && usuarioData) {
      try {
        const parsedUsuario = JSON.parse(usuarioData);
        setUsuario(parsedUsuario);
        setIsAuthenticated(true);
        setupSessionTimeout(); // Configurar novo timeout
      } catch (error) {
        console.error('Erro ao recuperar dados do usuário:', error);
        logout();
      }
    }

    setLoading(false);
  }, []);

  // Detectar quando a aba/janela perde o foco e volta
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Página foi minimizada ou aba perdeu foco
        return;
      } else {
        // Página voltou a ficar visível
        if (isSessionExpired()) {
          logout();
          toast.error('Sua sessão expirou. Por favor, faça login novamente.');
        } else if (isAuthenticated) {
          setupSessionTimeout(); // Reiniciar timeout
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Sincronizar login/logout entre abas
  useEffect(() => {
    const handleStorageChange = (event) => {
        // Só sincroniza se for uma mudança no token ou nos dados do usuário
        if (event.key === 'token' || event.key === 'usuario') {
            const token = localStorage.getItem('token');
            const usuarioData = localStorage.getItem('usuario');

            if (token && usuarioData) {
                // Se o token existe, sincroniza para logado
                try {
                    const parsedUsuario = JSON.parse(usuarioData);
                    setUsuario(parsedUsuario);
                    setIsAuthenticated(true);
                } catch {
                    // Se os dados estiverem corrompidos desloga
                    setUsuario(null);
                    setIsAuthenticated(false);
                }
            } else {
                // Se o token foi removido, desloga esta aba
                setUsuario(null);
                setIsAuthenticated(false);
            }
        }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email, senha) => {
    try {
      setLoading(true);
      const response = await authService.login(email, senha);

      const now = new Date().getTime();
      const expiryTime = now + SESSION_TIMEOUT_MINUTES * 60 * 1000;

      localStorage.setItem('token', response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      localStorage.setItem('sessionStartTime', now.toString());
      localStorage.setItem('sessionExpiryTime', expiryTime.toString());

      setUsuario(response.usuario);
      setIsAuthenticated(true);
      toast.success('Login realizado com sucesso!');
      
      setupSessionTimeout(); // Configurar timeout após login
      return true;
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer login');
      console.error('Erro ao fazer login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getToken = () => {
    // Verificar se a sessão expirou antes de retornar o token
    if (isSessionExpired()) {
      logout();
      return null;
    }
    return localStorage.getItem('token');
  };

  const value = {
    usuario,
    isAuthenticated,
    loading,
    login,
    logout,
    getToken,
    isSessionExpired,
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



import React, { useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from './ui/toast';

/**
 * Componente para proteger rotas baseado no tipo de usuário
 * @param {Object} props
 * @param {React.ReactElement} props.children - Componente a ser renderizado se tiver permissão
 * @param {string|string[]} props.requiredRole - Tipo(s) de usuário permitido(s) (ex: 'ADMIN', ['ADMIN', 'COORDENADOR'])
 * @param {Object} props.usuario - Objeto do usuário atual
 * @param {boolean} props.isAuthenticated - Se o usuário está autenticado
 * @param {string} props.redirectTo - URL para redirecionar se não tiver permissão (padrão: '/')
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  usuario, 
  isAuthenticated,
  redirectTo = '/' 
}) => {
  const location = useLocation();
  const toastShownRef = useRef(new Set());

  // Se não estiver autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se não tiver usuário, aguarda carregamento
  if (!usuario) {
    return null;
  }

  // Verifica se tem permissão
  const hasPermission = Array.isArray(requiredRole)
    ? requiredRole.includes(usuario.tipo)
    : usuario.tipo === requiredRole;

  // Se não tiver permissão, exibe toast e redireciona
  if (!hasPermission) {
    // Exibe o toast apenas uma vez por pathname
    if (!toastShownRef.current.has(location.pathname)) {
      toast.error('Acesso negado');
      toastShownRef.current.add(location.pathname);
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Se tiver permissão, renderiza o componente filho
  return children;
};

export default ProtectedRoute;


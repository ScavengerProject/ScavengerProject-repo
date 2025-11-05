import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TodasProvas from './pages/TodasProvas';
import AdminProvas from './pages/AdminProvas';
import AdminEquipes from './pages/AdminEquipes.jsx';
import GerenciarEquipe from './pages/GerenciarEquipes.jsx';
import InscricaoEquipes from './pages/InscricaoEquipes.jsx';
import SolicitarMigracao from './pages/SolicitarMigracao.jsx';
import AprovarMigracoes from './pages/AprovarMigracoes.jsx';
import AdminEmprestimos from './pages/AdminEmprestimos.jsx';
import { useToast } from './components/ui/toast';
import { ToastContainer } from './components/ui/ToastContainer';

function App() {
  const { usuario, isAuthenticated, loading, logout } = useAuth();
  const { toasts } = useToast();

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Login: se autenticado, manda para home */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Home protegida */}
        <Route
          path="/"
          element={isAuthenticated ? (
            <Home usuario={usuario} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )}
        />

        {/* Dashboard protegida - acessível a todos os usuários autenticados */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        {/* Todas as Provas - acessível a todos os usuários autenticados */}
        <Route
          path="/provas"
          element={isAuthenticated ? <TodasProvas /> : <Navigate to="/login" replace />}
        />

        {/* Rota para o Gerenciamento de Equipes (Admin) */}
        <Route
          path="/admin/equipes"
          element={
            isAuthenticated 
              ? (usuario.tipo === 'ADMIN' ? <AdminEquipes /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Admin Provas protegida (Admin) */}
        <Route
          path="/admin/provas"
          element={
            isAuthenticated 
              ? (usuario.tipo === 'ADMIN' ? <AdminProvas /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Rota para Gerenciamento da Própria Equipe (Coord) */}
        <Route 
          path="/minha-equipe" 
          element={isAuthenticated ? (usuario.tipo === 'COORDENADOR' ? (<GerenciarEquipe />) : 
            (<Navigate to="/" replace />)) : (<Navigate to="/login" replace />)} 
        />

        {/* Rota para Admin Empréstimos */}
        <Route
          path="/admin/emprestimos"
          element={
            isAuthenticated
              ? (usuario.tipo === 'ADMIN' ? <AdminEmprestimos /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />
        
        {/* Rota para Inscrição em Equipe (Aluno) */}
        <Route
          path="/inscricao-equipes"
          element={isAuthenticated ? (usuario.tipo === 'ALUNO' ? (<InscricaoEquipes />) :
            (<Navigate to="/" replace />)) : (<Navigate to="/login" replace />)}
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
        {/* Solicitar migração (qualquer autenticado não-admin tb pode; se quiser, deixe livre a todos) */}
        <Route
          path="/migracoes/solicitar"
          element={isAuthenticated ? <SolicitarMigracao /> : <Navigate to="/login" replace />}
        />

        {/* Aprovar migrações (somente coordenador) */}
        <Route
          path="/migracoes/pendentes"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <AprovarMigracoes /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
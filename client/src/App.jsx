import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login';
import CadastroUsuario from './pages/CadastroUsuario';
import Dashboard from './pages/Dashboard';
import TodasProvas from './pages/TodasProvas';
import MinhasInscricoes from './pages/MinhasInscricoes';
import AdminProvas from './pages/AdminProvas';
import AdminProvasAssociacoes from './pages/AdminProvasAssociacoes.jsx';
import AdminEquipes from './pages/AdminEquipes.jsx';
import GerenciarEquipe from './pages/GerenciarEquipes.jsx';
import InscricaoEquipes from './pages/InscricaoEquipes.jsx';
// import SolicitarMigracao from './pages/SolicitarMigracao.jsx';
// import AprovarMigracoes from './pages/AprovarMigracoes.jsx';
import AdminEmprestimos from './pages/AdminEmprestimos.jsx';
import AdminUsuarios from './pages/AdminUsuarios.jsx';
import AdminFeedbacks from './pages/AdminFeedbacks.jsx';
import MeusFeedbacks from './pages/MeusFeedbacks.jsx';
import Notificacoes from './pages/Notificacoes.jsx';
import Resultados from './pages/Resultados.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import { useToast } from './components/ui/toast';
import { ToastContainer } from './components/ui/ToastContainer';
import AdminPenalidades from './pages/AdminPenalidades.jsx';
import PenalidadesEquipe from "./pages/PenalidadesEquipe";
import CoordSolicitarEmprestimo from './pages/CoordSolicitarEmprestimo.jsx';
import AdminAprovarSolicitacoes from './pages/AdminAprovarSolicitacoes.jsx';
import CoordOferecerMembros from './pages/CoordOferecerMembros.jsx';
import CoordGerenciarOfertas from './pages/CoordGerenciarOfertas.jsx';
import CoordGerenciarEmprestimos from './pages/CoordGerenciarEmprestimos.jsx';
import CoordDefinirParticipacaoProva from './pages/CoordDefinirParticipacaoProva.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

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
        {/* Login: se autenticado, manda para dashboard */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Dashboard como página inicial */}
        <Route
          path="/"
          element={isAuthenticated ? (
            <Dashboard usuario={usuario} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )}
        />

        {/* Inscrição de Usuário: se autenticado, manda para dashboard */}
        <Route
          path="/inscricao"
          element={isAuthenticated ? <Navigate to="/" replace /> : <CadastroUsuario />}
        />


        {/* Todas as Provas - acessível a todos os usuários autenticados */}
        <Route
          path="/provas"
          element={isAuthenticated ? <TodasProvas /> : <Navigate to="/login" replace />}
        />

        {/* Minhas Inscrições - acessível a todos os usuários autenticados */}
        <Route
          path="/minhas-inscricoes"
          element={isAuthenticated ? <MinhasInscricoes /> : <Navigate to="/login" replace />}
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
            <ProtectedRoute
              requiredRole="ADMIN"
              usuario={usuario}
              isAuthenticated={isAuthenticated}
              redirectTo="/"
            >
              <AdminProvas />
            </ProtectedRoute>
          }
        />

        {/* Admin: Alunos associados a provas */}
        <Route
          path="/admin/provas/associacoes"
          element={
            <ProtectedRoute
              requiredRole="ADMIN"
              usuario={usuario}
              isAuthenticated={isAuthenticated}
              redirectTo="/"
            >
              <AdminProvasAssociacoes />
            </ProtectedRoute>
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

        {/* Rota para Admin Usuários */}
        <Route
          path="/admin/usuarios"
          element={
            isAuthenticated
              ? (usuario.tipo === 'ADMIN' ? <AdminUsuarios /> : <Navigate to="/" replace />)
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
        {/* <Route
          path="/migracoes/solicitar"
          element={isAuthenticated ? <SolicitarMigracao /> : <Navigate to="/login" replace />}
        /> */}

        {/* Aprovar migrações (somente coordenador) */}
        {/*<Route
          path="/migracoes/pendentes"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <AprovarMigracoes /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />*/}

        {/* Rota para Penalidades (Admin) */}
        <Route
          path="/admin/penalidades"
          element={
            isAuthenticated
              ? (usuario.tipo === 'ADMIN' ? <AdminPenalidades /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Rota para Penalidades (Equipe) */}
        <Route
          path="/equipes/penalidades"
          element={
            isAuthenticated
              ? (['COORDENADOR','ALUNO','PROFESSOR'].includes(usuario.tipo) ? <PenalidadesEquipe /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />



        {/* Rota para Gerenciamento de Feedbacks (Admin) */}
        <Route
          path="/admin/feedbacks"
          element={
            isAuthenticated 
              ? (usuario.tipo === 'ADMIN' ? <AdminFeedbacks /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />
        <Route
        path="/meus-feedbacks"
        element={isAuthenticated ? <MeusFeedbacks /> : <Navigate to="/login" replace />}
      />
        <Route
          path="/notificacoes"
          element={isAuthenticated ? <Notificacoes /> : <Navigate to="/login" replace />}
        />

        {/* Rotas para Sistema de Solicitação de Empréstimo */}
        
        {/* Coordenador: Solicitar empréstimo */}
        <Route
          path="/coord/solicitar-emprestimo"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <CoordSolicitarEmprestimo /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Coordenador: Gerenciar ofertas recebidas */}
        <Route
          path="/coord/solicitacoes-emprestimo/:solicitacaoId/ofertas"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <CoordGerenciarOfertas /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Coordenador: Ofertar membros para outras equipes */}
        <Route
          path="/coord/ofertar-membros"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <CoordOferecerMembros /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Coordenador: Gerenciar empréstimos ativos */}
        <Route
          path="/coord/gerenciar-emprestimos"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <CoordGerenciarEmprestimos /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Coordenador: Definir titulares/suplentes para prova */}
        <Route
          path="/coord/provas/participacao"
          element={
            isAuthenticated
              ? (usuario.tipo === 'COORDENADOR' ? <CoordDefinirParticipacaoProva /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Admin: Aprovar solicitações */}
        <Route
          path="/admin/aprovar-solicitacoes"
          element={
            isAuthenticated
              ? (usuario.tipo === 'ADMIN' ? <AdminAprovarSolicitacoes /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Resultados - Todos os usuários */}
        <Route
          path="/resultados"
          element={isAuthenticated ? <Resultados /> : <Navigate to="/login" replace />}
        />

        {/* Configurações - Todos os usuários */}
        <Route
          path="/configuracoes"
          element={isAuthenticated ? <Configuracoes /> : <Navigate to="/login" replace />}
        />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
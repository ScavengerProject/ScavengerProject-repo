import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import { useEscola } from './hooks/useEscola.jsx';
import { useGincana } from './hooks/useGincana.jsx';
import { useEquipe } from './hooks/useEquipe.jsx';
import Login from './pages/Login';
import CadastroUsuario from './pages/CadastroUsuario';
import Dashboard from './pages/Dashboard';
import TodasProvas from './pages/TodasProvas';
import MinhasInscricoes from './pages/MinhasInscricoes';
import AdminProvas from './pages/AdminProvas';
import AdminProvasAssociacoes from './pages/AdminProvasAssociacoes.jsx';
import AdminEquipes from './pages/AdminEquipes.jsx';
import GerenciarGincanas from './pages/GerenciarGincanas.jsx';
import GerenciarEscolas from './pages/GerenciarEscolas.jsx';
import GerenciarConvites from './pages/GerenciarConvites.jsx';
import AprovarVinculosEscola from './pages/AprovarVinculosEscola.jsx';
import ResgatarConvite from './pages/ResgatarConvite.jsx';
import AguardandoAprovacao from './pages/AguardandoAprovacao.jsx';
import SelecionarEscola from './pages/SelecionarEscola.jsx';
import SelecionarGincana from './pages/SelecionarGincana.jsx';
import SelecionarEquipe from './pages/SelecionarEquipe.jsx';
import GerenciarEquipe from './pages/GerenciarEquipes.jsx';
import InscricaoEquipes from './pages/InscricaoEquipes.jsx';
import SolicitarMigracao from './pages/solicitarMigracao.jsx';
import AprovarMigracoes from './pages/AprovarMigracoes.jsx';
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
import { ehAdmin, ehSuperAdmin } from './lib/perfis';

// Rotas que funcionam sem uma gincana escolhida: as próprias telas de seleção
// e a administração de escolas/gincanas — é nelas que o admin cria a primeira
// edição, então exigir uma gincana ali travaria o sistema num laço.
const ROTAS_SEM_GINCANA = [
  '/selecionar-escola',
  '/selecionar-gincana',
  '/admin/escolas',
  '/admin/gincanas',
  '/admin/convites',
  '/admin/vinculos-pendentes',
  // Vínculo PENDENTE: sem acesso à escola ainda, então não há gincana para
  // escolher (ver codigo VINCULO_PENDENTE em services/api.js).
  '/aguardando-aprovacao',
  // Resgatar convite não depende da gincana ativa — e exigir uma trancaria
  // justamente quem mais precisa da tela: o aluno que troca de escola na virada
  // do ano, quando a única gincana da escola de origem já está ENCERRADA e não
  // há nada selecionável em /selecionar-gincana.
  '/convites/resgatar',
];

// Rotas que funcionam sem uma EQUIPE escolhida. Participar de uma gincana vem de
// EquipeMembros, então quem não está em nenhuma equipe leva 403
// SEM_EQUIPE_NA_GINCANA em qualquer outra rota — inclusive '/' — e não tem o que
// fazer no sistema até resolver isso. Tudo que dispensa gincana também dispensa
// equipe, mais a própria tela de escolha.
//
// '/inscricao-equipes' NÃO entra aqui de propósito: ela monta o MainLayout
// (sidebar + notificações a cada 30s) e cada um desses pedidos volta 403,
// recarregando a página em laço. Quem está sem equipe usa /selecionar-equipe, que
// oferece a mesma inscrição sem o layout.
const ROTAS_SEM_EQUIPE = [...ROTAS_SEM_GINCANA, '/selecionar-equipe'];

// Tela de espera usada tanto na inicialização da sessão quanto enquanto o
// escopo (escola/gincana) ainda está sendo resolvido.
const TelaCarregando = () => (
  <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg font-semibold">Carregando...</p>
    </div>
  </div>
);

function App() {
  const { usuario, isAuthenticated, loading, logout } = useAuth();
  const {
    precisaSelecionarEscola,
    escolaAtivaId,
    carregado: escolaCarregada,
  } = useEscola();
  const {
    precisaSelecionarGincana,
    gincanaAtivaId,
    carregado: gincanaCarregada,
  } = useGincana();
  const {
    precisaSelecionarEquipe,
    podeVerSelecaoEquipe,
    carregado: equipeCarregada,
  } = useEquipe();
  const location = useLocation();
  const { toasts } = useToast();

  // SUPER_ADMIN (multi-escola) tem acesso a tudo que o ADMIN tem, restrito à
  // escola ativa pelo backend. Espelha o comportamento de autorizar() na API.
  const isAdmin = ehAdmin(usuario);
  const isSuperAdmin = ehSuperAdmin(usuario);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return <TelaCarregando />;
  }

  // Nenhuma tela pode montar antes de o escopo estar resolvido: as páginas
  // disparam requisições no mount, e sem os headers X-Escola-Id/X-Gincana-Id
  // corretos elas levariam 400/404 e jogariam o usuário para fora da rota.
  if (
    isAuthenticated
    && (!escolaCarregada
      || (escolaAtivaId && !gincanaCarregada)
      || (gincanaAtivaId && !equipeCarregada))
  ) {
    return <TelaCarregando />;
  }

  // Escopo obrigatório antes de qualquer tela: primeiro a escola (que define o
  // papel do usuário), depois a gincana. Só entra em ação quando o provider já
  // carregou a lista e concluiu que falta escolher.
  if (isAuthenticated && precisaSelecionarEscola && location.pathname !== '/selecionar-escola') {
    return <Navigate to="/selecionar-escola" replace />;
  }

  if (
    isAuthenticated
    && !precisaSelecionarEscola
    && precisaSelecionarGincana
    && !ROTAS_SEM_GINCANA.includes(location.pathname)
  ) {
    return <Navigate to="/selecionar-gincana" replace />;
  }

  // Terceira etapa do escopo: a equipe. Sem ela, um perfil não-admin não
  // consegue abrir NENHUMA tela da gincana (403 em todas), então ele fica preso
  // em /selecionar-equipe — com a opção de sair — em vez de entrar no dashboard
  // e ser expulso de volta pela primeira requisição que falha.
  if (
    isAuthenticated
    && !precisaSelecionarEscola
    && !precisaSelecionarGincana
    && precisaSelecionarEquipe
    && !ROTAS_SEM_EQUIPE.includes(location.pathname)
  ) {
    return <Navigate to="/selecionar-equipe" replace />;
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

        {/* Seleção de escola: qual tenant o usuário vai acessar (e com que papel) */}
        <Route
          path="/selecionar-escola"
          element={
            isAuthenticated
              ? (precisaSelecionarEscola ? <SelecionarEscola /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Seleção de gincana dentro da escola ativa */}
        <Route
          path="/selecionar-gincana"
          element={isAuthenticated ? <SelecionarGincana /> : <Navigate to="/login" replace />}
        />

        {/* Escolha obrigatória da equipe dentro da gincana ativa. Só devolve
            para o app quem SABIDAMENTE tem equipe (ou é ADMIN) — e não
            `!precisaSelecionarEquipe`, que também é falso quando a consulta do
            vínculo falhou. Nesse estado as telas normais respondem 403 e o
            api.js manda todo mundo para cá: se aqui devolvêssemos para '/', a
            página rebateria entre as duas recarregando sem parar. */}
        <Route
          path="/selecionar-equipe"
          element={
            isAuthenticated
              ? (podeVerSelecaoEquipe ? <SelecionarEquipe /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Gerenciamento de Escolas (apenas SUPER_ADMIN) */}
        <Route
          path="/admin/escolas"
          element={
            isAuthenticated
              ? (isSuperAdmin ? <GerenciarEscolas /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Gerenciamento de Convites (ADMIN da escola ativa) */}
        <Route
          path="/admin/convites"
          element={
            isAuthenticated
              ? (isAdmin ? <GerenciarConvites /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Vínculos pendentes: cadastro sem código de turma + transferências (ADMIN) */}
        <Route
          path="/admin/vinculos-pendentes"
          element={
            isAuthenticated
              ? (isAdmin ? <AprovarVinculosEscola /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Tela de espera do vínculo PENDENTE (ver codigo VINCULO_PENDENTE) */}
        <Route
          path="/aguardando-aprovacao"
          element={isAuthenticated ? <AguardandoAprovacao /> : <Navigate to="/login" replace />}
        />

        {/* Resgate de código de convite por quem já tem conta (ex.: aluno
            mudando de escola). NÃO entra em ROTAS_SEM_GINCANA: diferente das
            telas de seleção/administração, quem chega aqui já tem escola e
            gincana ativas — é uma ação extra dentro da sessão normal, não
            uma etapa de resolução de escopo. */}
        <Route
          path="/convites/resgatar"
          element={
            isAuthenticated
              ? (usuario.tipo === 'ALUNO' ? <ResgatarConvite /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Gerenciamento de Gincanas (Admin) */}
        <Route
          path="/admin/gincanas"
          element={
            isAuthenticated
              ? (isAdmin ? <GerenciarGincanas /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Rota para o Gerenciamento de Equipes (Admin) */}
        <Route
          path="/admin/equipes"
          element={
            isAuthenticated 
              ? (isAdmin ? <AdminEquipes /> : <Navigate to="/" replace />)
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
              ? (isAdmin ? <AdminEmprestimos /> : <Navigate to="/" replace />)
              : <Navigate to="/login" replace />
          }
        />

        {/* Rota para Admin Usuários */}
        <Route
          path="/admin/usuarios"
          element={
            isAuthenticated
              ? (isAdmin ? <AdminUsuarios /> : <Navigate to="/" replace />)
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

        {/* Rota para Penalidades (Admin) */}
        <Route
          path="/admin/penalidades"
          element={
            isAuthenticated
              ? (isAdmin ? <AdminPenalidades /> : <Navigate to="/" replace />)
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
              ? (isAdmin ? <AdminFeedbacks /> : <Navigate to="/" replace />)
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
              ? (isAdmin ? <AdminAprovarSolicitacoes /> : <Navigate to="/" replace />)
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
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Trophy, Users, Bell, TrendingUp, Settings, LogOut, Calendar, Target, Award, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { provasService, equipesService } from "../services/api";
import { toast } from "../components/ui/toast";
import ProvaDetalhesModal from "../components/ProvaDetalhesModal";
import FeedbackFAB from '../components/EnviarFeedbackModal';


const Dashboard = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [provas, setProvas] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [minhaEquipe, setMinhaEquipe] = useState(null);
  const [usuarioEquipeId, setUsuarioEquipeId] = useState(null);
  const [provaSelecionada, setProvaSelecionada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar provas
      const provasData = await provasService.listar();
      setProvas(provasData || []);

      // Carregar equipes
      if (usuario?.tipo === 'ADMIN') {
        const equipesData = await equipesService.listarEquipes();
        setEquipes(equipesData || []);
      } else {
        const equipesData = await equipesService.listarEquipesParaInscricao();
        setEquipes(equipesData || []);
        const minha = equipesData.find(eq => eq.isMinhaEquipe);
        setMinhaEquipe(minha || null);
      }
      const rankingData = await equipesService.visualizarRanking();
        setRanking(rankingData || []);

      if (usuario) {
            try {
                const equipeData = await equipesService.buscarMinhaEquipeId();
                setUsuarioEquipeId(equipeData.equipe_id);
            } catch (error) {
                if (error.message && error.message.includes('não está alocado')) {
                    setUsuarioEquipeId(null);
                } else {
                    console.error("Erro ao buscar equipe do usuário:", error);
                }
            }
        }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const abrirDetalhesProva = (prova) => {
    setProvaSelecionada(prova);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setProvaSelecionada(null);
  };

  const handleInscricaoSucesso = () => {
    // Recarregar dados após inscrição bem-sucedida
    carregarDados();
  };

  // Calcular estatísticas
  const provasAtivas = provas.filter(p => p.status === 'EM_ANDAMENTO').length;
  const provasNaoIniciadas = provas.filter(p => p.status === 'NAO_INICIADA').length;
  const provasConcluidas = provas.filter(p => p.status === 'CONCLUIDA').length;

  const [ranking, setRanking] = useState([]);
/*
  // Ordenar equipes por pontuação
  const equipesOrdenadas = [...equipes].sort((a, b) => 
    (b.pontos_acumulados || 0) - (a.pontos_acumulados || 0)
  );*/

  const rankingExibicao = ranking;

  // Filtrar provas disponíveis para o usuário
  const provasDisponiveis = provas.filter(prova => {
    // Se for admin, mostrar todas
    if (usuario?.tipo === 'ADMIN') return true;

    // Verificar se há cotas disponíveis (requisito_usuario)
    const requisitos = prova.requisito_usuario || {};
    
    // Se não há requisitos definidos ou todos são 0, a prova não está disponível
    const temCotas = Object.values(requisitos).some(cota => {
      const valor = Number(cota);
      return !isNaN(valor) && valor > 0;
    });

    if (!temCotas) return false;

    // Verificar elegibilidade por turma (se configurado)
    const elegibilidade = prova.criterio_elegibilidade || {};
    const turmasPermitidas = elegibilidade.turmas_permitidas || [];
    
    // Se há turmas específicas permitidas, verificar se o usuário está nelas
    if (turmasPermitidas.length > 0 && usuario?.turma) {
      if (!turmasPermitidas.includes(usuario.turma)) {
        return false;
      }
    }

    return true;
  });

  // Próximas provas (não iniciadas ou em andamento, ordenadas por data)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const proximasProvas = provasDisponiveis
    .filter(p => {
      if (!['NAO_INICIADA', 'EM_ANDAMENTO'].includes(p.status)) return false;
      
      // Verificar se a data de início é hoje ou no futuro
      const dataInicio = new Date(p.data_inicio);
      return dataInicio >= hoje || p.status === 'EM_ANDAMENTO';
    })
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
    .slice(0, 5);

  // Formatar data
  const formatarData = (data) => {
    if (!data) return "Data não definida";
    const date = new Date(data);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) return "Data inválida";
    
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Comparar apenas as datas (sem hora)
    const dataStr = date.toDateString();
    const hojeStr = hoje.toDateString();
    const amanhaStr = amanha.toDateString();

    if (dataStr === hojeStr) return "Hoje";
    if (dataStr === amanhaStr) return "Amanhã";
    
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Traduzir status
  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: "Não iniciada",
      EM_ANDAMENTO: "Em andamento",
      CONCLUIDA: "Concluída",
    };
    return statusMap[status] || status;
  };

  // Traduzir formato
  const traduzirFormato = (formato) => {
    const formatoMap = {
      QUESTIONARIO_ONLINE: "Questionário Online",
      PROVA_PRATICA: "Prova Prática",
      PROVA_ESCRITA: "Prova Escrita",
    };
    return formatoMap[formato] || formato;
  };

  // Stats baseados no tipo de usuário
  const getStats = () => {
    if (usuario?.tipo === 'ADMIN') {
      return [
        {
          title: "Provas Ativas",
          description: `${provasNaoIniciadas} não iniciadas`,
          icon: Trophy,
          value: provasAtivas.toString(),
          color: "text-blue-600",
        },
        {
          title: "Total de Provas",
          description: `${provasConcluidas} concluídas`,
          icon: Target,
          value: provas.length.toString(),
          color: "text-green-600",
        },
        {
          title: "Equipes Cadastradas",
          description: `${equipes.length} equipes participando`,
          icon: Users,
          value: equipes.length.toString(),
          color: "text-purple-600",
        },
        {
          title: "Ranking",
          description: ranking[0]?.nome || "Nenhuma equipe",
          icon: Award,
          value: "1º",
          color: "text-yellow-600",
        },
      ];
    } else {

      let minhaPosicao = "---";
      let indexPosicao = -1; // Guardar o índice

      // Garantir que os dados existem antes de procurar
      if (usuarioEquipeId && ranking && ranking.length > 0) {
        indexPosicao = ranking.findIndex(eq => eq.equipe_id === usuarioEquipeId);
        
        if (indexPosicao !== -1) {
          minhaPosicao = `${indexPosicao + 1}º`;
        }
      }


      // 2. Encontrar os DADOS da minha equipe (nome, pontos)
      const minhaEquipeInfo = (indexPosicao !== -1) ? ranking[indexPosicao] : null;


      // Para alunos, professores, coordenadores, pais
      return [
        {
          title: minhaEquipeInfo ? "Minha Equipe" : "Sem Equipe",
          value: minhaEquipeInfo?.nome || "---", // Retirei os pontos para os alunos n saberem
          icon: Users,
          color: minhaEquipeInfo ? "text-blue-600" : "text-gray-400",
        },
        {
          title: "Provas Ativas",
          description: `${provasAtivas} provas em andamento`,
          icon: Trophy,
          value: provasAtivas.toString(),
          color: "text-green-600",
        },
        {
          title: "Próximas Provas",
          description: `${provasNaoIniciadas} provas programadas`,
          icon: Calendar,
          value: provasNaoIniciadas.toString(),
          color: "text-purple-600",
        },
        {
          title: usuarioEquipeId ? "Posição no Ranking" : "Ranking Geral",
          description: usuarioEquipeId 
            ? `Entre ${ranking.length} equipes`
            : "Participe de uma equipe",
          icon: Award,
          value: minhaPosicao,
          color: "text-yellow-600",
        },
      ];
    }
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Gincana</h1>
          <div className="flex items-center gap-3">
            {usuario?.tipo === 'ADMIN' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/provas")}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Provas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/equipes")}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Equipes
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="border-gray-300 hover:bg-gray-100"
            >
              Voltar à Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Olá, {usuario?.nome}! 👋
          </h2>
          <p className="text-gray-600">
            {usuario?.tipo === 'ADMIN' 
              ? 'Acompanhe o andamento da gincana em tempo real'
              : minhaEquipe
                ? `Você faz parte da equipe ${minhaEquipe.nome}`
                : 'Inscreva-se em uma equipe para participar das provas'
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <CardDescription className="text-xs text-gray-600">
                      {stat.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Próximas Provas */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Próximas Provas</CardTitle>
                  <CardDescription className="text-gray-600">
                    {proximasProvas.length > 0 
                      ? 'Programadas para os próximos dias'
                      : 'Nenhuma prova programada no momento'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proximasProvas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma prova programada</p>
                    </div>
                  ) : (
                    <>
                      {proximasProvas.map((prova) => (
                        <div 
                          key={prova._id} 
                          onClick={() => abrirDetalhesProva(prova)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                            prova.status === 'EM_ANDAMENTO' 
                              ? 'bg-green-50 border border-green-200 hover:bg-green-100 hover:shadow-md' 
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:shadow-md'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{prova.titulo}</p>
                            <p className="text-sm text-gray-600">
                              {traduzirFormato(prova.formato)} • {formatarData(prova.data_inicio)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {traduzirStatus(prova.status)}
                            </p>
                          </div>
                          {prova.status === 'EM_ANDAMENTO' && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      ))}
                      {provasDisponiveis.length > 5 && (
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 hover:bg-gray-100 text-gray-900"
                          onClick={() => navigate('/provas')}
                        >
                          Ver todas as {provasDisponiveis.length} provas disponíveis
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Ranking de Equipes */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Ranking de Equipes</CardTitle>
                  <CardDescription className="text-gray-600">
                    {rankingExibicao.length > 0 
                      ? 'Classificação atual'
                      : 'Nenhuma equipe cadastrada'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rankingExibicao.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma equipe cadastrada</p>
                    </div>
                  ) : (
                    rankingExibicao.slice(0, 5).map((equipe, index) => (
                      <div 
                        key={equipe.equipe_id} // Agora usa equipe_id da API de ranking
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                            usuarioEquipeId && equipe.equipe_id === usuarioEquipeId                            
                            ? 'bg-blue-50 border-blue-200' 
                            : index === 0
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-lg ${
                            index === 0 ? 'text-yellow-600' : 'text-gray-900'
                          }`}>
                            {index + 1}º
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {equipe.nome} {/* ✅ Usa apenas o nome */}
                            </p>
                            {usuario?.tipo === "ADMIN" && (
                                  <p className="text-sm text-gray-600">
                                    {equipe.pontos || 0} pontos
                              </p>
                            )}
                          </div>
                        </div>
                        {index === 0 && <Trophy className="h-5 w-5 text-yellow-600" />}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      {/* Modal de Detalhes da Prova */}
      <ProvaDetalhesModal 
        prova={provaSelecionada}
        isOpen={modalAberto}
        onClose={fecharModal}
        onInscricaoSucesso={handleInscricaoSucesso}
      />
      <FeedbackFAB />
    </div>
  );
};

export default Dashboard;

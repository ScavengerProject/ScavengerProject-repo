import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Trophy, Users, Calendar, Target, Award, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { provasService, equipesService } from "../services/api";
import { toast } from "../components/ui/toast";
import ProvaDetalhesModal from "../components/ProvaDetalhesModal";
import InfosEquipeModal from "../components/InfosEquipeModal";
import MainLayout from "../components/MainLayout"; 

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
  const [InfosEquipeModalOpen, setInfosEquipeModalOpen] = useState(false);
  const [equipeSelecionada, setequipeSelecionada] = useState(null);

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
      const rankingResponse = await equipesService.visualizarRanking();
        // A resposta agora vem como { ranking: [...], mostrar_notas: boolean, is_admin: boolean }
        const rankingData = rankingResponse?.ranking || rankingResponse || [];
        setRanking(rankingData);

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


  const abrirDetalhesProva = (prova) => {
    setProvaSelecionada(prova);
    setModalAberto(true);
  };

  const abrirInfosEquipeModal = (minhaEquipe) => {
    setequipeSelecionada(minhaEquipe);
    setInfosEquipeModalOpen(true);
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
  
  const provasNaoConcluidas = provasDisponiveis
    .filter(p =>
      p.status !== 'CONCLUIDA')
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio)); // Ordena por data

// ✅ CÁLCULO DAS PRÓXIMAS PROVAS (O que será exibido no cartão):
    const provasExibicao = provasNaoConcluidas.slice(0, 5);
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

    const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (dataStr === hojeStr) return `Hoje, ${hora}`;
    if (dataStr === amanhaStr) return `Amanhã, ${hora}`;

    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
         // Usar a posição do backend que já considera empates
         const minhaEquipeNoRanking = ranking[indexPosicao];
         minhaPosicao = `${minhaEquipeNoRanking.posicao}º`;
       }
     }


      // 2. Encontrar os DADOS da minha equipe (nome, pontos)
     const minhaEquipeInfo = (indexPosicao !== -1) ? ranking[indexPosicao] : null;

      // Usar minhaEquipeInfo do ranking como fonte de verdade
      const equipeSelecionadaInfo = minhaEquipeInfo || minhaEquipe;

      // Para alunos, professores, coordenadores, pais
      return [
        {
          title: equipeSelecionadaInfo ? "Minha Equipe" : "Sem Equipe",
          description: equipeSelecionadaInfo 
            ? (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirInfosEquipeModal(equipeSelecionadaInfo)} 
                    className={`p-0 h-auto text-sm font-semibold text-gray-700 hover:bg-transparent`}
                >
                    Ver informações
                </Button>
            )
            : "Inscreva-se em uma equipe",
          value: equipeSelecionadaInfo?.nome || "---", // Retirei os pontos para os alunos n saberem
          icon: Users,
          color: equipeSelecionadaInfo ? "text-blue-600" : "text-gray-400",
          /*style: equipeSelecionadaInfo 
            ? { backgroundColor: `${equipeSelecionadaInfo.cor}20` } 
            : {},*/
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
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Olá, {usuario?.nome}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {usuario?.tipo === 'ADMIN' 
              ? 'Acompanhe o andamento da gincana em tempo real'
              : minhaEquipe
                ? `Confira o desempenho da sua equipe e as próximas provas.`
                : 'Inscreva-se em uma equipe para participar das provas'
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {stats.map((stat, index) => (
                <Card key={index} style={index === 0 ? stat.style : {}}
                  className={`bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:pb-2">
                    <CardTitle className="text-sm sm:text-base font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-6 w-6 sm:h-5 sm:w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-3xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">
                      {stat.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Próximas Provas */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl text-gray-900">Andamento das Provas</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">
                    {provasNaoConcluidas.length > 0 
                      ? 'Provas programadas, em andamento e concluídas'
                      : 'Nenhuma prova programada no momento'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                  {provasNaoConcluidas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm sm:text-base">Nenhuma prova programada</p>
                    </div>
                  ) : (
                    <>
                      {provasNaoConcluidas.map((prova) => (
                        <div 
                          key={prova._id} 
                          onClick={() => abrirDetalhesProva(prova)}
                          className={`flex items-center justify-between p-3 sm:p-4 rounded-lg cursor-pointer transition-all gap-2 ${
                            prova.status === 'EM_ANDAMENTO' 
                              ? 'bg-green-50 border border-green-200 hover:bg-green-100 hover:shadow-md' 
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:shadow-md'
                          }`}
                        >
                          <div className="overflow-hidden flex-1">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">{prova.titulo}</p>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">
                              {traduzirFormato(prova.formato)} • {formatarData(prova.data_inicio)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {traduzirStatus(prova.status)}
                            </p>
                          </div>
                          {prova.status === 'EM_ANDAMENTO' && (
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 shrink-0" />
                          )}
                        </div>
                      ))}
                      {provasDisponiveis.length > provasExibicao.length && (
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 h-11 sm:h-10 text-base sm:text-sm"
                          onClick={() => navigate('/provas')}
                        >
                          Ver todas as provas disponíveis
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Ranking de Equipes */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl text-gray-900">Ranking de Equipes</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600">
                    {rankingExibicao.length > 0 
                      ? 'Classificação atual'
                      : 'Nenhuma equipe cadastrada'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                  {rankingExibicao.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm sm:text-base">Nenhuma equipe cadastrada</p>
                    </div>
                  ) : (
                    rankingExibicao.slice(0, 5).map((equipe, index) => {
                      const isPrimeiroLugar = equipe.posicao === 1;
                      return (
                      <div 
                        key={equipe.equipe_id} // Agora usa equipe_id da API de ranking
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border gap-2 ${
                            usuarioEquipeId && equipe.equipe_id === usuarioEquipeId                            
                            ? 'bg-blue-50 border-blue-200' 
                            : isPrimeiroLugar
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                          <span className={`font-bold text-lg sm:text-xl shrink-0 ${
                            isPrimeiroLugar ? 'text-yellow-600' : 'text-gray-900'
                          }`}>
                            {equipe.posicao}º
                          </span>
                          <div className="overflow-hidden flex-1">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                              {equipe.nome}
                            </p>
                            {/* Admin sempre vê as notas, outros usuários só se a configuração permitir */}
                            {(usuario?.tipo === 'ADMIN' || equipe.pontos !== undefined) && (
                              <p className="text-xs sm:text-sm text-gray-600">
                                {equipe.pontos !== undefined ? equipe.pontos : 0} pontos
                              </p>
                            )}
                          </div>
                        </div>
                        {isPrimeiroLugar && <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 shrink-0" />}
                      </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalhes da Prova */}
      <ProvaDetalhesModal 
        prova={provaSelecionada}
        isOpen={modalAberto}
        onClose={fecharModal}
        onInscricaoSucesso={handleInscricaoSucesso}
      />
      <InfosEquipeModal
        equipe={equipeSelecionada}
        isOpen={InfosEquipeModalOpen}
        onClose={() => setInfosEquipeModalOpen(false)}
      />
    </MainLayout>
  );
};

export default Dashboard;

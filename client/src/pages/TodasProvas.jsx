import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Filter, CheckCircle2, Clock, XCircle, AlertCircle, Award } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { provasService, equipesService, resultadosService } from "../services/api";
import { toast } from "../components/ui/toast";
import ProvaDetalhesModal from "../components/ProvaDetalhesModal";
import MainLayout from "../components/MainLayout";

const TodasProvas = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  useEffect(() => {
    carregarProvas();
  },[usuario]);

  const carregarProvas = async () => {
    try {
      setLoading(true);
      const provasData = await provasService.listar();
      setProvas(provasData || []);
    } catch (error) {
      console.error("Erro ao carregar provas:", error);
      toast.error("Erro ao carregar provas");
    } finally {
      setLoading(false);
    }
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
    // Recarregar provas após inscrição bem-sucedida
    carregarProvas();
  };

  // Filtrar provas disponíveis para o usuário
  const provasDisponiveis = provas.filter(prova => {
    // Se for admin, mostrar todas
    if (usuario?.tipo === 'ADMIN') return true;

    // Verificar se há cotas disponíveis (requisito_usuario)
    const requisitos = prova.requisito_usuario || {};
    const temCotas = Object.values(requisitos).some(cota => {
      const valor = Number(cota);
      return !isNaN(valor) && valor > 0;
    });

    if (!temCotas) return false;

    // Verificar elegibilidade por turma (se configurado)
    const elegibilidade = prova.criterio_elegibilidade || {};
    const turmasPermitidas = elegibilidade.turmas_permitidas || [];
    
    if (turmasPermitidas.length > 0 && usuario?.turma) {
      if (!turmasPermitidas.includes(usuario.turma)) {
        return false;
      }
    }

    return true;
  });

  // Aplicar filtro de status
  const provasFiltradas = filtroStatus === 'TODOS' 
    ? provasDisponiveis 
    : provasDisponiveis.filter(p => p.status === filtroStatus);

  // Ordenar por data de início
  const provasOrdenadas = [...provasFiltradas].sort((a, b) => 
    new Date(b.data_inicio) - new Date(a.data_inicio)
  );

  // Formatar data
  const formatarData = (data) => {
    if (!data) return "Data não definida";
    const date = new Date(data);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Traduzir status
  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: { label: "Não iniciada", color: "bg-gray-100 text-gray-800", icon: Clock },
      EM_ANDAMENTO: { label: "Em andamento", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      CONCLUIDA: { label: "Concluída", color: "bg-blue-100 text-blue-800", icon: XCircle },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800", icon: Clock };
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
  // Traduir pontuação
  const formatarPontuacao = (pontuacao) => {
    if (!pontuacao || Object.keys(pontuacao).length === 0) {
      return null; // Não mostra nada se não estiver configurado
    }

    // Tipo Proporcional
    if (pontuacao.pontos_por_unidade && pontuacao.nome_unidade) {
      return `${pontuacao.pontos_por_unidade} pts por ${pontuacao.nome_unidade}`;
    }

    // Tipo Ranking (1º, 2º, 3º)
    const posicoes = [];
    if (pontuacao["1"]) posicoes.push(`1º: ${pontuacao["1"]} pts`);
    if (pontuacao["2"]) posicoes.push(`2º: ${pontuacao["2"]} pts`);
    if (pontuacao["3"]) posicoes.push(`3º: ${pontuacao["3"]} pts`);

    if (posicoes.length > 0) {
      return posicoes.join(' | ');
    }

    return null; // Nenhum formato conhecido
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Todas as Provas</h2>
          <p className="text-gray-600">
            {usuario?.tipo === 'ADMIN' 
              ? `Visualizando todas as ${provas.length} provas cadastradas`
              : `${provasDisponiveis.length} provas disponíveis para você`
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando provas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
              </div>
              <Button
                variant={filtroStatus === 'TODOS' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('TODOS')}
                className={filtroStatus === 'TODOS' ? 'bg-blue-600 text-white' : 'border-gray-300'}
              >
                Todas ({provasDisponiveis.length})
              </Button>
              <Button
                variant={filtroStatus === 'EM_ANDAMENTO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('EM_ANDAMENTO')}
                className={filtroStatus === 'EM_ANDAMENTO' ? 'bg-green-600 text-white' : 'border-gray-300'}
              >
                Em Andamento ({provasDisponiveis.filter(p => p.status === 'EM_ANDAMENTO').length})
              </Button>
              <Button
                variant={filtroStatus === 'NAO_INICIADA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('NAO_INICIADA')}
                className={filtroStatus === 'NAO_INICIADA' ? 'bg-gray-600 text-white' : 'border-gray-300'}
              >
                Não Iniciadas ({provasDisponiveis.filter(p => p.status === 'NAO_INICIADA').length})
              </Button>
              <Button
                variant={filtroStatus === 'CONCLUIDA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('CONCLUIDA')}
                className={filtroStatus === 'CONCLUIDA' ? 'bg-blue-600 text-white' : 'border-gray-300'}
              >
                Concluídas ({provasDisponiveis.filter(p => p.status === 'CONCLUIDA').length})
              </Button>
            </div>

            {/* Lista de Provas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {provasOrdenadas.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 text-lg">Nenhuma prova encontrada com este filtro</p>
                </div>
              ) : (
                provasOrdenadas.map((prova) => {
                  const statusInfo = traduzirStatus(prova.status);
                  const StatusIcon = statusInfo.icon;
                  const pontuacaoFormatada = formatarPontuacao(prova.pontuacao);

                  return (
                    <Card
                      key={prova._id}
                      onClick={() => abrirDetalhesProva(prova)}
                      className="bg-white border-gray-200 shadow-md hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg text-gray-900 flex-1 pr-2">
                            {prova.titulo}
                          </CardTitle>
                          <StatusIcon className={`h-5 w-5 ${
                            prova.status === 'EM_ANDAMENTO' ? 'text-green-600' : 
                            prova.status === 'CONCLUIDA' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <CardDescription className="space-y-1">
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-2">
                            {traduzirFormato(prova.formato)}
                          </p>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {prova.descricao}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatarData(prova.data_inicio)}</span>
                        </div>

                        {/* Indicadores US14 */}
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                          {prova.restricao_participacao?.limite_tentativas && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              {prova.restricao_participacao.limite_tentativas} tentativas
                            </Badge>
                          )}
                          {prova.sequenciamento?.etapas?.length > 0 && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              {prova.sequenciamento.etapas.length} etapas
                            </Badge>
                          )}
                          {prova.criterio_elegibilidade?.turmas_permitidas?.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Turmas específicas
                            </Badge>
                          )}
                          {pontuacaoFormatada && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {pontuacaoFormatada}
                          </Badge>
                        )}
                        </div>

                        {/* Equipe em primeiro lugar - apenas para provas concluídas */}
                        {prova.status === 'CONCLUIDA' && prova.vencedor && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="text-xs font-medium text-gray-700">
                              1º lugar: <span className="font-semibold text-gray-900">{prova.vencedor.equipe_nome}</span>
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Mensagem informativa para não-admins */}
            {usuario?.tipo !== 'ADMIN' && provasDisponiveis.length < provas.length && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Algumas provas não estão sendo exibidas pois não estão disponíveis para seu perfil ou turma.
                  </p>
                </div>
              </div>
            )}
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
    </MainLayout>
  );
};

export default TodasProvas;


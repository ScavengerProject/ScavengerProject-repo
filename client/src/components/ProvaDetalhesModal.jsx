import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Calendar, Clock, Users, Target, AlertCircle, List, CheckCircle2, AlertTriangle, UserPlus, Loader, UserCheck, Trophy } from "lucide-react";
import { provasService, equipesService, resultadosService } from "../services/api";
import { toast } from "./ui/toast";

const ProvaDetalhesModal = ({ prova, isOpen, onClose, onInscricaoSucesso }) => {
  const [inscrevendo, setInscrevendo] = useState(false);
  const [jaInscrito, setJaInscrito] = useState(false);
  const [verificandoInscricao, setVerificandoInscricao] = useState(false);
  const [equipes, setEquipes] = useState([]);
  const [carregandoEquipes, setCarregandoEquipes] = useState(false);
  const [resultadosDaProva, setResultadosDaProva] = useState([]);
  const [carregandoResultados, setCarregandoResultados] = useState(false);

  // Verificar inscrição e carregar equipes quando o modal abrir
  useEffect(() => {
    if (isOpen && prova) {
      verificarInscricao();
      // carregarEquipes(); // comentando por enquanto
      if (prova.status === 'CONCLUIDA') {
        carregarResultadosDaProva();
      } else {
        // Garante que dados antigos não sejam mostrados
        setResultadosDaProva([]); 
      }
    }
  }, [isOpen, prova]);

  const carregarResultadosDaProva = async () => {
    if (!prova) return;
    try {
      setCarregandoResultados(true);
      const data = await resultadosService.listarResultadosDaProva(prova._id);
      setResultadosDaProva(data || []);
    } catch (error) {
      console.error('Erro ao carregar resultados da prova:', error);
      toast.error('Não foi possível carregar os resultados da prova.');
    } finally {
      setCarregandoResultados(false);
    }
  };

  const verificarInscricao = async () => {
    if (!prova) return;
    
    try {
      setVerificandoInscricao(true);
      const response = await provasService.verificarInscricao(prova._id);
      setJaInscrito(response.inscrito);
    } catch (error) {
      console.error('Erro ao verificar inscrição:', error);
      // Silenciosamente falha - não mostra erro ao usuário
    } finally {
      setVerificandoInscricao(false);
    }
  };

  /*const carregarEquipes = async () => {
    try {
      setCarregandoEquipes(true);
      const equipesData = await equipesService.listarEquipes();
      // Ordenar por pontuação decrescente (maior para menor)
      const equipesOrdenadas = (equipesData || [])
        .sort((a, b) => (b.pontos_acumulados || 0) - (a.pontos_acumulados || 0));
      setEquipes(equipesOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
      // Silenciosamente falha - não mostra erro ao usuário
    } finally {
      setCarregandoEquipes(false);
    }
  };*/
  
  if (!prova) return null;

  // Formatar data completa
  const formatarDataCompleta = (data) => {
    if (!data) return "Não definida";
    const date = new Date(data);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Traduzir status
  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: { label: "Não iniciada", color: "bg-gray-100 text-gray-800" },
      EM_ANDAMENTO: { label: "Em andamento", color: "bg-green-100 text-green-800" },
      CONCLUIDA: { label: "Concluída", color: "bg-blue-100 text-blue-800" },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
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

  //formatar pontuação
  const formatarPontuacao = (pontuacao) => {
    if (!pontuacao || Object.keys(pontuacao).length === 0) {
      return "Pontuação não definida para esta prova.";
    }
    // Tipo Proporcional
    if (pontuacao.pontos_por_unidade && pontuacao.nome_unidade) {
      return `${pontuacao.pontos_por_unidade} pontos por ${pontuacao.nome_unidade}`;
    }
    // Tipo Ranking
    const posicoes = [];
    if (pontuacao["1"]) posicoes.push(`1º Lugar: ${pontuacao["1"]} pts`);
    if (pontuacao["2"]) posicoes.push(`2º Lugar: ${pontuacao["2"]} pts`);
    if (pontuacao["3"]) posicoes.push(`3º Lugar: ${pontuacao["3"]} pts`);

    if (posicoes.length > 0) {
      return posicoes.join(' | ');
    }
    return "Regras de pontuação não especificadas.";
  };

  const statusInfo = traduzirStatus(prova.status);
  const restricoes = prova.restricao_participacao || {};
  const elegibilidade = prova.criterio_elegibilidade || {};
  const sequenciamento = prova.sequenciamento || {};
  const requisitos = prova.requisito_usuario || {};

  // Verificar se há cotas disponíveis
  const temCotas = Object.values(requisitos).some(cota => {
    const valor = Number(cota);
    return !isNaN(valor) && valor > 0;
  });

  const handleInscrever = async () => {
    try {
      setInscrevendo(true);
      await provasService.inscrever(prova._id);
      toast.success('Inscrição realizada com sucesso!');
      setJaInscrito(true);
      if (onInscricaoSucesso) {
        onInscricaoSucesso();
      }
    } catch (error) {
      console.error('Erro ao inscrever na prova:', error);
      toast.error(error.message || 'Erro ao realizar inscrição');
    } finally {
      setInscrevendo(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-white border-gray-300 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-900">{prova.titulo}</DialogTitle>
          <DialogDescription className="text-gray-600 flex items-center gap-2 mt-2">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <span>•</span>
            <span>{traduzirFormato(prova.formato)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Aviso se não houver cotas */}
          {!temCotas && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-900 mb-2">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Prova Indisponível</h4>
              </div>
              <p className="text-sm text-red-800">
                Esta prova não possui vagas disponíveis. Todas as cotas de participação estão definidas como 0.
                Entre em contato com o administrador para mais informações.
              </p>
            </div>
          )}

          {/* Descrição */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
            <p className="text-gray-700">{prova.descricao}</p>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-900 mb-2">
                <Calendar className="h-5 w-5" />
                <h4 className="font-semibold">Data de Início</h4>
              </div>
              <p className="text-sm text-blue-800">{formatarDataCompleta(prova.data_inicio)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-900 mb-2">
                <Calendar className="h-5 w-5" />
                <h4 className="font-semibold">Data de Término</h4>
              </div>
              <p className="text-sm text-purple-800">{formatarDataCompleta(prova.data_fim)}</p>
            </div>
          </div>

          {/* Restrições de Participação */}
          {(restricoes.limite_tentativas || restricoes.tempo_maximo_minutos || restricoes.permitir_reenvio !== undefined) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-900 mb-3">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Restrições de Participação</h4>
              </div>
              <ul className="space-y-2 text-sm text-orange-800">
                {restricoes.limite_tentativas && (
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Limite de tentativas: <strong>{restricoes.limite_tentativas}</strong></span>
                  </li>
                )}
                {restricoes.tempo_maximo_minutos && (
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Tempo máximo: <strong>{restricoes.tempo_maximo_minutos} minutos</strong></span>
                  </li>
                )}
                {restricoes.permitir_reenvio !== undefined && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Reenvio: <strong>{restricoes.permitir_reenvio ? 'Permitido' : 'Não permitido'}</strong></span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Critérios de Elegibilidade */}
          {(elegibilidade.turmas_permitidas?.length > 0 || elegibilidade.pre_requisitos_prova_ids?.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-900 mb-3">
                <Users className="h-5 w-5" />
                <h4 className="font-semibold">Critérios de Elegibilidade</h4>
              </div>
              <ul className="space-y-2 text-sm text-blue-800">
                {elegibilidade.turmas_permitidas?.length > 0 ? (
                  <li>
                    <strong>Turmas permitidas:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {elegibilidade.turmas_permitidas.map((turma, index) => (
                        <Badge key={index} className="bg-blue-200 text-blue-900 text-xs">
                          {turma}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ) : (
                  <li>
                    <strong>Turmas:</strong> Todas as turmas podem participar
                  </li>
                )}
                {elegibilidade.pre_requisitos_prova_ids?.length > 0 && (
                  <li>
                    <strong>Pré-requisitos:</strong> {elegibilidade.pre_requisitos_prova_ids.length} prova(s) devem ser concluídas antes
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Sequenciamento de Etapas */}
          {sequenciamento.etapas?.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-900 mb-3">
                <List className="h-5 w-5" />
                <h4 className="font-semibold">Etapas da Prova</h4>
              </div>
              {sequenciamento.exigir_ordem && (
                <div className="flex items-start gap-2 text-xs text-purple-700 mb-3 bg-purple-100 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>As etapas devem ser concluídas na ordem apresentada</span>
                </div>
              )}
              <ol className="space-y-2">
                {sequenciamento.etapas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((etapa, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-purple-800">
                      <span className="font-bold text-purple-600 min-w-6">{etapa.ordem}.</span>
                      <div className="flex-1">
                        <span>{etapa.descricao}</span>
                        {!etapa.obrigatoria && (
                          <Badge className="ml-2 bg-purple-200 text-purple-900 text-xs">
                            Opcional
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {/* Quesitos de Avaliação */}
          {prova.quesitos_de_avaliacao?.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Quesitos de Avaliação</h4>
              <div className="flex flex-wrap gap-2">
                {prova.quesitos_de_avaliacao.map((quesito, index) => (
                  <Badge key={index} className="bg-gray-200 text-gray-800">
                    {quesito}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            
            {/* Título da Seção Dinâmico */}
            <div className="flex items-center gap-2 text-yellow-900 mb-3">
              <Trophy className="h-5 w-5" />
              <h4 className="font-semibold">
                {prova.status === 'CONCLUIDA' ? "Resultado Final da Prova" : "Regras de Pontuação"}
              </h4>
            </div>

            {/* ----- CASO 1: PROVA NÃO CONCLUÍDA (MOSTRAR REGRAS) ----- */}
            {prova.status !== 'CONCLUIDA' && (
              <div className="p-3 bg-yellow-100 rounded-lg">
                <p className="text-sm font-medium text-yellow-900">
                  {formatarPontuacao(prova.pontuacao)}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  A pontuação final das equipes será exibida aqui após a conclusão da prova.
                </p>
              </div>
            )}

            {/* ----- CASO 2: PROVA CONCLUÍDA (MOSTRAR RESULTADOS) ----- */}
            {prova.status === 'CONCLUIDA' && (
               <>
                {carregandoResultados ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-5 w-5 animate-spin text-yellow-600" />
                    <span className="ml-2 text-sm text-yellow-800">Carregando resultados...</span>
                  </div>
                ) : (
                  <>
                    {!resultadosDaProva || resultadosDaProva.length === 0 ? (
                      <p className="text-sm text-yellow-800 text-center py-2">
                        Resultados ainda não processados para esta prova.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {resultadosDaProva.map((resultado, index) => (
                          <div
                            key={resultado.equipe_id || index}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              index === 0 ? 'bg-yellow-50 border-yellow-300' : 
                              index === 1 ? 'bg-gray-50 border-gray-300' :
                              index === 2 ? 'bg-orange-50 border-orange-300' :
                              'bg-white border-yellow-200' 
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className={`font-bold text-lg min-w-8 ${
                                index === 0 ? 'text-yellow-600' : 
                                index === 1 ? 'text-gray-600' : 
                                index === 2 ? 'text-orange-600' : 
                                'text-yellow-700'
                              }`}>
                                {resultado.posicao || index + 1}º
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-semibold text-gray-900">{resultado.equipe_nome}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {resultado.pontos_obtidos || 0} pontos
                              </span>
                              {index === 0 && <Trophy className="h-5 w-5 text-yellow-600" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
               </>
             )}

          </div>
        </div>
        {/* Footer com botão de inscrição */}
        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-300 hover:bg-gray-100"
            >
              Fechar
            </Button>
            
            {verificandoInscricao ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando...</span>
              </div>
            ) : jaInscrito ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Você já está inscrito nesta prova</span>
              </div>
            ) : temCotas && prova.status !== 'CONCLUIDA' ? (
              <Button
                onClick={handleInscrever}
                disabled={inscrevendo}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {inscrevendo ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Inscrevendo...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inscrever-se nesta prova
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProvaDetalhesModal;


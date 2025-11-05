import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Calendar, Clock, Users, Target, AlertCircle, List, CheckCircle2, AlertTriangle } from "lucide-react";

const ProvaDetalhesModal = ({ prova, isOpen, onClose }) => {
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
                      <span className="font-bold text-purple-600 min-w-[24px]">{etapa.ordem}.</span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProvaDetalhesModal;


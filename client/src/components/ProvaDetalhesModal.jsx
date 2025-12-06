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
import { provasService, equipesService, resultadosService, configuracoesService } from "../services/api";
import { toast } from "./ui/toast";
import { useAuth } from "../hooks/useAuth";

const ProvaDetalhesModal = ({ prova, isOpen, onClose, onInscricaoSucesso }) => {
  const { usuario } = useAuth();
  const [inscrevendo, setInscrevendo] = useState(false);
  const [jaInscrito, setJaInscrito] = useState(false);
  const [verificandoInscricao, setVerificandoInscricao] = useState(false);
  const [resultadosDaProva, setResultadosDaProva] = useState([]);
  const [carregandoResultados, setCarregandoResultados] = useState(false);
  
  const [equipeUsuario, setEquipeUsuario] = useState(null); 
  const [mostrarNotasRanking, setMostrarNotasRanking] = useState(false); 
  
  const [ocultarPontos, setOcultarPontos] = useState(false); 
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  useEffect(() => {
    if (isOpen && prova) {
      verificarInscricao();
      carregarConfiguracao();
      
      setOcultarPontos(prova.ocultar_pontos || false);

      if (prova.status === 'CONCLUIDA') {
        carregarEquipeUsuario();
        carregarResultadosDaProva();
      } else {
        setResultadosDaProva([]);
        setEquipeUsuario(null);
      }
    }
  }, [isOpen, prova]);

  // Função do Admin para Ocultar/Mostrar pontos
  const handleAlterarVisibilidade = async (checked) => {
    if (usuario?.tipo !== 'ADMIN') return;

    setOcultarPontos(checked); 
    setSalvandoConfig(true);

    try {
      // USANDO A NOVA FUNÇÃO AQUI:
      await provasService.atualizarConfiguracao(prova._id, { ocultar_pontos: checked });
      
      toast.success(checked ? "Pontuação ocultada (Modo Suspense)." : "Pontuação visível.");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setOcultarPontos(!checked); 
      toast.error("Erro ao salvar alteração.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  const carregarConfiguracao = async () => {
    try {
      const config = await configuracoesService.obter();
      setMostrarNotasRanking(config?.mostrar_notas_ranking || false);
    } catch (error) {
      setMostrarNotasRanking(false);
    }
  };

  const carregarEquipeUsuario = async () => {
    if (!usuario) return;
    try {
      if (usuario.tipo !== 'ADMIN') {
        try {
          if (typeof equipesService.buscarMinhaEquipeId === 'function') {
            const minhaEquipeId = await equipesService.buscarMinhaEquipeId();
            if (minhaEquipeId?.equipe_id) {
              const equipesData = await equipesService.listarEquipes();
              const equipeDoUsuario = equipesData?.find(eq => 
                String(eq.id || eq._id) === String(minhaEquipeId.equipe_id)
              );
              setEquipeUsuario(equipeDoUsuario || null);
            } else {
              setEquipeUsuario(null);
            }
          }
        } catch (error) {
          setEquipeUsuario(null);
        }
      } else {
        setEquipeUsuario(null);
      }
    } catch (error) {
      console.error('Erro ao carregar equipe do usuário:', error);
      setEquipeUsuario(null);
    }
  };

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
    } finally {
      setVerificandoInscricao(false);
    }
  };

  if (!prova) return null;

  const formatarDataCompleta = (data) => {
    if (!data) return "Não definida";
    const date = new Date(data);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: { label: "Não iniciada", color: "bg-gray-100 text-gray-800" },
      EM_ANDAMENTO: { label: "Em andamento", color: "bg-green-100 text-green-800" },
      CONCLUIDA: { label: "Concluída", color: "bg-blue-100 text-blue-800" },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
  };

  const traduzirFormato = (formato) => {
    const map = { QUESTIONARIO_ONLINE: "Questionário Online", PROVA_PRATICA: "Prova Prática", PROVA_ESCRITA: "Prova Escrita" };
    return map[formato] || formato;
  };

  const formatarPontuacao = (pontuacao) => {
    if (!pontuacao || Object.keys(pontuacao).length === 0) return "Pontuação não definida.";
    if (pontuacao.pontos_por_unidade && pontuacao.nome_unidade) return `${pontuacao.pontos_por_unidade} pontos por ${pontuacao.nome_unidade}`;
    const pos = [];
    if (pontuacao["1"]) pos.push(`1º: ${pontuacao["1"]} pts`);
    if (pontuacao["2"]) pos.push(`2º: ${pontuacao["2"]} pts`);
    if (pontuacao["3"]) pos.push(`3º: ${pontuacao["3"]} pts`);
    return pos.length > 0 ? pos.join(' | ') : "Regras não especificadas.";
  };

  const statusInfo = traduzirStatus(prova.status);
  const requisitos = prova.requisito_usuario || {};
  const temCotas = Object.values(requisitos).some(c => Number(c) > 0);

  const handleInscrever = async () => {
    try {
      setInscrevendo(true);
      await provasService.inscrever(prova._id);
      toast.success('Inscrição realizada!');
      setJaInscrito(true);
      if (onInscricaoSucesso) onInscricaoSucesso();
    } catch (error) {
      toast.error(error.message || 'Erro ao realizar inscrição');
    } finally {
      setInscrevendo(false);
    }
  };

  const isAdmin = usuario?.tipo === 'ADMIN';

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
          {!temCotas && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-900 mb-2">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Prova Indisponível</h4>
              </div>
              <p className="text-sm text-red-800">Sem vagas disponíveis.</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
            <p className="text-gray-700">{prova.descricao}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-900 mb-2">
                <Calendar className="h-5 w-5" />
                <h4 className="font-semibold">Início</h4>
              </div>
              <p className="text-sm text-blue-800">{formatarDataCompleta(prova.data_inicio)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-900 mb-2">
                <Calendar className="h-5 w-5" />
                <h4 className="font-semibold">Término</h4>
              </div>
              <p className="text-sm text-purple-800">{formatarDataCompleta(prova.data_fim)}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-yellow-900">
                <Trophy className="h-5 w-5" />
                <h4 className="font-semibold">
                  {prova.status === 'CONCLUIDA' ? "Resultado Final" : "Regras de Pontuação"}
                </h4>
              </div>

              {/* CHECKBOX DO ADMIN */}
              {isAdmin && prova.status === 'CONCLUIDA' && (
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1.5 rounded-md border border-yellow-300 ml-4">
                  <Checkbox 
                    id="ocultarPontosBtn" 
                    checked={ocultarPontos}
                    disabled={salvandoConfig}
                    onCheckedChange={handleAlterarVisibilidade}
                  />
                  <label
                    htmlFor="ocultarPontosBtn"
                    className={`text-sm font-medium text-yellow-900 cursor-pointer select-none ${salvandoConfig ? 'opacity-70' : ''}`}
                  >
                    {salvandoConfig ? "Salvando..." : "Ocultar Pontos (Admin)"}
                  </label>
                </div>
              )}
            </div>

            {prova.status !== 'CONCLUIDA' && (
              <div className="p-3 bg-yellow-100 rounded-lg">
                <p className="text-sm font-medium text-yellow-900">{formatarPontuacao(prova.pontuacao)}</p>
                <p className="text-xs text-yellow-700 mt-1">Resultados disponíveis após a conclusão.</p>
              </div>
            )}

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
                      <p className="text-sm text-yellow-800 text-center py-2">Sem resultados processados.</p>
                    ) : (
                      <div className="space-y-2">
                        {resultadosDaProva.map((resultado, index) => (
                          <div
                            key={resultado.equipe_id || index}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              index === 0 ? 'bg-yellow-50 border-yellow-300' : 
                              'bg-white border-yellow-200' 
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="font-bold text-lg min-w-8 text-yellow-700">
                                {resultado.posicao || index + 1}º
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-semibold text-gray-900">{resultado.equipe_nome}</span>
                                {equipeUsuario && String(resultado.equipe_id) === String(equipeUsuario._id || equipeUsuario.id) && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs ml-2">Sua Equipe</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[80px] text-right">
                                {(() => {
                                  const rId = resultado.equipe_id ? String(resultado.equipe_id._id || resultado.equipe_id) : "";
                                  const uId = equipeUsuario ? String(equipeUsuario._id || equipeUsuario.id || "") : "";
                                  const eMinhaEquipe = (uId !== "" && rId !== "" && rId === uId);
                                  
                                  if (isAdmin) return `${resultado.pontos_obtidos || 0} pts`;

                                  if (ocultarPontos) {
                                    return <span className="text-gray-500 italic text-sm">Pontos ocultados</span>;
                                  }

                                  if (eMinhaEquipe || mostrarNotasRanking) {
                                    return `${resultado.pontos_obtidos || 0} pts`;
                                  }

                                  return <span className="text-gray-500 italic text-sm">Pontos ocultados</span>;
                                })()}
                              </span>
                              {index === 0 && <Trophy className="h-5 w-5 text-yellow-600 ml-1" />}
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

        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full gap-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            {!jaInscrito && temCotas && prova.status !== 'CONCLUIDA' && (
               <Button onClick={handleInscrever} disabled={inscrevendo} className="bg-blue-600 text-white">
                  {inscrevendo ? "Inscrevendo..." : "Inscrever-se"}
               </Button>
            )}
             {jaInscrito && (
               <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Inscrito</span>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProvaDetalhesModal;
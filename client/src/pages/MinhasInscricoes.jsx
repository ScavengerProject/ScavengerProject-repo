import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Trophy, Calendar, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import { provasService } from "../services/api";
import { toast } from "../components/ui/toast";
import ProvaDetalhesModal from "../components/ProvaDetalhesModal";

const MinhasInscricoes = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarInscricoes();
  }, []);

  const carregarInscricoes = async () => {
    try {
      setLoading(true);
      // Por enquanto, listamos todas as provas disponíveis
      // TODO: Criar endpoint específico para listar apenas provas inscritas
      const provasData = await provasService.listar();
      setProvas(provasData || []);
    } catch (error) {
      console.error("Erro ao carregar inscrições:", error);
      toast.error("Erro ao carregar suas inscrições");
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
    carregarInscricoes();
  };

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

  // Filtrar provas disponíveis (temporário - até ter endpoint específico)
  const provasDisponiveis = provas.filter(prova => {
    const requisitos = prova.requisito_usuario || {};
    const temCotas = Object.values(requisitos).some(cota => {
      const valor = Number(cota);
      return !isNaN(valor) && valor > 0;
    });
    return temCotas;
  });

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Minhas Inscrições</h2>
          <p className="text-gray-600">
            Provas nas quais você está inscrito
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando suas inscrições...</p>
            </div>
          </div>
        ) : (
          <>
            {provasDisponiveis.length === 0 ? (
              <Card className="bg-white border-gray-200 shadow-md">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma inscrição ainda
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Você ainda não está inscrito em nenhuma prova
                    </p>
                    <Button
                      onClick={() => navigate('/provas')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Ver Provas Disponíveis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {provasDisponiveis.map((prova) => {
                  const statusInfo = traduzirStatus(prova.status);
                  const StatusIcon = statusInfo.icon;
                  
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

                        {/* Indicador de inscrição */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Inscrito</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

      {/* Modal de Detalhes da Prova */}
      <ProvaDetalhesModal 
        prova={provaSelecionada}
        isOpen={modalAberto}
        onClose={fecharModal}
        onInscricaoSucesso={handleInscricaoSucesso}
      />
      </div>
    </MainLayout>
  );
};

export default MinhasInscricoes;


import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Trophy, Calendar, Clock, CheckCircle2, XCircle, ArrowLeftRight, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import { provasService } from "../services/api";
import { toast } from "../components/ui/toast";
import ProvaDetalhesModal from "../components/ProvaDetalhesModal";

/**
 * As provas em que o próprio usuário está inscrito.
 *
 * Antes esta tela listava TODAS as provas com cota e carimbava "Inscrito" em
 * cada card — o título prometia uma coisa e a tela mostrava outra. Agora ela
 * consome `GET /provas/minhas-inscricoes`, que já resolve, por prova, a equipe
 * pela qual a pessoa participou: pode não ser a equipe atual dela, se foi
 * emprestada para outra equipe naquela prova ou se migrou no meio da gincana.
 */

const MinhasInscricoes = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [equipeAtual, setEquipeAtual] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarInscricoes();
  }, []);

  const carregarInscricoes = async () => {
    try {
      setLoading(true);
      setErro(null);
      const data = await provasService.minhasInscricoes();
      setInscricoes(data?.inscricoes || []);
      setEquipeAtual(data?.equipe_atual || null);
    } catch (error) {
      setInscricoes([]);
      setErro(error.message || "Erro ao carregar suas inscrições");
      toast.error(error.message || "Erro ao carregar suas inscrições");
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

  const formatarData = (data) => {
    if (!data) return "Data não definida";
    const date = new Date(data);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: { label: "Não iniciada", color: "bg-gray-100 text-gray-800", icon: Clock },
      EM_ANDAMENTO: { label: "Em andamento", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      CONCLUIDA: { label: "Concluída", color: "bg-blue-100 text-blue-800", icon: XCircle },
    };
    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800", icon: Clock };
  };

  const traduzirFormato = (formato) => {
    const formatoMap = {
      QUESTIONARIO_ONLINE: "Questionário Online",
      PROVA_PRATICA: "Prova Prática",
      PROVA_ESCRITA: "Prova Escrita",
    };
    return formatoMap[formato] || formato;
  };

  const traduzirPapel = (papel) => (papel === 'TITULAR' ? 'Titular' : papel === 'SUPLENTE' ? 'Suplente' : null);

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Minhas Inscrições</h2>
          <p className="text-gray-600">
            Provas nas quais você está inscrito
            {equipeAtual && <> — hoje você está na equipe <span className="font-medium text-gray-800">{equipeAtual.nome}</span></>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando suas inscrições...</p>
            </div>
          </div>
        ) : erro ? (
          <Card className="bg-white border-gray-200 shadow-md">
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Não foi possível carregar</h3>
              <p className="text-gray-600 mb-6">{erro}</p>
              <Button onClick={carregarInscricoes} className="bg-blue-600 hover:bg-blue-700 text-white">
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : inscricoes.length === 0 ? (
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
            {inscricoes.map((item) => {
              const statusInfo = traduzirStatus(item.prova.status);
              const StatusIcon = statusInfo.icon;
              const papel = traduzirPapel(item.papel);

              return (
                <Card
                  key={item.prova._id}
                  onClick={() => abrirDetalhesProva(item.prova)}
                  className="bg-white border-gray-200 shadow-md hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg text-gray-900 flex-1 pr-2">
                        {item.prova.titulo}
                      </CardTitle>
                      <StatusIcon className={`h-5 w-5 ${
                        item.prova.status === 'EM_ANDAMENTO' ? 'text-green-600' :
                        item.prova.status === 'CONCLUIDA' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <CardDescription className="space-y-1">
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      {/* <span>, não <p>: CardDescription já renderiza um <p>,
                          e <p> dentro de <p> é HTML inválido. */}
                      <span className="block text-xs text-gray-500 mt-2">
                        {traduzirFormato(item.prova.formato)}
                      </span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700 line-clamp-2">{item.prova.descricao}</p>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatarData(item.prova.data_inicio)}</span>
                    </div>

                    {/* Por qual equipe a pessoa participou desta prova — pode não
                        ser a equipe atual dela (empréstimo ou migração). */}
                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      {item.equipe ? (
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className="truncate">
                            Participou pela <span className="font-medium">{item.equipe.nome}</span>
                            {papel && <span className="text-gray-500"> · {papel}</span>}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span>Equipe ainda não definida</span>
                        </div>
                      )}

                      {item.emprestado && (
                        <div className="flex items-center gap-2 text-xs text-amber-700">
                          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            Emprestado
                            {item.equipe_origem_emprestimo && <> pela {item.equipe_origem_emprestimo.nome}</>}
                          </span>
                        </div>
                      )}

                      {/* Migrou depois desta prova: sem esta linha, a pessoa veria
                          uma equipe que não é a dela hoje e acharia que é erro. */}
                      {!item.emprestado && item.equipe_atual_diferente && equipeAtual && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Hoje você está na {equipeAtual.nome}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <ProvaDetalhesModal
          prova={provaSelecionada}
          isOpen={modalAberto}
          onClose={fecharModal}
          onInscricaoSucesso={carregarInscricoes}
        />
      </div>
    </MainLayout>
  );
};

export default MinhasInscricoes;

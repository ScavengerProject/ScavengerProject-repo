import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "../components/ui/toast";
import { Plus, Edit, Trash2, ArrowLeft, Loader, Trophy } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import Switch from "../components/ui/switch";
import { provasService, configuracoesService } from "../services/api";
import ProvaRestricoesForm from "../components/ProvaRestricoesForm";
import ProvaElegibilidadeForm from "../components/ProvaElegibilidadeForm";
import ProvaSequenciamentoForm from "../components/ProvaSequenciamentoForm";
import ProvaParticipantesForm from "../components/ProvaParticipantesForm";
import LancarResultadoModal from "../components/LancarResultadoModal";

const QUESITOS_OPCOES = [
  { value: 'TEMPO', label: 'Tempo de Execução' },
  { value: 'PRODUTIVIDADE', label: 'Produtividade/Volume' },
];

// Função auxiliar para formatar os requisitos
const formatarRequisitos = (requisitos) => {
  if (!requisitos || typeof requisitos !== 'object' || Object.keys(requisitos).length === 0) {
    return "Não configurado";
  }

  const requisitoMap = {
    ALUNOS_FUNDAMENTAL: "EF",
    ALUNOS_MEDIO: "EM",
    PROFESSORES: "Prof",
    'PAI/MÃE': "Pais",
  };

  // Verificar se é "sem limite" (todos >= 999)
  const valores = Object.values(requisitos).map(v => Number(v) || 0);
  const todosMaiorQue999 = valores.every(v => v >= 999);
  
  if (todosMaiorQue999) {
    return "Ilimitado (todos)";
  }

  // Contar vagas disponíveis
  const vagas = Object.entries(requisitos)
    .filter(([_, valor]) => Number(valor) > 0)
    .map(([chave, valor]) => `${requisitoMap[chave] || chave}: ${valor}`)
    .join(" | ");

  if (vagas) {
    return vagas;
  }

  return "Sem vagas";
};

const AdminProvas = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProva, setEditingProva] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tipoPontuacao, setTipoPontuacao] = useState('RANKING');
  const [modalResultadoOpen, setModalResultadoOpen] = useState(false);
  const [provaParaResultado, setProvaParaResultado] = useState(null);
  const [mostrarNotasRanking, setMostrarNotasRanking] = useState(false);
  const [salvandoConfiguracao, setSalvandoConfiguracao] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    formato: "",
    data_inicio: "",
    data_fim: "",
    status: "NAO_INICIADA",
    quesitos_de_avaliacao: [],
    requisito_usuario: {
      ALUNOS_FUNDAMENTAL: 0,
      ALUNOS_MEDIO: 0,
      PROFESSORES: 0,
      'PAI/MÃE': 0,
    },
    restricao_participacao: {},
    criterio_elegibilidade: {},
    sequenciamento: {},
    pontuacao: {},
  });

  // Carregar provas ao montar o componente
  useEffect(() => {
    carregarProvas();
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const config = await configuracoesService.obter();
      setMostrarNotasRanking(config?.mostrar_notas_ranking || false);
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const handleToggleMostrarNotas = async (checked) => {
    try {
      setSalvandoConfiguracao(true);
      await configuracoesService.atualizar({ mostrar_notas_ranking: checked });
      setMostrarNotasRanking(checked);
      toast.success(checked ? "Notas do ranking agora são visíveis para todos" : "Notas do ranking ocultadas");
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setSalvandoConfiguracao(false);
    }
  };

  const carregarProvas = async () => {
    try {
      setLoading(true);
      const response = await provasService.listar();
      setProvas(response || []);
    } catch (error) {
      console.error("Erro ao carregar provas:", error);
      toast.error("Erro ao carregar provas");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTipoPontuacao('RANKING');
    setFormData({
      titulo: "",
      descricao: "",
      formato: "",
      data_inicio: "",
      data_fim: "",
      status: "NAO_INICIADA",
      quesitos_de_avaliacao: [],
      requisito_usuario: {
        ALUNOS_FUNDAMENTAL: 0,
        ALUNOS_MEDIO: 0,
        PROFESSORES: 0,
        'PAI/MÃE': 0,
      },
      restricao_participacao: {},
      criterio_elegibilidade: {},
      sequenciamento: {},
      pontuacao: {},
    });
    setEditingProva(null);
  };

  // Função para manipular o array de quesitos
  const handleQuesitoChange = (quesitoValue, isChecked) => {
    setFormData((prev) => {
      const currentQuesitos = prev.quesitos_de_avaliacao;
      
      if (isChecked) {
        // adiciona o quesito se marcado
        return { 
          ...prev, 
          quesitos_de_avaliacao: [...currentQuesitos, quesitoValue] 
        };
      } else {
        // Remove o quesito se desmarcado
        return { 
          ...prev, 
          quesitos_de_avaliacao: currentQuesitos.filter((q) => q !== quesitoValue) 
        };
      }
    });
  };

  const handleTipoPontuacaoChange = (novoTipo) => {
    setTipoPontuacao(novoTipo);
    setFormData(prev => ({
      ...prev,
      pontuacao: {}
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.titulo || !formData.formato || !formData.descricao) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSubmitting(true);

      if (editingProva) {
        // Atualizar prova existente
        await provasService.atualizar(editingProva._id, formData);
        toast.success("Prova atualizada com sucesso!");
        
        // Atualizar lista localmente
        setProvas(
          provas.map((p) =>
            p._id === editingProva._id
              ? { ...editingProva, ...formData }
              : p
          )
        );
      } else {
        // Criar nova prova
        const response = await provasService.criar(formData);
        toast.success("Prova criada com sucesso!");
        
        // Adicionar à lista
        setProvas([...provas, response]);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar prova:", error);
      toast.error(error.message || "Erro ao salvar prova");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (prova) => {
    setEditingProva(prova);
    
    // Garantir que requisito_usuario seja sempre um objeto
    let requisitoUsuario = {
      ALUNOS_FUNDAMENTAL: 0,
      ALUNOS_MEDIO: 0,
      PROFESSORES: 0,
      'PAI/MÃE': 0,
    };
    
    if (prova.requisito_usuario && typeof prova.requisito_usuario === 'object') {
      requisitoUsuario = {
        ALUNOS_FUNDAMENTAL: Number(prova.requisito_usuario.ALUNOS_FUNDAMENTAL) || 0,
        ALUNOS_MEDIO: Number(prova.requisito_usuario.ALUNOS_MEDIO) || 0,
        PROFESSORES: Number(prova.requisito_usuario.PROFESSORES) || 0,
        'PAI/MÃE': Number(prova.requisito_usuario['PAI/MÃE']) || 0,
      };
    }

    const pontuacaoData = prova.pontuacao || {};
    let tipoSalvo = 'RANKING'; // Padrão
    
    // Se tiver a chave 'pontos_por_unidade', é do tipo proporcional
    if (pontuacaoData.hasOwnProperty('pontos_por_unidade')) {
      tipoSalvo = 'PROPORCIONAL';
    }
    setTipoPontuacao(tipoSalvo);

    setFormData({
      titulo: prova.titulo,
      descricao: prova.descricao,
      formato: prova.formato,
      data_inicio: prova.data_inicio ? new Date(prova.data_inicio).toISOString().split('T')[0] : "",
      data_fim: prova.data_fim ? new Date(prova.data_fim).toISOString().split('T')[0] : "",
      status: prova.status || "NAO_INICIADA",
      quesitos_de_avaliacao: prova.quesitos_de_avaliacao || [],
      requisito_usuario: requisitoUsuario,
      restricao_participacao: prova.restricao_participacao || {},
      criterio_elegibilidade: prova.criterio_elegibilidade || {},
      sequenciamento: prova.sequenciamento || {},
      pontuacao: prova.pontuacao || {},
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja deletar esta prova?")) {
      try {
        await provasService.deletar(id);
        setProvas(provas.filter((p) => p._id !== id));
        toast.success("Prova excluída com sucesso!");
      } catch (error) {
        console.error("Erro ao deletar prova:", error);
        toast.error("Erro ao deletar prova");
      }
    }
  };

  const abrirModalResultado = (prova) => {
    setProvaParaResultado(prova);
    setModalResultadoOpen(true);
  };

  const fecharModalResultado = () => {
    setProvaParaResultado(null);
    setModalResultadoOpen(false);
    // Recarrega as provas caso os pontos tenham sido atualizados
    carregarProvas(); 
  };

  // Função auxiliar para formatar data
  const formatarData = (data) => {
    if (!data) return "Não definida";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  // Função auxiliar para traduzir status
  const traduzirStatus = (status) => {
    const statusMap = {
      NAO_INICIADA: "Não iniciada",
      EM_ANDAMENTO: "Em andamento",
      CONCLUIDA: "Concluída",
    };
    return statusMap[status] || status;
  };

  // Função auxiliar para traduzir formato
  const traduzirFormato = (formato) => {
    const formatoMap = {
      QUESTIONARIO_ONLINE: "Questionário Online",
      PROVA_PRATICA: "Prova Prática",
      PROVA_ESCRITA: "Prova Escrita",
    };
    return formatoMap[formato] || formato;
  };

  // Função auxiliar para formatar critérios de elegibilidade
  const formatarCriteriosElegibilidade = (criterio) => {
    if (!criterio || typeof criterio !== 'object') return null;
    
    const turmas = criterio.turmas_permitidas || [];
    const preRequisitos = criterio.pre_requisitos_prova_ids || [];
    
    if (turmas.length === 0 && preRequisitos.length === 0) return null;
    
    const partes = [];
    if (turmas.length > 0) {
      partes.push(`${turmas.length} turma(s)`);
    } else {
      partes.push('Todas as turmas');
    }
    if (preRequisitos.length > 0) {
      partes.push(`${preRequisitos.length} pré-requisito(s)`);
    }
    return partes.join(' • ');
  };

  // Função auxiliar para formatar restrições de participação
  const formatarRestricoes = (restricao) => {
    if (!restricao || typeof restricao !== 'object') return null;
    
    const partes = [];
    if (restricao.limite_tentativas) {
      partes.push(`Máx ${restricao.limite_tentativas} tentativas`);
    }
    if (restricao.tempo_maximo_minutos) {
      partes.push(`${restricao.tempo_maximo_minutos} min`);
    }
    if (restricao.permitir_reenvio === false) {
      partes.push('Sem reenvio');
    }
    
    return partes.length > 0 ? partes.join(' • ') : null;
  };

  // Função auxiliar para formatar sequenciamento
  const formatarSequenciamento = (sequenciamento) => {
    if (!sequenciamento || typeof sequenciamento !== 'object') return null;
    
    const etapas = sequenciamento.etapas || [];
    if (etapas.length === 0) return null;
    
    const obrigatorias = etapas.filter(e => e.obrigatoria).length;
    const exigeOrdem = sequenciamento.exigir_ordem ? ' (ordem obrigatória)' : '';
    
    return `${etapas.length} etapa(s) - ${obrigatorias} obrigatória(s)${exigeOrdem}`;
  };

  //formatar pontuação
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

    return "Pontuação configurada";
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Provas da Gincana</h2>
            <p className="text-sm sm:text-base text-gray-600">Crie e gerencie as provas do evento</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Switch para mostrar notas no ranking */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 w-full sm:w-auto">
              <Switch
                id="mostrar-notas-ranking"
                checked={mostrarNotasRanking}
                onCheckedChange={handleToggleMostrarNotas}
                disabled={salvandoConfiguracao}
              />
              <label
                htmlFor="mostrar-notas-ranking"
                className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer select-none"
              >
                Mostrar pontuação no ranking
              </label>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Nova Prova
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white border-gray-300 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-gray-900">
                  {editingProva ? "Editar Prova" : "Criar Nova Prova"}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Preencha os dados da prova abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* Título */}
                  <div className="grid gap-2">
                    <Label htmlFor="titulo" className="text-gray-900 font-medium">
                      Título da Prova *
                    </Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Prova de Conhecimento"
                      className="bg-white border-gray-300"
                      disabled={submitting}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="grid gap-2">
                    <Label htmlFor="descricao" className="text-gray-900 font-medium">
                      Descrição *
                    </Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva a prova..."
                      className="bg-white border-gray-300"
                      rows={3}
                      disabled={submitting}
                    />
                  </div>

                  {/* Formato */}
                  <div className="grid gap-2">
                    <Label htmlFor="formato" className="text-gray-900 font-medium">
                      Formato da Prova *
                    </Label>
                    <Select value={formData.formato} onValueChange={(value) => setFormData({ ...formData, formato: value })} disabled={submitting}>
                      <SelectTrigger id="formato-dropdown" className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione o formato" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="QUESTIONARIO_ONLINE">Questionário Online</SelectItem>
                        <SelectItem value="PROVA_PRATICA">Prova Prática</SelectItem>
                        <SelectItem value="PROVA_ESCRITA">Prova Escrita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Início */}
                  <div className="grid gap-2">
                    <Label htmlFor="data_inicio" className="text-gray-900 font-medium">
                      Data de Início
                    </Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      className="bg-white border-gray-300"
                      disabled={submitting}
                    />
                  </div>

                  {/* Data Fim */}
                  <div className="grid gap-2">
                    <Label htmlFor="data_fim" className="text-gray-900 font-medium">
                      Data de Término
                    </Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                      className="bg-white border-gray-300"
                      disabled={submitting}
                    />
                  </div>

                  {/* Status */}
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-gray-900 font-medium">
                      Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })} disabled={submitting}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="NAO_INICIADA">Não iniciada</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                        <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 p-3 border border-gray-300 rounded-md bg-gray-50">
                  {/*SELETOR DO TIPO DE PONTUAÇÃO */}
                  <div className="grid gap-2">
                    <Label htmlFor="tipo_pontuacao" className="text-gray-900 font-medium">
                      Tipo de Pontuação *
                    </Label>
                    <Select 
                      value={tipoPontuacao} 
                      onValueChange={handleTipoPontuacaoChange} 
                      disabled={submitting}
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="RANKING">Por Posição (1º, 2º, 3º)</SelectItem>
                        <SelectItem value="PROPORCIONAL">Por Unidade (Ex: por doação)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/*RENDERIZAÇÃO CONDICIONAL */}

                  {/*Inputs para TIPO RANKING */}
                  {tipoPontuacao === 'RANKING' && (
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      {/* 1º Lugar */}
                      <div className="grid gap-1">
                        <Label htmlFor="pontos_1" className="text-sm font-normal text-gray-700">1º Lugar</Label>
                        <Input
                          id="pontos_1" type="number" min="0"
                          value={formData.pontuacao["1"] || ""}
                          onChange={(e) => {
                            const valor = e.target.value;
                            const valorNum = parseInt(valor, 10);
                            if (valor === "") {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "1": "" } }));
                            } else if (valorNum < 0) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "1": 0 } }));
                            } else if (!isNaN(valorNum)) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "1": valorNum } }));
                            }
                          }}
                          placeholder="Ex: 300" className="bg-white border-gray-300" disabled={submitting}
                        />
                      </div>
                      {/* 2º Lugar */}
                      <div className="grid gap-1">
                        <Label htmlFor="pontos_2" className="text-sm font-normal text-gray-700">2º Lugar</Label>
                        <Input
                          id="pontos_2" type="number" min="0"
                          value={formData.pontuacao["2"] || ""}
                          onChange={(e) => {
                            const valor = e.target.value;
                            const valorNum = parseInt(valor, 10);
                            if (valor === "") {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "2": "" } }));
                            } else if (valorNum < 0) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "2": 0 } }));
                            } else if (!isNaN(valorNum)) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "2": valorNum } }));
                            }
                          }}
                          placeholder="Ex: 200" className="bg-white border-gray-300" disabled={submitting}
                        />
                      </div>
                      {/* 3º Lugar */}
                      <div className="grid gap-1">
                        <Label htmlFor="pontos_3" className="text-sm font-normal text-gray-700">3º Lugar</Label>
                        <Input
                          id="pontos_3" type="number" min="0"
                          value={formData.pontuacao["3"] || ""}
                          onChange={(e) => {
                            const valor = e.target.value;
                            const valorNum = parseInt(valor, 10);
                            if (valor === "") {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "3": "" } }));
                            } else if (valorNum < 0) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "3": 0 } }));
                            } else if (!isNaN(valorNum)) {
                              setFormData(prev => ({ ...prev, pontuacao: { ...prev.pontuacao, "3": valorNum } }));
                            }
                          }}
                          placeholder="Ex: 100" className="bg-white border-gray-300" disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {/* 2b. Inputs para TIPO PROPORCIONAL */}
                  {tipoPontuacao === 'PROPORCIONAL' && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {/* Pontos */}
                      <div className="grid gap-1">
                        <Label htmlFor="pontos_unidade" className="text-sm font-normal text-gray-700">Pontos por Unidade</Label>
                        <Input
                          id="pontos_unidade" type="number"
                          value={formData.pontuacao.pontos_por_unidade || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, pontuacao: { ...prev.pontuacao, pontos_por_unidade: Number(e.target.value) }
                          }))}
                          placeholder="Ex: 50" className="bg-white border-gray-300" disabled={submitting}
                        />
                      </div>
                      {/* Nome da Unidade */}
                      <div className="grid gap-1">
                        <Label htmlFor="nome_unidade" className="text-sm font-normal text-gray-700">Nome da Unidade (singular)</Label>
                        <Input
                          id="nome_unidade" type="text"
                          value={formData.pontuacao.nome_unidade || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, pontuacao: { ...prev.pontuacao, nome_unidade: e.target.value }
                          }))}
                          placeholder="Ex: doação" className="bg-white border-gray-300" disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>

                  {/* Quesitos de Avaliação (Múltiplos) */}
                  <div className="grid gap-2">
                    <Label htmlFor="quesitos" className="text-gray-900 font-medium">
                      Quesitos de Avaliação (Pontuação)
                    </Label>
                    <div className="flex flex-wrap gap-4 p-3 border border-gray-300 rounded-md bg-gray-50">
                      {QUESITOS_OPCOES.map((quesito) => (
                        <div key={quesito.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={quesito.value}
                            checked={formData.quesitos_de_avaliacao.includes(quesito.value)}
                            onCheckedChange={(isChecked) => handleQuesitoChange(quesito.value, isChecked)}
                            disabled={submitting}
                          />
                          <Label htmlFor={quesito.value} className="text-gray-700 font-normal select-none cursor-pointer">
                            {quesito.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divisor visual para separar seções básicas das avançadas */}
                  <div className="border-t border-gray-300 my-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurações Avançadas</h3>

                  {/* Participantes e Cotas */}
                  <ProvaParticipantesForm
                    requisitos={formData.requisito_usuario}
                    onChange={(requisitos) => setFormData({ ...formData, requisito_usuario: requisitos })}
                  />

                  {/* Restrições de Participação */}
                  <ProvaRestricoesForm
                    restricoes={formData.restricao_participacao}
                    onChange={(restricoes) => setFormData({ ...formData, restricao_participacao: restricoes })}
                  />

                  {/* Critérios de Elegibilidade */}
                  <ProvaElegibilidadeForm
                    criterios={formData.criterio_elegibilidade}
                    onChange={(criterios) => setFormData({ ...formData, criterio_elegibilidade: criterios })}
                    provaAtualId={editingProva?._id}
                  />

                  {/* Sequenciamento */}
                  <ProvaSequenciamentoForm
                    sequenciamento={formData.sequenciamento}
                    onChange={(sequenciamento) => setFormData({ ...formData, sequenciamento: sequenciamento })}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>{editingProva ? "Atualizar" : "Criar"} Prova</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="bg-white border-gray-200 shadow-md">
            <CardContent className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <p className="text-gray-600">Carregando provas...</p>
            </CardContent>
          </Card>
        )}

        {/* Provas List */}
        {!loading && (
          <div className="grid gap-4">
            {provas.length === 0 ? (
              <Card className="bg-white border-gray-200 shadow-md">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-gray-600">Nenhuma prova cadastrada. Crie sua primeira prova!</p>
                </CardContent>
              </Card>
            ) : (
              provas.map((prova) => (
                <Card key={prova._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl text-gray-900 mb-1 break-words">{prova.titulo}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600">
                          {traduzirFormato(prova.formato)} • {traduzirStatus(prova.status)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {prova.status === 'CONCLUIDA' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Impede o card de abrir o modal de edição
                            abrirModalResultado(prova);
                          }}
                          className="border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800"
                          disabled={loading}
                        >
                          <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(prova)}
                          className="border-gray-300 hover:bg-gray-100"
                          disabled={loading}
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(prova._id)}
                          className="border-gray-300 hover:bg-red-50 hover:text-red-600"
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm sm:text-base text-gray-900 break-words">{prova.descricao}</p>
                    
                    {/* Data e informações adicionais */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Início</p>
                        <p className="text-xs sm:text-sm text-gray-900">{formatarData(prova.data_inicio)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Término</p>
                        <p className="text-xs sm:text-sm text-gray-900">{formatarData(prova.data_fim)}</p>
                      </div>
                      {prova.quesitos_de_avaliacao && prova.quesitos_de_avaliacao.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Quesitos</p>
                          <p className="text-xs sm:text-sm text-gray-900 break-words">{prova.quesitos_de_avaliacao.join(", ")}</p>
                        </div>
                      )}
                      {prova.requisito_usuario && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Requisito</p>
                          <p className="text-xs sm:text-sm text-gray-900 break-words">{formatarRequisitos(prova.requisito_usuario)}</p>
                        </div>
                      )}
                      {formatarPontuacao(prova.pontuacao) && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 uppercase font-semibold">Pontuação</p>
                              <p className="text-xs sm:text-sm text-gray-900 break-words">{formatarPontuacao(prova.pontuacao)}</p>
                            </div>
                           )}
                    </div>

                    {/* Novos critérios US14 */}
                    {(formatarCriteriosElegibilidade(prova.criterio_elegibilidade) || 
                      formatarRestricoes(prova.restricao_participacao) || 
                      formatarSequenciamento(prova.sequenciamento)) && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Configurações Avançadas</p>
                        <div className="space-y-1">
                          {formatarCriteriosElegibilidade(prova.criterio_elegibilidade) && (
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Elegibilidade:</span> {formatarCriteriosElegibilidade(prova.criterio_elegibilidade)}
                              </p>
                            </div>
                          )}
                          {formatarRestricoes(prova.restricao_participacao) && (
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Restrições:</span> {formatarRestricoes(prova.restricao_participacao)}
                              </p>
                            </div>
                          )}
                          {formatarSequenciamento(prova.sequenciamento) && (
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Sequenciamento:</span> {formatarSequenciamento(prova.sequenciamento)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
            <LancarResultadoModal 
              prova={provaParaResultado}
              isOpen={modalResultadoOpen}
              onClose={fecharModalResultado}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminProvas;
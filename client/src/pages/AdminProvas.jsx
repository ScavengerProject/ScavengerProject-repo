import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Edit, Trash2, ArrowLeft, Loader } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";
import { provasService } from "../services/api";
import ProvaRestricoesForm from "../components/ProvaRestricoesForm";
import ProvaElegibilidadeForm from "../components/ProvaElegibilidadeForm";
import ProvaSequenciamentoForm from "../components/ProvaSequenciamentoForm";
import ProvaParticipantesForm from "../components/ProvaParticipantesForm";

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
    return "✓ Ilimitado (todos)";
  }

  // Contar vagas disponíveis
  const vagas = Object.entries(requisitos)
    .filter(([_, valor]) => Number(valor) > 0)
    .map(([chave, valor]) => `${requisitoMap[chave] || chave}: ${valor}`)
    .join(" | ");

  if (vagas) {
    return vagas;
  }

  return "⚠️ Sem vagas (0 para todos)";
};

const AdminProvas = () => {
  const navigate = useNavigate();
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProva, setEditingProva] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
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
  }, []);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Provas</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Provas da Gincana</h2>
            <p className="text-gray-600">Crie e gerencie as provas do evento</p>
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
                      <SelectTrigger className="bg-white border-gray-300">
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-gray-900 text-xl mb-1">{prova.titulo}</CardTitle>
                        <CardDescription className="text-gray-600">
                          {traduzirFormato(prova.formato)} • {traduzirStatus(prova.status)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(prova)}
                          className="border-gray-300 hover:bg-gray-100"
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(prova._id)}
                          className="border-gray-300 hover:bg-red-50 hover:text-red-600"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-gray-900">{prova.descricao}</p>
                    
                    {/* Data e informações adicionais */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Início</p>
                        <p className="text-sm text-gray-900">{formatarData(prova.data_inicio)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Término</p>
                        <p className="text-sm text-gray-900">{formatarData(prova.data_fim)}</p>
                      </div>
                      {prova.quesitos_de_avaliacao && prova.quesitos_de_avaliacao.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Quesitos</p>
                          <p className="text-sm text-gray-900">{prova.quesitos_de_avaliacao.join(", ")}</p>
                        </div>
                      )}
                      {prova.requisito_usuario && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Requisito</p>
                          <p className="text-sm text-gray-900">{formatarRequisitos(prova.requisito_usuario)}</p>
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
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminProvas;
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
<<<<<<< HEAD
import { Plus, Edit, Trash2, ArrowLeft, Loader } from "lucide-react";
import { provasService } from "../services/api";

const AdminProvas = () => {
  const navigate = useNavigate();
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
=======
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";

const QUESITOS_OPCOES = [
  { value: 'TEMPO', label: 'Tempo de Execução' },
  { value: 'PRODUTIVIDADE', label: 'Produtividade/Volume' },
];

const AdminProvas = () => {
  const navigate = useNavigate();
  const [provas, setProvas] = useState([
    {
      id: "1",
      titulo: "Prova de Conhecimento",
      formato: "Quiz",
      descricao: "Perguntas de cultura geral",
      quesitos_de_avaliacao: ['TEMPO'],
    },
    {
      id: "2",
      titulo: "Gincana Esportiva",
      formato: "Esportiva",
      descricao: "Competição de corrida e arremesso",
    },
  ]);

>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProva, setEditingProva] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
<<<<<<< HEAD
    formato: "",
    data_inicio: "",
    data_fim: "",
    status: "NAO_INICIADA",
    quesito_de_avalicao: "",
    requisito_usuario: "",
=======
    quesitos_de_avaliacao: [],
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
  });

  // Carregar provas ao montar o componente
  useEffect(() => {
    carregarProvas();
  }, []);

  const carregarProvas = async () => {
    try {
      setLoading(true);
      const response = await provasService.listar();
      setProvas(response.provas || []);
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
<<<<<<< HEAD
      formato: "",
      data_inicio: "",
      data_fim: "",
      status: "NAO_INICIADA",
      quesito_de_avalicao: "",
      requisito_usuario: "",
=======
      quesitos_de_avaliacao: [],
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
    });
    setEditingProva(null);
  };

<<<<<<< HEAD
  const handleSubmit = async (e) => {
=======
  // função para manipular o array de quesitos
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

  const handleSubmit = (e) => {
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
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
        setProvas([...provas, response.prova]);
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
    setFormData({
      titulo: prova.titulo,
      descricao: prova.descricao,
<<<<<<< HEAD
      formato: prova.formato,
      data_inicio: prova.data_inicio ? new Date(prova.data_inicio).toISOString().split('T')[0] : "",
      data_fim: prova.data_fim ? new Date(prova.data_fim).toISOString().split('T')[0] : "",
      status: prova.status || "NAO_INICIADA",
      quesito_de_avalicao: prova.quesito_de_avalicao || "",
      requisito_usuario: prova.requisito_usuario || "",
=======
      quesitos_de_avaliacao: prova.quesitos_de_avaliacao || [],
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
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
      QUIZ: "Quiz",
      PERFOMANCE: "Performance",
      ESPORTE: "Esporte",
      CRIATIVA: "Criativa",
    };
    return formatoMap[formato] || formato;
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
<<<<<<< HEAD

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
                        <SelectItem value="QUIZ">Quiz</SelectItem>
                        <SelectItem value="PERFOMANCE">Performance</SelectItem>
                        <SelectItem value="ESPORTE">Esporte</SelectItem>
                        <SelectItem value="CRIATIVA">Criativa</SelectItem>
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

                  {/* Quesito de Avaliação */}
                  <div className="grid gap-2">
                    <Label htmlFor="quesito" className="text-gray-900 font-medium">
                      Quesito de Avaliação
                    </Label>
                    <Select value={formData.quesito_de_avalicao} onValueChange={(value) => setFormData({ ...formData, quesito_de_avalicao: value })} disabled={submitting}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="TEMPO">Tempo</SelectItem>
                        <SelectItem value="PRODUTIVIDADE">Produtividade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Requisito de Usuário */}
                  <div className="grid gap-2">
                    <Label htmlFor="requisito" className="text-gray-900 font-medium">
                      Requisito de Usuário
                    </Label>
                    <Select value={formData.requisito_usuario} onValueChange={(value) => setFormData({ ...formData, requisito_usuario: value })} disabled={submitting}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="ALUNOS_FUNDAMENTAL">Alunos Fundamental</SelectItem>
                        <SelectItem value="ALUNOS_MEDIO">Alunos Médio</SelectItem>
                        <SelectItem value="PROFESSORES">Professores</SelectItem>
                        <SelectItem value="PAI/MÃE">Pai/Mãe</SelectItem>
                      </SelectContent>
                    </Select>
=======
                  <div className="grid gap-2">
                    <Label htmlFor="quesitos" className="text-gray-900 font-medium">
                      Quesitos de Avaliação (Pontuação)
                    </Label>
                    <div className="flex flex-wrap gap-4 p-3 border border-gray-300 rounded-md bg-gray-50">
                      {QUESITOS_OPCOES.map((quesito) => (
                        <div key={quesito.value} className="flex items-center space-x-2">
                          
                          <Checkbox
                            id={quesito.value}
                            // Checa se o quesito está no array atual do formData
                            checked={formData.quesitos_de_avaliacao.includes(quesito.value)}
                            // Chama a função que adiciona/remove o quesito do array
                            onCheckedChange={(isChecked) => handleQuesitoChange(quesito.value, isChecked)}
                          />
                          <Label htmlFor={quesito.value} className="text-gray-700 font-normal select-none">
                            {quesito.label}
                          </Label>
                        </div>
                      ))}
                    </div>
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
                  </div>
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
<<<<<<< HEAD

        {/* Loading State */}
        {loading && (
          <Card className="bg-white border-gray-200 shadow-md">
            <CardContent className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <p className="text-gray-600">Carregando provas...</p>
            </CardContent>
          </Card>
        )}

=======
>>>>>>> d90d7d959f77460bd7089948bca9429a807f9d99
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
                      {prova.quesito_de_avalicao && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Quesito</p>
                          <p className="text-sm text-gray-900">{prova.quesito_de_avalicao}</p>
                        </div>
                      )}
                      {prova.requisito_usuario && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Requisito</p>
                          <p className="text-sm text-gray-900">{prova.requisito_usuario}</p>
                        </div>
                      )}
                    </div>
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
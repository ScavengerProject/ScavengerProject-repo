import { useState } from "react";
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
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";

const AdminProvas = () => {
  const navigate = useNavigate();
  const [provas, setProvas] = useState([
    {
      id: "1",
      titulo: "Prova de Conhecimento",
      formato: "Quiz",
      descricao: "Perguntas de cultura geral",
    },
    {
      id: "2",
      titulo: "Gincana Esportiva",
      formato: "Esportiva",
      descricao: "Competição de corrida e arremesso",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProva, setEditingProva] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    formato: "",
    descricao: "",
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      formato: "",
      descricao: "",
    });
    setEditingProva(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.titulo || !formData.formato || !formData.descricao) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (editingProva) {
      setProvas(
        provas.map((p) =>
          p.id === editingProva.id
            ? { ...editingProva, ...formData }
            : p
        )
      );
      toast.success("Prova atualizada com sucesso!");
    } else {
      const newProva = {
        id: Date.now().toString(),
        ...formData,
      };
      setProvas([...provas, newProva]);
      toast.success("Prova criada com sucesso!");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (prova) => {
    setEditingProva(prova);
    setFormData({
      titulo: prova.titulo,
      formato: prova.formato,
      descricao: prova.descricao,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    setProvas(provas.filter((p) => p.id !== id));
    toast.success("Prova excluída com sucesso!");
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
            <DialogContent className="sm:max-w-[525px] bg-white border-gray-300">
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
                  <div className="grid gap-2">
                    <Label htmlFor="titulo" className="text-gray-900 font-medium">
                      Título da Prova
                    </Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Prova de Conhecimento"
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="formato" className="text-gray-900 font-medium">
                      Formato da Prova
                    </Label>
                    <Select value={formData.formato} onValueChange={(value) => setFormData({ ...formData, formato: value })}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Selecione o formato" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="Quiz">Quiz</SelectItem>
                        <SelectItem value="Esportiva">Esportiva</SelectItem>
                        <SelectItem value="Criativa">Criativa</SelectItem>
                        <SelectItem value="Cultural">Cultural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descricao" className="text-gray-900 font-medium">
                      Descrição
                    </Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva a prova..."
                      className="bg-white border-gray-300"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {editingProva ? "Atualizar" : "Criar"} Prova
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Provas List */}
        <div className="grid gap-4">
          {provas.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-md">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-gray-600">Nenhuma prova cadastrada. Crie sua primeira prova!</p>
              </CardContent>
            </Card>
          ) : (
            provas.map((prova) => (
              <Card key={prova.id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-gray-900 text-xl mb-1">{prova.titulo}</CardTitle>
                      <CardDescription className="text-gray-600">
                        {prova.formato}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(prova)}
                        className="border-gray-300 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(prova.id)}
                        className="border-gray-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 mb-3">{prova.descricao}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminProvas;
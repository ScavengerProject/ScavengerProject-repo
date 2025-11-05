import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { 
  ArrowLeft, 
  UserPlus, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Users, 
  UserCheck, 
  UserX,
  Loader,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Heart,
  Shield
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usuariosService } from "../services/api";
import { toast } from "../components/ui/toast";

const AdminUsuarios = () => {
  const navigate = useNavigate();
  const { usuario: usuarioLogado } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  
  // Modal de criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  // Modal de confirmação de exclusão
  const [modalExclusao, setModalExclusao] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    tipo: "ALUNO",
    turma: "",
    matricula: "",
    status: "ATIVO"
  });

  const TIPOS_USUARIO = [
    { value: "ADMIN", label: "Administrador", icon: Shield },
    { value: "COORDENADOR", label: "Coordenador", icon: ShieldCheck },
    { value: "PROFESSOR", label: "Professor", icon: BookOpen },
    { value: "ALUNO", label: "Aluno", icon: GraduationCap },
    { value: "PAI/MÃE", label: "Pai/Mãe", icon: Heart }
  ];

  const TURMAS_DISPONIVEIS = [
    "EF - 1º Ano", "EF - 2º Ano", "EF - 3º Ano", "EF - 4º Ano", "EF - 5º Ano",
    "EF - 6º Ano", "EF - 7º Ano", "EF - 8º Ano", "EF - 9º Ano", "EM - 1º Ano",
    "EM - 2º Ano", "EM - 3º Ano"
  ];

  useEffect(() => {
    if (usuarioLogado?.tipo !== 'ADMIN') {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/');
      return;
    }
    carregarDados();
  }, [usuarioLogado, navigate]);

  useEffect(() => {
    aplicarFiltros();
  }, [usuarios, searchTerm, filtroTipo, filtroStatus, filtroTurma]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [usuariosData, estatisticasData] = await Promise.all([
        usuariosService.listar(),
        usuariosService.obterEstatisticas()
      ]);
      setUsuarios(usuariosData);
      setEstatisticas(estatisticasData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...usuarios];

    // Filtro de busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultado = resultado.filter(u => 
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.matricula && u.matricula.toLowerCase().includes(termo))
      );
    }

    // Filtro de tipo
    if (filtroTipo) {
      resultado = resultado.filter(u => u.tipo === filtroTipo);
    }

    // Filtro de status
    if (filtroStatus) {
      resultado = resultado.filter(u => u.status === filtroStatus);
    }

    // Filtro de turma
    if (filtroTurma) {
      resultado = resultado.filter(u => u.turma === filtroTurma);
    }

    setFilteredUsuarios(resultado);
  };

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setUsuarioEditando(null);
    setFormData({
      nome: "",
      email: "",
      senha: "",
      telefone: "",
      tipo: "ALUNO",
      turma: "",
      matricula: "",
      status: "ATIVO"
    });
    setMostrarSenha(false);
    setModalAberto(true);
  };

  const abrirModalEditar = (usuario) => {
    setModoEdicao(true);
    setUsuarioEditando(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      telefone: usuario.telefone || "",
      tipo: usuario.tipo,
      turma: usuario.turma || "",
      matricula: usuario.matricula || "",
      status: usuario.status
    });
    setMostrarSenha(false);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModoEdicao(false);
    setUsuarioEditando(null);
    setMostrarSenha(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome || !formData.email || !formData.tipo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!modoEdicao && !formData.senha) {
      toast.error("A senha é obrigatória para novos usuários");
      return;
    }

    if ((formData.tipo === 'ALUNO' || formData.tipo === 'COORDENADOR') && !formData.turma) {
      toast.error("Turma é obrigatória para alunos e coordenadores");
      return;
    }

    try {
      setSalvando(true);
      
      const dadosParaEnviar = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone || null,
        tipo: formData.tipo,
        turma: formData.turma || null,
        matricula: formData.matricula || null,
        status: formData.status
      };

      // Incluir senha apenas se fornecida
      if (formData.senha && formData.senha.trim() !== '') {
        dadosParaEnviar.senha = formData.senha;
      }

      if (modoEdicao) {
        await usuariosService.atualizar(usuarioEditando._id, dadosParaEnviar);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await usuariosService.criar(dadosParaEnviar);
        toast.success("Usuário criado com sucesso!");
      }

      fecharModal();
      carregarDados();
    } catch (error) {
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalExclusao = (usuario) => {
    setUsuarioParaExcluir(usuario);
    setModalExclusao(true);
  };

  const fecharModalExclusao = () => {
    setUsuarioParaExcluir(null);
    setModalExclusao(false);
  };

  const handleExcluir = async () => {
    if (!usuarioParaExcluir) return;

    try {
      setExcluindo(true);
      await usuariosService.deletar(usuarioParaExcluir._id);
      toast.success("Usuário deletado com sucesso!");
      fecharModalExclusao();
      carregarDados();
    } catch (error) {
      toast.error(error.message || "Erro ao deletar usuário");
    } finally {
      setExcluindo(false);
    }
  };

  const handleAlternarStatus = async (usuario) => {
    try {
      await usuariosService.alternarStatus(usuario._id);
      toast.success(`Usuário ${usuario.status === 'ATIVO' ? 'desativado' : 'ativado'} com sucesso!`);
      carregarDados();
    } catch (error) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const limparFiltros = () => {
    setSearchTerm("");
    setFiltroTipo("");
    setFiltroStatus("");
    setFiltroTurma("");
  };

  const getTipoIcon = (tipo) => {
    const tipoObj = TIPOS_USUARIO.find(t => t.value === tipo);
    const IconComponent = tipoObj?.icon || Users;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTipoLabel = (tipo) => {
    return TIPOS_USUARIO.find(t => t.value === tipo)?.label || tipo;
  };

  const getTipoBadgeColor = (tipo) => {
    const colors = {
      'ADMIN': 'bg-purple-100 text-purple-800 border-purple-300',
      'COORDENADOR': 'bg-blue-100 text-blue-800 border-blue-300',
      'PROFESSOR': 'bg-green-100 text-green-800 border-green-300',
      'ALUNO': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'PAI/MÃE': 'bg-pink-100 text-pink-800 border-pink-300'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Carregando usuários...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
          </div>
          <Button 
            onClick={abrirModalCriar}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ativos</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.ativos}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inativos</p>
                    <p className="text-2xl font-bold text-red-600">{estatisticas.inativos}</p>
                  </div>
                  <UserX className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Alunos</p>
                    <p className="text-2xl font-bold text-yellow-600">{estatisticas.porTipo?.ALUNO || 0}</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Professores</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.porTipo?.PROFESSOR || 0}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card className="mb-6 bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Nome, email ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filtroTipo">Tipo de Usuário</Label>
                <select
                  id="filtroTipo"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {TIPOS_USUARIO.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filtroStatus">Status</Label>
                <select
                  id="filtroStatus"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div>
                <Label htmlFor="filtroTurma">Turma</Label>
                <select
                  id="filtroTurma"
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  {TURMAS_DISPONIVEIS.map(turma => (
                    <option key={turma} value={turma}>{turma}</option>
                  ))}
                </select>
              </div>
            </div>
            {(searchTerm || filtroTipo || filtroStatus || filtroTurma) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de usuários */}
        <div className="space-y-3">
          {filteredUsuarios.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">Nenhum usuário encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou criar um novo usuário.</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsuarios.map((usuario) => (
              <Card key={usuario._id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{usuario.nome}</h3>
                          <Badge className={`${getTipoBadgeColor(usuario.tipo)} flex items-center gap-1`}>
                            {getTipoIcon(usuario.tipo)}
                            {getTipoLabel(usuario.tipo)}
                          </Badge>
                          <Badge className={usuario.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {usuario.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{usuario.email}</span>
                          {usuario.telefone && <span>{usuario.telefone}</span>}
                          {usuario.matricula && <span>Matrícula: {usuario.matricula}</span>}
                          {usuario.turma && <span>{usuario.turma}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlternarStatus(usuario)}
                        className={usuario.status === 'ATIVO' ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}
                      >
                        {usuario.status === 'ATIVO' ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalEditar(usuario)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirModalExclusao(usuario)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={usuario._id === usuarioLogado.id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Modal de Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {modoEdicao 
                ? 'Atualize as informações do usuário. Deixe a senha em branco para mantê-la inalterada.' 
                : 'Preencha os dados para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  name="nome"
                  autoComplete="off"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senha">Senha {!modoEdicao && '*'}</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    name="new-password"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required={!modoEdicao}
                    placeholder={modoEdicao ? "Deixe em branco para manter" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  autoComplete="off"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo de Usuário *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_USUARIO.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="turma">
                  Turma {(formData.tipo === 'ALUNO' || formData.tipo === 'COORDENADOR') && '*'}
                </Label>
                <Select
                  value={formData.turma || undefined}
                  onValueChange={(value) => setFormData({ ...formData, turma: value })}
                  disabled={formData.tipo !== 'ALUNO' && formData.tipo !== 'COORDENADOR'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TURMAS_DISPONIVEIS.map(turma => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.tipo !== 'ALUNO' && formData.tipo !== 'COORDENADOR' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Apenas alunos e coordenadores possuem turma
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  name="matricula"
                  autoComplete="off"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-700 text-white">
                {salvando ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  modoEdicao ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={modalExclusao} onOpenChange={setModalExclusao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioParaExcluir?.nome}</strong>? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={fecharModalExclusao}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExcluir} 
              disabled={excluindo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindo ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsuarios;


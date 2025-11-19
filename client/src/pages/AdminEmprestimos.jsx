import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { emprestimosService, equipesService, provasService } from '../services/api';
import { ArrowLeft, Plus, X, Clock } from 'lucide-react';

export default function AdminEmprestimos() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [emprestimos, setEmprestimos] = useState([]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCriar, setOpenCriar] = useState(false);
  const [openEncerrar, setOpenEncerrar] = useState(false);
  const [encerrarId, setEncerrarId] = useState(null);
  const [justificativaEncerramento, setJustificativaEncerramento] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ATIVO');

  // Formulário para criar empréstimo
  const [formCriar, setFormCriar] = useState({
    usuario_id: '',
    equipe_destino_id: '',
    prova_id: '',
    inicio: '',
    fim: '',
  });

  // Carregar dados necessários
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Listar empréstimos
      const emprestimosList = await emprestimosService.listar(filtroStatus);
      setEmprestimos(emprestimosList || []);

      // Listar equipes para o dropdown
      const equipesPublicas = await equipesService.listarEquipesGincana();
      setEquipes(equipesPublicas || []);

      // Listar provas para o dropdown
      const provasList = await provasService.listar();
      setProvas(provasList || []);

      // Listar usuários disponíveis (membros de equipes)
      const usuariosList = await equipesService.listarTodosMembros();
      setUsuariosDisponiveis(usuariosList || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  const criarEmprestimo = async () => {
    try {
      if (!formCriar.usuario_id || !formCriar.equipe_destino_id || !formCriar.prova_id) {
        toast.error('Preenchimento obrigatório: aluno, equipe destino e prova');
        return;
      }

      await emprestimosService.criar(
        formCriar.usuario_id,
        formCriar.equipe_destino_id,
        formCriar.prova_id,
        formCriar.inicio ? new Date(formCriar.inicio).toISOString() : undefined,
        formCriar.fim ? new Date(formCriar.fim).toISOString() : undefined
      );

      toast.success('Empréstimo criado com sucesso');
      setOpenCriar(false);
      setFormCriar({
        usuario_id: '',
        equipe_destino_id: '',
        prova_id: '',
        inicio: '',
        fim: '',
      });
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao criar empréstimo');
    }
  };

  const confirmarEncerramento = (id) => {
    setEncerrarId(id);
    setJustificativaEncerramento('');
    setOpenEncerrar(true);
  };

  const encerrarEmprestimo = async () => {
    if (!encerrarId) return;
    try {
      await emprestimosService.encerrar(encerrarId, justificativaEncerramento || undefined);
      toast.success('Empréstimo encerrado com sucesso');
      setOpenEncerrar(false);
      setEncerrarId(null);
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao encerrar empréstimo');
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  // Obter nome do usuário pelo ID
  const obterNomeUsuario = (userId) => {
    const usr = usuariosDisponiveis.find(u => u._id === userId);
    return usr ? usr.nome : '—';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empréstimos de Alunos</h1>
            <p className="text-sm text-gray-600">
              {filtroStatus === 'ATIVO' && (
                <span className="text-blue-600 font-semibold">
                  {emprestimos.length} pendentes
                </span>
              )}
              {filtroStatus === 'ENCERRADO' && (
                <span className="text-gray-600">
                  {emprestimos.length} encerrados
                </span>
              )}
              {filtroStatus === 'CANCELADO' && (
                <span className="text-red-600">
                  {emprestimos.length} cancelados
                </span>
              )}
            </p>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpenCriar(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Empréstimo
          </Button>
        </div>
        {/* Filtros */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-gray-700 font-medium">Filtrar por:</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">
                  <span className="text-blue-600 font-semibold">● Pendentes (Ativos)</span>
                </SelectItem>
                <SelectItem value="ENCERRADO">
                  <span className="text-gray-600">● Encerrados</span>
                </SelectItem>
                <SelectItem value="CANCELADO">
                  <span className="text-red-600">● Cancelados</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Empréstimos */}
        <div className="grid gap-4">
          {emprestimos.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhum empréstimo {filtroStatus.toLowerCase()} encontrado.
                </p>
              </CardContent>
            </Card>
          ) : (
            emprestimos.map((emp) => (
              <Card key={emp._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Aluno e Equipes */}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {emp.usuario_id?.nome ?? '—'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {emp.equipe_origem_id?.equipe_id?.nome ?? '—'} →{' '}
                          {emp.equipe_destino_id?.equipe_id?.nome ?? '—'}
                        </p>
                      </div>

                      {/* Prova */}
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Prova:</span> {emp.prova_id?.titulo ?? '—'}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            emp.status === 'ATIVO'
                              ? 'bg-green-100 text-green-800'
                              : emp.status === 'ENCERRADO'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>

                      {/* Datas */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>
                          <Clock className="inline h-3 w-3 mr-1" />
                          Início: {formatarData(emp.inicio)}
                        </p>
                        {emp.fim && (
                          <p>
                            <Clock className="inline h-3 w-3 mr-1" />
                            Fim: {formatarData(emp.fim)}
                          </p>
                        )}
                      </div>

                      {/* Justificativa de Encerramento */}
                      {emp.justificativa_encerramento && (
                        <div className="text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
                          <p className="font-medium text-yellow-900">Justificativa:</p>
                          <p className="text-yellow-800">{emp.justificativa_encerramento}</p>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {emp.status === 'ATIVO' && usuario.tipo === 'ADMIN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => confirmarEncerramento(emp._id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      {/* Dialog: Criar Empréstimo */}
      <Dialog open={openCriar} onOpenChange={setOpenCriar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Empréstimo</DialogTitle>
            <DialogDescription>
              Autorize o empréstimo temporário de um aluno para uma prova específica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Aluno */}
            <div className="space-y-2">
              <Label htmlFor="aluno" className="text-gray-700">
                Aluno <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formCriar.usuario_id}
                onValueChange={(value) =>
                  setFormCriar({ ...formCriar, usuario_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosDisponiveis.map((usr) => (
                    <SelectItem key={usr._id} value={usr._id}>
                      {usr.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Selecione o aluno que será emprestado para outra equipe
              </p>
            </div>

            {/* Equipe Destino */}
            <div className="space-y-2">
              <Label htmlFor="equipe" className="text-gray-700">
                Equipe Destino <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formCriar.equipe_destino_id}
                onValueChange={(value) =>
                  setFormCriar({ ...formCriar, equipe_destino_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((eq) => (
                    <SelectItem key={eq._id} value={eq._id}>
                      {eq.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prova */}
            <div className="space-y-2">
              <Label htmlFor="prova" className="text-gray-700">
                Prova <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formCriar.prova_id}
                onValueChange={(value) =>
                  setFormCriar({ ...formCriar, prova_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma prova" />
                </SelectTrigger>
                <SelectContent>
                  {provas.map((prova) => (
                    <SelectItem key={prova._id} value={prova._id}>
                      {prova.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label htmlFor="inicio" className="text-gray-700">
                Data de Início (opcional)
              </Label>
              <Input
                id="inicio"
                type="datetime-local"
                value={formCriar.inicio}
                onChange={(e) =>
                  setFormCriar({ ...formCriar, inicio: e.target.value })
                }
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label htmlFor="fim" className="text-gray-700">
                Data de Fim (opcional)
              </Label>
              <Input
                id="fim"
                type="datetime-local"
                value={formCriar.fim}
                onChange={(e) =>
                  setFormCriar({ ...formCriar, fim: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCriar(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={criarEmprestimo}
            >
              Criar Empréstimo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Encerrar Empréstimo */}
      <Dialog open={openEncerrar} onOpenChange={setOpenEncerrar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar Empréstimo</DialogTitle>
            <DialogDescription>
              Informe uma justificativa opcional para o encerramento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              placeholder="Justificativa (opcional)"
              value={justificativaEncerramento}
              onChange={(e) => setJustificativaEncerramento(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEncerrar(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={encerrarEmprestimo}
            >
              Encerrar Empréstimo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}

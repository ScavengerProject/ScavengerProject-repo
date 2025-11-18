import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { emprestimosService } from '../services/api';
import { ArrowLeft, Users, Clock, X, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';

export default function CoordGerenciarEmprestimos() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [emprestimos, setEmprestimos] = useState([]);
  const [minhaEquipeId, setMinhaEquipeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openEncerrar, setOpenEncerrar] = useState(false);
  const [emprestimoSelecionado, setEmprestimoSelecionado] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ATIVO');
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); // 'TODOS', 'EMPRESTADOS', 'RECEBIDOS'

  const carregarDados = async () => {
    try {
      setLoading(true);
      const status = filtroStatus === 'TODOS' ? null : filtroStatus;
      const emprestimosList = await emprestimosService.listar(status);
      
      console.log('💼 Empréstimos carregados:', emprestimosList);
      console.log('👤 Usuario ID:', usuario._id);
      console.log('📋 Total de empréstimos:', emprestimosList?.length || 0);
      
      setEmprestimos(emprestimosList || []);
      
      // Buscar ID da equipe se ainda não tiver
      if (!minhaEquipeId && emprestimosList.length > 0) {
        // Tentar encontrar a equipe do coordenador nos empréstimos
        const empComOrigem = emprestimosList.find(e => e.equipe_origem_id?.equipe_gincana_id?.coordenador_usuario_id === usuario._id);
        const empComDestino = emprestimosList.find(e => e.equipe_destino_id?.equipe_gincana_id?.coordenador_usuario_id === usuario._id);
        
        if (empComOrigem) {
          const equipId = String(empComOrigem.equipe_origem_id.equipe_id._id);
          console.log('✅ Equipe encontrada (origem):', equipId);
          setMinhaEquipeId(equipId);
        } else if (empComDestino) {
          const equipId = String(empComDestino.equipe_destino_id.equipe_id._id);
          console.log('✅ Equipe encontrada (destino):', equipId);
          setMinhaEquipeId(equipId);
        } else {
          console.log('⚠️ Equipe não encontrada nos empréstimos');
        }
      }
    } catch (e) {
      console.error('❌ Erro ao carregar empréstimos:', e);
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  const abrirDialogEncerrar = (emprestimo) => {
    setEmprestimoSelecionado(emprestimo);
    setJustificativa('');
    setOpenEncerrar(true);
  };

  const encerrarEmprestimo = async () => {
    if (!emprestimoSelecionado) return;

    try {
      await emprestimosService.encerrar(
        emprestimoSelecionado._id,
        justificativa || undefined
      );

      toast.success('Empréstimo encerrado com sucesso!');
      setOpenEncerrar(false);
      setEmprestimoSelecionado(null);
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao encerrar empréstimo');
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const badges = {
      ATIVO: { text: 'Ativo', color: 'bg-green-100 text-green-800' },
      ENCERRADO: { text: 'Encerrado', color: 'bg-gray-100 text-gray-800' },
      CANCELADO: { text: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  // Filtrar empréstimos por tipo (emprestados ou recebidos)
  const emprestimosFiltrados = emprestimos.filter(emp => {
    if (!minhaEquipeId) return true; // Se não temos o ID ainda, mostra todos
    
    const origemId = String(emp.equipe_origem_id?.equipe_id?._id || emp.equipe_origem_id?._id);
    const destinoId = String(emp.equipe_destino_id?.equipe_id?._id || emp.equipe_destino_id?._id);
    
    if (filtroTipo === 'EMPRESTADOS') {
      // Membros que minha equipe emprestou para outras
      return origemId === minhaEquipeId;
    } else if (filtroTipo === 'RECEBIDOS') {
      // Membros que minha equipe recebeu de outras
      return destinoId === minhaEquipeId;
    }
    return true; // TODOS - mostra emprestados e recebidos
  });

  if (loading) {
    return (
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Empréstimos</h1>
          <p className="text-sm text-gray-600">
            Visualize e gerencie os empréstimos de membros
          </p>
        </div>
        {/* Filtros */}
        <div className="mb-6 flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-gray-700 font-medium">Status:</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ATIVO">Ativos</SelectItem>
                <SelectItem value="ENCERRADO">Encerrados</SelectItem>
                <SelectItem value="CANCELADO">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="tipo" className="text-gray-700 font-medium">Tipo:</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="EMPRESTADOS">Emprestados</SelectItem>
                <SelectItem value="RECEBIDOS">Recebidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700">Total de Empréstimos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-900">{emprestimos.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-700">Empréstimos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-900">
                {emprestimos.filter(e => e.status === 'ATIVO').length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-700">Empréstimos Encerrados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {emprestimos.filter(e => e.status === 'ENCERRADO').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Empréstimos */}
        <div className="grid gap-4">
          {emprestimosFiltrados.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhum empréstimo encontrado.
                </p>
              </CardContent>
            </Card>
          ) : (
            emprestimosFiltrados.map((emp) => (
              <Card key={emp._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Membro */}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {emp.usuario_id?.nome || '—'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {emp.usuario_id?.email || '—'} • {emp.usuario_id?.turma || 'Sem turma'}
                        </p>
                      </div>

                      {/* Fluxo de Empréstimo */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded border border-blue-200">
                          <span className="text-sm font-medium text-blue-900">
                            {emp.equipe_origem_id?.equipe_id?.nome || '—'}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded border border-purple-200">
                          <span className="text-sm font-medium text-purple-900">
                            {emp.equipe_destino_id?.equipe_id?.nome || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Prova */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700">Prova:</p>
                        <p className="text-sm text-gray-900 mt-1">{emp.prova_id?.titulo || '—'}</p>
                      </div>

                      {/* Datas e Status */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {getStatusBadge(emp.status)}
                        <span className="text-xs text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          Início: {formatarData(emp.inicio)}
                        </span>
                        {emp.fim && (
                          <span className="text-xs text-gray-500">
                            Fim: {formatarData(emp.fim)}
                          </span>
                        )}
                      </div>

                      {/* Justificativa */}
                      {emp.justificativa && (
                        <div className="text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
                          <p className="font-medium text-yellow-900">Justificativa:</p>
                          <p className="text-yellow-800">{emp.justificativa}</p>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {emp.status === 'ATIVO' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => abrirDialogEncerrar(emp)}
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

      {/* Dialog: Encerrar Empréstimo */}
      <Dialog open={openEncerrar} onOpenChange={setOpenEncerrar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar Empréstimo</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja encerrar este empréstimo? O membro retornará à sua equipe original.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {emprestimoSelecionado && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {emprestimoSelecionado.usuario_id?.nome}
                </p>
                <p className="text-xs text-gray-600">
                  {emprestimoSelecionado.equipe_origem_id?.equipe_id?.nome} → {emprestimoSelecionado.equipe_destino_id?.equipe_id?.nome}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="justificativa" className="text-gray-700">
                Justificativa (opcional)
              </Label>
              <Textarea
                id="justificativa"
                placeholder="Motivo do encerramento..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </div>
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


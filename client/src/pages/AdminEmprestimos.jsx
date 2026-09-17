import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { emprestimosService } from '../services/api';
import { X, Clock, Info } from 'lucide-react';
import { ehAdmin } from '../lib/perfis';

export default function AdminEmprestimos() {
  const { usuario, logout } = useAuth();
  const [emprestimos, setEmprestimos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openEncerrar, setOpenEncerrar] = useState(false);
  const [encerrarId, setEncerrarId] = useState(null);
  const [justificativaEncerramento, setJustificativaEncerramento] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ATIVO');

  // Esta tela é só de acompanhamento: o ADMIN não cria empréstimo, então não
  // precisa mais das listas de equipes, provas e alunos que alimentavam o
  // formulário de criação.
  const carregarDados = async () => {
    try {
      setLoading(true);
      const emprestimosList = await emprestimosService.listar(filtroStatus);
      setEmprestimos(emprestimosList || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

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
        </div>

        {/* O ADMIN não empresta alunos: ele decide as solicitações. O empréstimo
            em si nasce do acordo entre os dois coordenadores. */}
        <div className="mb-6 flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <p className="text-sm text-blue-900">
            Empréstimos são criados pelos coordenadores: um solicita reforço, você
            aprova a solicitação em <strong>Aprovar Solicitações</strong> e o
            coordenador que ofertou combina com o solicitante. Aqui você acompanha
            os empréstimos em vigor e pode encerrá-los.
          </p>
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
                    {emp.status === 'ATIVO' && ehAdmin(usuario) && (
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

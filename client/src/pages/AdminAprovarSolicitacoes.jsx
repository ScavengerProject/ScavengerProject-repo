import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { solicitacoesEmprestimoService } from '../services/api';
import { ArrowLeft, Check, X, Clock, Users } from 'lucide-react';

export default function AdminAprovarSolicitacoes() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDecisao, setOpenDecisao] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [tipoDecisao, setTipoDecisao] = useState(''); // 'APROVAR' ou 'REJEITAR'
  const [justificativa, setJustificativa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('PENDENTE_APROVACAO');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const solicitacoesList = await solicitacoesEmprestimoService.listar(
        filtroStatus === 'TODOS' ? null : filtroStatus
      );
      setSolicitacoes(solicitacoesList || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  const abrirDialogDecisao = (solicitacao, tipo) => {
    setSolicitacaoSelecionada(solicitacao);
    setTipoDecisao(tipo);
    setJustificativa('');
    setOpenDecisao(true);
  };

  const decidirSolicitacao = async () => {
    if (!solicitacaoSelecionada) return;

    try {
      if (tipoDecisao === 'APROVAR') {
        await solicitacoesEmprestimoService.aprovar(
          solicitacaoSelecionada._id,
          justificativa || undefined
        );
        toast.success('Solicitação aprovada! As equipes foram notificadas.');
      } else if (tipoDecisao === 'REJEITAR') {
        if (!justificativa) {
          toast.error('Justificativa é obrigatória para rejeitar.');
          return;
        }
        await solicitacoesEmprestimoService.rejeitar(
          solicitacaoSelecionada._id,
          justificativa
        );
        toast.success('Solicitação rejeitada.');
      }

      setOpenDecisao(false);
      setSolicitacaoSelecionada(null);
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao processar solicitação');
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDENTE_APROVACAO: { text: 'Pendente Aprovação', color: 'bg-yellow-100 text-yellow-800' },
      APROVADA: { text: 'Aprovada', color: 'bg-green-100 text-green-800' },
      EM_ANDAMENTO: { text: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      CONCLUIDA: { text: 'Concluída', color: 'bg-gray-100 text-gray-800' },
      REJEITADA: { text: 'Rejeitada', color: 'bg-red-100 text-red-800' },
      CANCELADA: { text: 'Cancelada', color: 'bg-gray-100 text-gray-600' },
    };
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
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
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Aprovar Solicitações de Empréstimo</h1>
          <p className="text-sm text-gray-600">
            Revise e aprove solicitações de empréstimo entre equipes
          </p>
        </div>
        {/* Filtros */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-gray-700 font-medium">Filtrar por:</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                <SelectItem value="PENDENTE_APROVACAO">Pendente Aprovação</SelectItem>
                <SelectItem value="APROVADA">Aprovada</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                <SelectItem value="REJEITADA">Rejeitada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Solicitações */}
        <div className="grid gap-4">
          {solicitacoes.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhuma solicitação encontrada.
                </p>
              </CardContent>
            </Card>
          ) : (
            solicitacoes.map((sol) => (
              <Card key={sol._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Coordenador e Equipe */}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {sol.coordenador_solicitante_id?.nome || '—'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Equipe: {sol.equipe_solicitante_id?.equipe_id?.nome || '—'}
                        </p>
                      </div>

                      {/* Prova */}
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Prova:</span> {sol.prova_id?.titulo || '—'}
                        </p>
                        {sol.prova_id?.data_inicio && (
                          <p className="text-xs text-gray-500">
                            Data: {formatarData(sol.prova_id.data_inicio)}
                          </p>
                        )}
                      </div>

                      {/* Quantidade e Critérios */}
                      <div className="flex gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{sol.quantidade_solicitada} pessoa(s)</span>
                        </div>
                        {sol.criterios?.genero && sol.criterios.genero !== 'QUALQUER' && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Gênero: {sol.criterios.genero}
                          </span>
                        )}
                        {sol.criterios?.niveis_escolares?.length > 0 && (
                          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Níveis: {sol.criterios.niveis_escolares.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700">Motivo:</p>
                        <p className="text-sm text-gray-600 mt-1">{sol.motivo}</p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sol.status)}
                        <span className="text-xs text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatarData(sol.criado_em)}
                        </span>
                      </div>

                      {/* Decisão Admin */}
                      {(sol.aprovado_por || sol.justificativa_admin) && (
                        <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="font-medium text-blue-900">
                            Decisão: {sol.aprovado_por?.nome || '—'} em {formatarData(sol.aprovado_em)}
                          </p>
                          {sol.justificativa_admin && (
                            <p className="text-blue-800 mt-1">{sol.justificativa_admin}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {sol.status === 'PENDENTE_APROVACAO' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => abrirDialogDecisao(sol, 'APROVAR')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => abrirDialogDecisao(sol, 'REJEITAR')}
                        >
                          <X className="h-4 w-4 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      {/* Dialog: Decisão */}
      <Dialog open={openDecisao} onOpenChange={setOpenDecisao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tipoDecisao === 'APROVAR' ? 'Aprovar' : 'Rejeitar'} Solicitação
            </DialogTitle>
            <DialogDescription>
              {tipoDecisao === 'APROVAR'
                ? 'Ao aprovar, todas as equipes serão notificadas e poderão ofertar membros.'
                : 'Informe uma justificativa para a rejeição.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {solicitacaoSelecionada && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {solicitacaoSelecionada.coordenador_solicitante_id?.nome}
                </p>
                <p className="text-xs text-gray-600">
                  {solicitacaoSelecionada.quantidade_solicitada} pessoa(s) para{' '}
                  {solicitacaoSelecionada.prova_id?.titulo}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="justificativa" className="text-gray-700">
                Justificativa{tipoDecisao === 'REJEITAR' ? ' *' : ' (opcional)'}
              </Label>
              <Textarea
                id="justificativa"
                placeholder={
                  tipoDecisao === 'APROVAR'
                    ? 'Mensagem opcional para o coordenador...'
                    : 'Explique o motivo da rejeição...'
                }
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDecisao(false)}>
              Cancelar
            </Button>
            <Button
              className={
                tipoDecisao === 'APROVAR'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
              onClick={decidirSolicitacao}
            >
              {tipoDecisao === 'APROVAR' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}


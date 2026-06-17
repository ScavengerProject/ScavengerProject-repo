import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { migracoesService } from '../services/api';
import { Check, X, Clock, ArrowRight } from 'lucide-react';

export default function AprovarMigracoes() {
  const { usuario, logout } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDecisao, setOpenDecisao] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [tipoDecisao, setTipoDecisao] = useState(''); // 'APROVAR' ou 'REJEITAR'
  const [justificativa, setJustificativa] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const lista = await migracoesService.listarPendentes();
      setSolicitacoes(lista || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirDialogDecisao = (solicitacao, tipo) => {
    setSolicitacaoSelecionada(solicitacao);
    setTipoDecisao(tipo);
    setJustificativa('');
    setOpenDecisao(true);
  };

  const decidirSolicitacao = async () => {
    if (!solicitacaoSelecionada) return;

    const aprovar = tipoDecisao === 'APROVAR';
    if (!aprovar && !justificativa.trim()) {
      toast.error('Justificativa é obrigatória para rejeitar.');
      return;
    }

    try {
      await migracoesService.decidir(
        solicitacaoSelecionada._id,
        aprovar,
        justificativa.trim() || undefined
      );
      toast.success(aprovar ? 'Solicitação aprovada! O membro foi migrado.' : 'Solicitação rejeitada.');
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Solicitações de Migração</h1>
          <p className="text-sm text-gray-600">
            Avalie os pedidos de entrada na sua equipe. Ao aprovar, o membro é migrado automaticamente.
          </p>
        </div>

        {/* Lista de Solicitações */}
        <div className="grid gap-4">
          {solicitacoes.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhuma solicitação pendente.
                </p>
              </CardContent>
            </Card>
          ) : (
            solicitacoes.map((sol) => (
              <Card key={sol._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Solicitante */}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {sol.usuario_id?.nome || '—'}
                        </p>
                        {sol.usuario_id?.email && (
                          <p className="text-sm text-gray-600">{sol.usuario_id.email}</p>
                        )}
                      </div>

                      {/* Origem → Destino */}
                      <div className="flex items-center gap-2 text-sm text-gray-700 flex-wrap">
                        <span className="font-medium">{sol.equipe_origem?.nome ?? '—'}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{sol.equipe_destino?.nome ?? '—'}</span>
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700">Motivo:</p>
                        <p className="text-sm text-gray-600 mt-1">{sol.motivo}</p>
                      </div>

                      {/* Data */}
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                        <span className="text-xs text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatarData(sol.criado_em)}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
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
                {tipoDecisao === 'APROVAR' ? 'Aprovar' : 'Rejeitar'} Migração
              </DialogTitle>
              <DialogDescription>
                {tipoDecisao === 'APROVAR'
                  ? 'Ao aprovar, o membro será movido para a sua equipe e notificado.'
                  : 'Informe uma justificativa para a rejeição. O solicitante será notificado.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {solicitacaoSelecionada && (
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {solicitacaoSelecionada.usuario_id?.nome}
                  </p>
                  <p className="text-xs text-gray-600">
                    {solicitacaoSelecionada.equipe_origem?.nome ?? '—'} →{' '}
                    {solicitacaoSelecionada.equipe_destino?.nome ?? '—'}
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
                      ? 'Mensagem opcional para o solicitante...'
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

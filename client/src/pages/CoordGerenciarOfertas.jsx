import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { solicitacoesEmprestimoService, ofertasEmprestimoService } from '../services/api';
import { ArrowLeft, Check, X, Users, Clock } from 'lucide-react';

export default function CoordGerenciarOfertas() {
  const navigate = useNavigate();
  const { solicitacaoId } = useParams();
  const { usuario, logout } = useAuth();
  const [solicitacao, setSolicitacao] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDecisao, setOpenDecisao] = useState(false);
  const [ofertaSelecionada, setOfertaSelecionada] = useState(null);
  const [tipoDecisao, setTipoDecisao] = useState(''); // 'ACEITAR' ou 'RECUSAR'
  const [justificativa, setJustificativa] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar solicitação com detalhes
      const solData = await solicitacoesEmprestimoService.obter(solicitacaoId);
      setSolicitacao(solData);
      setOfertas(solData.ofertas || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
      navigate('/coord/solicitar-emprestimo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (solicitacaoId) {
      carregarDados();
    }
  }, [solicitacaoId]);

  const abrirDialogDecisao = (oferta, tipo) => {
    setOfertaSelecionada(oferta);
    setTipoDecisao(tipo);
    setJustificativa('');
    setOpenDecisao(true);
  };

  const decidirOferta = async () => {
    if (!ofertaSelecionada) return;

    try {
      if (tipoDecisao === 'ACEITAR') {
        await ofertasEmprestimoService.aceitar(
          ofertaSelecionada._id,
          justificativa || undefined
        );
        toast.success('Oferta aceita! Os empréstimos foram criados.');
      } else if (tipoDecisao === 'RECUSAR') {
        await ofertasEmprestimoService.recusar(
          ofertaSelecionada._id,
          justificativa || undefined
        );
        toast.success('Oferta recusada.');
      }

      setOpenDecisao(false);
      setOfertaSelecionada(null);
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao processar oferta');
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDENTE: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      ACEITA: { text: 'Aceita', color: 'bg-green-100 text-green-800' },
      RECUSADA: { text: 'Recusada', color: 'bg-red-100 text-red-800' },
      CANCELADA: { text: 'Cancelada', color: 'bg-gray-100 text-gray-600' },
    };
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const ofertasPendentes = ofertas.filter(o => o.status === 'PENDENTE');
  const ofertasProcessadas = ofertas.filter(o => o.status !== 'PENDENTE');

  if (loading) {
    return (
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!solicitacao) {
    return (
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">Solicitação não encontrada.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Ofertas</h1>
          <p className="text-sm text-gray-600">
            Revise e aceite ofertas para sua solicitação
          </p>
        </div>
        {/* Detalhes da Solicitação */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-900">Sua Solicitação</h2>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  solicitacao.status === 'APROVADA' ? 'bg-green-100 text-green-800' :
                  solicitacao.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {solicitacao.status}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                <span className="font-medium">Prova:</span> {solicitacao.prova_id?.titulo || '—'}
              </p>
              <p className="text-sm text-blue-700">
                <span className="font-medium">Quantidade necessária:</span> {solicitacao.quantidade_solicitada} pessoa(s)
              </p>
              {solicitacao.criterios?.genero && solicitacao.criterios.genero !== 'QUALQUER' && (
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Gênero:</span> {solicitacao.criterios.genero}
                </p>
              )}
              {solicitacao.criterios?.niveis_escolares?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-1">Níveis escolares:</p>
                  <div className="flex flex-wrap gap-1">
                    {solicitacao.criterios.niveis_escolares.map(nivel => (
                      <span key={nivel} className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded">
                        {nivel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ofertas Pendentes */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ofertas Pendentes ({ofertasPendentes.length})
          </h3>
          <div className="grid gap-4">
            {ofertasPendentes.length === 0 ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-8">
                  <p className="text-center text-gray-600">
                    Nenhuma oferta pendente no momento. Aguarde outras equipes ofertarem membros.
                  </p>
                </CardContent>
              </Card>
            ) : (
              ofertasPendentes.map((oferta) => (
                <Card key={oferta._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Equipe Ofertante */}
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">
                            {oferta.equipe_ofertante_id?.equipe_id?.nome || '—'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Coordenador: {oferta.coordenador_ofertante_id?.nome || '—'}
                          </p>
                        </div>

                        {/* Membros Oferecidos */}
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Membros oferecidos ({oferta.membros_oferecidos?.length || 0}):
                          </p>
                          <div className="space-y-1">
                            {oferta.membros_oferecidos?.map((membro) => (
                              <div key={membro.usuario_id?._id} className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {membro.usuario_id?.nome || '—'}
                                </span>
                                {membro.usuario_id?.turma && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                    {membro.usuario_id.turma}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mensagem */}
                        {oferta.mensagem && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <p className="text-xs font-medium text-blue-900">Mensagem:</p>
                            <p className="text-sm text-blue-700 mt-1">{oferta.mensagem}</p>
                          </div>
                        )}

                        {/* Data */}
                        <div className="text-xs text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          Recebido em {formatarData(oferta.criado_em)}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => abrirDialogDecisao(oferta, 'ACEITAR')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => abrirDialogDecisao(oferta, 'RECUSAR')}
                        >
                          <X className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Ofertas Processadas */}
        {ofertasProcessadas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Ofertas ({ofertasProcessadas.length})
            </h3>
            <div className="grid gap-4">
              {ofertasProcessadas.map((oferta) => (
                <Card key={oferta._id} className="bg-gray-50 border-gray-200">
                  <CardContent className="py-4">
                    <div className="space-y-3">
                      {/* Equipe Ofertante */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {oferta.equipe_ofertante_id?.equipe_id?.nome || '—'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {oferta.membros_oferecidos?.length || 0} membro(s) oferecido(s)
                          </p>
                        </div>
                        {getStatusBadge(oferta.status)}
                      </div>

                      {/* Justificativa */}
                      {oferta.justificativa_decisao && (
                        <div className="bg-white p-2 rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-700">Justificativa:</p>
                          <p className="text-sm text-gray-600 mt-1">{oferta.justificativa_decisao}</p>
                        </div>
                      )}

                      {/* Data */}
                      <div className="text-xs text-gray-500">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Processado em {formatarData(oferta.decidido_em)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* Dialog: Decisão */}
      <Dialog open={openDecisao} onOpenChange={setOpenDecisao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tipoDecisao === 'ACEITAR' ? 'Aceitar' : 'Recusar'} Oferta
            </DialogTitle>
            <DialogDescription>
              {tipoDecisao === 'ACEITAR'
                ? 'Ao aceitar, os empréstimos serão criados automaticamente e os membros serão notificados.'
                : 'Informe uma justificativa opcional para a recusa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {ofertaSelecionada && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {ofertaSelecionada.equipe_ofertante_id?.equipe_id?.nome}
                </p>
                <p className="text-xs text-gray-600">
                  {ofertaSelecionada.membros_oferecidos?.length || 0} membro(s)
                </p>
                <div className="mt-2 space-y-1">
                  {ofertaSelecionada.membros_oferecidos?.map((membro) => (
                    <p key={membro.usuario_id?._id} className="text-xs text-gray-700">
                      • {membro.usuario_id?.nome || '—'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="justificativa" className="text-gray-700">
                {tipoDecisao === 'ACEITAR' ? 'Mensagem (opcional)' : 'Justificativa (opcional)'}
              </Label>
              <Textarea
                id="justificativa"
                placeholder={
                  tipoDecisao === 'ACEITAR'
                    ? 'Mensagem de agradecimento...'
                    : 'Explique o motivo da recusa...'
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
                tipoDecisao === 'ACEITAR'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
              onClick={decidirOferta}
            >
              {tipoDecisao === 'ACEITAR' ? 'Aceitar Oferta' : 'Recusar Oferta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}


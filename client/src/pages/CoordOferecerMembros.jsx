import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { solicitacoesEmprestimoService, ofertasEmprestimoService } from '../services/api';
import { Users, Clock, Send, Info, Lock } from 'lucide-react';

export default function CoordOferecerMembros() {
  const { usuario, logout } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOfertar, setOpenOfertar] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);
  const [mensagem, setMensagem] = useState('');
  // Contexto da oferta (membros + limitações), vindo do servidor para ESTA
  // solicitação. É a mesma avaliação que a rota de criar oferta usa.
  const [contexto, setContexto] = useState(null);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [erroMembros, setErroMembros] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar solicitações aprovadas (que não são da minha equipe)
      const solicitacoesList = await solicitacoesEmprestimoService.listar('APROVADA');

      // Filtrar solicitações que não são da minha equipe
      const solicitacoesDisponiveis = (solicitacoesList || []).filter(
        sol => String(sol.coordenador_solicitante_id?._id) !== String(usuario._id)
      );

      setSolicitacoes(solicitacoesDisponiveis);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  /**
   * Quem pode ser ofertado é decidido no servidor, nunca aqui: a turma real do
   * membro mora no vínculo com a escola (o campo antigo `usuario.turma` vem
   * null para quem entrou por convite), e só o servidor sabe quem já está
   * inscrito na prova, já foi emprestado ou já está numa oferta pendente.
   */
  const carregarMembrosOfertaveis = async (solicitacaoId) => {
    try {
      setCarregandoMembros(true);
      setErroMembros(null);
      const dados = await ofertasEmprestimoService.membrosOfertaveis(solicitacaoId);
      setContexto(dados);
    } catch (e) {
      setContexto(null);
      setErroMembros(e?.message || 'Não foi possível carregar os membros da sua equipe.');
    } finally {
      setCarregandoMembros(false);
    }
  };

  const abrirDialogOfertar = (solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setMembrosSelecionados([]);
    setMensagem('');
    setContexto(null);
    setOpenOfertar(true);
    carregarMembrosOfertaveis(solicitacao._id);
  };

  const membros = contexto?.membros || [];
  const ofertaveis = membros.filter((m) => m.ofertavel);
  const bloqueados = membros.filter((m) => !m.ofertavel);
  const vagasRestantes = contexto?.vagas_restantes ?? 0;
  const limiteAtingido = membrosSelecionados.length >= vagasRestantes;

  const toggleMembro = (membroId) => {
    setMembrosSelecionados(prev => {
      if (prev.includes(membroId)) return prev.filter(id => id !== membroId);
      // A quantidade pedida é um limite da solicitação, não uma sugestão: o
      // servidor recusa o excedente, então a tela não deixa nem selecionar.
      if (prev.length >= vagasRestantes) {
        toast.error(`Esta solicitação aceita no máximo ${vagasRestantes} pessoa(s).`);
        return prev;
      }
      return [...prev, membroId];
    });
  };

  const criarOferta = async () => {
    if (!solicitacaoSelecionada) return;

    if (membrosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um membro para ofertar');
      return;
    }

    try {
      setEnviando(true);
      await ofertasEmprestimoService.criar(
        solicitacaoSelecionada._id,
        membrosSelecionados,
        mensagem || undefined
      );

      toast.success('Oferta enviada com sucesso!');
      setOpenOfertar(false);
      setSolicitacaoSelecionada(null);
      setContexto(null);
      await carregarDados();
    } catch (e) {
      // `erros` traz TODOS os motivos de uma vez (ver services/api.js); mostrar
      // só o primeiro faria o coordenador corrigir a seleção um nome por vez.
      toast.error((e?.erros || [e?.message || 'Erro ao criar oferta']).join(' • '));
      // A recusa quase sempre significa que o estado mudou desde que a tela
      // carregou (alguém foi inscrito na prova, outra oferta foi aceita).
      await carregarMembrosOfertaveis(solicitacaoSelecionada._id);
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

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
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ofertar Membros</h1>
          <p className="text-sm text-gray-600">
            Ajude outras equipes oferecendo membros da sua equipe
          </p>
        </div>
        {/* Lista de Solicitações */}
        <div className="grid gap-4">
          {solicitacoes.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhuma solicitação disponível no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            solicitacoes.map((sol) => (
              <Card key={sol._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Equipe Solicitante */}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {sol.equipe_solicitante_id?.equipe_id?.nome || '—'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Coordenador: {sol.coordenador_solicitante_id?.nome || '—'}
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
                          <span className="font-medium">{sol.quantidade_solicitada} pessoa(s) necessária(s)</span>
                        </div>
                        {sol.criterios?.genero && sol.criterios.genero !== 'QUALQUER' && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Gênero: {sol.criterios.genero}
                          </span>
                        )}
                        {sol.criterios?.niveis_escolares?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sol.criterios.niveis_escolares.map(nivel => (
                              <span key={nivel} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {nivel}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700">Motivo:</p>
                        <p className="text-sm text-gray-600 mt-1">{sol.motivo}</p>
                      </div>

                      {/* Data */}
                      <div className="text-xs text-gray-500">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Solicitado em {formatarData(sol.criado_em)}
                      </div>
                    </div>

                    {/* Ações */}
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => abrirDialogOfertar(sol)}
                    >
                      <Send className="h-4 w-4 mr-1" /> Ofertar Membros
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      {/* Dialog: Ofertar Membros */}
      <Dialog open={openOfertar} onOpenChange={setOpenOfertar}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ofertar Membros</DialogTitle>
            <DialogDescription>
              Selecione os membros da sua equipe que você deseja ofertar para ajudar na prova.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {solicitacaoSelecionada && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {solicitacaoSelecionada.equipe_solicitante_id?.equipe_id?.nome}
                </p>
                <p className="text-xs text-blue-700">
                  Precisa de {solicitacaoSelecionada.quantidade_solicitada} pessoa(s) para{' '}
                  {solicitacaoSelecionada.prova_id?.titulo}
                </p>
              </div>
            )}

            {/* Limitações desta solicitação: responde por que metade da equipe
                aparece bloqueada logo abaixo. */}
            {contexto && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
                <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Limitações desta solicitação
                </p>
                <p className="text-xs text-amber-800">
                  Vagas ainda em aberto: <strong>{vagasRestantes}</strong> de{' '}
                  {solicitacaoSelecionada?.quantidade_solicitada}
                </p>
                {contexto.criterios?.niveis_escolares?.length > 0 && (
                  <p className="text-xs text-amber-800">
                    Só entram membros de: {contexto.criterios.niveis_escolares.join(', ')}
                  </p>
                )}
                {contexto.cotas?.length > 0 && (
                  <p className="text-xs text-amber-800">
                    A prova aceita {contexto.cotas.map((c) => c.label).join(', ')}.
                  </p>
                )}
                <p className="text-xs text-amber-800">
                  Quem já está inscrito nesta prova pela sua equipe não pode ser emprestado.
                </p>
              </div>
            )}

            {carregandoMembros && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin w-6 h-6 border-4 border-gray-300 border-t-transparent rounded-full" />
              </div>
            )}

            {erroMembros && (
              <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                <p className="text-sm text-red-800">{erroMembros}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => carregarMembrosOfertaveis(solicitacaoSelecionada?._id)}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Pedido já atendido: nada a selecionar, e dizer isso é melhor do
                que deixar o coordenador clicar e levar um toast por membro. */}
            {!carregandoMembros && contexto && vagasRestantes === 0 && (
              <div className="bg-gray-100 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-700">
                  Esta solicitação já foi atendida — não há mais vagas em aberto.
                </p>
              </div>
            )}

            {/* Membros que podem ser ofertados */}
            {!carregandoMembros && contexto && vagasRestantes > 0 && ofertaveis.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Podem ser ofertados ({ofertaveis.length})
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded bg-green-50">
                  {ofertaveis.map((membro) => {
                    const selecionado = membrosSelecionados.includes(membro.id);
                    const bloqueadoPeloLimite = !selecionado && limiteAtingido;
                    return (
                      <div
                        key={membro.id}
                        className={`flex items-center gap-3 p-2 rounded ${
                          bloqueadoPeloLimite ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
                        }`}
                        onClick={() => !bloqueadoPeloLimite && toggleMembro(membro.id)}
                      >
                        {/* O clique é tratado UMA vez, pela linha inteira: com o
                            checkbox também clicável, o evento subia para a linha
                            e a seleção era desfeita no mesmo clique. */}
                        <span className="pointer-events-none">
                          <Checkbox checked={selecionado} onCheckedChange={() => {}} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {membro.nome || '—'}
                            {membro.is_coordenador && (
                              <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                                Coordenador
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-600">
                            {membro.turma || 'Sem turma'} • {membro.email}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!carregandoMembros && contexto && vagasRestantes > 0 && ofertaveis.length === 0 && (
              <p className="text-center text-gray-600 py-4">
                Nenhum membro da sua equipe pode ser ofertado para esta solicitação.
              </p>
            )}

            {/* Bloqueados: aparecem com o motivo, em vez de sumirem da lista */}
            {!carregandoMembros && bloqueados.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Não podem ser ofertados ({bloqueados.length})
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
                  {bloqueados.map((membro) => (
                    <div key={membro.id} className="flex items-start gap-3 p-2 rounded">
                      <Lock className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{membro.nome || '—'}</p>
                        <p className="text-xs text-gray-500">
                          {membro.turma || 'Sem turma'} • {membro.email}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{membro.motivo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem opcional */}
            <div className="space-y-2">
              <Label htmlFor="mensagem" className="text-gray-700">
                Mensagem (opcional)
              </Label>
              <Textarea
                id="mensagem"
                placeholder="Adicione uma mensagem para o coordenador..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
              />
            </div>

            {/* Resumo */}
            {membrosSelecionados.length > 0 && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {membrosSelecionados.length} de {vagasRestantes} vaga(s) selecionada(s)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenOfertar(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={criarOferta}
              disabled={membrosSelecionados.length === 0 || enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar Oferta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}

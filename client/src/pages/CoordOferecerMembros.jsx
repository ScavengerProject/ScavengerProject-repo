import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { solicitacoesEmprestimoService, ofertasEmprestimoService, equipesService } from '../services/api';
import { ArrowLeft, Users, Clock, Send } from 'lucide-react';

export default function CoordOferecerMembros() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [minhaEquipe, setMinhaEquipe] = useState(null);
  const [membrosDisponiveis, setMembrosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOfertar, setOpenOfertar] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);
  const [mensagem, setMensagem] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar solicitações aprovadas (que não são da minha equipe)
      const solicitacoesList = await solicitacoesEmprestimoService.listar('APROVADA');
      
      // Carregar minha equipe
      const equipe = await equipesService.visualizarMinhaEquipe();
      setMinhaEquipe(equipe);

      // Filtrar solicitações que não são da minha equipe
      const solicitacoesDisponiveis = (solicitacoesList || []).filter(
        sol => String(sol.coordenador_solicitante_id?._id) !== String(usuario._id)
      );
      
      setSolicitacoes(solicitacoesDisponiveis);

      // Carregar membros da minha equipe
      if (equipe?.membros) {
        setMembrosDisponiveis(equipe.membros);
      }
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirDialogOfertar = (solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setMembrosSelecionados([]);
    setMensagem('');
    setOpenOfertar(true);
  };

  const toggleMembro = (membroId) => {
    setMembrosSelecionados(prev =>
      prev.includes(membroId)
        ? prev.filter(id => id !== membroId)
        : [...prev, membroId]
    );
  };

  const criarOferta = async () => {
    if (!solicitacaoSelecionada) return;

    if (membrosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um membro para ofertar');
      return;
    }

    try {
      await ofertasEmprestimoService.criar(
        solicitacaoSelecionada._id,
        membrosSelecionados,
        mensagem || undefined
      );

      toast.success('Oferta enviada com sucesso!');
      setOpenOfertar(false);
      setSolicitacaoSelecionada(null);
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao criar oferta');
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  const membroAtendeCriterios = (membro, criterios) => {
    if (!criterios) return true;

    // Verificar nível escolar
    if (criterios.niveis_escolares?.length > 0) {
      if (!membro.usuario_id?.turma || !criterios.niveis_escolares.includes(membro.usuario_id.turma)) {
        return false;
      }
    }

    // Verificar gênero (assumindo que temos essa informação no usuário)
    // Se não tiver, podemos ignorar esse critério
    // if (criterios.genero && criterios.genero !== 'QUALQUER') {
    //   if (membro.usuario_id?.genero !== criterios.genero) {
    //     return false;
    //   }
    // }

    return true;
  };

  const membrosRecomendados = membrosDisponiveis.filter(m => 
    solicitacaoSelecionada ? membroAtendeCriterios(m, solicitacaoSelecionada.criterios) : true
  );

  const membrosOutros = membrosDisponiveis.filter(m => 
    solicitacaoSelecionada ? !membroAtendeCriterios(m, solicitacaoSelecionada.criterios) : false
  );

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

            {/* Membros Recomendados */}
            {membrosRecomendados.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Membros Recomendados (atendem aos critérios)
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded bg-green-50">
                  {membrosRecomendados.map((membro) => (
                    <div
                      key={membro._id}
                      className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer"
                      onClick={() => toggleMembro(membro.usuario_id?._id)}
                    >
                      <Checkbox
                        id={membro._id}
                        checked={membrosSelecionados.includes(membro.usuario_id?._id)}
                        onCheckedChange={() => toggleMembro(membro.usuario_id?._id)}
                      />
                      <label htmlFor={membro._id} className="flex-1 cursor-pointer">
                        <p className="text-sm font-medium text-gray-900">
                          {membro.usuario_id?.nome || '—'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {membro.usuario_id?.turma || 'Sem turma'} • {membro.usuario_id?.email}
                        </p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outros Membros */}
            {membrosOutros.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Outros Membros
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded">
                  {membrosOutros.map((membro) => (
                    <div
                      key={membro._id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => toggleMembro(membro.usuario_id?._id)}
                    >
                      <Checkbox
                        id={membro._id}
                        checked={membrosSelecionados.includes(membro.usuario_id?._id)}
                        onCheckedChange={() => toggleMembro(membro.usuario_id?._id)}
                      />
                      <label htmlFor={membro._id} className="flex-1 cursor-pointer">
                        <p className="text-sm font-medium text-gray-900">
                          {membro.usuario_id?.nome || '—'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {membro.usuario_id?.turma || 'Sem turma'} • {membro.usuario_id?.email}
                        </p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {membrosDisponiveis.length === 0 && (
              <p className="text-center text-gray-600 py-4">
                Sua equipe não tem membros disponíveis no momento.
              </p>
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
                  {membrosSelecionados.length} membro(s) selecionado(s)
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
              disabled={membrosSelecionados.length === 0}
            >
              Enviar Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}


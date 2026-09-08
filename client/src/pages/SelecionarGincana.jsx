import React, { useState, useEffect } from 'react';
import { Trophy, Lock, ChevronRight, ArrowLeft, Plus, CalendarDays } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import { useGincana } from '../hooks/useGincana';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { gincanasService } from '../services/api';
import { ehAdmin } from '../lib/perfis';

const periodo = (gincana) => {
  const fmt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null);
  const inicio = fmt(gincana.data_inicio);
  const fim = fmt(gincana.data_fim);
  if (inicio && fim) return `${inicio} a ${fim}`;
  return inicio || fim || null;
};

/**
 * Segunda tela do fluxo de entrada: qual gincana da escola ativa o usuário
 * quer acessar.
 *
 * Edições encerradas (marcadas como ENCERRADA/ARQUIVADA ou de anos que já
 * passaram) aparecem na lista como histórico, mas não podem ser abertas — a
 * API recusa o escopo delas de qualquer forma.
 *
 * Quem tem uma única gincana em andamento nunca vê esta tela.
 */
export default function SelecionarGincana() {
  const { usuario } = useAuth();
  const { escolaAtiva, minhasEscolas, limparEscolaAtiva } = useEscola();
  const {
    gincanasAcessiveis,
    gincanasEncerradas,
    loading,
    setGincanaAtiva,
    recarregarGincanas,
  } = useGincana();
  const [formAberto, setFormAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    ano: new Date().getFullYear(),
    descricao: '',
  });

  const isAdmin = ehAdmin(usuario);
  const podeTrocarEscola = minhasEscolas.length > 1;

  // Sem equipe ainda, `gincanasAcessiveis` vem vazio pra quem não é admin (só
  // lista gincanas onde já se participa). Sem isso o aluno nunca via a gincana
  // pra poder escolher uma equipe e se inscrever nela.
  //
  // Escolher uma dessas leva direto ao gate /selecionar-equipe (e não à
  // inscrição com MainLayout): é lá que a escolha da equipe é obrigatória, e a
  // gincana só passa a "existir" para a API depois que a equipe existe.
  const [gincanasDisponiveis, setGincanasDisponiveis] = useState([]);
  const [carregandoDisponiveis, setCarregandoDisponiveis] = useState(false);

  useEffect(() => {
    if (isAdmin || loading || gincanasAcessiveis.length > 0) {
      setGincanasDisponiveis([]);
      return;
    }
    let cancelado = false;
    setCarregandoDisponiveis(true);
    gincanasService.disponiveis()
      .then((lista) => { if (!cancelado) setGincanasDisponiveis(lista || []); })
      .catch((error) => {
        console.error('Erro ao carregar gincanas disponíveis:', error);
        if (!cancelado) setGincanasDisponiveis([]);
      })
      .finally(() => { if (!cancelado) setCarregandoDisponiveis(false); });
    return () => { cancelado = true; };
  }, [isAdmin, loading, gincanasAcessiveis.length]);

  const criarGincana = async (event) => {
    event.preventDefault();

    if (!escolaAtiva?._id) {
      toast.error('Selecione uma escola antes de criar a gincana.');
      return;
    }
    if (!form.nome.trim() || !form.ano) {
      toast.error('Nome e ano são obrigatórios.');
      return;
    }

    setCriando(true);
    try {
      // Não envia escola_id: a API vincula obrigatoriamente à escola ativa,
      // validada pelo header X-Escola-Id. Um ADMIN não consegue escolher outro
      // tenant pelo formulário.
      const criada = await gincanasService.criar({
        nome: form.nome.trim(),
        ano: Number(form.ano),
        descricao: form.descricao.trim(),
      });

      await recarregarGincanas();
      toast.success(`Gincana criada em ${escolaAtiva.nome}.`);
      setFormAberto(false);
      setGincanaAtiva(criada._id, '/');
    } catch (error) {
      toast.error(error.message || 'Não foi possível criar a gincana.');
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6 text-white gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold wrap-break-word">
              {escolaAtiva?.nome || 'Escola'}
            </h1>
            <p className="text-white/80 text-sm sm:text-base">Escolha a gincana que deseja acessar.</p>
          </div>
          {podeTrocarEscola && (
            <Button
              onClick={limparEscolaAtiva}
              className="bg-white/15 hover:bg-white/25 text-white flex items-center gap-2 shrink-0"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Trocar de escola</span>
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {loading && <p className="text-center text-gray-600 py-10">Carregando gincanas...</p>}

          {/* Escola sem nenhuma edição em andamento. Nomear a escola aqui é o
              que evita a sensação de laço para quem administra várias: sem
              isso, escolher a escola parecia "voltar para a mesma tela". */}
          {!loading && gincanasAcessiveis.length === 0 && !isAdmin && !carregandoDisponiveis && gincanasDisponiveis.length > 0 && (
            <div>
              <div className="text-center mb-4">
                <Trophy size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold text-gray-800">Você ainda não está em nenhuma equipe</p>
                <p className="text-sm text-gray-600 mt-1">
                  Escolha uma gincana em andamento para ver as equipes e se inscrever.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {gincanasDisponiveis.map((gincana) => (
                  <li key={gincana._id}>
                    <button
                      type="button"
                      onClick={() => setGincanaAtiva(gincana._id, '/selecionar-equipe')}
                      className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition flex items-start gap-3 group"
                    >
                      <span className="bg-blue-100 text-blue-700 rounded-lg p-2 shrink-0">
                        <Trophy size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-900 wrap-break-word">
                          {gincana.nome}
                        </span>
                        <span className="block text-xs text-gray-600 mt-0.5">{gincana.ano}</span>
                        {periodo(gincana) && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <CalendarDays size={12} />
                            {periodo(gincana)}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        size={20}
                        className="text-gray-400 group-hover:text-blue-600 shrink-0 mt-1"
                      />
                    </button>
                  </li>
                ))}
              </ul>
              {podeTrocarEscola && (
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={limparEscolaAtiva}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    Escolher outra escola
                  </Button>
                </div>
              )}
            </div>
          )}

          {!loading
            && gincanasAcessiveis.length === 0
            && (isAdmin || carregandoDisponiveis || gincanasDisponiveis.length === 0) && (
            <div className="text-center py-8">
              <Trophy size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="font-semibold text-gray-800">
                {escolaAtiva?.nome
                  ? `${escolaAtiva.nome} ainda não tem nenhuma gincana em andamento`
                  : 'Nenhuma gincana em andamento'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {carregandoDisponiveis
                  ? 'Carregando gincanas disponíveis...'
                  : isAdmin
                    ? 'Crie uma edição para esta escola ou escolha outra escola.'
                    : 'Assim que uma nova edição for aberta nesta escola, ela aparecerá aqui.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {isAdmin && (
                  <Button
                    onClick={() => setFormAberto(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Criar gincana nesta escola
                  </Button>
                )}
                {podeTrocarEscola && (
                  <Button
                    onClick={limparEscolaAtiva}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    Escolher outra escola
                  </Button>
                )}
              </div>
            </div>
          )}

          {!loading && gincanasAcessiveis.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {gincanasAcessiveis.map((gincana) => (
                <li key={gincana._id}>
                  <button
                    type="button"
                    onClick={() => setGincanaAtiva(gincana._id, '/')}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition flex items-start gap-3 group"
                  >
                    <span className="bg-blue-100 text-blue-700 rounded-lg p-2 shrink-0">
                      <Trophy size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900 wrap-break-word">
                        {gincana.nome}
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">{gincana.ano}</span>
                      {periodo(gincana) && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <CalendarDays size={12} />
                          {periodo(gincana)}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      size={20}
                      className="text-gray-400 group-hover:text-blue-600 shrink-0 mt-1"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && gincanasEncerradas.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Edições encerradas
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {gincanasEncerradas.map((gincana) => (
                  <li
                    key={gincana._id}
                    className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center gap-3 cursor-not-allowed"
                    title="Esta edição está encerrada e não pode ser acessada."
                  >
                    <Lock size={16} className="text-gray-400 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-600 wrap-break-word">
                        {gincana.nome}
                      </span>
                      <span className="block text-xs text-gray-500">{gincana.ano}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">
                      Encerrada
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova gincana</DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Escola: <strong>{escolaAtiva?.nome || 'Nenhuma escola selecionada'}</strong>
          </div>

          <form onSubmit={criarGincana} className="space-y-4">
            <div>
              <Label htmlFor="nova-gincana-nome">Nome</Label>
              <Input
                id="nova-gincana-nome"
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                placeholder="Ex.: Gincana 2026"
                disabled={criando}
                required
              />
            </div>
            <div>
              <Label htmlFor="nova-gincana-ano">Ano / edição</Label>
              <Input
                id="nova-gincana-ano"
                type="number"
                value={form.ano}
                onChange={(event) => setForm({ ...form, ano: event.target.value })}
                disabled={criando}
                required
              />
            </div>
            <div>
              <Label htmlFor="nova-gincana-descricao">Descrição (opcional)</Label>
              <Textarea
                id="nova-gincana-descricao"
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                disabled={criando}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormAberto(false)}
                disabled={criando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criando || !escolaAtiva?._id}>
                {criando ? 'Criando...' : 'Criar e acessar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

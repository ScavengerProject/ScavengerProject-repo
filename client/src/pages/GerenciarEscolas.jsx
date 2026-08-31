import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import MainLayout from '../components/MainLayout';
import { escolasService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { School, Plus, Power, CheckCircle, Users, Trash2, UserPlus } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { PERFIS_MULTI_ESCOLA, ehPerfilDeEscolaUnica } from '../lib/perfis';

// Perfis que fazem sentido dentro de uma escola (SUPER_ADMIN é global).
const PERFIS_ESCOLA = ['ADMIN', 'PROFESSOR', 'COORDENADOR', 'ALUNO', 'PAI/MÃE'];

// Rótulo do <option>: deixa explícito quais perfis prendem a pessoa a uma
// escola só, para o SUPER_ADMIN não descobrir a regra pelo erro do servidor.
const rotuloPerfil = (tipo) =>
  ehPerfilDeEscolaUnica(tipo) ? `${tipo} (uma escola só)` : `${tipo} (pode atuar em várias)`;

const statusColor = (status) => {
  switch (status) {
    case 'ATIVA': return 'bg-green-100 text-green-800';
    case 'INATIVA': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const GerenciarEscolas = () => {
  const { usuario, logout } = useAuth();
  const { recarregarEscolas } = useEscola();

  const [escolas, setEscolas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ nome: '', cidade: '', uf: '' });

  // Painel de vínculos da escola selecionada.
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [usuariosVinculados, setUsuariosVinculados] = useState([]);
  const [carregandoVinculos, setCarregandoVinculos] = useState(false);
  const [emailParaVincular, setEmailParaVincular] = useState('');
  // Vazio = herdar o papel base do usuário (um ADMIN entra como ADMIN).
  const [tipoParaVincular, setTipoParaVincular] = useState('');

  const fetchEscolas = async () => {
    try {
      const data = await escolasService.listar();
      setEscolas(data || []);
    } catch (error) {
      toast.error('Erro ao carregar escolas.');
      console.error('Erro na listagem de escolas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEscolas();
  }, []);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('O nome da escola é obrigatório.');
      return;
    }
    setIsSubmitting(true);
    try {
      await escolasService.criar({
        nome: form.nome.trim(),
        cidade: form.cidade.trim(),
        uf: form.uf.trim(),
      });
      toast.success('Escola criada com sucesso!');
      setIsModalOpen(false);
      setForm({ nome: '', cidade: '', uf: '' });
      await fetchEscolas();
      await recarregarEscolas(); // atualiza o seletor da navbar
    } catch (error) {
      toast.error(error.message || 'Falha ao criar escola.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const alterarStatus = async (escola, status) => {
    try {
      await escolasService.alterarStatus(escola._id, status);
      toast.success('Status atualizado.');
      await fetchEscolas();
      await recarregarEscolas();
    } catch (error) {
      toast.error(error.message || 'Falha ao atualizar status.');
    }
  };

  const abrirVinculos = async (escola) => {
    setEscolaSelecionada(escola);
    setCarregandoVinculos(true);
    try {
      const lista = await escolasService.listarUsuarios(escola._id);
      setUsuariosVinculados(lista || []);
    } catch (error) {
      toast.error(error.message || 'Falha ao carregar usuários da escola.');
      setUsuariosVinculados([]);
    } finally {
      setCarregandoVinculos(false);
    }
  };

  // Vincula por e-mail: o SUPER_ADMIN cola o e-mail de alguém já cadastrado em
  // outra escola e passa a dar acesso a esta também.
  const handleVincular = async (e) => {
    e.preventDefault();
    const email = emailParaVincular.trim().toLowerCase();
    if (!email) return;

    try {
      const resposta = await escolasService.vincularUsuario(escolaSelecionada._id, {
        email,
        ...(tipoParaVincular ? { tipo: tipoParaVincular } : {}),
      });
      toast.success(resposta?.message || 'Usuário vinculado à escola.');
      setEmailParaVincular('');
      setTipoParaVincular('');
      await abrirVinculos(escolaSelecionada);
    } catch (error) {
      toast.error(error.message || 'Falha ao vincular usuário.');
    }
  };

  // O papel vale só nesta escola: mudar aqui não altera o perfil da pessoa nas
  // outras escolas em que ela atua.
  const handleAlterarPapel = async (usuarioAlvo, novoTipo) => {
    if (!novoTipo || novoTipo === usuarioAlvo.tipo) return;
    try {
      await escolasService.alterarPapelUsuario(escolaSelecionada._id, usuarioAlvo._id, {
        tipo: novoTipo,
      });
      toast.success(`${usuarioAlvo.nome} agora é ${novoTipo} nesta escola.`);
      await abrirVinculos(escolaSelecionada);
    } catch (error) {
      toast.error(error.message || 'Falha ao alterar o perfil.');
    }
  };

  const handleDesvincular = async (usuarioAlvo) => {
    try {
      await escolasService.desvincularUsuario(escolaSelecionada._id, usuarioAlvo._id);
      toast.success('Vínculo removido.');
      await abrirVinculos(escolaSelecionada);
    } catch (error) {
      toast.error(error.message || 'Falha ao remover vínculo.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando escolas...</div>;
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <School className="text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Escolas</h1>
              <p className="text-gray-600 text-sm">
                Cada escola é um ambiente isolado, com suas próprias gincanas, equipes e usuários.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} /> Nova Escola
          </Button>
        </div>

        {escolas.length === 0 ? (
          <p className="text-gray-500">Nenhuma escola cadastrada ainda.</p>
        ) : (
          <div className="grid gap-4">
            {escolas.map((e) => (
              <Card key={e._id}>
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{e.nome}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span>
                    </div>
                    {(e.cidade || e.uf) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {[e.cidade, e.uf].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => abrirVinculos(e)} className="flex items-center gap-1">
                      <Users size={16} /> Usuários
                    </Button>
                    {e.status === 'ATIVA' ? (
                      <Button variant="outline" size="sm" onClick={() => alterarStatus(e, 'INATIVA')} className="flex items-center gap-1 text-gray-600">
                        <Power size={16} /> Desativar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => alterarStatus(e, 'ATIVA')} className="flex items-center gap-1">
                        <CheckCircle size={16} /> Reativar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Escola</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
                placeholder="Ex.: Escola Estadual Dom Pedro II"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="cidade">Cidade (opcional)</Label>
                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(ev) => setForm({ ...form, cidade: ev.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={form.uf}
                  maxLength={2}
                  onChange={(ev) => setForm({ ...form, uf: ev.target.value.toUpperCase() })}
                  placeholder="RS"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Painel de vínculos usuário <-> escola */}
      <Dialog open={!!escolaSelecionada} onOpenChange={(aberto) => !aberto && setEscolaSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuários — {escolaSelecionada?.nome}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleVincular} className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-48">
              <Label htmlFor="email-vinculo">Vincular usuário existente (e-mail)</Label>
              <Input
                id="email-vinculo"
                type="email"
                value={emailParaVincular}
                onChange={(ev) => setEmailParaVincular(ev.target.value)}
                placeholder="professor@escola.com"
              />
            </div>
            <div>
              <Label htmlFor="tipo-vinculo">Perfil nesta escola</Label>
              <select
                id="tipo-vinculo"
                value={tipoParaVincular}
                onChange={(ev) => setTipoParaVincular(ev.target.value)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Manter o perfil atual</option>
                {PERFIS_ESCOLA.map((t) => (
                  <option key={t} value={t}>{rotuloPerfil(t)}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus size={16} /> Vincular
            </Button>
          </form>

          <p className="text-xs text-gray-500">
            Use isto para dar acesso a alguém que já tem cadastro em outra escola — por exemplo,
            um professor que atua nas duas. O login continua sendo o mesmo, e o perfil escolhido
            aqui vale <strong>somente nesta escola</strong>: o papel dela nas outras não muda.
            <br />
            Só <strong>{PERFIS_MULTI_ESCOLA.join(' e ')}</strong> podem acumular escolas. Quem participa
            da gincana (aluno, coordenador, pai/mãe) pertence a <strong>uma escola só</strong> — para
            trazer um aluno de outra escola, remova antes o vínculo dele lá.
          </p>

          <div className="max-h-72 overflow-y-auto divide-y">
            {carregandoVinculos ? (
              <p className="text-sm text-gray-500 py-4">Carregando...</p>
            ) : usuariosVinculados.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Nenhum usuário vinculado a esta escola.</p>
            ) : (
              usuariosVinculados.map((u) => (
                <div key={u._id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.nome}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {u.email}
                      {(u.vinculos?.length || 0) > 1 && ` · atua em ${u.vinculos.length} escolas`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.tipo === 'SUPER_ADMIN' ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                        SUPER_ADMIN
                      </span>
                    ) : (
                      <select
                        value={u.tipo}
                        onChange={(ev) => handleAlterarPapel(u, ev.target.value)}
                        title={
                          (u.vinculos?.length || 0) > 1
                            ? 'Esta pessoa atua em mais de uma escola: só perfis de organização estão disponíveis.'
                            : 'Perfil desta pessoa nesta escola'
                        }
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs"
                      >
                        {PERFIS_ESCOLA.map((t) => (
                          <option
                            key={t}
                            value={t}
                            // Quem já atua em várias escolas não pode virar um
                            // perfil de participante sem antes perder os outros
                            // vínculos — a API recusaria de todo jeito.
                            disabled={(u.vinculos?.length || 0) > 1 && ehPerfilDeEscolaUnica(t)}
                          >
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDesvincular(u)}
                      className="flex items-center gap-1 text-red-600"
                    >
                      <Trash2 size={14} /> Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GerenciarEscolas;

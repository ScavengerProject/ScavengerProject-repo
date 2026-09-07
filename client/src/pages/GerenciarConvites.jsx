import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { convitesService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Ticket, Plus, Copy, Ban, Users, Clock } from 'lucide-react';
import { toast } from '../components/ui/toast';

// Mesma lista de séries que o resto do sistema usa (Usuario.js `TURMAS` no
// backend, espelhada também em AdminUsuarios.jsx).
const TURMAS_DISPONIVEIS = [
  'EF - 1º Ano', 'EF - 2º Ano', 'EF - 3º Ano', 'EF - 4º Ano', 'EF - 5º Ano',
  'EF - 6º Ano', 'EF - 7º Ano', 'EF - 8º Ano', 'EF - 9º Ano', 'EM - 1º Ano',
  'EM - 2º Ano', 'EM - 3º Ano',
];

const formatarData = (data) => (data ? new Date(data).toLocaleDateString('pt-BR') : '—');

const estaExpirado = (convite) => new Date(convite.expira_em) <= new Date();

const statusConvite = (convite) => {
  if (convite.revogado_em) return { texto: 'Revogado', cor: 'bg-gray-200 text-gray-700' };
  if (estaExpirado(convite)) return { texto: 'Expirado', cor: 'bg-amber-100 text-amber-800' };
  if (convite.limite_usos != null && convite.usos >= convite.limite_usos) {
    return { texto: 'Limite atingido', cor: 'bg-amber-100 text-amber-800' };
  }
  return { texto: 'Ativo', cor: 'bg-green-100 text-green-800' };
};

const GerenciarConvites = () => {
  const { usuario, logout } = useAuth();

  const [convites, setConvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // turma vazia = código PÚBLICO da escola (vínculo nasce PENDENTE, fila de
  // aprovação) — ver conviteController.criarConvite.
  const [form, setForm] = useState({ turma: '', expira_em: '', limite_usos: '' });

  // Painel "quem entrou" de um convite específico.
  const [convitesSelecionado, setConviteSelecionado] = useState(null);
  const [usuariosDoConvite, setUsuariosDoConvite] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  const fetchConvites = async () => {
    try {
      const data = await convitesService.listar();
      setConvites(data || []);
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar convites.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConvites();
  }, []);

  const handleCriar = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dados = {
        turma: form.turma || null,
        expira_em: form.expira_em ? new Date(form.expira_em).toISOString() : undefined,
        limite_usos: form.limite_usos ? Number(form.limite_usos) : null,
      };
      await convitesService.criar(dados);
      toast.success(
        form.turma
          ? 'Código de turma criado! O vínculo de quem entrar com ele já nasce ativo.'
          : 'Código público criado! Quem entrar com ele fica na fila de aprovação.'
      );
      setIsModalOpen(false);
      setForm({ turma: '', expira_em: '', limite_usos: '' });
      await fetchConvites();
    } catch (error) {
      toast.error(error.message || 'Falha ao criar convite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevogar = async (convite) => {
    try {
      await convitesService.revogar(convite._id);
      toast.success('Código revogado.');
      await fetchConvites();
    } catch (error) {
      toast.error(error.message || 'Falha ao revogar código.');
    }
  };

  const handleCopiar = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success('Código copiado.');
    } catch (error) {
      toast.error('Não foi possível copiar o código. Copie manualmente: ' + codigo);
    }
  };

  const abrirUsuarios = async (convite) => {
    setConviteSelecionado(convite);
    setCarregandoUsuarios(true);
    try {
      const lista = await convitesService.listarUsuarios(convite._id);
      setUsuariosDoConvite(lista || []);
    } catch (error) {
      toast.error(error.message || 'Falha ao carregar quem entrou com este código.');
      setUsuariosDoConvite([]);
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando convites...</div>;
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Ticket className="text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Convites</h1>
              <p className="text-gray-600 text-sm">
                Códigos de turma dão acesso imediato; o código público (sem turma) coloca quem
                entrar na fila de aprovação.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} /> Novo Convite
          </Button>
        </div>

        {convites.length === 0 ? (
          <p className="text-gray-500">Nenhum convite criado ainda.</p>
        ) : (
          <div className="grid gap-4">
            {convites.map((c) => {
              const status = statusConvite(c);
              return (
                <Card key={c._id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-lg font-bold text-gray-900 tracking-wider">{c.codigo}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cor}`}>{status.texto}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {c.turma ? c.turma : 'Público da escola (fila de aprovação)'}
                        {' · '}usos: {c.usos}{c.limite_usos != null ? ` / ${c.limite_usos}` : ' (sem limite)'}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> expira em {formatarData(c.expira_em)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleCopiar(c.codigo)} className="flex items-center gap-1">
                        <Copy size={16} /> Copiar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => abrirUsuarios(c)} className="flex items-center gap-1">
                        <Users size={16} /> Quem entrou
                      </Button>
                      {!c.revogado_em && (
                        <Button variant="outline" size="sm" onClick={() => handleRevogar(c)} className="flex items-center gap-1 text-red-600">
                          <Ban size={16} /> Revogar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4">
            <div>
              <Label htmlFor="turma-convite">Turma</Label>
              <Select
                value={form.turma || undefined}
                onValueChange={(value) => setForm({ ...form, turma: value })}
              >
                <SelectTrigger id="turma-convite">
                  <SelectValue placeholder="Nenhuma — código público (fila de aprovação)" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TURMAS_DISPONIVEIS.map((turma) => (
                    <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Com turma, quem entrar já fica com o vínculo ativo. Sem turma, o código fica
                público para a escola divulgar, e quem entrar cai na fila de aprovação.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expira-convite">Expira em (opcional)</Label>
                <Input
                  id="expira-convite"
                  type="date"
                  value={form.expira_em}
                  onChange={(ev) => setForm({ ...form, expira_em: ev.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Padrão: 14 dias a partir de hoje.</p>
              </div>
              <div>
                <Label htmlFor="limite-convite">Limite de usos (opcional)</Label>
                <Input
                  id="limite-convite"
                  type="number"
                  min="1"
                  placeholder="Sem limite"
                  value={form.limite_usos}
                  onChange={(ev) => setForm({ ...form, limite_usos: ev.target.value })}
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

      {/* Painel "quem entrou" */}
      <Dialog open={!!convitesSelecionado} onOpenChange={(aberto) => !aberto && setConviteSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quem entrou — {convitesSelecionado?.codigo}</DialogTitle>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto divide-y">
            {carregandoUsuarios ? (
              <p className="text-sm text-gray-500 py-4">Carregando...</p>
            ) : usuariosDoConvite.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Ninguém usou este código ainda.</p>
            ) : (
              usuariosDoConvite.map((u) => (
                <div key={u._id} className="py-2">
                  <p className="text-sm font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-600">
                    {u.email}{u.turma ? ` · ${u.turma}` : ''} · {u.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GerenciarConvites;

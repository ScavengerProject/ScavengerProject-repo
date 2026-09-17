import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGincana } from '../hooks/useGincana';
import MainLayout from '../components/MainLayout';
import { gincanasService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Trophy, Plus, Archive, CheckCircle, Power, Pencil, CalendarRange } from 'lucide-react';
import { toast } from '../components/ui/toast';

const statusColor = (status) => {
  switch (status) {
    case 'ATIVA': return 'bg-green-100 text-green-800';
    case 'ENCERRADA': return 'bg-yellow-100 text-yellow-800';
    case 'ARQUIVADA': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formVazio = () => ({
  nome: '',
  ano: new Date().getFullYear(),
  descricao: '',
  data_inicio: '',
  data_fim: '',
});

/**
 * O período da gincana é data sem hora: gravamos meia-noite UTC e lemos de volta
 * pelos componentes UTC. Converter pelo fuso local devolveria o dia anterior em
 * qualquer fuso a oeste de Greenwich — no Brasil, 01/03 viraria 28/02 a cada ida
 * e volta do formulário.
 */
const paraInputDate = (data) => {
  if (!data) return '';
  const d = new Date(data);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const paraISO = (valor) => (valor ? new Date(`${valor}T00:00:00.000Z`).toISOString() : null);

const formatarData = (data) => new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const periodoLegivel = ({ data_inicio, data_fim }) => {
  if (!data_inicio && !data_fim) return null;
  if (data_inicio && data_fim) return `${formatarData(data_inicio)} a ${formatarData(data_fim)}`;
  return data_inicio ? `a partir de ${formatarData(data_inicio)}` : `até ${formatarData(data_fim)}`;
};

const GerenciarGincanas = () => {
  const { usuario, logout } = useAuth();
  const { recarregarGincanas } = useGincana();

  const [gincanas, setGincanas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Gincana sendo editada; null significa que o modal está em modo de criação.
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVazio);

  const fetchGincanas = async () => {
    try {
      const data = await gincanasService.listar();
      setGincanas(data || []);
    } catch (error) {
      toast.error('Erro ao carregar gincanas.');
      console.error('Erro na listagem de gincanas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGincanas();
  }, []);

  const abrirCriacao = () => {
    setEditando(null);
    setForm(formVazio());
    setIsModalOpen(true);
  };

  const abrirEdicao = (gincana) => {
    setEditando(gincana);
    setForm({
      nome: gincana.nome,
      ano: gincana.ano,
      descricao: gincana.descricao || '',
      data_inicio: paraInputDate(gincana.data_inicio),
      data_fim: paraInputDate(gincana.data_fim),
    });
    setIsModalOpen(true);
  };

  const fecharModal = (aberto) => {
    setIsModalOpen(aberto);
    if (!aberto) setEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.ano) {
      toast.error('Nome e ano são obrigatórios.');
      return;
    }
    // Comparação direta funciona: os dois valores vêm no formato YYYY-MM-DD.
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) {
      toast.error('A data de término não pode ser anterior à de início.');
      return;
    }

    const dados = {
      nome: form.nome.trim(),
      ano: Number(form.ano),
      descricao: form.descricao.trim(),
      data_inicio: paraISO(form.data_inicio),
      data_fim: paraISO(form.data_fim),
    };

    setIsSubmitting(true);
    try {
      if (editando) {
        await gincanasService.atualizar(editando._id, dados);
        toast.success('Gincana atualizada!');
      } else {
        await gincanasService.criar(dados);
        toast.success('Gincana criada com sucesso!');
      }
      fecharModal(false);
      setForm(formVazio());
      await fetchGincanas();
      await recarregarGincanas(); // o seletor da navbar mostra nome e ano
    } catch (error) {
      toast.error(error.message || (editando ? 'Falha ao atualizar gincana.' : 'Falha ao criar gincana.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const alterarStatus = async (gincana, status) => {
    try {
      await gincanasService.alterarStatus(gincana._id, status);
      toast.success('Status atualizado.');
      await fetchGincanas();
      await recarregarGincanas();
    } catch (error) {
      toast.error(error.message || 'Falha ao atualizar status.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando gincanas...</div>;
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Gincanas</h1>
              <p className="text-gray-600 text-sm">Crie e gerencie as edições da gincana.</p>
            </div>
          </div>
          <Button onClick={abrirCriacao} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} /> Nova Gincana
          </Button>
        </div>

        {gincanas.length === 0 ? (
          <p className="text-gray-500">Nenhuma gincana cadastrada ainda.</p>
        ) : (
          <div className="grid gap-4">
            {gincanas.map((g) => {
              const periodo = periodoLegivel(g);
              return (
                <Card key={g._id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">{g.nome}</h2>
                        <span className="text-sm text-gray-500">({g.ano})</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(g.status)}`}>{g.status}</span>
                      </div>
                      {periodo && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                          <CalendarRange size={14} className="text-gray-400" /> {periodo}
                        </p>
                      )}
                      {g.descricao && <p className="text-sm text-gray-600 mt-1">{g.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => abrirEdicao(g)} className="flex items-center gap-1">
                        <Pencil size={16} /> Editar
                      </Button>
                      {g.status !== 'ATIVA' && (
                        <Button variant="outline" size="sm" onClick={() => alterarStatus(g, 'ATIVA')} className="flex items-center gap-1">
                          <CheckCircle size={16} /> Reativar
                        </Button>
                      )}
                      {g.status === 'ATIVA' && (
                        <Button variant="outline" size="sm" onClick={() => alterarStatus(g, 'ENCERRADA')} className="flex items-center gap-1">
                          <Power size={16} /> Encerrar
                        </Button>
                      )}
                      {g.status !== 'ARQUIVADA' && (
                        <Button variant="outline" size="sm" onClick={() => alterarStatus(g, 'ARQUIVADA')} className="flex items-center gap-1 text-gray-600">
                          <Archive size={16} /> Arquivar
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

      {/* Modal de criação e edição — o mesmo formulário nos dois modos. */}
      <Dialog open={isModalOpen} onOpenChange={fecharModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Gincana' : 'Nova Gincana'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Gincana 2026"
                required
              />
            </div>
            <div>
              <Label htmlFor="ano">Ano / Edição</Label>
              <Input
                id="ano"
                type="number"
                value={form.ano}
                onChange={(e) => setForm({ ...form, ano: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="data_inicio">Início (opcional)</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="data_fim">Término (opcional)</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              O período é informativo: quem encerra a edição é o status, não a data de término.
            </p>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => fecharModal(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? (editando ? 'Salvando...' : 'Criando...') : (editando ? 'Salvar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GerenciarGincanas;

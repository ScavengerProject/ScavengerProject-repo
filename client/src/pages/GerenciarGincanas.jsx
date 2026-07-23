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
import { Trophy, Plus, Archive, CheckCircle, Power } from 'lucide-react';
import { toast } from '../components/ui/toast';

const statusColor = (status) => {
  switch (status) {
    case 'ATIVA': return 'bg-green-100 text-green-800';
    case 'ENCERRADA': return 'bg-yellow-100 text-yellow-800';
    case 'ARQUIVADA': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const GerenciarGincanas = () => {
  const { usuario, logout } = useAuth();
  const { recarregarGincanas } = useGincana();

  const [gincanas, setGincanas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ nome: '', ano: new Date().getFullYear(), descricao: '' });

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

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.ano) {
      toast.error('Nome e ano são obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await gincanasService.criar({
        nome: form.nome.trim(),
        ano: Number(form.ano),
        descricao: form.descricao.trim(),
      });
      toast.success('Gincana criada com sucesso!');
      setIsModalOpen(false);
      setForm({ nome: '', ano: new Date().getFullYear(), descricao: '' });
      await fetchGincanas();
      await recarregarGincanas(); // atualiza o seletor da navbar
    } catch (error) {
      toast.error(error.message || 'Falha ao criar gincana.');
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
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} /> Nova Gincana
          </Button>
        </div>

        {gincanas.length === 0 ? (
          <p className="text-gray-500">Nenhuma gincana cadastrada ainda.</p>
        ) : (
          <div className="grid gap-4">
            {gincanas.map((g) => (
              <Card key={g._id}>
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{g.nome}</h2>
                      <span className="text-sm text-gray-500">({g.ano})</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(g.status)}`}>{g.status}</span>
                    </div>
                    {g.descricao && <p className="text-sm text-gray-600 mt-1">{g.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
            ))}
          </div>
        )}
      </div>

      {/* Modal de criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Gincana</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4">
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
    </MainLayout>
  );
};

export default GerenciarGincanas;

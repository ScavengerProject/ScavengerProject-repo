import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { migracoesService } from '../services/api';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function AprovarMigracoes() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRejeitar, setOpenRejeitar] = useState(false);
  const [rejeitarId, setRejeitarId] = useState(null);
  const [justificativa, setJustificativa] = useState('');

  const carregar = async () => {
    try {
      setLoading(true);
      const lista = await migracoesService.listarPendentes();
      setPendentes(lista || []);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const aprovar = async (id) => {
    try {
      await migracoesService.decidir(id, true, null); // ✅ envia { aprovar: true }
      toast.success('Solicitação aprovada');
      await carregar();
    } catch (e) {
      toast.error(e?.message || 'Falha ao aprovar');
    }
  };

  const confirmarRejeicao = (id) => {
    setRejeitarId(id);
    setJustificativa('');
    setOpenRejeitar(true);
  };

  const rejeitar = async () => {
    if (!rejeitarId) return;
    try {
      await migracoesService.decidir(rejeitarId, false, justificativa || undefined); // ✅ { aprovar: false }
      toast.success('Solicitação rejeitada');
      setOpenRejeitar(false);
      setRejeitarId(null);
      await carregar();
    } catch (e) {
      toast.error(e?.message || 'Falha ao rejeitar');
    }
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
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900">Pendentes</CardTitle>
            <CardDescription>Aprove ou rejeite os pedidos para as equipes que você coordena.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendentes.length === 0 && <p className="text-gray-600">Nenhuma solicitação pendente.</p>}
            {pendentes.map((s) => (
              <div key={s._id} className="p-3 rounded-lg border bg-gray-50 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {s.usuario?.nome ?? '—'} — {s.equipe_origem?.nome ?? '—'} → {s.equipe_destino?.nome ?? '—'}
                  </p>
                  <p className="text-sm text-gray-600">Motivo: {s.motivo}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => aprovar(s._id)}>
                    <Check className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => confirmarRejeicao(s._id)}>
                    <X className="w-4 h-4 mr-1" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={openRejeitar} onOpenChange={setOpenRejeitar}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar solicitação</DialogTitle>
              <DialogDescription>Opcionalmente, informe uma justificativa para o aluno.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="Justificativa (opcional)"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRejeitar(false)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={rejeitar}>Rejeitar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

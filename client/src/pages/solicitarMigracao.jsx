import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { equipesService, migracoesService } from '../services/api';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function SolicitarMigracao() {
  const navigate = useNavigate();
  const [equipes, setEquipes] = useState([]);
  const [destino, setDestino] = useState('');   // controlado
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState([]);

  const carregar = async () => {
    try {
      setLoading(true);
      const [lista, minhas] = await Promise.all([
        equipesService.listarEquipesPublicas(),
        migracoesService.listarMinhas(),
      ]);
      setEquipes(lista || []);
      setMinhasSolicitacoes(minhas || []);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // Verifica se há solicitação pendente
  const temSolicitacaoPendente = minhasSolicitacoes.some(s => s.status === 'PENDENTE');

  const enviar = async () => {
    if (!destino) return toast.error('Selecione a equipe de destino');
    if (!motivo.trim()) return toast.error('Descreva brevemente o motivo');

    try {
      await migracoesService.solicitar(destino, motivo.trim());
      toast.success('Solicitação enviada!');
      setDestino('');
      setMotivo('');
      await carregar();
    } catch (e) {
      toast.error(e?.message || 'Falha ao solicitar migração');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Solicitar migração de equipe</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 grid gap-6 lg:grid-cols-2">
        {/* Card de novo pedido ou aviso */}
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900">Novo pedido</CardTitle>
            <CardDescription>
              {temSolicitacaoPendente 
                ? 'Você já possui uma solicitação pendente.' 
                : 'Escolha a equipe de destino e descreva o motivo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {temSolicitacaoPendente ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Aguarde a decisão do coordenador</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  Você já enviou uma solicitação de migração que está aguardando aprovação. 
                  Você poderá fazer uma nova solicitação após a decisão do coordenador.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-800">Equipe de destino</label>
                  <Select value={destino} onValueChange={setDestino}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipes.length === 0 && (
                        <div className="p-2 text-sm text-gray-500">Nenhuma equipe disponível</div>
                      )}
                      {equipes.map((eq) => (
                        <SelectItem key={eq._id} value={eq._id}>
                          {eq.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Motivo</label>
                  <Textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Explique em poucas linhas"
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <Button onClick={enviar} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Enviar solicitação
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900">Minhas solicitações</CardTitle>
            <CardDescription>Acompanhe o status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {minhasSolicitacoes.length === 0 && (
              <p className="text-gray-600">Você ainda não enviou solicitações.</p>
            )}
            {minhasSolicitacoes.map((s) => (
              <div key={s._id} className="p-3 rounded-lg border bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {s.equipe_origem?.nome ?? '—'} → {s.equipe_destino?.nome ?? '—'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Motivo: {s.motivo}</p>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded border ${
                    s.status === 'PENDENTE' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                    s.status === 'APROVADA' ? 'bg-green-100 border-green-300 text-green-800' :
                    s.status === 'REJEITADA' ? 'bg-red-100 border-red-300 text-red-800' :
                    'bg-white border-gray-300'
                  }`}>
                    {s.status}
                  </span>
                </div>
                {s.status === 'REJEITADA' && s.justificativa && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                    <strong>Justificativa do coordenador:</strong> {s.justificativa}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

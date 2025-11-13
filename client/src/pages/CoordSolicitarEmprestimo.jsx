import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from '../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { solicitacoesEmprestimoService, provasService } from '../services/api';
import { ArrowLeft, Plus, Clock, Users, X } from 'lucide-react';

export default function CoordSolicitarEmprestimo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCriar, setOpenCriar] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  // Formulário
  const [formData, setFormData] = useState({
    prova_id: '',
    quantidade_solicitada: 1,
    motivo: '',
    criterios: {
      niveis_escolares: [],
      genero: 'QUALQUER',
    },
  });

  const niveisEscolares = [
    "EF - 1º Ano", "EF - 2º Ano", "EF - 3º Ano", "EF - 4º Ano", "EF - 5º Ano",
    "EF - 6º Ano", "EF - 7º Ano", "EF - 8º Ano", "EF - 9º Ano",
    "EM - 1º Ano", "EM - 2º Ano", "EM - 3º Ano"
  ];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [solicitacoesList, provasList] = await Promise.all([
        solicitacoesEmprestimoService.listar(),
        provasService.listar(),
      ]);

      setSolicitacoes(solicitacoesList || []);
      setProvas(provasList || []);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const criarSolicitacao = async () => {
    try {
      if (!formData.prova_id || !formData.quantidade_solicitada || !formData.motivo) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      await solicitacoesEmprestimoService.criar(
        formData.prova_id,
        formData.quantidade_solicitada,
        formData.criterios,
        formData.motivo
      );

      toast.success('Solicitação criada com sucesso! Aguarde aprovação do administrador.');
      setOpenCriar(false);
      setFormData({
        prova_id: '',
        quantidade_solicitada: 1,
        motivo: '',
        criterios: {
          niveis_escolares: [],
          genero: 'QUALQUER',
        },
      });
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao criar solicitação');
    }
  };

  const cancelarSolicitacao = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return;

    try {
      await solicitacoesEmprestimoService.cancelar(id, 'Cancelado pelo coordenador');
      toast.success('Solicitação cancelada');
      await carregarDados();
    } catch (e) {
      toast.error(e?.message || 'Erro ao cancelar solicitação');
    }
  };

  const toggleNivelEscolar = (nivel) => {
    setFormData(prev => {
      const niveis = prev.criterios.niveis_escolares.includes(nivel)
        ? prev.criterios.niveis_escolares.filter(n => n !== nivel)
        : [...prev.criterios.niveis_escolares, nivel];
      
      return {
        ...prev,
        criterios: {
          ...prev.criterios,
          niveis_escolares: niveis,
        },
      };
    });
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDENTE_APROVACAO: { text: 'Pendente Aprovação', color: 'bg-yellow-100 text-yellow-800' },
      APROVADA: { text: 'Aprovada', color: 'bg-green-100 text-green-800' },
      EM_ANDAMENTO: { text: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      CONCLUIDA: { text: 'Concluída', color: 'bg-gray-100 text-gray-800' },
      REJEITADA: { text: 'Rejeitada', color: 'bg-red-100 text-red-800' },
      CANCELADA: { text: 'Cancelada', color: 'bg-gray-100 text-gray-600' },
    };
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const solicitacoesFiltradas = filtroStatus === 'TODOS' 
    ? solicitacoes.filter(s => String(s.coordenador_solicitante_id?._id) === String(usuario._id))
    : solicitacoes.filter(s => 
        String(s.coordenador_solicitante_id?._id) === String(usuario._id) && 
        s.status === filtroStatus
      );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Solicitar Empréstimo</h1>
              <p className="text-sm text-gray-600">
                Solicite pessoas de outras equipes para ajudar em provas
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpenCriar(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-gray-700 font-medium">Filtrar por:</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                <SelectItem value="PENDENTE_APROVACAO">Pendente Aprovação</SelectItem>
                <SelectItem value="APROVADA">Aprovada</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                <SelectItem value="REJEITADA">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Solicitações */}
        <div className="grid gap-4">
          {solicitacoesFiltradas.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Nenhuma solicitação encontrada.
                </p>
              </CardContent>
            </Card>
          ) : (
            solicitacoesFiltradas.map((sol) => (
              <Card key={sol._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Prova */}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {sol.prova_id?.titulo || '—'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Equipe: {sol.equipe_solicitante_id?.equipe_id?.nome || '—'}
                        </p>
                      </div>

                      {/* Quantidade e Critérios */}
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{sol.quantidade_solicitada} pessoa(s)</span>
                        </div>
                        {sol.criterios?.genero && sol.criterios.genero !== 'QUALQUER' && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {sol.criterios.genero}
                          </span>
                        )}
                        {sol.criterios?.niveis_escolares?.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {sol.criterios.niveis_escolares.length} nível(is) específico(s)
                          </span>
                        )}
                      </div>

                      {/* Motivo */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700">Motivo:</p>
                        <p className="text-sm text-gray-600 mt-1">{sol.motivo}</p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sol.status)}
                        <span className="text-xs text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatarData(sol.criado_em)}
                        </span>
                      </div>

                      {/* Justificativa Admin */}
                      {sol.justificativa_admin && (
                        <div className="text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
                          <p className="font-medium text-yellow-900">Admin:</p>
                          <p className="text-yellow-800">{sol.justificativa_admin}</p>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {sol.status === 'PENDENTE_APROVACAO' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => cancelarSolicitacao(sol._id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                    )}
                    {(sol.status === 'APROVADA' || sol.status === 'EM_ANDAMENTO') && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => navigate(`/coord/solicitacoes-emprestimo/${sol._id}/ofertas`)}
                      >
                        Ver Ofertas
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Dialog: Criar Solicitação */}
      <Dialog open={openCriar} onOpenChange={setOpenCriar}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Empréstimo</DialogTitle>
            <DialogDescription>
              Solicite pessoas de outras equipes para ajudar sua equipe em uma prova específica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Prova */}
            <div className="space-y-2">
              <Label htmlFor="prova" className="text-gray-700">
                Prova <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.prova_id}
                onValueChange={(value) => setFormData({ ...formData, prova_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma prova" />
                </SelectTrigger>
                <SelectContent>
                  {provas.map((prova) => (
                    <SelectItem key={prova._id} value={prova._id}>
                      {prova.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade" className="text-gray-700">
                Quantidade de Pessoas <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={formData.quantidade_solicitada}
                onChange={(e) =>
                  setFormData({ ...formData, quantidade_solicitada: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            {/* Gênero */}
            <div className="space-y-2">
              <Label htmlFor="genero" className="text-gray-700">
                Gênero Preferencial
              </Label>
              <Select
                value={formData.criterios.genero}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    criterios: { ...formData.criterios, genero: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUALQUER">Qualquer</SelectItem>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Níveis Escolares */}
            <div className="space-y-2">
              <Label className="text-gray-700">Níveis Escolares (opcional)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                {niveisEscolares.map((nivel) => (
                  <div key={nivel} className="flex items-center gap-2">
                    <Checkbox
                      id={nivel}
                      checked={formData.criterios.niveis_escolares.includes(nivel)}
                      onCheckedChange={() => toggleNivelEscolar(nivel)}
                    />
                    <label htmlFor={nivel} className="text-sm text-gray-700 cursor-pointer">
                      {nivel}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo" className="text-gray-700">
                Motivo/Justificativa <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="motivo"
                placeholder="Explique por que precisa de reforço..."
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCriar(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={criarSolicitacao}
            >
              Criar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


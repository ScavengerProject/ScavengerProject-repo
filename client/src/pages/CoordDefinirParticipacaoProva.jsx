import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { provasService } from '../services/api';
import { toast } from '../components/ui/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Users, UserCheck, UserPlus, Save, AlertTriangle } from 'lucide-react';

const STATUS_LABEL = {
  NAO_INICIADA: 'Não iniciada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

const STATUS_USUARIO_CONFIG = {
  BANIDO: { label: 'Banido', className: 'bg-red-200 text-red-900 text-xs' },
  SUSPENSO: { label: 'Suspenso', className: 'bg-orange-100 text-orange-800 text-xs' },
};

export default function CoordDefinirParticipacaoProva() {
  const { usuario, logout } = useAuth();
  const [provas, setProvas] = useState([]);
  const [provaSelecionadaId, setProvaSelecionadaId] = useState('');
  const [contextoProva, setContextoProva] = useState(null);
  const [titularesIds, setTitularesIds] = useState([]);
  const [suplentesIds, setSuplentesIds] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingContexto, setLoadingContexto] = useState(false);
  const [saving, setSaving] = useState(false);

  const provasDisponiveis = useMemo(
    () => provas.filter((prova) => prova.status !== 'CONCLUIDA'),
    [provas]
  );

  const carregarProvas = async () => {
    try {
      setLoadingLista(true);
      const lista = await provasService.listar();
      setProvas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar provas.');
    } finally {
      setLoadingLista(false);
    }
  };

  const carregarContextoProva = async (provaId) => {
    if (!provaId) {
      setContextoProva(null);
      setTitularesIds([]);
      setSuplentesIds([]);
      return;
    }

    try {
      setLoadingContexto(true);
      const data = await provasService.obterEquipeParticipante(provaId);
      setContextoProva(data);
      setTitularesIds(data?.titulares_usuario_ids || []);
      setSuplentesIds(data?.suplentes_usuario_ids || []);
    } catch (error) {
      setContextoProva(null);
      setTitularesIds([]);
      setSuplentesIds([]);
      toast.error(error?.message || 'Erro ao carregar inscritos da equipe nesta prova.');
    } finally {
      setLoadingContexto(false);
    }
  };

  useEffect(() => {
    carregarProvas();
  }, []);

  useEffect(() => {
    carregarContextoProva(provaSelecionadaId);
  }, [provaSelecionadaId]);

  const membrosBloquadosIds = useMemo(
    () => new Set(contextoProva?.membros_bloqueados_ids || []),
    [contextoProva]
  );

  const isBloqueadoStatus = (membro) =>
    membro.status === 'BANIDO' || membro.status === 'SUSPENSO';

  const isBloqueado = (membro) =>
    membrosBloquadosIds.has(String(membro.id)) || isBloqueadoStatus(membro);

  const toggleTitular = (usuarioId, membro) => {
    if (isBloqueado(membro)) return;
    const id = String(usuarioId);
    setTitularesIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setSuplentesIds((prev) => prev.filter((item) => item !== id));
  };

  const toggleSuplente = (usuarioId, membro) => {
    if (isBloqueado(membro)) return;
    const id = String(usuarioId);
    setSuplentesIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setTitularesIds((prev) => prev.filter((item) => item !== id));
  };

  const salvarParticipacao = async () => {
    if (!provaSelecionadaId) {
      toast.error('Selecione uma prova.');
      return;
    }

    if (titularesIds.length === 0) {
      toast.error('Selecione ao menos um membro titular.');
      return;
    }

    try {
      setSaving(true);
      await provasService.salvarEquipeParticipante(provaSelecionadaId, {
        titulares_usuario_ids: titularesIds,
        suplentes_usuario_ids: suplentesIds,
      });
      toast.success('Titulares e suplentes salvos com sucesso.');
      await carregarContextoProva(provaSelecionadaId);
    } catch (error) {
      toast.error(error?.message || 'Erro ao salvar participação da equipe.');
    } finally {
      setSaving(false);
    }
  };

  const membrosInscritos = contextoProva?.membros_inscritos || [];
  const provaAnteriorTitulo = contextoProva?.prova_anterior_titulo;
  const temBloqueados = membrosBloquadosIds.size > 0;

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Definir Participação na Prova</h1>
          <p className="text-sm text-gray-600 mt-1">
            Selecione uma prova e defina quem será titular e suplente da sua equipe.
          </p>
        </div>

        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Selecionar Prova</CardTitle>
            <CardDescription>
              Apenas provas disponíveis para participação da equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <Select value={provaSelecionadaId} onValueChange={setProvaSelecionadaId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingLista ? 'Carregando provas...' : 'Escolha uma prova'} />
                </SelectTrigger>
                <SelectContent>
                  {provasDisponiveis.map((prova) => (
                    <SelectItem key={prova._id} value={prova._id}>
                      {prova.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 text-sm text-gray-700">
                {contextoProva?.prova ? (
                  <>
                    <p>
                      <span className="font-semibold">Status:</span>{' '}
                      {STATUS_LABEL[contextoProva.prova.status] || contextoProva.prova.status}
                    </p>
                    <p>
                      <span className="font-semibold">Equipe:</span> {contextoProva?.equipe?.nome || '—'}
                    </p>
                  </>
                ) : (
                  <p>Selecione uma prova para carregar os membros inscritos.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingContexto && (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
          </div>
        )}

        {!loadingContexto && provaSelecionadaId && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-700" />
                  <div>
                    <p className="text-sm text-blue-700">Inscritos da equipe</p>
                    <p className="text-xl font-bold text-blue-900">{membrosInscritos.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4 flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-green-700" />
                  <div>
                    <p className="text-sm text-green-700">Titulares</p>
                    <p className="text-xl font-bold text-green-900">{titularesIds.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-amber-700" />
                  <div>
                    <p className="text-sm text-amber-700">Suplentes</p>
                    <p className="text-xl font-bold text-amber-900">{suplentesIds.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Aviso de membros bloqueados pela prova anterior */}
            {temBloqueados && provaAnteriorTitulo && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Alguns membros participaram da prova anterior <strong>"{provaAnteriorTitulo}"</strong> e estão bloqueados para esta prova.
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Membros Inscritos</CardTitle>
                <CardDescription>
                  Cada membro pode estar em apenas um grupo: titular ou suplente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membrosInscritos.length === 0 ? (
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    Nenhum membro da sua equipe está inscrito nesta prova.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {membrosInscritos.map((membro) => {
                      const membroId = String(membro.id);
                      const isTitular = titularesIds.includes(membroId);
                      const isSuplente = suplentesIds.includes(membroId);
                      const bloqueadoProvaAnterior = membrosBloquadosIds.has(membroId);
                      const bloqueadoStatus = isBloqueadoStatus(membro);
                      const bloqueado = bloqueadoProvaAnterior || bloqueadoStatus;
                      const statusConfig = STATUS_USUARIO_CONFIG[membro.status];

                      return (
                        <div
                          key={membroId}
                          className={`border rounded-lg p-3 sm:p-4 ${bloqueado ? 'bg-gray-50 border-gray-300 opacity-75' : 'bg-white border-gray-200'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900 wrap-break-word">{membro.nome}</p>
                                {statusConfig && (
                                  <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                                )}
                                {bloqueadoProvaAnterior && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                                    Bloqueado — prova anterior
                                  </Badge>
                                )}
                                {membro.emprestado && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    Emprestado{membro.equipe_origem_nome ? ` • ${membro.equipe_origem_nome}` : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 break-all">{membro.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {membro.tipo}{membro.turma ? ` • ${membro.turma}` : ''}
                              </p>
                              {bloqueadoStatus && (
                                <p className="text-xs text-red-600 mt-1">
                                  Este membro está {membro.status === 'BANIDO' ? 'banido' : 'suspenso'} e não pode participar de provas.
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3 sm:gap-4">
                              <label className={`flex items-center gap-2 text-sm ${bloqueado ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                                <Checkbox
                                  checked={isTitular}
                                  onCheckedChange={() => toggleTitular(membroId, membro)}
                                  disabled={bloqueado}
                                />
                                Titular
                              </label>

                              <label className={`flex items-center gap-2 text-sm ${bloqueado ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                                <Checkbox
                                  checked={isSuplente}
                                  onCheckedChange={() => toggleSuplente(membroId, membro)}
                                  disabled={bloqueado}
                                />
                                Suplente
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={salvarParticipacao}
                disabled={saving || membrosInscritos.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Definição'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

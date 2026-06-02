import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { provasService } from '../services/api';
import { toast } from '../components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Users, UserCheck, UserPlus, Handshake, Search, CalendarDays } from 'lucide-react';

const STATUS_LABEL = {
  NAO_INICIADA: 'Não iniciada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

const STATUS_CLASS = {
  NAO_INICIADA: 'bg-gray-100 text-gray-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
};

const formatarData = (data) => (data ? new Date(data).toLocaleString('pt-BR') : '—');

function MembroLinha({ membro }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-sm text-gray-900">{membro.nome}</span>
      <span className="text-xs text-gray-500">
        {membro.tipo}{membro.turma ? ` • ${membro.turma}` : ''}
      </span>
      {membro.emprestado && (
        <Badge className="bg-purple-100 text-purple-800 text-xs">
          Emprestado{membro.equipe_origem_nome ? ` • de ${membro.equipe_origem_nome}` : ''}
        </Badge>
      )}
    </div>
  );
}

function GrupoMembros({ titulo, icon: Icone, cor, membros }) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 text-sm font-medium ${cor}`}>
        <Icone className="h-4 w-4" />
        {titulo} ({membros.length})
      </div>
      {membros.length === 0 ? (
        <p className="text-xs text-gray-400 pl-6">Ninguém definido.</p>
      ) : (
        <div className="pl-6">
          {membros.map((m) => (
            <MembroLinha key={String(m.id)} membro={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminProvasAssociacoes() {
  const { usuario, logout } = useAuth();
  const [associacoes, setAssociacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [somenteEmprestados, setSomenteEmprestados] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const dados = await provasService.listarAssociacoes();
      setAssociacoes(Array.isArray(dados) ? dados : []);
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar associações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const associacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return associacoes.filter((item) => {
      if (somenteEmprestados && item.total_emprestados === 0) return false;
      if (termo && !item.prova.titulo.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [associacoes, busca, somenteEmprestados]);

  if (loading) {
    return (
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Alunos por Prova</h1>
          <p className="text-sm text-gray-600 mt-1">
            Visualize quais alunos estão associados a cada prova (titulares e suplentes por equipe). Alunos
            emprestados de outra equipe aparecem com a tag <span className="font-medium text-purple-700">Emprestado</span>.
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por prova..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox
              checked={somenteEmprestados}
              onCheckedChange={(v) => setSomenteEmprestados(Boolean(v))}
            />
            Somente provas com alunos emprestados
          </label>
        </div>

        {associacoesFiltradas.length === 0 ? (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="py-8">
              <p className="text-center text-gray-600">Nenhuma prova encontrada com os filtros atuais.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {associacoesFiltradas.map(({ prova, equipes, total_alunos, total_emprestados }) => (
              <Card key={String(prova._id)} className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg text-gray-900">{prova.titulo}</CardTitle>
                    <Badge className={`text-xs ${STATUS_CLASS[prova.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[prova.status] || prova.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatarData(prova.data_inicio)} → {formatarData(prova.data_fim)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {total_alunos} aluno(s)
                    </span>
                    {total_emprestados > 0 && (
                      <span className="inline-flex items-center gap-1 text-purple-700">
                        <Handshake className="h-3 w-3" /> {total_emprestados} emprestado(s)
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {equipes.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma equipe definiu participação nesta prova.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {equipes.map((eq) => (
                        <div key={String(eq.equipe_id)} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: eq.equipe_cor || '#9ca3af' }}
                            />
                            <span className="font-semibold text-gray-900">{eq.equipe_nome}</span>
                          </div>
                          <div className="space-y-3">
                            <GrupoMembros
                              titulo="Titulares"
                              icon={UserCheck}
                              cor="text-green-700"
                              membros={eq.titulares}
                            />
                            <GrupoMembros
                              titulo="Suplentes"
                              icon={UserPlus}
                              cor="text-amber-700"
                              membros={eq.suplentes}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

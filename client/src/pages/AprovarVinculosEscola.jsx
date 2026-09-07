import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import MainLayout from '../components/MainLayout';
import { convitesService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Check, X, Clock, ArrowRightLeft } from 'lucide-react';
import { toast } from '../components/ui/toast';

// Mesma lista de séries que o resto do sistema usa (Usuario.js `TURMAS` no
// backend, espelhada também em AdminUsuarios.jsx / GerenciarConvites.jsx).
const TURMAS_DISPONIVEIS = [
  'EF - 1º Ano', 'EF - 2º Ano', 'EF - 3º Ano', 'EF - 4º Ano', 'EF - 5º Ano',
  'EF - 6º Ano', 'EF - 7º Ano', 'EF - 8º Ano', 'EF - 9º Ano', 'EM - 1º Ano',
  'EM - 2º Ano', 'EM - 3º Ano',
];

/**
 * Fila de vínculos PENDENTE da escola ativa (ADMIN). Espelha o padrão visual
 * de AprovarMigracoes.jsx.
 *
 * Um vínculo PENDENTE aqui nasce de dois jeitos (ver server/src/convites):
 *  - cadastro pelo código PÚBLICO da escola (sem turma), ou
 *  - resgate de um código de convite por alguém que já tem conta ativa em
 *    outra escola — é a solicitação de transferência.
 * `decidirPendencia` aprova/rejeita os dois casos da mesma forma: aprovar uma
 * transferência remove o vínculo antigo na mesma gravação.
 *
 * Quando o pendente NÃO tem turma (código público, sem série), o backend
 * recusa a aprovação sem uma — é o que evita o aluno entrar "invisível" para
 * a elegibilidade de provas (turmas_permitidas). Por isso a turma é exigida
 * aqui antes de habilitar o botão Aprovar.
 */
export default function AprovarVinculosEscola() {
  const { usuario, logout } = useAuth();
  const { escolaAtivaId } = useEscola();
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decidindoId, setDecidindoId] = useState(null);
  // Turma escolhida pelo admin para cada pendente sem turma própria, por _id.
  const [turmasEscolhidas, setTurmasEscolhidas] = useState({});

  const carregarDados = async () => {
    try {
      setLoading(true);
      const lista = await convitesService.listarPendentes();
      setPendentes(lista || []);
    } catch (error) {
      toast.error(error.message || 'Erro ao carregar vínculos pendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [escolaAtivaId]);

  // Um vínculo ATIVO em OUTRA escola é o sinal de que esta pendência é uma
  // transferência — aprovar remove esse vínculo na mesma gravação.
  const ehTransferencia = (pendente) =>
    (pendente.vinculos || []).some(
      (v) => String(v.escola_id) !== String(pendente.escola_id) && v.status === 'ATIVO'
    );

  // Só é exigida quando o pendente ainda não tem turma — código de turma e
  // transferência (que herda a turma de origem) já chegam com uma.
  const precisaEscolherTurma = (pendente) => !pendente.turma;

  const decidir = async (pendente, decisao) => {
    const turmaEscolhida = turmasEscolhidas[pendente._id];
    if (decisao === 'APROVAR' && precisaEscolherTurma(pendente) && !turmaEscolhida) {
      toast.error('Escolha a turma antes de aprovar: este vínculo veio sem turma.');
      return;
    }

    setDecidindoId(pendente._id);
    try {
      const resposta = decisao === 'APROVAR' && turmaEscolhida
        ? await convitesService.decidirPendente(pendente._id, decisao, turmaEscolhida)
        : await convitesService.decidirPendente(pendente._id, decisao);
      toast.success(
        resposta?.message
          || (decisao === 'APROVAR' ? `${pendente.nome} aprovado(a).` : `Solicitação de ${pendente.nome} rejeitada.`)
      );
      await carregarDados();
    } catch (error) {
      toast.error(error.message || 'Erro ao decidir a solicitação.');
    } finally {
      setDecidindoId(null);
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
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Vínculos Pendentes</h1>
          <p className="text-sm text-gray-600">
            Cadastros feitos com o código público da escola e pedidos de transferência de outra
            escola aguardam sua aprovação aqui.
          </p>
        </div>

        <div className="grid gap-4">
          {pendentes.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-8">
                <p className="text-center text-gray-600">Nenhum vínculo pendente.</p>
              </CardContent>
            </Card>
          ) : (
            pendentes.map((pendente) => {
              const transferencia = ehTransferencia(pendente);
              const decidindo = decidindoId === pendente._id;
              return (
                <Card key={pendente._id} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">{pendente.nome}</p>
                          <p className="text-sm text-gray-600">{pendente.email}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            <Clock className="inline h-3 w-3 mr-1" /> Pendente
                          </span>
                          {pendente.turma && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {pendente.turma}
                            </span>
                          )}
                          {transferencia && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              <ArrowRightLeft className="h-3 w-3" /> Transferência de outra escola
                            </span>
                          )}
                        </div>

                        {transferencia && (
                          <p className="text-xs text-gray-500">
                            Aprovar remove o vínculo dele(a) com a escola de origem nesta mesma ação.
                          </p>
                        )}

                        {precisaEscolherTurma(pendente) && (
                          <div className="pt-1">
                            <Label htmlFor={`turma-${pendente._id}`} className="text-xs text-gray-700">
                              Turma (obrigatória — este vínculo veio sem turma)
                            </Label>
                            <select
                              id={`turma-${pendente._id}`}
                              value={turmasEscolhidas[pendente._id] || ''}
                              onChange={(e) => setTurmasEscolhidas((atual) => ({
                                ...atual,
                                [pendente._id]: e.target.value,
                              }))}
                              className="mt-1 block w-full max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Escolha a turma...</option>
                              {TURMAS_DISPONIVEIS.map((turma) => (
                                <option key={turma} value={turma}>{turma}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={decidindo || (precisaEscolherTurma(pendente) && !turmasEscolhidas[pendente._id])}
                          onClick={() => decidir(pendente, 'APROVAR')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          disabled={decidindo}
                          onClick={() => decidir(pendente, 'REJEITAR')}
                        >
                          <X className="h-4 w-4 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import MainLayout from '../components/MainLayout';
import { convitesService } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Ticket, AlertTriangle, CheckCircle2, Clock, ArrowRightLeft } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { ehPerfilDeEscolaUnica } from '../lib/perfis';

// Tempo de debounce da pré-validação do código — mesmo valor de
// CadastroUsuario.jsx (a rota é rate-limitada, ver server/src/convites).
const DEBOUNCE_PREVALIDACAO_MS = 400;

/**
 * Resgate de código de convite por quem JÁ TEM CONTA (POST /api/convites/resgatar).
 *
 * Cobre o caso que a tela de cadastro não resolve: um aluno que muda de
 * escola não pode passar por /cadastro de novo (registrarUsuario recusa email
 * já existente) — aqui ele entra logado e usa o código da escola nova.
 *
 * O código de convite só emite ALUNO (D4 do plano), então esta tela é
 * relevante sobretudo para quem já é ALUNO em alguma escola — e, por ser um
 * perfil de escola única, resgatar um código de outra escola quase sempre
 * dispara a regra de conflito: o vínculo novo nasce PENDENTE, e a aprovação
 * do admin de destino REMOVE o vínculo atual (ver conviteController.js,
 * resgatarConvite / decidirPendencia). Por ser destrutivo, a confirmação
 * dessa consequência é explícita e obrigatória antes de enviar.
 */
export default function ResgatarConvite() {
  const { usuario, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const { minhasEscolas, recarregarEscolas, limparEscolaAtiva } = useEscola();

  const [codigo, setCodigo] = useState(() => (searchParams.get('convite') || '').toUpperCase());
  const [prevalidacao, setPrevalidacao] = useState(null); // { escola_nome, turma }
  const [prevalidando, setPrevalidando] = useState(false);
  const [erroCodigo, setErroCodigo] = useState('');
  const [confirmaTransferencia, setConfirmaTransferencia] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo, message } | null

  // Mesma pré-validação com debounce de CadastroUsuario.jsx: confirma "Você
  // está entrando na Escola X — 6º Ano" via GET /convites/:codigo (público).
  useEffect(() => {
    const codigoLimpo = codigo.trim();
    setPrevalidacao(null);
    setErroCodigo('');

    if (!codigoLimpo) {
      setPrevalidando(false);
      return;
    }

    setPrevalidando(true);
    const timer = setTimeout(() => {
      convitesService
        .prevalidar(codigoLimpo)
        .then((dados) => setPrevalidacao(dados))
        .catch((error) => setErroCodigo(error.message || 'Código de convite inválido ou expirado.'))
        .finally(() => setPrevalidando(false));
    }, DEBOUNCE_PREVALIDACAO_MS);

    return () => clearTimeout(timer);
  }, [codigo]);

  // Perfil de escola única (ALUNO/COORDENADOR/PAI-MÃE) já vinculado a outra
  // escola: resgatar um código aqui é o que dispara a regra de conflito no
  // backend (conflitoMultiEscola) e vira uma solicitação de transferência —
  // é essa consequência destrutiva que a tela precisa deixar explícita.
  const possivelTransferencia = (minhasEscolas || []).some((e) => ehPerfilDeEscolaUnica(e.meu_tipo));

  const podeEnviar =
    !!codigo.trim()
    && !prevalidando
    && !!prevalidacao
    && !enviando
    && (!possivelTransferencia || confirmaTransferencia);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!podeEnviar) return;

    setEnviando(true);
    try {
      const resposta = await convitesService.resgatar(codigo.trim());

      // O backend distingue três desfechos (ver conviteController.resgatarConvite):
      //  - 200 sem `codigo`: vínculo ATIVO já criado;
      //  - 202 { codigo: 'TRANSFERENCIA_PENDENTE' }: conflito de escola única —
      //    é a solicitação de transferência, o vínculo atual só some quando
      //    aprovada;
      //  - 202 { codigo: 'VINCULO_PENDENTE' }: código sem aprovação automática
      //    (público da escola), sem conflito de transferência.
      if (resposta?.codigo === 'TRANSFERENCIA_PENDENTE') {
        setResultado({ tipo: 'TRANSFERENCIA_PENDENTE', message: resposta.message });
      } else if (resposta?.codigo === 'VINCULO_PENDENTE') {
        setResultado({ tipo: 'VINCULO_PENDENTE', message: resposta.message });
      } else {
        setResultado({ tipo: 'ATIVO', message: resposta?.message });
        // A escola nova só aparece em "Trocar de escola" depois de recarregada.
        await recarregarEscolas();
      }
    } catch (error) {
      toast.error(error.message || 'Não foi possível resgatar o código.');
    } finally {
      setEnviando(false);
    }
  };

  const recomecar = () => {
    setResultado(null);
    setCodigo('');
    setConfirmaTransferencia(false);
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-lg">
        <Card className="shadow-md border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Ticket className="text-emerald-600" /> Entrar com código de convite
            </CardTitle>
            <CardDescription>
              Use o código de convite de outra escola para solicitar acesso a ela — é o caminho
              para quem já tem conta e está mudando de escola.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <div className="space-y-4">
                {resultado.tipo === 'ATIVO' && (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-green-800">Vínculo criado com sucesso.</p>
                      <p className="text-sm text-green-700 mt-1">
                        {resultado.message || 'Você já pode trocar para a nova escola.'}
                      </p>
                    </div>
                  </div>
                )}

                {resultado.tipo === 'TRANSFERENCIA_PENDENTE' && (
                  <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <ArrowRightLeft className="text-purple-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-purple-800">Solicitação de transferência enviada.</p>
                      <p className="text-sm text-purple-700 mt-1">
                        {resultado.message}
                      </p>
                      <p className="text-xs text-purple-700 mt-2">
                        Seu acesso continua normal na escola atual até que um administrador da
                        escola de destino decida — só quando ele aprovar é que o vínculo atual
                        será removido.
                      </p>
                    </div>
                  </div>
                )}

                {resultado.tipo === 'VINCULO_PENDENTE' && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-amber-800">Solicitação enviada para aprovação.</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {resultado.message}
                      </p>
                    </div>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={recomecar}>
                  Resgatar outro código
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo-resgate" className="text-gray-900 font-medium">
                    Código de convite
                  </Label>
                  <Input
                    id="codigo-resgate"
                    type="text"
                    placeholder="Ex: A1B2C3D4"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                    className="bg-white border-gray-300 focus:ring-blue-500 uppercase"
                    disabled={enviando}
                  />
                  {prevalidando && (
                    <p className="text-xs text-gray-600">Verificando código...</p>
                  )}
                  {!prevalidando && prevalidacao && (
                    <p className="text-xs text-green-700 font-medium">
                      Você está entrando na Escola {prevalidacao.escola_nome}
                      {prevalidacao.turma ? ` — ${prevalidacao.turma}` : ' — aguardando aprovação da escola (sem turma de código próprio)'}
                    </p>
                  )}
                  {!prevalidando && !prevalidacao && erroCodigo && (
                    <p className="text-xs text-red-600 font-medium">{erroCodigo}</p>
                  )}
                </div>

                {prevalidacao && possivelTransferencia && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-amber-800">
                        Você já tem um vínculo com outra escola. Se esta solicitação for aprovada
                        por um administrador da <strong>Escola {prevalidacao.escola_nome}</strong>,
                        {' '}<strong>seu vínculo com a escola atual será removido</strong> nessa
                        mesma aprovação — isso não pode ser desfeito automaticamente.
                      </p>
                    </div>
                    <label htmlFor="confirma-transferencia" className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        id="confirma-transferencia"
                        checked={confirmaTransferencia}
                        onCheckedChange={setConfirmaTransferencia}
                      />
                      <span className="text-xs text-amber-900">
                        Entendo que meu vínculo com a escola atual será removido se esta
                        solicitação for aprovada.
                      </span>
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={!podeEnviar}
                >
                  {enviando ? 'Enviando...' : 'Resgatar código'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

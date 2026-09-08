import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, LogOut, ArrowLeft, Zap, Hourglass, ShieldAlert, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import { useGincana } from '../hooks/useGincana';
import { useEquipe } from '../hooks/useEquipe';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { equipesService } from '../services/api';

// Só o ALUNO se inscreve por conta própria (POST /equipes/:id/register é
// autorizar('ALUNO') no backend). PROFESSOR, COORDENADOR e PAI/MÃE precisam que
// um ADMIN os coloque na equipe — para eles esta tela é informativa, e a única
// saída é sair do sistema e voltar depois de ser vinculado.
const PERFIS_AUTOINSCRICAO = ['ALUNO'];

/**
 * Terceira e última tela do fluxo de entrada: escola -> gincana -> EQUIPE.
 *
 * Trava obrigatória. Participar de uma gincana é derivado de `EquipeMembros`
 * (ver getGincanaIdsDoUsuario no backend), então quem foi aprovado na escola e
 * escolheu a gincana mas não está em nenhuma equipe recebe 403
 * `SEM_EQUIPE_NA_GINCANA` em todas as telas do sistema. Antes desta tela a
 * pessoa conseguia navegar até o dashboard e era expulsa de volta pela primeira
 * requisição que falhava; agora ela para aqui até resolver a pendência.
 *
 * NÃO usa o MainLayout de propósito: a sidebar ofereceria links que respondem
 * 403 e o dropdown de notificações dispararia o mesmo erro a cada 30 segundos,
 * reiniciando a página. As únicas saídas são trocar de gincana/escola ou sair —
 * o requisito de "poder sair antes de decidir a equipe".
 *
 * ADMIN/SUPER_ADMIN nunca chegam aqui: o App.jsx só roteia para cá quem não é
 * admin e não tem equipe confirmada, e o perfil administrativo está isento da
 * checagem de participação.
 *
 * Esta tela é o fim da linha de todo 403 `SEM_EQUIPE_NA_GINCANA` (ver
 * services/api.js), inclusive de quem tem equipe mas caiu aqui porque a
 * consulta do vínculo falhou. Por isso ela nunca redireciona sozinha para fora:
 * quando o vínculo é desconhecido, oferece "tentar novamente" e, se a própria
 * listagem indicar a equipe do usuário, um caminho de volta ao sistema.
 */
export default function SelecionarEquipe() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const { escolaAtiva, minhasEscolas, limparEscolaAtiva } = useEscola();
  const { gincanaAtiva, limparGincanaAtiva } = useGincana();
  const { recarregarVinculoEquipe, vinculoDesconhecido } = useEquipe();

  const [equipes, setEquipes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [inscrevendo, setInscrevendo] = useState(null);
  const [reverificando, setReverificando] = useState(false);

  const podeSeInscrever = PERFIS_AUTOINSCRICAO.includes(usuario?.tipo);
  const podeTrocarEscola = minhasEscolas.length > 1;

  // Segunda fonte sobre "eu tenho equipe?": a listagem marca a equipe do
  // usuário. Serve de saída de emergência quando /equipes/meu-vinculo não
  // responde — sem ela, quem JÁ tem equipe ficaria preso nesta tela.
  const minhaEquipeNaLista = equipes.find((e) => e.isMinhaEquipe) || null;

  // GET /equipes/para-inscricao usa resolverGincanaParaInscricao: é uma das
  // rotas alcançáveis por quem ainda não participa da gincana.
  const carregarEquipes = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await equipesService.listarEquipesParaInscricao();
      setEquipes(lista || []);
    } catch (error) {
      console.error('Erro ao carregar equipes para inscrição:', error);
      setEquipes([]);
      toast.error('Não foi possível carregar as equipes desta gincana.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarEquipes(); }, [carregarEquipes]);

  const inscrever = async (equipeId) => {
    setInscrevendo(equipeId);
    try {
      await equipesService.inscreverEmEquipe(equipeId);
      toast.success('Inscrição confirmada! Bem-vindo à gincana.');
      // Reconsulta o vínculo antes de sair da tela: é o que faz
      // `precisaSelecionarEquipe` virar false e liberar o resto do sistema.
      // Sem isso o App redirecionaria a pessoa de volta para cá.
      //
      // A lista também é recarregada: se a consulta do vínculo estiver fora do
      // ar, é o `isMinhaEquipe` dela que oferece o caminho de volta.
      await Promise.all([recarregarVinculoEquipe(), carregarEquipes()]);
    } catch (error) {
      toast.error(error.message || 'Não foi possível concluir a inscrição.');
    } finally {
      setInscrevendo(null);
    }
  };

  const tentarNovamente = async () => {
    setReverificando(true);
    try {
      await Promise.all([recarregarVinculoEquipe(), carregarEquipes()]);
    } finally {
      setReverificando(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-start justify-between mb-6 text-white gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold wrap-break-word">
              {podeSeInscrever ? 'Escolha sua equipe' : 'Você ainda não tem equipe'}
            </h1>
            <p className="text-white/80 text-sm sm:text-base wrap-break-word">
              {[escolaAtiva?.nome, gincanaAtiva?.nome].filter(Boolean).join(' · ') || 'Gincana ativa'}
            </p>
          </div>
          <Button
            onClick={logout}
            className="bg-white/15 hover:bg-white/25 text-white flex items-center gap-2 shrink-0"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {/* Não conseguimos confirmar o vínculo (endpoint fora do ar, API sem a
              rota, rede instável). Estado próprio, e não "você não tem equipe":
              quem JÁ tem equipe pode cair aqui vindo do 403 de outra tela, e
              precisa de um caminho de volta que não seja o logout. */}
          {vinculoDesconhecido && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 mb-5">
              <div className="flex gap-3">
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm">
                  Não conseguimos confirmar a sua equipe agora. Se você já faz parte de
                  uma, tente novamente; se não, escolha uma equipe abaixo.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={tentarNovamente}
                  disabled={reverificando}
                  className="bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
                >
                  <RefreshCw size={16} className={reverificando ? 'animate-spin' : undefined} />
                  {reverificando ? 'Verificando...' : 'Tentar novamente'}
                </Button>
                {minhaEquipeNaLista && (
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Continuar como {minhaEquipeNaLista.nome}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Por que a pessoa está presa aqui: sem equipe, toda tela da gincana
              responde 403. Dizer isso evita a leitura de "o sistema quebrou". */}
          {!vinculoDesconhecido && (
            <div className={`rounded-xl border px-4 py-3 mb-5 flex gap-3 ${podeSeInscrever
              ? 'border-blue-200 bg-blue-50 text-blue-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'}`}
            >
              {podeSeInscrever
                ? <Users size={20} className="shrink-0 mt-0.5" />
                : <Hourglass size={20} className="shrink-0 mt-0.5" />}
              <p className="text-sm">
                {podeSeInscrever
                  ? 'Para participar da gincana você precisa estar em uma equipe. '
                    + 'Escolha uma das equipes abaixo para liberar o acesso às provas, '
                    + 'resultados e notificações.'
                  : 'Neste perfil a equipe é definida por um administrador da gincana. '
                    + 'Assim que ele te incluir em uma equipe, o acesso ao sistema é '
                    + 'liberado — você pode sair e entrar novamente mais tarde.'}
              </p>
            </div>
          )}

          {carregando && <p className="text-center text-gray-600 py-10">Carregando equipes...</p>}

          {!carregando && equipes.length === 0 && (
            <div className="text-center py-8">
              <ShieldAlert size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="font-semibold text-gray-800">Nenhuma equipe nesta gincana ainda</p>
              <p className="text-sm text-gray-600 mt-1">
                As equipes são criadas pelo organizador da gincana. Tente novamente mais tarde.
              </p>
            </div>
          )}

          {!carregando && equipes.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {equipes.map((equipe) => {
                const id = equipe.id || equipe._id;
                const cor = equipe.cor || '#2563eb';
                const minha = Boolean(equipe.isMinhaEquipe);
                return (
                  <li
                    key={id}
                    className="border rounded-xl p-4 flex flex-col gap-3"
                    style={minha ? { borderColor: cor } : undefined}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="h-8 w-8 rounded-full border-2 border-gray-200 shrink-0"
                        style={{ backgroundColor: cor }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-gray-900 wrap-break-word">
                          {equipe.nome}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {equipe.total_membros || 0} membro(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={12} className="text-yellow-500" />
                            {equipe.pontos_acumulados || 0} ponto(s)
                          </span>
                        </span>
                        {equipe.coordenador?.nome && (
                          <span className="block text-xs text-gray-500 mt-1 wrap-break-word">
                            Coordenador: {equipe.coordenador.nome}
                          </span>
                        )}
                      </span>
                    </div>

                    {minha ? (
                      <span className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Esta é a sua equipe
                      </span>
                    ) : podeSeInscrever && !minhaEquipeNaLista && (
                      <Button
                        onClick={() => inscrever(id)}
                        disabled={Boolean(inscrevendo)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        {inscrevendo === id ? 'Inscrevendo...' : 'Entrar nesta equipe'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 pt-5 border-t border-gray-200 flex flex-wrap items-center justify-center gap-2">
            {/* Sempre disponível: quem cai nesta tela ainda não participa de
                nenhuma gincana, então `gincanasAcessiveis` traz no máximo a que
                ele acabou de escolher — condicionar o botão a "ter mais de uma"
                o esconderia justamente de quem escolheu a gincana errada. */}
            <Button
              onClick={limparGincanaAtiva}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 inline-flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Escolher outra gincana
            </Button>
            {podeTrocarEscola && (
              <Button
                onClick={limparEscolaAtiva}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 inline-flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Escolher outra escola
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

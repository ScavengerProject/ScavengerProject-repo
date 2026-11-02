import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Crown, Maximize, Minimize, Pause, Play, Trophy, X,
} from 'lucide-react';
import { gincanasService } from '../services/api';
import { useGincana } from '../hooks/useGincana';
import { CURVA, prefereMenosMovimento } from '../components/site/movimento.jsx';
import {
  MEDALHAS,
  duracaoDaEtapa,
  fraseSuspense,
  gruposDoPodio,
  montarEtapas,
  posicoesReveladas,
  tituloCampea,
} from '../lib/cerimonia';

// Quanto tempo o "E a equipe campeã é..." fica na tela antes do anúncio.
const SUSPENSE_MS = 2200;

const COR_SEM_EQUIPE = '#94A3B8';

const formatarPontos = (pontos) => `${Number(pontos).toLocaleString('pt-BR')} pts`;

const FUNDO = {
  background: [
    'radial-gradient(ellipse 80% 60% at 50% 115%, rgba(99, 102, 241, 0.35), transparent 70%)',
    'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(245, 197, 66, 0.14), transparent 70%)',
    '#0B1020',
  ].join(', '),
};

// Chuva de confete do anúncio da campeã: rajada central + dois canhões
// laterais por ~2,5s, nas cores da(s) equipe(s) campeã(s) e do ouro. O módulo
// é carregado só aqui, para não pesar no bundle do resto do sistema.
async function soltarConfete(cores, cancelado) {
  const { default: confetti } = await import('canvas-confetti');
  if (cancelado()) return () => {};

  const comum = { colors: cores, disableForReducedMotion: true, zIndex: 60 };
  confetti({ ...comum, particleCount: 160, spread: 100, startVelocity: 45, origin: { y: 0.6 } });

  const fim = Date.now() + 2500;
  let quadro;
  const lateral = () => {
    if (cancelado()) return;
    confetti({ ...comum, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
    confetti({ ...comum, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
    if (Date.now() < fim) quadro = requestAnimationFrame(lateral);
  };
  lateral();

  return () => {
    cancelAnimationFrame(quadro);
    confetti.reset();
  };
}

function PontoEquipe({ cor, className = 'h-3 w-3' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ring-2 ring-white/30 ${className}`}
      style={{ backgroundColor: cor || COR_SEM_EQUIPE }}
    />
  );
}

function Abertura({ gincana }) {
  return (
    <div className="text-center animate-cerimonia-surgir motion-reduce:animate-none">
      <div className="relative mx-auto mb-8 h-28 w-28 sm:h-36 sm:w-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-2xl animate-cerimonia-pulsar motion-reduce:animate-none"
          style={{ backgroundColor: MEDALHAS[1].brilho }}
        />
        <Trophy className="relative h-full w-full" style={{ color: MEDALHAS[1].cor }} strokeWidth={1.25} />
      </div>
      <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-white/60">
        Cerimônia de encerramento
      </p>
      <h1 className="mt-3 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight wrap-break-word">
        {gincana.nome}
      </h1>
      <p className="mt-2 text-xl sm:text-2xl text-white/70">{gincana.ano}</p>
    </div>
  );
}

function ItemClassificacao({ equipe, mostrarPontos, atraso, destaque }) {
  const medalha = MEDALHAS[equipe.posicao];
  return (
    <li
      className="flex items-center gap-3 sm:gap-4 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 animate-cerimonia-surgir motion-reduce:animate-none"
      style={{
        animationDelay: `${atraso}ms`,
        ...(destaque && medalha ? { boxShadow: `inset 4px 0 0 ${medalha.cor}` } : null),
      }}
    >
      <span
        className="w-10 shrink-0 text-right text-lg sm:text-xl font-black tabular-nums"
        style={{ color: destaque && medalha ? medalha.cor : 'rgba(255,255,255,0.6)' }}
      >
        {equipe.posicao}º
      </span>
      <PontoEquipe cor={equipe.cor} />
      <span className="min-w-0 flex-1 text-base sm:text-lg font-semibold wrap-break-word">{equipe.nome}</span>
      {mostrarPontos && equipe.pontos !== undefined && (
        <span className="shrink-0 text-sm sm:text-base tabular-nums text-white/70">
          {formatarPontos(equipe.pontos)}
        </span>
      )}
    </li>
  );
}

function Demais({ classificacao, mostrarPontos }) {
  const demais = classificacao.filter((e) => e.posicao > 3);
  // Aparecem de baixo para cima (do último ao 4º), com o intervalo encolhendo
  // quando há muitas equipes para a lista não se arrastar.
  const passo = Math.min(280, 3000 / Math.max(demais.length, 1));
  return (
    <div className="w-full max-w-2xl">
      <h2 className="mb-6 text-center text-2xl sm:text-4xl font-black animate-cerimonia-surgir motion-reduce:animate-none">
        Antes do pódio…
      </h2>
      <ol className="grid gap-2 sm:gap-3">
        {demais.map((equipe, i) => (
          <ItemClassificacao
            key={equipe.equipe_id}
            equipe={equipe}
            mostrarPontos={mostrarPontos}
            atraso={300 + (demais.length - 1 - i) * passo}
          />
        ))}
      </ol>
    </div>
  );
}

// Em vh, não em px: o telão de projetor costuma ser baixo (1366x768, com a
// barra do navegador), e um empate no 1º empilha nomes em cima da coluna — em
// altura fixa, o pódio passava por cima do título e do rodapé.
const ALTURA_COLUNA = {
  1: 'h-[26vh]',
  2: 'h-[19vh]',
  3: 'h-[13vh]',
};

function ColunaPodio({ posicao, equipes, revelada, mostrarPontos }) {
  const medalha = MEDALHAS[posicao];
  const campea = posicao === 1;
  return (
    <div
      className={`flex flex-col items-center justify-end ${
        campea ? 'w-[36%] max-w-72' : 'w-[30%] max-w-56'
      }`}
    >
      <div className="mb-3 flex min-h-16 w-full flex-col items-center justify-end gap-1 text-center">
        {revelada ? (
          <div className="flex flex-col items-center gap-1 animate-cerimonia-surgir motion-reduce:animate-none">
            {campea && (
              <Crown
                aria-hidden="true"
                className="mb-1 h-8 w-8 sm:h-12 sm:w-12 animate-cerimonia-pulsar motion-reduce:animate-none"
                style={{ color: medalha.cor }}
              />
            )}
            {equipes.map((equipe) => (
              <div key={equipe.equipe_id} className="flex flex-col items-center">
                {/* A bolinha vai no fluxo do texto: num nome que quebra
                    linha, ela fica colada à primeira palavra, não solta ao lado
                    do bloco. */}
                <span
                  className={`font-black leading-tight text-balance wrap-break-word ${
                    campea && equipes.length === 1 ? 'text-xl sm:text-4xl' : 'text-base sm:text-2xl'
                  }`}
                >
                  <PontoEquipe cor={equipe.cor} className="mr-2 h-3 w-3 align-middle sm:h-4 sm:w-4" />
                  {equipe.nome}
                </span>
                {mostrarPontos && equipe.pontos !== undefined && (
                  <span className="text-xs sm:text-base tabular-nums text-white/70">
                    {formatarPontos(equipe.pontos)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span aria-hidden="true" className="text-4xl sm:text-6xl font-black text-white/20">?</span>
        )}
      </div>
      <div
        className={`flex w-full justify-center rounded-t-xl transition-[height,box-shadow] duration-1000 ${CURVA} motion-reduce:transition-none ${
          revelada ? ALTURA_COLUNA[posicao] : 'h-[6vh]'
        }`}
        style={{
          background: revelada
            ? `linear-gradient(to bottom, ${medalha.cor}, ${medalha.cor}B3)`
            : 'rgba(255, 255, 255, 0.08)',
          boxShadow: revelada ? `0 0 70px ${medalha.brilho}` : 'none',
        }}
      >
        <span
          className={`pt-2 text-2xl sm:text-5xl font-black ${revelada ? 'text-black/60' : 'text-white/30'}`}
        >
          {posicao}º
        </span>
      </div>
    </div>
  );
}

function Podio({ classificacao, etapa, reveladas, suspense, mostrarPontos }) {
  const grupos = gruposDoPodio(classificacao);
  // 2º à esquerda, 1º ao centro, 3º à direita — omitindo a posição que o
  // empate fez sumir.
  const ordem = [2, 1, 3].filter((p) => grupos.has(p));

  let titulo;
  if (etapa.posicao === 1 && suspense) titulo = fraseSuspense(grupos.get(1).length);
  else if (etapa.posicao === 1) titulo = `${tituloCampea(grupos.get(1).length)}!`;
  else titulo = MEDALHAS[etapa.posicao].rotulo;

  return (
    <div className="flex w-full max-w-4xl flex-1 flex-col">
      <h2
        key={titulo}
        className={`text-center text-3xl sm:text-6xl font-black animate-cerimonia-surgir motion-reduce:animate-none ${
          suspense ? 'text-white/80' : ''
        }`}
        style={!suspense ? { color: MEDALHAS[etapa.posicao].cor } : undefined}
      >
        {titulo}
      </h2>
      <div className="mt-auto flex items-end justify-center gap-2 sm:gap-4 border-b border-white/15">
        {ordem.map((posicao) => (
          <ColunaPodio
            key={posicao}
            posicao={posicao}
            equipes={grupos.get(posicao)}
            revelada={reveladas.has(posicao) && !(posicao === 1 && suspense)}
            mostrarPontos={mostrarPontos}
          />
        ))}
      </div>
    </div>
  );
}

function Final({ classificacao, mostrarPontos }) {
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-center text-3xl sm:text-5xl font-black animate-cerimonia-surgir motion-reduce:animate-none">
        Classificação final
      </h2>
      <p className="mt-2 mb-6 text-center text-white/60 animate-cerimonia-surgir motion-reduce:animate-none">
        Parabéns a todas as equipes!
      </p>
      <ol className="grid gap-2 sm:gap-3">
        {classificacao.map((equipe, i) => (
          <ItemClassificacao
            key={equipe.equipe_id}
            equipe={equipe}
            mostrarPontos={mostrarPontos}
            atraso={200 + Math.min(i * 80, 1600)}
            destaque={equipe.posicao <= 3}
          />
        ))}
      </ol>
    </div>
  );
}

function BotaoControle({ rotulo, onClick, children, ativo = false }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo || undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-full p-2 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        ativo ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function anuncioDaEtapa(etapa, classificacao, suspense) {
  if (etapa.tipo === 'abertura') return 'Cerimônia de encerramento.';
  if (etapa.tipo === 'final') return 'Classificação final.';
  if (etapa.tipo === 'demais') return 'Classificação a partir do 4º lugar.';
  if (suspense) return '';
  const nomes = classificacao.filter((e) => e.posicao === etapa.posicao).map((e) => e.nome).join(' e ');
  return `${MEDALHAS[etapa.posicao].rotulo}: ${nomes}.`;
}

/**
 * Palco da cerimônia: avança por clique, espaço ou setas — quem apresenta
 * controla o ritmo enquanto fala, como numa apresentação de slides. O modo
 * automático avança sozinho e para na classificação final.
 */
function Palco({ dados, onSair }) {
  const { gincana, classificacao, mostrar_pontos: mostrarPontos } = dados;
  const etapas = useMemo(() => montarEtapas(classificacao), [classificacao]);
  const [indice, setIndice] = useState(0);
  const [suspense, setSuspense] = useState(false);
  const [automatico, setAutomatico] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);

  const etapa = etapas[indice];
  const reveladas = posicoesReveladas(etapas, indice);
  const ultima = indice === etapas.length - 1;

  const avancar = useCallback(() => {
    // Durante o suspense, avançar antecipa o anúncio em vez de pular a campeã.
    if (suspense) {
      setSuspense(false);
      return;
    }
    if (indice >= etapas.length - 1) return;
    const proxima = etapas[indice + 1];
    setSuspense(proxima.tipo === 'podio' && proxima.posicao === 1 && !prefereMenosMovimento());
    setIndice(indice + 1);
  }, [suspense, indice, etapas]);

  const voltar = useCallback(() => {
    setSuspense(false);
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  const alternarTelaCheia = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // Espaço/Enter num botão focado já disparam o clique dele.
      if ((e.key === ' ' || e.key === 'Enter') && e.target.closest?.('button')) return;
      if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        avancar();
      } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        voltar();
      } else if (e.key === 'f' || e.key === 'F') {
        alternarTelaCheia();
      } else if (e.key === 'a' || e.key === 'A') {
        setAutomatico((v) => !v);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [avancar, voltar, alternarTelaCheia]);

  useEffect(() => {
    if (!suspense) return undefined;
    const t = setTimeout(() => setSuspense(false), SUSPENSE_MS);
    return () => clearTimeout(t);
  }, [suspense]);

  // A ref evita que o timer recomece cada vez que `avancar` muda de identidade
  // (o fim do suspense, por exemplo, não deve estender o tempo da etapa).
  const avancarRef = useRef(avancar);
  avancarRef.current = avancar;
  useEffect(() => {
    if (!automatico) return undefined;
    const duracao = duracaoDaEtapa(etapa, classificacao.filter((e) => e.posicao > 3).length);
    if (duracao === null) {
      setAutomatico(false);
      return undefined;
    }
    const t = setTimeout(() => avancarRef.current(), duracao);
    return () => clearTimeout(t);
  }, [automatico, etapa, classificacao]);

  const campeaAnunciada = etapa.tipo === 'podio' && etapa.posicao === 1 && !suspense;
  useEffect(() => {
    if (!campeaAnunciada || prefereMenosMovimento()) return undefined;
    let cancelado = false;
    let parar = () => {};
    const cores = [
      ...classificacao.filter((e) => e.posicao === 1).map((e) => e.cor || COR_SEM_EQUIPE),
      MEDALHAS[1].cor,
      '#FFFFFF',
    ];
    soltarConfete(cores, () => cancelado)
      .then((fn) => { parar = fn; })
      .catch(() => {});
    return () => {
      cancelado = true;
      parar();
    };
  }, [campeaAnunciada, classificacao]);

  const tela = etapa.tipo === 'podio' ? 'podio' : etapa.tipo;

  return (
    <div
      className="fixed inset-0 flex select-none flex-col overflow-hidden text-white"
      style={FUNDO}
      onClick={avancar}
    >
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <p className="min-w-0 truncate text-sm text-white/50">
          {etapa.tipo !== 'abertura' && `${gincana.nome} · ${gincana.ano}`}
        </p>
        <nav aria-label="Controles da cerimônia" className="flex shrink-0 items-center gap-1">
          <BotaoControle rotulo="Voltar" onClick={voltar}><ChevronLeft size={20} /></BotaoControle>
          <BotaoControle rotulo="Avançar" onClick={avancar}><ChevronRight size={20} /></BotaoControle>
          <BotaoControle
            rotulo={automatico ? 'Pausar modo automático' : 'Modo automático'}
            onClick={() => setAutomatico((v) => !v)}
            ativo={automatico}
          >
            {automatico ? <Pause size={20} /> : <Play size={20} />}
          </BotaoControle>
          <BotaoControle rotulo={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} onClick={alternarTelaCheia}>
            {telaCheia ? <Minimize size={20} /> : <Maximize size={20} />}
          </BotaoControle>
          <BotaoControle rotulo="Sair da cerimônia" onClick={onSair}><X size={20} /></BotaoControle>
        </nav>
      </header>

      <main
        key={tela}
        className={`relative flex flex-1 flex-col items-center px-4 pb-4 sm:px-8 ${
          tela === 'podio' ? 'min-h-0 pt-6' : 'justify-center overflow-y-auto py-6'
        }`}
      >
        {etapa.tipo === 'abertura' && <Abertura gincana={gincana} />}
        {etapa.tipo === 'demais' && <Demais classificacao={classificacao} mostrarPontos={mostrarPontos} />}
        {etapa.tipo === 'podio' && (
          <Podio
            classificacao={classificacao}
            etapa={etapa}
            reveladas={reveladas}
            suspense={suspense}
            mostrarPontos={mostrarPontos}
          />
        )}
        {etapa.tipo === 'final' && <Final classificacao={classificacao} mostrarPontos={mostrarPontos} />}
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-2 pb-4">
        <div className="flex gap-1.5" aria-hidden="true">
          {etapas.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === indice ? 'w-6 bg-white' : i < indice ? 'w-1.5 bg-white/60' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
        {!ultima && (
          <p className="text-xs text-white/40">Espaço, → ou toque na tela para avançar</p>
        )}
      </footer>

      <p aria-live="polite" className="sr-only">{anuncioDaEtapa(etapa, classificacao, suspense)}</p>
    </div>
  );
}

/**
 * [/cerimonia/:gincanaId] Cerimônia de encerramento, feita para o telão.
 *
 * Fica fora do MainLayout e das travas de gincana/equipe do App.jsx: a gincana
 * já está ENCERRADA e por isso deixou de ser um escopo válido — a sidebar e as
 * notificações levariam GINCANA_ENCERRADA e o api.js tiraria a pessoa daqui.
 * A única requisição é GET /gincanas/:id/resultado-final, que não depende da
 * gincana ativa.
 */
export default function Cerimonia() {
  const { gincanaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { recarregarGincanas } = useGincana();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setDados(null);
    setErro(null);
    gincanasService.resultadoFinal(gincanaId)
      .then((resposta) => { if (!cancelado) setDados(resposta); })
      .catch((error) => { if (!cancelado) setErro(error); });
    return () => { cancelado = true; };
  }, [gincanaId, tentativa]);

  // A gincana guardada como ativa pode ser justamente a que acabou de ser
  // encerrada: recarregar a lista antes de sair deixa o GincanaProvider
  // descartá-la, em vez de a primeira tela fora daqui levar GINCANA_ENCERRADA.
  //
  // Volta para a tela de onde veio (o admin, ao Gerenciar Gincanas); aberta
  // direto pelo link do email não há "de onde veio" no app (key 'default'),
  // e voltar sairia do sistema — vai para o início.
  const veioDeDentroDoApp = location.key !== 'default';
  const sair = useCallback(async () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    try {
      await recarregarGincanas();
    } catch {
      // Sem a lista atualizada, o api.js corrige na primeira requisição.
    }
    if (veioDeDentroDoApp) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate, recarregarGincanas, veioDeDentroDoApp]);

  if (erro) {
    const naoDivulgado = erro.codigo === 'RESULTADO_NAO_DISPONIVEL';
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 text-white" style={FUNDO}>
        <div className="max-w-md text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-white/40" />
          <h1 className="text-2xl font-bold">
            {naoDivulgado ? 'Resultado ainda não divulgado' : 'Não foi possível carregar o resultado'}
          </h1>
          <p className="mt-2 text-white/70">
            {naoDivulgado
              ? 'A cerimônia fica disponível quando a gincana for encerrada.'
              : erro.message}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!naoDivulgado && (
              <button
                type="button"
                onClick={() => setTentativa((t) => t + 1)}
                className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-white/90"
              >
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              onClick={sair}
              className="rounded-lg bg-white/15 px-4 py-2 font-semibold hover:bg-white/25"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={FUNDO}>
        <div
          role="status"
          aria-label="Carregando o resultado"
          className="h-12 w-12 animate-spin rounded-full border-4 border-white/80 border-t-transparent"
        />
      </div>
    );
  }

  return <Palco dados={dados} onSair={sair} />;
}

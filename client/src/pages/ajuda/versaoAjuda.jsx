import React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CaretDown, ClockCounterClockwise } from '@phosphor-icons/react';
import { CURVA, FOCO, FONTE_SITE } from '../../components/site/movimento';
import {
  VERSAO_ATUAL, VERSOES, buscarVersao, caminhoAjuda, temVariasVersoes,
} from '../../ajuda/versoes';

// Versão que a página está mostrando: a do endereço (/ajuda/v/:versao) ou,
// sem ela, a atual. `conteudo` é null quando a versão pedida não existe.
export function useVersaoAjuda() {
  const { versao } = useParams();
  const conteudo = versao ? buscarVersao(versao) ?? null : VERSAO_ATUAL;
  return {
    conteudo,
    versaoPedida: versao,
    ehAtual: conteudo === VERSAO_ATUAL,
    caminho: (slug) => caminhoAjuda(conteudo?.versao ?? VERSAO_ATUAL.versao, slug),
  };
}

// Envolve as rotas versionadas: /ajuda/v/<atual> vira /ajuda (um endereço só
// para a mesma página), e uma versão inexistente mostra o aviso em vez de quebrar.
export function GuardaVersao({ children }) {
  const { versao, slug } = useParams();
  if (versao === VERSAO_ATUAL.versao) return <Navigate to={caminhoAjuda(versao, slug)} replace />;
  if (versao && !buscarVersao(versao)) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-32 text-center" style={FONTE_SITE}>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-950">Versão não encontrada</h1>
        <p className="mt-4 text-lg text-gray-600 text-pretty">
          Não existe ajuda da versão {versao}. A versão atual do Arena é a {VERSAO_ATUAL.versao}.
        </p>
        <Link to="/ajuda" className={`mt-8 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-base font-semibold text-white ${FOCO}`}>
          Abrir a ajuda atual
        </Link>
      </div>
    );
  }
  return children;
}

// Com uma versão só, é apenas uma etiqueta. Com várias, um select que troca de
// versão mantendo o artigo aberto, se ele existir na outra.
export function SeletorVersao({ className = '' }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { conteudo } = useVersaoAjuda();
  if (!conteudo) return null;

  if (!temVariasVersoes()) {
    return <span className={`inline-block text-sm text-gray-500 ${className}`}>Versão {conteudo.versao}</span>;
  }

  const trocar = (versao) => {
    const destino = buscarVersao(versao);
    navigate(caminhoAjuda(versao, slug && destino?.buscarArtigo(slug) ? slug : undefined));
  };

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">Versão do sistema</span>
      <select
        value={conteudo.versao}
        onChange={(e) => trocar(e.target.value)}
        className={`appearance-none rounded-full border border-gray-300 bg-white py-1 pl-3 pr-8 text-sm font-medium text-gray-900 transition-colors duration-300 ${CURVA} hover:bg-gray-50 ${FOCO}`}
      >
        {VERSOES.map((v) => (
          <option key={v.versao} value={v.versao}>
            Versão {v.versao}{v === VERSAO_ATUAL ? ' (atual)' : ''}
          </option>
        ))}
      </select>
      <CaretDown size={12} aria-hidden="true" className="pointer-events-none absolute right-3 text-gray-500" />
    </label>
  );
}

// Aviso no topo de uma versão antiga, com o caminho para a mesma página na atual.
export function AvisoVersaoAntiga() {
  const { slug } = useParams();
  const { conteudo, ehAtual } = useVersaoAjuda();
  if (!conteudo || ehAtual) return null;
  const naAtual = slug && VERSAO_ATUAL.buscarArtigo(slug) ? slug : undefined;

  return (
    <div role="note" className="mb-8 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex gap-3 text-sm text-pretty">
        <ClockCounterClockwise size={20} className="shrink-0 text-amber-600" />
        <span>
          Você está vendo a ajuda da versão {conteudo.versao}. O Arena hoje está na versão {VERSAO_ATUAL.versao},
          e algumas telas podem ter mudado.
        </span>
      </p>
      <Link
        to={caminhoAjuda(VERSAO_ATUAL.versao, naAtual)}
        className={`shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-950 shadow-sm transition duration-300 ${CURVA} hover:bg-amber-100 active:scale-[0.98] ${FOCO}`}
      >
        {naAtual ? 'Ver esta página na versão atual' : 'Ir para a versão atual'}
      </Link>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '@fontsource-variable/geist';
import { CaretDown } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth.jsx';
import NavFlutuante from '../../components/site/NavFlutuante';
import RodapeSite from '../../components/site/RodapeSite';
import { CURVA, FOCO, FONTE_SITE } from '../../components/site/movimento';
import { AvisoVersaoAntiga, SeletorVersao, useVersaoAjuda } from './versaoAjuda';

// Layout próprio da central de ajuda, sem o MainLayout: a ajuda é pública e
// abre em qualquer etapa do escopo (sem escola, sem gincana, sem equipe), e o
// MainLayout dispara as notificações a cada 30s, que voltariam 401/403.
// Visual igual ao da landing (components/site), para as duas parecerem um site só.

function IndiceArtigos({ aoEscolher }) {
  const { conteudo, caminho } = useVersaoAjuda();
  return (
    <div className="space-y-6">
      {conteudo.categorias.map((categoria) => (
        <div key={categoria.id}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {categoria.titulo}
          </p>
          <ul className="space-y-0.5">
            {conteudo.artigosDaCategoria(categoria.id).map((artigo) => (
              <li key={artigo.slug}>
                <NavLink
                  to={caminho(artigo.slug)}
                  onClick={aoEscolher}
                  className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm transition-colors duration-300 ${CURVA} ${FOCO} ${
                    isActive
                      ? 'bg-gray-100 font-medium text-gray-950'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  {artigo.titulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function AjudaLayout({ children, comIndice = true }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [indiceAberto, setIndiceAberto] = useState(false);
  const indiceRef = useRef(null);

  // O índice tem rolagem própria no desktop: sem isto, abrir um artigo do fim
  // da lista (Administração) deixaria o item marcado fora da vista. Mexe só no
  // scrollTop do índice; scrollIntoView rolaria a página junto.
  useEffect(() => {
    const indice = indiceRef.current;
    const atual = indice?.querySelector('[aria-current="page"]');
    if (!indice || !atual || indice.scrollHeight <= indice.clientHeight) return;
    indice.scrollTop = atual.offsetTop - indice.clientHeight / 2;
  }, [location.pathname]);

  const nav = isAuthenticated
    ? {
      links: [{ rotulo: 'Central de ajuda', to: '/ajuda' }],
      acao: { rotulo: 'Voltar ao sistema', to: '/' },
    }
    : {
      links: [
        { rotulo: 'Página inicial', to: '/' },
        { rotulo: 'Central de ajuda', to: '/ajuda' },
      ],
      acao: { rotulo: 'Entrar', to: '/login' },
      extrasMobile: [{ rotulo: 'Criar minha conta', to: '/inscricao', destaque: true }],
    };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased" style={FONTE_SITE}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
      >
        Pular para o conteúdo
      </a>
      <NavFlutuante {...nav} />

      {comIndice ? (
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-24 pb-24 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16 lg:pt-32">
          <aside className="mb-8 lg:mb-0">
            <SeletorVersao className="mb-4 lg:px-3" />
            {/* No celular o índice vira uma lista recolhível acima do artigo. */}
            <button
              type="button"
              onClick={() => setIndiceAberto((aberto) => !aberto)}
              aria-expanded={indiceAberto}
              className={`lg:hidden flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 transition-colors duration-300 ${CURVA} hover:bg-gray-50 ${FOCO}`}
            >
              Todos os artigos
              <CaretDown size={16} className={`transition-transform duration-500 ${CURVA} ${indiceAberto ? 'rotate-180' : ''}`} />
            </button>
            <nav
              ref={indiceRef}
              aria-label="Artigos de ajuda"
              className={`${indiceAberto ? 'block' : 'hidden'} lg:block mt-2 rounded-xl border border-gray-200 p-2 lg:sticky lg:top-24 lg:mt-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-0 lg:p-0`}
            >
              <IndiceArtigos aoEscolher={() => setIndiceAberto(false)} />
            </nav>
          </aside>
          <main id="conteudo" key={location.pathname} className="min-w-0">
            <AvisoVersaoAntiga />
            {children}
          </main>
        </div>
      ) : (
        <main id="conteudo" className="flex-1">
          {children}
        </main>
      )}

      <RodapeSite>
        <p>Ainda com dúvida? Procure a organização da gincana na sua escola.</p>
      </RodapeSite>
    </div>
  );
}

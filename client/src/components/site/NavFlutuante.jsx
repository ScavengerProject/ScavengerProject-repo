import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CURVA, FOCO } from './movimento';

// Item de menu: âncora na mesma página (`href`) ou rota (`to`). Rotas usam
// NavLink, que marca a página atual com aria-current.
function ItemMenu({ link, className, style, onClick }) {
  if (link.to) {
    return (
      <NavLink
        to={link.to}
        end={link.to === '/'}
        style={style}
        onClick={onClick}
        className={({ isActive }) => (typeof className === 'function' ? className(isActive) : className)}
      >
        {link.rotulo}
      </NavLink>
    );
  }
  const classe = typeof className === 'function' ? className(false) : className;
  return <a href={link.href} className={classe} style={style} onClick={onClick}>{link.rotulo}</a>;
}

// Barra compacta que flutua afastada do topo, com fundo translúcido e desfoque.
// No celular, o botão vira um X animado e abre um painel de altura total.
//
//   links         itens do meio ({ rotulo, href } ou { rotulo, to })
//   acao          botão da direita no desktop ({ rotulo, to })
//   extrasMobile  itens a mais no painel do celular; `destaque` pinta de azul
export default function NavFlutuante({ links, acao, extrasMobile = [] }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false); };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);
  const itensMobile = [...links, ...(acao ? [acao] : []), ...extrasMobile];

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 top-4 z-40 mx-auto flex w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-md"
      >
        <Link to="/" className={`rounded-full px-3 py-1 text-base font-bold text-gray-950 ${FOCO}`}>
          Arena
        </Link>
        <ul className="hidden md:flex items-center">
          {links.map((link) => (
            <li key={link.rotulo}>
              <ItemMenu
                link={link}
                className={(ativo) => `rounded-full px-3 py-2 text-sm font-medium transition-colors duration-300 ${CURVA} ${FOCO} ${
                  ativo ? 'bg-gray-100 text-gray-950' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                }`}
              />
            </li>
          ))}
        </ul>
        {acao && (
          <Link
            to={acao.to}
            className={`hidden md:inline-flex rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 transition duration-300 ${CURVA} hover:bg-gray-50 active:scale-[0.98] ${FOCO}`}
          >
            {acao.rotulo}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          aria-expanded={aberto}
          aria-controls="menu-site"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          className={`md:hidden relative z-50 flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${CURVA} hover:bg-gray-100 ${FOCO}`}
        >
          {/* Duas linhas que giram até formar o X. */}
          <span
            aria-hidden="true"
            className={`absolute h-0.5 w-4 rounded-full bg-gray-900 transition-transform duration-500 ${CURVA} ${aberto ? 'rotate-45' : '-translate-y-1'}`}
          />
          <span
            aria-hidden="true"
            className={`absolute h-0.5 w-4 rounded-full bg-gray-900 transition-transform duration-500 ${CURVA} ${aberto ? '-rotate-45' : 'translate-y-1'}`}
          />
        </button>
      </nav>

      <div
        id="menu-site"
        className={`md:hidden fixed inset-0 z-30 bg-white/95 backdrop-blur-xl transition-opacity duration-500 ${CURVA} ${
          aberto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!aberto}
        inert={!aberto}
      >
        <ul className="flex h-full flex-col justify-center gap-2 px-6">
          {itensMobile.map((link, i) => (
            <li key={link.rotulo}>
              <ItemMenu
                link={link}
                onClick={fechar}
                // Cada link entra 60ms depois do anterior, com teto de 400ms.
                style={{ transitionDelay: aberto ? `${Math.min(i * 60, 400)}ms` : '0ms' }}
                className={(ativo) => `block rounded-lg py-3 text-3xl font-semibold transition-[opacity,transform] duration-500 ${CURVA} motion-reduce:translate-y-0 ${FOCO} ${
                  link.destaque || ativo ? 'text-blue-700' : 'text-gray-950'
                } ${aberto ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

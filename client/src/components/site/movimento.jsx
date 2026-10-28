import React, { useEffect, useRef, useState } from 'react';

// Base visual das páginas públicas (landing e central de ajuda). As classes
// ficam em strings literais para o Tailwind enxergá-las ao varrer o código.

// Curva única de movimento: desacelera ao chegar no lugar.
export const CURVA = 'ease-[cubic-bezier(0.22,1,0.36,1)]';

export const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

// Fonte das páginas públicas. O resto do sistema segue com a fonte própria.
export const FONTE_SITE = { fontFamily: "'Geist Variable', sans-serif" };

export const prefereMenosMovimento = () =>
  typeof window !== 'undefined'
  && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// Marca o elemento como visível na primeira vez que ele entra na tela, e não
// desfaz depois: a seção aparece uma vez só, não a cada rolagem para cima.
// Sem IntersectionObserver (navegador antigo, testes) tudo já nasce visível.
export function useRevelar(margem = '0px 0px -10% 0px') {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(
    () => typeof IntersectionObserver === 'undefined' || prefereMenosMovimento()
  );

  useEffect(() => {
    if (visivel || !ref.current) return undefined;
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisivel(true);
        observador.disconnect();
      }
    }, { rootMargin: margem });
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, [visivel, margem]);

  return [ref, visivel];
}

// Sobe 32px e aparece. Com movimento reduzido, só a opacidade muda.
export function Revelar({ as: Tag = 'div', atraso = 0, className = '', children, ...props }) {
  const [ref, visivel] = useRevelar();
  return (
    <Tag
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={`transition-[opacity,transform] duration-700 ${CURVA} motion-reduce:translate-y-0 ${
        visivel ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

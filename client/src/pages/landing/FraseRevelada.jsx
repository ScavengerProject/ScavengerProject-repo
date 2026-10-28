import React, { useEffect, useRef, useState } from 'react';
import { CURVA, prefereMenosMovimento } from '../../components/site/movimento';

// Frase grande cujas palavras acendem uma a uma conforme a seção sobe pela
// tela. Uma linha por item de `linhas`, para as quebras caírem onde a ideia
// quebra. A rolagem é lida no máximo uma vez por quadro (requestAnimationFrame).
export default function FraseRevelada({ linhas }) {
  const ref = useRef(null);
  const palavrasPorLinha = linhas.map((linha) => linha.split(' '));
  const total = palavrasPorLinha.reduce((soma, palavras) => soma + palavras.length, 0);
  const [acesas, setAcesas] = useState(() => (prefereMenosMovimento() ? total : 0));

  useEffect(() => {
    if (prefereMenosMovimento()) return undefined;
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const el = ref.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const altura = window.innerHeight;
      // Começa quando o topo da frase passa de 85% da tela e termina quando o
      // fim dela chega a 40%: a frase inteira acende enquanto atravessa o meio.
      const inicio = altura * 0.85;
      const percurso = height + altura * 0.45;
      const progresso = Math.min(1, Math.max(0, (inicio - top) / percurso));
      // Nunca apaga de novo: rolar para cima não desfaz a leitura.
      setAcesas((atual) => Math.max(atual, Math.round(progresso * total)));
    };
    const aoRolar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(atualizar);
    };
    atualizar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
      if (quadro) window.cancelAnimationFrame(quadro);
    };
  }, [total]);

  let indice = 0;
  return (
    <p ref={ref} className="max-w-[680px] text-4xl sm:text-5xl font-semibold tracking-tight text-gray-950">
      {palavrasPorLinha.map((palavras, l) => (
        <span key={l} className="block text-balance">
          {palavras.map((palavra) => {
            const i = indice++;
            return (
              <span
                key={i}
                className={`transition-opacity duration-500 ${CURVA} ${i < acesas ? 'opacity-100' : 'opacity-30'}`}
              >
                {palavra}{' '}
              </span>
            );
          })}
        </span>
      ))}
    </p>
  );
}

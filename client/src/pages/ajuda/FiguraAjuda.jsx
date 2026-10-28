import React from 'react';
import { ArrowsOut } from '@phosphor-icons/react';
import { CURVA, FOCO } from '../../components/site/movimento';

// Print de uma tela. Prints muito altos (listas longas) são cortados no topo
// e abrem inteiros em outra aba, para não empurrar o passo a passo para longe.
// `conteudo` é a versão da ajuda em exibição: cada versão tem os próprios prints.
export default function FiguraAjuda({ chave, conteudo }) {
  const imagem = conteudo.imagens[chave];
  if (!imagem) return null;
  const src = conteudo.urlImagem(chave);

  return (
    <figure>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className={`group relative block overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 ${FOCO}`}
      >
        <img
          src={src}
          alt={imagem.legenda}
          width={imagem.largura}
          height={imagem.altura}
          loading="lazy"
          decoding="async"
          className="max-h-[640px] w-full object-cover object-top"
        />
        <span
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-900 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-300 ${CURVA} group-hover:opacity-100 group-focus-visible:opacity-100`}
        >
          <ArrowsOut size={12} /> Ver em tamanho real
        </span>
      </a>
      <figcaption className="mt-2 text-sm text-gray-500 text-pretty">{imagem.legenda}</figcaption>
    </figure>
  );
}

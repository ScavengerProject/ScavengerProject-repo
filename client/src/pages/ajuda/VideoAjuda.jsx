import React, { useState } from 'react';
import { ArrowSquareOut, Play } from '@phosphor-icons/react';
import { CURVA, FOCO } from '../../components/site/movimento';
import { PLAYLISTS, urlIncorporada, urlNoYoutube } from '../../ajuda/videos';

// Vídeo de demonstração que só carrega o YouTube quando a pessoa clica: até
// lá é um cartão nosso, sem nenhuma requisição ao Google. Quem só lê o artigo
// não baixa o player nem é rastreado.
export default function VideoAjuda({ video, versaoDaPagina }) {
  const [tocando, setTocando] = useState(false);
  const playlist = PLAYLISTS[video.playlist];
  const deOutraVersao = versaoDaPagina && playlist.versao !== versaoDaPagina;

  if (tocando) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
        <iframe
          src={urlIncorporada(video)}
          title={`Vídeo: ${video.titulo}`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          // Sem o referrer o YouTube recusa o player incorporado (erro 153).
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => setTocando(true)}
        className={`group flex flex-1 items-center gap-4 rounded-lg p-2 text-left transition-colors duration-300 ${CURVA} hover:bg-gray-50 ${FOCO}`}
      >
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition-transform duration-300 ${CURVA} group-hover:scale-105 group-active:scale-[0.98]`}>
          <Play size={20} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-500">
            {playlist.titulo} · Episódio {video.episodio} · {video.duracao}
            {deOutraVersao && ` · gravado na versão ${playlist.versao}`}
          </span>
          <span className="block text-base font-semibold text-gray-950">Assistir: {video.titulo}</span>
        </span>
      </button>
      <a
        href={urlNoYoutube(video)}
        target="_blank"
        rel="noreferrer"
        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors duration-300 ${CURVA} hover:bg-gray-50 hover:text-gray-950 ${FOCO}`}
      >
        Abrir no YouTube
        <ArrowSquareOut size={16} />
      </a>
    </div>
  );
}

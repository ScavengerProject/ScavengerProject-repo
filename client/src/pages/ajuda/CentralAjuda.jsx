import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowSquareOut, Lifebuoy, MagnifyingGlass, Play, Sparkle, Wrench, ArrowsClockwise,
} from '@phosphor-icons/react';
import AjudaLayout from './AjudaLayout';
import TextoAjuda from './TextoAjuda';
import { CURVA, FOCO, Revelar } from '../../components/site/movimento';
import { AvisoVersaoAntiga, SeletorVersao, useVersaoAjuda } from './versaoAjuda';
import { PLAYLISTS, VIDEOS, urlPlaylist } from '../../ajuda/videos';

const quantidadeDeVideos = (playlist) => Object.values(VIDEOS).filter((video) => video.playlist === playlist).length;

// O caminho de quem acabou de chegar: conta, equipe, primeira prova.
const COMECE_POR_AQUI = ['criar-conta', 'entrar-em-equipe', 'ver-provas-e-inscrever'];

const TIPOS_NOVIDADE = {
  novo: { rotulo: 'Novo', icone: Sparkle, cor: 'bg-blue-50 text-blue-800' },
  mudou: { rotulo: 'Mudou', icone: ArrowsClockwise, cor: 'bg-gray-100 text-gray-800' },
  corrigido: { rotulo: 'Corrigido', icone: Wrench, cor: 'bg-green-50 text-green-800' },
};

function LinkArtigo({ artigo, para, comResumo = false }) {
  return (
    <Link
      to={para}
      className={`group flex items-start justify-between gap-4 rounded-lg px-3 py-2 transition-colors duration-300 ${CURVA} hover:bg-gray-50 ${FOCO}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900">{artigo.titulo}</span>
        {comResumo && (
          <span className="block text-sm text-gray-600 text-pretty"><TextoAjuda texto={artigo.resumo} /></span>
        )}
      </span>
      <ArrowRight
        size={16}
        className={`mt-0.5 shrink-0 text-gray-400 transition-transform duration-300 ${CURVA} group-hover:translate-x-1 group-hover:text-gray-900`}
      />
    </Link>
  );
}

export default function CentralAjuda() {
  const { conteudo, ehAtual, caminho } = useVersaoAjuda();
  const [termo, setTermo] = useState('');
  const buscando = termo.trim() !== '';
  const resultados = buscando ? conteudo.filtrarArtigos(termo) : [];

  useEffect(() => {
    document.title = ehAtual ? 'Central de ajuda · Arena' : `Central de ajuda (versão ${conteudo.versao}) · Arena`;
  }, [conteudo, ehAtual]);

  return (
    <AjudaLayout comIndice={false}>
      <section className="px-4 pt-32 pb-16 sm:pt-40">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mx-auto max-w-[680px] text-left"><AvisoVersaoAntiga /></div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600">
              <Lifebuoy size={16} />
              Central de ajuda
            </p>
            <SeletorVersao />
          </div>
          <h1 className="mx-auto mt-6 max-w-[680px] bg-linear-to-r from-black to-[#666666] bg-clip-text pb-2 text-5xl sm:text-6xl font-bold tracking-tight text-transparent text-balance">
            Como podemos ajudar?
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-lg text-gray-600 text-pretty">
            O passo a passo de cada tela do Arena, do cadastro ao lançamento de resultados.
            Cada artigo diz quem usa a função, onde ela fica e o que fazer.
          </p>

          <label className="relative mx-auto mt-8 block max-w-xl text-left">
            <span className="sr-only">Buscar na ajuda</span>
            <MagnifyingGlass size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar: inscrição, empréstimo, resultado"
              className={`w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-base shadow-sm transition-shadow duration-300 ${CURVA} placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20`}
            />
          </label>
        </div>
      </section>

      <div className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          {buscando ? (
            <section aria-live="polite" className="mx-auto max-w-[680px]">
              <h2 className="mb-4 text-sm font-medium text-gray-500">
                {resultados.length === 0
                  ? 'Nenhum artigo encontrado.'
                  : `${resultados.length} ${resultados.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}`}
              </h2>
              {resultados.length > 0 ? (
                <ul className="rounded-2xl border border-gray-200 p-2">
                  {resultados.map((artigo) => (
                    <li key={artigo.slug}><LinkArtigo artigo={artigo} para={caminho(artigo.slug)} comResumo /></li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl bg-gray-50 p-6 text-base text-gray-600 text-pretty">
                  Tente outra palavra, como o nome do botão ou do menu que aparece na tela.
                  Ou veja todas as categorias abaixo apagando a busca.
                </p>
              )}
            </section>
          ) : (
            <>
              {conteudo.novidades.length > 0 && (
                <section className="mb-20">
                  <h2 className="text-2xl font-semibold tracking-tight text-gray-950">O que mudou na versão {conteudo.versao}</h2>
                  {conteudo.lancamento && <p className="mt-2 text-base text-gray-600">Lançada em {conteudo.lancamento.toLowerCase()}.</p>}
                  <ul className="mt-6 divide-y divide-gray-200 rounded-2xl border border-gray-200">
                    {conteudo.novidades.map((novidade, i) => {
                      const tipo = TIPOS_NOVIDADE[novidade.tipo] ?? TIPOS_NOVIDADE.mudou;
                      const Icone = tipo.icone;
                      const artigo = novidade.artigo && conteudo.buscarArtigo(novidade.artigo);
                      return (
                        <li key={i} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                          <span className={`inline-flex w-max shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tipo.cor}`}>
                            <Icone size={12} weight="bold" /> {tipo.rotulo}
                          </span>
                          <span className="text-base text-gray-700 text-pretty">
                            <TextoAjuda texto={novidade.texto} />
                            {artigo && (
                              <>
                                {' '}
                                <Link to={caminho(artigo.slug)} className={`font-semibold text-gray-950 underline underline-offset-4 ${FOCO}`}>
                                  Ver o artigo
                                </Link>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Comece por aqui</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {COMECE_POR_AQUI.map(conteudo.buscarArtigo).filter(Boolean).map((artigo, i) => (
                    <Revelar key={artigo.slug} atraso={i * 60}>
                      <Link
                        to={caminho(artigo.slug)}
                        className={`group flex h-full flex-col rounded-2xl bg-gray-50 p-6 transition duration-300 ${CURVA} hover:bg-gray-100 active:scale-[0.98] ${FOCO}`}
                      >
                        <span className="text-sm font-medium text-gray-500">Passo {i + 1}</span>
                        <span className="mt-2 text-lg font-semibold text-gray-950">{artigo.titulo}</span>
                        <span className="mt-1 flex-1 text-sm text-gray-600 text-pretty"><TextoAjuda texto={artigo.resumo} /></span>
                        <ArrowRight size={18} className={`mt-4 text-gray-400 transition-transform duration-300 ${CURVA} group-hover:translate-x-1 group-hover:text-gray-900`} />
                      </Link>
                    </Revelar>
                  ))}
                </div>
              </section>

              <section className="mt-20">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Prefere assistir?</h2>
                <p className="mt-2 text-base text-gray-600 text-pretty">
                  Cada perfil tem uma série de vídeos curtos mostrando o sistema na prática. Os artigos também trazem o vídeo da função.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {Object.entries(PLAYLISTS).map(([chave, playlist], i) => (
                    <Revelar key={chave} atraso={i * 60}>
                      <a
                        href={urlPlaylist(chave)}
                        target="_blank"
                        rel="noreferrer"
                        className={`group flex h-full items-start gap-4 rounded-2xl border border-gray-200 p-6 transition duration-300 ${CURVA} hover:bg-gray-50 active:scale-[0.98] ${FOCO}`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition-transform duration-300 ${CURVA} group-hover:scale-105`}>
                          <Play size={16} weight="fill" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-gray-950">{playlist.titulo}</span>
                          <span className="mt-1 block text-sm text-gray-600 text-pretty">{playlist.descricao}</span>
                          <span className="mt-3 flex items-center gap-1 text-sm font-medium text-gray-900">
                            {quantidadeDeVideos(chave)} vídeos no YouTube <ArrowSquareOut size={14} />
                          </span>
                        </span>
                      </a>
                    </Revelar>
                  ))}
                </div>
              </section>

              <section className="mt-20">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Todos os assuntos</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {conteudo.categorias.map((categoria, i) => {
                    const Icone = categoria.icone;
                    return (
                      <Revelar as="section" key={categoria.id} atraso={(i % 3) * 60} className="rounded-2xl border border-gray-200 p-2">
                        <div className="flex items-start gap-3 px-3 pt-3 pb-2">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <Icone size={20} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-950">{categoria.titulo}</h3>
                            <p className="text-sm text-gray-600 text-pretty">{categoria.descricao}</p>
                          </div>
                        </div>
                        <ul>
                          {conteudo.artigosDaCategoria(categoria.id).map((artigo) => (
                            <li key={artigo.slug}><LinkArtigo artigo={artigo} para={caminho(artigo.slug)} /></li>
                          ))}
                        </ul>
                      </Revelar>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </AjudaLayout>
  );
}

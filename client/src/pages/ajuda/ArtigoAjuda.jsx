import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lightbulb, MapPin } from '@phosphor-icons/react';
import AjudaLayout from './AjudaLayout';
import TextoAjuda from './TextoAjuda';
import VideoAjuda from './VideoAjuda';
import FiguraAjuda from './FiguraAjuda';
import { CURVA, FOCO } from '../../components/site/movimento';
import { NOMES_PAPEIS } from '../../ajuda/categorias';
import { useVersaoAjuda } from './versaoAjuda';
import { VIDEOS } from '../../ajuda/videos';

function Secao({ titulo, children }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-950">{titulo}</h2>
      {children}
    </section>
  );
}

function LinkVizinho({ artigo, direcao, para }) {
  if (!artigo) return <span className="hidden sm:block" />;
  const anterior = direcao === 'anterior';
  const Seta = anterior ? ArrowLeft : ArrowRight;
  return (
    <Link
      to={para}
      className={`group flex flex-col gap-1 rounded-2xl border border-gray-200 p-4 transition duration-300 ${CURVA} hover:bg-gray-50 active:scale-[0.98] ${FOCO} ${anterior ? '' : 'sm:items-end sm:text-right'}`}
    >
      <span className="flex items-center gap-2 text-sm text-gray-500">
        {anterior && <Seta size={14} className={`transition-transform duration-300 ${CURVA} group-hover:-translate-x-1`} />}
        {anterior ? 'Anterior' : 'Próximo'}
        {!anterior && <Seta size={14} className={`transition-transform duration-300 ${CURVA} group-hover:translate-x-1`} />}
      </span>
      <span className="text-base font-semibold text-gray-950">{artigo.titulo}</span>
    </Link>
  );
}

export default function ArtigoAjuda() {
  const { slug } = useParams();
  const { conteudo, ehAtual, caminho } = useVersaoAjuda();
  const artigo = conteudo.buscarArtigo(slug);

  useEffect(() => {
    const versao = ehAtual ? '' : ` (versão ${conteudo.versao})`;
    document.title = artigo ? `${artigo.titulo}${versao} · Ajuda · Arena` : 'Central de ajuda · Arena';
    // Os links Anterior/Próximo ficam no fim da página: sem isto o artigo
    // seguinte abriria já rolado até o rodapé.
    window.scrollTo?.(0, 0);
  }, [artigo, conteudo, ehAtual]);

  if (!artigo) {
    return (
      <AjudaLayout>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-950">Artigo não encontrado</h1>
        <p className="mt-4 max-w-[680px] text-lg text-gray-600 text-pretty">
          O endereço pode ter mudado. Escolha um artigo na lista ou volte para a{' '}
          <Link to={caminho()} className={`font-semibold text-gray-950 underline underline-offset-4 ${FOCO}`}>central de ajuda</Link>.
        </p>
      </AjudaLayout>
    );
  }

  const categoria = conteudo.buscarCategoria(artigo.categoria);
  const { anterior, proximo } = conteudo.vizinhosDoArtigo(artigo.slug);
  const relacionados = (artigo.relacionados || []).map(conteudo.buscarArtigo).filter(Boolean);
  const videos = (artigo.videos || []).map((chave) => VIDEOS[chave]).filter(Boolean);

  return (
    <AjudaLayout>
      <article className="max-w-[680px]">
        <nav aria-label="Trilha" className="text-sm text-gray-500">
          <Link to={caminho()} className={`transition-colors duration-300 ${CURVA} hover:text-gray-950 ${FOCO}`}>Ajuda</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span>{categoria?.titulo}</span>
        </nav>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950 text-balance">{artigo.titulo}</h1>
        <p className="mt-4 text-lg text-gray-600 text-pretty"><TextoAjuda texto={artigo.resumo} /></p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Quem usa:</span>
          {artigo.papeis.map((papel) => (
            <span key={papel} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
              {NOMES_PAPEIS[papel]}
            </span>
          ))}
        </div>

        {videos.length > 0 && (
          <div className="mt-8 space-y-3">
            {videos.map((video) => <VideoAjuda key={video.id} video={video} versaoDaPagina={conteudo.versao} />)}
          </div>
        )}

        {artigo.ondeFica?.length > 0 && (
          <Secao titulo="Onde fica">
            <ul className="space-y-3">
              {artigo.ondeFica.map((item, i) => (
                <li key={i} className="flex gap-3 text-base text-gray-700 text-pretty">
                  <MapPin size={20} className="mt-0.5 shrink-0 text-blue-600" />
                  <span><TextoAjuda texto={item} /></span>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <Secao titulo="Passo a passo">
          <ol className="space-y-4">
            {artigo.passos.map((passo, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-1 text-base text-gray-700 text-pretty"><TextoAjuda texto={passo} /></span>
              </li>
            ))}
          </ol>
        </Secao>

        {/* Depois dos passos: prints altos antes deles empurravam o passo a passo
            para longe da primeira tela. */}
        {artigo.imagens?.length > 0 && (
          <Secao titulo="Na tela">
            <div className="space-y-8">
              {artigo.imagens.map((chave) => <FiguraAjuda key={chave} chave={chave} conteudo={conteudo} />)}
            </div>
          </Secao>
        )}

        {artigo.bomSaber?.length > 0 && (
          <Secao titulo="Bom saber">
            <ul className="space-y-3 rounded-2xl bg-amber-50 p-6">
              {artigo.bomSaber.map((item, i) => (
                <li key={i} className="flex gap-3 text-base text-amber-950 text-pretty">
                  <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-600" />
                  <span><TextoAjuda texto={item} /></span>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {relacionados.length > 0 && (
          <Secao titulo="Veja também">
            <ul className="grid gap-2 sm:grid-cols-2">
              {relacionados.map((rel) => (
                <li key={rel.slug}>
                  <Link
                    to={caminho(rel.slug)}
                    className={`group flex h-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors duration-300 ${CURVA} hover:bg-gray-50 ${FOCO}`}
                  >
                    {rel.titulo}
                    <ArrowRight size={16} className={`shrink-0 text-gray-400 transition-transform duration-300 ${CURVA} group-hover:translate-x-1 group-hover:text-gray-900`} />
                  </Link>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <nav aria-label="Outros artigos" className="mt-16 grid gap-4 sm:grid-cols-2">
          <LinkVizinho artigo={anterior} direcao="anterior" para={anterior && caminho(anterior.slug)} />
          <LinkVizinho artigo={proximo} direcao="proximo" para={proximo && caminho(proximo.slug)} />
        </nav>
      </article>
    </AjudaLayout>
  );
}

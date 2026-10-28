import { normalizar } from '../lib/buscaProvas';
import { CATEGORIAS } from './categorias';

// Junta os artigos de uma versão com as operações que as telas de ajuda usam
// (listar por categoria, achar um artigo, Anterior/Próximo, busca). Cada
// versão em ajuda/versoes/ passa por aqui uma vez, em ajuda/versoes.js.
export function montarConteudo({ versao, lancamento, novidades = [], artigos, imagens = {}, categorias = CATEGORIAS }) {
  const artigosDaCategoria = (categoriaId) => artigos.filter((artigo) => artigo.categoria === categoriaId);

  // Ordem de leitura (Anterior/Próximo): a das categorias, e dentro de cada uma
  // a ordem em que os artigos foram escritos.
  const emOrdem = categorias.flatMap((categoria) => artigosDaCategoria(categoria.id));

  const buscarArtigo = (slug) => artigos.find((artigo) => artigo.slug === slug);

  return {
    versao,
    lancamento,
    novidades,
    artigos,
    imagens,
    // Só as categorias com artigo: uma versão que remova todos os artigos de
    // uma categoria não mostra um cartão vazio.
    categorias: categorias.filter((categoria) => artigosDaCategoria(categoria.id).length > 0),
    emOrdem,
    artigosDaCategoria,
    buscarArtigo,
    buscarCategoria: (id) => categorias.find((categoria) => categoria.id === id),

    vizinhosDoArtigo(slug) {
      const i = emOrdem.findIndex((artigo) => artigo.slug === slug);
      if (i === -1) return { anterior: null, proximo: null };
      return { anterior: emOrdem[i - 1] || null, proximo: emOrdem[i + 1] || null };
    },

    // Sem diferenciar maiúsculas nem acentos, no título, no resumo e no corpo:
    // quem procura "emprestimo" quase nunca sabe o título do artigo.
    filtrarArtigos(termo) {
      const busca = normalizar(termo);
      if (!busca) return emOrdem;
      return emOrdem.filter((artigo) => normalizar([
        artigo.titulo,
        artigo.resumo,
        ...(artigo.ondeFica || []),
        ...artigo.passos,
        ...(artigo.bomSaber || []),
      ].join(' ')).includes(busca));
    },

    urlImagem: (chave) => `/ajuda/${versao}/${chave}.webp`,
  };
}

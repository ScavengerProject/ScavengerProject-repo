// Roteiro da cerimônia de encerramento (pages/Cerimonia.jsx), separado da tela
// para ser testável sem animação.
//
// A classificação vem de GET /gincanas/:id/resultado-final, já com `posicao`
// no padrão de empate "1, 1, 3". Por isso o pódio é montado por POSIÇÃO, e não
// pelas três primeiras equipes: num empate no 1º lugar não existe 2º, e as
// campeãs dividem a mesma coluna.

export const MEDALHAS = {
  1: { rotulo: '1º lugar', cor: '#F5C542', brilho: 'rgba(245, 197, 66, 0.45)' },
  2: { rotulo: '2º lugar', cor: '#C9D1DB', brilho: 'rgba(201, 209, 219, 0.35)' },
  3: { rotulo: '3º lugar', cor: '#D08A4E', brilho: 'rgba(208, 138, 78, 0.35)' },
};

/**
 * Agrupa as equipes do pódio (posições 1 a 3) por posição.
 * @param {Array<{posicao: number}>} classificacao
 * @returns {Map<number, Array>} só as posições que existem, em ordem crescente
 */
export function gruposDoPodio(classificacao) {
  const grupos = new Map();
  [...classificacao]
    .filter((e) => e.posicao <= 3)
    .sort((a, b) => a.posicao - b.posicao)
    .forEach((e) => {
      if (!grupos.has(e.posicao)) grupos.set(e.posicao, []);
      grupos.get(e.posicao).push(e);
    });
  return grupos;
}

/**
 * Sequência de etapas da cerimônia:
 *   abertura -> demais (4º em diante, se houver) -> pódio do 3º ao 1º -> final
 *
 * Cada etapa de pódio revela UMA posição; posições que não existem por causa de
 * empate não viram etapa.
 *
 * @param {Array<{posicao: number}>} classificacao
 * @returns {Array<{tipo: 'abertura'|'demais'|'podio'|'final', posicao?: number}>}
 */
export function montarEtapas(classificacao) {
  const etapas = [{ tipo: 'abertura' }];

  if (classificacao.some((e) => e.posicao > 3)) {
    etapas.push({ tipo: 'demais' });
  }

  [...gruposDoPodio(classificacao).keys()]
    .sort((a, b) => b - a)
    .forEach((posicao) => etapas.push({ tipo: 'podio', posicao }));

  etapas.push({ tipo: 'final' });
  return etapas;
}

/**
 * Posições do pódio já reveladas até a etapa `indice` (inclusive). Na etapa
 * final tudo está revelado.
 */
export function posicoesReveladas(etapas, indice) {
  const reveladas = new Set();
  etapas.slice(0, indice + 1).forEach((etapa) => {
    if (etapa.tipo === 'podio') reveladas.add(etapa.posicao);
  });
  return reveladas;
}

/**
 * Tempo de tela de cada etapa no modo automático (ms). O pódio do 1º lugar é
 * mais longo: inclui o suspense antes do anúncio e o confete.
 */
export function duracaoDaEtapa(etapa, totalDemais = 0) {
  switch (etapa.tipo) {
    case 'abertura': return 5000;
    // Dá tempo de a lista inteira aparecer e ser lida.
    case 'demais': return Math.min(4000 + totalDemais * 400, 12000);
    case 'podio': return etapa.posicao === 1 ? 9000 : 4500;
    default: return null; // 'final' fica parada no telão
  }
}

/** "Equipe campeã" / "Equipes campeãs" (empate no 1º). */
export function tituloCampea(totalCampeas) {
  return totalCampeas > 1 ? 'Equipes campeãs' : 'Equipe campeã';
}

/** Frase do suspense antes do anúncio, concordando com o número de campeãs. */
export function fraseSuspense(totalCampeas) {
  return totalCampeas > 1 ? 'E as equipes campeãs são…' : 'E a equipe campeã é…';
}

// Regras de pontuação de uma prova (`prova.pontuacao`).
//
// O tipo não é gravado: ele é inferido pelas chaves do objeto, e RANKING
// ({ 1: 300, 2: 200, ... }) é o que sobra. Por isso a detecção mora num lugar
// só: uma cópia que esquecesse um tipo novo o trataria como RANKING, e as
// posições inexistentes valeriam 0 pontos sem erro nenhum.
// Espelhado no backend em server/src/provas/tipoPontuacao.js.

const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj, chave);

export const tipoDaPontuacao = (pontuacao) => {
  const regras = pontuacao || {};
  if (tem(regras, 'pontuacao_maxima')) return 'SUBJETIVA';
  if (tem(regras, 'pontos_por_unidade')) return 'PROPORCIONAL';
  if (tem(regras, 'quantidade_minima')) return 'LIMIAR';
  return 'RANKING';
};

/**
 * Pontuação base de uma prova por unidade (PROPORCIONAL), com o teto aplicado.
 * O teto é `teto_unidades` (quantas unidades contam), na mesma medida do teto
 * das categorias de bônus. `limite_pontuacao_porcoes` é o teto antigo, em
 * PONTOS, de prova ainda não convertida. Espelha `pontuarPorUnidade` do backend.
 */
export const pontuarPorUnidade = (regras, quantidade) => {
  const pontosPorUnidade = Number(regras?.pontos_por_unidade) || 0;

  if (regras?.teto_unidades != null) {
    const teto = Number(regras.teto_unidades);
    return { pontos: Math.min(quantidade, teto) * pontosPorUnidade, tetoAtingido: quantidade > teto };
  }

  const pontosSemTeto = quantidade * pontosPorUnidade;
  const limiteLegado = Number(regras?.limite_pontuacao_porcoes) || 0;
  if (limiteLegado > 0 && pontosSemTeto > limiteLegado) {
    return { pontos: limiteLegado, tetoAtingido: true };
  }
  return { pontos: pontosSemTeto, tetoAtingido: false };
};

/**
 * Texto do teto de uma prova por unidade, ou null se ela não tem teto.
 * Ex.: "contam até 10 unidades (500 pts)". Não usa `nome_unidade`: o
 * formulário pede esse nome no singular ("doação").
 */
export const descreverTetoPorUnidade = (regras, { mostrarPontos = true } = {}) => {
  if (regras?.teto_unidades != null) {
    const pontos = Number(regras.teto_unidades) * (Number(regras.pontos_por_unidade) || 0);
    return `contam até ${regras.teto_unidades} unidades${mostrarPontos ? ` (${pontos} pts)` : ''}`;
  }
  const limiteLegado = Number(regras?.limite_pontuacao_porcoes) || 0;
  if (limiteLegado > 0) return mostrarPontos ? `máximo de ${limiteLegado} pts` : 'com teto';
  return null;
};

export const NOME_TIPO_PONTUACAO = {
  RANKING: 'Por Posição',
  PROPORCIONAL: 'Por Unidade',
  LIMIAR: 'Tudo ou Nada',
  SUBJETIVA: 'Nota Subjetiva',
};

/**
 * Resumo das regras para exibir na listagem/detalhe da prova.
 * `mostrarPontos: false` esconde os valores (ranking com notas ocultas).
 * Retorna null quando a prova não tem pontuação configurada.
 */
export const descreverPontuacao = (pontuacao, { mostrarPontos = true } = {}) => {
  if (!pontuacao || Object.keys(pontuacao).length === 0) return null;
  const unidade = pontuacao.nome_unidade || 'unidades';

  switch (tipoDaPontuacao(pontuacao)) {
    case 'PROPORCIONAL': {
      const base = mostrarPontos
        ? `${pontuacao.pontos_por_unidade} pts por ${unidade}`
        : `Pontos por ${unidade}`;
      const teto = descreverTetoPorUnidade(pontuacao, { mostrarPontos });
      return teto ? `${base}, ${teto}` : base;
    }
    case 'SUBJETIVA':
      return mostrarPontos
        ? `Nota do avaliador, de 0 a ${pontuacao.pontuacao_maxima} pts`
        : 'Nota do avaliador';
    case 'LIMIAR':
      return mostrarPontos
        ? `${pontuacao.pontuacao_fixa || 0} pts ao atingir ${pontuacao.quantidade_minima} ${unidade}`
        : `Mínimo de ${pontuacao.quantidade_minima} ${unidade}`;
    default: {
      const posicoes = ['1', '2', '3']
        .filter((posicao) => pontuacao[posicao])
        .map((posicao) => (mostrarPontos ? `${posicao}º: ${pontuacao[posicao]} pts` : `${posicao}º lugar`));
      return posicoes.length > 0 ? posicoes.join(' | ') : 'Pontuação configurada';
    }
  }
};

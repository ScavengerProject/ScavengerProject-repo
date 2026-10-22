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
  if (tem(regras, 'pontos_por_unidade')) return 'PROPORCIONAL';
  if (tem(regras, 'quantidade_minima')) return 'LIMIAR';
  return 'RANKING';
};

export const NOME_TIPO_PONTUACAO = {
  RANKING: 'Por Posição',
  PROPORCIONAL: 'Por Unidade',
  LIMIAR: 'Tudo ou Nada',
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
    case 'PROPORCIONAL':
      return mostrarPontos
        ? `${pontuacao.pontos_por_unidade} pts por ${unidade}`
        : `Pontos por ${unidade}`;
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

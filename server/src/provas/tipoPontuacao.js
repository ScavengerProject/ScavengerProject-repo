/**
 * Tipo de pontuação de uma prova, inferido pelas chaves de `prova.pontuacao`.
 *
 * O tipo não é gravado, e RANKING ({ 1: 300, 2: 200, ... }) é o que sobra. Por
 * isso a detecção mora num lugar só: uma cópia que esquecesse um tipo novo o
 * trataria como RANKING, e as posições inexistentes valeriam 0 pontos sem erro
 * nenhum. Espelhado no front em client/src/lib/pontuacaoProva.js.
 */
const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj, chave);

export const tipoDaPontuacao = (pontuacao) => {
  const regras = pontuacao || {};
  if (tem(regras, 'pontos_por_unidade')) return 'PROPORCIONAL';
  if (tem(regras, 'quantidade_minima')) return 'LIMIAR';
  return 'RANKING';
};

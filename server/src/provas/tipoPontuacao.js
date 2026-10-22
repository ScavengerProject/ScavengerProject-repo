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

/**
 * Pontuação base de uma prova por unidade (PROPORCIONAL), com o teto aplicado.
 *
 * O teto é `teto_unidades`: quantas unidades contam, a mesma medida do teto das
 * categorias de bônus (ter um em pontos e o outro em unidades confundia quem
 * cria a prova). `limite_pontuacao_porcoes` é o teto antigo, em PONTOS: só vale
 * para prova que ainda não foi convertida por `npm run migrar:teto-unidades`
 * nem editada depois disso.
 *
 * @returns {{ pontos: number, tetoAtingido: boolean }}
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

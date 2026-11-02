import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';

/**
 * Atribui a posição de cada equipe numa lista JÁ ORDENADA por pontos
 * (decrescente), no padrão "1, 1, 3": equipes com a mesma pontuação dividem a
 * posição, e a seguinte pula tantas quantas empataram.
 *
 * @param {Array<{pontos: number}>} ordenadas
 * @returns {Array<{posicao: number}>} cópias dos itens com `posicao`
 */
export function atribuirPosicoes(ordenadas) {
    let posicaoAtual = 1;
    return ordenadas.map((item, index) => {
        if (index > 0 && item.pontos !== ordenadas[index - 1].pontos) {
            posicaoAtual = index + 1;
        }
        return { ...item, posicao: posicaoAtual };
    });
}

/**
 * Classificação geral das equipes de uma gincana, calculada na hora a partir
 * de EquipeGincana.pontos_acumulados.
 *
 * Participações cuja equipe mestre foi excluída ficam de fora ANTES de numerar
 * as posições — senão uma equipe apagada "ocuparia" um lugar no ranking.
 *
 * @param {string} gincanaId
 * @returns {Promise<Array<{posicao: number, equipe_id: *, nome: string, cor: string, pontos: number}>>}
 */
export async function calcularRanking(gincanaId) {
    const participacoes = await EquipeGincana.find({ gincana_id: gincanaId })
        // equipe_id desempata a ORDEM de exibição (não a posição), para que
        // equipes empatadas não troquem de lugar a cada chamada.
        .sort({ pontos_acumulados: -1, equipe_id: 1 })
        .select('equipe_id pontos_acumulados');

    const equipes = await Equipe.find({ _id: { $in: participacoes.map((p) => p.equipe_id) } })
        .select('nome cor');
    const equipePorId = new Map(equipes.map((e) => [e._id.toString(), e]));

    const ordenadas = participacoes
        .filter((p) => equipePorId.has(p.equipe_id.toString()))
        .map((p) => {
            const equipe = equipePorId.get(p.equipe_id.toString());
            return {
                equipe_id: p.equipe_id,
                nome: equipe.nome,
                cor: equipe.cor,
                pontos: p.pontos_acumulados,
            };
        });

    return atribuirPosicoes(ordenadas);
}

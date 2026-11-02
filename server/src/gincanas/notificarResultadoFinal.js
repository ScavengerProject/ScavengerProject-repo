import Gincana from '../models/Gincana.js';
import Escola from '../models/Escola.js';
import EquipeGincana from '../models/EquipeGincana.js';
import ConfiguracaoGincana from '../models/ConfiguracaoGincana.js';
import { getCoordenadoresIdsDaEquipe } from '../equipes/coordenadorEquipe.js';
import { criarNotificacao } from '../notificacoes/notificacaoController.js';
import { enviarEmailResultadoFinal } from '../utils/emailService.js';
import { resultadoFinalDisponivel } from './gincanaHelpers.js';
import { mensagemDoPodio } from './mensagensPodio.js';

export const TIPO_RESULTADO_FINAL = 'RESULTADO_FINAL';

const maiorPosicao = (classificacao) => Math.max(...classificacao.map((c) => c.posicao));

/**
 * Coordenadores (ids) de cada equipe da classificação, nesta gincana. Mesma
 * regra para a prévia do encerramento e para o disparo: o número que o ADMIN
 * vê antes de confirmar é o número de emails que sai.
 *
 * @param {string} gincanaId
 * @param {Array<{equipe_id}>} classificacao
 * @returns {Promise<Map<string, string[]>>} equipe_id -> ids dos coordenadores
 */
export async function coordenadoresPorEquipe(gincanaId, classificacao) {
    const participacoes = await EquipeGincana.find({
        gincana_id: gincanaId,
        equipe_id: { $in: classificacao.map((c) => c.equipe_id) },
    });
    const mapa = new Map();
    for (const participacao of participacoes) {
        // eslint-disable-next-line no-await-in-loop
        mapa.set(String(participacao.equipe_id), await getCoordenadoresIdsDaEquipe(participacao));
    }
    return mapa;
}

/**
 * Cria uma notificação RESULTADO_FINAL para cada coordenador de cada equipe
 * classificada — o que enfileira um email por coordenador (criarNotificacao).
 * Chamado uma vez, por encerrarGincana, logo depois de congelar o resultado.
 *
 * A notificação existe pelo email: é nela que o worker marca `email_enviado`,
 * e um retry não reenvia. Ela NÃO aparece no sino — a listagem filtra pela
 * gincana ativa, e uma gincana encerrada nunca volta a ser a ativa.
 *
 * Best-effort por coordenador: uma falha não impede os outros de receberem.
 *
 * @param {Object} gincana documento com `resultado_final` preenchido
 * @returns {Promise<number>} quantas notificações foram criadas
 */
export async function notificarResultadoFinal(gincana) {
    const { classificacao } = gincana.resultado_final;
    const ultimaPosicao = maiorPosicao(classificacao);

    const coordenadoresDe = await coordenadoresPorEquipe(gincana._id, classificacao);

    let criadas = 0;
    for (const item of classificacao) {
        const coordenadores = coordenadoresDe.get(String(item.equipe_id)) || [];
        const mensagem = mensagemDoPodio({ posicao: item.posicao, ultimaPosicao, semente: item.equipe_id });
        const titulo = item.posicao === 1
            ? `${mensagem.emoji} ${item.nome} é a equipe campeã!`
            : `${mensagem.emoji} ${item.nome} ficou em ${item.posicao}º lugar`;
        const texto = `A equipe ${item.nome} terminou a gincana "${gincana.nome}" em ${item.posicao}º lugar. ${mensagem.frase}`;

        for (const coordenadorId of coordenadores) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await criarNotificacao(
                    coordenadorId,
                    TIPO_RESULTADO_FINAL,
                    titulo,
                    texto,
                    null,
                    item.equipe_id,
                    gincana._id,
                );
                criadas += 1;
            } catch (error) {
                console.error(`Erro ao notificar o resultado final ao coordenador ${coordenadorId}:`, error);
            }
        }
    }
    return criadas;
}

/**
 * Monta e envia o email de uma notificação RESULTADO_FINAL (chamado pelo
 * worker). Os dados vêm do `resultado_final` congelado no momento do ENVIO, e
 * não do momento da notificação: assim o email nunca diverge da cerimônia.
 *
 * Não envia (sem lançar erro, para o job não ser repetido) quando o resultado
 * não vale mais: a gincana foi reaberta, ou reaberta e encerrada de novo
 * depois desta notificação — o novo encerramento já criou as notificações
 * certas, e esta mandaria o resultado novo em duplicata.
 *
 * @param {{_id, nome: string, email: string}} usuario
 * @param {{gincana_id: string, referencia_id, criado_em: Date}} notificacao
 * @returns {Promise<{sucesso: boolean, erro?: string}>}
 */
export async function enviarEmailDoResultadoFinal(usuario, notificacao) {
    const gincana = await Gincana.findById(notificacao.gincana_id)
        .select('nome ano status escola_id resultado_final');
    if (!resultadoFinalDisponivel(gincana)) {
        return { sucesso: false, erro: 'Resultado final indisponível (gincana reaberta?).' };
    }
    if (new Date(notificacao.criado_em) < new Date(gincana.resultado_final.encerrada_em)) {
        return { sucesso: false, erro: 'Notificação de um encerramento anterior.' };
    }

    const { classificacao } = gincana.resultado_final;
    const item = classificacao.find((c) => String(c.equipe_id) === String(notificacao.referencia_id));
    if (!item) {
        return { sucesso: false, erro: 'Equipe fora da classificação final.' };
    }

    const [config, escola] = await Promise.all([
        ConfiguracaoGincana.findOne({ gincana_id: gincana._id }),
        Escola.findById(gincana.escola_id).select('nome'),
    ]);

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';

    return enviarEmailResultadoFinal(usuario.email, {
        nomeDestinatario: usuario.nome,
        nomeEquipe: item.nome,
        corEquipe: item.cor,
        posicao: item.posicao,
        totalEquipes: classificacao.length,
        // Mesma regra do ranking e da cerimônia: sem mostrar_notas_ranking, o
        // coordenador vê a posição, não os pontos.
        pontos: config?.mostrar_notas_ranking ? item.pontos : null,
        empatadaCom: classificacao
            .filter((c) => c.posicao === item.posicao && String(c.equipe_id) !== String(item.equipe_id))
            .map((c) => c.nome),
        podio: classificacao
            .filter((c) => c.posicao <= 3)
            .map((c) => ({ posicao: c.posicao, nome: c.nome })),
        gincanaNome: gincana.nome,
        gincanaAno: gincana.ano,
        escolaNome: escola?.nome || null,
        mensagem: mensagemDoPodio({
            posicao: item.posicao,
            ultimaPosicao: maiorPosicao(classificacao),
            semente: item.equipe_id,
        }),
        linkCerimonia: `${frontend}/cerimonia/${gincana._id}`,
    });
}

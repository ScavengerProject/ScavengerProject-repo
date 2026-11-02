// Textos do email de resultado final (ver notificarResultadoFinal.js), por
// faixa de classificação. Este é o arquivo a editar para mudar o tom das
// mensagens — o template do email só encaixa o que sai daqui.
//
// O tom é sempre de reconhecimento: é um email para o coordenador de uma
// equipe escolar, e quem ficou em último também participou da gincana inteira.
//
// Cores: `cor` é o fundo do cabeçalho e a borda; `corTexto`, o texto sobre esse
// fundo; `corNoBranco`, o "Nº lugar" grande sobre o branco. São separadas
// porque o dourado vivo não tem contraste com branco nos dois sentidos.

const FAIXAS = {
    CAMPEA: {
        emoji: '🏆',
        cor: '#F5C542',
        corTexto: '#1F2937',
        corNoBranco: '#A16207',
        titulo: 'Vocês são campeões!',
        frases: [
            'Vocês fizeram história nesta edição! Cada prova vencida, cada ponto disputado e cada grito de torcida levaram a equipe ao topo.',
            'O topo do pódio é de vocês! Parabéns pela dedicação, pela garra e pelo espírito de equipe do início ao fim.',
            'O trabalho em equipe de vocês foi o grande destaque desta gincana. Aproveitem cada segundo dessa conquista!',
        ],
    },
    SEGUNDA: {
        emoji: '🥈',
        cor: '#64748B',
        corTexto: '#FFFFFF',
        corNoBranco: '#475569',
        titulo: 'Segundo lugar!',
        frases: [
            'Que campanha! Vocês disputaram o título até o fim e mostraram que são uma das grandes forças desta gincana.',
            'Segundo lugar com muito orgulho! Faltou pouco — e a próxima edição promete.',
        ],
    },
    TERCEIRA: {
        emoji: '🥉',
        cor: '#9A5B2A',
        corTexto: '#FFFFFF',
        corNoBranco: '#9A5B2A',
        titulo: 'Lugar no pódio!',
        frases: [
            'Pódio garantido! Vocês fizeram uma gincana de respeito e merecem comemorar.',
            'Medalha de bronze com brilho de ouro: parabéns pela garra em cada prova.',
        ],
    },
    PARTICIPANTE: {
        emoji: '🎉',
        cor: '#6D28D9',
        corTexto: '#FFFFFF',
        corNoBranco: '#6D28D9',
        titulo: 'Obrigado por fazer parte!',
        frases: [
            'Cada prova disputada fortaleceu a equipe. Parabéns pelo empenho e pela participação nesta edição!',
            'A gincana só foi incrível porque equipes como a de vocês entraram para valer. Obrigado por cada ponto disputado!',
        ],
    },
    ULTIMA: {
        emoji: '💪',
        cor: '#2563EB',
        corTexto: '#FFFFFF',
        corNoBranco: '#1D4ED8',
        titulo: 'A próxima é de vocês!',
        frases: [
            'Toda grande virada começa em algum lugar. Obrigado por participarem com tanta energia — a próxima gincana é de vocês!',
            'O mais importante vocês já conquistaram: participar, se divertir e crescer juntos. Contamos com vocês na próxima edição!',
        ],
    },
};

/**
 * Em que faixa a equipe está. A "última" só existe abaixo do pódio: numa
 * gincana de 3 equipes, quem ficou em 3º recebe a mensagem de pódio.
 *
 * @param {number} posicao
 * @param {number} ultimaPosicao maior posição da classificação
 */
export function faixaDaPosicao(posicao, ultimaPosicao) {
    if (posicao === 1) return 'CAMPEA';
    if (posicao === 2) return 'SEGUNDA';
    if (posicao === 3) return 'TERCEIRA';
    if (posicao === ultimaPosicao) return 'ULTIMA';
    return 'PARTICIPANTE';
}

// Escolha determinística (e não aleatória) da frase: um retry do job manda o
// mesmo texto, e equipes diferentes da mesma faixa tendem a receber frases
// diferentes.
function indiceEstavel(semente, tamanho) {
    let hash = 0;
    for (const caractere of String(semente)) {
        hash = (hash * 31 + caractere.charCodeAt(0)) >>> 0;
    }
    return hash % tamanho;
}

/**
 * @param {{posicao: number, ultimaPosicao: number, semente: string}} dados
 *        semente: algo estável da equipe (o equipe_id)
 * @returns {{faixa: string, emoji: string, cor: string, corTexto: string, corNoBranco: string, titulo: string, frase: string}}
 */
export function mensagemDoPodio({ posicao, ultimaPosicao, semente }) {
    const faixa = faixaDaPosicao(posicao, ultimaPosicao);
    const { frases, ...resto } = FAIXAS[faixa];
    return { faixa, ...resto, frase: frases[indiceEstavel(semente, frases.length)] };
}

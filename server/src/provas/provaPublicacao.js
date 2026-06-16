import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';
import { criarNotificacao } from '../notificacoes/notificacaoController.js';
import { enviarEmailNovaProva } from '../utils/emailService.js';
import { emailQueue } from '../notificacoes/emailQueue.js';

/**
 * Indica se a prova já está publicada (visível para os participantes).
 * Sem data de publicação a prova é considerada publicada de imediato.
 */
export const estaPublicada = (prova) => {
  if (!prova?.data_publicacao) return true;
  return new Date(prova.data_publicacao) <= new Date();
};

/**
 * Dispara as notificações e e-mails de "nova prova" para ALUNOS e
 * COORDENADORES ativos. Falhas individuais são registradas mas não
 * interrompem o restante dos envios.
 */
export const dispatchNotificacoesNovaProva = async (prova) => {
  const participantes = await Usuario.find({
    tipo: { $in: ['ALUNO', 'COORDENADOR'] },
    status: 'ATIVO',
  }).select('_id nome email tipo');

  const promessas = participantes.map(async (participante) => {
    try {
      const titulo = `Nova Prova: ${prova.titulo}`;
      const mensagem = `Uma nova prova "${prova.titulo}" foi criada e está disponível para você.`;

      const notificacao = await criarNotificacao(
        participante._id,
        'NOVA_PROVA',
        titulo,
        mensagem,
        prova._id
      );

      const resultadoEmail = await enviarEmailNovaProva(
        participante.email,
        participante.nome,
        prova
      );

      if (resultadoEmail.sucesso && notificacao) {
        await Notificacao.findByIdAndUpdate(notificacao._id, {
          email_enviado: true,
          email_enviado_em: new Date(),
        });
      } else if (!resultadoEmail.sucesso) {
        console.error(
          `[email] Falha ao enviar email da nova prova para ${participante.email}:`,
          resultadoEmail.erro
        );
      }
    } catch (err) {
      console.error(`Erro ao notificar usuário ${participante._id}:`, err);
    }
  });

  await Promise.all(promessas);
};

/**
 * Decide, a partir da data de publicação da prova, se as notificações devem
 * ser disparadas agora ou agendadas para o futuro:
 * - Sem data ou data já passada -> dispara imediatamente (uma única vez).
 * - Data futura                 -> agenda um job atrasado na emailQueue.
 *
 * A flag `notificacao_publicacao_enviada` garante que o disparo aconteça uma
 * só vez, mesmo que a data seja editada e mais de um job seja agendado.
 */
export const agendarOuDispararPublicacao = async (prova) => {
  if (prova.notificacao_publicacao_enviada) return;

  const agora = new Date();
  const publicacao = prova.data_publicacao ? new Date(prova.data_publicacao) : null;

  if (!publicacao || publicacao <= agora) {
    // Publicada agora: marca a flag e dispara em segundo plano (sem atrasar a
    // resposta da API; falhas de e-mail não devem quebrar o fluxo).
    prova.notificacao_publicacao_enviada = true;
    await prova.save();
    dispatchNotificacoesNovaProva(prova).catch((err) =>
      console.error('Erro ao disparar notificações de publicação:', err)
    );
    return;
  }

  // Publicação futura: agenda um job atrasado para o horário de publicação.
  const delay = publicacao.getTime() - agora.getTime();
  await emailQueue.add(
    'publicarProva',
    { tipo: 'PUBLICAR_PROVA', provaId: prova._id.toString() },
    {
      delay,
      jobId: `publicar-prova-${prova._id}-${publicacao.getTime()}`,
      removeOnComplete: true,
    }
  );
};

import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';

import Usuario from '../models/Usuario.js';
import Prova from '../models/Prova.js';
import Notificacao from '../models/Notificacao.js';
import { enviarEmailNovaProva, enviarEmail } from '../utils/emailService.js';

/**
 * Worker para processar envio de emails de notificações
 * Escuta a fila 'emailQueue' e envia emails conforme o tipo de notificação
 */

console.log('📨 Worker de email iniciado...');

const worker = new Worker(
  'emailQueue',
  async job => {
    const { notificacaoId, tipo, usuarioId, provaId, titulo, mensagem } = job.data;

    try {
      const usuario = await Usuario.findById(usuarioId);
      if (!usuario?.email) return;

      const notificacao = await Notificacao.findById(notificacaoId);
      if (!notificacao || notificacao.email_enviado) return;

      let resultado = { sucesso: false };

      switch (tipo) {
        case 'NOVA_PROVA': {
          const prova = await Prova.findById(provaId);
          if (prova) {
            resultado = await enviarEmailNovaProva(
              usuario.email,
              usuario.nome,
              prova
            );
          }
          break;
        }

        case 'RESULTADO': {
          resultado = await enviarEmail(
            usuario.email,
            titulo,
            `<p>Olá ${usuario.nome},</p><p>${mensagem}</p>`
          );
          break;
        }

        case 'COMUNICADO': {
          resultado = await enviarEmail(
            usuario.email,
            titulo,
            `<p>Olá ${usuario.nome},</p><p>${mensagem}</p>`
          );
          break;
        }

        case 'PENALIDADE': {
          resultado = await enviarEmail(
            usuario.email,
            titulo,
            `<p>Olá ${usuario.nome},</p>
             <p><strong>Você recebeu uma penalidade:</strong></p>
             <p>${mensagem}</p>`
          );
          break;
        }
      }

      if (resultado.sucesso) {
        notificacao.email_enviado = true;
        await notificacao.save();
      }

    } catch (error) {
      console.error('Erro no worker de email:', error);
      throw error; 
    }
  },
  redisConfig
);

worker.on('completed', job => {
  console.log(`Email enviado com sucesso. Job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Erro no job ${job.id}:`, err.message);
});
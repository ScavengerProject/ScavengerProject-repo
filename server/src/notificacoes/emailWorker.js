import { Worker } from 'bullmq';
import { fileURLToPath } from 'url';
import { redisConfig } from '../config/redis.js';
import connectDB from '../config/db.js';

import Usuario from '../models/Usuario.js';
import Prova from '../models/Prova.js';
import Notificacao from '../models/Notificacao.js';
import { enviarEmailNovaProva, enviarEmail } from '../utils/emailService.js';
import { dispatchNotificacoesNovaProva } from '../provas/provaPublicacao.js';

/**
 * Cria e inicia o Worker que consome a fila 'emailQueue' e envia os emails
 * conforme o tipo de notificação.
 *
 * Pode ser usado de duas formas:
 * - PROCESSO SEPARADO (`npm run worker`): o bloco "executado diretamente" no
 *   fim do arquivo conecta no Mongo e chama esta função.
 * - NO MESMO PROCESSO do Web Service: o index.js chama esta função após o
 *   connectDB(). Necessário no plano free do Render, que não tem Background
 *   Worker — assim o worker fica vivo enquanto o Web Service estiver acordado.
 *
 * Em ambos os casos é preciso ter uma conexão ativa com o MongoDB; sem ela,
 * os .findById() ficam em buffer e estouram o timeout do mongoose.
 */
export const iniciarEmailWorker = () => {
  const worker = new Worker(
    'emailQueue',
    async job => {
      const { notificacaoId, tipo, usuarioId, provaId, titulo, mensagem } = job.data;

      try {
        // #18: job agendado de publicação de prova. Dispara as notificações de
        // "nova prova" no horário de publicação, garantindo envio único.
        if (tipo === 'PUBLICAR_PROVA') {
          const prova = await Prova.findById(provaId);
          if (!prova || prova.notificacao_publicacao_enviada) return;

          // Se a publicação foi adiada, ignora; outro job cuidará no novo horário.
          if (prova.data_publicacao && new Date(prova.data_publicacao) > new Date()) return;

          await dispatchNotificacoesNovaProva(prova);
          prova.notificacao_publicacao_enviada = true;
          await prova.save();
          return;
        }

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

          case 'MIGRACAO': {
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

  console.log('📨 Worker de email iniciado...');
  return worker;
};

// Execução standalone (`npm run worker`): processo dedicado, conecta ao Mongo e
// inicia o worker. Quando o arquivo é apenas IMPORTADO (modo in-process), este
// bloco NÃO roda — o index.js cuida da conexão e do start.
const executadoDiretamente = process.argv[1] === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  await connectDB();
  iniciarEmailWorker();
}

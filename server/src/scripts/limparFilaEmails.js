import dotenv from 'dotenv';
import { emailQueue } from '../notificacoes/emailQueue.js';

dotenv.config();

/**
 * Limpa a fila de e-mails (BullMQ).
 *
 * ⚠️ Atenção: a fila vive no Redis apontado por REDIS_URL — se você estiver
 * usando o Redis do Render, este script limpa a MESMA fila de produção.
 *
 * Uso:
 *   node src/scripts/limparFilaEmails.js          -> remove só pendentes (wait + delayed)
 *   node src/scripts/limparFilaEmails.js --tudo   -> apaga TUDO (obliterate): pendentes,
 *                                                    concluídos, falhos e agendados
 */
const limparFila = async () => {
  const apagarTudo = process.argv.includes('--tudo');

  try {
    if (apagarTudo) {
      // Remove a fila inteira e todos os jobs de qualquer estado.
      // Inclui jobs AGENDADOS (ex.: publicação futura de prova) — use com cuidado.
      await emailQueue.obliterate({ force: true });
      console.log('🧹 Fila "emailQueue" apagada por completo (obliterate).');
    } else {
      // drain remove os jobs que ainda não rodaram: em espera (wait) e atrasados (delayed).
      await emailQueue.drain(true);
      console.log('🧹 Jobs pendentes (wait + delayed) removidos da fila "emailQueue".');
      console.log('   Para apagar também concluídos/falhos/agendados, rode com --tudo.');
    }
  } catch (err) {
    console.error('Erro ao limpar a fila:', err.message);
    process.exitCode = 1;
  } finally {
    await emailQueue.close();
    process.exit();
  }
};

limparFila();

import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';

// `enableOfflineQueue: false` faz com que `emailQueue.add()` FALHE RÁPIDO quando
// o Redis está indisponível/mal configurado, em vez de deixar o comando
// pendurado indefinidamente (comportamento padrão do ioredis com
// `maxRetriesPerRequest: null`). Sem isso, o `await emailQueue.add(...)` dentro
// de criarNotificacao travava o request e impedia o envio inline do email.
export const emailQueue = new Queue('emailQueue', {
  ...redisConfig,
  connection: {
    ...redisConfig.connection,
    enableOfflineQueue: false,
  },
});
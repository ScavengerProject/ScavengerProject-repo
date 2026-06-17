/**
 * Configuração de conexão com o Redis usada pela BullMQ (fila + worker de email).
 *
 * Prioriza a variável REDIS_URL (string completa de conexão, ex.: a fornecida
 * pelo Render). Caso não exista, faz fallback para REDIS_HOST/REDIS_PORT e, por
 * fim, para o Redis local (127.0.0.1:6379) usado em desenvolvimento.
 *
 * Observações importantes:
 * - `maxRetriesPerRequest: null` é exigido/recomendado pela BullMQ. Sem isso,
 *   comandos (como `queue.add`) podem lançar erro quando o Redis está lento ou
 *   indisponível, derrubando o fluxo de criação de notificações.
 * - Quando a URL usa o protocolo `rediss://` (TLS), habilitamos `tls`.
 */
const construirConexao = () => {
  const url = process.env.REDIS_URL;

  if (url) {
    const parsed = new URL(url);
    const usaTls = parsed.protocol === 'rediss:';

    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      // username/password só são incluídos se existirem na URL
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      ...(usaTls ? { tls: {} } : {}),
      maxRetriesPerRequest: null
    };
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null
  };
};

// Isola as filas por ambiente para que o desenvolvimento local NÃO compartilhe
// jobs com a produção (comum quando ambos apontam para o mesmo Redis do Render).
// Em produção o prefixo é "bull:prod"; em qualquer outro ambiente, "bull:dev".
// Queue e Worker precisam usar o MESMO prefixo para enxergarem os mesmos jobs.
const prefix = process.env.NODE_ENV === 'production' ? 'bull:prod' : 'bull:dev';

export const redisConfig = {
  connection: construirConexao(),
  prefix
};

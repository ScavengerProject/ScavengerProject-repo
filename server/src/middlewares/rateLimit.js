import rateLimit from 'express-rate-limit';

/**
 * Limitador por IP para rotas públicas sensíveis a força bruta (prevalidação
 * de convite, auto-cadastro, resgate de convite): sem isso, `GET
 * /convites/:codigo` vira um oráculo para adivinhar códigos válidos por
 * tentativa e erro.
 *
 * Desabilitado em teste de propósito: express-rate-limit mantém contagem em
 * memória entre requisições do MESMO processo, e a suíte roda dezenas de
 * requisições sequenciais no mesmo "IP" (supertest) — sem o bypass, os testes
 * começariam a tomar 429 uns dos outros.
 *
 * @param {{ janelaMs: number, max: number, mensagem: string }} opcoes
 */
export const limitadorPorIp = ({ janelaMs, max, mensagem }) => {
  if (process.env.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: janelaMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: mensagem },
  });
};

// Configurações globais aplicadas a TODAS as suítes de teste (roda depois do
// framework de testes estar disponível). O objetivo é deixar os testes
// hermeticos para rodarem em CI, sem dependências externas (Redis, .env).

// 1) Garante um segredo de JWT mesmo sem o arquivo .env (que não existe no CI).
//    Vários controllers assinam tokens com process.env.JWT_SECRET.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-ci';

// 2) Evita conexão real com o Redis. A BullMQ (src/notificacoes/emailQueue.js)
//    abre uma conexão TCP já na importação do módulo. Em teste/CI não há Redis,
//    então substituímos a lib por stubs que não tocam a rede. Isso elimina os
//    erros "ECONNREFUSED 127.0.0.1:6379" e o handle aberto que impedia o Jest
//    de encerrar de forma limpa.
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// 3) Rede de segurança contra email de verdade. Localmente o setupTests.js
//    carrega o server/.env, e com o SMTP configurado qualquer teste que chegue
//    ao enviarEmail sem mock mandava uma mensagem real (já aconteceu com os de
//    feedback). Aqui o transporte nunca toca a rede; quem quer verificar o que
//    seria enviado deve mockar as funções de emailService.js, como os testes
//    de feedback e de resultado final.
jest.mock('nodemailer', () => {
  const createTransport = jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
  }));
  return { __esModule: true, default: { createTransport }, createTransport };
});

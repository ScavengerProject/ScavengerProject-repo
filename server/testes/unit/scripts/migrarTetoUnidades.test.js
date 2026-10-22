import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { planejarConversao, migrar, verificar } from '../../../src/scripts/migrarTetoUnidades.js';

// Banco em memória (nunca o Dev/Prod reais): a conversão do teto em pontos para
// teto em unidades, de ponta a ponta e idempotente.
let mongoServer;
let colecao;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  colecao = mongoose.connection.collection('Provas');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await colecao.deleteMany({});
});

const prova = (pontuacao, titulo = 'Prova') => ({
  titulo,
  descricao: 'd',
  pontuacao,
  data_inicio: new Date(),
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
});

describe('planejarConversao', () => {
  it('converte quando o teto em pontos é múltiplo dos pontos por unidade', () => {
    expect(planejarConversao({ pontos_por_unidade: 50, limite_pontuacao_porcoes: 500 }))
      .toEqual({ acao: 'converter', teto_unidades: 10 });
  });

  it('deixa pendente quando a divisão não é exata (mudaria a pontuação)', () => {
    expect(planejarConversao({ pontos_por_unidade: 30, limite_pontuacao_porcoes: 500 }).acao).toBe('pendente');
  });

  it('só remove um teto zerado ou já substituído pelo teto em unidades', () => {
    expect(planejarConversao({ pontos_por_unidade: 30, limite_pontuacao_porcoes: 0 })).toEqual({ acao: 'remover' });
    expect(planejarConversao({ pontos_por_unidade: 30, limite_pontuacao_porcoes: 500, teto_unidades: 4 }))
      .toEqual({ acao: 'remover' });
  });
});

describe('migrar', () => {
  it('converte as exatas, preserva as pendentes e não toca nas demais', async () => {
    await colecao.insertMany([
      prova({ pontos_por_unidade: 50, nome_unidade: 'doações', limite_pontuacao_porcoes: 500 }, 'Exata'),
      prova({ pontos_por_unidade: 30, nome_unidade: 'doações', limite_pontuacao_porcoes: 500 }, 'Quebrada'),
      prova({ pontos_por_unidade: 30, nome_unidade: 'doações' }, 'Sem teto'),
      prova({ 1: 300, 2: 200 }, 'Ranking'),
    ]);

    const { convertidas, pendentes } = await migrar(colecao);

    expect(convertidas).toBe(1);
    expect(pendentes.map((p) => p.titulo)).toEqual(['Quebrada']);

    const exata = await colecao.findOne({ titulo: 'Exata' });
    expect(exata.pontuacao).toEqual({ pontos_por_unidade: 50, nome_unidade: 'doações', teto_unidades: 10 });

    const quebrada = await colecao.findOne({ titulo: 'Quebrada' });
    expect(quebrada.pontuacao.limite_pontuacao_porcoes).toBe(500);
    expect(quebrada.pontuacao.teto_unidades).toBeUndefined();

    expect((await colecao.findOne({ titulo: 'Sem teto' })).pontuacao).toEqual({ pontos_por_unidade: 30, nome_unidade: 'doações' });
    expect((await colecao.findOne({ titulo: 'Ranking' })).pontuacao).toEqual({ 1: 300, 2: 200 });
  });

  it('é idempotente', async () => {
    await colecao.insertOne(prova({ pontos_por_unidade: 50, limite_pontuacao_porcoes: 500 }));

    await migrar(colecao);
    const segunda = await migrar(colecao);

    expect(segunda.convertidas).toBe(0);
    expect((await colecao.findOne({})).pontuacao.teto_unidades).toBe(10);
  });
});

describe('verificar', () => {
  it('aceita provas pendentes (ainda pontuadas pelo teto antigo)', async () => {
    await colecao.insertOne(prova({ pontos_por_unidade: 30, limite_pontuacao_porcoes: 500 }));
    expect(await verificar(colecao)).toBe(true);
  });

  it('acusa teto_unidades que não é número', async () => {
    await colecao.insertOne(prova({ pontos_por_unidade: 30, teto_unidades: '10' }));
    expect(await verificar(colecao)).toBe(false);
  });
});

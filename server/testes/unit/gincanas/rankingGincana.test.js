import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import { atribuirPosicoes, calcularRanking } from '../../../src/gincanas/rankingGincana.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([Equipe.deleteMany({}), EquipeGincana.deleteMany({})]);
});

const criarParticipacao = async (nome, pontos, gincanaId = 'G1') => {
  const equipe = await Equipe.create({ nome, cor: '#123456', gincana_id: gincanaId });
  await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaId, pontos_acumulados: pontos });
  return equipe;
};

describe('atribuirPosicoes', () => {
  it('numera em sequência quando não há empate', () => {
    const r = atribuirPosicoes([{ pontos: 30 }, { pontos: 20 }, { pontos: 10 }]);
    expect(r.map((i) => i.posicao)).toEqual([1, 2, 3]);
  });

  it('empatadas dividem a posição e a seguinte pula (1, 1, 3)', () => {
    const r = atribuirPosicoes([{ pontos: 30 }, { pontos: 30 }, { pontos: 10 }, { pontos: 10 }, { pontos: 5 }]);
    expect(r.map((i) => i.posicao)).toEqual([1, 1, 3, 3, 5]);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(atribuirPosicoes([])).toEqual([]);
  });
});

describe('calcularRanking', () => {
  it('ordena por pontos e traz nome, cor e pontos', async () => {
    await criarParticipacao('Azul', 10);
    await criarParticipacao('Vermelha', 50);
    await criarParticipacao('Verde', 30);

    const ranking = await calcularRanking('G1');

    expect(ranking.map((r) => [r.posicao, r.nome, r.pontos])).toEqual([
      [1, 'Vermelha', 50],
      [2, 'Verde', 30],
      [3, 'Azul', 10],
    ]);
    expect(ranking[0].cor).toBe('#123456');
  });

  it('só considera a gincana pedida', async () => {
    await criarParticipacao('Daqui', 10, 'G1');
    await criarParticipacao('De Lá', 99, 'G2');

    const ranking = await calcularRanking('G1');

    expect(ranking.map((r) => r.nome)).toEqual(['Daqui']);
  });

  it('equipe mestre excluída não ocupa posição', async () => {
    const apagada = await criarParticipacao('Apagada', 100);
    await criarParticipacao('Primeira', 50);
    await criarParticipacao('Segunda', 20);
    await Equipe.deleteOne({ _id: apagada._id });

    const ranking = await calcularRanking('G1');

    expect(ranking.map((r) => [r.posicao, r.nome])).toEqual([[1, 'Primeira'], [2, 'Segunda']]);
  });
});

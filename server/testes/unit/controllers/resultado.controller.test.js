import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import Resultado from '../../../src/models/Resultado.js';
import { lancarResultados, listarResultadosDaProva } from '../../../src/resultados/resultadoController.js';

// lancarResultados usa transações (startSession), que exigem um replica set.
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const avaliadorId = new mongoose.Types.ObjectId().toString();
const umDia = 24 * 60 * 60 * 1000;

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Promise.all([
    Prova.deleteMany({}),
    Equipe.deleteMany({}),
    EquipeGincana.deleteMany({}),
    Resultado.deleteMany({}),
  ]);
});

// Cria uma prova já CONCLUIDA (término no passado) com regras de pontuação.
async function criarProvaConcluida(pontuacao, quesitos = []) {
  return Prova.create({
    titulo: 'Prova Resultado',
    descricao: 'd',
    formato: 'PROVA_PRATICA',
    data_inicio: new Date(Date.now() - 10 * umDia),
    data_fim: new Date(Date.now() - 2 * umDia),
    pontuacao,
    quesitos_de_avaliacao: quesitos,
    criado_por_usuario_id: avaliadorId,
  });
}

// Cria uma equipe + seu registro de gincana (onde os pontos acumulam).
async function criarEquipeComGincana(nome) {
  const equipe = await Equipe.create({ nome, cor: '#123456' });
  await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_PRINCIPAL', pontos_acumulados: 0 });
  return equipe;
}

describe('resultadoController - lancarResultados (validações)', () => {
  it('retorna 400 sem provaId', async () => {
    const res = mockRes();
    await lancarResultados({ query: {}, body: {}, usuario: { id: avaliadorId } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 com tipo/resultados ausentes', async () => {
    const res = mockRes();
    await lancarResultados({ query: { provaId: 'x' }, body: {}, usuario: { id: avaliadorId } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('falha (500) quando a prova ainda não está CONCLUIDA', async () => {
    const prova = await Prova.create({
      titulo: 'Aberta', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(Date.now() - umDia), // sem data_fim => EM_ANDAMENTO
      pontuacao: { '1': 100 }, criado_por_usuario_id: avaliadorId,
    });
    const equipe = await criarEquipeComGincana('Time A');

    const res = mockRes();
    await lancarResultados(
      { query: { provaId: prova._id.toString() }, body: { tipo: 'RANKING', resultados: [{ equipe_id: equipe._id.toString(), valor: '1' }] }, usuario: { id: avaliadorId } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('CONCLUIDA') }));
  });
});

describe('resultadoController - lancarResultados (cálculo de pontos)', () => {
  it('RANKING: aplica pontos da posição e acumula na equipe', async () => {
    const prova = await criarProvaConcluida({ '1': 100, '2': 50 });
    const equipe = await criarEquipeComGincana('Campeã');

    const res = mockRes();
    await lancarResultados(
      { query: { provaId: prova._id.toString() }, body: { tipo: 'RANKING', resultados: [{ equipe_id: equipe._id.toString(), valor: '1' }] }, usuario: { id: avaliadorId } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const resultado = await Resultado.findOne({ prova_id: prova._id, equipe_id: equipe._id });
    expect(resultado.pontuacao_obtida).toBe(100);
    const eg = await EquipeGincana.findOne({ equipe_id: equipe._id });
    expect(eg.pontos_acumulados).toBe(100);
  });

  it('PROPORCIONAL: multiplica quantidade por pontos_por_unidade', async () => {
    const prova = await criarProvaConcluida({ pontos_por_unidade: 2, nome_unidade: 'doações' });
    const equipe = await criarEquipeComGincana('Doadora');

    const res = mockRes();
    await lancarResultados(
      { query: { provaId: prova._id.toString() }, body: { tipo: 'PROPORCIONAL', resultados: [{ equipe_id: equipe._id.toString(), valor: '30' }] }, usuario: { id: avaliadorId } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const resultado = await Resultado.findOne({ prova_id: prova._id, equipe_id: equipe._id });
    expect(resultado.pontuacao_obtida).toBe(60); // 30 * 2
  });

  it('PROPORCIONAL: aplica o teto (limite_pontuacao_porcoes) e registra no detalhe', async () => {
    const prova = await criarProvaConcluida({ pontos_por_unidade: 2, nome_unidade: 'doações', limite_pontuacao_porcoes: 50 });
    const equipe = await criarEquipeComGincana('Tetada');

    const res = mockRes();
    await lancarResultados(
      { query: { provaId: prova._id.toString() }, body: { tipo: 'PROPORCIONAL', resultados: [{ equipe_id: equipe._id.toString(), valor: '40' }] }, usuario: { id: avaliadorId } },
      res
    );

    const resultado = await Resultado.findOne({ prova_id: prova._id, equipe_id: equipe._id });
    expect(resultado.pontuacao_obtida).toBe(50); // 40*2=80, mas teto=50
    expect(resultado.detalhes_pontuacao).toMatch(/teto atingido: 50/i);
  });

  it('relançar resultados reverte os pontos anteriores (sem dobrar)', async () => {
    const prova = await criarProvaConcluida({ '1': 100 });
    const equipe = await criarEquipeComGincana('Recalc');
    const body = { tipo: 'RANKING', resultados: [{ equipe_id: equipe._id.toString(), valor: '1' }] };

    await lancarResultados({ query: { provaId: prova._id.toString() }, body, usuario: { id: avaliadorId } }, mockRes());
    await lancarResultados({ query: { provaId: prova._id.toString() }, body, usuario: { id: avaliadorId } }, mockRes());

    const eg = await EquipeGincana.findOne({ equipe_id: equipe._id });
    expect(eg.pontos_acumulados).toBe(100); // não 200

    const totalResultados = await Resultado.countDocuments({ prova_id: prova._id, equipe_id: equipe._id });
    expect(totalResultados).toBe(1);
  });
});

describe('resultadoController - listarResultadosDaProva', () => {
  it('retorna 400 sem provaId', async () => {
    const res = mockRes();
    await listarResultadosDaProva({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('lista resultados ordenados com info da equipe', async () => {
    const prova = await criarProvaConcluida({ '1': 100, '2': 50 });
    const e1 = await criarEquipeComGincana('Primeiro');
    const e2 = await criarEquipeComGincana('Segundo');
    await lancarResultados(
      {
        query: { provaId: prova._id.toString() },
        body: { tipo: 'RANKING', resultados: [
          { equipe_id: e1._id.toString(), valor: '1' },
          { equipe_id: e2._id.toString(), valor: '2' },
        ] },
        usuario: { id: avaliadorId },
      },
      mockRes()
    );

    const res = mockRes();
    await listarResultadosDaProva({ query: { provaId: prova._id.toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(2);
    expect(lista[0].pontos_obtidos).toBe(100); // ordenado desc
    expect(lista[0].equipe_nome).toBe('Primeiro');
  });
});

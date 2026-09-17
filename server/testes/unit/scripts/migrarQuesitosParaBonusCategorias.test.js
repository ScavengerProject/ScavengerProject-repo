import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Prova from '../../../src/models/Prova.js';
import { gerarBonusCategorias, migrar, verificar } from '../../../src/scripts/migrarQuesitosParaBonusCategorias.js';

// Verifica, contra um banco em memória (nunca o Dev/Prod reais), que a
// migração de quesitos_de_avaliacao/configuracao_quesitos para
// bonus_categorias funciona de ponta a ponta e é idempotente.
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

const provaLegadaBase = {
  titulo: 'Prova Legada',
  descricao: 'd',
  pontuacao: { '1': 100 },
  data_inicio: new Date(),
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
};

describe('gerarBonusCategorias', () => {
  it('converte TEMPO e PRODUTIVIDADE para categorias com teto_unidades: 1', () => {
    const categorias = gerarBonusCategorias(
      ['TEMPO', 'PRODUTIVIDADE'],
      { TEMPO: { pontuacao_bonus: 50 }, PRODUTIVIDADE: { pontuacao_bonus: 75 } }
    );

    expect(categorias).toEqual([
      { chave: 'TEMPO', nome: 'Tempo de Execução', pontos_por_unidade: 50, teto_unidades: 1 },
      { chave: 'PRODUTIVIDADE', nome: 'Produtividade/Volume', pontos_por_unidade: 75, teto_unidades: 1 },
    ]);
  });

  it('ignora quesitos fora do mapa conhecido e usa 0 pts se pontuacao_bonus faltar', () => {
    const categorias = gerarBonusCategorias(['TEMPO', 'FORCA'], {});
    expect(categorias).toEqual([
      { chave: 'TEMPO', nome: 'Tempo de Execução', pontos_por_unidade: 0, teto_unidades: 1 },
    ]);
  });
});

describe('migrar + verificar (fluxo completo, banco em memória)', () => {
  it('detecta divergência antes de migrar', async () => {
    await colecao.insertOne({
      ...provaLegadaBase,
      quesitos_de_avaliacao: ['TEMPO'],
      configuracao_quesitos: { TEMPO: { pontuacao_bonus: 50 } },
    });

    const semDivergencia = await verificar(colecao);
    expect(semDivergencia).toBe(false);
  });

  it('migra os campos legados para bonus_categorias e remove os antigos', async () => {
    await colecao.insertOne({
      ...provaLegadaBase,
      quesitos_de_avaliacao: ['TEMPO', 'PRODUTIVIDADE'],
      configuracao_quesitos: {
        TEMPO: { pontuacao_bonus: 50 },
        PRODUTIVIDADE: { pontuacao_bonus: 75 },
      },
    });

    const migradas = await migrar(colecao);
    expect(migradas).toBe(1);

    const doc = await colecao.findOne({ titulo: 'Prova Legada' });
    expect(doc.quesitos_de_avaliacao).toBeUndefined();
    expect(doc.configuracao_quesitos).toBeUndefined();
    expect(doc.bonus_categorias).toEqual([
      { chave: 'TEMPO', nome: 'Tempo de Execução', pontos_por_unidade: 50, teto_unidades: 1 },
      { chave: 'PRODUTIVIDADE', nome: 'Produtividade/Volume', pontos_por_unidade: 75, teto_unidades: 1 },
    ]);

    // Confirma que o resultado bate com o schema atual de Prova.
    const provaValidada = new Prova(doc);
    await expect(provaValidada.validate()).resolves.toBeUndefined();
  });

  it('não altera provas que já estão no formato novo', async () => {
    await colecao.insertOne({
      ...provaLegadaBase,
      titulo: 'Prova Já Migrada',
      bonus_categorias: [{ chave: 'EX_ALUNOS', nome: 'Ex-alunos', pontos_por_unidade: 20, teto_unidades: 5 }],
    });

    const migradas = await migrar(colecao);
    expect(migradas).toBe(0);

    const semDivergencia = await verificar(colecao);
    expect(semDivergencia).toBe(true);
  });

  it('é idempotente: migrar duas vezes não duplica categorias nem falha', async () => {
    await colecao.insertOne({
      ...provaLegadaBase,
      quesitos_de_avaliacao: ['TEMPO'],
      configuracao_quesitos: { TEMPO: { pontuacao_bonus: 50 } },
    });

    await migrar(colecao);
    const migradasSegundaVez = await migrar(colecao);
    expect(migradasSegundaVez).toBe(0);

    const doc = await colecao.findOne({ titulo: 'Prova Legada' });
    expect(doc.bonus_categorias).toHaveLength(1);

    const semDivergencia = await verificar(colecao);
    expect(semDivergencia).toBe(true);
  });
});

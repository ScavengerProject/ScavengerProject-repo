import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import CodigoConvite from '../../../src/models/CodigoConvite.js';

let mongoServer;
const criadorId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await CodigoConvite.deleteMany({});
});

const baseDados = (extra = {}) => ({
  codigo: 'BASE1234',
  escola_id: 'ESCOLA_A',
  turma: 'EF - 6º Ano',
  ano_letivo: new Date().getFullYear(),
  expira_em: new Date(Date.now() + 86400000),
  criado_por: criadorId,
  ...extra,
});

describe('CodigoConvite - schema', () => {
  it('trava o tipo em ALUNO por padrão (D4)', async () => {
    const convite = await CodigoConvite.create(baseDados());
    expect(convite.tipo).toBe('ALUNO');
  });

  it('rejeita um tipo diferente de ALUNO', async () => {
    await expect(CodigoConvite.create(baseDados({ tipo: 'PROFESSOR' }))).rejects.toThrow();
  });

  it('uppercase automático no código', async () => {
    const convite = await CodigoConvite.create(baseDados({ codigo: 'abc12345' }));
    expect(convite.codigo).toBe('ABC12345');
  });

  it('não permite dois convites com o mesmo código', async () => {
    await CodigoConvite.create(baseDados({ codigo: 'DUPLICADO' }));
    await expect(CodigoConvite.create(baseDados({ codigo: 'DUPLICADO' }))).rejects.toThrow();
  });
});

describe('CodigoConvite - estaValido()', () => {
  it('válido por padrão (não revogado, não expirado, sem teto)', async () => {
    const convite = await CodigoConvite.create(baseDados());
    expect(convite.estaValido()).toBe(true);
  });

  it('inválido quando revogado', async () => {
    const convite = await CodigoConvite.create(baseDados({ revogado_em: new Date() }));
    expect(convite.estaValido()).toBe(false);
  });

  it('inválido quando expirado', async () => {
    const convite = await CodigoConvite.create(baseDados({ expira_em: new Date(Date.now() - 1000) }));
    expect(convite.estaValido()).toBe(false);
  });

  it('inválido quando bateu o limite de usos', async () => {
    const convite = await CodigoConvite.create(baseDados({ limite_usos: 3, usos: 3 }));
    expect(convite.estaValido()).toBe(false);
  });

  it('válido quando ainda não bateu o limite de usos', async () => {
    const convite = await CodigoConvite.create(baseDados({ limite_usos: 3, usos: 2 }));
    expect(convite.estaValido()).toBe(true);
  });
});

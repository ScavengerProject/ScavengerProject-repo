import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import CodigoConvite from '../../../src/models/CodigoConvite.js';
import { gerarCodigo, normalizarCodigo } from '../../../src/convites/codigoConviteHelpers.js';

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
  await CodigoConvite.deleteMany({});
});

describe('normalizarCodigo', () => {
  it('trata entradas vazias', () => {
    expect(normalizarCodigo('')).toBe('');
    expect(normalizarCodigo(null)).toBe('');
    expect(normalizarCodigo(undefined)).toBe('');
  });

  it('remove espaços e hífens, e uppercase', () => {
    expect(normalizarCodigo(' abc-defgh ')).toBe('ABCDEFGH');
  });

  // Caso de teste #4 do plano: variações do mesmo código resolvem igual.
  it('normaliza variações do mesmo código para o mesmo valor', () => {
    const canonico = normalizarCodigo('ABCDEFGH');
    expect(normalizarCodigo('abc-defgh')).toBe(canonico);
    expect(normalizarCodigo('ABCDEFGH')).toBe(canonico);
    expect(normalizarCodigo('AbcDefgh')).toBe(canonico);
    expect(normalizarCodigo('  abcdefgh  ')).toBe(canonico);
  });

  it('mapeia os pares visualmente ambíguos para o alfabeto canônico', () => {
    // O->0, I/L->1, U->V
    expect(normalizarCodigo('O')).toBe('0');
    expect(normalizarCodigo('I')).toBe('1');
    expect(normalizarCodigo('L')).toBe('1');
    expect(normalizarCodigo('U')).toBe('V');
  });
});

describe('gerarCodigo', () => {
  it('gera um código de 8 caracteres no alfabeto Crockford (sem I/L/O/U)', async () => {
    const codigo = await gerarCodigo();

    expect(codigo).toHaveLength(8);
    expect(codigo).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
  });

  it('nunca colide com um código já existente', async () => {
    const primeiro = await gerarCodigo();
    await CodigoConvite.create({
      codigo: primeiro,
      escola_id: 'ESCOLA_A',
      ano_letivo: new Date().getFullYear(),
      expira_em: new Date(Date.now() + 86400000),
      criado_por: new mongoose.Types.ObjectId(),
    });

    const segundo = await gerarCodigo();
    expect(segundo).not.toBe(primeiro);
  });
});

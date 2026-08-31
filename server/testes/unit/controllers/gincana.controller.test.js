import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Gincana from '../../../src/models/Gincana.js';
import { criarGincana } from '../../../src/gincanas/gincanaController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

let mongoServer;
const adminId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Gincana.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Gincana.deleteMany({});
});

describe('gincanaController - criação no escopo da escola', () => {
  it('cria a gincana na escola ativa do ADMIN', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana Nova', ano: 2026, descricao: 'Teste' },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const criada = await Gincana.findOne({ nome: 'Gincana Nova' });
    expect(criada.escola_id).toBe('ESCOLA_ATIVA');
  });

  it('recusa escola_id diferente da escola ativa', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: {
        escola_id: 'OUTRA_ESCOLA',
        nome: 'Gincana Indevida',
        ano: 2026,
      },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'ESCOLA_DIFERENTE_DO_ESCOPO',
    }));
    expect(await Gincana.countDocuments()).toBe(0);
  });
});

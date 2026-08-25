import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Gincana from '../../../src/models/Gincana.js';

let mongoServer;
const criadorId = new mongoose.Types.ObjectId();

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

describe('Gincana - índice único multi-escola', () => {
  it('permite o mesmo nome e ano em escolas diferentes', async () => {
    await Gincana.create({
      escola_id: 'ESCOLA_A',
      nome: 'Gincana 2026',
      ano: 2026,
      criado_por: criadorId,
    });

    await expect(Gincana.create({
      escola_id: 'ESCOLA_B',
      nome: 'Gincana 2026',
      ano: 2026,
      criado_por: criadorId,
    })).resolves.toMatchObject({ escola_id: 'ESCOLA_B' });
  });

  it('continua recusando o mesmo nome e ano dentro da mesma escola', async () => {
    await Gincana.create({
      escola_id: 'ESCOLA_A',
      nome: 'Gincana 2026',
      ano: 2026,
      criado_por: criadorId,
    });

    await expect(Gincana.create({
      escola_id: 'ESCOLA_A',
      nome: 'Gincana 2026',
      ano: 2026,
      criado_por: criadorId,
    })).rejects.toMatchObject({ code: 11000 });
  });
});

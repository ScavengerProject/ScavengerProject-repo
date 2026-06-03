import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import ConfiguracaoGincana from '../../../src/models/ConfiguracaoGincana.js';
import { obterConfiguracao, atualizarConfiguracao } from '../../../src/configuracoes/configuracaoController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

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
  await ConfiguracaoGincana.deleteMany({});
});

describe('configuracaoController', () => {
  it('obterConfiguracao cria a configuração padrão quando não existe', async () => {
    const res = mockRes();

    await obterConfiguracao({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const config = res.json.mock.calls[0][0];
    expect(config.gincana_id).toBe('GINCANA_PRINCIPAL');
    expect(config.mostrar_notas_ranking).toBe(false);
    expect(await ConfiguracaoGincana.countDocuments()).toBe(1);
  });

  it('atualizarConfiguracao altera mostrar_notas_ranking', async () => {
    const res = mockRes();

    await atualizarConfiguracao({ body: { mostrar_notas_ranking: true } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const config = await ConfiguracaoGincana.findOne({ gincana_id: 'GINCANA_PRINCIPAL' });
    expect(config.mostrar_notas_ranking).toBe(true);
  });

  it('obterConfiguracao retorna a configuração existente sem duplicar', async () => {
    await ConfiguracaoGincana.create({ gincana_id: 'GINCANA_PRINCIPAL', mostrar_notas_ranking: true });
    const res = mockRes();

    await obterConfiguracao({}, res);

    expect(res.json.mock.calls[0][0].mostrar_notas_ranking).toBe(true);
    expect(await ConfiguracaoGincana.countDocuments()).toBe(1);
  });
});

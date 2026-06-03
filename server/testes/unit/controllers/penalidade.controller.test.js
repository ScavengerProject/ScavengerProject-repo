import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import Penalidade from '../../../src/models/Penalidade.js';
import Notificacao from '../../../src/models/Notificacao.js';
import { criarPenalidade, listarPenalidades } from '../../../src/penalidades/penalidadesController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const adminUsuario = { id: new mongoose.Types.ObjectId().toString(), tipo: 'ADMIN' };

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
  await Promise.all([
    Equipe.deleteMany({}), EquipeGincana.deleteMany({}), EquipeMembros.deleteMany({}),
    Usuario.deleteMany({}), Penalidade.deleteMany({}), Notificacao.deleteMany({}),
  ]);
});

async function montarEquipe(pontosIniciais = 100) {
  const equipe = await Equipe.create({ nome: 'Equipe Penalizada', cor: '#abc' });
  const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_PRINCIPAL', pontos_acumulados: pontosIniciais });
  return { equipe, eg };
}

describe('penalidadesController - criarPenalidade', () => {
  it('desconta pontos da equipe, cria a penalidade e notifica os membros', async () => {
    const { equipe, eg } = await montarEquipe(100);
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'al@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id });

    const req = { usuario: adminUsuario, body: { equipeId: eg._id.toString(), pontos: 30, descricao: 'Atraso' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.pontos_restantes).toBe(70);

    const egAtual = await EquipeGincana.findById(eg._id);
    expect(egAtual.pontos_acumulados).toBe(70);

    const penalidade = await Penalidade.findOne({ equipe_gincana_id: eg._id });
    expect(penalidade.pontos_removidos).toBe(30);

    // O aluno membro deve ter recebido a notificação de penalidade
    const notif = await Notificacao.findOne({ usuario_id: aluno._id, tipo: 'PENALIDADE' });
    expect(notif).not.toBeNull();
  });

  it('nunca deixa os pontos ficarem negativos (piso em 0)', async () => {
    const { eg } = await montarEquipe(20);
    const req = { usuario: adminUsuario, body: { equipeId: eg._id.toString(), pontos: 50, descricao: 'Grave' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.json.mock.calls[0][0].pontos_restantes).toBe(0);
    expect((await EquipeGincana.findById(eg._id)).pontos_acumulados).toBe(0);
  });

  it('retorna 400 para pontos inválidos', async () => {
    const { eg } = await montarEquipe();
    const req = { usuario: adminUsuario, body: { equipeId: eg._id.toString(), pontos: 0, descricao: 'x' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando falta descrição', async () => {
    const { eg } = await montarEquipe();
    const req = { usuario: adminUsuario, body: { equipeId: eg._id.toString(), pontos: 10, descricao: '   ' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a EquipeGincana não existe', async () => {
    const req = { usuario: adminUsuario, body: { equipeId: new mongoose.Types.ObjectId().toString(), pontos: 10, descricao: 'x' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('impede COORDENADOR de penalizar equipe que não coordena (403)', async () => {
    const { eg } = await montarEquipe();
    const coordIntruso = { id: new mongoose.Types.ObjectId().toString(), tipo: 'COORDENADOR' };
    const req = { usuario: coordIntruso, body: { equipeId: eg._id.toString(), pontos: 10, descricao: 'x' } };
    const res = mockRes();

    await criarPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('penalidadesController - listarPenalidades', () => {
  it('ADMIN vê todas as penalidades', async () => {
    const { eg } = await montarEquipe();
    await Penalidade.create({ nome: 'PEN-1', equipe_gincana_id: eg._id, pontos_removidos: 5, descricao: 'a' });
    await Penalidade.create({ nome: 'PEN-2', equipe_gincana_id: eg._id, pontos_removidos: 8, descricao: 'b' });

    const res = mockRes();
    await listarPenalidades({ usuario: adminUsuario }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toHaveLength(2);
  });
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import Penalidade from '../../../src/models/Penalidade.js';
import Notificacao from '../../../src/models/Notificacao.js';
import { criarPenalidade, listarPenalidades, listarEquipesParaPenalidade } from '../../../src/penalidades/penalidadesController.js';

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

// GET /penalidades/equipes é a rota de origem para o formulário de penalidade
// (ADMIN, COORDENADOR e ALUNO acessam). Sem escopo de gincana, ela vaza equipes
// de outras edições/escolas para dentro desse formulário.
describe('penalidadesController - listarEquipesParaPenalidade (escopo de gincana)', () => {
  it('ADMIN só vê equipes da gincana ativa, não de outra edição', async () => {
    const equipeG1 = await Equipe.create({ nome: 'Equipe G1', cor: '#111', gincana_id: 'GINCANA_1' });
    const egG1 = await EquipeGincana.create({ equipe_id: equipeG1._id, gincana_id: 'GINCANA_1' });
    const equipeG2 = await Equipe.create({ nome: 'Equipe G2', cor: '#222', gincana_id: 'GINCANA_2' });
    await EquipeGincana.create({ equipe_id: equipeG2._id, gincana_id: 'GINCANA_2' });

    const req = { usuario: adminUsuario, gincanaId: 'GINCANA_1' };
    const res = mockRes();

    await listarEquipesParaPenalidade(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo).toHaveLength(1);
    expect(corpo[0].id).toBe(egG1._id.toString());
  });

  it('COORDENADOR de equipes em duas edições só vê a da gincana ativa', async () => {
    const coordenador = await Usuario.create({
      nome: 'Coord', email: 'coord@x.com', senha: '123', tipo: 'COORDENADOR', turma: 'EF - 6º Ano',
    });

    const equipeG1 = await Equipe.create({ nome: 'Equipe G1', cor: '#111', gincana_id: 'GINCANA_1' });
    const egG1 = await EquipeGincana.create({ equipe_id: equipeG1._id, gincana_id: 'GINCANA_1', coordenador_usuario_id: coordenador._id });
    await EquipeMembros.create({ equipe_id: equipeG1._id, usuario_id: coordenador._id, is_coordenador: true });

    const equipeG2 = await Equipe.create({ nome: 'Equipe G2', cor: '#222', gincana_id: 'GINCANA_2' });
    await EquipeGincana.create({ equipe_id: equipeG2._id, gincana_id: 'GINCANA_2', coordenador_usuario_id: coordenador._id });
    await EquipeMembros.create({ equipe_id: equipeG2._id, usuario_id: coordenador._id, is_coordenador: true });

    const req = { usuario: { id: coordenador._id.toString(), tipo: 'COORDENADOR' }, gincanaId: 'GINCANA_1' };
    const res = mockRes();

    await listarEquipesParaPenalidade(req, res);

    const corpo = res.json.mock.calls[0][0];
    expect(corpo).toHaveLength(1);
    expect(corpo[0].id).toBe(egG1._id.toString());
  });
});

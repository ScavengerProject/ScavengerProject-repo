import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import { adicionarMembro, removerMembroEquipe } from '../../../src/equipes/equipeController.js';

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
  await EquipeMembros.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Equipe.deleteMany({}), EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}), Usuario.deleteMany({}),
  ]);
});

// Cria equipe + registro de gincana + um aluno solto.
async function cenario() {
  const equipe = await Equipe.create({ nome: 'Time', cor: '#111' });
  const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_PRINCIPAL' });
  const aluno = await Usuario.create({ nome: 'Aluno', email: 'al@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
  return { equipe, eg, aluno };
}

describe('equipeController - adicionarMembro', () => {
  it('adiciona um usuário à equipe', async () => {
    const { equipe, aluno } = await cenario();
    const req = { params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } };
    const res = mockRes();

    await adicionarMembro(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await EquipeMembros.findOne({ usuario_id: aluno._id, equipe_id: equipe._id })).not.toBeNull();
  });

  it('retorna 400 sem usuario_id', async () => {
    const { equipe } = await cenario();
    const res = mockRes();
    await adicionarMembro({ params: { id: equipe._id.toString() }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a equipe não existe', async () => {
    const { aluno } = await cenario();
    const res = mockRes();
    await adicionarMembro({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { usuario_id: aluno._id.toString() } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando o usuário já pertence a uma equipe', async () => {
    const { equipe, eg, aluno } = await cenario();
    await EquipeMembros.create({ equipe_id: equipe._id, equipe_gincana_id: eg._id, usuario_id: aluno._id });
    const res = mockRes();

    await adicionarMembro({ params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('retorna 404 quando não há EquipeGincana para a equipe', async () => {
    const equipe = await Equipe.create({ nome: 'SemGincana', cor: '#222' });
    const aluno = await Usuario.create({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const res = mockRes();

    await adicionarMembro({ params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('equipeController - removerMembroEquipe', () => {
  it('remove um membro quando solicitado pelo coordenador da equipe', async () => {
    const { equipe, eg, aluno } = await cenario();
    const coordId = new mongoose.Types.ObjectId().toString();
    await EquipeGincana.findByIdAndUpdate(eg._id, { coordenador_usuario_id: coordId });
    const membro = await EquipeMembros.create({ equipe_id: equipe._id, equipe_gincana_id: eg._id, usuario_id: aluno._id });

    const req = { usuario: { id: coordId }, params: { membroId: membro._id.toString() } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await EquipeMembros.findById(membro._id)).toBeNull();
  });

  it('retorna 400 quando o coordenador tenta remover a si mesmo', async () => {
    const coordId = new mongoose.Types.ObjectId().toString();
    const req = { usuario: { id: coordId }, params: { membroId: coordId } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 403 quando o solicitante não coordena nenhuma equipe', async () => {
    const req = { usuario: { id: new mongoose.Types.ObjectId().toString() }, params: { membroId: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

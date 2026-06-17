import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import MigracaoEquipe from '../../../src/models/MigracaoEquipe.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembro from '../../../src/models/EquipeMembros.js';
import Notificacao from '../../../src/models/Notificacao.js';
import {
  listarMigracoesPendentes,
  solicitarMigracao,
  decidirMigracao,
} from '../../../src/equipes/migracaoEquipeController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const oid = () => new mongoose.Types.ObjectId();

const coordA = oid().toString(); // coordenador da equipe de ORIGEM
const coordB = oid().toString(); // coordenador da equipe de DESTINO

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
    MigracaoEquipe.deleteMany({}),
    Equipe.deleteMany({}),
    EquipeGincana.deleteMany({}),
    EquipeMembro.deleteMany({}),
    Notificacao.deleteMany({}),
  ]);
});

// Cria duas equipes (A=origem, B=destino) com seus respectivos coordenadores.
const criarCenario = async () => {
  const equipeA = await Equipe.create({ nome: 'Time A', cor: '#ff0000' });
  const equipeB = await Equipe.create({ nome: 'Time B', cor: '#0000ff' });
  const egA = await EquipeGincana.create({ equipe_id: equipeA._id, coordenador_usuario_id: coordA });
  const egB = await EquipeGincana.create({ equipe_id: equipeB._id, coordenador_usuario_id: coordB });
  return { equipeA, equipeB, egA, egB };
};

describe('migracaoController - #16 aprovação pelo coordenador de destino', () => {
  it('listarMigracoesPendentes mostra a solicitação para o coordenador de DESTINO', async () => {
    const { egA, egB } = await criarCenario();
    const meId = oid().toString();
    await MigracaoEquipe.create({
      usuario_id: meId,
      equipe_origem_id: egA._id,
      equipe_destino_id: egB._id,
      solicitado_por: meId,
      status: 'PENDENTE',
      motivo: 'quero entrar',
    });

    const res = mockRes();
    await listarMigracoesPendentes({ usuario: { id: coordB, tipo: 'COORDENADOR' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('listarMigracoesPendentes NÃO mostra a solicitação para o coordenador de ORIGEM', async () => {
    const { egA, egB } = await criarCenario();
    const meId = oid().toString();
    await MigracaoEquipe.create({
      usuario_id: meId,
      equipe_origem_id: egA._id,
      equipe_destino_id: egB._id,
      solicitado_por: meId,
      status: 'PENDENTE',
      motivo: 'quero entrar',
    });

    const res = mockRes();
    await listarMigracoesPendentes({ usuario: { id: coordA, tipo: 'COORDENADOR' } }, res);

    expect(res.json.mock.calls[0][0]).toHaveLength(0);
  });

  it('decidirMigracao retorna 403 para o coordenador de ORIGEM', async () => {
    const { equipeA, egA, egB } = await criarCenario();
    const meId = oid().toString();
    await EquipeMembro.create({ usuario_id: meId, equipe_id: equipeA._id });
    const mig = await MigracaoEquipe.create({
      usuario_id: meId,
      equipe_origem_id: egA._id,
      equipe_destino_id: egB._id,
      solicitado_por: meId,
      status: 'PENDENTE',
      motivo: 'quero entrar',
    });

    const res = mockRes();
    await decidirMigracao(
      { usuario: { id: coordA, tipo: 'COORDENADOR' }, params: { id: mig._id.toString() }, body: { aprovar: true } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('decidirMigracao do coordenador de DESTINO aprova, move o membro e notifica o solicitante', async () => {
    const { equipeA, equipeB, egA, egB } = await criarCenario();
    const meId = oid().toString();
    await EquipeMembro.create({ usuario_id: meId, equipe_id: equipeA._id });
    const mig = await MigracaoEquipe.create({
      usuario_id: meId,
      equipe_origem_id: egA._id,
      equipe_destino_id: egB._id,
      solicitado_por: meId,
      status: 'PENDENTE',
      motivo: 'quero entrar',
    });

    const res = mockRes();
    await decidirMigracao(
      { usuario: { id: coordB, tipo: 'COORDENADOR' }, params: { id: mig._id.toString() }, body: { aprovar: true } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);

    const membro = await EquipeMembro.findOne({ usuario_id: meId });
    expect(membro.equipe_id.toString()).toBe(equipeB._id.toString());

    const notif = await Notificacao.findOne({ usuario_id: meId, tipo: 'MIGRACAO' });
    expect(notif).not.toBeNull();
  });
});

describe('migracaoController - #16 notificação ao coordenador de destino', () => {
  it('solicitarMigracao cria a solicitação e notifica o coordenador de destino', async () => {
    const { equipeA, equipeB } = await criarCenario();
    const meId = oid().toString();
    await EquipeMembro.create({ usuario_id: meId, equipe_id: equipeA._id });

    const res = mockRes();
    await solicitarMigracao(
      {
        usuario: { id: meId, tipo: 'ALUNO' },
        body: { equipe_destino_id: equipeB._id.toString(), motivo: 'quero entrar' },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);

    const notif = await Notificacao.findOne({ usuario_id: coordB, tipo: 'MIGRACAO' });
    expect(notif).not.toBeNull();
  });
});

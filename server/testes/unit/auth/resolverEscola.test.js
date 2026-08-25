import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Escola from '../../../src/models/Escola.js';
import Gincana from '../../../src/models/Gincana.js';
import Usuario from '../../../src/models/Usuario.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import { resolverEscola, resolverGincana, autorizar } from '../../../src/auth/authPermissions.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const ESCOLA_A = 'ESCOLA_A';
const ESCOLA_B = 'ESCOLA_B';

let mongoServer;
let criadorId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  criadorId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Escola.create([
    { _id: ESCOLA_A, nome: 'Escola A', status: 'ATIVA', criado_por: criadorId },
    { _id: ESCOLA_B, nome: 'Escola B', status: 'ATIVA', criado_por: criadorId },
  ]);
});

afterEach(async () => {
  await Promise.all([
    Escola.deleteMany({}),
    Gincana.deleteMany({}),
    Usuario.deleteMany({}),
    Equipe.deleteMany({}),
    EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}),
  ]);
});

describe('authPermissions - resolverEscola', () => {
  it('injeta req.escolaId quando o usuário está vinculado à escola do header', async () => {
    const usuario = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const req = { headers: { 'x-escola-id': ESCOLA_A }, usuario: { id: usuario._id.toString(), tipo: 'PROFESSOR' } };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.escolaId).toBe(ESCOLA_A);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o usuário não está vinculado à escola pedida', async () => {
    const usuario = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const req = { headers: { 'x-escola-id': ESCOLA_B }, usuario: { id: usuario._id.toString(), tipo: 'PROFESSOR' } };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite que um professor de duas escolas alterne entre elas', async () => {
    const usuario = await Usuario.create({
      nome: 'Multi', email: 'multi@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }, { escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const usuarioReq = { id: usuario._id.toString(), tipo: 'PROFESSOR' };

    for (const escola of [ESCOLA_A, ESCOLA_B]) {
      const req = { headers: { 'x-escola-id': escola }, usuario: usuarioReq };
      const res = mockRes();
      const next = jest.fn();

      await resolverEscola(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.escolaId).toBe(escola);
    }
  });

  it('SUPER_ADMIN acessa qualquer escola sem vínculo explícito', async () => {
    const usuario = await Usuario.create({
      nome: 'Root', email: 'root@x.com', senha: '123', tipo: 'SUPER_ADMIN', vinculos: [],
    });
    const req = { headers: { 'x-escola-id': ESCOLA_B }, usuario: { id: usuario._id.toString(), tipo: 'SUPER_ADMIN' } };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.escolaId).toBe(ESCOLA_B);
  });

  it('retorna 404 quando a escola do header não existe', async () => {
    const req = { headers: { 'x-escola-id': 'NAO_EXISTE' }, usuario: { id: 'x', tipo: 'ADMIN' } };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('cai no fallback ESCOLA_PRINCIPAL quando o header não vem (dados legados)', async () => {
    const req = { headers: {}, usuario: { id: 'x', tipo: 'ALUNO' }, method: 'GET', originalUrl: '/api/provas' };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.escolaId).toBe('ESCOLA_PRINCIPAL');
  });
});

describe('authPermissions - resolverGincana com escopo de escola', () => {
  it('retorna 404 quando a gincana pertence a outra escola', async () => {
    // Barreira entre tenants: mesmo um ADMIN válido na escola A não deve
    // alcançar uma gincana da escola B trocando o header X-Gincana-Id.
    const gincanaDaB = await Gincana.create({
      _id: 'GINCANA_B', escola_id: ESCOLA_B, nome: 'Gincana da B', ano: 2026, criado_por: criadorId,
    });

    const req = {
      headers: { 'x-gincana-id': gincanaDaB._id },
      usuario: { id: criadorId.toString(), tipo: 'ADMIN' },
      escolaId: ESCOLA_A,
    };
    const res = mockRes();
    const next = jest.fn();

    await resolverGincana(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('injeta req.gincanaId quando a gincana é da escola ativa', async () => {
    const gincana = await Gincana.create({
      _id: 'GINCANA_A', escola_id: ESCOLA_A, nome: 'Gincana da A', ano: 2026, criado_por: criadorId,
    });

    const req = {
      headers: { 'x-gincana-id': gincana._id },
      usuario: { id: criadorId.toString(), tipo: 'ADMIN' },
      escolaId: ESCOLA_A,
    };
    const res = mockRes();
    const next = jest.fn();

    await resolverGincana(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.gincanaId).toBe('GINCANA_A');
  });
});

describe('authPermissions - autorizar com SUPER_ADMIN', () => {
  it('deixa o SUPER_ADMIN passar em uma rota restrita a ADMIN', () => {
    const middleware = autorizar('ADMIN');
    const req = { usuario: { tipo: 'SUPER_ADMIN' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('não deixa o ADMIN passar em uma rota restrita a SUPER_ADMIN', () => {
    const middleware = autorizar('SUPER_ADMIN');
    const req = { usuario: { tipo: 'ADMIN' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authPermissions - papel por escola', () => {
  it('injeta em req.usuario.tipo o papel da escola ativa, não o do token', async () => {
    // Mesma pessoa: ADMIN na escola A, PROFESSOR na escola B. O token carrega
    // apenas o papel base — quem manda é o vínculo da escola do header.
    // (São dois perfis de organização; um ALUNO não poderia estar nas duas —
    // ver PERFIS_MULTI_ESCOLA em models/Usuario.js.)
    const usuario = await Usuario.create({
      nome: 'Dupla', email: 'dupla@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'ADMIN' },
        { escola_id: ESCOLA_B, tipo: 'PROFESSOR', turma: 'EF - 6º Ano' },
      ],
    });
    const doToken = { id: usuario._id.toString(), tipo: 'PROFESSOR' };

    const reqA = { headers: { 'x-escola-id': ESCOLA_A }, usuario: { ...doToken } };
    await resolverEscola(reqA, mockRes(), jest.fn());
    expect(reqA.usuario.tipo).toBe('ADMIN');

    const reqB = { headers: { 'x-escola-id': ESCOLA_B }, usuario: { ...doToken } };
    await resolverEscola(reqB, mockRes(), jest.fn());
    expect(reqB.usuario.tipo).toBe('PROFESSOR');
    expect(reqB.usuario.turma).toBe('EF - 6º Ano');
  });

  it('autorizar(ADMIN) usa o papel da escola ativa', async () => {
    const usuario = await Usuario.create({
      nome: 'Dupla', email: 'dupla2@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'ADMIN' },
        { escola_id: ESCOLA_B, tipo: 'PROFESSOR' },
      ],
    });

    const req = { headers: { 'x-escola-id': ESCOLA_A }, usuario: { id: usuario._id.toString(), tipo: 'ALUNO' } };
    await resolverEscola(req, mockRes(), jest.fn());

    const res = mockRes();
    const next = jest.fn();
    autorizar('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('403 quando o vínculo com a escola está inativo', async () => {
    const usuario = await Usuario.create({
      nome: 'Susp', email: 'susp@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR', status: 'SUSPENSO' }],
    });
    const req = { headers: { 'x-escola-id': ESCOLA_A }, usuario: { id: usuario._id.toString(), tipo: 'PROFESSOR' } };
    const res = mockRes();
    const next = jest.fn();

    await resolverEscola(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authPermissions - resolverGincana e edições encerradas', () => {
  it('recusa uma gincana de ano passado, mesmo com status ATIVA', async () => {
    const antiga = await Gincana.create({
      _id: 'GINCANA_ANTIGA', escola_id: ESCOLA_A, nome: 'Edição antiga',
      ano: new Date().getFullYear() - 1, status: 'ATIVA', criado_por: criadorId,
    });

    const req = {
      headers: { 'x-gincana-id': antiga._id },
      usuario: { id: criadorId.toString(), tipo: 'ADMIN' },
      escolaId: ESCOLA_A,
    };
    const res = mockRes();
    const next = jest.fn();

    await resolverGincana(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].codigo).toBe('GINCANA_ENCERRADA');
    expect(next).not.toHaveBeenCalled();
  });

  it('recusa uma gincana marcada como ENCERRADA', async () => {
    const encerrada = await Gincana.create({
      _id: 'GINCANA_ENCERRADA', escola_id: ESCOLA_A, nome: 'Encerrada',
      ano: new Date().getFullYear(), status: 'ENCERRADA', criado_por: criadorId,
    });

    const req = {
      headers: { 'x-gincana-id': encerrada._id },
      usuario: { id: criadorId.toString(), tipo: 'ADMIN' },
      escolaId: ESCOLA_A,
    };
    const res = mockRes();
    const next = jest.fn();

    await resolverGincana(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('pede seleção quando não há header e a gincana legada é de outra escola', async () => {
    // Cenário do bug: o usuário trocou de escola e o front ainda não tinha uma
    // gincana escolhida. Antes o fallback cego devolvia dados/404 do tenant errado.
    await Gincana.create({
      _id: 'GINCANA_PRINCIPAL', escola_id: ESCOLA_B, nome: 'Legada',
      ano: new Date().getFullYear(), criado_por: criadorId,
    });

    const req = {
      headers: {},
      usuario: { id: criadorId.toString(), tipo: 'ADMIN' },
      escolaId: ESCOLA_A,
      method: 'GET',
      originalUrl: '/api/provas',
    };
    const res = mockRes();
    const next = jest.fn();

    await resolverGincana(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].codigo).toBe('GINCANA_NAO_SELECIONADA');
    expect(next).not.toHaveBeenCalled();
  });
});

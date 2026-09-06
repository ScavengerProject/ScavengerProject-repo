import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Gincana from '../../../src/models/Gincana.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import {
  criarGincana,
  listarGincanas,
  minhasGincanas,
  listarGincanasDisponiveis,
  atualizarGincana,
  alterarStatusGincana,
} from '../../../src/gincanas/gincanaController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

let mongoServer;
const adminId = new mongoose.Types.ObjectId().toString();

const anoAtual = new Date().getFullYear();

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
  await Promise.all([
    Gincana.deleteMany({}), Equipe.deleteMany({}), EquipeGincana.deleteMany({}), EquipeMembros.deleteMany({}),
  ]);
});

const criarGincanaDoc = (overrides) => Gincana.create({
  nome: 'Gincana', ano: anoAtual, escola_id: 'ESCOLA_ATIVA', criado_por: adminId, ...overrides,
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

  it('recusa quando falta nome ou ano', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { descricao: 'sem nome nem ano' },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('recusa nome duplicado no mesmo ano DENTRO da mesma escola', async () => {
    await criarGincanaDoc({ nome: 'Gincana X', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana X', ano: 2026 },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('permite o mesmo nome e ano em OUTRA escola', async () => {
    await criarGincanaDoc({ nome: 'Gincana X', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana X', ano: 2026 },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('gincanaController - listarGincanas (ADMIN vê tudo da escola ativa)', () => {
  it('lista só as gincanas da escola ativa, ordenadas por ano desc', async () => {
    await criarGincanaDoc({ nome: 'G Antiga', ano: 2024, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'G Nova', ano: 2026, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'G De Outra Escola', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = { escolaId: 'ESCOLA_ATIVA' };
    const res = mockRes();

    await listarGincanas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.map((g) => g.nome)).toEqual(['G Nova', 'G Antiga']);
  });
});

describe('gincanaController - minhasGincanas', () => {
  it('ADMIN vê todas as não-arquivadas da escola ativa, cada uma com a flag "encerrada"', async () => {
    await criarGincanaDoc({ nome: 'Ativa Corrente', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Ano Passado', ano: anoAtual - 1, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Arquivada', ano: anoAtual, status: 'ARQUIVADA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: adminId, tipo: 'ADMIN' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];

    // Arquivada nem aparece na lista.
    expect(corpo.map((g) => g.nome).sort()).toEqual(['Ano Passado', 'Ativa Corrente']);

    const porNome = Object.fromEntries(corpo.map((g) => [g.nome, g.encerrada]));
    expect(porNome['Ativa Corrente']).toBe(false);
    // Ano passado é encerrada mesmo com status ATIVA — o ano virado conta.
    expect(porNome['Ano Passado']).toBe(true);
  });

  it('SUPER_ADMIN também vê todas as gincanas da escola ativa, sem precisar de vínculo/participação', async () => {
    await criarGincanaDoc({ nome: 'G1', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: new mongoose.Types.ObjectId().toString(), tipo: 'SUPER_ADMIN' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('perfil comum (ex.: ALUNO) só vê as gincanas em que participa via equipe', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();

    const gincanaComParticipacao = await criarGincanaDoc({ nome: 'Participo', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Não Participo', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });

    const equipe = await Equipe.create({ nome: 'Minha Equipe', cor: '#123', gincana_id: gincanaComParticipacao._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaComParticipacao._id });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: alunoId, is_coordenador: false });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    const corpo = res.json.mock.calls[0][0];
    expect(corpo.map((g) => g.nome)).toEqual(['Participo']);
  });

  it('perfil comum não vê gincana de outra escola mesmo participando de uma equipe lá', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();

    const gincanaOutraEscola = await criarGincanaDoc({ nome: 'De Outra Escola', ano: anoAtual, escola_id: 'ESCOLA_OUTRA' });
    const equipe = await Equipe.create({ nome: 'Equipe Lá', cor: '#123', gincana_id: gincanaOutraEscola._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaOutraEscola._id });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: alunoId, is_coordenador: false });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.json.mock.calls[0][0]).toEqual([]);
  });
});

describe('gincanaController - listarGincanasDisponiveis (sem exigir participação)', () => {
  it('devolve as ATIVAS da escola ativa para um usuário sem nenhuma equipe', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();
    await criarGincanaDoc({ nome: 'Ativa Sem Equipe', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await listarGincanasDisponiveis(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].map((g) => g.nome)).toEqual(['Ativa Sem Equipe']);
  });

  it('não devolve gincanas de outra escola nem ENCERRADA/ARQUIVADA', async () => {
    await criarGincanaDoc({ nome: 'De Outra Escola', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_OUTRA' });
    await criarGincanaDoc({ nome: 'Encerrada', ano: anoAtual, status: 'ENCERRADA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Arquivada', ano: anoAtual, status: 'ARQUIVADA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: new mongoose.Types.ObjectId().toString(), tipo: 'ALUNO' } };
    const res = mockRes();

    await listarGincanasDisponiveis(req, res);

    expect(res.json.mock.calls[0][0]).toEqual([]);
  });
});

describe('gincanaController - atualizarGincana', () => {
  it('atualiza os campos informados', async () => {
    const gincana = await criarGincanaDoc({ nome: 'Antiga', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Nova', descricao: 'Atualizada' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = await Gincana.findById(gincana._id);
    expect(atualizada.nome).toBe('Nova');
    expect(atualizada.descricao).toBe('Atualizada');
  });

  it('retorna 404 quando a gincana é de outra escola', async () => {
    const gincana = await criarGincanaDoc({ nome: 'De Outra', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Tentativa' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando a atualização colide com outra gincana da mesma escola/ano', async () => {
    await criarGincanaDoc({ nome: 'Já Existe', ano: 2026, escola_id: 'ESCOLA_ATIVA' });
    const gincana = await criarGincanaDoc({ nome: 'Vou Renomear', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Já Existe' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('gincanaController - alterarStatusGincana', () => {
  it('retorna 400 para status inválido', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_ATIVA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'QUALQUER_COISA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a gincana é de outra escola', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_OUTRA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'ENCERRADA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('encerra a gincana na escola ativa', async () => {
    const gincana = await criarGincanaDoc({ status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'ENCERRADA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = await Gincana.findById(gincana._id);
    expect(atualizada.status).toBe('ENCERRADA');
  });
});

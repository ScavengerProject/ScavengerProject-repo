import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import Escola from '../../../src/models/Escola.js';
import Usuario from '../../../src/models/Usuario.js';
import Gincana from '../../../src/models/Gincana.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import CodigoConvite from '../../../src/models/CodigoConvite.js';
import Notificacao from '../../../src/models/Notificacao.js';
import {
  criarConvite,
  listarConvites,
  revogarConvite,
  listarUsuariosDoConvite,
  prevalidarConvite,
  resgatarConvite,
  listarPendentes,
  decidirPendencia,
} from '../../../src/convites/conviteController.js';
import { getVinculo } from '../../../src/escolas/escolaHelpers.js';
import { normalizarCodigo } from '../../../src/convites/codigoConviteHelpers.js';
import conviteRoutes from '../../../src/convites/conviteRoutes.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const ESCOLA_A = 'ESCOLA_A';
const ESCOLA_B = 'ESCOLA_B';
const ANO = new Date().getFullYear();

let mongoServer;
let adminAId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  adminAId = new mongoose.Types.ObjectId();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Escola.create([
    { _id: ESCOLA_A, nome: 'Escola A', status: 'ATIVA', criado_por: adminAId },
    { _id: ESCOLA_B, nome: 'Escola B', status: 'ATIVA', criado_por: adminAId },
  ]);
});

afterEach(async () => {
  await Promise.all([
    Escola.deleteMany({}),
    Usuario.deleteMany({}),
    Gincana.deleteMany({}),
    Equipe.deleteMany({}),
    EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}),
    CodigoConvite.deleteMany({}),
    Notificacao.deleteMany({}),
  ]);
});

const reqAdminA = (extra = {}) => ({
  escolaId: ESCOLA_A,
  usuario: { id: adminAId.toString(), tipo: 'ADMIN' },
  ...extra,
});

// Códigos passam por normalizarCodigo antes de ir para o banco — igual à
// produção (onde `codigo` sempre vem de gerarCodigo(), já no alfabeto
// canônico). Sem isso, um literal de teste com I/L/O/U (fora do alfabeto
// Crockford) fica gravado diferente do que normalizarCodigo produz na consulta.
const criarConviteDireto = (dados = {}) => CodigoConvite.create({
  codigo: normalizarCodigo(dados.codigo || 'CODIGO01'),
  escola_id: dados.escola_id || ESCOLA_A,
  turma: dados.turma !== undefined ? dados.turma : 'EF - 6º Ano',
  aprovacao_automatica: dados.aprovacao_automatica ?? true,
  ano_letivo: ANO,
  expira_em: dados.expira_em || new Date(Date.now() + 86400000),
  limite_usos: dados.limite_usos ?? null,
  usos: dados.usos || 0,
  revogado_em: dados.revogado_em || null,
  criado_por: adminAId,
});

describe('conviteController - criarConvite', () => {
  it('gera um código de turma com aprovacao_automatica=true', async () => {
    const req = reqAdminA({ body: { turma: 'EF - 6º Ano' } });
    const res = mockRes();

    await criarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const convite = res.json.mock.calls[0][0];
    expect(convite.aprovacao_automatica).toBe(true);
    expect(convite.escola_id).toBe(ESCOLA_A);
    expect(convite.tipo).toBe('ALUNO');
  });

  it('gera um código público da escola (sem turma) com aprovacao_automatica=false', async () => {
    const req = reqAdminA({ body: {} });
    const res = mockRes();

    await criarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].aprovacao_automatica).toBe(false);
    expect(res.json.mock.calls[0][0].turma).toBeNull();
  });

  it('rejeita turma inválida', async () => {
    const req = reqAdminA({ body: { turma: 'Turma Fantasia' } });
    const res = mockRes();

    await criarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita limite_usos inválido', async () => {
    const req = reqAdminA({ body: { limite_usos: -1 } });
    const res = mockRes();

    await criarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('conviteController - listarConvites / revogarConvite / listarUsuariosDoConvite', () => {
  it('lista só os convites da escola ativa', async () => {
    await criarConviteDireto({ codigo: 'DAESCOLA1' });
    await criarConviteDireto({ codigo: 'DAESCOLAB', escola_id: ESCOLA_B });

    const res = mockRes();
    await listarConvites(reqAdminA(), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].codigo).toBe(normalizarCodigo('DAESCOLA1'));
  });

  it('revogarConvite marca revogado_em e é idempotente', async () => {
    const convite = await criarConviteDireto();

    const res = mockRes();
    await revogarConvite(reqAdminA({ params: { id: convite._id.toString() } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    const primeiraRevogacao = (await CodigoConvite.findById(convite._id)).revogado_em;
    expect(primeiraRevogacao).not.toBeNull();

    const res2 = mockRes();
    await revogarConvite(reqAdminA({ params: { id: convite._id.toString() } }), res2);
    expect(res2.status).toHaveBeenCalledWith(200);
    expect((await CodigoConvite.findById(convite._id)).revogado_em.getTime()).toBe(primeiraRevogacao.getTime());
  });

  it('revogarConvite 404 para convite de outra escola', async () => {
    const convite = await criarConviteDireto({ escola_id: ESCOLA_B });

    const res = mockRes();
    await revogarConvite(reqAdminA({ params: { id: convite._id.toString() } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('listarUsuariosDoConvite devolve só quem entrou por aquele código', async () => {
    const convite = await criarConviteDireto();
    await Usuario.create({
      nome: 'Entrou', email: 'entrou@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO', codigo_convite_id: convite._id }],
    });
    await Usuario.create({
      nome: 'De outro código', email: 'outro@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' }],
    });

    const res = mockRes();
    await listarUsuariosDoConvite(reqAdminA({ params: { id: convite._id.toString() } }), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Entrou');
  });
});

describe('conviteController - prevalidarConvite (público)', () => {
  it('devolve só escola_nome e turma — nunca escola_id nem outros campos do convite', async () => {
    await criarConviteDireto({ codigo: 'PREVALIDA' });

    const res = mockRes();
    await prevalidarConvite({ params: { codigo: 'prevalida' } }, res); // minúsculo: também testa a normalização

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ escola_nome: 'Escola A', turma: 'EF - 6º Ano' });
  });

  // Caso de teste #3 do plano: as mensagens de erro são indistinguíveis entre
  // os motivos de recusa — senão o endpoint vira um oráculo de força bruta.
  it('devolve a MESMA mensagem para código inexistente, revogado, expirado e sem uso restante', async () => {
    await criarConviteDireto({ codigo: 'REVOGADO1', revogado_em: new Date() });
    await criarConviteDireto({ codigo: 'EXPIRADO1', expira_em: new Date(Date.now() - 1000) });
    await criarConviteDireto({ codigo: 'LIMITADO1', limite_usos: 1, usos: 1 });

    const mensagens = new Set();
    const status = new Set();
    for (const codigo of ['NAOEXISTE', 'REVOGADO1', 'EXPIRADO1', 'LIMITADO1']) {
      const res = mockRes();
      // eslint-disable-next-line no-await-in-loop
      await prevalidarConvite({ params: { codigo } }, res);
      status.add(res.status.mock.calls[0][0]);
      mensagens.add(res.json.mock.calls[0][0].message);
    }

    expect(status).toEqual(new Set([404]));
    expect(mensagens.size).toBe(1);
  });
});

describe('conviteController - resgatarConvite (autenticado)', () => {
  it('cria vínculo ATIVO quando o código é de turma (sem conflito)', async () => {
    const convite = await criarConviteDireto({ codigo: 'RESGATE01' });
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'aluno.resgate@x.com', senha: '123', tipo: 'ALUNO' });

    const req = { body: { codigo: 'resgate01' }, usuario: { id: aluno._id.toString(), tipo: 'ALUNO' } };
    const res = mockRes();
    await resgatarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(aluno._id);
    expect(getVinculo(atualizado, ESCOLA_A).status).toBe('ATIVO');
    expect((await CodigoConvite.findById(convite._id)).usos).toBe(1);
  });

  it('código público (sem turma) cria vínculo PENDENTE e devolve 202', async () => {
    await criarConviteDireto({ codigo: 'PUBLICO01', turma: null, aprovacao_automatica: false });
    const aluno = await Usuario.create({ nome: 'Fila', email: 'fila.resgate@x.com', senha: '123', tipo: 'ALUNO' });

    const req = { body: { codigo: 'PUBLICO01' }, usuario: { id: aluno._id.toString(), tipo: 'ALUNO' } };
    const res = mockRes();
    await resgatarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json.mock.calls[0][0].codigo).toBe('VINCULO_PENDENTE');
    expect(getVinculo(await Usuario.findById(aluno._id), ESCOLA_A).status).toBe('PENDENTE');
  });

  it('409 quando já existe vínculo (de qualquer status) com a escola do código', async () => {
    const convite = await criarConviteDireto({ codigo: 'JATEM0001' });
    const aluno = await Usuario.create({
      nome: 'Já tem', email: 'jatem@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' }],
    });

    const req = { body: { codigo: convite.codigo }, usuario: { id: aluno._id.toString(), tipo: 'ALUNO' } };
    const res = mockRes();
    await resgatarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  // Caso de teste #5 do plano: aluno ATIVO em B resgatando código de A vira
  // PENDENTE em A (não 409) — é a solicitação de transferência.
  it('aluno ATIVO em outra escola vira PENDENTE em vez de 409 (transferência)', async () => {
    const convite = await criarConviteDireto({ codigo: 'TRANSF001', escola_id: ESCOLA_A });
    const aluno = await Usuario.create({
      nome: 'Migrando', email: 'migrando@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' }],
    });

    const req = { body: { codigo: convite.codigo }, usuario: { id: aluno._id.toString(), tipo: 'ALUNO' } };
    const res = mockRes();
    await resgatarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json.mock.calls[0][0].codigo).toBe('TRANSFERENCIA_PENDENTE');

    const atualizado = await Usuario.findById(aluno._id);
    expect(getVinculo(atualizado, ESCOLA_A).status).toBe('PENDENTE');
    expect(getVinculo(atualizado, ESCOLA_B).status).toBe('ATIVO'); // origem intacta até a aprovação
  });

  // Caso de teste #9 do plano.
  it('usos incrementa atomicamente e respeita limite_usos', async () => {
    const convite = await criarConviteDireto({ codigo: 'LIMITE001', limite_usos: 1 });
    const aluno1 = await Usuario.create({ nome: 'Um', email: 'um@x.com', senha: '123', tipo: 'ALUNO' });
    const aluno2 = await Usuario.create({ nome: 'Dois', email: 'dois@x.com', senha: '123', tipo: 'ALUNO' });

    const res1 = mockRes();
    await resgatarConvite({ body: { codigo: convite.codigo }, usuario: { id: aluno1._id.toString(), tipo: 'ALUNO' } }, res1);
    expect(res1.status).toHaveBeenCalledWith(200);

    const res2 = mockRes();
    await resgatarConvite({ body: { codigo: convite.codigo }, usuario: { id: aluno2._id.toString(), tipo: 'ALUNO' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(404); // teto batido: código não é mais válido

    expect((await CodigoConvite.findById(convite._id)).usos).toBe(1);
  });

  it('400 quando SUPER_ADMIN tenta resgatar (já acessa qualquer escola)', async () => {
    const convite = await criarConviteDireto();
    const root = await Usuario.create({ nome: 'Root', email: 'root.resgate@x.com', senha: '123', tipo: 'SUPER_ADMIN' });

    const req = { body: { codigo: convite.codigo }, usuario: { id: root._id.toString(), tipo: 'SUPER_ADMIN' } };
    const res = mockRes();
    await resgatarConvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('conviteController - listarPendentes / decidirPendencia', () => {
  it('listarPendentes devolve só vínculos PENDENTE da escola ativa', async () => {
    await Usuario.create({
      nome: 'Pendente A', email: 'pa@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
    });
    await Usuario.create({
      nome: 'Pendente B', email: 'pb@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
    });
    await Usuario.create({
      nome: 'Ativo A', email: 'aa@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' }],
    });

    const res = mockRes();
    await listarPendentes(reqAdminA(), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Pendente A');
  });

  it('REJEITAR remove o vínculo PENDENTE', async () => {
    const usuario = await Usuario.create({
      nome: 'Rejeitado', email: 'rej@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
    });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'REJEITAR' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Usuario.findById(usuario._id)).vinculos).toHaveLength(0);
  });

  it('APROVAR sem conflito só promove o vínculo PENDENTE a ATIVO', async () => {
    const usuario = await Usuario.create({
      nome: 'Aprovado', email: 'apr@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
    });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'APROVAR' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(usuario._id);
    expect(atualizado.vinculos).toHaveLength(1);
    expect(atualizado.vinculos[0].status).toBe('ATIVO');
  });

  // Caso de teste #6 do plano: aprovar transferência remove o vínculo ATIVO
  // antigo e ativa o novo NUMA gravação (usuario.save() único — ver Fase 0).
  it('APROVAR com transferência remove o vínculo ATIVO antigo e ativa o novo numa gravação', async () => {
    const usuario = await Usuario.create({
      nome: 'Transferido', email: 'transferido@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [
        { escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' },
        { escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' },
      ],
    });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'APROVAR' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(usuario._id);
    expect(atualizado.vinculos).toHaveLength(1);
    expect(atualizado.vinculos[0].escola_id).toBe(ESCOLA_A);
    expect(atualizado.vinculos[0].status).toBe('ATIVO');
  });

  // Bug real corrigido (ver plano de convites, Fase 4 / Tarefa 2): quem se
  // cadastra pelo código PÚBLICO da escola (sem turma) chega aqui com
  // `turma: null`. Sem exigir uma, o aluno entrava sem turma e falhava
  // silenciosamente na elegibilidade de provas (turmas_permitidas).
  it('APROVAR de um pendente sem turma exige turma no corpo e a grava no vínculo', async () => {
    const usuario = await Usuario.create({
      nome: 'Sem Turma', email: 'semturma@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: null, status: 'PENDENTE' }],
    });

    // Sem turma no corpo: recusado (é justamente o caso que criava o bug).
    const semTurma = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'APROVAR' } }),
      semTurma
    );
    expect(semTurma.status).toHaveBeenCalledWith(400);
    expect(getVinculo(await Usuario.findById(usuario._id), ESCOLA_A).status).toBe('PENDENTE');

    // Com turma válida: aprova e grava a turma no vínculo.
    const comTurma = mockRes();
    await decidirPendencia(
      reqAdminA({
        params: { usuarioId: usuario._id.toString() },
        body: { decisao: 'APROVAR', turma: 'EF - 6º Ano' },
      }),
      comTurma
    );
    expect(comTurma.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(usuario._id);
    const vinculo = getVinculo(atualizado, ESCOLA_A);
    expect(vinculo.status).toBe('ATIVO');
    expect(vinculo.turma).toBe('EF - 6º Ano');
  });

  it('APROVAR rejeita turma fora do enum TURMAS', async () => {
    const usuario = await Usuario.create({
      nome: 'Turma Ruim', email: 'turmaruim@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: null, status: 'PENDENTE' }],
    });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({
        params: { usuarioId: usuario._id.toString() },
        body: { decisao: 'APROVAR', turma: 'Turma Fantasia' },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getVinculo(await Usuario.findById(usuario._id), ESCOLA_A).status).toBe('PENDENTE');
  });

  it('não mexe em EquipeMembros e notifica o(s) coordenador(es) de origem quando o transferido era membro de gincana ativa', async () => {
    const gincanaOrigem = await Gincana.create({
      _id: 'GINCANA_ORIGEM', escola_id: ESCOLA_B, nome: 'Gincana B', ano: ANO, status: 'ATIVA', criado_por: adminAId,
    });
    const equipe = await Equipe.create({ nome: 'Equipe X', gincana_id: gincanaOrigem._id, cor: '#fff' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaOrigem._id });

    const coordenador = await Usuario.create({
      nome: 'Coord', email: 'coord@x.com', senha: '123', tipo: 'COORDENADOR',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'COORDENADOR', turma: 'EF - 7º Ano', status: 'ATIVO' }],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordenador._id, is_coordenador: true });

    const usuario = await Usuario.create({
      nome: 'Membro Transferido', email: 'membro.transf@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [
        { escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' },
        { escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' },
      ],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: usuario._id, is_coordenador: false });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'APROVAR' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);

    // EquipeMembros permanece intacto (deliberado, ver plano Fase 0).
    expect(await EquipeMembros.countDocuments({ usuario_id: usuario._id })).toBe(1);

    const notificacoes = await Notificacao.find({ usuario_id: coordenador._id });
    expect(notificacoes.length).toBeGreaterThan(0);
    expect(notificacoes[0].titulo).toMatch(/transferid/i);
  });

  it('APROVAR sem vínculo pendente retorna 404', async () => {
    const usuario = await Usuario.create({ nome: 'Sem pendência', email: 'semp@x.com', senha: '123', tipo: 'ALUNO' });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'APROVAR' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 para decisao inválida', async () => {
    const usuario = await Usuario.create({ nome: 'X', email: 'decisao@x.com', senha: '123', tipo: 'ALUNO' });

    const res = mockRes();
    await decidirPendencia(
      reqAdminA({ params: { usuarioId: usuario._id.toString() }, body: { decisao: 'TALVEZ' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

/* ------------------------------------------------------------------------ */
/* Integração: valida o ENCADEAMENTO real das rotas (ordem dos middlewares e
 * das rotas literais x parametrizadas) — o mesmo motivo de
 * permissoesSuperAdmin.test.js chamar o Express de verdade em vez dos
 * controllers direto. */
describe('conviteRoutes - integração', () => {
  let app;
  let adminA;
  let alunoA;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/convites', conviteRoutes);
  });

  beforeEach(async () => {
    adminA = await Usuario.create({
      nome: 'Admin A', email: 'admin.integracao@x.com', senha: '123456', tipo: 'ADMIN',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ADMIN' }],
    });
    alunoA = await Usuario.create({
      nome: 'Aluno A', email: 'aluno.integracao@x.com', senha: '123456', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });
  });

  const tokenDe = (usuario) => jwt.sign(
    { id: usuario._id.toString(), nome: usuario.nome, tipo: usuario.tipo },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );

  it('GET /pendentes não é engolida pela rota parametrizada /:codigo', async () => {
    const res = await request(app)
      .get('/api/convites/pendentes')
      .set('Authorization', `Bearer ${tokenDe(adminA)}`)
      .set('X-Escola-Id', ESCOLA_A);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('ALUNO recebe 403 ao tentar criar convite (rota é ADMIN)', async () => {
    const res = await request(app)
      .post('/api/convites')
      .set('Authorization', `Bearer ${tokenDe(alunoA)}`)
      .set('X-Escola-Id', ESCOLA_A)
      .send({ turma: 'EF - 6º Ano' });

    expect(res.status).toBe(403);
  });

  it('GET /:codigo é público e não exige token', async () => {
    await criarConviteDireto({ codigo: 'PUBLICOROT' });

    const res = await request(app).get('/api/convites/PUBLICOROT');

    expect(res.status).toBe(200);
    expect(res.body.escola_nome).toBe('Escola A');
  });

  it('POST /resgatar funciona sem X-Escola-Id (a escola vem do código, não do header)', async () => {
    const convite = await criarConviteDireto({ codigo: 'SEMHEADER' });

    const res = await request(app)
      .post('/api/convites/resgatar')
      .set('Authorization', `Bearer ${tokenDe(alunoA)}`)
      .send({ codigo: convite.codigo });

    // alunoA já tem vínculo com ESCOLA_A (a do código) -> 409, mas a requisição
    // PASSOU pelo middleware sem X-Escola-Id — é isso que este teste prova.
    expect(res.status).toBe(409);
  });
});

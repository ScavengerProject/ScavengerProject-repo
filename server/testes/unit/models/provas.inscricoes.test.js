import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import Prova from '../../../src/models/Prova.js';
import Usuario from '../../../src/models/Usuario.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';

import authRoutes from '../../../src/auth/authRoutes.js';
import provaRoutes from '../../../src/provas/provaRoutes.js';

dotenv.config();

let mongoServer;
let app;

// Helper: cria token logando na rota real
async function loginAndGetToken(agent, email, senha) {
  const res = await agent
    .post('/api/auth/login')
    .send({ email, senha });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  return { token: res.body.token, usuario: res.body.usuario };
}

describe('Provas - Inscrições com cotas por requisito_usuario', () => {
  beforeAll(async () => {
    // SECRET para jwt
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    // Sobe Mongo em memória
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});

    // Sobe app Express mínimo com as mesmas rotas
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/provas', provaRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await ProvaUsuario.deleteMany({});
    await Prova.deleteMany({});
    await Usuario.deleteMany({});
    await EquipeMembros.deleteMany({});
  });

  // Regra de negócio atual: só é possível se inscrever em uma prova se o usuário
  // pertencer a alguma equipe. Este helper garante esse vínculo nos testes de cota.
  async function darEquipe(usuario) {
    await EquipeMembros.create({
      equipe_id: new mongoose.Types.ObjectId(),
      usuario_id: usuario._id,
    });
    return usuario;
  }

  // Cria usuários utilitários
  async function seedUsers() {
    const admin = await Usuario.create({
      nome: 'Admin',
      email: 'admin@x.com',
      senha: 'Admin123!',     // será hash pelo pre-save
      tipo: 'ADMIN',
      status: 'ATIVO'
    });

    const coord = await Usuario.create({
      nome: 'Coord',
      email: 'coord@x.com',
      senha: 'Coord123!',
      tipo: 'COORDENADOR',
      status: 'ATIVO'
    });

    const alunoEF1 = await Usuario.create({
      nome: 'Aluno EF 1',
      email: 'alunoef1@x.com',
      senha: 'AlunoEF1!',
      tipo: 'ALUNO',
      turma: 'EF - 6º Ano',
      status: 'ATIVO'
    });

    const alunoEF2 = await Usuario.create({
      nome: 'Aluno EF 2',
      email: 'alunoef2@x.com',
      senha: 'AlunoEF2!',
      tipo: 'ALUNO',
      turma: 'EF - 8º Ano',
      status: 'ATIVO'
    });

    const alunoEF3 = await Usuario.create({
      nome: 'Aluno EF 3',
      email: 'alunoef3@x.com',
      senha: 'AlunoEF3!',
      tipo: 'ALUNO',
      turma: 'EF - 9º Ano',
      status: 'ATIVO'
    });

    const alunoEM1 = await Usuario.create({
      nome: 'Aluno EM 1',
      email: 'alunoem1@x.com',
      senha: 'AlunoEM1!',
      tipo: 'ALUNO',
      turma: 'EM - 1º Ano',
      status: 'ATIVO'
    });

    const professor = await Usuario.create({
      nome: 'Prof',
      email: 'prof@x.com',
      senha: 'Prof123!',
      tipo: 'PROFESSOR',
      status: 'ATIVO'
    });

    const pai = await Usuario.create({
      nome: 'Pai',
      email: 'pai@x.com',
      senha: 'Pai123!',
      tipo: 'PAI/MÃE',
      status: 'ATIVO'
    });

    // Todos os usuários que poderão se inscrever precisam pertencer a uma equipe.
    await Promise.all(
      [alunoEF1, alunoEF2, alunoEF3, alunoEM1, professor, pai].map(darEquipe)
    );

    return { admin, coord, alunoEF1, alunoEF2, alunoEF3, alunoEM1, professor, pai };
  }

  // Cria uma prova com cotas default para os casos
  async function createProvaComCotas(agent, tokenAdmin, override = {}) {
    const body = {
      titulo: 'Prova Interdisciplinar',
      descricao: 'Composição balanceada por tipo',
      data_inicio: '2025-11-10T13:00:00.000Z',
      pontuacao: { max: 100 },
      formato: 'PROVA_PRATICA',
      requisito_usuario: {
        'ALUNOS_FUNDAMENTAL': 2,
        'ALUNOS_MEDIO': 3,
        'PROFESSORES': 1,
        'PAI/MÃE': 0,
        ...override
      }
    };
    const res = await agent
      .post('/api/provas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(body);
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    return res.body;
  }

  it('US03.1 | Aluno EF consegue se auto-inscrever até preencher a cota do grupo; terceira tentativa retorna VAGAS_ESGOTADAS com mensagem específica', async () => {
    const agent = request(app);
    const { admin, alunoEF1, alunoEF2, alunoEF3 } = await seedUsers();

    // Login admin e cria prova
    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    const prova = await createProvaComCotas(agent, tokenAdmin); // EF:2

    // Login aluno EF1
    const { token: tokenEF1 } = await loginAndGetToken(agent, 'alunoef1@x.com', 'AlunoEF1!');
    // 1ª inscrição (ok)
    const r1 = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenEF1}`)
      .send({});
    expect(r1.status).toBe(201);
    expect(r1.body.ok).toBe(true);

    // Login aluno EF2
    const { token: tokenEF2 } = await loginAndGetToken(agent, 'alunoef2@x.com', 'AlunoEF2!');
    // 2ª inscrição (ok)
    const r2 = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenEF2}`)
      .send({});
    expect(r2.status).toBe(201);
    expect(r2.body.ok).toBe(true);

    // Login aluno EF3
    const { token: tokenEF3 } = await loginAndGetToken(agent, 'alunoef3@x.com', 'AlunoEF3!');
    // 3ª inscrição (excede cota EF=2)
    const r3 = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenEF3}`)
      .send({});
    expect(r3.status).toBe(422);
    expect(r3.body.code).toBe('VAGAS_ESGOTADAS');
    expect(r3.body.message).toMatch(/Quantidade máxima para alunos do ensino fundamental preenchida/i);
  });

  it('US03.2 | PAI/MÃE não consegue se inscrever quando cota do grupo é 0 (GRUPO_NAO_PERMITIDO)', async () => {
    const agent = request(app);
    const { admin, pai } = await seedUsers();

    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    const prova = await createProvaComCotas(agent, tokenAdmin, { 'PAI/MÃE': 0 });

    // Login pai/mãe
    const { token: tokenPai } = await loginAndGetToken(agent, 'pai@x.com', 'Pai123!');
    const r = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenPai}`)
      .send({});
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('GRUPO_NAO_PERMITIDO');
    expect(r.body.message).toMatch(/não permitida.*pais\/mães/i);
  });

  it('US03.3 | ALUNO não pode inscrever outro usuário (403 NAO_AUTORIZADO)', async () => {
    const agent = request(app);
    const { admin, alunoEF1, alunoEF2 } = await seedUsers();

    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    const prova = await createProvaComCotas(agent, tokenAdmin);

    const { token: tokenEF1, usuario: u1 } = await loginAndGetToken(agent, 'alunoef1@x.com', 'AlunoEF1!');

    // alunoEF1 tentando inscrever alunoEF2
    const r = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenEF1}`)
      .send({ usuario_id: `${alunoEF2._id}` });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('NAO_AUTORIZADO');
  });

  it('US03.4 | ADMIN pode inscrever qualquer usuário; listarParticipantes retorna contagem vs cotas', async () => {
    const agent = request(app);
    const { admin, alunoEM1, professor } = await seedUsers();

    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    const prova = await createProvaComCotas(agent, tokenAdmin, { 'ALUNOS_MEDIO': 1, 'PROFESSORES': 1 });

    // ADMIN inscreve EM
    const r1 = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ usuario_id: `${alunoEM1._id}` });
    expect(r1.status).toBe(201);

    // ADMIN inscreve PROFESSOR
    const r2 = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ usuario_id: `${professor._id}` });
    expect(r2.status).toBe(201);

    // GET participantes
    const r3 = await agent
      .get(`/api/provas/${prova._id}/participantes`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r3.status).toBe(200);

    // contagem deve refletir 1 EM e 1 PROFESSOR
    expect(r3.body.contagem).toMatchObject({
      'ALUNOS_MEDIO': 1,
      'PROFESSORES': 1
    });

    // cotas retornadas
    expect(r3.body.cotas).toMatchObject({
      'ALUNOS_MEDIO': 1,
      'PROFESSORES': 1
    });
  });

  it('US03.5 | Mensagens humanizadas: GRUPO_NAO_PERMITIDO e VAGAS_ESGOTADAS usam rótulos corretos', async () => {
    const agent = request(app);
    const { admin, alunoEM1 } = await seedUsers();

    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    // Prova permitindo só EF (EM = 0)
    const prova = await createProvaComCotas(agent, tokenAdmin, { 'ALUNOS_MEDIO': 0, 'ALUNOS_FUNDAMENTAL': 2 });

    const { token: tokenEM } = await loginAndGetToken(agent, 'alunoem1@x.com', 'AlunoEM1!');

    const r = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenEM}`)
      .send({});
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('GRUPO_NAO_PERMITIDO');
    expect(r.body.message).toMatch(/alunos do ensino médio/i);
  });

  it('US03.6 | Usuário sem equipe não consegue se inscrever (422 SEM_EQUIPE)', async () => {
    const agent = request(app);
    const { admin } = await seedUsers();

    // Cria um aluno SEM vínculo de equipe (não passa por darEquipe)
    await Usuario.create({
      nome: 'Aluno Sem Equipe',
      email: 'semequipe@x.com',
      senha: 'SemEquipe1!',
      tipo: 'ALUNO',
      turma: 'EF - 6º Ano',
      status: 'ATIVO'
    });

    const { token: tokenAdmin } = await loginAndGetToken(agent, 'admin@x.com', 'Admin123!');
    const prova = await createProvaComCotas(agent, tokenAdmin);

    const { token: tokenSemEquipe } = await loginAndGetToken(agent, 'semequipe@x.com', 'SemEquipe1!');
    const r = await agent
      .post(`/api/provas/${prova._id}/inscricoes`)
      .set('Authorization', `Bearer ${tokenSemEquipe}`)
      .send({});

    expect(r.status).toBe(422);
    expect(r.body.code).toBe('SEM_EQUIPE');
    expect(r.body.message).toMatch(/equipe/i);
  });
});

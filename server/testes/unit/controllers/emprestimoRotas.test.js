/**
 * O ADMIN não empresta alunos — ele decide solicitações.
 *
 * O empréstimo é o resultado do acordo entre dois coordenadores (solicitação
 * aprovada -> oferta -> aceite). O antigo `POST /api/equipes/emprestimos`
 * furava esse fluxo: o ADMIN movia um aluno para outra equipe direto, sem
 * solicitação, sem oferta e sem nenhum dos dois coordenadores saber.
 *
 * O teste passa pelo Express de verdade porque é a ROTA que sumiu: um teste de
 * controller não prova nada sobre um handler que não existe mais, e nada impede
 * alguém de reintroduzir o `router.post('/')` amanhã.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Escola from '../../../src/models/Escola.js';
import Gincana from '../../../src/models/Gincana.js';
import Usuario from '../../../src/models/Usuario.js';
import emprestimoEquipeRoutes from '../../../src/equipes/emprestimoEquipeRoutes.js';

const ESCOLA = 'ESCOLA_A';
const GINCANA = 'GINCANA_A';
const ANO = new Date().getFullYear();

let mongoServer;
let app;
let admin;

const tokenDe = (usuario) => jwt.sign(
  { id: usuario._id.toString(), nome: usuario.nome, tipo: usuario.tipo },
  process.env.JWT_SECRET,
  { expiresIn: '2h' },
);

const como = (usuario) => (metodo, url) => request(app)[metodo](url)
  .set('Authorization', `Bearer ${tokenDe(usuario)}`)
  .set('X-Escola-Id', ESCOLA)
  .set('X-Gincana-Id', GINCANA);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/equipes/emprestimos', emprestimoEquipeRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const criador = new mongoose.Types.ObjectId();
  await Escola.create({ _id: ESCOLA, nome: 'Escola A', status: 'ATIVA', criado_por: criador });
  await Gincana.create({ _id: GINCANA, escola_id: ESCOLA, nome: 'Gincana A', ano: ANO, criado_por: criador });
  admin = await Usuario.create({
    nome: 'Admin', email: 'admin@x.com', senha: '123456', tipo: 'ADMIN',
    vinculos: [{ escola_id: ESCOLA, tipo: 'ADMIN' }],
  });
});

afterEach(async () => {
  await Promise.all([Escola.deleteMany({}), Gincana.deleteMany({}), Usuario.deleteMany({})]);
});

describe('empréstimo não se cria à mão', () => {
  it('POST /api/equipes/emprestimos não existe nem para o ADMIN', async () => {
    const res = await como(admin)('post', '/api/equipes/emprestimos').send({
      usuario_id: new mongoose.Types.ObjectId().toString(),
      equipe_destino_id: new mongoose.Types.ObjectId().toString(),
      prova_id: new mongoose.Types.ObjectId().toString(),
    });

    expect(res.status).toBe(404);
  });

  it('o ADMIN continua acompanhando e encerrando empréstimos', async () => {
    const lista = await como(admin)('get', '/api/equipes/emprestimos');
    expect(lista.status).toBe(200);
    expect(lista.body).toEqual([]);

    // A rota de encerrar segue montada: 404 aqui é do empréstimo inexistente,
    // não da rota (que responderia o 404 padrão do Express, sem corpo).
    const encerrar = await como(admin)('patch', `/api/equipes/emprestimos/${new mongoose.Types.ObjectId()}/encerrar`);
    expect(encerrar.status).toBe(404);
    expect(encerrar.body.message).toMatch(/Empréstimo não encontrado/);
  });
});

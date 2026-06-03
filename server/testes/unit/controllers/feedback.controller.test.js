import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Feedback from '../../../src/models/Feedback.js';
import Usuario from '../../../src/models/Usuario.js';
import Notificacao from '../../../src/models/Notificacao.js';
import {
  enviarFeedback,
  listarFeedbacks,
  responderFeedback,
  listarMeusFeedbacks,
} from '../../../src/feedbacks/feedbackController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

let mongoServer;
let autor;
let admin;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  autor = await Usuario.create({ nome: 'Autor', email: 'autor@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
  admin = await Usuario.create({ nome: 'Admin', email: 'admin@x.com', senha: '123', tipo: 'ADMIN', status: 'ATIVO' });
});

afterEach(async () => {
  await Promise.all([Feedback.deleteMany({}), Usuario.deleteMany({}), Notificacao.deleteMany({})]);
});

describe('feedbackController - enviarFeedback', () => {
  it('cria feedback PENDENTE e notifica os admins', async () => {
    const req = { usuario: { id: autor._id.toString() }, body: { descricao: 'Encontrei um bug no ranking.' } };
    const res = mockRes();

    await enviarFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const fb = await Feedback.findOne({ criado_por_usuario_id: autor._id });
    expect(fb.status).toBe('PENDENTE');

    // Espera o microtask das notificações (fire-and-forget) liquidar
    await new Promise((r) => setTimeout(r, 50));
    const notifAdmin = await Notificacao.findOne({ usuario_id: admin._id });
    expect(notifAdmin).not.toBeNull();
  });

  it('retorna 400 quando a descrição está ausente', async () => {
    const req = { usuario: { id: autor._id.toString() }, body: {} };
    const res = mockRes();

    await enviarFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando a descrição excede 10000 caracteres', async () => {
    const req = { usuario: { id: autor._id.toString() }, body: { descricao: 'a'.repeat(10001) } };
    const res = mockRes();

    await enviarFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('feedbackController - responderFeedback', () => {
  it('marca como ANALISADO e salva a resposta do admin', async () => {
    const fb = await Feedback.create({ criado_por_usuario_id: autor._id, descricao: 'Problema' });
    const req = {
      usuario: { id: admin._id.toString() },
      params: { id: fb._id.toString() },
      body: { resposta_admin: 'Já corrigimos, obrigado!' },
    };
    const res = mockRes();

    await responderFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Feedback.findById(fb._id);
    expect(atualizado.status).toBe('ANALISADO');
    expect(atualizado.resposta_admin).toBe('Já corrigimos, obrigado!');
    expect(atualizado.avaliado_por_usuario_id.toString()).toBe(admin._id.toString());
  });

  it('retorna 400 quando a resposta está vazia', async () => {
    const fb = await Feedback.create({ criado_por_usuario_id: autor._id, descricao: 'Problema' });
    const req = { usuario: { id: admin._id.toString() }, params: { id: fb._id.toString() }, body: { resposta_admin: '   ' } };
    const res = mockRes();

    await responderFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando o feedback não existe', async () => {
    const req = { usuario: { id: admin._id.toString() }, params: { id: new mongoose.Types.ObjectId().toString() }, body: { resposta_admin: 'ok' } };
    const res = mockRes();

    await responderFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('feedbackController - listagem', () => {
  it('listarFeedbacks retorna todos', async () => {
    await Feedback.create({ criado_por_usuario_id: autor._id, descricao: 'A' });
    await Feedback.create({ criado_por_usuario_id: autor._id, descricao: 'B' });
    const res = mockRes();

    await listarFeedbacks({}, res);

    expect(res.json.mock.calls[0][0]).toHaveLength(2);
  });

  it('listarMeusFeedbacks retorna apenas os do usuário logado', async () => {
    const outro = await Usuario.create({ nome: 'Outro', email: 'o@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    await Feedback.create({ criado_por_usuario_id: autor._id, descricao: 'Meu' });
    await Feedback.create({ criado_por_usuario_id: outro._id, descricao: 'Dele' });
    const res = mockRes();

    await listarMeusFeedbacks({ usuario: { id: autor._id.toString() } }, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].descricao).toBe('Meu');
  });
});

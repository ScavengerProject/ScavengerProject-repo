import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Notificacao from '../../../src/models/Notificacao.js';
import {
  criarNotificacao,
  listarNotificacoes,
  contarNotificacoesNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  obterNotificacao,
  deletarNotificacao,
} from '../../../src/notificacoes/notificacaoController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const usuarioId = new mongoose.Types.ObjectId();
const outroUsuarioId = new mongoose.Types.ObjectId();

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
  await Notificacao.deleteMany({});
});

const semear = (over = {}) =>
  Notificacao.create({
    usuario_id: usuarioId,
    tipo: 'COMUNICADO',
    titulo: 'Aviso',
    mensagem: 'Mensagem',
    ...over,
  });

describe('criarNotificacao (helper)', () => {
  it('persiste a notificação (o enfileiramento de email é mockado/no-op)', async () => {
    const n = await criarNotificacao(usuarioId, 'NOVA_PROVA', 'Título', 'Msg');
    expect(n._id).toBeDefined();
    expect(await Notificacao.countDocuments({ usuario_id: usuarioId })).toBe(1);
  });
});

describe('listarNotificacoes', () => {
  it('retorna apenas as do usuário autenticado', async () => {
    await semear();
    await semear({ usuario_id: outroUsuarioId });
    const res = mockRes();

    await listarNotificacoes({ usuario: { id: usuarioId }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('filtra por lida e por tipo', async () => {
    await semear({ lida: true, tipo: 'COMUNICADO' });
    await semear({ lida: false, tipo: 'PENALIDADE' });
    const res = mockRes();

    await listarNotificacoes({ usuario: { id: usuarioId }, query: { lida: 'false' } }, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].tipo).toBe('PENALIDADE');
  });
});

describe('contarNotificacoesNaoLidas', () => {
  it('conta apenas as não lidas do usuário', async () => {
    await semear({ lida: false });
    await semear({ lida: false });
    await semear({ lida: true });
    const res = mockRes();

    await contarNotificacoesNaoLidas({ usuario: { id: usuarioId } }, res);

    expect(res.json).toHaveBeenCalledWith({ contagem: 2 });
  });
});

describe('marcarComoLida', () => {
  it('marca a notificação como lida', async () => {
    const n = await semear({ lida: false });
    const res = mockRes();

    await marcarComoLida({ params: { id: n._id.toString() }, usuario: { id: usuarioId } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Notificacao.findById(n._id)).lida).toBe(true);
  });

  it('retorna 404 para notificação de outro usuário', async () => {
    const n = await semear({ usuario_id: outroUsuarioId });
    const res = mockRes();

    await marcarComoLida({ params: { id: n._id.toString() }, usuario: { id: usuarioId } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('marcarTodasComoLidas', () => {
  it('marca todas as não lidas do usuário', async () => {
    await semear({ lida: false });
    await semear({ lida: false });
    const res = mockRes();

    await marcarTodasComoLidas({ usuario: { id: usuarioId } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ atualizadas: 2 }));
    expect(await Notificacao.countDocuments({ usuario_id: usuarioId, lida: false })).toBe(0);
  });
});

describe('obterNotificacao / deletarNotificacao', () => {
  it('obterNotificacao retorna 404 quando não existe', async () => {
    const res = mockRes();
    await obterNotificacao({ params: { id: new mongoose.Types.ObjectId().toString() }, usuario: { id: usuarioId } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletarNotificacao remove a notificação do próprio usuário', async () => {
    const n = await semear();
    const res = mockRes();

    await deletarNotificacao({ params: { id: n._id.toString() }, usuario: { id: usuarioId } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await Notificacao.findById(n._id)).toBeNull();
  });

  it('deletarNotificacao retorna 404 para notificação de outro usuário', async () => {
    const n = await semear({ usuario_id: outroUsuarioId });
    const res = mockRes();

    await deletarNotificacao({ params: { id: n._id.toString() }, usuario: { id: usuarioId } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(await Notificacao.findById(n._id)).not.toBeNull();
  });
});

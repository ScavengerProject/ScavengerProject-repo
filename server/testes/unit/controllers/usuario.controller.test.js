import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

import Usuario from '../../../src/models/Usuario.js';
import {
  criarUsuario,
  registrarUsuario,
  atualizarUsuario,
  deletarUsuario,
  alternarStatusUsuario,
  listarUsuarios,
  obterUsuario,
  obterEstatisticas,
} from '../../../src/usuarios/usuarioController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

// ID do admin que executa as ações (usado em deletar/alternarStatus).
const adminId = new mongoose.Types.ObjectId().toString();

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Usuario.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Usuario.deleteMany({});
});

describe('usuarioController - criarUsuario', () => {
  it('cria usuário, oculta a senha na resposta e faz hash no banco', async () => {
    const req = { body: { nome: 'João', email: 'Joao@X.com', senha: 'segredo123', tipo: 'PROFESSOR' } };
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.usuario.senha).toBeUndefined();
    expect(payload.usuario.email).toBe('joao@x.com'); // normalizado p/ minúsculas

    const noBanco = await Usuario.findOne({ email: 'joao@x.com' });
    expect(noBanco.senha).not.toBe('segredo123'); // hash aplicado
    expect(await bcrypt.compare('segredo123', noBanco.senha)).toBe(true);
  });

  it('retorna 400 quando faltam campos obrigatórios', async () => {
    const req = { body: { nome: 'Sem email' } };
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 409 quando o email já existe', async () => {
    await Usuario.create({ nome: 'Existente', email: 'dup@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = { body: { nome: 'Outro', email: 'DUP@x.com', senha: '123', tipo: 'PROFESSOR' } };
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('retorna 400 quando ALUNO/COORDENADOR não informam turma', async () => {
    const req = { body: { nome: 'Aluno', email: 'aluno@x.com', senha: '123', tipo: 'ALUNO' } };
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Turma') }));
  });
});

describe('usuarioController - registrarUsuario (auto-cadastro)', () => {
  it('cria como ALUNO e responde com mensagem de aprovação', async () => {
    const req = { body: { nome: 'Novo', email: 'novo@x.com', senha: '123456' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cadastro enviado para aprovação!' })
    );
    const criado = await Usuario.findOne({ email: 'novo@x.com' });
    expect(criado.tipo).toBe('ALUNO');
  });

  it('retorna 409 para email duplicado', async () => {
    await Usuario.create({ nome: 'A', email: 'reg@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = { body: { nome: 'B', email: 'reg@x.com', senha: '123' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('usuarioController - atualizarUsuario', () => {
  it('atualiza campos e re-hasheia a senha quando informada', async () => {
    const u = await Usuario.create({ nome: 'Antigo', email: 'a@x.com', senha: 'velha123', tipo: 'PROFESSOR' });
    const req = { params: { id: u._id.toString() }, body: { nome: 'Atualizado', senha: 'nova12345' } };
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(u._id);
    expect(atualizado.nome).toBe('Atualizado');
    expect(await bcrypt.compare('nova12345', atualizado.senha)).toBe(true);
  });

  it('retorna 404 quando o usuário não existe', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, body: { nome: 'X' } };
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando o novo email já pertence a outro usuário', async () => {
    await Usuario.create({ nome: 'Dono', email: 'dono@x.com', senha: '123', tipo: 'PROFESSOR' });
    const u = await Usuario.create({ nome: 'Eu', email: 'eu@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = { params: { id: u._id.toString() }, body: { email: 'dono@x.com' } };
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('usuarioController - deletarUsuario', () => {
  it('deleta um usuário existente', async () => {
    const u = await Usuario.create({ nome: 'Del', email: 'del@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = { params: { id: u._id.toString() }, usuario: { id: adminId } };
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await Usuario.findById(u._id)).toBeNull();
  });

  it('retorna 403 ao tentar deletar a própria conta', async () => {
    const req = { params: { id: adminId }, usuario: { id: adminId } };
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 404 quando o usuário não existe', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, usuario: { id: adminId } };
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('usuarioController - alternarStatusUsuario', () => {
  it('define o status diretamente (ex.: BANIDO)', async () => {
    const u = await Usuario.create({ nome: 'S', email: 's@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = { params: { id: u._id.toString() }, body: { status: 'BANIDO' }, usuario: { id: adminId } };
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Usuario.findById(u._id)).status).toBe('BANIDO');
  });

  it('alterna ATIVO↔INATIVO quando nenhum status é informado', async () => {
    const u = await Usuario.create({ nome: 'T', email: 't@x.com', senha: '123', tipo: 'PROFESSOR', status: 'ATIVO' });
    const req = { params: { id: u._id.toString() }, body: {}, usuario: { id: adminId } };
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect((await Usuario.findById(u._id)).status).toBe('INATIVO');
  });

  it('retorna 400 para status inválido', async () => {
    const u = await Usuario.create({ nome: 'U', email: 'u@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = { params: { id: u._id.toString() }, body: { status: 'FANTASIA' }, usuario: { id: adminId } };
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 403 ao alterar o status da própria conta', async () => {
    const req = { params: { id: adminId }, body: { status: 'INATIVO' }, usuario: { id: adminId } };
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('usuarioController - leitura (listar/obter/estatísticas)', () => {
  it('lista filtrando por tipo e sem expor senha', async () => {
    await Usuario.create({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    await Usuario.create({ nome: 'P', email: 'p@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = { query: { tipo: 'ALUNO' } };
    const res = mockRes();

    await listarUsuarios(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].tipo).toBe('ALUNO');
    expect(lista[0].senha).toBeUndefined();
  });

  it('busca por nome via parâmetro search', async () => {
    await Usuario.create({ nome: 'Mariana Silva', email: 'm@x.com', senha: '123', tipo: 'PROFESSOR' });
    await Usuario.create({ nome: 'Carlos', email: 'c@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = { query: { search: 'mariana' } };
    const res = mockRes();

    await listarUsuarios(req, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Mariana Silva');
  });

  it('obterUsuario retorna 404 para id inexistente', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await obterUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('obterEstatisticas agrega totais por status e tipo', async () => {
    await Usuario.create({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' });
    await Usuario.create({ nome: 'B', email: 'b@x.com', senha: '123', tipo: 'ALUNO', turma: 'EM - 1º Ano', status: 'INATIVO' });
    await Usuario.create({ nome: 'C', email: 'c@x.com', senha: '123', tipo: 'PROFESSOR', status: 'ATIVO' });
    const req = {};
    const res = mockRes();

    await obterEstatisticas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const stats = res.json.mock.calls[0][0];
    expect(stats.total).toBe(3);
    expect(stats.ativos).toBe(2);
    expect(stats.inativos).toBe(1);
    expect(stats.porTipo.ALUNO).toBe(2);
    expect(stats.porTipo.PROFESSOR).toBe(1);
  });
});

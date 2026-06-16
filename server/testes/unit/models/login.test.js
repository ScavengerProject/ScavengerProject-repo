import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

import { login } from '../../../src/auth/authController.js'; 
import Usuario from '../../../src/models/Usuario.js';

let mongoServer;

describe('Auth Controller (Integration Test - Login)', () => {
  // inicia um servidor MongoDB na memória
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  // para o servidor e desconecta
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // limpa os dados para garantir que um teste não interfira no outro
  afterEach(async () => {
    await Usuario.deleteMany({});
  });

  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {
        email: 'teste.real@exemplo.com',
        senha: 'senhasegura123',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Teste 1: Credenciais Corretas ---
  it('deve logar com sucesso e retornar um token com credenciais válidas', async () => {
    await new Usuario({
      nome: 'Usuário Real de Teste',
      email: 'teste.real@exemplo.com',
      senha: 'senhasegura123',
      tipo: 'ALUNO',
    }).save();

    await login(req, res);

    //Confere o resultado
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.any(String),
    }));
  });

  // --- Teste 2: Credenciais Erradas ---
  it('deve retornar status 401 com senha incorreta', async () => {
    const senhaHasheada = await bcrypt.hash('senhaSegura123', 10);
    await new Usuario({
      nome: 'Usuário Real de Teste',
      email: 'teste.real@exemplo.com',
      senha: senhaHasheada,
      tipo: 'ALUNO',
    }).save();

    //tenta logar com a senha errada
    req.body.senha = 'senhaTotalmenteErrada';

    await login(req, res);

    //Confere o erro
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email ou senha inválidos.' });
  });

  // --- Teste 3: Email inexistente ---
  it('deve retornar 401 quando o email não existe', async () => {
    req.body.email = 'naoexiste@exemplo.com';

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email ou senha inválidos.' });
  });

  // --- Teste 4: Campos faltando ---
  it('deve retornar 400 quando email ou senha não são fornecidos', async () => {
    req.body = { email: '' };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  // --- Teste 5: Compatibilidade com campo "password" ---
  it('deve aceitar o campo "password" como alternativa a "senha"', async () => {
    await new Usuario({
      nome: 'Usuário Password',
      email: 'teste.real@exemplo.com',
      senha: 'senhasegura123',
      tipo: 'ALUNO',
    }).save();

    req.body = { email: 'teste.real@exemplo.com', password: 'senhasegura123' };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });
});
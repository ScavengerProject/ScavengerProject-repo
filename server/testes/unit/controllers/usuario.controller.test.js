import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

import Usuario from '../../../src/models/Usuario.js';
import Escola from '../../../src/models/Escola.js';
import CodigoConvite from '../../../src/models/CodigoConvite.js';
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

// Multi-escola: o controller é escopado por `req.escolaId`, injetado em produção
// pelo middleware resolverEscola. ESCOLA_B existe para provar o isolamento.
const escolaId = 'ESCOLA_TESTE';
const outraEscolaId = 'ESCOLA_B';

// Requisição autenticada padrão, já dentro do escopo da escola de teste.
const reqBase = (extra = {}) => ({
  escolaId,
  usuario: { id: adminId, tipo: 'ADMIN' },
  ...extra,
});

// Cria usuário já vinculado a uma escola (o vínculo é obrigatório na prática).
const criarNoBanco = (dados, escolas = [escolaId]) =>
  Usuario.create({
    ...dados,
    // O papel vive no vínculo com a escola (multi-escola: papel por tenant).
    vinculos: escolas.map((escola_id) => ({
      escola_id,
      tipo: dados.tipo === 'SUPER_ADMIN' ? 'ADMIN' : dados.tipo,
      turma: dados.turma ?? null,
      status: dados.status || 'ATIVO',
    })),
  });

// PENDENTE só existe no VÍNCULO (Usuario.status não aceita esse valor no enum).
// Reproduz exatamente o que registrarUsuario grava para um código público da
// escola: conta ATIVA, vínculo PENDENTE e sem turma.
const criarPendente = (dados) =>
  Usuario.create({
    ...dados,
    tipo: 'ALUNO',
    turma: null,
    status: 'ATIVO',
    vinculos: [{ escola_id: escolaId, tipo: 'ALUNO', turma: null, status: 'PENDENTE' }],
  });

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

beforeEach(async () => {
  await Escola.create([
    { _id: escolaId, nome: 'Escola Teste', status: 'ATIVA', criado_por: adminId },
    { _id: outraEscolaId, nome: 'Escola B', status: 'ATIVA', criado_por: adminId },
  ]);
});

afterEach(async () => {
  await Usuario.deleteMany({});
  await Escola.deleteMany({});
  await CodigoConvite.deleteMany({});
});

// Helper: cria um código de convite válido para os testes de registrarUsuario.
const criarConvite = (dados = {}) =>
  CodigoConvite.create({
    codigo: dados.codigo || 'TESTE1234',
    escola_id: dados.escola_id || escolaId,
    turma: dados.turma !== undefined ? dados.turma : 'EF - 6º Ano',
    aprovacao_automatica: dados.aprovacao_automatica !== undefined ? dados.aprovacao_automatica : true,
    ano_letivo: new Date().getFullYear(),
    expira_em: dados.expira_em || new Date(Date.now() + 86400000),
    limite_usos: dados.limite_usos ?? null,
    usos: dados.usos || 0,
    revogado_em: dados.revogado_em || null,
    criado_por: adminId,
  });

describe('usuarioController - criarUsuario', () => {
  it('cria usuário, oculta a senha na resposta e faz hash no banco', async () => {
    const req = reqBase({ body: { nome: 'João', email: 'Joao@X.com', senha: 'segredo123', tipo: 'PROFESSOR' } });
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

  it('vincula o novo usuário à escola ativa', async () => {
    const req = reqBase({ body: { nome: 'Vinculado', email: 'v@x.com', senha: '123', tipo: 'PROFESSOR' } });
    const res = mockRes();

    await criarUsuario(req, res);

    const noBanco = await Usuario.findOne({ email: 'v@x.com' });
    expect(noBanco.vinculos.map((v) => String(v.escola_id))).toEqual([escolaId]);
  });

  it('retorna 400 quando faltam campos obrigatórios', async () => {
    const req = reqBase({ body: { nome: 'Sem email' } });
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 409 quando o email já existe NESTA escola', async () => {
    await criarNoBanco({ nome: 'Existente', email: 'dup@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = reqBase({ body: { nome: 'Outro', email: 'DUP@x.com', senha: '123', tipo: 'PROFESSOR' } });
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].codigo).toBeUndefined();
  });

  it('retorna 409 com código próprio quando o email pertence a outra escola', async () => {
    // Uma pessoa = um login. Aqui o caminho correto é vincular, não recriar.
    await criarNoBanco(
      { nome: 'Professor da B', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR' },
      [outraEscolaId]
    );
    const req = reqBase({ body: { nome: 'Professor', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR' } });
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].codigo).toBe('USUARIO_EM_OUTRA_ESCOLA');
  });

  it('impede um ADMIN de criar um SUPER_ADMIN', async () => {
    const req = reqBase({ body: { nome: 'Escalada', email: 'esc@x.com', senha: '123', tipo: 'SUPER_ADMIN' } });
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 400 quando ALUNO/COORDENADOR não informam turma', async () => {
    const req = reqBase({ body: { nome: 'Aluno', email: 'aluno@x.com', senha: '123', tipo: 'ALUNO' } });
    const res = mockRes();

    await criarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Turma') }));
  });
});

describe('usuarioController - registrarUsuario (auto-cadastro por código de convite)', () => {
  it('cria como ALUNO na escola/turma do código e responde com mensagem de sucesso (código de turma = ATIVO)', async () => {
    const convite = await criarConvite();
    const req = { body: { nome: 'Novo', email: 'novo@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cadastro realizado com sucesso!' })
    );
    const criado = await Usuario.findOne({ email: 'novo@x.com' });
    expect(criado.tipo).toBe('ALUNO');
    expect(criado.vinculos[0].escola_id).toBe(escolaId);
    expect(criado.vinculos[0].turma).toBe('EF - 6º Ano');
    expect(criado.vinculos[0].status).toBe('ATIVO');
    expect(criado.vinculos[0].codigo_convite_id.toString()).toBe(convite._id.toString());

    expect((await CodigoConvite.findById(convite._id)).usos).toBe(1);
  });

  // Regressão da falha original: escola_id no corpo é ignorado — quem decide
  // a escola é o código de convite.
  it('ignora um escola_id enviado no corpo: a escola vem sempre do código', async () => {
    const convite = await criarConvite({ escola_id: escolaId });
    const req = {
      body: {
        nome: 'Hostil', email: 'hostil@x.com', senha: '123456',
        codigo: convite.codigo, escola_id: outraEscolaId,
      },
    };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const criado = await Usuario.findOne({ email: 'hostil@x.com' });
    expect(criado.vinculos[0].escola_id).toBe(escolaId); // não outraEscolaId
  });

  it('código público da escola (sem turma) cria vínculo PENDENTE', async () => {
    const convite = await criarConvite({ turma: null, aprovacao_automatica: false });
    const req = { body: { nome: 'Fila', email: 'fila@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cadastro enviado para aprovação!' })
    );
    const criado = await Usuario.findOne({ email: 'fila@x.com' });
    expect(criado.vinculos[0].status).toBe('PENDENTE');
  });

  it('retorna 400 quando nenhum código é informado', async () => {
    const req = { body: { nome: 'Sem código', email: 'sem@x.com', senha: '123456' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando o código não existe', async () => {
    const req = { body: { nome: 'X', email: 'x@x.com', senha: '123456', codigo: 'NAOEXISTE' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 404 (mesma mensagem) para código revogado', async () => {
    const convite = await criarConvite({ codigo: 'REVOGADO1', revogado_em: new Date() });
    const req = { body: { nome: 'X', email: 'y@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 404 para código expirado', async () => {
    const convite = await criarConvite({ codigo: 'EXPIRADO1', expira_em: new Date(Date.now() - 1000) });
    const req = { body: { nome: 'X', email: 'z@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 404 para código que já bateu o limite de usos', async () => {
    const convite = await criarConvite({ codigo: 'LIMITADO1', limite_usos: 1, usos: 1 });
    const req = { body: { nome: 'X', email: 'w@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('normaliza o código digitado (minúsculas/hífen) antes de validar', async () => {
    const convite = await criarConvite({ codigo: 'ABCD1234' });
    const req = { body: { nome: 'Normalizado', email: 'norm@x.com', senha: '123456', codigo: 'abcd-1234' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 409 genérico (anti-enumeração) para email duplicado', async () => {
    await criarNoBanco({ nome: 'A', email: 'reg@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const convite = await criarConvite();
    const req = { body: { nome: 'B', email: 'reg@x.com', senha: '123', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    // Mensagem não pode confirmar que a conta já existe.
    expect(res.json.mock.calls[0][0].message).not.toMatch(/já está cadastrado/i);
  });

  // A tela de cadastro não pré-valida mais o código, então o envio é a única
  // chance de crítica: precisa vir a lista COMPLETA de motivos, senão a pessoa
  // reenvia o formulário uma vez por erro para descobrir o resto.
  it('acumula os erros: código inválido E email já usado voltam juntos em `erros`', async () => {
    await criarNoBanco({ nome: 'A', email: 'dois@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = { body: { nome: 'B', email: 'dois@x.com', senha: '123456', codigo: 'NAOEXISTE' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    const corpo = res.json.mock.calls[0][0];
    expect(corpo.erros).toHaveLength(2);
    expect(corpo.erros[0]).toMatch(/inválido ou expirado/i);
    expect(corpo.erros[1]).toMatch(/não foi possível concluir o cadastro/i);
    // Mesmo com dois erros, o status segue a ordem original das checagens.
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('um único erro também vem em `erros` (lista de um), com o mesmo status de antes', async () => {
    const req = { body: { nome: 'X', email: 'so-codigo@x.com', senha: '123456', codigo: 'NAOEXISTE' } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].erros).toEqual(['Código de convite inválido ou expirado.']);
  });

  it('não cria a conta quando o email já existe, mesmo com código válido', async () => {
    await criarNoBanco({ nome: 'A', email: 'unico@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const convite = await criarConvite({ codigo: 'DUPLIC123' });
    const req = { body: { nome: 'B', email: 'unico@x.com', senha: '123456', codigo: convite.codigo } };
    const res = mockRes();

    await registrarUsuario(req, res);

    expect(await Usuario.countDocuments({ email: 'unico@x.com' })).toBe(1);
    // E o código não pode ter sido consumido por uma tentativa recusada.
    expect((await CodigoConvite.findById(convite._id)).usos).toBe(0);
  });
});

describe('usuarioController - atualizarUsuario', () => {
  it('atualiza campos e re-hasheia a senha quando informada', async () => {
    const u = await criarNoBanco({ nome: 'Antigo', email: 'a@x.com', senha: 'velha123', tipo: 'PROFESSOR' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { nome: 'Atualizado', senha: 'nova12345' } });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(u._id);
    expect(atualizado.nome).toBe('Atualizado');
    expect(await bcrypt.compare('nova12345', atualizado.senha)).toBe(true);
  });

  it('retorna 404 quando o usuário não existe', async () => {
    const req = reqBase({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { nome: 'X' } });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 404 para usuário de outra escola (isolamento)', async () => {
    const alheio = await criarNoBanco(
      { nome: 'Alheio', email: 'alheio@x.com', senha: '123', tipo: 'PROFESSOR' },
      [outraEscolaId]
    );
    const req = reqBase({ params: { id: alheio._id.toString() }, body: { nome: 'Invadido' } });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect((await Usuario.findById(alheio._id)).nome).toBe('Alheio');
  });

  it('retorna 409 quando o novo email já pertence a outro usuário', async () => {
    await criarNoBanco({ nome: 'Dono', email: 'dono@x.com', senha: '123', tipo: 'PROFESSOR' });
    const u = await criarNoBanco({ nome: 'Eu', email: 'eu@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { email: 'dono@x.com' } });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  // Mesma porta dos fundos do toggle: o modal de edição também manda `status`.
  it('recusa mudar o status de um vínculo PENDENTE', async () => {
    const u = await criarPendente({ nome: 'Pend', email: 'pend3@x.com', senha: '123' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { status: 'ATIVO' } });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].codigo).toBe('APROVACAO_PELA_FILA');
    const doc = await Usuario.findById(u._id);
    expect(doc.vinculos[0].status).toBe('PENDENTE');
  });

  it('ainda permite corrigir nome/turma de um pendente (só o status é bloqueado)', async () => {
    const u = await criarPendente({ nome: 'Pend', email: 'pend4@x.com', senha: '123' });
    const req = reqBase({
      params: { id: u._id.toString() },
      body: { nome: 'Nome Corrigido', turma: 'EF - 6º Ano' },
    });
    const res = mockRes();

    await atualizarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const doc = await Usuario.findById(u._id);
    expect(doc.nome).toBe('Nome Corrigido');
    expect(doc.vinculos[0].turma).toBe('EF - 6º Ano');
    expect(doc.vinculos[0].status).toBe('PENDENTE');
  });
});

describe('usuarioController - deletarUsuario', () => {
  it('deleta um usuário que só existe nesta escola', async () => {
    const u = await criarNoBanco({ nome: 'Del', email: 'del@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = reqBase({ params: { id: u._id.toString() } });
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await Usuario.findById(u._id)).toBeNull();
  });

  it('apenas remove o vínculo quando o usuário atua em outra escola', async () => {
    const u = await criarNoBanco(
      { nome: 'Multi', email: 'multi@x.com', senha: '123', tipo: 'PROFESSOR' },
      [escolaId, outraEscolaId]
    );
    const req = reqBase({ params: { id: u._id.toString() } });
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const aindaExiste = await Usuario.findById(u._id);
    expect(aindaExiste).not.toBeNull();
    expect(aindaExiste.vinculos.map((v) => String(v.escola_id))).toEqual([outraEscolaId]);
  });

  it('retorna 403 ao tentar deletar a própria conta', async () => {
    const req = reqBase({ params: { id: adminId } });
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 404 quando o usuário não existe', async () => {
    const req = reqBase({ params: { id: new mongoose.Types.ObjectId().toString() } });
    const res = mockRes();

    await deletarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// O status é do VÍNCULO com a escola ativa (multi-escola), não do cadastro
// global: banir alguém aqui não pode banir a mesma pessoa na outra escola.
const statusNaEscola = async (id) => {
  const doc = await Usuario.findById(id);
  return doc.vinculos.find((v) => String(v.escola_id) === escolaId)?.status;
};

describe('usuarioController - alternarStatusUsuario', () => {
  it('define o status diretamente (ex.: BANIDO)', async () => {
    const u = await criarNoBanco({ nome: 'S', email: 's@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { status: 'BANIDO' } });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await statusNaEscola(u._id)).toBe('BANIDO');
  });

  it('alterna ATIVO↔INATIVO quando nenhum status é informado', async () => {
    const u = await criarNoBanco({ nome: 'T', email: 't@x.com', senha: '123', tipo: 'PROFESSOR', status: 'ATIVO' });
    const req = reqBase({ params: { id: u._id.toString() }, body: {} });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(await statusNaEscola(u._id)).toBe('INATIVO');
  });

  it('retorna 400 para status inválido', async () => {
    const u = await criarNoBanco({ nome: 'U', email: 'u@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { status: 'FANTASIA' } });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 403 ao alterar o status da própria conta', async () => {
    const req = reqBase({ params: { id: adminId }, body: { status: 'INATIVO' } });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  // Regressão: vínculo PENDENTE é uma solicitação, e só decidirPendencia pode
  // resolvê-la (é lá que a turma vira obrigatória e o vínculo de origem sai numa
  // transferência). Aprovar pelo toggle de Gerenciar Usuários deixava o aluno
  // ATIVO com turma null -> GRUPO_INDETERMINADO na inscrição em prova.
  it('recusa promover um vínculo PENDENTE a ATIVO (aprovação só pela fila)', async () => {
    const u = await criarPendente({ nome: 'Pendente', email: 'pend@x.com', senha: '123' });
    const req = reqBase({ params: { id: u._id.toString() }, body: { status: 'ATIVO' } });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].codigo).toBe('APROVACAO_PELA_FILA');
    expect(await statusNaEscola(u._id)).toBe('PENDENTE');
  });

  it('recusa também o toggle sem status explícito sobre um PENDENTE', async () => {
    const u = await criarPendente({ nome: 'Pendente2', email: 'pend2@x.com', senha: '123' });
    const req = reqBase({ params: { id: u._id.toString() }, body: {} });
    const res = mockRes();

    await alternarStatusUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(await statusNaEscola(u._id)).toBe('PENDENTE');
  });
});

describe('usuarioController - leitura (listar/obter/estatísticas)', () => {
  it('lista filtrando por tipo e sem expor senha', async () => {
    await criarNoBanco({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    await criarNoBanco({ nome: 'P', email: 'p@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = reqBase({ query: { tipo: 'ALUNO' } });
    const res = mockRes();

    await listarUsuarios(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].tipo).toBe('ALUNO');
    expect(lista[0].senha).toBeUndefined();
  });

  it('não lista usuários de outra escola (isolamento)', async () => {
    await criarNoBanco({ nome: 'Daqui', email: 'daqui@x.com', senha: '123', tipo: 'PROFESSOR' });
    await criarNoBanco(
      { nome: 'Dali', email: 'dali@x.com', senha: '123', tipo: 'PROFESSOR' },
      [outraEscolaId]
    );
    const req = reqBase({ query: {} });
    const res = mockRes();

    await listarUsuarios(req, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Daqui');
  });

  it('busca por nome via parâmetro search', async () => {
    await criarNoBanco({ nome: 'Mariana Silva', email: 'm@x.com', senha: '123', tipo: 'PROFESSOR' });
    await criarNoBanco({ nome: 'Carlos', email: 'c@x.com', senha: '123', tipo: 'PROFESSOR' });
    const req = reqBase({ query: { search: 'mariana' } });
    const res = mockRes();

    await listarUsuarios(req, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Mariana Silva');
  });

  it('obterUsuario retorna 404 para id inexistente', async () => {
    const req = reqBase({ params: { id: new mongoose.Types.ObjectId().toString() } });
    const res = mockRes();

    await obterUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('obterUsuario retorna 404 para usuário de outra escola', async () => {
    const alheio = await criarNoBanco(
      { nome: 'Alheio', email: 'alheio@x.com', senha: '123', tipo: 'PROFESSOR' },
      [outraEscolaId]
    );
    const req = reqBase({ params: { id: alheio._id.toString() } });
    const res = mockRes();

    await obterUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('obterEstatisticas agrega totais por status e tipo dentro da escola', async () => {
    await criarNoBanco({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' });
    await criarNoBanco({ nome: 'B', email: 'b@x.com', senha: '123', tipo: 'ALUNO', turma: 'EM - 1º Ano', status: 'INATIVO' });
    await criarNoBanco({ nome: 'C', email: 'c@x.com', senha: '123', tipo: 'PROFESSOR', status: 'ATIVO' });
    // Não deve entrar na conta: pertence a outra escola.
    await criarNoBanco(
      { nome: 'D', email: 'd@x.com', senha: '123', tipo: 'PROFESSOR', status: 'ATIVO' },
      [outraEscolaId]
    );
    const req = reqBase({});
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

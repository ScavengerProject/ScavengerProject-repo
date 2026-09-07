import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import Usuario from '../../../src/models/Usuario.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import {
  calcularStatusProva,
  criarProva,
  obterProva,
  atualizarProva,
  deletarProva,
  atualizarRequisitoUsuario,
  verificarInscricao,
  listarProvas,
  inscreverUsuarioNaProva,
} from '../../../src/provas/provaController.js';
import { emailQueue } from '../../../src/notificacoes/emailQueue.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const adminId = new mongoose.Types.ObjectId().toString();
const umDia = 24 * 60 * 60 * 1000;
const umHora = 60 * 60 * 1000;

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
  await Prova.deleteMany({});
  await ProvaUsuario.deleteMany({});
  await Usuario.deleteMany({});
  await EquipeMembros.deleteMany({});
});

describe('calcularStatusProva (lógica pura de status por datas)', () => {
  it('retorna NAO_INICIADA quando a data de início é no futuro', () => {
    const futuro = new Date(Date.now() + 30 * umDia);
    expect(calcularStatusProva(futuro, null)).toBe('NAO_INICIADA');
  });

  it('retorna EM_ANDAMENTO quando já iniciou e não tem término', () => {
    const passado = new Date(Date.now() - 5 * umDia);
    expect(calcularStatusProva(passado, null)).toBe('EM_ANDAMENTO');
  });

  it('retorna CONCLUIDA quando a data de término já passou', () => {
    const inicio = new Date(Date.now() - 10 * umDia);
    const fim = new Date(Date.now() - 2 * umDia);
    expect(calcularStatusProva(inicio, fim)).toBe('CONCLUIDA');
  });

  it('considera o horário: início daqui a poucas horas -> NAO_INICIADA', () => {
    const daquiAUmaHora = new Date(Date.now() + umHora);
    expect(calcularStatusProva(daquiAUmaHora, null)).toBe('NAO_INICIADA');
  });

  it('considera o horário: término há poucas horas -> CONCLUIDA', () => {
    const inicio = new Date(Date.now() - 5 * umHora);
    const fim = new Date(Date.now() - umHora);
    expect(calcularStatusProva(inicio, fim)).toBe('CONCLUIDA');
  });
});

describe('provaController - criarProva', () => {
  it('cria a prova com status derivado das datas', async () => {
    const req = {
      usuario: { id: adminId },
      body: {
        titulo: 'Prova X',
        descricao: 'desc',
        formato: 'PROVA_PRATICA',
        data_inicio: new Date(Date.now() - 5 * umDia),
      },
    };
    const res = mockRes();

    await criarProva(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const prova = res.json.mock.calls[0][0];
    expect(prova.titulo).toBe('Prova X');
    expect(prova.status).toBe('EM_ANDAMENTO');
  });

  it('retorna 400 quando faltam título/descrição/formato', async () => {
    const req = { usuario: { id: adminId }, body: { titulo: 'Só título' } };
    const res = mockRes();

    await criarProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('provaController - obter/atualizar/deletar', () => {
  const baseProva = () => ({
    titulo: 'Base',
    descricao: 'd',
    formato: 'PROVA_PRATICA',
    data_inicio: new Date(Date.now() - 5 * umDia),
    pontuacao: { '1': 100 },
    criado_por_usuario_id: adminId,
  });

  it('obterProva retorna 404 quando não existe', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await obterProva(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('obterProva retorna a prova com status recalculado', async () => {
    const prova = await Prova.create(baseProva());
    const req = { params: { id: prova._id.toString() } };
    const res = mockRes();

    await obterProva(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe('EM_ANDAMENTO');
  });

  it('atualizarProva ignora status manual e recalcula pelas datas', async () => {
    const prova = await Prova.create(baseProva());
    const req = {
      params: { id: prova._id.toString() },
      body: { titulo: 'Renomeada', status: 'CONCLUIDA' }, // status manual deve ser ignorado
    };
    const res = mockRes();

    await atualizarProva(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = res.json.mock.calls[0][0];
    expect(atualizada.titulo).toBe('Renomeada');
    expect(atualizada.status).toBe('EM_ANDAMENTO');
  });

  it('atualizarProva retorna 404 quando não existe', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, body: { titulo: 'X' } };
    const res = mockRes();

    await atualizarProva(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletarProva remove e retorna 200; 404 quando não existe', async () => {
    const prova = await Prova.create(baseProva());
    const res1 = mockRes();
    await deletarProva({ params: { id: prova._id.toString() } }, res1);
    expect(res1.status).toHaveBeenCalledWith(200);
    expect(await Prova.findById(prova._id)).toBeNull();

    const res2 = mockRes();
    await deletarProva({ params: { id: new mongoose.Types.ObjectId().toString() } }, res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });
});

describe('provaController - atualizarRequisitoUsuario', () => {
  it('retorna 400 quando requisito_usuario não é objeto', async () => {
    const prova = await Prova.create({
      titulo: 'R', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(), pontuacao: { '1': 100 }, criado_por_usuario_id: adminId,
    });
    const req = { params: { id: prova._id.toString() }, body: { requisito_usuario: 'texto' } };
    const res = mockRes();

    await atualizarRequisitoUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('atualiza as cotas com sucesso', async () => {
    const prova = await Prova.create({
      titulo: 'R', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(), pontuacao: { '1': 100 }, criado_por_usuario_id: adminId,
    });
    const req = {
      params: { id: prova._id.toString() },
      body: { requisito_usuario: { ALUNOS_FUNDAMENTAL: 3 } },
    };
    const res = mockRes();

    await atualizarRequisitoUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = await Prova.findById(prova._id);
    expect(atualizada.requisito_usuario.ALUNOS_FUNDAMENTAL).toBe(3);
  });
});

describe('provaController - #18 publicação e visibilidade', () => {
  const baseProvaPub = (overrides = {}) => ({
    titulo: 'P',
    descricao: 'd',
    formato: 'PROVA_PRATICA',
    data_inicio: new Date(Date.now() - umDia),
    pontuacao: { '1': 100 },
    criado_por_usuario_id: adminId,
    ...overrides,
  });

  it('listarProvas oculta provas não publicadas para não-ADMIN', async () => {
    await Prova.create(baseProvaPub({ titulo: 'Publica' }));
    await Prova.create(baseProvaPub({ titulo: 'Agendada', data_publicacao: new Date(Date.now() + umDia) }));

    const res = mockRes();
    await listarProvas({ usuario: { tipo: 'ALUNO' } }, res);

    const titulos = res.json.mock.calls[0][0].map((p) => p.titulo);
    expect(titulos).toContain('Publica');
    expect(titulos).not.toContain('Agendada');
  });

  it('listarProvas mostra também as provas agendadas para ADMIN', async () => {
    await Prova.create(baseProvaPub({ titulo: 'Agendada', data_publicacao: new Date(Date.now() + umDia) }));

    const res = mockRes();
    await listarProvas({ usuario: { tipo: 'ADMIN' } }, res);

    const titulos = res.json.mock.calls[0][0].map((p) => p.titulo);
    expect(titulos).toContain('Agendada');
  });

  it('obterProva retorna 404 para não-ADMIN quando ainda não publicada', async () => {
    const prova = await Prova.create(baseProvaPub({ data_publicacao: new Date(Date.now() + umDia) }));
    const res = mockRes();

    await obterProva({ params: { id: prova._id.toString() }, usuario: { tipo: 'ALUNO' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('obterProva retorna a prova agendada para ADMIN', async () => {
    const prova = await Prova.create(baseProvaPub({ data_publicacao: new Date(Date.now() + umDia) }));
    const res = mockRes();

    await obterProva({ params: { id: prova._id.toString() }, usuario: { tipo: 'ADMIN' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('criarProva agenda a notificação quando a publicação é futura', async () => {
    emailQueue.add.mockClear();
    const req = {
      usuario: { id: adminId },
      body: {
        titulo: 'Futura',
        descricao: 'd',
        formato: 'PROVA_PRATICA',
        data_inicio: new Date(),
        data_publicacao: new Date(Date.now() + umDia),
      },
    };
    const res = mockRes();

    await criarProva(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].notificacao_publicacao_enviada).toBe(false);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'publicarProva',
      expect.objectContaining({ tipo: 'PUBLICAR_PROVA' }),
      expect.objectContaining({ delay: expect.any(Number) })
    );
  });

  it('criarProva dispara imediatamente quando não há data de publicação', async () => {
    const req = {
      usuario: { id: adminId },
      body: { titulo: 'Imediata', descricao: 'd', formato: 'PROVA_PRATICA', data_inicio: new Date() },
    };
    const res = mockRes();

    await criarProva(req, res);

    expect(res.json.mock.calls[0][0].notificacao_publicacao_enviada).toBe(true);
  });
});

describe('provaController - verificarInscricao', () => {
  it('retorna inscrito=false quando não há inscrição', async () => {
    const prova = await Prova.create({
      titulo: 'I', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(), pontuacao: { '1': 100 }, criado_por_usuario_id: adminId,
    });
    const req = { params: { id: prova._id.toString() }, usuario: { id: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await verificarInscricao(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ inscrito: false }));
  });

  it('retorna inscrito=true quando há inscrição', async () => {
    const prova = await Prova.create({
      titulo: 'I2', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(), pontuacao: { '1': 100 }, criado_por_usuario_id: adminId,
    });
    const usuarioId = new mongoose.Types.ObjectId();
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: usuarioId });
    const req = { params: { id: prova._id.toString() }, usuario: { id: usuarioId.toString() } };
    const res = mockRes();

    await verificarInscricao(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ inscrito: true }));
  });
});

describe('provaController - inscreverUsuarioNaProva (grupo/ano escolar por vínculo)', () => {
  const criarProvaComCota = (overrides) => Prova.create({
    titulo: 'Prova com cota', descricao: 'd', formato: 'PROVA_PRATICA',
    data_inicio: new Date(Date.now() - 24 * 60 * 60 * 1000),
    pontuacao: { '1': 100 },
    criado_por_usuario_id: adminId,
    requisito_usuario: { ALUNOS_FUNDAMENTAL: 5, ALUNOS_MEDIO: 5 },
    ...overrides,
  });

  it('determina o grupo pela turma do VÍNCULO — quem entrou por convite (turma só no vínculo) consegue se inscrever', async () => {
    const escolaId = 'ESCOLA_X';
    const prova = await criarProvaComCota();
    // Igual a um cadastro por convite: campo legado `turma` fica null, a turma
    // real só existe no vínculo daquela escola (ver registrarUsuario).
    const aluno = await Usuario.create({
      nome: 'Aluno Convite', email: 'aluno-convite@x.com', senha: '123',
      tipo: 'ALUNO', turma: null,
      vinculos: [{ escola_id: escolaId, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });
    await EquipeMembros.create({ equipe_id: new mongoose.Types.ObjectId(), usuario_id: aluno._id, is_coordenador: false });

    const req = {
      params: { id: prova._id.toString() },
      body: {},
      usuario: { id: aluno._id.toString(), tipo: 'ALUNO' },
      escolaId,
    };
    const res = mockRes();

    await inscreverUsuarioNaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna GRUPO_INDETERMINADO quando não há turma nem no vínculo nem no campo legado', async () => {
    const escolaId = 'ESCOLA_X';
    const prova = await criarProvaComCota();
    const aluno = await Usuario.create({
      nome: 'Aluno Sem Turma', email: 'aluno-sem-turma@x.com', senha: '123',
      tipo: 'ALUNO', turma: null,
      vinculos: [{ escola_id: escolaId, tipo: 'ALUNO', turma: null }],
    });
    await EquipeMembros.create({ equipe_id: new mongoose.Types.ObjectId(), usuario_id: aluno._id, is_coordenador: false });

    const req = {
      params: { id: prova._id.toString() },
      body: {},
      usuario: { id: aluno._id.toString(), tipo: 'ALUNO' },
      escolaId,
    };
    const res = mockRes();

    await inscreverUsuarioNaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'GRUPO_INDETERMINADO' }));
  });

  it('conta as vagas do grupo usando a turma do vínculo de cada inscrito já existente', async () => {
    const escolaId = 'ESCOLA_X';
    const prova = await criarProvaComCota({ requisito_usuario: { ALUNOS_FUNDAMENTAL: 1, ALUNOS_MEDIO: 5 } });

    const jaInscrito = await Usuario.create({
      nome: 'Já Inscrito', email: 'ja-inscrito@x.com', senha: '123',
      tipo: 'ALUNO', turma: null,
      vinculos: [{ escola_id: escolaId, tipo: 'ALUNO', turma: 'EF - 7º Ano' }],
    });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: jaInscrito._id, gincana_id: 'G1' });

    const novoAluno = await Usuario.create({
      nome: 'Novo Aluno', email: 'novo-aluno@x.com', senha: '123',
      tipo: 'ALUNO', turma: null,
      vinculos: [{ escola_id: escolaId, tipo: 'ALUNO', turma: 'EF - 8º Ano' }],
    });
    await EquipeMembros.create({ equipe_id: new mongoose.Types.ObjectId(), usuario_id: novoAluno._id, is_coordenador: false });

    const req = {
      params: { id: prova._id.toString() },
      body: {},
      usuario: { id: novoAluno._id.toString(), tipo: 'ALUNO' },
      escolaId,
    };
    const res = mockRes();

    await inscreverUsuarioNaProva(req, res);

    // Cota de fundamental já era 1 e o "Já Inscrito" (também fundamental, via
    // vínculo) já ocupou a vaga — sem ler o vínculo essa contagem daria 0.
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VAGAS_ESGOTADAS' }));
  });

  it('recusa inscrever um usuário que já não tem vínculo ATIVO com esta escola (transferido para outra)', async () => {
    const escolaId = 'ESCOLA_X';
    const prova = await criarProvaComCota();
    // Simula quem já se transferiu: o vínculo com ESCOLA_X foi removido, só
    // resta o vínculo (ATIVO) na escola de destino.
    const transferido = await Usuario.create({
      nome: 'Transferido', email: 'transferido@x.com', senha: '123',
      tipo: 'ALUNO', turma: null,
      vinculos: [{ escola_id: 'ESCOLA_DESTINO', tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });
    // EquipeMembros da escola antiga não é removido numa transferência —
    // é justamente essa a brecha que este teste cobre.
    await EquipeMembros.create({ equipe_id: new mongoose.Types.ObjectId(), usuario_id: transferido._id, is_coordenador: false });

    const req = {
      params: { id: prova._id.toString() },
      body: { usuario_id: transferido._id.toString() },
      usuario: { id: adminId, tipo: 'COORDENADOR' },
      escolaId,
    };
    const res = mockRes();

    await inscreverUsuarioNaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SEM_VINCULO_ESCOLA' }));
  });

  it('não filtra por vínculo quando o usuário nunca teve nenhum (instalação legada)', async () => {
    const escolaId = 'ESCOLA_X';
    const prova = await criarProvaComCota();
    const alunoLegado = await Usuario.create({
      nome: 'Aluno Legado', email: 'aluno-legado@x.com', senha: '123',
      tipo: 'ALUNO', turma: 'EF - 6º Ano',
    });
    await EquipeMembros.create({ equipe_id: new mongoose.Types.ObjectId(), usuario_id: alunoLegado._id, is_coordenador: false });

    const req = {
      params: { id: prova._id.toString() },
      body: {},
      usuario: { id: alunoLegado._id.toString(), tipo: 'ALUNO' },
      escolaId,
    };
    const res = mockRes();

    await inscreverUsuarioNaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

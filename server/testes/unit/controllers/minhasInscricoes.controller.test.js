import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../../../src/models/ProvaEquipeParticipacao.js';
import EmprestimoEquipe from '../../../src/models/EmprestimoEquipe.js';
import MigracaoEquipe from '../../../src/models/MigracaoEquipe.js';
import Usuario from '../../../src/models/Usuario.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import { listarMinhasInscricoes } from '../../../src/provas/provaParticipacaoController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const corpo = (res) => res.json.mock.calls[0][0];

const GINCANA = 'GINCANA_PRINCIPAL';
const ESCOLA = 'ESCOLA_X';
const umDia = 24 * 60 * 60 * 1000;

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
  await Promise.all([
    Prova.deleteMany({}), ProvaUsuario.deleteMany({}), ProvaEquipeParticipacao.deleteMany({}),
    EmprestimoEquipe.deleteMany({}), MigracaoEquipe.deleteMany({}), Usuario.deleteMany({}),
    Equipe.deleteMany({}), EquipeGincana.deleteMany({}), EquipeMembros.deleteMany({}),
  ]);
});

let seq = 0;
const criarAluno = async (nome = 'Aluno') => {
  seq += 1;
  return Usuario.create({
    nome, email: `u${seq}@x.com`, senha: '123', tipo: 'ALUNO', turma: null,
    vinculos: [{ escola_id: ESCOLA, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
  });
};

const criarEquipe = async (nome) => {
  const equipe = await Equipe.create({ nome, cor: '#111', gincana_id: GINCANA });
  const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: GINCANA });
  return { equipe, eg };
};

const criarProva = (titulo, diasAtras = 1, overrides = {}) => Prova.create({
  titulo, descricao: 'd', formato: 'PROVA_PRATICA',
  data_inicio: new Date(Date.now() - diasAtras * umDia),
  data_fim: new Date(Date.now() - diasAtras * umDia + 3600000),
  pontuacao: { 1: 100 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  gincana_id: GINCANA,
  requisito_usuario: { ALUNOS_FUNDAMENTAL: 5 },
  ...overrides,
});

const reqDe = (usuario) => ({
  usuario: { id: usuario._id.toString(), tipo: 'ALUNO' },
  escolaId: ESCOLA,
  gincanaId: GINCANA,
});

describe('listarMinhasInscricoes', () => {
  it('lista só as provas em que o usuário está inscrito', async () => {
    const aluno = await criarAluno();
    const { equipe } = await criarEquipe('Time Azul');
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id });

    const inscrita = await criarProva('Inscrita');
    await criarProva('Nao Inscrita');
    await ProvaUsuario.create({ prova_id: inscrita._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(corpo(res).inscricoes.map((i) => i.prova.titulo)).toEqual(['Inscrita']);
    expect(corpo(res).equipe_atual).toEqual(expect.objectContaining({ nome: 'Time Azul' }));
  });

  it('devolve lista vazia sem erro quando não há inscrição', async () => {
    const aluno = await criarAluno();

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(corpo(res)).toEqual(expect.objectContaining({ total: 0, inscricoes: [] }));
  });

  it('ignora inscrições de provas de OUTRA gincana', async () => {
    const aluno = await criarAluno();
    const outra = await Prova.create({
      titulo: 'De Outra Edicao', descricao: 'd', formato: 'PROVA_PRATICA',
      data_inicio: new Date(), pontuacao: { 1: 10 },
      criado_por_usuario_id: new mongoose.Types.ObjectId(),
      gincana_id: 'GINCANA_ANTIGA', requisito_usuario: { ALUNOS_FUNDAMENTAL: 5 },
    });
    await ProvaUsuario.create({ prova_id: outra._id, usuario_id: aluno._id, gincana_id: 'GINCANA_ANTIGA' });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes).toEqual([]);
  });

  it('não descarta inscrição antiga sem gincana_id materializado', async () => {
    // Documentos anteriores a `migrar:gincana` não têm o campo. Filtrar por ele
    // faria a inscrição sumir da tela sem erro nenhum — por isso o filtro é
    // pela gincana da PROVA.
    const aluno = await criarAluno();
    const { equipe } = await criarEquipe('Time Azul');
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id });
    const prova = await criarProva('Prova Antiga');
    await ProvaUsuario.collection.insertOne({
      prova_id: prova._id, usuario_id: aluno._id, createdAt: new Date(), updatedAt: new Date(),
    });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes.map((i) => i.prova.titulo)).toEqual(['Prova Antiga']);
  });

  it('esconde prova ainda não publicada de quem não é admin', async () => {
    const aluno = await criarAluno();
    const prova = await criarProva('Agendada', 1, { data_publicacao: new Date(Date.now() + umDia) });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes).toEqual([]);
  });
});

describe('listarMinhasInscricoes - a equipe pela qual participou', () => {
  it('usa a equipe da ESCALAÇÃO, com o papel de titular/suplente', async () => {
    const aluno = await criarAluno();
    const { equipe } = await criarEquipe('Time Azul');
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id });

    const prova = await criarProva('Com escalacao');
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await ProvaEquipeParticipacao.create({
      prova_id: prova._id, equipe_id: equipe._id, gincana_id: GINCANA,
      titulares_usuario_ids: [], suplentes_usuario_ids: [aluno._id],
      definido_por_usuario_id: new mongoose.Types.ObjectId(),
    });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes[0]).toEqual(expect.objectContaining({
      origem_vinculo: 'ESCALACAO',
      papel: 'SUPLENTE',
      equipe: expect.objectContaining({ nome: 'Time Azul' }),
    }));
  });

  it('mostra a equipe de DESTINO quando participou emprestado, junto com a de origem', async () => {
    const aluno = await criarAluno();
    const { equipe: minha, eg: egMinha } = await criarEquipe('Time Azul');
    const { eg: egOutra } = await criarEquipe('Time Vermelho');
    await EquipeMembros.create({ equipe_id: minha._id, usuario_id: aluno._id });

    const prova = await criarProva('Emprestado');
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await EmprestimoEquipe.create({
      usuario_id: aluno._id, gincana_id: GINCANA, prova_id: prova._id,
      equipe_origem_id: egMinha._id, equipe_destino_id: egOutra._id,
      status: 'ATIVO', criado_por: new mongoose.Types.ObjectId(),
    });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    const linha = corpo(res).inscricoes[0];
    expect(linha).toEqual(expect.objectContaining({
      origem_vinculo: 'EMPRESTIMO',
      emprestado: true,
      equipe: expect.objectContaining({ nome: 'Time Vermelho' }),
      equipe_origem_emprestimo: expect.objectContaining({ nome: 'Time Azul' }),
      equipe_atual_diferente: true,
    }));
  });

  it('marca emprestado mesmo quando a escalação já aponta a equipe de destino', async () => {
    const aluno = await criarAluno();
    const { equipe: minha, eg: egMinha } = await criarEquipe('Time Azul');
    const { equipe: outra, eg: egOutra } = await criarEquipe('Time Vermelho');
    await EquipeMembros.create({ equipe_id: minha._id, usuario_id: aluno._id });

    const prova = await criarProva('Emprestado e escalado');
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await EmprestimoEquipe.create({
      usuario_id: aluno._id, gincana_id: GINCANA, prova_id: prova._id,
      equipe_origem_id: egMinha._id, equipe_destino_id: egOutra._id,
      status: 'ATIVO', criado_por: new mongoose.Types.ObjectId(),
    });
    await ProvaEquipeParticipacao.create({
      prova_id: prova._id, equipe_id: outra._id, gincana_id: GINCANA,
      titulares_usuario_ids: [aluno._id], suplentes_usuario_ids: [],
      definido_por_usuario_id: new mongoose.Types.ObjectId(),
    });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes[0]).toEqual(expect.objectContaining({
      origem_vinculo: 'ESCALACAO',
      papel: 'TITULAR',
      emprestado: true,
      equipe: expect.objectContaining({ nome: 'Time Vermelho' }),
      equipe_origem_emprestimo: expect.objectContaining({ nome: 'Time Azul' }),
    }));
  });

  it('reconstrói a equipe anterior para provas ANTES de uma migração aprovada', async () => {
    // EquipeMembros só guarda a equipe atual: sem a linha do tempo das
    // migrações, uma prova disputada pelo time antigo apareceria como se
    // tivesse sido jogada pelo time novo.
    const aluno = await criarAluno();
    const { eg: egAntiga } = await criarEquipe('Time Antigo');
    const { equipe: nova, eg: egNova } = await criarEquipe('Time Novo');
    await EquipeMembros.create({ equipe_id: nova._id, usuario_id: aluno._id });

    const antes = await criarProva('Antes da migracao', 10);
    const depois = await criarProva('Depois da migracao', 2);
    await ProvaUsuario.create({ prova_id: antes._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await ProvaUsuario.create({ prova_id: depois._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const migracao = await MigracaoEquipe.create({
      usuario_id: aluno._id, gincana_id: GINCANA,
      equipe_origem_id: egAntiga._id, equipe_destino_id: egNova._id,
      status: 'APROVADA', solicitado_por: aluno._id,
    });
    // `timestamps` sobrescreve o campo no create; a data da decisão é o que
    // posiciona a migração na linha do tempo.
    await MigracaoEquipe.collection.updateOne(
      { _id: migracao._id },
      { $set: { atualizado_em: new Date(Date.now() - 5 * umDia) } }
    );

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    const porTitulo = Object.fromEntries(corpo(res).inscricoes.map((i) => [i.prova.titulo, i]));
    expect(porTitulo['Antes da migracao']).toEqual(expect.objectContaining({
      origem_vinculo: 'HISTORICO',
      equipe: expect.objectContaining({ nome: 'Time Antigo' }),
      equipe_atual_diferente: true,
    }));
    expect(porTitulo['Depois da migracao']).toEqual(expect.objectContaining({
      origem_vinculo: 'ATUAL',
      equipe: expect.objectContaining({ nome: 'Time Novo' }),
      equipe_atual_diferente: false,
    }));
  });

  it('ignora migração REJEITADA na linha do tempo', async () => {
    const aluno = await criarAluno();
    const { eg: egOutra } = await criarEquipe('Time Recusado');
    const { equipe: minha, eg: egMinha } = await criarEquipe('Time Azul');
    await EquipeMembros.create({ equipe_id: minha._id, usuario_id: aluno._id });

    const prova = await criarProva('Prova', 10);
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await MigracaoEquipe.create({
      usuario_id: aluno._id, gincana_id: GINCANA,
      equipe_origem_id: egOutra._id, equipe_destino_id: egMinha._id,
      status: 'REJEITADA', solicitado_por: aluno._id,
    });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes[0]).toEqual(expect.objectContaining({
      origem_vinculo: 'ATUAL',
      equipe: expect.objectContaining({ nome: 'Time Azul' }),
    }));
  });

  it('não quebra quando a pessoa ainda não tem equipe nesta gincana', async () => {
    const aluno = await criarAluno();
    const prova = await criarProva('Sem equipe');
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(corpo(res).equipe_atual).toBeNull();
    expect(corpo(res).inscricoes[0].equipe).toBeNull();
  });

  it('ordena da prova mais recente para a mais antiga', async () => {
    const aluno = await criarAluno();
    const { equipe } = await criarEquipe('Time Azul');
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id });

    const antiga = await criarProva('Antiga', 30);
    const recente = await criarProva('Recente', 1);
    await ProvaUsuario.create({ prova_id: antiga._id, usuario_id: aluno._id, gincana_id: GINCANA });
    await ProvaUsuario.create({ prova_id: recente._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMinhasInscricoes(reqDe(aluno), res);

    expect(corpo(res).inscricoes.map((i) => i.prova.titulo)).toEqual(['Recente', 'Antiga']);
  });
});

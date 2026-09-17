import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import Usuario from '../../../src/models/Usuario.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import { listarProvas } from '../../../src/provas/provaController.js';
import { listarEquipeParticipanteDaProva } from '../../../src/provas/provaParticipacaoController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const ESCOLA = 'ESCOLA_X';
const GINCANA = 'GINCANA_PRINCIPAL';

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
    Prova.deleteMany({}), ProvaUsuario.deleteMany({}), Usuario.deleteMany({}),
    Equipe.deleteMany({}), EquipeGincana.deleteMany({}), EquipeMembros.deleteMany({}),
  ]);
});

let seq = 0;
const criarUsuario = async ({ nome = 'Aluno', tipo = 'ALUNO', turma = 'EF - 6º Ano' } = {}) => {
  seq += 1;
  return Usuario.create({
    nome, email: `u${seq}@x.com`, senha: '123', tipo, turma: null,
    vinculos: [{ escola_id: ESCOLA, tipo, turma }],
  });
};

const criarProva = (titulo, requisito_usuario = { ALUNOS_FUNDAMENTAL: 2 }) => Prova.create({
  titulo, descricao: 'd', formato: 'PROVA_PRATICA',
  data_inicio: new Date(Date.now() - 86400000),
  pontuacao: { 1: 100 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  gincana_id: GINCANA,
  requisito_usuario,
});

const comEquipe = async (usuario) => {
  const equipe = await Equipe.create({
    nome: `Equipe ${new mongoose.Types.ObjectId()}`, cor: '#111', gincana_id: GINCANA,
  });
  await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: GINCANA });
  await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: usuario._id });
  return equipe;
};

const req = (usuario, tipo = 'ALUNO') => ({
  usuario: { id: usuario._id.toString(), tipo },
  escolaId: ESCOLA,
  gincanaId: GINCANA,
});

describe('listarProvas - cotas e elegibilidade do próprio usuário', () => {
  // Antes a tela só calculava "existe alguma cota > 0" e escondia o resto: a
  // única forma de saber que o seu ano escolar não entrava era clicar em
  // Inscrever-se e levar 422.
  it('devolve as cotas de cada prova, só com os grupos que ela aceita', async () => {
    const aluno = await criarUsuario();
    await comEquipe(aluno);
    await criarProva('Só fundamental', { ALUNOS_FUNDAMENTAL: 5, ALUNOS_MEDIO: 0 });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    const [prova] = res.json.mock.calls[0][0];
    expect(prova.cotas).toEqual([
      expect.objectContaining({ grupo: 'ALUNOS_FUNDAMENTAL', limite: 5, inscritos: 0, restantes: 5 }),
    ]);
  });

  it('desconta as vagas já ocupadas, contando o grupo pelo vínculo', async () => {
    const aluno = await criarUsuario({ nome: 'Eu' });
    await comEquipe(aluno);
    const outro = await criarUsuario({ nome: 'Outro', turma: 'EF - 9º Ano' });
    const prova = await criarProva('Com um inscrito', { ALUNOS_FUNDAMENTAL: 3 });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: outro._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    expect(res.json.mock.calls[0][0][0].cotas[0]).toEqual(
      expect.objectContaining({ inscritos: 1, restantes: 2 })
    );
  });

  it('diz que o aluno do fundamental NÃO se encaixa numa prova só de médio', async () => {
    const aluno = await criarUsuario({ turma: 'EF - 6º Ano' });
    await comEquipe(aluno);
    await criarProva('Só médio', { ALUNOS_MEDIO: 5 });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    expect(res.json.mock.calls[0][0][0].minha_elegibilidade).toEqual(
      expect.objectContaining({ ok: false, code: 'GRUPO_NAO_PERMITIDO' })
    );
  });

  it('marca como elegível quem se encaixa', async () => {
    const aluno = await criarUsuario({ turma: 'EM - 1º Ano' });
    await comEquipe(aluno);
    await criarProva('Só médio', { ALUNOS_MEDIO: 5 });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    expect(res.json.mock.calls[0][0][0].minha_elegibilidade).toEqual(
      expect.objectContaining({ ok: true, grupo: 'ALUNOS_MEDIO' })
    );
  });

  it('reporta JA_INSCRITO para quem já se inscreveu', async () => {
    const aluno = await criarUsuario();
    await comEquipe(aluno);
    const prova = await criarProva('Minha');
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: aluno._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    expect(res.json.mock.calls[0][0][0].minha_elegibilidade).toEqual(
      expect.objectContaining({ ok: false, code: 'JA_INSCRITO' })
    );
  });

  it('reporta VAGAS_ESGOTADAS quando o grupo do usuário lotou', async () => {
    const aluno = await criarUsuario({ nome: 'Eu' });
    await comEquipe(aluno);
    const outro = await criarUsuario({ nome: 'Outro', turma: 'EF - 7º Ano' });
    const prova = await criarProva('Uma vaga só', { ALUNOS_FUNDAMENTAL: 1 });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: outro._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarProvas(req(aluno), res);

    expect(res.json.mock.calls[0][0][0].minha_elegibilidade).toEqual(
      expect.objectContaining({ ok: false, code: 'VAGAS_ESGOTADAS' })
    );
  });

  it('não avalia elegibilidade para ADMIN, mas ainda devolve as cotas', async () => {
    const admin = await criarUsuario({ nome: 'Admin', tipo: 'ADMIN', turma: null });
    await criarProva('Qualquer');

    const res = mockRes();
    await listarProvas(req(admin, 'ADMIN'), res);

    const [prova] = res.json.mock.calls[0][0];
    expect(prova.minha_elegibilidade).toBeNull();
    expect(prova.cotas).toHaveLength(1);
  });

  it('não quebra quando a requisição não traz o id do usuário', async () => {
    // A listagem também é chamada em contextos sem `req.usuario.id`.
    await criarProva('Qualquer');

    const res = mockRes();
    await listarProvas({ usuario: { tipo: 'ALUNO' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0][0].minha_elegibilidade).toBeNull();
  });
});

describe('listarEquipeParticipanteDaProva - limitações explícitas', () => {
  it('devolve as cotas da prova junto com os membros escaláveis', async () => {
    // O coordenador escala entre os já inscritos e não esbarra na cota aqui —
    // mas é ela que explica por que metade da equipe não aparece na lista.
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const equipe = await Equipe.create({ nome: 'Time', cor: '#111', gincana_id: GINCANA });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: GINCANA });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coord._id, is_coordenador: true });

    const prova = await criarProva('Com cota', { ALUNOS_FUNDAMENTAL: 4 });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: coord._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarEquipeParticipanteDaProva(
      { params: { id: prova._id.toString() }, ...req(coord, 'COORDENADOR') },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].cotas).toEqual([
      expect.objectContaining({ grupo: 'ALUNOS_FUNDAMENTAL', limite: 4, inscritos: 1, restantes: 3 }),
    ]);
  });
});

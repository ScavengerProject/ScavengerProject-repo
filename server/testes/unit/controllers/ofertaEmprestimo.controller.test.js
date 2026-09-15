import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import Usuario from '../../../src/models/Usuario.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import EmprestimoEquipe from '../../../src/models/EmprestimoEquipe.js';
import OfertaEmprestimo from '../../../src/models/OfertaEmprestimo.js';
import SolicitacaoEmprestimo from '../../../src/models/SolicitacaoEmprestimo.js';
import Notificacao from '../../../src/models/Notificacao.js';
import { listarMembrosOfertaveis, criarOferta } from '../../../src/equipes/ofertaEmprestimoController.js';
import { visualizarEquipe } from '../../../src/equipes/equipeController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const corpoDaResposta = (res) => res.json.mock.calls[0][0];

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
    EmprestimoEquipe.deleteMany({}), OfertaEmprestimo.deleteMany({}),
    SolicitacaoEmprestimo.deleteMany({}), Notificacao.deleteMany({}),
  ]);
});

let seq = 0;

/**
 * Usuário do jeito que o cadastro por convite cria: `turma` de topo NULA e a
 * turma real só no vínculo com a escola. É essa forma que revela o bug de
 * "Sem turma" — um usuário com a turma no campo legado passaria em todo teste.
 */
const criarUsuario = async ({ nome, tipo = 'ALUNO', turma = 'EF - 6º Ano', status = 'ATIVO' }) => {
  seq += 1;
  return Usuario.create({
    nome, email: `u${seq}@x.com`, senha: '123', tipo, turma: null,
    vinculos: [{ escola_id: ESCOLA, tipo, turma, status }],
  });
};

const criarProva = (requisito_usuario = { ALUNOS_FUNDAMENTAL: 5, ALUNOS_MEDIO: 5 }) => Prova.create({
  titulo: 'Mostra de Talentos', descricao: 'd', formato: 'PROVA_PRATICA',
  data_inicio: new Date(Date.now() - 86400000),
  pontuacao: { 1: 100 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  gincana_id: GINCANA,
  requisito_usuario,
});

const criarEquipe = async (nome, coordenador, membros = []) => {
  const equipe = await Equipe.create({ nome, cor: '#111', gincana_id: GINCANA });
  const equipeGincana = await EquipeGincana.create({
    equipe_id: equipe._id, gincana_id: GINCANA, coordenador_usuario_id: coordenador._id,
  });
  await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordenador._id, is_coordenador: true });
  for (const membro of membros) {
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: membro._id, is_coordenador: false });
  }
  return { equipe, equipeGincana };
};

const criarSolicitacao = (equipeGincana, coordenador, prova, extras = {}) => SolicitacaoEmprestimo.create({
  coordenador_solicitante_id: coordenador._id,
  gincana_id: GINCANA,
  equipe_solicitante_id: equipeGincana._id,
  prova_id: prova._id,
  quantidade_solicitada: 1,
  motivo: 'Faltou gente',
  status: 'APROVADA',
  ...extras,
});

const reqDe = (coordenador, { params = {}, body = {} } = {}) => ({
  params,
  body,
  usuario: { id: coordenador._id.toString(), tipo: 'COORDENADOR' },
  escolaId: ESCOLA,
  gincanaId: GINCANA,
});

/** Cenário padrão: minha equipe (ofertante) e a equipe que pediu reforço. */
const montarCenario = async ({ requisito, criterios, quantidade = 1 } = {}) => {
  const prova = await criarProva(requisito);

  const euCoord = await criarUsuario({ nome: 'Coord Azul', tipo: 'COORDENADOR' });
  const elisa = await criarUsuario({ nome: 'Elisa', turma: 'EF - 7º Ano' });
  const guilherme = await criarUsuario({ nome: 'Guilherme', turma: 'EM - 1º Ano' });
  const minha = await criarEquipe('Equipe Azul', euCoord, [elisa, guilherme]);

  const outroCoord = await criarUsuario({ nome: 'Coord Verde', tipo: 'COORDENADOR' });
  const outra = await criarEquipe('Equipe Verde', outroCoord);

  const solicitacao = await criarSolicitacao(outra.equipeGincana, outroCoord, prova, {
    quantidade_solicitada: quantidade,
    ...(criterios ? { criterios } : {}),
  });

  return { prova, euCoord, elisa, guilherme, minha, outroCoord, outra, solicitacao };
};

const listar = async (coordenador, solicitacao) => {
  const res = mockRes();
  await listarMembrosOfertaveis(
    reqDe(coordenador, { params: { solicitacaoId: solicitacao._id.toString() } }),
    res
  );
  return { res, corpo: corpoDaResposta(res) };
};

const ofertar = async (coordenador, solicitacao, ids) => {
  const res = mockRes();
  await criarOferta(
    reqDe(coordenador, {
      body: { solicitacao_id: solicitacao._id.toString(), membros_oferecidos_ids: ids.map(String) },
    }),
    res
  );
  return { res, corpo: corpoDaResposta(res) };
};

describe('turma na tela de ofertar membros', () => {
  // O bug relatado: o modal mostrava "Sem turma" para a equipe inteira porque
  // o populate lia `Usuario.turma` (legado, null para quem entrou por convite)
  // em vez da turma do VÍNCULO com a escola ativa. Como consequência, nenhum
  // membro casava com os critérios de nível escolar da solicitação.
  it('devolve a turma do vínculo com a escola, não o campo legado', async () => {
    const { euCoord, solicitacao } = await montarCenario();

    const { corpo } = await listar(euCoord, solicitacao);

    const porNome = Object.fromEntries(corpo.membros.map((m) => [m.nome, m]));
    expect(porNome.Elisa.turma).toBe('EF - 7º Ano');
    expect(porNome.Guilherme.turma).toBe('EM - 1º Ano');
  });

  it('visualizarEquipe também projeta a turma do vínculo', async () => {
    const { euCoord } = await montarCenario();

    const res = mockRes();
    await visualizarEquipe(reqDe(euCoord), res);

    const turmas = corpoDaResposta(res).membros.map((m) => m.usuario_id.turma);
    expect(turmas).toEqual(expect.arrayContaining(['EF - 7º Ano', 'EM - 1º Ano']));
  });
});

describe('quem pode ser ofertado', () => {
  it('bloqueia quem já está inscrito na prova pela equipe de origem', async () => {
    const { prova, euCoord, elisa, solicitacao } = await montarCenario();
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: elisa._id, gincana_id: GINCANA });

    const { corpo } = await listar(euCoord, solicitacao);

    const elisaNaLista = corpo.membros.find((m) => m.nome === 'Elisa');
    expect(elisaNaLista).toMatchObject({ ofertavel: false, motivo_codigo: 'JA_INSCRITO_NA_PROVA' });

    const { res } = await ofertar(euCoord, solicitacao, [elisa._id]);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(await OfertaEmprestimo.countDocuments({})).toBe(0);
  });

  it('bloqueia quem já está emprestado nesta prova', async () => {
    const { prova, euCoord, elisa, minha, outra, solicitacao } = await montarCenario();
    await EmprestimoEquipe.create({
      usuario_id: elisa._id, gincana_id: GINCANA,
      equipe_origem_id: minha.equipeGincana._id, equipe_destino_id: outra.equipeGincana._id,
      prova_id: prova._id, status: 'ATIVO', criado_por: euCoord._id,
    });

    const { corpo } = await listar(euCoord, solicitacao);

    expect(corpo.membros.find((m) => m.nome === 'Elisa')).toMatchObject({
      ofertavel: false, motivo_codigo: 'JA_EMPRESTADO',
    });
  });

  it('bloqueia quem já está numa oferta minha ainda pendente para a mesma prova', async () => {
    const { euCoord, elisa, minha, solicitacao } = await montarCenario({ quantidade: 2 });
    await OfertaEmprestimo.create({
      solicitacao_id: solicitacao._id, gincana_id: GINCANA,
      coordenador_ofertante_id: euCoord._id, equipe_ofertante_id: minha.equipeGincana._id,
      membros_oferecidos: [{ usuario_id: elisa._id }], status: 'PENDENTE',
    });

    const { corpo } = await listar(euCoord, solicitacao);

    expect(corpo.membros.find((m) => m.nome === 'Elisa')).toMatchObject({
      ofertavel: false, motivo_codigo: 'JA_OFERTADO',
    });
  });

  it('bloqueia quem está fora dos níveis escolares pedidos pela equipe solicitante', async () => {
    const { euCoord, elisa, guilherme, solicitacao } = await montarCenario({
      criterios: { niveis_escolares: ['EM - 1º Ano'] },
    });

    const { corpo } = await listar(euCoord, solicitacao);

    const porNome = Object.fromEntries(corpo.membros.map((m) => [m.nome, m]));
    expect(porNome.Elisa).toMatchObject({ ofertavel: false, motivo_codigo: 'FORA_DOS_CRITERIOS' });
    expect(porNome.Guilherme.ofertavel).toBe(true);

    const { res } = await ofertar(euCoord, solicitacao, [elisa._id]);
    expect(res.status).toHaveBeenCalledWith(422);

    const aceita = await ofertar(euCoord, solicitacao, [guilherme._id]);
    expect(aceita.res.status).toHaveBeenCalledWith(201);
  });

  it('bloqueia o grupo que a prova não aceita', async () => {
    const { euCoord, solicitacao } = await montarCenario({
      requisito: { ALUNOS_FUNDAMENTAL: 0, ALUNOS_MEDIO: 3 },
    });

    const { corpo } = await listar(euCoord, solicitacao);

    const porNome = Object.fromEntries(corpo.membros.map((m) => [m.nome, m]));
    expect(porNome.Elisa).toMatchObject({ ofertavel: false, motivo_codigo: 'GRUPO_NAO_PERMITIDO' });
    expect(porNome.Guilherme.ofertavel).toBe(true);
  });

  it('recusa ofertar mais gente do que a solicitação pediu', async () => {
    const { euCoord, elisa, guilherme, solicitacao } = await montarCenario({ quantidade: 1 });

    const { res, corpo } = await ofertar(euCoord, solicitacao, [elisa._id, guilherme._id]);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(corpo.code).toBe('EXCEDE_QUANTIDADE_SOLICITADA');
    expect(await OfertaEmprestimo.countDocuments({})).toBe(0);
  });

  it('desconta do pedido os empréstimos que a equipe solicitante já recebeu', async () => {
    const { prova, euCoord, minha, outra, outroCoord, solicitacao } = await montarCenario({ quantidade: 1 });
    const jaEmprestado = await criarUsuario({ nome: 'Outro Aluno' });
    await EmprestimoEquipe.create({
      usuario_id: jaEmprestado._id, gincana_id: GINCANA,
      equipe_origem_id: minha.equipeGincana._id, equipe_destino_id: outra.equipeGincana._id,
      prova_id: prova._id, status: 'ATIVO', criado_por: outroCoord._id,
    });

    const { corpo } = await listar(euCoord, solicitacao);

    expect(corpo.vagas_restantes).toBe(0);
  });

  it('aceita a oferta válida e devolve a oferta criada', async () => {
    const { euCoord, elisa, solicitacao } = await montarCenario();

    const { res, corpo } = await ofertar(euCoord, solicitacao, [elisa._id]);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(corpo.membros_oferecidos).toHaveLength(1);
    // A turma do membro oferecido também sai do vínculo (a tela de gerenciar
    // ofertas mostra esse campo).
    expect(corpo.membros_oferecidos[0].usuario_id.turma).toBe('EF - 7º Ano');
    expect(await SolicitacaoEmprestimo.findById(solicitacao._id)).toMatchObject({ status: 'EM_ANDAMENTO' });
  });

  it('recusa ofertar para a própria solicitação', async () => {
    const { outroCoord, outra, solicitacao } = await montarCenario();
    const meuMembro = await criarUsuario({ nome: 'Membro Verde' });
    await EquipeMembros.create({ equipe_id: outra.equipe._id, usuario_id: meuMembro._id });

    const { res, corpo } = await ofertar(outroCoord, solicitacao, [meuMembro._id]);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(corpo.code).toBe('SOLICITACAO_PROPRIA');
  });
});

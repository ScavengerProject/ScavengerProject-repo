import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import Usuario from '../../../src/models/Usuario.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import {
  listarMembrosDaEquipeParaProva,
  inscreverMembrosDaEquipe,
} from '../../../src/provas/provaParticipacaoController.js';
import { inscreverUsuarioNaProva } from '../../../src/provas/provaController.js';

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
  ]);
});

let seq = 0;
const criarUsuario = async ({ nome, tipo = 'ALUNO', turma = 'EF - 6º Ano', escola = ESCOLA, status = 'ATIVO' }) => {
  seq += 1;
  return Usuario.create({
    nome, email: `u${seq}@x.com`, senha: '123', tipo, turma: null,
    vinculos: escola ? [{ escola_id: escola, tipo, turma, status }] : [],
  });
};

const criarProva = (requisito_usuario = { ALUNOS_FUNDAMENTAL: 5, ALUNOS_MEDIO: 5 }) => Prova.create({
  titulo: 'Prova', descricao: 'd', formato: 'PROVA_PRATICA',
  data_inicio: new Date(Date.now() - 86400000),
  pontuacao: { 1: 100 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  gincana_id: GINCANA,
  requisito_usuario,
});

/** Equipe na gincana da prova, com um coordenador e os membros informados. */
const criarEquipe = async (coordenador, membros = []) => {
  const equipe = await Equipe.create({
    nome: `Equipe ${new mongoose.Types.ObjectId()}`, cor: '#111', gincana_id: GINCANA,
  });
  await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: GINCANA });
  await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordenador._id, is_coordenador: true });
  for (const membro of membros) {
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: membro._id, is_coordenador: false });
  }
  return equipe;
};

const reqDe = (coordenador, provaId, body = {}) => ({
  params: { id: provaId.toString() },
  body,
  usuario: { id: coordenador._id.toString(), tipo: 'COORDENADOR' },
  escolaId: ESCOLA,
  gincanaId: GINCANA,
});

describe('coordenador inscreve membros da própria equipe — autorização', () => {
  // A rota de inscrição avulsa já liberava COORDENADOR com usuario_id explícito,
  // mas nunca checava de quem era aquele usuário: bastava pertencer a ALGUMA
  // equipe. Dava para inscrever gente de uma equipe adversária e queimar a cota
  // do grupo.
  it('recusa inscrever alguém de OUTRA equipe pela rota avulsa', async () => {
    const prova = await criarProva();
    const coordA = await criarUsuario({ nome: 'Coord A', tipo: 'COORDENADOR' });
    const coordB = await criarUsuario({ nome: 'Coord B', tipo: 'COORDENADOR' });
    const alheio = await criarUsuario({ nome: 'Membro do Adversário' });

    await criarEquipe(coordA, []);
    await criarEquipe(coordB, [alheio]);

    const res = mockRes();
    await inscreverUsuarioNaProva(reqDe(coordA, prova._id, { usuario_id: alheio._id.toString() }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(corpoDaResposta(res)).toEqual(expect.objectContaining({ code: 'NAO_AUTORIZADO' }));
    expect(await ProvaUsuario.countDocuments({ prova_id: prova._id })).toBe(0);
  });

  it('recusa o lote quando qualquer id não é da equipe do coordenador', async () => {
    const prova = await criarProva();
    const coordA = await criarUsuario({ nome: 'Coord A', tipo: 'COORDENADOR' });
    const coordB = await criarUsuario({ nome: 'Coord B', tipo: 'COORDENADOR' });
    const meu = await criarUsuario({ nome: 'Meu Membro' });
    const alheio = await criarUsuario({ nome: 'Membro do Adversário' });

    await criarEquipe(coordA, [meu]);
    await criarEquipe(coordB, [alheio]);

    const res = mockRes();
    await inscreverMembrosDaEquipe(
      reqDe(coordA, prova._id, { usuario_ids: [meu._id.toString(), alheio._id.toString()] }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    // Nada é inscrito: um id inválido invalida o lote inteiro, em vez de
    // inscrever "os que deram" e deixar o coordenador adivinhar o que passou.
    expect(await ProvaUsuario.countDocuments({ prova_id: prova._id })).toBe(0);
  });

  it('recusa quando o coordenador não coordena equipe nesta gincana', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord Sem Equipe', tipo: 'COORDENADOR' });

    const res = mockRes();
    await listarMembrosDaEquipeParaProva(reqDe(coord, prova._id), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('listarMembrosDaEquipeParaProva', () => {
  it('devolve TODOS os membros, marcando os inelegíveis com o motivo', async () => {
    const prova = await criarProva({ ALUNOS_FUNDAMENTAL: 5 }); // médio não entra
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const apto = await criarUsuario({ nome: 'Ana Apta', turma: 'EF - 6º Ano' });
    const doMedio = await criarUsuario({ nome: 'Bruno Medio', turma: 'EM - 1º Ano' });
    const semTurma = await criarUsuario({ nome: 'Carla Sem Turma', turma: null });
    const inscrito = await criarUsuario({ nome: 'Davi Inscrito', turma: 'EF - 7º Ano' });

    await criarEquipe(coord, [apto, doMedio, semTurma, inscrito]);
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: inscrito._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMembrosDaEquipeParaProva(reqDe(coord, prova._id), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = corpoDaResposta(res);

    // Esconder os inelegíveis faria a tela parecer quebrada — todos aparecem.
    expect(corpo.membros).toHaveLength(4);
    const porNome = Object.fromEntries(corpo.membros.map((m) => [m.nome, m]));

    expect(porNome['Ana Apta'].elegivel).toBe(true);
    expect(porNome['Bruno Medio']).toEqual(expect.objectContaining({
      elegivel: false, motivo_codigo: 'GRUPO_NAO_PERMITIDO',
    }));
    expect(porNome['Carla Sem Turma']).toEqual(expect.objectContaining({
      elegivel: false, motivo_codigo: 'GRUPO_INDETERMINADO',
    }));
    expect(porNome['Davi Inscrito']).toEqual(expect.objectContaining({
      elegivel: false, motivo_codigo: 'JA_INSCRITO',
    }));

    expect(corpo.total_elegiveis).toBe(1);
    // Elegíveis primeiro: é neles que o coordenador vai clicar.
    expect(corpo.membros[0].nome).toBe('Ana Apta');
  });

  it('não inclui o próprio coordenador (ele usa o botão "Inscrever-se")', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const membro = await criarUsuario({ nome: 'Membro' });
    await criarEquipe(coord, [membro]);

    const res = mockRes();
    await listarMembrosDaEquipeParaProva(reqDe(coord, prova._id), res);

    const nomes = corpoDaResposta(res).membros.map((m) => m.nome);
    expect(nomes).toEqual(['Membro']);
  });

  it('informa as vagas restantes por grupo, já descontando os inscritos', async () => {
    const prova = await criarProva({ ALUNOS_FUNDAMENTAL: 3 });
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const membro = await criarUsuario({ nome: 'Membro' });
    const jaInscrito = await criarUsuario({ nome: 'Ja Inscrito', turma: 'EF - 8º Ano' });
    await criarEquipe(coord, [membro, jaInscrito]);
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: jaInscrito._id, gincana_id: GINCANA });

    const res = mockRes();
    await listarMembrosDaEquipeParaProva(reqDe(coord, prova._id), res);

    const { cotas } = corpoDaResposta(res);
    // Só os grupos que a prova aceita aparecem.
    expect(cotas).toHaveLength(1);
    expect(cotas[0]).toEqual(expect.objectContaining({
      grupo: 'ALUNOS_FUNDAMENTAL', limite: 3, inscritos: 1, restantes: 2,
    }));
  });

  it('não lista um ex-membro que já não tem vínculo ativo com a escola', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const ficou = await criarUsuario({ nome: 'Ficou' });
    // Transferido: o vínculo com esta escola sumiu, mas a linha em EquipeMembros
    // continua como histórico.
    const transferido = await criarUsuario({ nome: 'Transferido', escola: 'ESCOLA_DESTINO' });
    await criarEquipe(coord, [ficou, transferido]);

    const res = mockRes();
    await listarMembrosDaEquipeParaProva(reqDe(coord, prova._id), res);

    expect(corpoDaResposta(res).membros.map((m) => m.nome)).toEqual(['Ficou']);
  });
});

describe('inscreverMembrosDaEquipe', () => {
  it('inscreve vários membros de uma vez', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const a = await criarUsuario({ nome: 'A' });
    const b = await criarUsuario({ nome: 'B' });
    await criarEquipe(coord, [a, b]);

    const res = mockRes();
    await inscreverMembrosDaEquipe(
      reqDe(coord, prova._id, { usuario_ids: [a._id.toString(), b._id.toString()] }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(corpoDaResposta(res).inscritos).toHaveLength(2);
    expect(await ProvaUsuario.countDocuments({ prova_id: prova._id })).toBe(2);
  });

  it('para na cota do grupo e explica quem ficou de fora', async () => {
    // 2 vagas para 3 candidatos do mesmo grupo: o lote é sequencial justamente
    // para a contagem fechar aqui. Em chamadas paralelas à rota avulsa, os três
    // liam "0 inscritos" antes de qualquer inserção e os três entravam.
    const prova = await criarProva({ ALUNOS_FUNDAMENTAL: 2 });
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const a = await criarUsuario({ nome: 'A' });
    const b = await criarUsuario({ nome: 'B' });
    const c = await criarUsuario({ nome: 'C' });
    await criarEquipe(coord, [a, b, c]);

    const res = mockRes();
    await inscreverMembrosDaEquipe(
      reqDe(coord, prova._id, { usuario_ids: [a._id.toString(), b._id.toString(), c._id.toString()] }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const corpo = corpoDaResposta(res);
    expect(corpo.inscritos).toHaveLength(2);
    expect(corpo.falhas).toEqual([
      expect.objectContaining({ nome: 'C', code: 'VAGAS_ESGOTADAS' }),
    ]);
    expect(await ProvaUsuario.countDocuments({ prova_id: prova._id })).toBe(2);
  });

  it('responde 422 quando nenhum membro pôde ser inscrito', async () => {
    const prova = await criarProva({ ALUNOS_MEDIO: 5 });
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const fundamental = await criarUsuario({ nome: 'Fundamental', turma: 'EF - 6º Ano' });
    await criarEquipe(coord, [fundamental]);

    const res = mockRes();
    await inscreverMembrosDaEquipe(
      reqDe(coord, prova._id, { usuario_ids: [fundamental._id.toString()] }),
      res
    );

    // 422 e não 200: assim o catch padrão do front mostra o erro sem caso especial.
    expect(res.status).toHaveBeenCalledWith(422);
    expect(corpoDaResposta(res).falhas[0]).toEqual(
      expect.objectContaining({ code: 'GRUPO_NAO_PERMITIDO' })
    );
  });

  it('recusa uma lista vazia', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    await criarEquipe(coord, []);

    const res = mockRes();
    await inscreverMembrosDaEquipe(reqDe(coord, prova._id, { usuario_ids: [] }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('ignora ids repetidos no mesmo lote', async () => {
    const prova = await criarProva();
    const coord = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const a = await criarUsuario({ nome: 'A' });
    await criarEquipe(coord, [a]);

    const res = mockRes();
    await inscreverMembrosDaEquipe(
      reqDe(coord, prova._id, { usuario_ids: [a._id.toString(), a._id.toString()] }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(corpoDaResposta(res).inscritos).toHaveLength(1);
    expect(await ProvaUsuario.countDocuments({ prova_id: prova._id })).toBe(1);
  });
});

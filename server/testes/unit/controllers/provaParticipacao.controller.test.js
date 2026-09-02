import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import ProvaUsuario from '../../../src/models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../../../src/models/ProvaEquipeParticipacao.js';
import EmprestimoEquipe from '../../../src/models/EmprestimoEquipe.js';
import {
  listarEquipeParticipanteDaProva,
  salvarEquipeParticipanteDaProva,
  listarAssociacoesProvas,
} from '../../../src/provas/provaParticipacaoController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

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
    Prova.deleteMany({}), Equipe.deleteMany({}), EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}), Usuario.deleteMany({}), ProvaEquipeParticipacao.deleteMany({}),
    ProvaUsuario.deleteMany({}), EmprestimoEquipe.deleteMany({}),
  ]);
});

const criarProva = (overrides) => Prova.create({
  titulo: 'Prova',
  descricao: 'desc',
  pontuacao: { tipo: 'FIXA', valor: 10 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  data_inicio: new Date('2026-01-01'),
  ...overrides,
});

const criarUsuario = (overrides) => Usuario.create({
  nome: 'Usuário', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
  email: `${new mongoose.Types.ObjectId()}@x.com`,
  ...overrides,
});

// Monta uma equipe (Equipe + EquipeGincana + EquipeMembros) com um coordenador
// e uma lista de membros comuns, todos na gincana informada (default: G1).
async function criarEquipeComMembros({ nome = 'Equipe', gincanaId = 'G1', coordenador, membros = [] } = {}) {
  const equipe = await Equipe.create({ nome, cor: '#123', gincana_id: gincanaId });
  const eg = await EquipeGincana.create({
    equipe_id: equipe._id, gincana_id: gincanaId, coordenador_usuario_id: coordenador._id,
  });
  await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordenador._id, is_coordenador: true });
  for (const membro of membros) {
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: membro._id, is_coordenador: false });
  }
  return { equipe, eg };
}

// A "prova anterior" (para a regra de membros consecutivos) precisa ser
// resolvida DENTRO da mesma gincana. Sem esse escopo, uma prova de outra
// edição/escola pode ser escolhida no lugar da prova anterior de verdade —
// vazando o título dela e deixando de bloquear quem realmente deveria.
describe('provaParticipacaoController - escopo de gincana na regra de membros consecutivos', () => {
  it('busca a prova anterior só dentro da mesma gincana, ignorando uma mais recente de outra edição', async () => {
    const coordenador = await Usuario.create({
      nome: 'Coord', email: 'coord@x.com', senha: '123', tipo: 'COORDENADOR', turma: 'EF - 6º Ano',
    });
    const aluno = await Usuario.create({
      nome: 'Aluno Bloqueado', email: 'aluno@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
    });

    const equipeG1 = await Equipe.create({ nome: 'Equipe G1', cor: '#111', gincana_id: 'GINCANA_1' });
    await EquipeGincana.create({ equipe_id: equipeG1._id, gincana_id: 'GINCANA_1', coordenador_usuario_id: coordenador._id });
    await EquipeMembros.create({ equipe_id: equipeG1._id, usuario_id: coordenador._id, is_coordenador: true });
    await EquipeMembros.create({ equipe_id: equipeG1._id, usuario_id: aluno._id, is_coordenador: false });

    // Prova anterior DE VERDADE: mesma gincana (G1), mais antiga.
    const provaAnteriorReal = await criarProva({
      gincana_id: 'GINCANA_1',
      titulo: 'Prova Real Anterior (G1)',
      data_inicio: new Date('2026-01-01'),
      proibir_membros_consecutivos: true,
    });
    await ProvaEquipeParticipacao.create({
      gincana_id: 'GINCANA_1',
      prova_id: provaAnteriorReal._id,
      equipe_id: equipeG1._id,
      titulares_usuario_ids: [aluno._id],
      suplentes_usuario_ids: [],
      definido_por_usuario_id: coordenador._id,
    });

    // Prova "isca": outra gincana (escola diferente), mas com data_inicio MAIS
    // PRÓXIMA da prova atual — é quem a query sem escopo escolheria.
    const provaIscaOutraGincana = await criarProva({
      gincana_id: 'GINCANA_2',
      titulo: 'Prova de Outra Escola',
      data_inicio: new Date('2026-01-15'),
      proibir_membros_consecutivos: true,
    });

    const provaAtual = await criarProva({
      gincana_id: 'GINCANA_1',
      titulo: 'Prova Atual (G1)',
      data_inicio: new Date('2026-02-01'),
    });

    const req = { params: { id: provaAtual._id.toString() }, usuario: { id: coordenador._id.toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];

    // A prova anterior identificada deve ser a de G1, não a isca de G2.
    expect(corpo.prova_anterior_titulo).toBe(provaAnteriorReal.titulo);
    expect(corpo.prova_anterior_titulo).not.toBe(provaIscaOutraGincana.titulo);
    // O aluno que participou da prova anterior real deve estar bloqueado.
    expect(corpo.membros_bloqueados_ids).toContain(String(aluno._id));
  });

  it('não deixa o coordenador de uma equipe de OUTRA gincana ver a participação de uma prova em que ele não tem equipe', async () => {
    const coordenador = await Usuario.create({
      nome: 'Coord de Outra Edição', email: 'coordoutra@x.com', senha: '123', tipo: 'COORDENADOR', turma: 'EF - 6º Ano',
    });

    // O único vínculo do coordenador é numa equipe da gincana 2 — não de G1.
    const equipeG2 = await Equipe.create({ nome: 'Equipe G2', cor: '#222', gincana_id: 'GINCANA_2' });
    await EquipeGincana.create({ equipe_id: equipeG2._id, gincana_id: 'GINCANA_2', coordenador_usuario_id: coordenador._id });
    await EquipeMembros.create({ equipe_id: equipeG2._id, usuario_id: coordenador._id, is_coordenador: true });

    const provaEmG1 = await criarProva({ gincana_id: 'GINCANA_1', titulo: 'Prova em G1', data_inicio: new Date('2026-02-01') });

    const req = { params: { id: provaEmG1._id.toString() }, usuario: { id: coordenador._id.toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    // Sem equipe em G1, a resposta correta é 403 — nunca a equipe de G2.
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('provaParticipacaoController - listarEquipeParticipanteDaProva', () => {
  it('retorna 404 quando a prova não existe', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, usuario: { id: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 403 quando o usuário não coordena nenhuma equipe', async () => {
    const prova = await criarProva({ gincana_id: 'G1' });
    const req = { params: { id: prova._id.toString() }, usuario: { id: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('lista os membros inscritos com o grupo correto (TITULAR/SUPLENTE/NAO_DEFINIDO)', async () => {
    const coordenador = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const aluno1 = await criarUsuario({ nome: 'Titular' });
    const aluno2 = await criarUsuario({ nome: 'Suplente' });
    const aluno3 = await criarUsuario({ nome: 'Sem Definição' });
    const { equipe } = await criarEquipeComMembros({ coordenador, membros: [aluno1, aluno2, aluno3] });

    const prova = await criarProva({ gincana_id: 'G1' });
    for (const u of [aluno1, aluno2, aluno3]) {
      await ProvaUsuario.create({ prova_id: prova._id, usuario_id: u._id, gincana_id: 'G1' });
    }
    await ProvaEquipeParticipacao.create({
      gincana_id: 'G1',
      prova_id: prova._id,
      equipe_id: equipe._id,
      titulares_usuario_ids: [aluno1._id],
      suplentes_usuario_ids: [aluno2._id],
      definido_por_usuario_id: coordenador._id,
    });

    const req = { params: { id: prova._id.toString() }, usuario: { id: coordenador._id.toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    const porNome = Object.fromEntries(corpo.membros_inscritos.map((m) => [m.nome, m.grupo]));
    expect(porNome['Titular']).toBe('TITULAR');
    expect(porNome['Suplente']).toBe('SUPLENTE');
    expect(porNome['Sem Definição']).toBe('NAO_DEFINIDO');
  });

  it('inclui o aluno emprestado PARA DENTRO (com equipe_origem_nome) e exclui o membro emprestado PARA FORA', async () => {
    const coordenador = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const membroEmprestadoPraFora = await criarUsuario({ nome: 'Emprestado Pra Fora' });
    const { equipe, eg } = await criarEquipeComMembros({ nome: 'Equipe A', coordenador, membros: [membroEmprestadoPraFora] });

    const coordB = await criarUsuario({ nome: 'Coord B', tipo: 'COORDENADOR' });
    const membroEmprestadoPraDentro = await criarUsuario({ nome: 'Emprestado Pra Dentro' });
    const { eg: egB } = await criarEquipeComMembros({ nome: 'Equipe B', coordenador: coordB, membros: [membroEmprestadoPraDentro] });

    const prova = await criarProva({ gincana_id: 'G1', data_fim: null });
    // Precisa estar inscrito na prova para aparecer na lista (mesmo lentado depois).
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: membroEmprestadoPraFora._id, gincana_id: 'G1' });

    // Empréstimo PARA DENTRO da equipe A: membro de B jogando na prova pela A.
    await EmprestimoEquipe.create({
      usuario_id: membroEmprestadoPraDentro._id,
      gincana_id: 'G1',
      equipe_origem_id: egB._id,
      equipe_destino_id: eg._id,
      prova_id: prova._id,
      status: 'ATIVO',
      criado_por: coordenador._id,
    });
    // Empréstimo PARA FORA da equipe A: membro da própria A jogando por outra equipe nesta prova.
    await EmprestimoEquipe.create({
      usuario_id: membroEmprestadoPraFora._id,
      gincana_id: 'G1',
      equipe_origem_id: eg._id,
      equipe_destino_id: egB._id,
      prova_id: prova._id,
      status: 'ATIVO',
      criado_por: coordenador._id,
    });

    const req = { params: { id: prova._id.toString() }, usuario: { id: coordenador._id.toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    const corpo = res.json.mock.calls[0][0];
    const nomes = corpo.membros_inscritos.map((m) => m.nome);
    expect(nomes).toContain('Emprestado Pra Dentro');
    expect(nomes).not.toContain('Emprestado Pra Fora');

    const emprestado = corpo.membros_inscritos.find((m) => m.nome === 'Emprestado Pra Dentro');
    expect(emprestado.emprestado).toBe(true);
    expect(emprestado.equipe_origem_nome).toBe('Equipe B');
  });

  it('empréstimo de uma prova já encerrada (data_fim no passado) deixa de valer', async () => {
    const coordenador = await criarUsuario({ nome: 'Coord', tipo: 'COORDENADOR' });
    const membroEmprestadoPraFora = await criarUsuario({ nome: 'Voltou Pra Equipe' });
    const { eg } = await criarEquipeComMembros({ nome: 'Equipe A', coordenador, membros: [membroEmprestadoPraFora] });

    const coordB = await criarUsuario({ nome: 'Coord B', tipo: 'COORDENADOR' });
    const { eg: egB } = await criarEquipeComMembros({ nome: 'Equipe B', coordenador: coordB, membros: [] });

    // Prova já encerrada: data_fim no passado.
    const prova = await criarProva({ gincana_id: 'G1', data_inicio: new Date('2020-01-01'), data_fim: new Date('2020-01-02') });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: membroEmprestadoPraFora._id, gincana_id: 'G1' });

    await EmprestimoEquipe.create({
      usuario_id: membroEmprestadoPraFora._id,
      gincana_id: 'G1',
      equipe_origem_id: eg._id,
      equipe_destino_id: egB._id,
      prova_id: prova._id,
      status: 'ATIVO',
      criado_por: coordenador._id,
    });

    const req = { params: { id: prova._id.toString() }, usuario: { id: coordenador._id.toString() } };
    const res = mockRes();

    await listarEquipeParticipanteDaProva(req, res);

    // Prova encerrada: o empréstimo não conta mais, o membro volta a aparecer pela equipe de origem.
    const nomes = res.json.mock.calls[0][0].membros_inscritos.map((m) => m.nome);
    expect(nomes).toContain('Voltou Pra Equipe');
  });

  it('definido_por_outro é true quando outro coordenador da equipe definiu por último', async () => {
    const coordA = await criarUsuario({ nome: 'Coord A', tipo: 'COORDENADOR' });
    const coordB = await criarUsuario({ nome: 'Coord B', tipo: 'COORDENADOR' });
    const equipe = await Equipe.create({ nome: 'Equipe Dupla', cor: '#123', gincana_id: 'G1' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'G1', coordenador_usuario_id: coordA._id });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordA._id, is_coordenador: true });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordB._id, is_coordenador: true });

    const prova = await criarProva({ gincana_id: 'G1' });
    await ProvaEquipeParticipacao.create({
      gincana_id: 'G1',
      prova_id: prova._id,
      equipe_id: equipe._id,
      titulares_usuario_ids: [],
      suplentes_usuario_ids: [],
      definido_por_usuario_id: coordA._id,
    });

    const resB = mockRes();
    await listarEquipeParticipanteDaProva({ params: { id: prova._id.toString() }, usuario: { id: coordB._id.toString() } }, resB);
    expect(resB.json.mock.calls[0][0].definido_por_outro).toBe(true);

    const resA = mockRes();
    await listarEquipeParticipanteDaProva({ params: { id: prova._id.toString() }, usuario: { id: coordA._id.toString() } }, resA);
    expect(resA.json.mock.calls[0][0].definido_por_outro).toBe(false);
  });
});

describe('provaParticipacaoController - salvarEquipeParticipanteDaProva', () => {
  it('retorna 400 quando titulares_usuario_ids/suplentes_usuario_ids não são listas', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, usuario: { id: new mongoose.Types.ObjectId().toString() }, body: {} };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando nenhum titular é informado', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    await criarEquipeComMembros({ coordenador });
    const prova = await criarProva({ gincana_id: 'G1' });

    const req = {
      params: { id: prova._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [], suplentes_usuario_ids: [] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 quando o mesmo membro é titular e suplente ao mesmo tempo', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    const aluno = await criarUsuario({ nome: 'Aluno' });
    await criarEquipeComMembros({ coordenador, membros: [aluno] });
    const prova = await criarProva({ gincana_id: 'G1' });

    const req = {
      params: { id: prova._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [aluno._id.toString()], suplentes_usuario_ids: [aluno._id.toString()] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 422 quando um membro informado não pertence à equipe inscrita na prova', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    await criarEquipeComMembros({ coordenador });
    const prova = await criarProva({ gincana_id: 'G1' });
    const intruso = await criarUsuario({ nome: 'Intruso' });

    const req = {
      params: { id: prova._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [intruso._id.toString()], suplentes_usuario_ids: [] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('retorna 400 quando um dos membros informados está BANIDO ou SUSPENSO', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    const banido = await criarUsuario({ nome: 'Banido', status: 'BANIDO' });
    await criarEquipeComMembros({ coordenador, membros: [banido] });
    const prova = await criarProva({ gincana_id: 'G1' });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: banido._id, gincana_id: 'G1' });

    const req = {
      params: { id: prova._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [banido._id.toString()], suplentes_usuario_ids: [] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/banidos ou suspensos/);
  });

  it('retorna 400 quando um membro participou da prova anterior (regra de membros consecutivos)', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    const aluno = await criarUsuario({ nome: 'Bloqueado' });
    const { equipe } = await criarEquipeComMembros({ coordenador, membros: [aluno] });

    const provaAnterior = await criarProva({
      gincana_id: 'G1', titulo: 'Anterior', data_inicio: new Date('2026-01-01'), proibir_membros_consecutivos: true,
    });
    await ProvaEquipeParticipacao.create({
      gincana_id: 'G1',
      prova_id: provaAnterior._id,
      equipe_id: equipe._id,
      titulares_usuario_ids: [aluno._id],
      suplentes_usuario_ids: [],
      definido_por_usuario_id: coordenador._id,
    });

    const provaAtual = await criarProva({ gincana_id: 'G1', titulo: 'Atual', data_inicio: new Date('2026-02-01') });
    await ProvaUsuario.create({ prova_id: provaAtual._id, usuario_id: aluno._id, gincana_id: 'G1' });

    const req = {
      params: { id: provaAtual._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [aluno._id.toString()], suplentes_usuario_ids: [] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/prova anterior/);
  });

  it('salva titulares e suplentes, gravando gincana_id da prova e definido_por_usuario_id (upsert)', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    const titular = await criarUsuario({ nome: 'Titular' });
    const suplente = await criarUsuario({ nome: 'Suplente' });
    const { equipe } = await criarEquipeComMembros({ coordenador, membros: [titular, suplente] });
    const prova = await criarProva({ gincana_id: 'G1' });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: titular._id, gincana_id: 'G1' });
    await ProvaUsuario.create({ prova_id: prova._id, usuario_id: suplente._id, gincana_id: 'G1' });

    const req = {
      params: { id: prova._id.toString() },
      usuario: { id: coordenador._id.toString() },
      body: { titulares_usuario_ids: [titular._id.toString()], suplentes_usuario_ids: [suplente._id.toString()] },
    };
    const res = mockRes();

    await salvarEquipeParticipanteDaProva(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const registro = await ProvaEquipeParticipacao.findOne({ prova_id: prova._id, equipe_id: equipe._id });
    expect(registro.gincana_id).toBe('G1');
    expect(String(registro.definido_por_usuario_id)).toBe(String(coordenador._id));
    expect(registro.titulares_usuario_ids.map(String)).toEqual([String(titular._id)]);
    expect(registro.suplentes_usuario_ids.map(String)).toEqual([String(suplente._id)]);
  });
});

describe('provaParticipacaoController - listarAssociacoesProvas', () => {
  it('lista só as provas da gincana ativa, com contadores e marcação de emprestado', async () => {
    const coordenador = await criarUsuario({ tipo: 'COORDENADOR' });
    const titular = await criarUsuario({ nome: 'Titular' });
    const { equipe, eg } = await criarEquipeComMembros({ nome: 'Equipe A', coordenador, membros: [titular] });

    const coordB = await criarUsuario({ tipo: 'COORDENADOR' });
    const { eg: egB } = await criarEquipeComMembros({ nome: 'Equipe B', coordenador: coordB, membros: [] });
    const emprestado = await criarUsuario({ nome: 'Emprestado' });
    await EquipeMembros.create({ equipe_id: (await Equipe.findById(egB.equipe_id))._id, usuario_id: emprestado._id, is_coordenador: false });

    const provaG1 = await criarProva({ gincana_id: 'G1', titulo: 'Prova G1' });
    await criarProva({ gincana_id: 'G2', titulo: 'Prova G2' });

    await ProvaEquipeParticipacao.create({
      gincana_id: 'G1',
      prova_id: provaG1._id,
      equipe_id: equipe._id,
      titulares_usuario_ids: [titular._id, emprestado._id],
      suplentes_usuario_ids: [],
      definido_por_usuario_id: coordenador._id,
    });
    await EmprestimoEquipe.create({
      usuario_id: emprestado._id,
      gincana_id: 'G1',
      equipe_origem_id: egB._id,
      equipe_destino_id: eg._id,
      prova_id: provaG1._id,
      status: 'ATIVO',
      criado_por: coordenador._id,
    });

    const req = { gincanaId: 'G1' };
    const res = mockRes();

    await listarAssociacoesProvas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];

    // Só a prova da gincana ativa (G1) aparece.
    expect(corpo).toHaveLength(1);
    expect(corpo[0].prova.titulo).toBe('Prova G1');
    expect(corpo[0].total_alunos).toBe(2);
    expect(corpo[0].total_emprestados).toBe(1);

    const equipeResultado = corpo[0].equipes.find((e) => String(e.equipe_id) === String(equipe._id));
    const membroEmprestado = equipeResultado.titulares.find((m) => m.nome === 'Emprestado');
    expect(membroEmprestado.emprestado).toBe(true);
    expect(membroEmprestado.equipe_origem_nome).toBe('Equipe B');
  });
});

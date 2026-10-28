import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Gincana from '../../../src/models/Gincana.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import ConfiguracaoGincana from '../../../src/models/ConfiguracaoGincana.js';
import Notificacao from '../../../src/models/Notificacao.js';
import {
  criarGincana,
  listarGincanas,
  minhasGincanas,
  listarGincanasDisponiveis,
  atualizarGincana,
  alterarStatusGincana,
  encerrarGincana,
  obterResultadoFinal,
  previaEncerramento,
} from '../../../src/gincanas/gincanaController.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

let mongoServer;
const adminId = new mongoose.Types.ObjectId().toString();

const anoAtual = new Date().getFullYear();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Gincana.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Gincana.deleteMany({}), Equipe.deleteMany({}), EquipeGincana.deleteMany({}), EquipeMembros.deleteMany({}),
  ]);
});

const criarGincanaDoc = (overrides) => Gincana.create({
  nome: 'Gincana', ano: anoAtual, escola_id: 'ESCOLA_ATIVA', criado_por: adminId, ...overrides,
});

describe('gincanaController - criação no escopo da escola', () => {
  it('cria a gincana na escola ativa do ADMIN', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana Nova', ano: 2026, descricao: 'Teste' },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const criada = await Gincana.findOne({ nome: 'Gincana Nova' });
    expect(criada.escola_id).toBe('ESCOLA_ATIVA');
  });

  it('recusa escola_id diferente da escola ativa', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: {
        escola_id: 'OUTRA_ESCOLA',
        nome: 'Gincana Indevida',
        ano: 2026,
      },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      codigo: 'ESCOLA_DIFERENTE_DO_ESCOPO',
    }));
    expect(await Gincana.countDocuments()).toBe(0);
  });

  it('recusa quando falta nome ou ano', async () => {
    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { descricao: 'sem nome nem ano' },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('recusa nome duplicado no mesmo ano DENTRO da mesma escola', async () => {
    await criarGincanaDoc({ nome: 'Gincana X', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana X', ano: 2026 },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('permite o mesmo nome e ano em OUTRA escola', async () => {
    await criarGincanaDoc({ nome: 'Gincana X', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      usuario: { id: adminId, tipo: 'ADMIN' },
      body: { nome: 'Gincana X', ano: 2026 },
    };
    const res = mockRes();

    await criarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('gincanaController - listarGincanas (ADMIN vê tudo da escola ativa)', () => {
  it('lista só as gincanas da escola ativa, ordenadas por ano desc', async () => {
    await criarGincanaDoc({ nome: 'G Antiga', ano: 2024, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'G Nova', ano: 2026, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'G De Outra Escola', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = { escolaId: 'ESCOLA_ATIVA' };
    const res = mockRes();

    await listarGincanas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.map((g) => g.nome)).toEqual(['G Nova', 'G Antiga']);
  });
});

describe('gincanaController - minhasGincanas', () => {
  it('ADMIN vê todas as não-arquivadas da escola ativa, cada uma com a flag "encerrada"', async () => {
    await criarGincanaDoc({ nome: 'Ativa Corrente', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Ano Passado', ano: anoAtual - 1, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Arquivada', ano: anoAtual, status: 'ARQUIVADA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: adminId, tipo: 'ADMIN' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];

    // Arquivada nem aparece na lista.
    expect(corpo.map((g) => g.nome).sort()).toEqual(['Ano Passado', 'Ativa Corrente']);

    const porNome = Object.fromEntries(corpo.map((g) => [g.nome, g.encerrada]));
    expect(porNome['Ativa Corrente']).toBe(false);
    // Ano passado é encerrada mesmo com status ATIVA — o ano virado conta.
    expect(porNome['Ano Passado']).toBe(true);
  });

  it('SUPER_ADMIN também vê todas as gincanas da escola ativa, sem precisar de vínculo/participação', async () => {
    await criarGincanaDoc({ nome: 'G1', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: new mongoose.Types.ObjectId().toString(), tipo: 'SUPER_ADMIN' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('perfil comum (ex.: ALUNO) só vê as gincanas em que participa via equipe', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();

    const gincanaComParticipacao = await criarGincanaDoc({ nome: 'Participo', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Não Participo', ano: anoAtual, escola_id: 'ESCOLA_ATIVA' });

    const equipe = await Equipe.create({ nome: 'Minha Equipe', cor: '#123', gincana_id: gincanaComParticipacao._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaComParticipacao._id });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: alunoId, is_coordenador: false });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    const corpo = res.json.mock.calls[0][0];
    expect(corpo.map((g) => g.nome)).toEqual(['Participo']);
  });

  it('perfil comum não vê gincana de outra escola mesmo participando de uma equipe lá', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();

    const gincanaOutraEscola = await criarGincanaDoc({ nome: 'De Outra Escola', ano: anoAtual, escola_id: 'ESCOLA_OUTRA' });
    const equipe = await Equipe.create({ nome: 'Equipe Lá', cor: '#123', gincana_id: gincanaOutraEscola._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaOutraEscola._id });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: alunoId, is_coordenador: false });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await minhasGincanas(req, res);

    expect(res.json.mock.calls[0][0]).toEqual([]);
  });
});

describe('gincanaController - listarGincanasDisponiveis (sem exigir participação)', () => {
  it('devolve as ATIVAS da escola ativa para um usuário sem nenhuma equipe', async () => {
    const alunoId = new mongoose.Types.ObjectId().toString();
    await criarGincanaDoc({ nome: 'Ativa Sem Equipe', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: alunoId, tipo: 'ALUNO' } };
    const res = mockRes();

    await listarGincanasDisponiveis(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].map((g) => g.nome)).toEqual(['Ativa Sem Equipe']);
  });

  it('não devolve gincanas de outra escola nem ENCERRADA/ARQUIVADA', async () => {
    await criarGincanaDoc({ nome: 'De Outra Escola', ano: anoAtual, status: 'ATIVA', escola_id: 'ESCOLA_OUTRA' });
    await criarGincanaDoc({ nome: 'Encerrada', ano: anoAtual, status: 'ENCERRADA', escola_id: 'ESCOLA_ATIVA' });
    await criarGincanaDoc({ nome: 'Arquivada', ano: anoAtual, status: 'ARQUIVADA', escola_id: 'ESCOLA_ATIVA' });

    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: new mongoose.Types.ObjectId().toString(), tipo: 'ALUNO' } };
    const res = mockRes();

    await listarGincanasDisponiveis(req, res);

    expect(res.json.mock.calls[0][0]).toEqual([]);
  });
});

describe('gincanaController - atualizarGincana', () => {
  it('atualiza os campos informados', async () => {
    const gincana = await criarGincanaDoc({ nome: 'Antiga', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Nova', descricao: 'Atualizada' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = await Gincana.findById(gincana._id);
    expect(atualizada.nome).toBe('Nova');
    expect(atualizada.descricao).toBe('Atualizada');
  });

  it('retorna 404 quando a gincana é de outra escola', async () => {
    const gincana = await criarGincanaDoc({ nome: 'De Outra', ano: 2026, escola_id: 'ESCOLA_OUTRA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Tentativa' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando a atualização colide com outra gincana da mesma escola/ano', async () => {
    await criarGincanaDoc({ nome: 'Já Existe', ano: 2026, escola_id: 'ESCOLA_ATIVA' });
    const gincana = await criarGincanaDoc({ nome: 'Vou Renomear', ano: 2026, escola_id: 'ESCOLA_ATIVA' });

    const req = {
      escolaId: 'ESCOLA_ATIVA',
      params: { id: gincana._id.toString() },
      body: { nome: 'Já Existe' },
    };
    const res = mockRes();

    await atualizarGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('gincanaController - alterarStatusGincana', () => {
  it('retorna 400 para status inválido', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_ATIVA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'QUALQUER_COISA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a gincana é de outra escola', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_OUTRA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'ENCERRADA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('encerra a gincana na escola ativa', async () => {
    const gincana = await criarGincanaDoc({ status: 'ATIVA', escola_id: 'ESCOLA_ATIVA' });
    const req = { escolaId: 'ESCOLA_ATIVA', params: { id: gincana._id.toString() }, body: { status: 'ENCERRADA' } };
    const res = mockRes();

    await alterarStatusGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizada = await Gincana.findById(gincana._id);
    expect(atualizada.status).toBe('ENCERRADA');
  });
});

describe('gincanaController - encerrarGincana', () => {
  const reqEncerrar = (gincana) => ({
    escolaId: 'ESCOLA_ATIVA',
    usuario: { id: adminId, tipo: 'ADMIN' },
    params: { id: gincana._id.toString() },
  });

  const criarEquipeNaGincana = async (gincana, nome, pontos) => {
    const equipe = await Equipe.create({ nome, cor: '#ff0000', gincana_id: gincana._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincana._id, pontos_acumulados: pontos });
    return equipe;
  };

  const corpo = (res) => res.json.mock.calls[0][0];

  it('congela a classificação e marca a gincana como ENCERRADA', async () => {
    const gincana = await criarGincanaDoc();
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    await criarEquipeNaGincana(gincana, 'Vermelha', 40);
    const res = mockRes();

    await encerrarGincana(reqEncerrar(gincana), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(corpo(res).ja_encerrada).toBe(false);
    const salva = await Gincana.findById(gincana._id);
    expect(salva.status).toBe('ENCERRADA');
    expect(String(salva.resultado_final.encerrada_por)).toBe(adminId);
    expect(salva.resultado_final.classificacao.map((c) => [c.posicao, c.nome, c.pontos])).toEqual([
      [1, 'Vermelha', 40],
      [2, 'Azul', 10],
    ]);
  });

  it('é idempotente: encerrar de novo não recalcula o resultado anunciado', async () => {
    const gincana = await criarGincanaDoc();
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    const vermelha = await criarEquipeNaGincana(gincana, 'Vermelha', 40);
    await encerrarGincana(reqEncerrar(gincana), mockRes());

    // Uma correção de pontos depois do anúncio não muda o snapshot.
    await EquipeGincana.updateOne({ equipe_id: vermelha._id }, { pontos_acumulados: 0 });
    const res = mockRes();
    await encerrarGincana(reqEncerrar(gincana), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(corpo(res).ja_encerrada).toBe(true);
    const salva = await Gincana.findById(gincana._id);
    expect(salva.resultado_final.classificacao[0].nome).toBe('Vermelha');
  });

  it('duas requisições simultâneas gravam um único resultado', async () => {
    const gincana = await criarGincanaDoc();
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    const [r1, r2] = [mockRes(), mockRes()];

    await Promise.all([
      encerrarGincana(reqEncerrar(gincana), r1),
      encerrarGincana(reqEncerrar(gincana), r2),
    ]);

    const flags = [corpo(r1).ja_encerrada, corpo(r2).ja_encerrada].sort();
    expect(flags).toEqual([false, true]);
  });

  it('gincana reaberta é recalculada ao ser encerrada de novo', async () => {
    const gincana = await criarGincanaDoc();
    const azul = await criarEquipeNaGincana(gincana, 'Azul', 10);
    await criarEquipeNaGincana(gincana, 'Vermelha', 40);
    await encerrarGincana(reqEncerrar(gincana), mockRes());

    await Gincana.updateOne({ _id: gincana._id }, { status: 'ATIVA' });
    await EquipeGincana.updateOne({ equipe_id: azul._id }, { pontos_acumulados: 100 });
    await encerrarGincana(reqEncerrar(gincana), mockRes());

    const salva = await Gincana.findById(gincana._id);
    expect(salva.resultado_final.classificacao[0].nome).toBe('Azul');
  });

  it('gincana encerrada pelo PATCH /status (sem resultado) ganha o snapshot', async () => {
    const gincana = await criarGincanaDoc({ status: 'ENCERRADA' });
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    const res = mockRes();

    await encerrarGincana(reqEncerrar(gincana), res);

    expect(corpo(res).ja_encerrada).toBe(false);
    const salva = await Gincana.findById(gincana._id);
    expect(salva.resultado_final.classificacao).toHaveLength(1);
  });

  it('retorna 404 para gincana de outra escola', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_OUTRA' });
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    const res = mockRes();

    await encerrarGincana(reqEncerrar(gincana), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect((await Gincana.findById(gincana._id)).status).toBe('ATIVA');
  });

  it('recusa gincana arquivada (409 GINCANA_ARQUIVADA)', async () => {
    const gincana = await criarGincanaDoc({ status: 'ARQUIVADA' });
    await criarEquipeNaGincana(gincana, 'Azul', 10);
    const res = mockRes();

    await encerrarGincana(reqEncerrar(gincana), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(corpo(res).codigo).toBe('GINCANA_ARQUIVADA');
  });

  it('recusa gincana sem equipes (409 GINCANA_SEM_EQUIPES) sem encerrá-la', async () => {
    const gincana = await criarGincanaDoc();
    const res = mockRes();

    await encerrarGincana(reqEncerrar(gincana), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(corpo(res).codigo).toBe('GINCANA_SEM_EQUIPES');
    expect((await Gincana.findById(gincana._id)).status).toBe('ATIVA');
  });
});

describe('gincanaController - obterResultadoFinal', () => {
  const resultadoCongelado = () => ({
    encerrada_em: new Date('2026-10-20T12:00:00Z'),
    encerrada_por: adminId,
    classificacao: [
      { posicao: 1, equipe_id: new mongoose.Types.ObjectId(), nome: 'Vermelha', cor: '#f00', pontos: 40 },
      { posicao: 2, equipe_id: new mongoose.Types.ObjectId(), nome: 'Azul', cor: '#00f', pontos: 10 },
    ],
  });

  const reqResultado = (gincana, tipo = 'ALUNO', escolaId = 'ESCOLA_ATIVA') => ({
    escolaId,
    usuario: { id: adminId, tipo },
    params: { id: gincana._id.toString() },
  });

  afterEach(() => ConfiguracaoGincana.deleteMany({}));

  it('devolve a classificação congelada, sem pontos quando a config não permite', async () => {
    const gincana = await criarGincanaDoc({ status: 'ENCERRADA', resultado_final: resultadoCongelado() });
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.gincana.nome).toBe('Gincana');
    expect(corpo.mostrar_pontos).toBe(false);
    expect(corpo.classificacao.map((c) => [c.posicao, c.nome, c.cor])).toEqual([
      [1, 'Vermelha', '#f00'],
      [2, 'Azul', '#00f'],
    ]);
    expect(corpo.classificacao.every((c) => c.pontos === undefined)).toBe(true);
  });

  it('mostra os pontos quando a config permite', async () => {
    const gincana = await criarGincanaDoc({ status: 'ENCERRADA', resultado_final: resultadoCongelado() });
    await ConfiguracaoGincana.create({ gincana_id: gincana._id, mostrar_notas_ranking: true });
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana), res);

    expect(res.json.mock.calls[0][0].classificacao[0].pontos).toBe(40);
  });

  // Diferente do ranking: quem projeta a cerimônia no telão é o ADMIN, e a
  // plateia não pode ver pontos que a escola escolheu esconder.
  it('esconde os pontos também do ADMIN quando a config não permite', async () => {
    const gincana = await criarGincanaDoc({ status: 'ENCERRADA', resultado_final: resultadoCongelado() });
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana, 'ADMIN'), res);

    expect(res.json.mock.calls[0][0].mostrar_pontos).toBe(false);
    expect(res.json.mock.calls[0][0].classificacao.every((c) => c.pontos === undefined)).toBe(true);
  });

  it('não adianta o anúncio: 404 RESULTADO_NAO_DISPONIVEL antes do encerramento', async () => {
    const gincana = await criarGincanaDoc();
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana, 'ADMIN'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].codigo).toBe('RESULTADO_NAO_DISPONIVEL');
  });

  it('gincana reaberta não serve o resultado antigo como final', async () => {
    const gincana = await criarGincanaDoc({ status: 'ATIVA', resultado_final: resultadoCongelado() });
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana, 'ADMIN'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].codigo).toBe('RESULTADO_NAO_DISPONIVEL');
  });

  it('minhasGincanas não expõe a classificação, só o indicador tem_resultado_final', async () => {
    await criarGincanaDoc({ status: 'ENCERRADA', resultado_final: resultadoCongelado() });
    await criarGincanaDoc({ nome: 'Outra' });
    const res = mockRes();

    await minhasGincanas({ escolaId: 'ESCOLA_ATIVA', usuario: { id: adminId, tipo: 'ADMIN' } }, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista.every((g) => g.resultado_final === undefined)).toBe(true);
    expect(Object.fromEntries(lista.map((g) => [g.nome, g.tem_resultado_final])))
      .toEqual({ Gincana: true, Outra: false });
  });

  it('não mostra o resultado de uma gincana de outra escola', async () => {
    const gincana = await criarGincanaDoc({
      escola_id: 'ESCOLA_OUTRA', status: 'ENCERRADA', resultado_final: resultadoCongelado(),
    });
    const res = mockRes();

    await obterResultadoFinal(reqResultado(gincana), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].classificacao).toBeUndefined();
  });
});

describe('gincanaController - encerrarGincana avisa os coordenadores', () => {
  afterEach(() => Notificacao.deleteMany({}));

  it('notifica cada coordenador uma vez; encerrar de novo não reenvia', async () => {
    const gincana = await criarGincanaDoc();
    const equipe = await Equipe.create({ nome: 'Azul', cor: '#00f', gincana_id: gincana._id });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincana._id, pontos_acumulados: 10 });
    const coordenadores = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await EquipeMembros.create(coordenadores.map((usuario_id) => ({
      equipe_id: equipe._id, usuario_id, is_coordenador: true,
    })));
    const req = { escolaId: 'ESCOLA_ATIVA', usuario: { id: adminId, tipo: 'ADMIN' }, params: { id: gincana._id } };

    const res = mockRes();
    await encerrarGincana(req, res);
    await encerrarGincana(req, mockRes());

    expect(res.json.mock.calls[0][0].coordenadores_notificados).toBe(2);
    expect(await Notificacao.countDocuments({ tipo: 'RESULTADO_FINAL', gincana_id: gincana._id })).toBe(2);
  });
});

describe('gincanaController - previaEncerramento', () => {
  const req = (gincana, escolaId = 'ESCOLA_ATIVA') => ({
    escolaId, usuario: { id: adminId, tipo: 'ADMIN' }, params: { id: gincana._id },
  });

  it('mostra a classificação ao vivo e quantos coordenadores receberão email, sem gravar nada', async () => {
    const gincana = await criarGincanaDoc();
    const [azul, verde] = await Promise.all([
      Equipe.create({ nome: 'Azul', cor: '#00f', gincana_id: gincana._id }),
      Equipe.create({ nome: 'Verde', cor: '#0f0', gincana_id: gincana._id }),
    ]);
    await EquipeGincana.create([
      { equipe_id: azul._id, gincana_id: gincana._id, pontos_acumulados: 10 },
      { equipe_id: verde._id, gincana_id: gincana._id, pontos_acumulados: 30 },
    ]);
    await EquipeMembros.create([
      { equipe_id: azul._id, usuario_id: new mongoose.Types.ObjectId(), is_coordenador: true },
      { equipe_id: azul._id, usuario_id: new mongoose.Types.ObjectId(), is_coordenador: true },
    ]);
    const res = mockRes();

    await previaEncerramento(req(gincana), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const corpo = res.json.mock.calls[0][0];
    expect(corpo.classificacao.map((c) => [c.posicao, c.nome, c.pontos, c.total_coordenadores])).toEqual([
      [1, 'Verde', 30, 0],
      [2, 'Azul', 10, 2],
    ]);
    expect(corpo.total_emails).toBe(2);
    expect(corpo.equipes_sem_coordenador).toEqual(['Verde']);
    const intacta = await Gincana.findById(gincana._id);
    expect(intacta.status).toBe('ATIVA');
    expect(intacta.resultado_final).toBeNull();
  });

  it('404 para gincana de outra escola', async () => {
    const gincana = await criarGincanaDoc({ escola_id: 'ESCOLA_OUTRA' });
    const res = mockRes();

    await previaEncerramento(req(gincana), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('gincanaController - listarGincanas', () => {
  it('não devolve a classificação congelada, só o indicador', async () => {
    await criarGincanaDoc({
      status: 'ENCERRADA',
      resultado_final: { encerrada_em: new Date(), encerrada_por: adminId, classificacao: [] },
    });
    const res = mockRes();

    await listarGincanas({ escolaId: 'ESCOLA_ATIVA' }, res);

    const [gincana] = res.json.mock.calls[0][0];
    expect(gincana.resultado_final).toBeUndefined();
    expect(gincana.tem_resultado_final).toBe(true);
  });
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Escola from '../../../src/models/Escola.js';
import Usuario from '../../../src/models/Usuario.js';
import Gincana from '../../../src/models/Gincana.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Notificacao from '../../../src/models/Notificacao.js';
import {
  listarEscolas,
  minhasEscolas,
  criarEscola,
  atualizarEscola,
  alterarStatusEscola,
  listarUsuariosDaEscola,
  buscarCandidatosVinculo,
  vincularUsuario,
  alterarPapelUsuario,
  desvincularUsuario,
  obterResumoEscola,
} from '../../../src/escolas/escolaController.js';
import { conflitoMultiEscola } from '../../../src/escolas/escolaHelpers.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const ESCOLA_A = 'ESCOLA_A';
const ESCOLA_B = 'ESCOLA_B';

let mongoServer;
let superAdminId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  superAdminId = new mongoose.Types.ObjectId().toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Escola.create([
    { _id: ESCOLA_A, nome: 'Escola A', cidade: 'Bagé', uf: 'RS', status: 'ATIVA', criado_por: superAdminId },
    { _id: ESCOLA_B, nome: 'Escola B', status: 'INATIVA', criado_por: superAdminId },
  ]);
});

afterEach(async () => {
  await Promise.all([
    Escola.deleteMany({}),
    Usuario.deleteMany({}),
    Gincana.deleteMany({}),
    Equipe.deleteMany({}),
    EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}),
    Notificacao.deleteMany({}),
  ]);
});

const reqSuper = (extra = {}) => ({ usuario: { id: superAdminId, tipo: 'SUPER_ADMIN' }, ...extra });

describe('escolaController - leitura', () => {
  it('listarEscolas devolve todas, ativas e inativas', async () => {
    const res = mockRes();
    await listarEscolas(reqSuper(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toHaveLength(2);
  });

  it('minhasEscolas devolve só as ativas para o SUPER_ADMIN', async () => {
    const res = mockRes();
    await minhasEscolas(reqSuper(), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0]._id).toBe(ESCOLA_A);
  });

  it('minhasEscolas devolve apenas as escolas vinculadas ao usuário comum', async () => {
    const usuario = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await minhasEscolas({ usuario: { id: usuario._id.toString(), tipo: 'PROFESSOR' } }, res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0]._id).toBe(ESCOLA_A);
  });

  it('obterResumoEscola conta gincanas e usuários da escola', async () => {
    await Gincana.create({
      _id: 'G1', escola_id: ESCOLA_A, nome: 'G1', ano: 2026, criado_por: superAdminId,
    });
    await Usuario.create({
      nome: 'U', email: 'u@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano', vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO' }],
    });
    const res = mockRes();

    await obterResumoEscola(reqSuper({ params: { id: ESCOLA_A } }), res);

    const resumo = res.json.mock.calls[0][0];
    expect(resumo.totalGincanas).toBe(1);
    expect(resumo.totalUsuarios).toBe(1);
  });
});

describe('escolaController - escrita', () => {
  it('criarEscola cria e devolve 201', async () => {
    const req = reqSuper({ body: { nome: 'Escola Nova', cidade: 'Pelotas', uf: 'rs' } });
    const res = mockRes();

    await criarEscola(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const criada = await Escola.findOne({ nome: 'Escola Nova' });
    expect(criada.uf).toBe('RS'); // normalizado pelo schema
  });

  it('criarEscola retorna 400 sem nome', async () => {
    const res = mockRes();
    await criarEscola(reqSuper({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('criarEscola retorna 409 para nome repetido', async () => {
    const res = mockRes();
    await criarEscola(reqSuper({ body: { nome: 'Escola A' } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('atualizarEscola altera os dados', async () => {
    const res = mockRes();
    await atualizarEscola(reqSuper({ params: { id: ESCOLA_A }, body: { cidade: 'Santana' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Escola.findById(ESCOLA_A)).cidade).toBe('Santana');
  });

  it('alterarStatusEscola rejeita status inválido', async () => {
    const res = mockRes();
    await alterarStatusEscola(reqSuper({ params: { id: ESCOLA_A }, body: { status: 'FANTASIA' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('alterarStatusEscola desativa a escola', async () => {
    const res = mockRes();
    await alterarStatusEscola(reqSuper({ params: { id: ESCOLA_A }, body: { status: 'INATIVA' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Escola.findById(ESCOLA_A)).status).toBe('INATIVA');
  });
});

describe('escolaController - vínculos usuário <-> escola', () => {
  it('vincula por e-mail um professor que já atua em outra escola', async () => {
    // Este é o caso central da issue: mesma pessoa, mesmo login, duas escolas.
    const prof = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'PROF@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(prof._id);
    expect(atualizado.vinculos.map((v) => String(v.escola_id)).sort()).toEqual([ESCOLA_A, ESCOLA_B]);
  });

  it('vincula por usuario_id', async () => {
    const prof = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { usuario_id: prof._id.toString() } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 quando nem email nem usuario_id são informados', async () => {
    const res = mockRes();
    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 para usuário inexistente', async () => {
    const res = mockRes();
    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'ninguem@x.com' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando o vínculo já existe', async () => {
    await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'prof@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('listarUsuariosDaEscola devolve só os vinculados e sem senha', async () => {
    await Usuario.create({
      nome: 'Daqui', email: 'daqui@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    await Usuario.create({
      nome: 'Dali', email: 'dali@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await listarUsuariosDaEscola(reqSuper({ params: { id: ESCOLA_A } }), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Daqui');
    expect(lista[0].senha).toBeUndefined();
  });

  it('buscarCandidatosVinculo busca por nome ou e-mail, ignorando maiúsculas', async () => {
    await Usuario.create({
      nome: 'Matheus Ciocca', email: 'matheus@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    await Usuario.create({
      nome: 'Outra Pessoa', email: 'contato@matheus.com', senha: '123', tipo: 'ALUNO', vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO' }],
    });
    await Usuario.create({
      nome: 'Sem Relação', email: 'zzz@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await buscarCandidatosVinculo(reqSuper({ params: { id: ESCOLA_A }, query: { search: 'MATHEUS' } }), res);

    const lista = res.json.mock.calls[0][0];
    expect(lista.map((u) => u.nome).sort()).toEqual(['Matheus Ciocca', 'Outra Pessoa']);
    expect(lista[0].senha).toBeUndefined();
  });

  it('buscarCandidatosVinculo exclui quem já está vinculado à escola alvo', async () => {
    await Usuario.create({
      nome: 'Matheus Ciocca', email: 'matheus@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await buscarCandidatosVinculo(reqSuper({ params: { id: ESCOLA_A }, query: { search: 'matheus' } }), res);

    expect(res.json.mock.calls[0][0]).toHaveLength(0);
  });

  it('buscarCandidatosVinculo encontra um SUPER_ADMIN que também tem vínculo real em outra escola', async () => {
    // Papel base SUPER_ADMIN não impede ter um vínculo de participante (ex.:
    // COORDENADOR) em alguma escola — excluir por `tipo` deixava essa conta
    // impossível de achar na busca.
    await Usuario.create({
      nome: 'Matheus Super', email: 'super@x.com', senha: '123', tipo: 'SUPER_ADMIN', vinculos: [{ escola_id: ESCOLA_B, tipo: 'COORDENADOR' }],
    });
    const res = mockRes();

    await buscarCandidatosVinculo(reqSuper({ params: { id: ESCOLA_A }, query: { search: 'matheus' } }), res);

    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('buscarCandidatosVinculo devolve vazio com menos de 2 letras', async () => {
    const res = mockRes();
    await buscarCandidatosVinculo(reqSuper({ params: { id: ESCOLA_A }, query: { search: 'm' } }), res);
    expect(res.json.mock.calls[0][0]).toHaveLength(0);
  });

  it('desvincula quando o usuário tem outra escola', async () => {
    const prof = await Usuario.create({
      nome: 'Multi', email: 'multi@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }, { escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await desvincularUsuario(
      reqSuper({ params: { id: ESCOLA_A, usuarioId: prof._id.toString() } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Usuario.findById(prof._id)).vinculos.map((v) => String(v.escola_id))).toEqual([ESCOLA_B]);
  });

  it('bloqueia a remoção do único vínculo do usuário', async () => {
    // Sem nenhuma escola o usuário ficaria sem acesso a nada.
    const prof = await Usuario.create({
      nome: 'Único', email: 'unico@x.com', senha: '123', tipo: 'PROFESSOR', vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await desvincularUsuario(
      reqSuper({ params: { id: ESCOLA_A, usuarioId: prof._id.toString() } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect((await Usuario.findById(prof._id)).vinculos.map((v) => String(v.escola_id))).toEqual([ESCOLA_A]);
  });
});

describe('escolaController - papel por escola', () => {
  // O bug relatado: vincular alguém a uma escola nova rebaixava o papel dela
  // (e o rebaixamento respingava na escola antiga). Papel é por escola.
  it('vincular sem informar tipo herda o papel base: um ADMIN entra como ADMIN', async () => {
    const admin = await Usuario.create({
      nome: 'Org', email: 'org@x.com', senha: '123', tipo: 'ADMIN',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ADMIN' }],
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'org@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(admin._id);
    const naEscolaA = atualizado.vinculos.find((v) => v.escola_id === ESCOLA_A);
    expect(naEscolaA.tipo).toBe('ADMIN');
  });

  it('vincular com tipo diferente não altera o papel na escola anterior', async () => {
    const prof = await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'prof@x.com', tipo: 'ADMIN' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(prof._id);
    expect(atualizado.vinculos.find((v) => v.escola_id === ESCOLA_A).tipo).toBe('ADMIN');
    expect(atualizado.vinculos.find((v) => v.escola_id === ESCOLA_B).tipo).toBe('PROFESSOR');
  });

  it('alterarPapelUsuario muda o papel só na escola alvo', async () => {
    const prof = await Usuario.create({
      nome: 'Multi', email: 'multi@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'PROFESSOR' },
        { escola_id: ESCOLA_B, tipo: 'PROFESSOR' },
      ],
    });
    const res = mockRes();

    await alterarPapelUsuario(
      reqSuper({ params: { id: ESCOLA_A, usuarioId: prof._id.toString() }, body: { tipo: 'ADMIN' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(prof._id);
    expect(atualizado.vinculos.find((v) => v.escola_id === ESCOLA_A).tipo).toBe('ADMIN');
    expect(atualizado.vinculos.find((v) => v.escola_id === ESCOLA_B).tipo).toBe('PROFESSOR');
  });

  it('alterarPapelUsuario rejeita perfil inválido', async () => {
    const prof = await Usuario.create({
      nome: 'P', email: 'p@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await alterarPapelUsuario(
      reqSuper({ params: { id: ESCOLA_A, usuarioId: prof._id.toString() }, body: { tipo: 'FANTASIA' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('minhasEscolas informa o papel do usuário em cada escola', async () => {
    await Escola.updateOne({ _id: ESCOLA_B }, { status: 'ATIVA' });
    const usuario = await Usuario.create({
      nome: 'Dupla', email: 'dupla@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'ADMIN' },
        { escola_id: ESCOLA_B, tipo: 'PROFESSOR' },
      ],
    });
    const res = mockRes();

    await minhasEscolas({ usuario: { id: usuario._id.toString(), tipo: 'PROFESSOR' } }, res);

    const lista = res.json.mock.calls[0][0];
    const porId = Object.fromEntries(lista.map((e) => [e._id, e.meu_tipo]));
    expect(porId[ESCOLA_A]).toBe('ADMIN');
    expect(porId[ESCOLA_B]).toBe('PROFESSOR');
  });
});

// A escola é o mundo do aluno: quem compete (ALUNO, COORDENADOR, PAI/MÃE) fica
// preso a uma escola só. Quem organiza (ADMIN, PROFESSOR) pode acumular.
describe('escolaController - escola única para perfis de participante', () => {
  it('recusa vincular um ALUNO que já pertence a outra escola', async () => {
    const aluno = await Usuario.create({
      nome: 'Aluno', email: 'aluno@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'aluno@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].codigo).toBe('PERFIL_ESCOLA_UNICA');
    // Nada mudou: o vínculo original continua sendo o único.
    const atualizado = await Usuario.findById(aluno._id);
    expect(atualizado.vinculos.map((v) => String(v.escola_id))).toEqual([ESCOLA_B]);
  });

  it('recusa vincular como COORDENADOR alguém que já atua em outra escola', async () => {
    await Usuario.create({
      nome: 'Prof', email: 'prof@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'prof@x.com', tipo: 'COORDENADOR', turma: 'EF - 6º Ano' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('permite vincular um perfil de participante quando ele ainda não tem escola', async () => {
    const aluno = await Usuario.create({
      nome: 'Novo', email: 'novo@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'novo@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const atualizado = await Usuario.findById(aluno._id);
    expect(atualizado.vinculos.map((v) => String(v.escola_id))).toEqual([ESCOLA_A]);
  });

  it('recusa rebaixar para ALUNO alguém que atua em duas escolas', async () => {
    const prof = await Usuario.create({
      nome: 'Multi', email: 'multi@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'PROFESSOR' },
        { escola_id: ESCOLA_B, tipo: 'PROFESSOR' },
      ],
    });
    const res = mockRes();

    await alterarPapelUsuario(
      reqSuper({
        params: { id: ESCOLA_A, usuarioId: prof._id.toString() },
        body: { tipo: 'ALUNO', turma: 'EF - 6º Ano' },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
    const atualizado = await Usuario.findById(prof._id);
    expect(atualizado.vinculos.find((v) => v.escola_id === ESCOLA_A).tipo).toBe('PROFESSOR');
  });

  it('permite virar ALUNO quando aquela é a única escola da pessoa', async () => {
    const prof = await Usuario.create({
      nome: 'Só uma', email: 'so@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await alterarPapelUsuario(
      reqSuper({
        params: { id: ESCOLA_A, usuarioId: prof._id.toString() },
        body: { tipo: 'ALUNO', turma: 'EF - 6º Ano' },
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Usuario.findById(prof._id)).vinculos[0].tipo).toBe('ALUNO');
  });

  it('o schema barra um segundo vínculo de participante mesmo fora dos controllers', async () => {
    await expect(Usuario.create({
      nome: 'Burlão', email: 'burlao@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano' },
        { escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 6º Ano' },
      ],
    })).rejects.toThrow(/uma única escola/);
  });

  // Insight central do desenho de convites: PENDENTE é uma SOLICITAÇÃO, não
  // um acesso — não pode contar para a regra de escola única, senão o vínculo
  // de destino de uma transferência é rejeitado antes mesmo de existir.
  it('um vínculo PENDENTE em outra escola não conta para a regra de escola única', async () => {
    await expect(Usuario.create({
      nome: 'Transferindo', email: 'transf@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
      vinculos: [
        { escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' },
        { escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' },
      ],
    })).resolves.toBeDefined();
  });

  it('conflitoMultiEscola ignora vínculos PENDENTE do usuário', async () => {
    const aluno = await Usuario.create({
      nome: 'Aluno', email: 'aluno.pendente@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
    });

    expect(conflitoMultiEscola(aluno, ESCOLA_B, 'ALUNO')).toBeNull();
  });
});

// Fase 0 do plano de convites: destravar a transferência administrativa. Antes
// desta mudança não existia NENHUMA ordem de chamadas que funcionasse — vincular
// recusava o segundo vínculo (409 PERFIL_ESCOLA_UNICA) e desvincular recusava
// remover o único vínculo antes de haver um novo. `transferir: true` resolve os
// dois lados numa única `usuario.save()`.
describe('escolaController - transferência administrativa (vincularUsuario transferir=true)', () => {
  it('sem transferir=true, o conflito de escola única continua 409 (comportamento padrão preservado)', async () => {
    const aluno = await Usuario.create({
      nome: 'Aluno', email: 'aluno.semtransf@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' }],
    });
    const res = mockRes();

    await vincularUsuario(reqSuper({ params: { id: ESCOLA_A }, body: { email: 'aluno.semtransf@x.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    const atualizado = await Usuario.findById(aluno._id);
    expect(atualizado.vinculos).toHaveLength(1);
    expect(atualizado.vinculos[0].escola_id).toBe(ESCOLA_B);
  });

  it('transferir=true remove o vínculo ATIVO antigo e cria o novo ATIVO numa única gravação', async () => {
    const aluno = await Usuario.create({
      nome: 'Transferido', email: 'aluno.transf@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 7º Ano',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'aluno.transf@x.com', turma: 'EF - 6º Ano', transferir: true } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).toMatch(/transferido/i);

    const atualizado = await Usuario.findById(aluno._id);
    expect(atualizado.vinculos).toHaveLength(1);
    expect(atualizado.vinculos[0].escola_id).toBe(ESCOLA_A);
    expect(atualizado.vinculos[0].status).toBe('ATIVO');
    expect(atualizado.vinculos[0].turma).toBe('EF - 6º Ano');
  });

  it('transferir=true sem conflito de escola única funciona como um vínculo normal (sem "transferido" na mensagem)', async () => {
    const prof = await Usuario.create({
      nome: 'Multi', email: 'prof.transfsemconf@x.com', senha: '123', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'PROFESSOR' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'prof.transfsemconf@x.com', transferir: true } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).not.toMatch(/transferido/i);
    const atualizado = await Usuario.findById(prof._id);
    expect(atualizado.vinculos.map((v) => String(v.escola_id)).sort()).toEqual([ESCOLA_A, ESCOLA_B]);
  });

  it('transferir=true notifica o(s) coordenador(es) de origem quando o transferido era membro de gincana ativa, e não mexe em EquipeMembros', async () => {
    const gincanaOrigem = await Gincana.create({
      _id: 'GINCANA_ORIGEM_ADMIN', escola_id: ESCOLA_B, nome: 'Gincana B', ano: 2026, status: 'ATIVA', criado_por: superAdminId,
    });
    const equipe = await Equipe.create({ nome: 'Equipe Y', gincana_id: gincanaOrigem._id, cor: '#000' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: gincanaOrigem._id });

    const coordenador = await Usuario.create({
      nome: 'Coord Origem', email: 'coord.origem.admin@x.com', senha: '123', tipo: 'COORDENADOR',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'COORDENADOR', turma: 'EF - 7º Ano', status: 'ATIVO' }],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coordenador._id, is_coordenador: true });

    const aluno = await Usuario.create({
      nome: 'Membro Transferido Admin', email: 'membro.transf.admin@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' }],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id, is_coordenador: false });

    const res = mockRes();
    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'membro.transf.admin@x.com', turma: 'EF - 6º Ano', transferir: true } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);

    // EquipeMembros permanece intacto (deliberado, ver plano Fase 0).
    expect(await EquipeMembros.countDocuments({ usuario_id: aluno._id })).toBe(1);

    const notificacoes = await Notificacao.find({ usuario_id: coordenador._id });
    expect(notificacoes.length).toBeGreaterThan(0);
    expect(notificacoes[0].titulo).toMatch(/transferid/i);
  });

  it('transferir=true também recusa quando o vínculo com a escola alvo já existe (409, antes de olhar conflito)', async () => {
    const aluno = await Usuario.create({
      nome: 'Já vinculado', email: 'aluno.javinc.admin@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'ATIVO' }],
    });
    const res = mockRes();

    await vincularUsuario(
      reqSuper({ params: { id: ESCOLA_A }, body: { email: 'aluno.javinc.admin@x.com', transferir: true } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect((await Usuario.findById(aluno._id)).vinculos).toHaveLength(1);
  });
});

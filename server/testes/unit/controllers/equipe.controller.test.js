import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import {
  adicionarMembro,
  removerMembroEquipe,
  listarEquipesParaInscricao,
  buscarMinhaEquipeId,
  meuVinculoNaGincana,
  atualizarEquipe,
  adicionarCoordenador,
  removerCoordenador,
  listarEquipesPublicas,
  listarEquipesGincana,
  listarTodosMembros,
  listarCoordenadoresDisponiveis,
  listarUsuariosSemEquipe,
  listarUsuariosElegiveisCoordenador,
} from '../../../src/equipes/equipeController.js';

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
  await EquipeMembros.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Equipe.deleteMany({}), EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}), Usuario.deleteMany({}),
  ]);
});

// Cria equipe + registro de gincana + um aluno solto.
async function cenario() {
  const equipe = await Equipe.create({ nome: 'Time', cor: '#111' });
  const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_PRINCIPAL' });
  const aluno = await Usuario.create({ nome: 'Aluno', email: 'al@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
  return { equipe, eg, aluno };
}

describe('equipeController - adicionarMembro', () => {
  it('adiciona um usuário à equipe', async () => {
    const { equipe, aluno } = await cenario();
    const req = { params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } };
    const res = mockRes();

    await adicionarMembro(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await EquipeMembros.findOne({ usuario_id: aluno._id, equipe_id: equipe._id })).not.toBeNull();
  });

  it('retorna 400 sem usuario_id', async () => {
    const { equipe } = await cenario();
    const res = mockRes();
    await adicionarMembro({ params: { id: equipe._id.toString() }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando a equipe não existe', async () => {
    const { aluno } = await cenario();
    const res = mockRes();
    await adicionarMembro({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { usuario_id: aluno._id.toString() } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 quando o usuário já pertence a uma equipe', async () => {
    const { equipe, eg, aluno } = await cenario();
    await EquipeMembros.create({ equipe_id: equipe._id, equipe_gincana_id: eg._id, usuario_id: aluno._id });
    const res = mockRes();

    await adicionarMembro({ params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('retorna 404 quando não há EquipeGincana para a equipe', async () => {
    const equipe = await Equipe.create({ nome: 'SemGincana', cor: '#222' });
    const aluno = await Usuario.create({ nome: 'A', email: 'a@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const res = mockRes();

    await adicionarMembro({ params: { id: equipe._id.toString() }, body: { usuario_id: aluno._id.toString() } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('equipeController - removerMembroEquipe', () => {
  it('remove um membro quando solicitado pelo coordenador da equipe', async () => {
    const { equipe, eg, aluno } = await cenario();
    const coordId = new mongoose.Types.ObjectId().toString();
    await EquipeGincana.findByIdAndUpdate(eg._id, { coordenador_usuario_id: coordId });
    const membro = await EquipeMembros.create({ equipe_id: equipe._id, equipe_gincana_id: eg._id, usuario_id: aluno._id });

    const req = { usuario: { id: coordId }, params: { membroId: membro._id.toString() } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(await EquipeMembros.findById(membro._id)).toBeNull();
  });

  it('retorna 400 quando o coordenador tenta remover a si mesmo', async () => {
    const coordId = new mongoose.Types.ObjectId().toString();
    const req = { usuario: { id: coordId }, params: { membroId: coordId } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 403 quando o solicitante não coordena nenhuma equipe', async () => {
    const req = { usuario: { id: new mongoose.Types.ObjectId().toString() }, params: { membroId: new mongoose.Types.ObjectId().toString() } };
    const res = mockRes();

    await removerMembroEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// Uma equipe/EquipeGincana nova é criada a cada edição (ver criarEquipe) — o
// EquipeMembros de uma gincana anterior nunca é removido (fica como
// histórico, ver notificarTransferenciaEscola.js). Por isso "minha equipe" só
// pode ser resolvido restringindo a busca às equipes DESTA gincana.
describe('equipeController - EquipeMembros de gincana anterior não deve "vazar" para a atual', () => {
  it('listarEquipesParaInscricao marca isMinhaEquipe pela equipe da gincana ATUAL, ignorando um registro de outra edição', async () => {
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'aluno@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    // Edição anterior: aluno já foi membro de outra equipe lá.
    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    // Edição atual: aluno é membro de OUTRA equipe.
    const equipeAtual = await Equipe.create({ nome: 'Equipe Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipeAtual._id, gincana_id: 'GINCANA_ATUAL' });
    await EquipeMembros.create({ equipe_id: equipeAtual._id, usuario_id: aluno._id, is_coordenador: false });

    const req = { usuario: { id: aluno._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarEquipesParaInscricao(req, res);

    const corpo = res.json.mock.calls[0][0];
    const minha = corpo.find((e) => e.isMinhaEquipe);
    expect(minha?.nome).toBe('Equipe Atual');
  });

  it('buscarMinhaEquipeId devolve a equipe da gincana ATUAL, não a de uma edição anterior', async () => {
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'aluno2@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    const equipeAtual = await Equipe.create({ nome: 'Equipe Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipeAtual._id, gincana_id: 'GINCANA_ATUAL' });
    await EquipeMembros.create({ equipe_id: equipeAtual._id, usuario_id: aluno._id, is_coordenador: false });

    const req = { usuario: { id: aluno._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await buscarMinhaEquipeId(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ equipe_id: equipeAtual._id }));
  });

  it('buscarMinhaEquipeId retorna 404 quando o único registro é de outra gincana', async () => {
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'aluno3@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    const req = { usuario: { id: aluno._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await buscarMinhaEquipeId(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // Rota que sustenta o gate de "escolher equipe" no front (useEquipe.jsx).
  // Diferente de buscarMinhaEquipeId, "não tenho equipe" é resposta 200 — é o
  // caso NORMAL de quem acabou de ser aprovado na escola.
  it('meuVinculoNaGincana responde 200 com tem_equipe=false quando não há equipe', async () => {
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'vinculo1@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    const req = { usuario: { id: aluno._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await meuVinculoNaGincana(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tem_equipe: false, equipe_id: null }));
  });

  it('meuVinculoNaGincana devolve a equipe e o papel de coordenador da gincana ativa', async () => {
    const coord = await Usuario.create({ nome: 'Coord', email: 'vinculo2@x.com', senha: '123', tipo: 'COORDENADOR' });
    const equipe = await Equipe.create({ nome: 'Equipe Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_ATUAL' });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: coord._id, is_coordenador: true });

    const req = { usuario: { id: coord._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await meuVinculoNaGincana(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      tem_equipe: true,
      equipe_nome: 'Equipe Atual',
      is_coordenador: true,
    }));
  });

  // O gate tem de concordar com o 403 do resolverGincana: um vínculo de edição
  // ANTERIOR não libera a gincana atual (a linha de EquipeMembros nunca é
  // removida, então sem o filtro por gincana o front liberaria o sistema para
  // quem a API vai barrar em toda tela).
  it('meuVinculoNaGincana ignora vínculo de outra gincana', async () => {
    const aluno = await Usuario.create({ nome: 'Aluno', email: 'vinculo3@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    const req = { usuario: { id: aluno._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await meuVinculoNaGincana(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tem_equipe: false }));
  });

  it('atualizarEquipe permite atribuir um coordenador que só tem membresia numa gincana anterior', async () => {
    const candidato = await Usuario.create({ nome: 'Candidato', email: 'cand@x.com', senha: '123', tipo: 'COORDENADOR' });
    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: candidato._id, is_coordenador: true });

    const equipe = await Equipe.create({ nome: 'Equipe Nova', cor: '#333' });
    const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_ATUAL' });

    const req = {
      params: { id: equipe._id.toString() },
      body: { nome: 'Equipe Nova', cor: '#333', coordenador_usuario_id: candidato._id.toString() },
      gincanaId: 'GINCANA_ATUAL',
    };
    const res = mockRes();

    await atualizarEquipe(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect((await EquipeGincana.findById(eg._id)).coordenador_usuario_id.toString()).toBe(candidato._id.toString());
  });

  it('adicionarCoordenador permite adicionar quem só tem membresia numa gincana anterior', async () => {
    const candidato = await Usuario.create({
      nome: 'Candidato', email: 'cand2@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: 'ESCOLA_X', tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });
    const equipeAntiga = await Equipe.create({ nome: 'Equipe Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: candidato._id, is_coordenador: false });

    const equipe = await Equipe.create({ nome: 'Equipe Nova', cor: '#333' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_ATUAL', max_coordenadores: 2 });

    const req = {
      params: { id: equipe._id.toString() },
      body: { usuario_id: candidato._id.toString() },
      gincanaId: 'GINCANA_ATUAL',
      escolaId: 'ESCOLA_X',
    };
    const res = mockRes();

    await adicionarCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// Atribuir a equipe e conceder o papel viraram UMA ação só. Antes o endpoint
// escrevia o papel BASE (`Usuario.tipo`), que resolverEscola ignora: quem era
// adicionado aqui ficava com is_coordenador=true e sem passar em nenhum
// autorizar('COORDENADOR'), e só virava coordenador de verdade se um admin
// também trocasse o papel na tela de usuários — dois passos, sem nada avisando
// que o segundo existia. Quem parava no primeiro via o menu de coordenador com
// todas as telas vazias.
describe('equipeController - papel de coordenador acompanha o vínculo com a equipe', () => {
  const ESCOLA = 'ESCOLA_X';
  const GINCANA = 'GINCANA_ATUAL';

  // Aluno da escola ativa, livre (sem equipe nesta gincana) — é exatamente
  // quem o dropdown de "Adicionar coordenador" oferece.
  async function cenarioCoordenador(overridesUsuario = {}) {
    const equipe = await Equipe.create({ nome: 'Equipe', cor: '#333' });
    const eg = await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: GINCANA, max_coordenadores: 2 });
    const aluno = await Usuario.create({
      nome: 'Aluno Promovido', email: 'promovido@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA, tipo: 'ALUNO', turma: 'EM - 1º Ano' }],
      ...overridesUsuario,
    });
    return { equipe, eg, aluno };
  }

  const papelNoVinculo = (usuario, escolaId = ESCOLA) =>
    (usuario.vinculos || []).find((v) => String(v.escola_id) === escolaId)?.tipo;

  it('adicionarCoordenador concede o papel no VÍNCULO da escola ativa, não no tipo base', async () => {
    const { equipe, aluno } = await cenarioCoordenador();

    const req = {
      params: { id: equipe._id.toString() },
      body: { usuario_id: aluno._id.toString() },
      gincanaId: GINCANA,
      escolaId: ESCOLA,
    };
    const res = mockRes();

    await adicionarCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    // As duas metades, em sincronia: papel (permissão) e relação (dados).
    const salvo = await Usuario.findById(aluno._id);
    expect(papelNoVinculo(salvo)).toBe('COORDENADOR');
    expect(await EquipeMembros.exists({ equipe_id: equipe._id, usuario_id: aluno._id, is_coordenador: true })).toBeTruthy();

    // A turma do vínculo é preservada: sem ela o recém-coordenador não
    // conseguiria se inscrever em prova (GRUPO_INDETERMINADO).
    const vinculo = salvo.vinculos.find((v) => v.escola_id === ESCOLA);
    expect(vinculo.turma).toBe('EM - 1º Ano');
  });

  it('adicionarCoordenador recusa quem não tem turma definida', async () => {
    const { equipe, aluno } = await cenarioCoordenador({
      vinculos: [{ escola_id: ESCOLA, tipo: 'ALUNO', turma: null }],
      turma: null,
    });

    const req = {
      params: { id: equipe._id.toString() },
      body: { usuario_id: aluno._id.toString() },
      gincanaId: GINCANA,
      escolaId: ESCOLA,
    };
    const res = mockRes();

    await adicionarCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(await EquipeMembros.exists({ usuario_id: aluno._id })).toBeFalsy();
  });

  // COORDENADOR é perfil de escola única. Como a concessão do papel migrou para
  // cá, a checagem de conflito multi-escola também precisa valer aqui — senão
  // este caminho viraria a brecha para prender alguém em duas escolas.
  // O candidato é PROFESSOR nas duas porque só perfis multi-escola conseguem
  // existir assim (o próprio model recusa um ALUNO com dois vínculos).
  it('adicionarCoordenador recusa quem já atua em outra escola', async () => {
    const { equipe, aluno } = await cenarioCoordenador({
      nome: 'Professor Dois Vinculos', email: 'prof2@x.com', tipo: 'PROFESSOR',
      vinculos: [
        { escola_id: ESCOLA, tipo: 'PROFESSOR', turma: null },
        { escola_id: 'ESCOLA_B', tipo: 'PROFESSOR', turma: null },
      ],
    });

    const req = {
      params: { id: equipe._id.toString() },
      body: { usuario_id: aluno._id.toString() },
      gincanaId: GINCANA,
      escolaId: ESCOLA,
    };
    const res = mockRes();

    await adicionarCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'PERFIL_ESCOLA_UNICA' }));
    expect(await EquipeMembros.exists({ usuario_id: aluno._id })).toBeFalsy();
  });

  it('removerCoordenador devolve o papel de ALUNO no vínculo da escola ativa', async () => {
    const { equipe, aluno } = await cenarioCoordenador({
      vinculos: [{ escola_id: ESCOLA, tipo: 'COORDENADOR', turma: 'EM - 1º Ano' }],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: aluno._id, is_coordenador: true });

    const req = {
      params: { id: equipe._id.toString(), usuarioId: aluno._id.toString() },
      gincanaId: GINCANA,
      escolaId: ESCOLA,
    };
    const res = mockRes();

    await removerCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const salvo = await Usuario.findById(aluno._id);
    expect(papelNoVinculo(salvo)).toBe('ALUNO');
    expect(await EquipeMembros.exists({ usuario_id: aluno._id })).toBeFalsy();
  });

  it('removerCoordenador não rebaixa quem coordena mas é PROFESSOR na escola', async () => {
    const { equipe, aluno: professor } = await cenarioCoordenador({
      nome: 'Professora Coord', email: 'profcoord@x.com', tipo: 'PROFESSOR',
      vinculos: [{ escola_id: ESCOLA, tipo: 'PROFESSOR', turma: null }],
    });
    await EquipeMembros.create({ equipe_id: equipe._id, usuario_id: professor._id, is_coordenador: true });

    const req = {
      params: { id: equipe._id.toString(), usuarioId: professor._id.toString() },
      gincanaId: GINCANA,
      escolaId: ESCOLA,
    };
    const res = mockRes();

    await removerCoordenador(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(papelNoVinculo(await Usuario.findById(professor._id))).toBe('PROFESSOR');
  });
});

// Listagens que antes traziam TUDO (todas as gincanas/edições) em vez de só
// o que é relacionado à gincana ativa.
describe('equipeController - listagens restritas à gincana ativa', () => {
  const ESCOLA = 'ESCOLA_X';

  it('listarEquipesPublicas só lista equipes da gincana ativa', async () => {
    const eu = await Usuario.create({ nome: 'Eu', email: 'eu@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    const equipeOutraGincana = await Equipe.create({ nome: 'De Outra Gincana', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeOutraGincana._id, gincana_id: 'GINCANA_ANTIGA' });

    const equipeAtual = await Equipe.create({ nome: 'Da Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipeAtual._id, gincana_id: 'GINCANA_ATUAL' });

    const req = { usuario: { id: eu._id.toString() }, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarEquipesPublicas(req, res);

    const nomes = res.json.mock.calls[0][0].map((e) => e.nome);
    expect(nomes).toEqual(['Da Atual']);
  });

  it('listarEquipesGincana só lista o registro EquipeGincana da gincana ativa', async () => {
    const equipe = await Equipe.create({ nome: 'Time', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeGincana.create({ equipe_id: equipe._id, gincana_id: 'GINCANA_ATUAL' });

    const req = { gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarEquipesGincana(req, res);

    expect(res.json.mock.calls[0][0]).toHaveLength(1);
  });

  it('listarTodosMembros só lista membros de equipes da gincana ativa', async () => {
    const aluno1 = await Usuario.create({ nome: 'Da Atual', email: 'atual@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });
    const aluno2 = await Usuario.create({ nome: 'Da Antiga', email: 'antiga@x.com', senha: '123', tipo: 'ALUNO', turma: 'EF - 6º Ano' });

    const equipeAntiga = await Equipe.create({ nome: 'Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno2._id, is_coordenador: false });

    const equipeAtual = await Equipe.create({ nome: 'Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipeAtual._id, gincana_id: 'GINCANA_ATUAL' });
    await EquipeMembros.create({ equipe_id: equipeAtual._id, usuario_id: aluno1._id, is_coordenador: false });

    const req = { gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarTodosMembros(req, res);

    const nomes = res.json.mock.calls[0][0].map((u) => u.nome);
    expect(nomes).toEqual(['Da Atual']);
  });

  it('listarCoordenadoresDisponiveis não exclui quem só tem vínculo de equipe numa gincana anterior', async () => {
    const coord = await Usuario.create({
      nome: 'Coord Livre', email: 'coordlivre@x.com', senha: '123', tipo: 'COORDENADOR',
      vinculos: [{ escola_id: ESCOLA, tipo: 'COORDENADOR' }],
    });
    const equipeAntiga = await Equipe.create({ nome: 'Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: coord._id, is_coordenador: true });

    const req = { escolaId: ESCOLA, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarCoordenadoresDisponiveis(req, res);

    const nomes = res.json.mock.calls[0][0].map((u) => u.nome);
    expect(nomes).toContain('Coord Livre');
  });

  it('listarUsuariosSemEquipe não exclui quem só tem vínculo de equipe numa gincana anterior', async () => {
    const aluno = await Usuario.create({
      nome: 'Aluno Livre', email: 'alunolivre@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA, tipo: 'ALUNO' }],
    });
    const equipeAntiga = await Equipe.create({ nome: 'Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    const req = { escolaId: ESCOLA, gincanaId: 'GINCANA_ATUAL' };
    const res = mockRes();

    await listarUsuariosSemEquipe(req, res);

    const nomes = res.json.mock.calls[0][0].map((u) => u.nome);
    expect(nomes).toContain('Aluno Livre');
  });

  it('listarUsuariosElegiveisCoordenador não exclui quem só tem vínculo de equipe numa gincana anterior', async () => {
    const aluno = await Usuario.create({
      nome: 'Aluno Livre', email: 'alunolivre2@x.com', senha: '123', tipo: 'ALUNO',
      vinculos: [{ escola_id: ESCOLA, tipo: 'ALUNO' }],
    });
    const equipeAntiga = await Equipe.create({ nome: 'Antiga', cor: '#111' });
    await EquipeGincana.create({ equipe_id: equipeAntiga._id, gincana_id: 'GINCANA_ANTIGA' });
    await EquipeMembros.create({ equipe_id: equipeAntiga._id, usuario_id: aluno._id, is_coordenador: false });

    const equipeAtual = await Equipe.create({ nome: 'Atual', cor: '#222' });
    await EquipeGincana.create({ equipe_id: equipeAtual._id, gincana_id: 'GINCANA_ATUAL' });

    const req = { escolaId: ESCOLA, gincanaId: 'GINCANA_ATUAL', params: { equipeId: equipeAtual._id.toString() } };
    const res = mockRes();

    await listarUsuariosElegiveisCoordenador(req, res);

    const nomes = res.json.mock.calls[0][0].map((u) => u.nome);
    expect(nomes).toContain('Aluno Livre');
  });
});

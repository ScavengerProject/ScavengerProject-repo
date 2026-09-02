import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Prova from '../../../src/models/Prova.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Usuario from '../../../src/models/Usuario.js';
import ProvaEquipeParticipacao from '../../../src/models/ProvaEquipeParticipacao.js';
import { listarEquipeParticipanteDaProva } from '../../../src/provas/provaParticipacaoController.js';

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
  ]);
});

const criarProva = (overrides) => Prova.create({
  titulo: 'Prova',
  descricao: 'desc',
  pontuacao: { tipo: 'FIXA', valor: 10 },
  criado_por_usuario_id: new mongoose.Types.ObjectId(),
  ...overrides,
});

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

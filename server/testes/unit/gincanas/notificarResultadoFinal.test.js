import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Gincana from '../../../src/models/Gincana.js';
import Escola from '../../../src/models/Escola.js';
import Equipe from '../../../src/models/Equipe.js';
import EquipeGincana from '../../../src/models/EquipeGincana.js';
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import Notificacao from '../../../src/models/Notificacao.js';
import ConfiguracaoGincana from '../../../src/models/ConfiguracaoGincana.js';
import { enviarEmailResultadoFinal } from '../../../src/utils/emailService.js';
import {
  notificarResultadoFinal,
  enviarEmailDoResultadoFinal,
} from '../../../src/gincanas/notificarResultadoFinal.js';

// Só o envio é falso; o template continua sendo o de verdade nos outros testes.
jest.mock('../../../src/utils/emailService.js', () => ({
  ...jest.requireActual('../../../src/utils/emailService.js'),
  enviarEmailResultadoFinal: jest.fn().mockResolvedValue({ sucesso: true }),
}));

let mongoServer;
const adminId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    Gincana.deleteMany({}), Escola.deleteMany({}), Equipe.deleteMany({}), EquipeGincana.deleteMany({}),
    EquipeMembros.deleteMany({}), Notificacao.deleteMany({}), ConfiguracaoGincana.deleteMany({}),
  ]);
});

const novoId = () => new mongoose.Types.ObjectId();

// Gincana encerrada com 3 equipes:
//   Leões (1º): dois coordenadores (is_coordenador) + um membro comum
//   Águias (2º): só o coordenador "legado" (EquipeGincana.coordenador_usuario_id)
//   Tubarões (3º): sem coordenador
async function cenario({ pontosVisiveis = false } = {}) {
  await Escola.create({ _id: 'ESC1', nome: 'Escola Modelo', criado_por: adminId });
  const [leoes, aguias, tubaroes] = await Promise.all(['Leões', 'Águias', 'Tubarões'].map((nome, i) => (
    Equipe.create({ nome, cor: ['#f00', '#00f', '#0f0'][i], gincana_id: 'G1' })
  )));
  const coordLeoes = [novoId(), novoId()];
  const coordAguias = novoId();

  await EquipeGincana.create([
    { equipe_id: leoes._id, gincana_id: 'G1', pontos_acumulados: 100 },
    { equipe_id: aguias._id, gincana_id: 'G1', pontos_acumulados: 80, coordenador_usuario_id: coordAguias },
    { equipe_id: tubaroes._id, gincana_id: 'G1', pontos_acumulados: 50 },
  ]);
  await EquipeMembros.create([
    { equipe_id: leoes._id, usuario_id: coordLeoes[0], is_coordenador: true },
    { equipe_id: leoes._id, usuario_id: coordLeoes[1], is_coordenador: true },
    { equipe_id: leoes._id, usuario_id: novoId(), is_coordenador: false },
  ]);
  if (pontosVisiveis) {
    await ConfiguracaoGincana.create({ gincana_id: 'G1', mostrar_notas_ranking: true });
  }

  const gincana = await Gincana.create({
    _id: 'G1',
    escola_id: 'ESC1',
    nome: 'Gincana da Primavera',
    ano: 2026,
    status: 'ENCERRADA',
    criado_por: adminId,
    resultado_final: {
      encerrada_em: new Date(Date.now() - 1000),
      encerrada_por: adminId,
      classificacao: [
        { posicao: 1, equipe_id: leoes._id, nome: 'Leões', cor: '#f00', pontos: 100 },
        { posicao: 2, equipe_id: aguias._id, nome: 'Águias', cor: '#00f', pontos: 80 },
        { posicao: 3, equipe_id: tubaroes._id, nome: 'Tubarões', cor: '#0f0', pontos: 50 },
      ],
    },
  });
  return { gincana, leoes, aguias, tubaroes, coordLeoes, coordAguias };
}

describe('notificarResultadoFinal', () => {
  it('cria uma notificação por coordenador, inclusive o legado, e nenhuma para membros comuns', async () => {
    const { gincana, leoes, aguias, coordLeoes, coordAguias } = await cenario();

    const criadas = await notificarResultadoFinal(gincana);

    expect(criadas).toBe(3);
    const notificacoes = await Notificacao.find({ tipo: 'RESULTADO_FINAL' });
    const porUsuario = Object.fromEntries(notificacoes.map((n) => [String(n.usuario_id), n]));
    expect(Object.keys(porUsuario).sort())
      .toEqual([...coordLeoes, coordAguias].map(String).sort());
    expect(String(porUsuario[String(coordLeoes[0])].referencia_id)).toBe(String(leoes._id));
    expect(String(porUsuario[String(coordAguias)].referencia_id)).toBe(String(aguias._id));
    expect(notificacoes.every((n) => n.gincana_id === 'G1')).toBe(true);
    expect(porUsuario[String(coordLeoes[0])].titulo).toBe('🏆 Leões é a equipe campeã!');
    expect(porUsuario[String(coordAguias)].titulo).toBe('🥈 Águias ficou em 2º lugar');
  });
});

describe('enviarEmailDoResultadoFinal', () => {
  const usuario = { _id: novoId(), nome: 'Ana', email: 'ana@escola.br' };
  const notificacaoDe = (equipe, criadoEm = new Date()) => ({
    gincana_id: 'G1', referencia_id: equipe._id, criado_em: criadoEm,
  });

  it('monta o email a partir do resultado congelado', async () => {
    const { aguias } = await cenario();

    const resultado = await enviarEmailDoResultadoFinal(usuario, notificacaoDe(aguias));

    expect(resultado.sucesso).toBe(true);
    const [destinatario, dados] = enviarEmailResultadoFinal.mock.calls[0];
    expect(destinatario).toBe('ana@escola.br');
    expect(dados).toMatchObject({
      nomeDestinatario: 'Ana',
      nomeEquipe: 'Águias',
      posicao: 2,
      totalEquipes: 3,
      pontos: null,
      empatadaCom: [],
      gincanaNome: 'Gincana da Primavera',
      escolaNome: 'Escola Modelo',
    });
    expect(dados.podio.map((p) => p.nome)).toEqual(['Leões', 'Águias', 'Tubarões']);
    expect(dados.mensagem.emoji).toBe('🥈');
    expect(dados.linkCerimonia).toMatch(/\/cerimonia\/G1$/);
  });

  it('inclui os pontos quando a gincana mostra as notas', async () => {
    const { leoes } = await cenario({ pontosVisiveis: true });

    await enviarEmailDoResultadoFinal(usuario, notificacaoDe(leoes));

    expect(enviarEmailResultadoFinal.mock.calls[0][1].pontos).toBe(100);
  });

  it('aponta o empate', async () => {
    const { gincana, aguias } = await cenario();
    gincana.resultado_final.classificacao[1].posicao = 1;
    await gincana.save();

    await enviarEmailDoResultadoFinal(usuario, notificacaoDe(aguias));

    expect(enviarEmailResultadoFinal.mock.calls[0][1].empatadaCom).toEqual(['Leões']);
  });

  it('não envia se a gincana foi reaberta', async () => {
    const { leoes } = await cenario();
    await Gincana.updateOne({ _id: 'G1' }, { status: 'ATIVA' });

    const resultado = await enviarEmailDoResultadoFinal(usuario, notificacaoDe(leoes));

    expect(resultado.sucesso).toBe(false);
    expect(enviarEmailResultadoFinal).not.toHaveBeenCalled();
  });

  it('não envia uma notificação de um encerramento anterior (evita duplicata)', async () => {
    const { leoes } = await cenario();

    const resultado = await enviarEmailDoResultadoFinal(usuario, notificacaoDe(leoes, new Date(Date.now() - 60000)));

    expect(resultado.sucesso).toBe(false);
    expect(enviarEmailResultadoFinal).not.toHaveBeenCalled();
  });
});

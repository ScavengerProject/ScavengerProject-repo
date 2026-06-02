// src/equipes/emprestimoEquipeController.js
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembro from '../models/EquipeMembros.js';
import Prova from '../models/Prova.js';
import Usuario from '../models/Usuario.js';

// Campos de populate para devolver nomes úteis no front
const basePopulate = [
  { path: 'usuario_id', select: 'nome email tipo' },
  {
    path: 'equipe_origem_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  {
    path: 'equipe_destino_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  { path: 'prova_id', select: 'titulo descricao data_inicio data_fim' },
  { path: 'criado_por', select: 'nome email tipo' },
  { path: 'encerrado_por', select: 'nome email tipo' },
];

// [POST] /api/equipes/emprestimos
// body: { usuario_id, equipe_destino_id, prova_id, inicio?, fim? }
export const criarEmprestimo = async (req, res) => {
  try {
    const me = req.usuario;
    const { usuario_id, equipe_destino_id, prova_id, inicio, fim } = req.body;

    if (!usuario_id || !equipe_destino_id || !prova_id) {
      return res.status(400).json({ message: 'usuario_id, equipe_destino_id e prova_id são obrigatórios.' });
    }

    // valida usuário
    const usuario = await Usuario.findById(usuario_id).select('_id nome tipo');
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // valida prova
    const prova = await Prova.findById(prova_id).select('_id titulo data_inicio data_fim');
    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });

    // valida equipe destino (EquipeGincana)
    const egDestino = await EquipeGincana.findById(equipe_destino_id).select('_id equipe_id gincana_id coordenador_usuario_id');
    if (!egDestino) return res.status(404).json({ message: 'Equipe destino (gincana) não encontrada.' });

    // Origem: equipe atual do usuário (EquipeMembros → equipe_id)
    const membroAtual = await EquipeMembro.findOne({ usuario_id }).select('_id equipe_id');
    if (!membroAtual) return res.status(422).json({ message: 'Usuário não pertence a nenhuma equipe no momento.' });

    // Buscar o EquipeGincana correspondente à equipe_id do membro
    const egOrigem = await EquipeGincana.findOne({ equipe_id: membroAtual.equipe_id }).select('_id equipe_id');
    if (!egOrigem) return res.status(422).json({ message: 'Equipe de origem não encontrada no contexto da gincana.' });

    // Evita empréstimo para a mesma equipe
    if (String(egOrigem._id) === String(egDestino._id)) {
      return res.status(409).json({ message: 'Usuário já está nesta equipe.' });
    }

    // Impede 2 empréstimos ATIVO para a mesma prova
    const jaAtivo = await EmprestimoEquipe.findOne({ usuario_id, prova_id, status: 'ATIVO' }).select('_id');
    if (jaAtivo) return res.status(409).json({ message: 'Já existe um empréstimo ATIVO para este usuário nesta prova.' });

    // cria
    const doc = await EmprestimoEquipe.create({
      usuario_id,
      equipe_origem_id: egOrigem._id,
      equipe_destino_id,
      prova_id,
      inicio: inicio ? new Date(inicio) : new Date(),
      fim: fim ? new Date(fim) : null,
      status: 'ATIVO',
      criado_por: me.id,
    });

    const result = await EmprestimoEquipe.findById(doc._id).populate(basePopulate);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar empréstimo.', error: error.message });
  }
};

// [GET] /api/equipes/emprestimos
// filtros opcionais: ?status=ATIVO|ENCERRADO|CANCELADO&provaId=...&usuarioId=...
// ADMIN vê tudo; COORDENADOR vê apenas empréstimos onde origem OU destino sejam equipes que coordena
export const listarEmprestimos = async (req, res) => {
  try {
    const me = req.usuario;
    const { status, provaId, usuarioId } = req.query;

    const filtro = {};
    if (status) filtro.status = status;
    if (provaId) filtro.prova_id = provaId;
    if (usuarioId) filtro.usuario_id = usuarioId;

    if (me.tipo === 'COORDENADOR') {
      const equipesCoord = await EquipeGincana.find({ coordenador_usuario_id: me.id }).select('_id');
      const ids = equipesCoord.map(e => e._id);
      filtro.$or = [{ equipe_origem_id: { $in: ids } }, { equipe_destino_id: { $in: ids } }];
    }

    const items = await EmprestimoEquipe.find(filtro).sort({ criado_em: -1 }).populate(basePopulate);
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar empréstimos.', error: error.message });
  }
};

// [PATCH] /api/equipes/emprestimos/:id/encerrar
// body: { justificativa? }
export const encerrarEmprestimo = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa } = req.body;

    const emp = await EmprestimoEquipe.findById(id);
    if (!emp) return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    if (emp.status !== 'ATIVO') return res.status(409).json({ message: 'Empréstimo não está ATIVO.' });

    emp.status = 'ENCERRADO';
    emp.fim = new Date();
    emp.encerrado_por = me.id;
    if (justificativa) emp.justificativa_encerramento = justificativa;
    await emp.save();

    const result = await EmprestimoEquipe.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao encerrar empréstimo.', error: error.message });
  }
};

// -------------------------------------------
// Helper que você pode reutilizar no fluxo de “responder prova”, etc.
// Retorna o _id de EquipeGincana “efetiva” para o par (usuario, prova) considerando empréstimo ATIVO.
export async function resolverEquipeParaProva(usuarioId, provaId) {
  // 1) existe empréstimo ATIVO para esta prova?
  const emp = await EmprestimoEquipe.findOne({ usuario_id: usuarioId, prova_id: provaId, status: 'ATIVO' })
    .select('equipe_destino_id fim inicio');

  if (emp) {
    // O empréstimo vale durante o tempo da prova. Após a prova terminar (data_fim),
    // o aluno volta a contar pela sua equipe de origem — ele nunca trocou de equipe de fato.
    const prova = await Prova.findById(provaId).select('data_fim');
    const agora = new Date();
    const provaEncerrada = prova?.data_fim ? agora > new Date(prova.data_fim) : false;
    const emprestimoEncerrado = emp.fim ? agora > new Date(emp.fim) : false;

    if (!provaEncerrada && !emprestimoEncerrado) {
      return emp.equipe_destino_id; // equipe “válida” durante a prova
    }
  }

  // 2) senão, cai na equipe original do usuário
  const membro = await EquipeMembro.findOne({ usuario_id: usuarioId }).select('equipe_id');
  return membro ? membro.equipe_id : null;
}

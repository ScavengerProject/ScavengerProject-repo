import mongoose from 'mongoose';
import MigracaoEquipe from '../models/MigracaoEquipe.js';
import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembro from '../models/EquipeMembros.js';
import Usuario from '../models/Usuario.js';

// Populates padronizados (para devolver nomes legíveis no front)
const basePopulate = [
  { path: 'usuario_id', select: 'nome email tipo' },
  {
    path: 'equipe_origem_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' }
  },
  {
    path: 'equipe_destino_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' }
  },
  { path: 'solicitado_por', select: 'nome email tipo' },
  { path: 'aprovado_por', select: 'nome email tipo' },
];

// helper: normaliza nomes no topo (equipe_origem / equipe_destino)
function normalizeDocs(items) {
  return items.map(doc => ({
    ...doc.toObject(),
    equipe_origem: doc.equipe_origem_id?.equipe_id ? {
      _id: doc.equipe_origem_id.equipe_id._id,
      nome: doc.equipe_origem_id.equipe_id.nome
    } : null,
    equipe_destino: doc.equipe_destino_id?.equipe_id ? {
      _id: doc.equipe_destino_id.equipe_id._id,
      nome: doc.equipe_destino_id.equipe_id.nome
    } : null,
  }));
}

/**
 * GET /api/equipes/migracoes
 * GET /api/equipes/migracoes/minhas     -> (router seta req.query.mode = 'MINE')
 * GET /api/equipes/migracoes/pendentes  -> (router seta req.query.mode = 'COORD' e status=PENDENTE)
 *
 * Filtro contextual por perfil:
 * - ADMIN: pode ver tudo (com ou sem status)
 * - COORDENADOR (mode=COORD): vê pendentes relacionadas às equipes que coordena (origem/destino)
 * - padrão (ou mode=MINE): vê apenas as do próprio usuário (autor da solicitação)
 */
export const listarMigracoes = async (req, res) => {
  try {
    const me = req.usuario;
    const { status, mode } = req.query;

    const filtro = {};
    if (status) filtro.status = status; // PENDENTE | APROVADA | REJEITADA

    if (me.tipo === 'ADMIN') {
      // Admin vê tudo (apenas respeita status se enviado)
      // nada a adicionar
    } else if (me.tipo === 'COORDENADOR' && mode === 'COORD') {
      // Coordenador quer ver as que envolvem equipes que ele coordena (origem ou destino)
      const equipesCoord = await EquipeGincana
        .find({ coordenador_usuario_id: me.id })
        .select('_id');
      const ids = equipesCoord.map(e => e._id);
      filtro.$or = [
        { equipe_origem_id: { $in: ids } },
        { equipe_destino_id: { $in: ids } },
      ];
    } else {
      // padrão: somente minhas (do solicitante/participante)
      filtro.usuario_id = me.id;
    }

    const items = await MigracaoEquipe
      .find(filtro)
      .sort({ criado_em: -1 })
      .populate(basePopulate);

    return res.status(200).json(normalizeDocs(items));
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar migrações.', error: error.message });
  }
};

/**
 * POST /api/equipes/migracoes/solicitar
 * Body: { equipe_destino_id, motivo }
 * Quem chama: ALUNO/PROFESSOR/PAI/MÃE/COORDENADOR/ADMIN (self-service)
 */
export const solicitarMigracao = async (req, res) => {
  try {
    const me = req.usuario;
    const { equipe_destino_id, motivo } = req.body;

    if (!equipe_destino_id) {
      return res.status(400).json({ message: 'equipe_destino_id é obrigatório.' });
    }
    if (!motivo || !String(motivo).trim()) {
      return res.status(400).json({ message: 'motivo é obrigatório.' });
    }

    const equipeDestino = await Equipe.findById(equipe_destino_id);
    if (!equipeDestino) {
      return res.status(404).json({ message: 'Equipe de destino não encontrada.' });
    }

    // ponte da equipe para a gincana
    const egDestino = await EquipeGincana.findOne({ equipe_id: equipe_destino_id });
    if (!egDestino) {
      return res.status(404).json({ message: 'Equipe destino não está associada a uma gincana.' });
    }

    // origem: equipe-gincana atual do usuário
    const membroAtual = await EquipeMembro.findOne({ usuario_id: me.id });
    if (!membroAtual) {
      return res.status(422).json({ message: 'Você não pertence a nenhuma equipe no momento.' });
    }

    const doc = await MigracaoEquipe.create({
      usuario_id: me.id,
      equipe_origem_id: membroAtual.equipe_id, // _id de EquipeGincana
      equipe_destino_id: egDestino._id,        // _id de EquipeGincana
      motivo: String(motivo).trim(),
      solicitado_por: me.id,
      status: 'PENDENTE',
    });

    const result = await MigracaoEquipe.findById(doc._id).populate(basePopulate);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao solicitar migração.', error: error.message });
  }
};

/**
 * PATCH /api/equipes/migracoes/:id/decidir
 * Body: { aprovar:boolean } ou { aprovado:boolean } + justificativa?:string
 * Quem chama: ADMIN/COORDENADOR
 */
export const decidirMigracao = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { aprovar, aprovado, justificativa } = req.body;

    // aceitar tanto "aprovar" quanto "aprovado" (para compatibilidade com o front)
    const isApproved = (typeof aprovar === 'boolean') ? aprovar
                     : (typeof aprovado === 'boolean') ? aprovado
                     : undefined;

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ message: 'Campo "aprovar" (boolean) é obrigatório.' });
    }

    const mig = await MigracaoEquipe.findById(id);
    if (!mig) return res.status(404).json({ message: 'Solicitação não encontrada.' });
    if (mig.status !== 'PENDENTE') {
      return res.status(409).json({ message: 'Solicitação já foi decidida.' });
    }

    // Coordenador só decide se estiver vinculado à origem ou destino
    if (me.tipo === 'COORDENADOR') {
      const coordEquipes = await EquipeGincana.find({ coordenador_usuario_id: me.id }).select('_id');
      const ids = coordEquipes.map(e => e._id.toString());
      if (!ids.includes(mig.equipe_origem_id.toString()) && !ids.includes(mig.equipe_destino_id.toString())) {
        return res.status(403).json({ message: 'Você não pode decidir esta solicitação.' });
      }
    }

    if (isApproved) {
      // mover membro para a equipe de destino
      await EquipeMembro.updateOne(
        { usuario_id: mig.usuario_id },
        { $set: { equipe_id: mig.equipe_destino_id } }
      );
      mig.status = 'APROVADA';
    } else {
      mig.status = 'REJEITADA';
    }

    mig.aprovado_por = me.id;
    if (justificativa) mig.justificativa = justificativa;
    await mig.save();

    const saida = await MigracaoEquipe.findById(id).populate(basePopulate);
    return res.status(200).json(saida);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao decidir solicitação.', error: error.message });
  }
};

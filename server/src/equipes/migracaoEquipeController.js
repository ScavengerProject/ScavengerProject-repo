// src/equipes/migracaoEquipeController.js
import MigracaoEquipe from '../models/MigracaoEquipe.js';
import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembro from '../models/EquipeMembros.js';
import { criarNotificacao } from '../notificacoes/notificacaoController.js';
import { getEquipesGincanaDoCoordenador, getCoordenadoresIdsDaEquipe } from './coordenadorEquipe.js';

const GINCANA_ATUAL_ID = 'GINCANA_PRINCIPAL';

// Campos comuns de populate para devolver nomes/cores no front
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
  { path: 'solicitado_por', select: 'nome email tipo' },
  { path: 'aprovado_por', select: 'nome email tipo' },
];

function normalizeEquipes(docs) {
  return docs.map((doc) => ({
    ...doc.toObject(),
    equipe_origem: doc.equipe_origem_id?.equipe_id
      ? {
        _id: doc.equipe_origem_id.equipe_id._id,
        nome: doc.equipe_origem_id.equipe_id.nome,
      }
      : null,
    equipe_destino: doc.equipe_destino_id?.equipe_id
      ? {
        _id: doc.equipe_destino_id.equipe_id._id,
        nome: doc.equipe_destino_id.equipe_id.nome,
      }
      : null,
  }));
}

/**
 * GET /api/equipes/migracoes/minhas
 * Lista as solicitações do próprio usuário.
 */
export const listarMinhasMigracoes = async (req, res) => {
  try {
    const meId = req.usuario.id;

    const items = await MigracaoEquipe.find({ usuario_id: meId })
      .sort({ criado_em: -1 })
      .populate(basePopulate);

    return res.status(200).json(normalizeEquipes(items));
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Erro ao listar migrações.', error: error.message });
  }
};

/**
 * GET /api/equipes/migracoes/pendentes
 * ADMIN → todas PENDENTE
 * COORDENADOR → PENDENTE onde DESTINO pertence a equipe coordenada por mim
 *   (a entrada na equipe é aprovada pelo coordenador de destino — #16)
 */
export const listarMigracoesPendentes = async (req, res) => {
  try {
    const me = req.usuario;

    let filtro = { status: 'PENDENTE' };

    if (me.tipo === 'COORDENADOR') {
      const equipesCoord = await getEquipesGincanaDoCoordenador(me.id);

      const ids = equipesCoord.map((e) => e._id);

      // se não coordena nenhuma equipe, não há pendências
      if (!ids.length) {
        return res.status(200).json([]);
      }

      // Mostrar apenas solicitações de ENTRADA na(s) minha(s) equipe(s),
      // ou seja, cujo DESTINO é coordenado por mim.
      filtro.equipe_destino_id = { $in: ids };
    }
    // se ADMIN, usa apenas { status: 'PENDENTE' }

    const items = await MigracaoEquipe.find(filtro)
      .sort({ criado_em: -1 })
      .populate(basePopulate);

    return res.status(200).json(normalizeEquipes(items));
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Erro ao listar pendentes.', error: error.message });
  }
};

/**
 * POST /api/equipes/migracoes/solicitar
 */
export const solicitarMigracao = async (req, res) => {
  try {
    const me = req.usuario;
    const { equipe_destino_id, motivo } = req.body;

    if (!equipe_destino_id) return res.status(400).json({ message: 'equipe_destino_id é obrigatório.' });
    if (!motivo || !String(motivo).trim()) return res.status(400).json({ message: 'motivo é obrigatório.' });

    const equipeDestino = await Equipe.findById(equipe_destino_id);
    if (!equipeDestino) return res.status(404).json({ message: 'Equipe de destino não encontrada.' });

    const egDestino = await EquipeGincana.findOne({ equipe_id: equipe_destino_id });
    if (!egDestino) return res.status(404).json({ message: 'Equipe destino não está associada a uma gincana.' });

    const membroAtual = await EquipeMembro.findOne({ usuario_id: me.id });
    if (!membroAtual) return res.status(422).json({ message: 'Você não pertence a nenhuma equipe no momento.' });

    // Verifica se a equipe atual do usuário está na gincana ativa
    const egOrigem = await EquipeGincana.findOne({
      _id: membroAtual.equipe_id,
      gincana_id: GINCANA_ATUAL_ID
    });

    if (!egOrigem) {
      return res.status(404).json({ message: 'Sua equipe atual não está vinculada à gincana ativa.' });
    }

    const solicitacaoPendente = await MigracaoEquipe.findOne({
      usuario_id: me.id,
      status: 'PENDENTE'
    });
    if (solicitacaoPendente) {
      return res.status(409).json({ message: 'Você já possui uma solicitação pendente.' });
    }

    if (egOrigem._id.toString() === egDestino._id.toString()) {
      return res.status(400).json({ message: 'Você já faz parte desta equipe.' });
    }

    const doc = await MigracaoEquipe.create({
      usuario_id: me.id,
      equipe_origem_id: egOrigem._id, // agr salva o ID correto que o coordenador procura
      equipe_destino_id: egDestino._id,
      motivo,
      solicitado_por: me.id,
      status: 'PENDENTE',
    });

    const result = await MigracaoEquipe.findById(doc._id).populate(basePopulate);

    // #16: notifica o coordenador da equipe de destino sobre a nova solicitação
    // de entrada. Falhas aqui não devem derrubar o fluxo de solicitação.
    try {
      // Notifica TODOS os coordenadores da equipe de destino (poderes iguais).
      const coordenadoresDestino = await getCoordenadoresIdsDaEquipe(egDestino);
      const nomeSolicitante = result.usuario_id?.nome || 'Um participante';
      await Promise.all(
        coordenadoresDestino.map((coordId) =>
          criarNotificacao(
            coordId,
            'MIGRACAO',
            'Nova solicitação de entrada',
            `${nomeSolicitante} solicitou entrada na equipe "${equipeDestino.nome}". Avalie a solicitação na tela de aprovações.`,
            null,
            doc._id
          )
        )
      );
    } catch (notifErr) {
      console.error('Erro ao notificar coordenador de destino sobre migração:', notifErr);
    }

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao solicitar migração.', error: error.message });
  }
};

/**
 * PATCH /api/equipes/migracoes/:id/decidir
 * body: { aprovar: boolean, justificativa?: string }
 * - Só ADMIN ou COORDENADOR (coordenador precisa estar relacionado à origem ou destino)
 */
export const decidirMigracao = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { aprovar, justificativa } = req.body;

    if (typeof aprovar !== 'boolean') {
      return res
        .status(400)
        .json({ message: 'Campo "aprovar" (boolean) é obrigatório.' });
    }

    const mig = await MigracaoEquipe.findById(id);
    if (!mig) return res.status(404).json({ message: 'Solicitação não encontrada.' });
    if (mig.status !== 'PENDENTE') {
      return res.status(409).json({ message: 'Solicitação já foi decidida.' });
    }

    if (me.tipo === 'COORDENADOR') {
      const coordEquipes = await getEquipesGincanaDoCoordenador(me.id);
      const ids = coordEquipes.map((e) => e._id.toString());

      // #16: a entrada é aprovada pelo coordenador de DESTINO.
      if (!ids.includes(mig.equipe_destino_id.toString())) {
        return res
          .status(403)
          .json({ message: 'Você não pode decidir esta solicitação.' });
      }
    }

    if (aprovar) {
      // Verificar se o membro existe antes de atualizar
      const membroExistente = await EquipeMembro.findOne({ usuario_id: mig.usuario_id });
      if (!membroExistente) {
        return res.status(422).json({
          message: 'Membro não encontrado na equipe atual. Migração não pode ser processada.'
        });
      }

      // Atualizar a equipe do membro
      const resultadoUpdate = await EquipeMembro.updateOne(
        { usuario_id: mig.usuario_id },
        { $set: { equipe_id: mig.equipe_destino_id } }
      );

      // Verificar se a atualização foi bem-sucedida
      const membroAtualizado = await EquipeMembro.findOne({ usuario_id: mig.usuario_id });
      if (!membroAtualizado || membroAtualizado.equipe_id.toString() !== mig.equipe_destino_id.toString()) {
        return res.status(500).json({
          message: 'Falha ao atualizar a equipe do membro. Migração não foi concluída.'
        });
      }

      mig.status = 'APROVADA';
    } else {
      mig.status = 'REJEITADA';
    }

    mig.aprovado_por = me.id;
    if (justificativa) mig.justificativa = justificativa;
    await mig.save();

    const saida = await MigracaoEquipe.findById(id).populate(basePopulate);

    // #16: notifica o solicitante sobre a decisão. Não deve quebrar o fluxo.
    try {
      const aprovada = mig.status === 'APROVADA';
      const nomeDestino = saida.equipe_destino?.nome || 'a equipe solicitada';
      const titulo = aprovada
        ? 'Solicitação de entrada aprovada'
        : 'Solicitação de entrada rejeitada';
      const mensagem = aprovada
        ? `Sua solicitação de entrada na equipe "${nomeDestino}" foi aprovada.`
        : `Sua solicitação de entrada na equipe "${nomeDestino}" foi rejeitada.` +
          (justificativa ? ` Justificativa: ${justificativa}` : '');
      await criarNotificacao(mig.usuario_id, 'MIGRACAO', titulo, mensagem, null, mig._id);
    } catch (notifErr) {
      console.error('Erro ao notificar solicitante sobre decisão de migração:', notifErr);
    }

    return res.status(200).json(saida);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Erro ao decidir solicitação.', error: error.message });
  }
};

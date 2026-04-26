import Notificacao from '../models/Notificacao.js';
import { emailQueue } from './emailQueue.js';
import Usuario from '../models/Usuario.js';
import Prova from '../models/Prova.js';

/**
 * Listar notificações do usuário autenticado
 * GET /api/notificacoes
 */
export const listarNotificacoes = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { lida, tipo } = req.query;

    const filtro = { usuario_id: usuarioId };
    if (lida !== undefined) {
      filtro.lida = lida === 'true';
    }
    if (tipo) {
      filtro.tipo = tipo;
    }

    const notificacoes = await Notificacao.find(filtro)
      .populate('prova_id', 'titulo descricao formato data_inicio data_fim')
      .sort({ criado_em: -1 })
      .limit(100);

    res.status(200).json(notificacoes);
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ message: 'Erro ao listar notificações.', error: error.message });
  }
};

/**
 * Obter contagem de notificações não lidas
 * GET /api/notificacoes/nao-lidas/contagem
 */
export const contarNotificacoesNaoLidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const contagem = await Notificacao.countDocuments({
      usuario_id: usuarioId,
      lida: false
    });

    res.status(200).json({ contagem });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ message: 'Erro ao contar notificações.', error: error.message });
  }
};

/**
 * Marcar notificação como lida
 * PATCH /api/notificacoes/:id/marcar-lida
 */
export const marcarComoLida = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const notificacao = await Notificacao.findOne({
      _id: id,
      usuario_id: usuarioId
    });

    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada.' });
    }

    notificacao.lida = true;
    notificacao.lida_em = new Date();
    await notificacao.save();

    res.status(200).json({ message: 'Notificação marcada como lida.', notificacao });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificação.', error: error.message });
  }
};

/**
 * Marcar todas as notificações como lidas
 * PATCH /api/notificacoes/marcar-todas-lidas
 */
export const marcarTodasComoLidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const resultado = await Notificacao.updateMany(
      { usuario_id: usuarioId, lida: false },
      { 
        lida: true,
        lida_em: new Date()
      }
    );

    res.status(200).json({ 
      message: 'Todas as notificações foram marcadas como lidas.',
      atualizadas: resultado.modifiedCount
    });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificações.', error: error.message });
  }
};

/**
 * Obter uma notificação específica
 * GET /api/notificacoes/:id
 */
export const obterNotificacao = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const notificacao = await Notificacao.findOne({
      _id: id,
      usuario_id: usuarioId
    }).populate('prova_id', 'titulo descricao formato data_inicio data_fim');

    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada.' });
    }

    res.status(200).json(notificacao);
  } catch (error) {
    console.error('Erro ao obter notificação:', error);
    res.status(500).json({ message: 'Erro ao obter notificação.', error: error.message });
  }
};

/**
 * Deletar uma notificação
 * DELETE /api/notificacoes/:id
 */
export const deletarNotificacao = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const notificacao = await Notificacao.findOneAndDelete({
      _id: id,
      usuario_id: usuarioId
    });

    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada.' });
    }

    res.status(200).json({ message: 'Notificação deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({ message: 'Erro ao deletar notificação.', error: error.message });
  }
};

/**
 * Função auxiliar para criar notificações (usada internamente)
 * @param {string} usuarioId - ID do usuário
 * @param {string} tipo - Tipo de notificação (NOVA_PROVA, RESULTADO, COMUNICADO)
 * @param {string} titulo - Título da notificação
 * @param {string} mensagem - Mensagem da notificação
 * @param {string} provaId - ID da prova (opcional)
 * @param {string} referenciaId - ID de referência (feedback, etc.) (opcional)
 * @returns {Promise<Object>} - Notificação criada
 */

export const criarNotificacao = async (
  usuarioId,
  tipo,
  titulo,
  mensagem,
  provaId = null,
  referenciaId = null
) => {
  try {
    const notificacao = new Notificacao({
      usuario_id: usuarioId,
      tipo,
      titulo,
      mensagem,
      prova_id: provaId,
      referencia_id: referenciaId,
      lida: false,
      email_enviado: false
    });

    const notificacaoSalva = await notificacao.save();

    await emailQueue.add('enviar-email', {
      notificacaoId: notificacaoSalva._id,
      usuarioId,
      tipo,
      provaId,
      titulo,
      mensagem
    }, {
      attempts: 3, // retry automático
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    return notificacaoSalva;

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
};


// src/equipes/solicitacaoEmprestimoController.js
import SolicitacaoEmprestimo from '../models/SolicitacaoEmprestimo.js';
import OfertaEmprestimo from '../models/OfertaEmprestimo.js';
import EquipeGincana from '../models/EquipeGincana.js';
import Prova from '../models/Prova.js';
import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';

const basePopulate = [
  { path: 'coordenador_solicitante_id', select: 'nome email tipo' },
  {
    path: 'equipe_solicitante_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  { path: 'prova_id', select: 'titulo descricao data_inicio data_fim' },
  { path: 'aprovado_por', select: 'nome email tipo' },
  { path: 'cancelado_por', select: 'nome email tipo' },
];

// [POST] /api/equipes/solicitacoes-emprestimo
// Coordenador cria uma solicitação de empréstimo
export const criarSolicitacao = async (req, res) => {
  try {
    const me = req.usuario;
    const { prova_id, quantidade_solicitada, criterios, motivo } = req.body;

    if (!prova_id || !quantidade_solicitada || !motivo) {
      return res.status(400).json({ 
        message: 'prova_id, quantidade_solicitada e motivo são obrigatórios.' 
      });
    }

    // Verificar se usuário é coordenador
    if (me.tipo !== 'COORDENADOR') {
      return res.status(403).json({ message: 'Apenas coordenadores podem criar solicitações.' });
    }

    // Buscar a equipe que o coordenador gerencia
    const equipeGincana = await EquipeGincana.findOne({ coordenador_usuario_id: me.id });
    if (!equipeGincana) {
      return res.status(404).json({ message: 'Você não é coordenador de nenhuma equipe.' });
    }

    // Verificar se a prova existe
    const prova = await Prova.findById(prova_id);
    if (!prova) {
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    // Criar solicitação
    const solicitacao = await SolicitacaoEmprestimo.create({
      coordenador_solicitante_id: me.id,
      equipe_solicitante_id: equipeGincana._id,
      prova_id,
      quantidade_solicitada,
      criterios: criterios || {},
      motivo,
      status: 'PENDENTE_APROVACAO',
    });

    // Notificar administradores
    const admins = await Usuario.find({ tipo: 'ADMIN' }).select('_id');
    const notificacoes = admins.map(admin => ({
      usuario_id: admin._id,
      tipo: 'COMUNICADO',
      titulo: 'Nova Solicitação de Empréstimo',
      mensagem: `${me.nome} solicitou ${quantidade_solicitada} pessoa(s) para a prova "${prova.titulo}".`,
      referencia_id: solicitacao._id,
    }));
    await Notificacao.insertMany(notificacoes);

    const result = await SolicitacaoEmprestimo.findById(solicitacao._id).populate(basePopulate);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ 
      message: 'Erro ao criar solicitação.', 
      error: error.message 
    });
  }
};

// [GET] /api/equipes/solicitacoes-emprestimo
// Listar solicitações (Admin vê todas, Coordenador vê apenas as suas ou aprovadas)
export const listarSolicitacoes = async (req, res) => {
  try {
    const me = req.usuario;
    const { status, prova_id } = req.query;

    const filtro = {};
    if (status) filtro.status = status;
    if (prova_id) filtro.prova_id = prova_id;

    if (me.tipo === 'COORDENADOR') {
      // Coordenador vê:
      // 1. Suas próprias solicitações
      // 2. Solicitações aprovadas de outras equipes (para poder ofertar)
      const minhaEquipe = await EquipeGincana.findOne({ coordenador_usuario_id: me.id });
      if (!minhaEquipe) {
        return res.status(200).json([]);
      }

      filtro.$or = [
        { equipe_solicitante_id: minhaEquipe._id },
        { status: { $in: ['APROVADA', 'EM_ANDAMENTO'] } }
      ];
    }
    // Admin vê tudo (sem filtro adicional)

    const solicitacoes = await SolicitacaoEmprestimo.find(filtro)
      .sort({ criado_em: -1 })
      .populate(basePopulate);

    return res.status(200).json(solicitacoes);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    return res.status(500).json({ 
      message: 'Erro ao listar solicitações.', 
      error: error.message 
    });
  }
};

// [GET] /api/equipes/solicitacoes-emprestimo/:id
// Obter detalhes de uma solicitação
export const obterSolicitacao = async (req, res) => {
  try {
    const { id } = req.params;
    
    const solicitacao = await SolicitacaoEmprestimo.findById(id).populate(basePopulate);
    if (!solicitacao) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    // Buscar ofertas relacionadas
    const ofertas = await OfertaEmprestimo.find({ solicitacao_id: id })
      .populate([
        { path: 'coordenador_ofertante_id', select: 'nome email tipo' },
        {
          path: 'equipe_ofertante_id',
          populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
        },
        { path: 'membros_oferecidos.usuario_id', select: 'nome email turma' },
        { path: 'decidido_por', select: 'nome email tipo' },
      ]);

    return res.status(200).json({
      ...solicitacao.toObject(),
      ofertas,
    });
  } catch (error) {
    console.error('Erro ao obter solicitação:', error);
    return res.status(500).json({ 
      message: 'Erro ao obter solicitação.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/solicitacoes-emprestimo/:id/aprovar
// Admin aprova solicitação
export const aprovarSolicitacao = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa_admin } = req.body;

    const solicitacao = await SolicitacaoEmprestimo.findById(id);
    if (!solicitacao) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (solicitacao.status !== 'PENDENTE_APROVACAO') {
      return res.status(409).json({ 
        message: 'Solicitação não está pendente de aprovação.' 
      });
    }

    solicitacao.status = 'APROVADA';
    solicitacao.aprovado_por = me.id;
    solicitacao.aprovado_em = new Date();
    if (justificativa_admin) {
      solicitacao.justificativa_admin = justificativa_admin;
    }
    await solicitacao.save();

    // Notificar coordenador solicitante
    await Notificacao.create({
      usuario_id: solicitacao.coordenador_solicitante_id,
      tipo: 'COMUNICADO',
      titulo: 'Solicitação de Empréstimo Aprovada',
      mensagem: `Sua solicitação de empréstimo para a prova foi aprovada. Aguarde ofertas de outras equipes.`,
      referencia_id: solicitacao._id,
    });

    // Notificar TODOS os coordenadores (exceto o solicitante) sobre a solicitação aprovada
    const todasEquipes = await EquipeGincana.find({ 
      _id: { $ne: solicitacao.equipe_solicitante_id },
      coordenador_usuario_id: { $exists: true, $ne: null }
    }).select('coordenador_usuario_id');

    const notificacoesCoord = todasEquipes
      .filter(eq => eq.coordenador_usuario_id)
      .map(eq => ({
        usuario_id: eq.coordenador_usuario_id,
        tipo: 'COMUNICADO',
        titulo: 'Nova Solicitação de Empréstimo Disponível',
        mensagem: `Uma equipe precisa de ${solicitacao.quantidade_solicitada} pessoa(s) para uma prova. Você pode ofertar membros da sua equipe.`,
        referencia_id: solicitacao._id,
      }));
    
    if (notificacoesCoord.length > 0) {
      await Notificacao.insertMany(notificacoesCoord);
    }

    const result = await SolicitacaoEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    return res.status(500).json({ 
      message: 'Erro ao aprovar solicitação.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/solicitacoes-emprestimo/:id/rejeitar
// Admin rejeita solicitação
export const rejeitarSolicitacao = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa_admin } = req.body;

    const solicitacao = await SolicitacaoEmprestimo.findById(id);
    if (!solicitacao) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (solicitacao.status !== 'PENDENTE_APROVACAO') {
      return res.status(409).json({ 
        message: 'Solicitação não está pendente de aprovação.' 
      });
    }

    solicitacao.status = 'REJEITADA';
    solicitacao.aprovado_por = me.id;
    solicitacao.aprovado_em = new Date();
    if (justificativa_admin) {
      solicitacao.justificativa_admin = justificativa_admin;
    }
    await solicitacao.save();

    // Notificar coordenador solicitante
    await Notificacao.create({
      usuario_id: solicitacao.coordenador_solicitante_id,
      tipo: 'COMUNICADO',
      titulo: 'Solicitação de Empréstimo Rejeitada',
      mensagem: `Sua solicitação de empréstimo foi rejeitada. ${justificativa_admin || ''}`,
      referencia_id: solicitacao._id,
    });

    const result = await SolicitacaoEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    return res.status(500).json({ 
      message: 'Erro ao rejeitar solicitação.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/solicitacoes-emprestimo/:id/cancelar
// Coordenador solicitante cancela sua solicitação
export const cancelarSolicitacao = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { motivo_cancelamento } = req.body;

    const solicitacao = await SolicitacaoEmprestimo.findById(id);
    if (!solicitacao) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    // Verificar se é o coordenador solicitante
    if (String(solicitacao.coordenador_solicitante_id) !== String(me.id)) {
      return res.status(403).json({ 
        message: 'Apenas o coordenador solicitante pode cancelar.' 
      });
    }

    if (solicitacao.status === 'CONCLUIDA' || solicitacao.status === 'CANCELADA') {
      return res.status(409).json({ 
        message: 'Solicitação já foi finalizada ou cancelada.' 
      });
    }

    solicitacao.status = 'CANCELADA';
    solicitacao.cancelado_por = me.id;
    solicitacao.cancelado_em = new Date();
    if (motivo_cancelamento) {
      solicitacao.motivo_cancelamento = motivo_cancelamento;
    }
    await solicitacao.save();

    // Cancelar todas as ofertas pendentes
    await OfertaEmprestimo.updateMany(
      { solicitacao_id: id, status: 'PENDENTE' },
      { status: 'CANCELADA' }
    );

    const result = await SolicitacaoEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao cancelar solicitação:', error);
    return res.status(500).json({ 
      message: 'Erro ao cancelar solicitação.', 
      error: error.message 
    });
  }
};


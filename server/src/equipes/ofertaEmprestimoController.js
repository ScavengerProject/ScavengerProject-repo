// src/equipes/ofertaEmprestimoController.js
import OfertaEmprestimo from '../models/OfertaEmprestimo.js';
import SolicitacaoEmprestimo from '../models/SolicitacaoEmprestimo.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembro from '../models/EquipeMembros.js';
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';

const basePopulate = [
  { path: 'coordenador_ofertante_id', select: 'nome email tipo' },
  {
    path: 'equipe_ofertante_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  { path: 'membros_oferecidos.usuario_id', select: 'nome email turma' },
  { path: 'decidido_por', select: 'nome email tipo' },
  {
    path: 'solicitacao_id',
    populate: [
      { path: 'coordenador_solicitante_id', select: 'nome email' },
      { 
        path: 'equipe_solicitante_id',
        populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' }
      },
      { path: 'prova_id', select: 'titulo' }
    ]
  }
];

// [POST] /api/equipes/ofertas-emprestimo
// Coordenador oferece membros para uma solicitação
export const criarOferta = async (req, res) => {
  try {
    const me = req.usuario;
    const { solicitacao_id, membros_oferecidos_ids, mensagem } = req.body;

    if (!solicitacao_id || !membros_oferecidos_ids || membros_oferecidos_ids.length === 0) {
      return res.status(400).json({ 
        message: 'solicitacao_id e membros_oferecidos_ids são obrigatórios.' 
      });
    }

    // Verificar se usuário é coordenador
    if (me.tipo !== 'COORDENADOR') {
      return res.status(403).json({ message: 'Apenas coordenadores podem criar ofertas.' });
    }

    // Buscar a equipe que o coordenador gerencia
    const minhaEquipe = await EquipeGincana.findOne({ coordenador_usuario_id: me.id });
    if (!minhaEquipe) {
      return res.status(404).json({ message: 'Você não é coordenador de nenhuma equipe.' });
    }

    // Verificar se a solicitação existe e está aprovada
    const solicitacao = await SolicitacaoEmprestimo.findById(solicitacao_id);
    if (!solicitacao) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (!['APROVADA', 'EM_ANDAMENTO'].includes(solicitacao.status)) {
      return res.status(409).json({ 
        message: 'Solicitação não está disponível para ofertas.' 
      });
    }

    // Não pode ofertar para sua própria solicitação
    if (String(solicitacao.equipe_solicitante_id) === String(minhaEquipe._id)) {
      return res.status(409).json({ 
        message: 'Você não pode ofertar membros para sua própria solicitação.' 
      });
    }

    // Verificar se os membros pertencem à equipe do coordenador
    // Usar minhaEquipe.equipe_id (ID da Equipe) e não minhaEquipe._id (ID do EquipeGincana)
    const membros = await EquipeMembro.find({
      equipe_id: minhaEquipe.equipe_id,
      usuario_id: { $in: membros_oferecidos_ids }
    });

    if (membros.length !== membros_oferecidos_ids.length) {
      return res.status(422).json({ 
        message: 'Alguns membros não pertencem à sua equipe.' 
      });
    }

    // Verificar se já existe uma oferta pendente desta equipe para esta solicitação
    const ofertaExistente = await OfertaEmprestimo.findOne({
      solicitacao_id,
      equipe_ofertante_id: minhaEquipe._id,
      status: 'PENDENTE'
    });

    if (ofertaExistente) {
      return res.status(409).json({ 
        message: 'Você já possui uma oferta pendente para esta solicitação.' 
      });
    }

    // Criar oferta
    const oferta = await OfertaEmprestimo.create({
      solicitacao_id,
      coordenador_ofertante_id: me.id,
      equipe_ofertante_id: minhaEquipe._id,
      membros_oferecidos: membros_oferecidos_ids.map(id => ({ usuario_id: id })),
      mensagem: mensagem || null,
      status: 'PENDENTE',
    });

    // Atualizar status da solicitação para EM_ANDAMENTO
    if (solicitacao.status === 'APROVADA') {
      solicitacao.status = 'EM_ANDAMENTO';
      await solicitacao.save();
    }

    // Notificar coordenador solicitante
    await Notificacao.create({
      usuario_id: solicitacao.coordenador_solicitante_id,
      tipo: 'COMUNICADO',
      titulo: 'Nova Oferta de Empréstimo',
      mensagem: `Uma equipe ofereceu ${membros_oferecidos_ids.length} pessoa(s) para sua solicitação.`,
      referencia_id: oferta._id,
    });

    const result = await OfertaEmprestimo.findById(oferta._id).populate(basePopulate);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar oferta:', error);
    return res.status(500).json({ 
      message: 'Erro ao criar oferta.', 
      error: error.message 
    });
  }
};

// [GET] /api/equipes/ofertas-emprestimo
// Listar ofertas
export const listarOfertas = async (req, res) => {
  try {
    const me = req.usuario;
    const { solicitacao_id, status } = req.query;

    const filtro = {};
    if (solicitacao_id) filtro.solicitacao_id = solicitacao_id;
    if (status) filtro.status = status;

    if (me.tipo === 'COORDENADOR') {
      // Coordenador vê:
      // 1. Ofertas que ele fez
      // 2. Ofertas para suas solicitações
      const minhaEquipe = await EquipeGincana.findOne({ coordenador_usuario_id: me.id });
      if (!minhaEquipe) {
        return res.status(200).json([]);
      }

      const minhasSolicitacoes = await SolicitacaoEmprestimo.find({ 
        equipe_solicitante_id: minhaEquipe._id 
      }).select('_id');
      
      const solicitacaoIds = minhasSolicitacoes.map(s => s._id);

      filtro.$or = [
        { equipe_ofertante_id: minhaEquipe._id },
        { solicitacao_id: { $in: solicitacaoIds } }
      ];
    }
    // Admin vê tudo

    const ofertas = await OfertaEmprestimo.find(filtro)
      .sort({ criado_em: -1 })
      .populate(basePopulate);

    return res.status(200).json(ofertas);
  } catch (error) {
    console.error('Erro ao listar ofertas:', error);
    return res.status(500).json({ 
      message: 'Erro ao listar ofertas.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/ofertas-emprestimo/:id/aceitar
// Coordenador solicitante aceita oferta e cria empréstimos
export const aceitarOferta = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa_decisao } = req.body;

    const oferta = await OfertaEmprestimo.findById(id).populate('solicitacao_id');
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta não encontrada.' });
    }

    if (oferta.status !== 'PENDENTE') {
      return res.status(409).json({ message: 'Oferta não está pendente.' });
    }

    const solicitacao = oferta.solicitacao_id;
    
    // Verificar se é o coordenador solicitante
    if (String(solicitacao.coordenador_solicitante_id) !== String(me.id) && me.tipo !== 'ADMIN') {
      return res.status(403).json({ 
        message: 'Apenas o coordenador solicitante ou admin pode aceitar ofertas.' 
      });
    }

    // Criar empréstimos para cada membro oferecido
    const emprestimos = [];
    console.log('🔄 Iniciando criação de empréstimos...');
    console.log('Membros oferecidos:', oferta.membros_oferecidos);
    console.log('Equipe origem (ofertante):', oferta.equipe_ofertante_id);
    console.log('Equipe destino (solicitante):', solicitacao.equipe_solicitante_id);
    console.log('Prova ID:', solicitacao.prova_id);
    
    for (const membro of oferta.membros_oferecidos) {
      try {
        console.log(`Criando empréstimo para usuário ${membro.usuario_id}...`);
        const emprestimo = await EmprestimoEquipe.create({
          usuario_id: membro.usuario_id,
          equipe_origem_id: oferta.equipe_ofertante_id,
          equipe_destino_id: solicitacao.equipe_solicitante_id,
          prova_id: solicitacao.prova_id,
          inicio: new Date(),
          fim: null,
          status: 'ATIVO',
          criado_por: me.id,
        });
        console.log(`✅ Empréstimo criado com sucesso:`, emprestimo._id);
        emprestimos.push(emprestimo._id);
      } catch (err) {
        console.error(`❌ Erro ao criar empréstimo para ${membro.usuario_id}:`, err);
        console.error('Detalhes do erro:', err.message);
      }
    }
    
    console.log(`✅ Total de empréstimos criados: ${emprestimos.length}`);

    // Atualizar oferta
    oferta.status = 'ACEITA';
    oferta.decidido_por = me.id;
    oferta.decidido_em = new Date();
    if (justificativa_decisao) {
      oferta.justificativa_decisao = justificativa_decisao;
    }
    oferta.emprestimos_criados = emprestimos;
    await oferta.save();

    // Notificar coordenador ofertante
    await Notificacao.create({
      usuario_id: oferta.coordenador_ofertante_id,
      tipo: 'COMUNICADO',
      titulo: 'Oferta de Empréstimo Aceita',
      mensagem: `Sua oferta de ${oferta.membros_oferecidos.length} pessoa(s) foi aceita.`,
      referencia_id: oferta._id,
    });

    // Notificar cada membro emprestado
    for (const membro of oferta.membros_oferecidos) {
      await Notificacao.create({
        usuario_id: membro.usuario_id,
        tipo: 'COMUNICADO',
        titulo: 'Você foi Emprestado para Outra Equipe',
        mensagem: `Você foi temporariamente emprestado para ajudar outra equipe em uma prova.`,
        referencia_id: oferta._id,
      });
    }

    const result = await OfertaEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao aceitar oferta:', error);
    return res.status(500).json({ 
      message: 'Erro ao aceitar oferta.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/ofertas-emprestimo/:id/recusar
// Coordenador solicitante recusa oferta
export const recusarOferta = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa_decisao } = req.body;

    const oferta = await OfertaEmprestimo.findById(id).populate('solicitacao_id');
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta não encontrada.' });
    }

    if (oferta.status !== 'PENDENTE') {
      return res.status(409).json({ message: 'Oferta não está pendente.' });
    }

    const solicitacao = oferta.solicitacao_id;
    
    // Verificar se é o coordenador solicitante
    if (String(solicitacao.coordenador_solicitante_id) !== String(me.id) && me.tipo !== 'ADMIN') {
      return res.status(403).json({ 
        message: 'Apenas o coordenador solicitante ou admin pode recusar ofertas.' 
      });
    }

    // Atualizar oferta
    oferta.status = 'RECUSADA';
    oferta.decidido_por = me.id;
    oferta.decidido_em = new Date();
    if (justificativa_decisao) {
      oferta.justificativa_decisao = justificativa_decisao;
    }
    await oferta.save();

    // Notificar coordenador ofertante
    await Notificacao.create({
      usuario_id: oferta.coordenador_ofertante_id,
      tipo: 'COMUNICADO',
      titulo: 'Oferta de Empréstimo Recusada',
      mensagem: `Sua oferta de empréstimo foi recusada. ${justificativa_decisao || ''}`,
      referencia_id: oferta._id,
    });

    const result = await OfertaEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao recusar oferta:', error);
    return res.status(500).json({ 
      message: 'Erro ao recusar oferta.', 
      error: error.message 
    });
  }
};

// [PATCH] /api/equipes/ofertas-emprestimo/:id/cancelar
// Coordenador ofertante cancela sua oferta
export const cancelarOferta = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;

    const oferta = await OfertaEmprestimo.findById(id).populate('solicitacao_id');
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta não encontrada.' });
    }

    // Verificar se é o coordenador ofertante
    if (String(oferta.coordenador_ofertante_id) !== String(me.id)) {
      return res.status(403).json({ 
        message: 'Apenas o coordenador ofertante pode cancelar sua oferta.' 
      });
    }

    if (oferta.status !== 'PENDENTE') {
      return res.status(409).json({ 
        message: 'Apenas ofertas pendentes podem ser canceladas.' 
      });
    }

    oferta.status = 'CANCELADA';
    await oferta.save();

    const result = await OfertaEmprestimo.findById(id).populate(basePopulate);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao cancelar oferta:', error);
    return res.status(500).json({ 
      message: 'Erro ao cancelar oferta.', 
      error: error.message 
    });
  }
};



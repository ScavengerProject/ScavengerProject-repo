import Prova from '../models/Prova.js';

/**
 * Controller para criar uma nova prova.
 * Acessível apenas por administradores.
 */
export const criarProva = async (req, res) => {
  try {
    const { titulo, descricao, formato, data_inicio, data_fim, status, quesitos_de_avaliacao, requisito_usuario, pontuacao } = req.body;

    if (!titulo || !descricao || !formato) {
      return res.status(400).json({ message: 'Campos título, descrição e formato são obrigatórios.' });
    }

    const novaProva = new Prova({
      titulo,
      descricao,
      formato,
      data_inicio: data_inicio || new Date(),
      data_fim: data_fim || null,
      status: status || 'NAO_INICIADA',
      quesitos_de_avaliacao: quesitos_de_avaliacao || [],
      requisito_usuario: requisito_usuario || null,
      pontuacao: pontuacao || {},
      criado_por_usuario_id: req.usuario.id,
    });

    const provaSalva = await novaProva.save();

    res.status(201).json({
      message: 'Prova criada com sucesso.',
      prova: provaSalva,
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar a prova.', error: error.message });
  }
};

/**
 * Controller para listar todas as provas.
 */
export const listarProvas = async (req, res) => {
  try {
    const provas = await Prova.find().populate('criado_por_usuario_id', 'nome email');
    
    res.status(200).json({
      message: 'Provas listadas com sucesso.',
      total: provas.length,
      provas: provas,
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar as provas.', error: error.message });
  }
};

/**
 * Controller para obter uma prova específica.
 */
export const obterProva = async (req, res) => {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id).populate('criado_por_usuario_id', 'nome email');

    if (!prova) {
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    res.status(200).json({
      message: 'Prova obtida com sucesso.',
      prova: prova,
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter a prova.', error: error.message });
  }
};

/**
 * Controller para atualizar uma prova.
 * Acessível apenas por administradores.
 */
export const atualizarProva = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, formato, data_inicio, data_fim, status, quesitos_de_avaliacao, requisito_usuario, pontuacao } = req.body;

    // Verificar se a prova existe
    const provaExistente = await Prova.findById(id);

    if (!provaExistente) {
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    // Verificar se o usuário que está tentando atualizar é o criador ou um admin
    if (provaExistente.criado_por_usuario_id.toString() !== req.usuario.id && req.usuario.tipo !== 'ADMIN') {
      return res.status(403).json({ message: 'Você não tem permissão para atualizar esta prova.' });
    }

    // Atualizar os campos
    if (titulo) provaExistente.titulo = titulo;
    if (descricao) provaExistente.descricao = descricao;
    if (formato) provaExistente.formato = formato;
    if (data_inicio) provaExistente.data_inicio = data_inicio;
    if (data_fim) provaExistente.data_fim = data_fim;
    if (status) provaExistente.status = status;
    if (quesitos_de_avaliacao) provaExistente.quesitos_de_avaliacao = quesitos_de_avaliacao;
    if (requisito_usuario) provaExistente.requisito_usuario = requisito_usuario;
    if (pontuacao) provaExistente.pontuacao = pontuacao;

    const provaAtualizada = await provaExistente.save();

    res.status(200).json({
      message: 'Prova atualizada com sucesso.',
      prova: provaAtualizada,
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar a prova.', error: error.message });
  }
};

/**
 * Controller para deletar uma prova.
 * Acessível apenas por administradores.
 */
export const deletarProva = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a prova existe
    const provaExistente = await Prova.findById(id);

    if (!provaExistente) {
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    // Verificar se o usuário que está tentando deletar é o criador ou um admin
    if (provaExistente.criado_por_usuario_id.toString() !== req.usuario.id && req.usuario.tipo !== 'ADMIN') {
      return res.status(403).json({ message: 'Você não tem permissão para deletar esta prova.' });
    }

    await Prova.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Prova deletada com sucesso.',
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar a prova.', error: error.message });
  }
};
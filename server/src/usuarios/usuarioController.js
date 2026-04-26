import Usuario from '../models/Usuario.js';
import bcrypt from 'bcryptjs';

/**
 * Listar todos os usuários (com filtros opcionais)
 */
export const listarUsuarios = async (req, res) => {
  try {
    const { tipo, status, turma, search } = req.query;
    
    const filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (status) filtro.status = status;
    if (turma) filtro.turma = turma;
    
    // Busca por nome, email ou matrícula
    if (search) {
      filtro.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { matricula: { $regex: search, $options: 'i' } }
      ];
    }
    
    const usuarios = await Usuario.find(filtro)
      .select('-senha') // Não retorna a senha
      .sort({ criado_em: -1 });
    
    res.status(200).json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários.', error: error.message });
  }
};

/**
 * Obter um usuário específico por ID
 */
export const obterUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findById(id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    res.status(200).json(usuario);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro ao obter usuário.', error: error.message });
  }
};

/**
 * Criar novo usuário (apenas ADMIN)
 */
export const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, telefone, tipo, turma, matricula, status } = req.body;
    
    // Validações básicas
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ 
        message: 'Campos nome, email, senha e tipo são obrigatórios.' 
      });
    }
    
    // Verifica se o email já existe
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }
    
    // Verifica se a matrícula já existe (se fornecida)
    if (matricula) {
      const matriculaExistente = await Usuario.findOne({ matricula });
      if (matriculaExistente) {
        return res.status(409).json({ message: 'Esta matrícula já está cadastrada.' });
      }
    }
    
    // Valida turma para alunos e coordenadores
    if ((tipo === 'ALUNO' || tipo === 'COORDENADOR') && !turma) {
      return res.status(400).json({ message: 'Turma é obrigatória para alunos e coordenadores.' });
    }
    
    const novoUsuario = new Usuario({
      nome,
      email: email.toLowerCase(),
      senha,
      telefone: telefone || null,
      tipo,
      turma: turma || null,
      matricula: matricula || null,
      status: status || 'ATIVO'
    });
    
    await novoUsuario.save();
    
    // Retorna o usuário sem a senha
    const usuarioResposta = novoUsuario.toObject();
    delete usuarioResposta.senha;
    
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      usuario: usuarioResposta
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
  }
};

/**
 * Auto-cadastro público (sem autenticação)
 */
export const registrarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, telefone, matricula } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        message: 'Campos nome, email e senha são obrigatórios.'
      });
    }

    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }

    if (matricula) {
      const matriculaExistente = await Usuario.findOne({ matricula });
      if (matriculaExistente) {
        return res.status(409).json({ message: 'Esta matrícula já está cadastrada.' });
      }
    }

    const novoUsuario = new Usuario({
      nome,
      email: email.toLowerCase(),
      senha,
      telefone: telefone || null,
      tipo: 'ALUNO',       
      turma: null,
      matricula: matricula || null,
      status: 'ATIVO'   
    });

    await novoUsuario.save();

    const usuarioResposta = novoUsuario.toObject();
    delete usuarioResposta.senha;

    res.status(201).json({
      message: 'Cadastro enviado para aprovação!',
      usuario: usuarioResposta
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário.', error: error.message });
  }
};

/**
 * Atualizar usuário existente
 */
export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, tipo, turma, matricula, status, senha } = req.body;
    
    const usuario = await Usuario.findById(id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    // Verifica se o email já está em uso por outro usuário
    if (email && email.toLowerCase() !== usuario.email) {
      const emailExistente = await Usuario.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: id }
      });
      if (emailExistente) {
        return res.status(409).json({ message: 'Este email já está em uso por outro usuário.' });
      }
    }
    
    // Verifica se a matrícula já está em uso por outro usuário
    if (matricula && matricula !== usuario.matricula) {
      const matriculaExistente = await Usuario.findOne({ 
        matricula,
        _id: { $ne: id }
      });
      if (matriculaExistente) {
        return res.status(409).json({ message: 'Esta matrícula já está em uso por outro usuário.' });
      }
    }
    
    // Atualiza os campos
    if (nome) usuario.nome = nome;
    if (email) usuario.email = email.toLowerCase();
    if (telefone !== undefined) usuario.telefone = telefone;
    if (tipo) usuario.tipo = tipo;
    if (turma !== undefined) usuario.turma = turma;
    if (matricula !== undefined) usuario.matricula = matricula;
    if (status) usuario.status = status;
    
    // Atualiza a senha apenas se fornecida
    if (senha && senha.trim() !== '') {
      usuario.senha = senha;
    }
    
    await usuario.save();
    
    // Retorna o usuário sem a senha
    const usuarioResposta = usuario.toObject();
    delete usuarioResposta.senha;
    
    res.status(200).json({
      message: 'Usuário atualizado com sucesso!',
      usuario: usuarioResposta
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário.', error: error.message });
  }
};

/**
 * Deletar usuário
 */
export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Impede que o admin delete a si mesmo
    if (id === req.usuario.id) {
      return res.status(403).json({ message: 'Você não pode deletar sua própria conta.' });
    }
    
    const usuario = await Usuario.findById(id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    await Usuario.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro ao deletar usuário.', error: error.message });
  }
};

/**
 * Alternar status do usuário (ATIVO/INATIVO)
 */
export const alternarStatusUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Impede que o admin desative a si mesmo
    if (id === req.usuario.id) {
      return res.status(403).json({ message: 'Você não pode alterar o status da sua própria conta.' });
    }
    
    const usuario = await Usuario.findById(id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    usuario.status = usuario.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    await usuario.save();
    
    const usuarioResposta = usuario.toObject();
    delete usuarioResposta.senha;
    
    res.status(200).json({
      message: `Usuário ${usuario.status === 'ATIVO' ? 'ativado' : 'desativado'} com sucesso!`,
      usuario: usuarioResposta
    });
  } catch (error) {
    console.error('Erro ao alternar status:', error);
    res.status(500).json({ message: 'Erro ao alternar status do usuário.', error: error.message });
  }
};

/**
 * Obter estatísticas de usuários
 */
export const obterEstatisticas = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const totalAtivos = await Usuario.countDocuments({ status: 'ATIVO' });
    const totalInativos = await Usuario.countDocuments({ status: 'INATIVO' });
    
    const porTipo = await Usuario.aggregate([
      { $group: { _id: '$tipo', total: { $sum: 1 } } }
    ]);
    
    const porTurma = await Usuario.aggregate([
      { $match: { tipo: 'ALUNO' } },
      { $group: { _id: '$turma', total: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      total: totalUsuarios,
      ativos: totalAtivos,
      inativos: totalInativos,
      porTipo: porTipo.reduce((acc, item) => {
        acc[item._id] = item.total;
        return acc;
      }, {}),
      porTurma: porTurma.reduce((acc, item) => {
        acc[item._id] = item.total;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas.', error: error.message });
  }
};


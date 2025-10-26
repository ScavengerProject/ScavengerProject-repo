import Prova from '../models/Prova.js';
import Usuario from '../models/Usuario.js';
import ProvaUsuario from '../models/ProvaUsuario.js';

/**
 * Controller para criar uma nova prova.
 * Acessível apenas por administradores.
 */
export const criarProva = async (req, res) => {
  try {
    const { titulo, descricao, formato } = req.body;

    const novaProva = new Prova({
      ...req.body,
      criado_por_usuario_id: req.usuario.id,
    });

    const provaSalva = await novaProva.save();

    res.status(201).json(provaSalva);

  } catch (error) {
    if (error.name === 'ValidationError') {
      // Se for um erro de validação do Mongoose, retorna status 400 (Bad Request).
      return res.status(400).json({ message: 'Dados inválidos.', errors: error.errors });
    }
    res.status(500).json({ message: 'Erro ao criar a prova.', error: error.message });
  }
};

/**
 * NOVO: atualizar regra de elegibilidade (requisito_usuario) de uma prova
 * PATCH /api/provas/:id/requisito-usuario
 * body: { requisito_usuario: 'ALUNOS_MEDIO' | 'ALUNOS_FUNDAMENTAL' | 'PROFESSORES' | 'PAI/MÃE' }
 */
export const atualizarRequisitoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { requisito_usuario } = req.body;

    if (!requisito_usuario) {
      return res.status(400).json({ message: 'requisito_usuario é obrigatório.' });
    }

    const prova = await Prova.findById(id);
    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });

    prova.requisito_usuario = requisito_usuario;
    await prova.validate();
    await prova.save();

    res.status(200).json({ message: 'Requisito de usuário atualizado.', requisito_usuario: prova.requisito_usuario });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Valor inválido para requisito_usuario.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar requisito de usuário.', error: error.message });
  }
};

export const inscreverUsuarioNaProva = async (req, res) => {
  try {
    const { id } = req.params; // provaId
    const { usuario_id } = req.body;

    if (!usuario_id) return res.status(400).json({ message: 'usuario_id é obrigatório.' });

    const [prova, usuario] = await Promise.all([
      Prova.findById(id),
      Usuario.findById(usuario_id)
    ]);

    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const reqProva = prova.requisito_usuario; // 'ALUNOS_FUNDAMENTAL' | 'ALUNOS_MEDIO' | 'PROFESSORES' | 'PAI/MÃE'
    let elegivel = false;
    let motivo = '';

    switch (reqProva) {
      case 'ALUNOS_FUNDAMENTAL':
        elegivel = (usuario.tipo === 'ALUNO' && usuario.turma?.startsWith('EF'));
        if (!elegivel) motivo = 'Somente alunos do Ensino Fundamental (turmas EF-*) podem participar desta prova.';
        break;

      case 'ALUNOS_MEDIO':
        elegivel = (usuario.tipo === 'ALUNO' && usuario.turma?.startsWith('EM'));
        if (!elegivel) motivo = 'Somente alunos do Ensino Médio (turmas EM-*) podem participar desta prova.';
        break;

      case 'PROFESSORES':
        elegivel = (usuario.tipo === 'PROFESSOR');
        if (!elegivel) motivo = 'Somente usuários do tipo PROFESSOR podem participar desta prova.';
        break;

      case 'PAI/MÃE':
        elegivel = (usuario.tipo === 'PAI/MÃE');
        if (!elegivel) motivo = 'Somente usuários do tipo PAI/MÃE podem participar desta prova.';
        break;

      default:
        elegivel = true;
        break;
    }

    if (!elegivel) {
      return res.status(422).json({ ok: false, motivo: 'NAO_ELEGIVEL', detalhe: motivo });
    }

    // cria vínculo Prova-Usuario (sem duplicidade)
    const vinculo = await ProvaUsuario.create({ prova_id: prova._id, usuario_id: usuario._id });

    res.status(201).json({ ok: true, message: 'Inscrição realizada com sucesso.', inscricao: vinculo });
  } catch (error) {
    // trata duplicata de índice único
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Usuário já inscrito nesta prova.' });
    }
    res.status(500).json({ message: 'Erro ao inscrever usuário na prova.', error: error.message });
  }
};

/**
 * (Opcional) Listar participantes de uma prova
 * GET /api/provas/:id/participantes
 */
export const listarParticipantes = async (req, res) => {
  try {
    const { id } = req.params;
    const prova = await Prova.findById(id);
    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });

    const itens = await ProvaUsuario.find({ prova_id: id })
      .populate('usuario_id', 'nome email tipo turma status');

    res.status(200).json({
      total: itens.length,
      participantes: itens.map(i => ({
        id: i.usuario_id._id,
        nome: i.usuario_id.nome,
        email: i.usuario_id.email,
        tipo: i.usuario_id.tipo,
        turma: i.usuario_id.turma,
        status: i.usuario_id.status
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar participantes.', error: error.message });
  }
};
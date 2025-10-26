import Prova from '../models/Prova.js';
import Usuario from '../models/Usuario.js';
import ProvaUsuario from '../models/ProvaUsuario.js';

const GRUPO_LABEL = {
  ALUNOS_FUNDAMENTAL: 'alunos do ensino fundamental',
  ALUNOS_MEDIO: 'alunos do ensino médio',
  PROFESSORES: 'professores',
  'PAI/MÃE': 'pais/mães'
};

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
    if (!requisito_usuario || typeof requisito_usuario !== 'object') {
      return res.status(400).json({ message: 'requisito_usuario (JSON) é obrigatório.' });
    }

    const prova = await Prova.findById(id);
    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });

    prova.requisito_usuario = requisito_usuario;
    await prova.save();

    res.status(200).json({ message: 'Requisito de usuário atualizado.', requisito_usuario: prova.requisito_usuario });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar requisito de usuário.', error: error.message });
  }
};

export const inscreverUsuarioNaProva = async (req, res) => {
  try {
    const { id } = req.params;
    let { usuario_id } = req.body;

    const solicitanteId = req.usuario.id;
    const solicitanteTipo = req.usuario.tipo;

    if (['ALUNO','PROFESSOR','PAI/MÃE'].includes(solicitanteTipo)) {
      if (usuario_id && usuario_id !== solicitanteId) {
        return res.status(403).json({
          ok: false,
          code: 'NAO_AUTORIZADO',
          message: 'Você só pode inscrever a si mesmo.'
        });
      }
      usuario_id = solicitanteId;
    }else {
      // ADMIN/COORDENADOR precisam informar "usuario_id"
      if (!usuario_id) return res.status(400).json({ message: 'usuario_id é obrigatório.' });
    }

    const [prova, usuario] = await Promise.all([
      Prova.findById(id),
      Usuario.findById(usuario_id)
    ]);

    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Determina o macro-tipo do usuário (grupo)
    let grupo = null;
    if (usuario.tipo === 'ALUNO') {
      if (usuario.turma?.startsWith('EF')) grupo = 'ALUNOS_FUNDAMENTAL';
      else if (usuario.turma?.startsWith('EM')) grupo = 'ALUNOS_MEDIO';
    } else if (usuario.tipo === 'PROFESSOR') {
      grupo = 'PROFESSORES';
    } else if (usuario.tipo === 'PAI/MÃE') {
      grupo = 'PAI/MÃE';
    }

    if (!grupo) {
      return res.status(422).json({ ok: false, motivo: 'GRUPO_INDETERMINADO', detalhe: 'Tipo/turma do usuário não permite determinar grupo.' });
    }

  const cotas = (prova.requisito_usuario && typeof prova.requisito_usuario === 'object')
    ? prova.requisito_usuario
    : {};
  const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const limite = toNum(cotas[grupo]);

  // 0 ou ausente => não permitido
  if (limite <= 0) {
    return res.status(422).json({
      ok: false,
      code: 'GRUPO_NAO_PERMITIDO',
      message: `Participação não permitida para ${GRUPO_LABEL[grupo]} nesta prova.`,
    });
  }

    // Conta já inscritos desse grupo
    const atuais = await ProvaUsuario.find({ prova_id: prova._id })
      .populate('usuario_id', 'tipo turma');
    const countGrupo = atuais.reduce((acc, item) => {
      const u = item.usuario_id;
      if (!u) return acc;
      if (u.tipo === 'ALUNO' && u.turma?.startsWith('EF')) return acc + (grupo === 'ALUNOS_FUNDAMENTAL' ? 1 : 0);
      if (u.tipo === 'ALUNO' && u.turma?.startsWith('EM')) return acc + (grupo === 'ALUNOS_MEDIO' ? 1 : 0);
      if (u.tipo === 'PROFESSOR') return acc + (grupo === 'PROFESSORES' ? 1 : 0);
      if (u.tipo === 'PAI/MÃE') return acc + (grupo === 'PAI/MÃE' ? 1 : 0);
      return acc;
    }, 0);

    if (countGrupo >= limite) {
      return res.status(422).json({
        ok: false,
        code: 'VAGAS_ESGOTADAS',
        message: `Quantidade máxima para ${GRUPO_LABEL[grupo]} preenchida.`,
        detalhe: `Limite: ${limite} | Inscritos: ${countGrupo}`
      });
    }

    const vinculo = await ProvaUsuario.create({ prova_id: prova._id, usuario_id: usuario._id });
    return res.status(201).json({ ok: true, message: 'Inscrição realizada com sucesso.', inscricao: vinculo });

  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Usuário já inscrito nesta prova.' });
    }
    return res.status(500).json({ message: 'Erro ao inscrever usuário na prova.', error: error.message });
  }
};

export const listarParticipantes = async (req, res) => {
  try {
    const { id } = req.params;
    const prova = await Prova.findById(id);
    if (!prova) return res.status(404).json({ message: 'Prova não encontrada.' });

    const itens = await ProvaUsuario.find({ prova_id: id })
      .populate('usuario_id', 'nome email tipo turma status');

    const contagem = { ALUNOS_FUNDAMENTAL: 0, ALUNOS_MEDIO: 0, PROFESSORES: 0, 'PAI/MÃE': 0 };
    for (const i of itens) {
      const u = i.usuario_id;
      if (u?.tipo === 'ALUNO' && u.turma?.startsWith('EF')) contagem.ALUNOS_FUNDAMENTAL++;
      else if (u?.tipo === 'ALUNO' && u.turma?.startsWith('EM')) contagem.ALUNOS_MEDIO++;
      else if (u?.tipo === 'PROFESSOR') contagem.PROFESSORES++;
      else if (u?.tipo === 'PAI/MÃE') contagem['PAI/MÃE']++;
    }

    res.status(200).json({
      cotas: prova.requisito_usuario || {},
      contagem,
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
import Usuario from '../models/Usuario.js';
import EquipeMembros from '../models/EquipeMembros.js';
import EquipeGincana from '../models/EquipeGincana.js';
import Escola from '../models/Escola.js';
import CodigoConvite from '../models/CodigoConvite.js';
import { PERFIS_ESCOLA, podeMultiEscola } from '../models/Usuario.js';
import {
  filtroEscola,
  getVinculo,
  comVinculoDaEscola,
  aplicarVinculo,
  conflitoMultiEscola,
} from '../escolas/escolaHelpers.js';
import { normalizarCodigo } from '../convites/codigoConviteHelpers.js';
import bcrypt from 'bcryptjs';

// Mensagem única para QUALQUER motivo de código inválido (inexistente,
// revogado, expirado, limite de usos estourado) — distinguir o motivo aqui
// seria um oráculo de força bruta para adivinhar códigos (ver plano, D7).
const MSG_CODIGO_INVALIDO = 'Código de convite inválido ou expirado.';

/**
 * Listar os usuários da escola ativa (com filtros opcionais).
 *
 * Todas as leituras/escritas deste controller são escopadas por `req.escolaId`
 * (injetado pelo middleware resolverEscola): um ADMIN da escola A não enxerga
 * nem altera usuários da escola B.
 */
export const listarUsuarios = async (req, res) => {
  try {
    const { tipo, status, turma, search } = req.query;

    // Escopo de tenant: só usuários vinculados à escola ativa. Os filtros de
    // perfil/turma/status batem no VÍNCULO desta escola (não no papel base),
    // senão um COORDENADOR da escola A apareceria como coordenador da escola B.
    const filtro = { ...filtroEscola(req.escolaId) };

    const vinculoMatch = { escola_id: String(req.escolaId) };
    if (tipo) vinculoMatch.tipo = tipo;
    if (status) vinculoMatch.status = status;
    if (turma) vinculoMatch.turma = turma;
    if (tipo || status || turma) {
      delete filtro['vinculos.escola_id'];
      filtro.vinculos = { $elemMatch: vinculoMatch };
    }

    // Busca por nome ou email
    if (search) {
      filtro.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const usuarios = await Usuario.find(filtro)
      .select('-senha') // Não retorna a senha
      .sort({ criado_em: -1 });

    // As telas leem `usuario.tipo`/`turma`: entrega já o papel DESTA escola.
    res.status(200).json(usuarios.map((u) => comVinculoDaEscola(u, req.escolaId)));
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

    const usuario = await Usuario.findOne({ _id: id, ...filtroEscola(req.escolaId) }).select('-senha');

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.status(200).json(comVinculoDaEscola(usuario, req.escolaId));
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
    const { nome, email, senha, telefone, tipo, turma, status } = req.body;

    // Validações básicas
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({
        message: 'Campos nome, email, senha e tipo são obrigatórios.'
      });
    }

    // O email é único globalmente (uma pessoa = um login). Se a pessoa já existe
    // em OUTRA escola, o correto é vinculá-la a esta — não criar um segundo
    // cadastro. É assim que um professor passa a atuar em mais de uma escola.
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      const jaNestaEscola = Boolean(getVinculo(usuarioExistente, req.escolaId));
      if (jaNestaEscola) {
        return res.status(409).json({ message: 'Este email já está cadastrado nesta escola.' });
      }
      // Só faz sentido oferecer o vínculo quando o perfil pode acumular escolas.
      // Um ALUNO já cadastrado em outra escola não pode ser vinculado aqui: ele
      // precisa ser transferido (remover o vínculo antigo) pelo SUPER_ADMIN.
      const podeVincular = podeMultiEscola(tipo)
        && !conflitoMultiEscola(usuarioExistente, req.escolaId, tipo);

      return res.status(409).json({
        message: podeVincular
          ? 'Este email já pertence a um usuário de outra escola. Use "Vincular usuário existente" para dar acesso a esta escola.'
          : `Este email já pertence a um usuário de outra escola, e o perfil ${tipo} pertence a uma única escola. `
            + 'Peça ao SUPER_ADMIN para transferir o vínculo dessa pessoa para esta escola.',
        codigo: podeVincular ? 'USUARIO_EM_OUTRA_ESCOLA' : 'PERFIL_ESCOLA_UNICA',
        usuario_id: podeVincular ? usuarioExistente._id : undefined,
      });
    }

    // Valida turma para alunos e coordenadores
    if ((tipo === 'ALUNO' || tipo === 'COORDENADOR') && !turma) {
      return res.status(400).json({ message: 'Turma é obrigatória para alunos e coordenadores.' });
    }

    // Só o SUPER_ADMIN pode criar outro SUPER_ADMIN.
    if (tipo === 'SUPER_ADMIN' && req.usuario.tipo !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Apenas um SUPER_ADMIN pode criar outro SUPER_ADMIN.' });
    }

    const novoUsuario = new Usuario({
      nome,
      email: email.toLowerCase(),
      senha,
      telefone: telefone || null,
      tipo,
      turma: turma || null,
      status: status || 'ATIVO',
    });

    // O papel vale para ESTA escola. Se amanhã a pessoa for vinculada a outra,
    // o papel de lá é independente deste.
    if (tipo !== 'SUPER_ADMIN') {
      aplicarVinculo(novoUsuario, req.escolaId, { tipo, turma: turma || null, status: status || 'ATIVO' });
    }

    await novoUsuario.save();

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      usuario: comVinculoDaEscola(novoUsuario, req.escolaId)
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
  }
};

/**
 * Auto-cadastro público (sem autenticação)
 *
 * `escola_id` NÃO é lido do corpo (mesmo que o cliente o envie) — é
 * propositalmente ignorado. Quem escolhe em qual escola a conta nasce é a
 * escola, através de um `codigo` de convite (ver server/src/convites/):
 *  - código DE TURMA → escola e turma vêm do convite, vínculo ATIVO direto;
 *  - código PÚBLICO da escola (sem turma, `aprovacao_automatica: false`) →
 *    vínculo PENDENTE, é a fila de aprovação manual (D8 do plano) — a escola
 *    não pode ficar sem âncora nenhuma, então mesmo esse caminho exige um
 *    código (o "genérico" que o admin publica abertamente).
 * `tipo` também nunca é lido do corpo: código de convite só emite ALUNO (D4).
 */
export const registrarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, telefone, codigo } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        message: 'Campos nome, email e senha são obrigatórios.'
      });
    }

    if (!codigo) {
      return res.status(400).json({ message: 'Informe o código de convite da sua escola.' });
    }

    const convite = await CodigoConvite.findOne({ codigo: normalizarCodigo(codigo) });
    if (!convite || !convite.estaValido()) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    const escola = await Escola.findOne({ _id: convite.escola_id, status: 'ATIVA' });
    if (!escola) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      // Anti-enumeração (ver plano, Fase 2): não confirma nem nega que a
      // conta já existe, só recusa o cadastro.
      return res.status(409).json({ message: 'Não foi possível concluir o cadastro com os dados informados.' });
    }

    const statusVinculo = convite.aprovacao_automatica ? 'ATIVO' : 'PENDENTE';

    const novoUsuario = new Usuario({
      nome,
      email: email.toLowerCase(),
      senha,
      telefone: telefone || null,
      tipo: 'ALUNO',
      turma: null,
      status: 'ATIVO',
    });
    aplicarVinculo(novoUsuario, escola._id, {
      tipo: 'ALUNO',
      turma: convite.turma,
      status: statusVinculo,
      codigo_convite_id: convite._id,
    });

    await novoUsuario.save();
    await CodigoConvite.updateOne({ _id: convite._id }, { $inc: { usos: 1 } });

    const usuarioResposta = novoUsuario.toObject();
    delete usuarioResposta.senha;

    res.status(201).json({
      message: statusVinculo === 'ATIVO'
        ? 'Cadastro realizado com sucesso!'
        : 'Cadastro enviado para aprovação!',
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
    const { nome, email, telefone, tipo, turma, status, senha } = req.body;

    const usuario = await Usuario.findOne({ _id: id, ...filtroEscola(req.escolaId) });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Só o SUPER_ADMIN pode promover alguém a SUPER_ADMIN.
    if (tipo === 'SUPER_ADMIN' && req.usuario.tipo !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Apenas um SUPER_ADMIN pode conceder esse perfil.' });
    }

    if (tipo && tipo !== 'SUPER_ADMIN' && !PERFIS_ESCOLA.includes(tipo)) {
      return res.status(400).json({ message: `Perfil inválido. Use um destes: ${PERFIS_ESCOLA.join(', ')}.` });
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

    // Dados da PESSOA (valem em qualquer escola).
    if (nome) usuario.nome = nome;
    if (email) usuario.email = email.toLowerCase();
    if (telefone !== undefined) usuario.telefone = telefone;

    // Papel, turma e status pertencem ao VÍNCULO com a escola ativa. Escrever
    // em `usuario.tipo` aqui era o bug: mudar o perfil de alguém nesta escola
    // mudava também o perfil nas outras em que a pessoa atua.
    if (tipo === 'SUPER_ADMIN') {
      usuario.tipo = 'SUPER_ADMIN';
    } else if (tipo || turma !== undefined || status) {
      // Escola única: um ADMIN que atua em várias escolas não pode ser rebaixado
      // aqui para ALUNO/COORDENADOR, senão ficaria preso a duas escolas.
      const conflito = conflitoMultiEscola(usuario, req.escolaId, tipo || usuario.tipo);
      if (conflito) {
        return res.status(409).json({ message: conflito, codigo: 'PERFIL_ESCOLA_UNICA' });
      }
      aplicarVinculo(usuario, req.escolaId, { tipo, turma, status });
    }

    // Atualiza a senha apenas se fornecida
    if (senha && senha.trim() !== '') {
      usuario.senha = senha;
    }

    await usuario.save();

    res.status(200).json({
      message: 'Usuário atualizado com sucesso!',
      usuario: comVinculoDaEscola(usuario, req.escolaId)
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message, codigo: 'PERFIL_ESCOLA_UNICA' });
    }
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

    const usuario = await Usuario.findOne({ _id: id, ...filtroEscola(req.escolaId) });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Se a pessoa atua em mais de uma escola, "deletar" aqui remove apenas o
    // vínculo com a escola ativa — o cadastro segue vivo nas outras.
    const outrasEscolas = (usuario.vinculos || [])
      .map((v) => String(v.escola_id))
      .filter((e) => e !== String(req.escolaId));
    if (outrasEscolas.length > 0) {
      await Usuario.updateOne({ _id: id }, { $pull: { vinculos: { escola_id: String(req.escolaId) } } });
      return res.status(200).json({
        message: 'Usuário removido desta escola. O cadastro permanece ativo nas demais escolas dele.',
      });
    }

    // Remove os vínculos de membro/coordenador para não deixar registros órfãos
    // em EquipeMembros (que inflavam a contagem de membros das equipes).
    await EquipeMembros.deleteMany({ usuario_id: id });

    // Se o usuário era o coordenador principal de alguma equipe, limpa a referência.
    await EquipeGincana.updateMany(
      { coordenador_usuario_id: id },
      { $set: { coordenador_usuario_id: null } }
    );

    await Usuario.findByIdAndDelete(id);

    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro ao deletar usuário.', error: error.message });
  }
};

/**
 * Definir status do usuário (ATIVO/INATIVO/BANIDO/SUSPENSO)
 * Se body.status for informado, define diretamente; caso contrário, alterna ATIVO↔INATIVO.
 */
export const alternarStatusUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: novoStatus } = req.body || {};

    const STATUS_VALIDOS = ['ATIVO', 'INATIVO', 'BANIDO', 'SUSPENSO'];

    if (novoStatus && !STATUS_VALIDOS.includes(novoStatus)) {
      return res.status(400).json({ message: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}.` });
    }

    if (id === req.usuario.id) {
      return res.status(403).json({ message: 'Você não pode alterar o status da sua própria conta.' });
    }

    const usuario = await Usuario.findOne({ _id: id, ...filtroEscola(req.escolaId) });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // O status também é por escola: suspender alguém aqui não o suspende na
    // outra escola em que ele atua.
    const vinculo = getVinculo(usuario, req.escolaId);
    const statusAtual = vinculo?.status || usuario.status;
    const statusFinal = novoStatus || (statusAtual === 'ATIVO' ? 'INATIVO' : 'ATIVO');

    aplicarVinculo(usuario, req.escolaId, { status: statusFinal });
    await usuario.save();

    const labels = { ATIVO: 'ativado', INATIVO: 'desativado', BANIDO: 'banido', SUSPENSO: 'suspenso' };

    res.status(200).json({
      message: `Usuário ${labels[statusFinal] || 'atualizado'} com sucesso!`,
      usuario: comVinculoDaEscola(usuario, req.escolaId)
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ message: 'Erro ao alterar status do usuário.', error: error.message });
  }
};

/**
 * Obter estatísticas de usuários
 */
export const obterEstatisticas = async (req, res) => {
  try {
    // Estatísticas restritas à escola ativa. Como papel/turma/status vivem no
    // vínculo, os agrupamentos partem do vínculo DESTA escola ($unwind +
    // $match), e não dos campos base do usuário.
    const escolaId = String(req.escolaId);
    const escopo = filtroEscola(escolaId);

    const porVinculoDaEscola = [
      { $match: escopo },
      { $unwind: '$vinculos' },
      { $match: { 'vinculos.escola_id': escolaId } },
    ];

    const porStatus = (statusDoVinculo) => ({
      vinculos: { $elemMatch: { escola_id: escolaId, status: statusDoVinculo } },
    });

    const totalUsuarios = await Usuario.countDocuments(escopo);
    const totalAtivos = await Usuario.countDocuments(porStatus('ATIVO'));
    const totalInativos = await Usuario.countDocuments(porStatus('INATIVO'));

    const porTipo = await Usuario.aggregate([
      ...porVinculoDaEscola,
      { $group: { _id: '$vinculos.tipo', total: { $sum: 1 } } }
    ]);

    const porTurma = await Usuario.aggregate([
      ...porVinculoDaEscola,
      { $match: { 'vinculos.tipo': 'ALUNO' } },
      { $group: { _id: '$vinculos.turma', total: { $sum: 1 } } },
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


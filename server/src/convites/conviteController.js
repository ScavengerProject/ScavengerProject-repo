import CodigoConvite from '../models/CodigoConvite.js';
import Usuario, { TURMAS, podeMultiEscola } from '../models/Usuario.js';
import Escola from '../models/Escola.js';
import { getVinculo, comVinculoDaEscola, aplicarVinculo, conflitoMultiEscola } from '../escolas/escolaHelpers.js';
import { notificarCoordenadoresDeOrigem } from '../notificacoes/notificarTransferenciaEscola.js';
import { gerarCodigo, normalizarCodigo } from './codigoConviteHelpers.js';

// Mesma mensagem para QUALQUER motivo de código inválido (inexistente,
// revogado, expirado, limite de usos estourado) — distinguir o motivo aqui
// seria um oráculo de força bruta para adivinhar códigos (plano, D7).
const MSG_CODIGO_INVALIDO = 'Código de convite inválido ou expirado.';

// D6: validade curta por padrão (o admin pode informar outra data ao criar).
const VALIDADE_PADRAO_MS = 14 * 24 * 60 * 60 * 1000; // 14 dias

/**
 * [POST] /api/convites — gera um código novo para a escola ativa.
 *
 * `turma` presente = código DE TURMA: vínculo nasce ATIVO direto.
 * `turma` ausente = código PÚBLICO da escola: vínculo nasce PENDENTE (fila de
 * aprovação manual, D8 do plano) — é o que o admin publica abertamente para
 * quem não tem o código da própria turma.
 */
export const criarConvite = async (req, res) => {
  try {
    const { turma, expira_em, limite_usos, ano_letivo } = req.body || {};

    if (turma !== undefined && turma !== null && !TURMAS.includes(turma)) {
      return res.status(400).json({ message: 'Turma inválida.' });
    }

    let expiraEm = expira_em ? new Date(expira_em) : new Date(Date.now() + VALIDADE_PADRAO_MS);
    if (Number.isNaN(expiraEm.getTime()) || expiraEm <= new Date()) {
      return res.status(400).json({ message: 'Data de expiração inválida: precisa ser no futuro.' });
    }

    if (limite_usos !== undefined && limite_usos !== null && (!Number.isInteger(limite_usos) || limite_usos <= 0)) {
      return res.status(400).json({ message: 'limite_usos precisa ser um inteiro positivo (ou omitido para não ter teto).' });
    }

    // Duas turmas válidas ao mesmo tempo confundem quem recebe o código (qual
    // usar?) e dificultam revogar um vazado sem também matar o outro. Só entra
    // um novo código de turma depois que o anterior expirar/for revogado.
    if (turma) {
      const codigosDaTurma = await CodigoConvite.find({ escola_id: req.escolaId, turma });
      if (codigosDaTurma.some((c) => c.estaValido())) {
        return res.status(409).json({
          message: `Já existe um código de convite válido para a turma ${turma}. Revogue-o antes de criar outro.`,
        });
      }
    }

    const codigo = await gerarCodigo();

    const convite = await CodigoConvite.create({
      codigo,
      escola_id: req.escolaId,
      turma: turma ?? null,
      tipo: 'ALUNO',
      aprovacao_automatica: Boolean(turma),
      ano_letivo: ano_letivo || new Date().getFullYear(),
      expira_em: expiraEm,
      limite_usos: limite_usos ?? null,
      criado_por: req.usuario.id,
    });

    res.status(201).json(convite);
  } catch (error) {
    console.error('Erro ao criar convite:', error);
    res.status(500).json({ message: 'Erro ao criar convite.', error: error.message });
  }
};

/**
 * [GET] /api/convites — lista os convites da escola ativa (com `usos`).
 */
export const listarConvites = async (req, res) => {
  try {
    const convites = await CodigoConvite
      .find({ escola_id: req.escolaId })
      .sort({ criado_em: -1 });

    res.status(200).json(convites);
  } catch (error) {
    console.error('Erro ao listar convites:', error);
    res.status(500).json({ message: 'Erro ao listar convites.', error: error.message });
  }
};

/**
 * [PATCH] /api/convites/:id/revogar — invalida um código imediatamente.
 * Idempotente: revogar de novo não é erro.
 */
export const revogarConvite = async (req, res) => {
  try {
    const { id } = req.params;

    const convite = await CodigoConvite.findOne({ _id: id, escola_id: req.escolaId });
    if (!convite) {
      return res.status(404).json({ message: 'Convite não encontrado.' });
    }

    if (!convite.revogado_em) {
      convite.revogado_em = new Date();
      await convite.save();
    }

    res.status(200).json(convite);
  } catch (error) {
    console.error('Erro ao revogar convite:', error);
    res.status(500).json({ message: 'Erro ao revogar convite.', error: error.message });
  }
};

/**
 * [GET] /api/convites/:id/usuarios — quem entrou por este código.
 * É o que torna a revogação útil: sem isso, revogar um código vazado deixa
 * quem já entrou por ele sem forma de ser identificado (ver plano, Fase 1).
 */
export const listarUsuariosDoConvite = async (req, res) => {
  try {
    const { id } = req.params;

    const convite = await CodigoConvite.findOne({ _id: id, escola_id: req.escolaId });
    if (!convite) {
      return res.status(404).json({ message: 'Convite não encontrado.' });
    }

    const usuarios = await Usuario
      .find({ vinculos: { $elemMatch: { escola_id: String(req.escolaId), codigo_convite_id: convite._id } } })
      .select('-senha')
      .sort({ nome: 1 });

    res.status(200).json(usuarios.map((u) => comVinculoDaEscola(u, req.escolaId)));
  } catch (error) {
    console.error('Erro ao listar usuários do convite:', error);
    res.status(500).json({ message: 'Erro ao listar usuários do convite.', error: error.message });
  }
};

/**
 * [GET] /api/convites/:codigo — pré-validação pública (sem login).
 * Devolve só o suficiente para a tela confirmar "você está entrando na Escola
 * X — 6º Ano": nunca escola_id nem qualquer outro campo do convite (D7).
 */
export const prevalidarConvite = async (req, res) => {
  try {
    const convite = await CodigoConvite.findOne({ codigo: normalizarCodigo(req.params.codigo) });
    if (!convite || !convite.estaValido()) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    const escola = await Escola.findOne({ _id: convite.escola_id, status: 'ATIVA' });
    if (!escola) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    res.status(200).json({ escola_nome: escola.nome, turma: convite.turma });
  } catch (error) {
    console.error('Erro ao pré-validar convite:', error);
    res.status(500).json({ message: 'Erro ao validar convite.', error: error.message });
  }
};

/**
 * [POST] /api/convites/resgatar — autenticado, SEM resolverEscola (a escola
 * alvo vem do código, e o usuário pode ainda não ter vínculo com ela).
 * Usado por quem já tem conta: professor ganhando uma segunda escola, e
 * principalmente o aluno se transferindo.
 */
export const resgatarConvite = async (req, res) => {
  try {
    const { codigo } = req.body || {};
    if (!codigo) {
      return res.status(400).json({ message: 'Informe o código de convite.' });
    }

    const convite = await CodigoConvite.findOne({ codigo: normalizarCodigo(codigo) });
    if (!convite || !convite.estaValido()) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    const escola = await Escola.findOne({ _id: convite.escola_id, status: 'ATIVA' });
    if (!escola) {
      return res.status(404).json({ message: MSG_CODIGO_INVALIDO });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário do token não existe mais.' });
    }

    if (usuario.tipo === 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'SUPER_ADMIN já acessa qualquer escola; não precisa de código de convite.' });
    }

    if (getVinculo(usuario, convite.escola_id)) {
      return res.status(409).json({ message: 'Você já tem um vínculo com esta escola.' });
    }

    // Código de convite só emite ALUNO (D4) — mesmo para quem resgata já
    // logado (ex.: um COORDENADOR não vira ALUNO em outra escola por aqui).
    const tipoAlvo = 'ALUNO';

    // Conflito de escola única com um vínculo ATIVO em outra escola: em vez
    // de recusar (409), isso É a solicitação de transferência — cria um
    // vínculo PENDENTE no destino, convivendo com o ATIVO da origem até um
    // ADMIN do destino aprovar (ver decidirPendencia).
    const conflito = conflitoMultiEscola(usuario, convite.escola_id, tipoAlvo);
    const statusNovoVinculo = conflito ? 'PENDENTE' : (convite.aprovacao_automatica ? 'ATIVO' : 'PENDENTE');

    aplicarVinculo(usuario, convite.escola_id, {
      tipo: tipoAlvo,
      turma: convite.turma,
      status: statusNovoVinculo,
      codigo_convite_id: convite._id,
    });

    await usuario.save();
    await CodigoConvite.updateOne({ _id: convite._id }, { $inc: { usos: 1 } });

    if (conflito) {
      return res.status(202).json({
        message: `Solicitação de transferência para ${escola.nome} enviada. Ao ser aprovada, seu vínculo com a escola atual será removido.`,
        codigo: 'TRANSFERENCIA_PENDENTE',
      });
    }

    if (statusNovoVinculo === 'ATIVO') {
      return res.status(200).json({ message: `Vínculo com ${escola.nome} criado com sucesso.` });
    }

    res.status(202).json({
      message: `Solicitação enviada para aprovação em ${escola.nome}.`,
      codigo: 'VINCULO_PENDENTE',
    });
  } catch (error) {
    console.error('Erro ao resgatar convite:', error);
    res.status(500).json({ message: 'Erro ao resgatar convite.', error: error.message });
  }
};

/**
 * [GET] /api/convites/pendentes — vínculos PENDENTE da escola ativa (fila de
 * aprovação: cadastro sem código de turma + transferências).
 */
export const listarPendentes = async (req, res) => {
  try {
    const usuarios = await Usuario
      .find({ vinculos: { $elemMatch: { escola_id: String(req.escolaId), status: 'PENDENTE' } } })
      .select('-senha')
      .sort({ nome: 1 });

    res.status(200).json(usuarios.map((u) => comVinculoDaEscola(u, req.escolaId)));
  } catch (error) {
    console.error('Erro ao listar pendentes:', error);
    res.status(500).json({ message: 'Erro ao listar pendentes.', error: error.message });
  }
};

/**
 * [PATCH] /api/convites/pendentes/:usuarioId — ADMIN decide um vínculo
 * PENDENTE da escola ativa. body: { decisao: 'APROVAR' | 'REJEITAR', turma? }.
 *
 * `turma` só é lida ao APROVAR. Um vínculo PENDENTE nascido do código PÚBLICO
 * da escola (sem turma) chega aqui com `turma: null` — sem exigir uma aqui, o
 * aluno entraria sem turma e falharia silenciosamente na elegibilidade de
 * provas (`turmas_permitidas`, ver Prova.js). Por isso é OBRIGATÓRIA quando o
 * pendente ainda não tem turma, e opcional (o admin pode corrigi-la) quando já
 * tem — caso do código de turma e da transferência, que herda a turma do
 * convite/vínculo de origem.
 *
 * Aprovar transferência é UMA gravação: remove o vínculo ATIVO de outra
 * escola (se houver) e promove o PENDENTE a ATIVO no mesmo `usuario.save()`
 * (ver plano, Fase 0 — nada de $pull + $push em updateOne's separados, e sem
 * transação: mongodb-memory-server não roda replica set por padrão).
 */
export const decidirPendencia = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { decisao, turma } = req.body || {};

    if (!['APROVAR', 'REJEITAR'].includes(decisao)) {
      return res.status(400).json({ message: 'Informe decisao: APROVAR ou REJEITAR.' });
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const pendente = usuario.vinculos.find(
      (v) => String(v.escola_id) === String(req.escolaId) && v.status === 'PENDENTE'
    );
    if (!pendente) {
      return res.status(404).json({ message: 'Não há vínculo pendente deste usuário com esta escola.' });
    }

    if (decisao === 'REJEITAR') {
      usuario.vinculos = usuario.vinculos.filter((v) => v !== pendente);
      await usuario.save();
      return res.status(200).json({ message: `Solicitação de ${usuario.nome} rejeitada.` });
    }

    // turma explícita no corpo substitui a do pendente (permite o admin
    // corrigir); ausente, mantém a que já veio do convite/transferência.
    let turmaFinal = pendente.turma;
    if (turma !== undefined && turma !== null && turma !== '') {
      if (!TURMAS.includes(turma)) {
        return res.status(400).json({ message: 'Turma inválida.' });
      }
      turmaFinal = turma;
    }
    if (!turmaFinal) {
      return res.status(400).json({
        message: 'Informe a turma do aluno para aprovar: este vínculo pendente não tem turma definida.',
      });
    }

    // Transferência: um vínculo ATIVO de perfil de escola única (ALUNO,
    // COORDENADOR, PAI/MÃE — nunca ADMIN/PROFESSOR, que acumulam escolas)
    // em OUTRA escola é a origem que precisa sair na mesma gravação.
    const vinculoOrigem = usuario.vinculos.find(
      (v) => String(v.escola_id) !== String(req.escolaId) && v.status !== 'PENDENTE' && !podeMultiEscola(v.tipo)
    );

    if (vinculoOrigem) {
      // Best-effort: um erro ao notificar não pode impedir a aprovação.
      await notificarCoordenadoresDeOrigem(usuario, vinculoOrigem.escola_id).catch((err) => {
        console.error('Erro ao notificar coordenador de origem sobre transferência:', err);
      });
    }

    pendente.status = 'ATIVO';
    pendente.turma = turmaFinal;
    if (vinculoOrigem) {
      usuario.vinculos = usuario.vinculos.filter((v) => v !== vinculoOrigem);
    }

    await usuario.save();

    res.status(200).json({
      message: `Vínculo de ${usuario.nome} com a escola aprovado.`,
      usuario: comVinculoDaEscola(usuario, req.escolaId),
    });
  } catch (error) {
    console.error('Erro ao decidir pendência:', error);
    res.status(500).json({ message: 'Erro ao decidir pendência.', error: error.message });
  }
};

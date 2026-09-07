import mongoose from 'mongoose';
import { TURMAS } from './Usuario.js';

/**
 * Código de convite: é o que autoriza um auto-cadastro a entrar numa escola
 * específica (e, opcionalmente, numa turma específica) sem que o candidato
 * escolha a escola livremente no corpo da requisição.
 *
 * Dois formatos convivem no mesmo model (ver plano, D4/Fase 2):
 *  - código DE TURMA (`turma` preenchida): vínculo nasce ATIVO direto.
 *  - código PÚBLICO da escola (`turma` null): vínculo nasce PENDENTE, é a
 *    "fila sem código de turma" (D8) — o admin aprova manualmente depois.
 * Isso é o que o campo `aprovacao_automatica` guarda (derivado da presença de
 * `turma` na emissão, ver conviteController.criarConvite).
 */
const CodigoConviteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  escola_id: {
    type: String,
    ref: 'Escola',
    required: true,
    index: true,
  },

  turma: {
    type: String,
    enum: TURMAS,
    default: null,
  },

  // Travado em ALUNO no schema (D4): o convite nunca emite um perfil mais
  // privilegiado. PROFESSOR continua exclusivamente no fluxo manual
  // (POST /escolas/:id/usuarios). Não amplie este enum sem revisar D4.
  tipo: {
    type: String,
    enum: ['ALUNO'],
    default: 'ALUNO',
  },

  // Vínculo ATIVO direto (código de turma) ou PENDENTE (código público da
  // escola, sem turma) — ver comentário do schema acima.
  aprovacao_automatica: {
    type: Boolean,
    default: true,
  },

  ano_letivo: {
    type: Number,
    required: true,
  },

  expira_em: {
    type: Date,
    required: true,
  },

  // null = sem teto de usos.
  limite_usos: {
    type: Number,
    default: null,
  },

  usos: {
    type: Number,
    default: 0,
  },

  revogado_em: {
    type: Date,
    default: null,
  },

  criado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },

  criado_em: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Um código só pode ser resgatado quando: não foi revogado, ainda não expirou
 * e (se houver teto) ainda não bateu o limite de usos.
 *
 * As três causas de invalidez são checadas juntas de propósito: quem consome
 * este método (prevalidarConvite, registrarUsuario, resgatarConvite) devolve
 * a MESMA mensagem genérica para qualquer uma delas — distinguir o motivo na
 * resposta é um oráculo de força bruta (ver D7 no plano).
 */
CodigoConviteSchema.methods.estaValido = function () {
  if (this.revogado_em) return false;
  if (this.expira_em <= new Date()) return false;
  if (this.limite_usos != null && this.usos >= this.limite_usos) return false;
  return true;
};

const CodigoConvite = mongoose.model('CodigoConvite', CodigoConviteSchema, 'CodigosConvite');

export default CodigoConvite;

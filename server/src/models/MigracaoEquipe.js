// src/models/MigracaoEquipe.js
import mongoose from 'mongoose';

const MigracaoEquipeSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  equipe_origem_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipeGincana', required: true },
  equipe_destino_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipeGincana', required: true },

  status: {
    type: String,
    enum: ['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA'],
    default: 'PENDENTE'
  },

  motivo: { type: String, default: '' },
  justificativa: { type: String, default: '' },

  solicitado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  aprovado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },

  criado_em: { type: Date, default: Date.now },
  atualizado_em: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } });

// evita múltiplas solicitações idênticas pendentes
MigracaoEquipeSchema.index(
  { usuario_id: 1, equipe_origem_id: 1, equipe_destino_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDENTE' } }
);

const MigracaoEquipe = mongoose.model('MigracaoEquipe', MigracaoEquipeSchema, 'Migracoes_Equipe');
export default MigracaoEquipe;

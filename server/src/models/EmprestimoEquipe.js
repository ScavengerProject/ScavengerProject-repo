// src/models/EmprestimoEquipe.js
import mongoose from 'mongoose';

const EmprestimoEquipeSchema = new mongoose.Schema(
  {
    usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    // origem/destino são IDs de EquipeGincana (como em Migração)
    equipe_origem_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipeGincana', required: true },
    equipe_destino_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipeGincana', required: true },

    prova_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prova', required: true },

    inicio: { type: Date, default: () => new Date() },
    fim: { type: Date, default: null }, // se null, vale até “fim” da prova ou até encerrar explicitamente

    status: {
      type: String,
      enum: ['ATIVO', 'ENCERRADO', 'CANCELADO'],
      default: 'ATIVO',
    },

    criado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    encerrado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    justificativa_encerramento: { type: String, default: null },
  },
  { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } }
);

// Evita empréstimos duplicados/concorrentes para o mesmo usuário/prova enquanto houver um ATIVO
EmprestimoEquipeSchema.index(
  { usuario_id: 1, prova_id: 1, status: 1 },
  { partialFilterExpression: { status: 'ATIVO' }, unique: true, name: 'uniq_emprestimo_usuario_prova_ativo' }
);

export default mongoose.model('EmprestimoEquipe', EmprestimoEquipeSchema);

// src/models/OfertaEmprestimo.js
import mongoose from 'mongoose';

const OfertaEmprestimoSchema = new mongoose.Schema(
  {
    // Solicitação à qual esta oferta se refere
    solicitacao_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'SolicitacaoEmprestimo', 
      required: true,
      index: true
    },

    // Coordenador que está oferecendo
    coordenador_ofertante_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true 
    },
    
    // Equipe que está oferecendo o membro
    equipe_ofertante_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'EquipeGincana', 
      required: true 
    },

    // Membros oferecidos (usuários da equipe ofertante)
    membros_oferecidos: [{
      usuario_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
      }
    }],

    // Mensagem opcional do coordenador
    mensagem: { 
      type: String, 
      default: null 
    },

    // Status da oferta
    status: {
      type: String,
      enum: [
        'PENDENTE',     // Aguardando coordenador solicitante aceitar
        'ACEITA',       // Coordenador aceitou, empréstimo criado
        'RECUSADA',     // Coordenador recusou
        'CANCELADA'     // Coordenador ofertante cancelou
      ],
      default: 'PENDENTE',
    },

    // Aceite/Recusa
    decidido_por: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      default: null 
    },
    decidido_em: { 
      type: Date, 
      default: null 
    },
    justificativa_decisao: { 
      type: String, 
      default: null 
    },

    // Empréstimos criados a partir desta oferta
    emprestimos_criados: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'EmprestimoEquipe'
    }],
  },
  { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } }
);

// Índices
OfertaEmprestimoSchema.index({ solicitacao_id: 1, status: 1 });
OfertaEmprestimoSchema.index({ coordenador_ofertante_id: 1 });
OfertaEmprestimoSchema.index({ equipe_ofertante_id: 1 });

export default mongoose.model('OfertaEmprestimo', OfertaEmprestimoSchema);


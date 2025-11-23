// src/models/SolicitacaoEmprestimo.js
import mongoose from 'mongoose';

const SolicitacaoEmprestimoSchema = new mongoose.Schema(
  {
    // Coordenador que está solicitando
    coordenador_solicitante_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true 
    },
    
    // Equipe que precisa de reforço
    equipe_solicitante_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'EquipeGincana', 
      required: true 
    },

    // Prova para a qual precisa de reforço
    prova_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Prova', 
      required: true 
    },

    // Quantas pessoas precisa
    quantidade_solicitada: { 
      type: Number, 
      required: true,
      min: 1 
    },

    // Critérios opcionais para os membros solicitados
    criterios: {
      // Nível escolar desejado
      niveis_escolares: {
        type: [String],
        enum: [
          "EF - 1º Ano", "EF - 2º Ano", "EF - 3º Ano", "EF - 4º Ano", "EF - 5º Ano",
          "EF - 6º Ano", "EF - 7º Ano", "EF - 8º Ano", "EF - 9º Ano", 
          "EM - 1º Ano", "EM - 2º Ano", "EM - 3º Ano"
        ],
        default: []
      },
      // Gênero desejado (opcional)
      genero: {
        type: String,
        enum: ['MASCULINO', 'FEMININO', 'QUALQUER'],
        default: 'QUALQUER'
      },
    },

    // Motivo/justificativa da solicitação
    motivo: { 
      type: String, 
      required: true 
    },

    // Status da solicitação
    status: {
      type: String,
      enum: [
        'PENDENTE_APROVACAO',  // Aguardando admin aprovar
        'APROVADA',             // Admin aprovou, aguardando ofertas
        'EM_ANDAMENTO',         // Ofertas sendo feitas
        'CONCLUIDA',            // Empréstimos criados
        'REJEITADA',            // Admin rejeitou
        'CANCELADA'             // Coordenador cancelou
      ],
      default: 'PENDENTE_APROVACAO',
    },

    // Aprovação do admin
    aprovado_por: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      default: null 
    },
    aprovado_em: { 
      type: Date, 
      default: null 
    },
    justificativa_admin: { 
      type: String, 
      default: null 
    },

    // Ofertas recebidas (referência para OfertaEmprestimo)
    // Não guardamos aqui, vamos buscar por solicitacao_id

    // Cancelamento
    cancelado_por: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      default: null 
    },
    cancelado_em: { 
      type: Date, 
      default: null 
    },
    motivo_cancelamento: { 
      type: String, 
      default: null 
    },
  },
  { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } }
);

// Índices para busca eficiente
SolicitacaoEmprestimoSchema.index({ coordenador_solicitante_id: 1 });
SolicitacaoEmprestimoSchema.index({ equipe_solicitante_id: 1 });
SolicitacaoEmprestimoSchema.index({ prova_id: 1 });
SolicitacaoEmprestimoSchema.index({ status: 1 });

export default mongoose.model('SolicitacaoEmprestimo', SolicitacaoEmprestimoSchema);

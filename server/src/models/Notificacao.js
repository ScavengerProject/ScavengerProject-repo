import mongoose from 'mongoose';

const NotificacaoSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    enum: ['NOVA_PROVA', 'RESULTADO', 'COMUNICADO'],
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  mensagem: {
    type: String,
    required: true
  },
  lida: {
    type: Boolean,
    default: false,
    index: true
  },
  // Referência para a prova (se aplicável)
  prova_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prova',
    default: null
  },
  // Referência para resultado ou comunicado (futuro)
  referencia_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  email_enviado: {
    type: Boolean,
    default: false
  },
  email_enviado_em: {
    type: Date,
    default: null
  },
  criado_em: {
    type: Date,
    default: Date.now,
    index: true
  },
  lida_em: {
    type: Date,
    default: null
  }
});

const Notificacao = mongoose.model('Notificacao', NotificacaoSchema, 'Notificacoes');

export default Notificacao;


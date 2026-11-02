import mongoose from 'mongoose';

const NotificacaoSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  gincana_id: { type: String, required: true, default: 'GINCANA_PRINCIPAL', index: true },

  tipo: {
    type: String,
    // RESULTADO_FINAL: resultado da gincana para o coordenador, criado no
    // encerramento (ver gincanas/notificarResultadoFinal.js).
    enum: ['NOVA_PROVA', 'RESULTADO', 'COMUNICADO', 'PENALIDADE', 'MIGRACAO', 'RESULTADO_FINAL'],
    required: true
  },
  
  titulo: { type: String, required: true },
  mensagem: { type: String, required: true },
  lida: { type: Boolean, default: false },
  lida_em: { type: Date },
  email_enviado: { type: Boolean, default: false },
  
  prova_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prova' },
  
  referencia_id: { type: mongoose.Schema.Types.ObjectId }, 
  
  criado_em: { type: Date, default: Date.now }
});

export default mongoose.model('Notificacao', NotificacaoSchema, 'Notificacoes');
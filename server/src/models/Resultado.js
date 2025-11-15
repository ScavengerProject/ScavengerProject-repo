import mongoose from 'mongoose';

const resultadoSchema = new mongoose.Schema({
  gincana_id: {
    type: String,
    required: true,
    default: 'GINCANA_PRINCIPAL', // usando valor padrão
  },
  prova_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prova',
    required: true,
  },
  equipe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipe',
    required: true,
  },
  pontuacao_obtida: {
    type: Number,
    required: true,
    min: 0,
  },
  // Usado para registrar a justificativa (ex: "1ª Posição" ou "50 doações")
  detalhes_pontuacao: {
    type: String, 
  },
  submetido_em: {
    type: Date,
    default: Date.now,
  },
  avaliado_por_usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', 
    required: true,
  },
}, {
  timestamps: true,
});

// Índice para buscas rápidas
resultadoSchema.index({ prova_id: 1, equipe_id: 1 }, { unique: true });

const Resultado = mongoose.model('Resultado', resultadoSchema);
export default Resultado;
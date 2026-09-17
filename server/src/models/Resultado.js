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

  // ENTRADA ORIGINAL do lançamento — o que o avaliador digitou, não o que o
  // cálculo produziu. Existe para o modal de lançamento reabrir exatamente como
  // foi enviado: até aqui o único registro da entrada era o texto de
  // `detalhes_pontuacao`, de onde a listagem extraía o primeiro número com
  // regex, e as quantidades de bônus não voltavam de jeito nenhum — reabrir o
  // lançamento mostrava "Bônus: 0 pts" para uma prova lançada com bônus, e
  // salvar de novo apagava os pontos de verdade.
  //
  // Guarda a quantidade INFORMADA, sem o teto aplicado (o teto é do cálculo,
  // ver lancarResultados): o campo precisa reaparecer com o número digitado.
  valor_informado: {
    type: String,
    default: null,
  },
  bonus_informado: {
    type: Map,
    of: Number,
    default: undefined,
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
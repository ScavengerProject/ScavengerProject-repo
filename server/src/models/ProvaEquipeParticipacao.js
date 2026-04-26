import mongoose from 'mongoose';

const ProvaEquipeParticipacaoSchema = new mongoose.Schema(
  {
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
    titulares_usuario_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
      },
    ],
    suplentes_usuario_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
      },
    ],
    definido_por_usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ProvaEquipeParticipacaoSchema.index({ prova_id: 1, equipe_id: 1 }, { unique: true });

const ProvaEquipeParticipacao = mongoose.model(
  'ProvaEquipeParticipacao',
  ProvaEquipeParticipacaoSchema,
  'Provas_Equipes_Participacao'
);

export default ProvaEquipeParticipacao;

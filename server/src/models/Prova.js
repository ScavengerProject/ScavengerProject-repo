import mongoose from 'mongoose';

const ProvaSchema = new mongoose.Schema({
  titulo: { type: String, required: [true, 'O título é obrigatório.'] },
  descricao: { type: String, required: [true, 'A descrição é obrigatória.'] },
  data_inicio: { type: Date },
  data_fim: { type: Date },
  pontuacao: { type: mongoose.Schema.Types.Mixed }, 
  anexos: { type: mongoose.Schema.Types.Mixed },    
  formato: {
    type: String,
    enum: ['QUIZ', 'PERFOMANCE', 'ESPORTE', 'CRIATIVA'],
    required: [true, 'O formato da prova é obrigatório.'],
  },
  status: {
    type: String,
    enum: ['NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA'],
    default: 'NAO_INICIADA'
  },
  quesito_de_avalicao: {
    type: String,
    enum: ['TEMPO', 'PRODUTIVIDADE']
  },
  requisito_usuario: {
    type: String,
    enum: ['ALUNOS_FUNDAMENTAL', 'ALUNOS_MEDIO', 'PROFESSORES', 'PAI/MÃE']
  },
  criado_por_usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // cria uma referência ao model 'Usuario'
    required: true
  },
  criado_em: {
    type: Date,
    default: Date.now
  }
});

const Prova = mongoose.model('Prova', ProvaSchema);

export default Prova;
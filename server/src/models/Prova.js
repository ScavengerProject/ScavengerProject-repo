import mongoose from 'mongoose';

const ProvaSchema = new mongoose.Schema({
  titulo: { type: String, required: [true, 'O título é obrigatório.'] },
  descricao: { type: String, required: [true, 'A descrição é obrigatória.'] },
  data_inicio: { type: Date, required: [true, 'A data de início é obrigatória.'] },
  data_fim: { type: Date },
  pontuacao: { type: mongoose.Schema.Types.Mixed, required: [true, 'A pontuação é obrigatória.'] }, 
  anexos: { type: mongoose.Schema.Types.Mixed },    
  formato: {
    type: String,
    enum: ['QUESTIONARIO_ONLINE', 'PROVA_PRATICA', 'PROVA_ESCRITA'],
    default: 'PROVA_PRATICA',
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

const Prova = mongoose.model('Prova', ProvaSchema, 'Provas');

export default Prova;
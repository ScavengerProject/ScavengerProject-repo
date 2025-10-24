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
  // Parte do US02, já havido sido criada com o formato correto. 
  // Apenas modifiquei o nome para o plural e mudei o tipo para Array String, para garantir multiplos quesitos de avaliação.
  quesitos_de_avaliacao: {
    type: [String],
    enum: ['TEMPO', 'PRODUTIVIDADE'],
    default: []
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
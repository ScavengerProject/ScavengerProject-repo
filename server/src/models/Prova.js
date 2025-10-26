import mongoose from 'mongoose';

const RequisitoUsuarioSchema = new mongoose.Schema({
  ALUNOS_FUNDAMENTAL: { type: Number, min: 0, default: 0 },
  ALUNOS_MEDIO:       { type: Number, min: 0, default: 0 },
  PROFESSORES:        { type: Number, min: 0, default: 0 },
  'PAI/MÃE':          { type: Number, min: 0, default: 0 }
}, { _id: false });

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
  // Parte do US02, já havido sido criada com o formato correto. 
  // Apenas modifiquei o nome para o plural e mudei o tipo para Array String, para garantir multiplos quesitos de avaliação.
  quesitos_de_avaliacao: {
    type: [String],
    enum: ['TEMPO', 'PRODUTIVIDADE'],
    default: []
},
  requisito_usuario: { type: RequisitoUsuarioSchema, default: () => ({}) },
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
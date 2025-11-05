import mongoose from 'mongoose';

const RequisitoUsuarioSchema = new mongoose.Schema({
  ALUNOS_FUNDAMENTAL: { type: Number, min: 0, default: 0 },
  ALUNOS_MEDIO:       { type: Number, min: 0, default: 0 },
  PROFESSORES:        { type: Number, min: 0, default: 0 },
  'PAI/MÃE':          { type: Number, min: 0, default: 0 }
}, { _id: false });

// ✅ US14: Schema para restrições de participação
const RestricaoParticipacaoSchema = new mongoose.Schema({
  limite_tentativas: { type: Number, min: 1, default: null }, // null = ilimitado
  tempo_maximo_minutos: { type: Number, min: 1, default: null }, // null = sem limite
  permitir_reenvio: { type: Boolean, default: true },
}, { _id: false });

// ✅ US14: Schema para critérios de elegibilidade
const CriterioElegibilidadeSchema = new mongoose.Schema({
  turmas_permitidas: { type: [String], default: [] }, // Ex: ['EF - 1º Ano', 'EM - 2º Ano']
  pre_requisitos_prova_ids: { type: [mongoose.Schema.Types.ObjectId], ref: 'Prova', default: [] }, // Provas que devem ser concluídas antes
}, { _id: false });

// ✅ US14: Schema para sequenciamento de etapas
const SequenciamentoSchema = new mongoose.Schema({
  etapas: [{
    ordem: { type: Number, required: true },
    descricao: { type: String, required: true },
    obrigatoria: { type: Boolean, default: true }
  }],
  exigir_ordem: { type: Boolean, default: false } // Se as etapas devem ser feitas na ordem
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
  quesitos_de_avaliacao: {
    type: [String],
    enum: ['TEMPO', 'PRODUTIVIDADE'],
    default: []
  },
  requisito_usuario: { type: RequisitoUsuarioSchema, default: () => ({}) },
  
  // ✅ US14: Novos campos de configuração
  restricao_participacao: { type: RestricaoParticipacaoSchema, default: () => ({}) },
  criterio_elegibilidade: { type: CriterioElegibilidadeSchema, default: () => ({}) },
  sequenciamento: { type: SequenciamentoSchema, default: () => ({}) },
  
  criado_por_usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  criado_em: {
    type: Date,
    default: Date.now
  }
});

const Prova = mongoose.model('Prova', ProvaSchema, 'Provas');

export default Prova;
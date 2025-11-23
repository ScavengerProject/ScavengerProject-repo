import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  senha: { type: String, required: true },
  telefone: { type: String },
  tipo: {
    type: String,
    enum: ['ADMIN', 'PROFESSOR', 'ALUNO', 'COORDENADOR', 'PAI/MÃE'],
    required: true,
  },

  turma: {
    type: String,
    enum: [
      "EF - 1º Ano", "EF - 2º Ano", "EF - 3º Ano", "EF - 4º Ano", "EF - 5º Ano",
      "EF - 6º Ano", "EF - 7º Ano", "EF - 8º Ano", "EF - 9º Ano", "EM - 1º Ano",
      "EM - 2º Ano", "EM - 3º Ano", null
    ],
    default: null
  },

  matricula: { type: String },
  status: { type: String, enum: ['ATIVO', 'INATIVO'], default: 'ATIVO' },
  criado_em: { type: Date, default: Date.now },
  /*
  // equipe que o usuário pertence (Equipe.js)
  equipe_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipe',
      default: null, // o participante pode não ter equipe?!
      index: true,
  },*/

});

UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

const Usuario = mongoose.model('Usuario', UsuarioSchema, 'Usuarios');

export default Usuario;
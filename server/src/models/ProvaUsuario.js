import mongoose from 'mongoose';

const ProvaUsuarioSchema = new mongoose.Schema({
  prova_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prova', required: true },
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
}, { timestamps: true });

ProvaUsuarioSchema.index({ prova_id: 1, usuario_id: 1 }, { unique: true });

const ProvaUsuario = mongoose.model('ProvaUsuario', ProvaUsuarioSchema, 'Provas_Usuarios');
export default ProvaUsuario;

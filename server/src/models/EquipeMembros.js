import mongoose from 'mongoose';

const EquipeMembroSchema = new mongoose.Schema({
  // Referência ao registro de participação da equipe na gincana
  equipe_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'EquipeGincana', 
    required: true },
  
  // Referência ao usuário que é membro
  usuario_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true },
  
  is_coordenador: {
    type: Boolean,
    required: true,
    default: false
  },
});

export default mongoose.model('EquipeMembro', EquipeMembroSchema, 'Equipes_Membros');
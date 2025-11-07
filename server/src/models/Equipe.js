import mongoose from 'mongoose';

// Dados básicos da equipe
const EquipeSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: [true, 'O nome da equipe é obrigatório.'],
        unique: true,
        trim: true,
    },
    cor: { 
        type: String, 
        required: [true, 'A cor da equipe é obrigatória.'],
    },
    criado_em: { 
        type: Date, 
        default: Date.now 
    },
});

const Equipe = mongoose.model('Equipe', EquipeSchema, 'Equipes');

export default Equipe;
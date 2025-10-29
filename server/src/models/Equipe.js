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
    
    // Array para rastrear todos os membros atuais da equipe (independênte da gincana atual).
    membros: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
    }],

    criado_em: { 
        type: Date, 
        default: Date.now 
    },
});

const Equipe = mongoose.model('Equipe', EquipeSchema, 'Equipes');

export default Equipe;
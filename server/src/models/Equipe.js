import mongoose from 'mongoose';

// Dados básicos da equipe
const EquipeSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome da equipe é obrigatório.'],
        trim: true,
    },
    // Escopo da edição. Equipes são independentes por gincana: o mesmo nome pode
    // se repetir entre edições diferentes.
    gincana_id: {
        type: String,
        required: [true, 'A gincana da equipe é obrigatória.'],
        default: 'GINCANA_PRINCIPAL',
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

// Nome único DENTRO de cada gincana (substitui o unique global anterior).
EquipeSchema.index({ nome: 1, gincana_id: 1 }, { unique: true });

const Equipe = mongoose.model('Equipe', EquipeSchema, 'Equipes');

export default Equipe;
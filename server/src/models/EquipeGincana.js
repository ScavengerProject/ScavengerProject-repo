import mongoose from 'mongoose';

// Dados da Equipe em relação a uma Gincana Específica, ponte entre a equipe e a gincana
const EquipeGincanaSchema = new mongoose.Schema({
    
    equipe_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipe', 
        required: [true, 'A referência à equipe é obrigatória.'],
        unique: true, // garante que uma equipe só tenha uma entrada por gincana se gincana_id for sempre o mesmo
    },

    gincana_id: {
        type: String, 
        required: [true, 'A gincana é obrigatória.'],
        default: 'GINCANA_PRINCIPAL', // usando valor padrão
    },
    
    coordenador_usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario', 
        required: [true, 'O coordenador da equipe é obrigatório.'],
    },
    
    pontos_acumulados: {
        type: Number,
        default: 0,
    },

    criado_em: { 
        type: Date, 
        default: Date.now 
    },
    
    // Índice único composto (para garantir que uma equipe só tenha um registro por gincana)
    // EquipeGincanaSchema.index({ equipe_id: 1, gincana_id: 1 }, { unique: true });
});

const EquipeGincana = mongoose.model('EquipeGincana', EquipeGincanaSchema, 'Equipes_Gincana');

export default EquipeGincana;
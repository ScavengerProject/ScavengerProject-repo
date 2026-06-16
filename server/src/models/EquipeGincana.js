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
    
    // Coordenador "principal" da equipe (compatibilidade/exibição/notificações).
    // A fonte da verdade do CONJUNTO de coordenadores é EquipeMembros.is_coordenador.
    coordenador_usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        default: null,
    },

    // Número máximo de coordenadores que esta equipe pode ter (definido pelo ADMIN).
    // Não é obrigatório atingir o limite; a equipe pode ter menos coordenadores.
    max_coordenadores: {
        type: Number,
        default: 1,
        min: 1,
    },

    pontos_acumulados: {
        type: Number,
        default: 0,
    },

    criado_em: { 
        type: Date, 
        default: Date.now 
    },
});

const EquipeGincana = mongoose.model('EquipeGincana', EquipeGincanaSchema, 'Equipes_Gincana');

export default EquipeGincana;
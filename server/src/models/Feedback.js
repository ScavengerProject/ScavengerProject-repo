import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    // Referência ao usuário que criou o feedback (o perfil logado)
    criado_por_usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    
    // Referência à gincana atual
    gincana_id: {
        type: String, 
        required: true,
        default: 'GINCANA_PRINCIPAL'
    },
    
    // O texto do feedback ou problema
    descricao: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000 // Limite de 1000 caracteres para a descrição
    },

    resposta_admin: {
        type: String,
        trim: true,
        maxlength: 10000,
        default: null // Inicialmente nulo
    },
    
    // Status do feedback (para o Admin/Gestor saber o que foi tratado)
    status: {
        type: String,
        enum: ['PENDENTE', 'ANALISADO'],
        default: 'PENDENTE',
        required: true
    },
    
    // Referência ao usuário que analisou o feedback (inicialmente nulo)
    avaliado_por_usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        default: null
    },

    criado_em: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false }); // Usando 'criado_em' manual em vez de timestamps automáticos

// Exporta o modelo
export default mongoose.model('Feedback', FeedbackSchema, 'Feedbacks');
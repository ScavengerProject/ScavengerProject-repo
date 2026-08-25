import mongoose from 'mongoose';

// Representa uma edição/instância isolada de gincana ("workspace").
// O _id é uma String para permitir que a gincana legada use o valor fixo
// 'GINCANA_PRINCIPAL' — mantendo compatibilidade com os documentos antigos
// cujo campo gincana_id já aponta para essa string.
const GincanaSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
    },

    // Escola dona desta edição (tenant raiz). Toda a cadeia de dados
    // (equipes, provas, resultados...) herda o isolamento por esta via.
    escola_id: {
        type: String,
        ref: 'Escola',
        required: [true, 'A escola da gincana é obrigatória.'],
        default: 'ESCOLA_PRINCIPAL',
        index: true,
    },

    nome: {
        type: String,
        required: [true, 'O nome da gincana é obrigatório.'],
        trim: true,
    },

    ano: {
        type: Number,
        required: [true, 'O ano/edição da gincana é obrigatório.'],
    },

    status: {
        type: String,
        enum: ['ATIVA', 'ENCERRADA', 'ARQUIVADA'],
        default: 'ATIVA',
    },

    descricao: {
        type: String,
        default: '',
    },

    data_inicio: {
        type: Date,
        default: null,
    },

    data_fim: {
        type: Date,
        default: null,
    },

    criado_por: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
    },

    criado_em: {
        type: Date,
        default: Date.now,
    },
}, { _id: false }); // _id é gerenciado manualmente (String)

// Evita duplicar a mesma edição DENTRO de uma escola (ex.: "Gincana" 2025 duas
// vezes na mesma escola). Escolas diferentes podem repetir nome e ano.
GincanaSchema.index({ escola_id: 1, nome: 1, ano: 1 }, { unique: true });

const Gincana = mongoose.model('Gincana', GincanaSchema, 'Gincanas');

export default Gincana;

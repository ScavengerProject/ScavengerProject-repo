import mongoose from 'mongoose';

// Representa uma escola (o "tenant" raiz do sistema).
//
// Hierarquia de escopo: Escola -> Gincana -> (Equipes, Provas, Resultados, ...).
// Como toda entidade de dados já carrega gincana_id, e cada Gincana pertence a
// exatamente uma Escola, o isolamento entre escolas é transitivo: basta validar
// que a gincana do request pertence à escola ativa (ver middleware
// resolverGincana em ../auth/authPermissions.js).
//
// O _id é uma String pelo mesmo motivo do Gincana._id: permitir que a escola
// legada use o valor fixo 'ESCOLA_PRINCIPAL' e os dados antigos continuem
// válidos sem update em massa.
const EscolaSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
    },

    nome: {
        type: String,
        required: [true, 'O nome da escola é obrigatório.'],
        trim: true,
        unique: true,
    },

    cidade: {
        type: String,
        default: '',
        trim: true,
    },

    uf: {
        type: String,
        default: '',
        trim: true,
        uppercase: true,
        maxlength: 2,
    },

    status: {
        type: String,
        enum: ['ATIVA', 'INATIVA'],
        default: 'ATIVA',
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

const Escola = mongoose.model('Escola', EscolaSchema, 'Escolas');

export default Escola;

// Para criar uma collection de teste com a conexão com o banco

import mongoose from 'mongoose';

// Corpo da collection
const TesteSchema = new mongoose.Schema({
    mensagem: {
        type: String,
        required: true,
        default: 'Conexão Mongoose OK'
    },
    data: {
        type: Date,
        default: Date.now
    }
});

// o nome é Teste mas vai aparecer no plural 'testes' no DB
const Teste = mongoose.model('Teste', TesteSchema);

export default Teste;
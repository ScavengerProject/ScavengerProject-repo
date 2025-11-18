import mongoose from 'mongoose';

const ConfiguracaoGincanaSchema = new mongoose.Schema({
    gincana_id: {
        type: String,
        required: true,
        default: 'GINCANA_PRINCIPAL',
        unique: true
    },
    mostrar_notas_ranking: {
        type: Boolean,
        default: false
    },
    atualizado_em: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false });

const ConfiguracaoGincana = mongoose.model('ConfiguracaoGincana', ConfiguracaoGincanaSchema, 'Configuracoes_Gincana');

export default ConfiguracaoGincana;


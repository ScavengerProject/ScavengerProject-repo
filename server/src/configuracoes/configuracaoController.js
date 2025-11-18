import ConfiguracaoGincana from '../models/ConfiguracaoGincana.js';

const GINCANA_ATUAL_ID = 'GINCANA_PRINCIPAL';

/**
 * [GET] Obtém a configuração da gincana atual
 */
export const obterConfiguracao = async (req, res) => {
    try {
        let config = await ConfiguracaoGincana.findOne({ gincana_id: GINCANA_ATUAL_ID });
        
        // Se não existe, cria com valores padrão
        if (!config) {
            config = new ConfiguracaoGincana({
                gincana_id: GINCANA_ATUAL_ID,
                mostrar_notas_ranking: false
            });
            await config.save();
        }
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Erro ao obter configuração:', error);
        res.status(500).json({ message: 'Erro interno ao buscar configuração.' });
    }
};

/**
 * [PUT] Atualiza a configuração da gincana atual
 * Apenas ADMIN pode atualizar
 */
export const atualizarConfiguracao = async (req, res) => {
    try {
        const { mostrar_notas_ranking } = req.body;
        
        let config = await ConfiguracaoGincana.findOne({ gincana_id: GINCANA_ATUAL_ID });
        
        if (!config) {
            config = new ConfiguracaoGincana({
                gincana_id: GINCANA_ATUAL_ID,
                mostrar_notas_ranking: mostrar_notas_ranking || false
            });
        } else {
            if (mostrar_notas_ranking !== undefined) {
                config.mostrar_notas_ranking = mostrar_notas_ranking;
            }
            config.atualizado_em = new Date();
        }
        
        await config.save();
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({ message: 'Erro interno ao atualizar configuração.' });
    }
};


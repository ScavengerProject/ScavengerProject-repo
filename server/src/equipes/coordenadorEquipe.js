import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';

/**
 * Helpers de resolução de coordenadores de equipe.
 *
 * Regra de arquitetura: a fonte da verdade do CONJUNTO de coordenadores de uma
 * equipe é EquipeMembros.is_coordenador (vinculado ao Equipe._id mestre).
 * O campo legado EquipeGincana.coordenador_usuario_id é mantido apenas como
 * "coordenador principal" e está sempre contido nesse conjunto.
 *
 * Como múltiplos coordenadores agora têm os mesmos poderes, qualquer busca do
 * tipo `EquipeGincana.findOne({ coordenador_usuario_id })` deve passar por aqui.
 */

const toId = (valor) => (valor?._id ? valor._id : valor);

/**
 * Retorna as EquipeGincana que o usuário coordena (via is_coordenador, com
 * união do campo legado por segurança).
 * @param {string} usuarioId
 * @param {{ populateEquipe?: boolean }} [opcoes]
 * @returns {Promise<Array>} lista de documentos EquipeGincana
 */
export async function getEquipesGincanaDoCoordenador(usuarioId, opcoes = {}) {
    if (!usuarioId) return [];

    // 1. Equipes (mestre) onde o usuário é coordenador.
    const equipeIdsMestre = await EquipeMembros
        .find({ usuario_id: usuarioId, is_coordenador: true })
        .distinct('equipe_id');

    // 2. Mapeia para os registros de gincana, unindo o legado coordenador_usuario_id.
    const filtro = {
        $or: [
            { equipe_id: { $in: equipeIdsMestre } },
            { coordenador_usuario_id: usuarioId },
        ],
    };

    const query = EquipeGincana.find(filtro);
    if (opcoes.populateEquipe) {
        query.populate('equipe_id', 'nome cor');
    }

    return query.exec();
}

/**
 * Retorna a primeira EquipeGincana coordenada pelo usuário (a maioria dos fluxos
 * assume um único coordenador por usuário).
 * @param {string} usuarioId
 * @param {{ populateEquipe?: boolean }} [opcoes]
 * @returns {Promise<Object|null>}
 */
export async function getEquipeGincanaDoCoordenador(usuarioId, opcoes = {}) {
    const equipes = await getEquipesGincanaDoCoordenador(usuarioId, opcoes);
    return equipes[0] || null;
}

/**
 * Retorna os usuario_id (string) de todos os coordenadores de uma equipe.
 * Une o conjunto is_coordenador com o coordenador principal legado.
 * @param {string|Object} equipeOuGincana - Equipe._id mestre ou doc EquipeGincana
 * @returns {Promise<string[]>}
 */
export async function getCoordenadoresIdsDaEquipe(equipeOuGincana) {
    if (!equipeOuGincana) return [];

    let equipeIdMestre;
    let principalId = null;
    if (equipeOuGincana?.equipe_id !== undefined) {
        equipeIdMestre = toId(equipeOuGincana.equipe_id);
        principalId = toId(equipeOuGincana.coordenador_usuario_id);
    } else {
        equipeIdMestre = toId(equipeOuGincana);
    }

    const ids = await EquipeMembros
        .find({ equipe_id: equipeIdMestre, is_coordenador: true })
        .distinct('usuario_id');

    const conjunto = new Set(ids.map((id) => String(id)));
    if (principalId) conjunto.add(String(principalId));
    return Array.from(conjunto);
}

/**
 * Indica se o usuário é coordenador da equipe informada.
 * Aceita tanto o Equipe._id mestre quanto um documento EquipeGincana.
 * @param {string} usuarioId
 * @param {string|Object} equipeOuGincana - Equipe._id mestre ou doc EquipeGincana
 * @returns {Promise<boolean>}
 */
export async function isCoordenadorDaEquipe(usuarioId, equipeOuGincana) {
    if (!usuarioId || !equipeOuGincana) return false;

    // Resolve para o Equipe._id mestre (chave usada em EquipeMembros).
    let equipeIdMestre;
    if (equipeOuGincana?.equipe_id !== undefined) {
        // É um documento EquipeGincana.
        equipeIdMestre = toId(equipeOuGincana.equipe_id);
        // Compatibilidade: coordenador principal legado.
        if (String(toId(equipeOuGincana.coordenador_usuario_id)) === String(usuarioId)) {
            return true;
        }
    } else {
        equipeIdMestre = toId(equipeOuGincana);
    }

    const membro = await EquipeMembros.findOne({
        equipe_id: equipeIdMestre,
        usuario_id: usuarioId,
        is_coordenador: true,
    }).select('_id');

    return Boolean(membro);
}

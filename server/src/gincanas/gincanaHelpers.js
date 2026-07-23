import EquipeMembros from '../models/EquipeMembros.js';
import EquipeGincana from '../models/EquipeGincana.js';

/**
 * Resolve os gincana_id (String) das gincanas em que o usuário participa,
 * via o vínculo EquipeMembros -> EquipeGincana.
 *
 * O caminho é: equipes (mestre) do usuário -> registros EquipeGincana dessas
 * equipes -> gincana_id distintos. Segue o mesmo padrão dos helpers em
 * ../equipes/coordenadorEquipe.js.
 *
 * @param {string} usuarioId
 * @returns {Promise<string[]>} lista de gincana_id (String) distintos
 */
export async function getGincanaIdsDoUsuario(usuarioId) {
    if (!usuarioId) return [];

    // 1. Equipes (mestre) das quais o usuário é membro.
    const equipeIdsMestre = await EquipeMembros
        .find({ usuario_id: usuarioId })
        .distinct('equipe_id');

    if (equipeIdsMestre.length === 0) return [];

    // 2. gincana_id das participações dessas equipes.
    const gincanaIds = await EquipeGincana
        .find({ equipe_id: { $in: equipeIdsMestre } })
        .distinct('gincana_id');

    return gincanaIds.map((id) => String(id));
}

/**
 * Indica se o usuário participa da gincana informada.
 * @param {string} usuarioId
 * @param {string} gincanaId
 * @returns {Promise<boolean>}
 */
export async function usuarioParticipaDaGincana(usuarioId, gincanaId) {
    if (!usuarioId || !gincanaId) return false;
    const ids = await getGincanaIdsDoUsuario(usuarioId);
    return ids.includes(String(gincanaId));
}

import Usuario, { PERFIS_MULTI_ESCOLA, podeMultiEscola } from '../models/Usuario.js';

/**
 * Helpers do vínculo usuário <-> escola.
 *
 * Regra central do multi-escola: o papel do usuário é POR ESCOLA e vive em
 * `Usuario.vinculos[]`. O campo `Usuario.tipo` é apenas o papel base (marca o
 * SUPER_ADMIN e serve de padrão ao criar um vínculo novo) — nunca use ele para
 * decidir permissão dentro de uma escola.
 */

/**
 * Filtro Mongo para "usuários vinculados à escola X".
 * Substitui o antigo `{ escolas: escolaId }`.
 * @param {string} escolaId
 */
export const filtroEscola = (escolaId) => ({ 'vinculos.escola_id': String(escolaId) });

/**
 * Filtro Mongo para "usuários com o(s) papel(is) informado(s) NA escola X".
 * Usa $elemMatch para que escola e papel venham do MESMO vínculo — sem isso um
 * COORDENADOR da escola A apareceria como coordenador da escola B.
 * @param {string} escolaId
 * @param {string|string[]} tipos
 */
export const filtroEscolaComPerfil = (escolaId, tipos) => {
    const lista = Array.isArray(tipos) ? tipos : [tipos];
    return {
        vinculos: {
            $elemMatch: {
                escola_id: String(escolaId),
                tipo: lista.length === 1 ? lista[0] : { $in: lista },
            },
        },
    };
};

/**
 * Retorna o subdocumento de vínculo do usuário com a escola, ou null.
 * @param {object} usuario documento (ou objeto) de Usuario
 * @param {string} escolaId
 */
export function getVinculo(usuario, escolaId) {
    if (!usuario || !escolaId) return null;
    return (usuario.vinculos || []).find((v) => String(v.escola_id) === String(escolaId)) || null;
}

/**
 * Papel efetivo do usuário DENTRO de uma escola.
 * - SUPER_ADMIN é global: vale em qualquer escola, mesmo sem vínculo.
 * - Demais perfis: o `tipo` do vínculo, ou null se não pertence à escola.
 *
 * @returns {string|null}
 */
export function papelNaEscola(usuario, escolaId) {
    if (!usuario) return null;
    if (usuario.tipo === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    return getVinculo(usuario, escolaId)?.tipo || null;
}

/**
 * Resolve os escola_id (String) aos quais o usuário está vinculado.
 *
 * Diferente do vínculo de gincana (que é derivado de EquipeMembros), o vínculo
 * de escola é explícito: fica em `Usuario.vinculos`. Isso é o que permite um
 * professor atuar em mais de uma escola sem precisar estar em uma equipe de cada.
 *
 * @param {string} usuarioId
 * @returns {Promise<string[]>} lista de escola_id (String) distintos
 */
export async function getEscolaIdsDoUsuario(usuarioId) {
    if (!usuarioId) return [];

    const usuario = await Usuario.findById(usuarioId).select('vinculos');
    if (!usuario) return [];

    return (usuario.vinculos || []).map((v) => String(v.escola_id));
}

/**
 * Indica se o usuário está vinculado à escola informada.
 * @param {string} usuarioId
 * @param {string} escolaId
 * @returns {Promise<boolean>}
 */
export async function usuarioPertenceAEscola(usuarioId, escolaId) {
    if (!usuarioId || !escolaId) return false;
    const ids = await getEscolaIdsDoUsuario(usuarioId);
    return ids.includes(String(escolaId));
}

/**
 * Projeta um usuário "achatado" para a escola ativa: `tipo`, `turma` e `status`
 * passam a ser os do vínculo daquela escola.
 *
 * As telas continuam lendo `usuario.tipo`; é aqui que elas passam a receber o
 * papel certo do tenant em que estão, sem precisar conhecer `vinculos`.
 *
 * @param {object} usuario documento Mongoose ou objeto
 * @param {string} escolaId
 */
export function comVinculoDaEscola(usuario, escolaId) {
    if (!usuario) return usuario;
    const obj = typeof usuario.toObject === 'function' ? usuario.toObject() : { ...usuario };
    const vinculo = getVinculo(obj, escolaId);

    delete obj.senha;

    if (obj.tipo === 'SUPER_ADMIN') {
        // O papel global não é sobrescrito pelo vínculo.
        return { ...obj, escola_id: String(escolaId) };
    }

    return {
        ...obj,
        escola_id: String(escolaId),
        tipo: vinculo?.tipo || obj.tipo,
        turma: vinculo ? vinculo.turma : obj.turma,
        status: vinculo?.status || obj.status,
    };
}

/**
 * Verifica se dar ao usuário o papel `tipoAlvo` na escola `escolaId` violaria a
 * regra de escola única.
 *
 * Regra: perfis de participante (ALUNO, COORDENADOR, PROFESSOR, PAI/MÃE) vivem
 * em exatamente UMA escola; só os perfis de `PERFIS_MULTI_ESCOLA` (ADMIN) podem
 * acumular vínculos. A checagem é dos dois lados:
 *  - o papel novo é de escola única e a pessoa já está em outra escola;
 *  - a pessoa já tem, em outra escola, um papel de escola única.
 *
 * @param {object} usuario documento (ou objeto) de Usuario
 * @param {string} escolaId escola do vínculo que está sendo criado/alterado
 * @param {string} tipoAlvo papel pretendido nessa escola
 * @returns {string|null} mensagem de erro, ou null quando é permitido
 */
export function conflitoMultiEscola(usuario, escolaId, tipoAlvo) {
    // SUPER_ADMIN é global: não tem papel por escola e não entra na regra.
    if (!usuario || usuario.tipo === 'SUPER_ADMIN') return null;

    // PENDENTE é uma solicitação, não um acesso: ignorá-lo aqui é o que
    // permite o vínculo de destino de uma transferência (código de convite)
    // conviver com o vínculo ATIVO de origem até a aprovação.
    const outros = (usuario.vinculos || [])
        .filter((v) => String(v.escola_id) !== String(escolaId) && v.status !== 'PENDENTE');

    if (outros.length === 0) return null;

    if (!podeMultiEscola(tipoAlvo)) {
        return `O perfil ${tipoAlvo} pertence a uma única escola, e ${usuario.nome || 'este usuário'} já está vinculado a outra. `
            + `Remova o vínculo anterior ou use um perfil de ${PERFIS_MULTI_ESCOLA.join('/')}, que pode atuar em várias escolas.`;
    }

    const presoEmOutra = outros.find((v) => !podeMultiEscola(v.tipo));
    if (presoEmOutra) {
        return `${usuario.nome || 'Este usuário'} já é ${presoEmOutra.tipo} em outra escola, e esse perfil pertence a uma única escola. `
            + `Ajuste o vínculo existente antes de vinculá-lo aqui.`;
    }

    return null;
}

/**
 * Adiciona (ou atualiza) o vínculo do usuário com uma escola.
 *
 * O papel padrão é o papel base do usuário — é isso que faz um ADMIN continuar
 * ADMIN ao ser vinculado a uma escola nova, em vez de "virar aluno".
 *
 * @param {object} usuario documento Mongoose de Usuario (não é salvo aqui)
 * @param {string} escolaId
 * @param {{tipo?: string, turma?: string|null, status?: string, codigo_convite_id?: string|null}} [dados]
 * @returns {object} o vínculo resultante
 */
export function aplicarVinculo(usuario, escolaId, dados = {}) {
    const escola = String(escolaId);
    const existente = getVinculo(usuario, escola);

    // SUPER_ADMIN não tem papel de escola; o vínculo guarda o padrão ADMIN só
    // para o caso de ele ser rebaixado depois.
    const tipoBase = usuario.tipo === 'SUPER_ADMIN' ? 'ADMIN' : usuario.tipo;

    if (existente) {
        if (dados.tipo) existente.tipo = dados.tipo;
        if (dados.turma !== undefined) existente.turma = dados.turma;
        if (dados.status) existente.status = dados.status;
        if (dados.codigo_convite_id !== undefined) existente.codigo_convite_id = dados.codigo_convite_id;
        return existente;
    }

    const novo = {
        escola_id: escola,
        tipo: dados.tipo || tipoBase,
        turma: dados.turma !== undefined ? dados.turma : (usuario.turma ?? null),
        status: dados.status || usuario.status || 'ATIVO',
        codigo_convite_id: dados.codigo_convite_id ?? null,
    };

    usuario.vinculos.push(novo);
    return novo;
}

/**
 * Estágio $project de agregação que devolve `tipo` e `turma` do VÍNCULO com a
 * escola informada, e não os campos base do usuário.
 *
 * Sem isto, uma agregação que filtra "COORDENADOR nesta escola" acabaria
 * exibindo o papel base da pessoa (que pode ser outro, vindo de outra escola).
 *
 * @param {string} escolaId
 * @param {object} [extras] campos adicionais para incluir no $project
 */
export const projecaoUsuarioNaEscola = (escolaId, extras = {}) => {
    const doVinculo = (campo) => ({
        $ifNull: [
            {
                $first: {
                    $map: {
                        input: {
                            $filter: {
                                input: { $ifNull: ['$vinculos', []] },
                                as: 'v',
                                cond: { $eq: ['$$v.escola_id', String(escolaId)] },
                            },
                        },
                        as: 'v',
                        in: `$$v.${campo}`,
                    },
                },
            },
            `$${campo}`,
        ],
    });

    return {
        _id: 1,
        nome: 1,
        email: 1,
        tipo: doVinculo('tipo'),
        turma: doVinculo('turma'),
        ...extras,
    };
};

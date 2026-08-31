/**
 * Helpers de perfil de usuário.
 *
 * Multi-escola: o SUPER_ADMIN é o perfil global (só ele cadastra escolas) e tem
 * acesso a tudo que o ADMIN tem — o backend faz o mesmo em `autorizar()`
 * (server/src/auth/authPermissions.js). Estes helpers evitam que a comparação
 * `usuario.tipo === 'ADMIN'` espalhada pelas telas deixe o SUPER_ADMIN de fora.
 */

/** Perfil administrativo (ADMIN da escola ou SUPER_ADMIN global). */
export const ehAdmin = (usuario) =>
  usuario?.tipo === 'ADMIN' || usuario?.tipo === 'SUPER_ADMIN';

/** Apenas o perfil global, dono do cadastro de escolas. */
export const ehSuperAdmin = (usuario) => usuario?.tipo === 'SUPER_ADMIN';

/**
 * Equivalente de `autorizar(...tipos)` do backend: o SUPER_ADMIN passa sempre.
 * @param {object} usuario
 * @param {string|string[]} perfis
 */
export const temPerfil = (usuario, perfis) => {
  if (ehSuperAdmin(usuario)) return true;
  return Array.isArray(perfis)
    ? perfis.includes(usuario?.tipo)
    : usuario?.tipo === perfis;
};

/**
 * Perfis que podem atuar em MAIS DE UMA escola ao mesmo tempo. Espelha
 * `PERFIS_MULTI_ESCOLA` do backend (server/src/models/Usuario.js).
 *
 * Quem compete (ALUNO, COORDENADOR, PAI/MÃE) pertence a uma escola só: turma,
 * equipe, provas e resultados só fazem sentido dentro dela. Quem organiza
 * (ADMIN, PROFESSOR) pode acumular escolas — é o caso do professor que organiza
 * a gincana de mais de uma. O SUPER_ADMIN é global e enxerga todas.
 */
export const PERFIS_MULTI_ESCOLA = ['ADMIN', 'PROFESSOR'];

/** Indica se o perfil pode acumular vínculos com várias escolas. */
export const podeMultiEscola = (tipo) =>
  tipo === 'SUPER_ADMIN' || PERFIS_MULTI_ESCOLA.includes(tipo);

/** Perfis presos a uma única escola — os que participam da gincana. */
export const ehPerfilDeEscolaUnica = (tipo) => Boolean(tipo) && !podeMultiEscola(tipo);

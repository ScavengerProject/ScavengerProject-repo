import ProvaUsuario from '../models/ProvaUsuario.js';
import EquipeMembros from '../models/EquipeMembros.js';
import { getVinculo } from '../escolas/escolaHelpers.js';
import { getEquipesGincanaDoCoordenador } from '../equipes/coordenadorEquipe.js';

/**
 * Regra de elegibilidade de um usuário a uma prova, em um lugar só.
 *
 * Três caminhos precisam dela: a autoinscrição (`inscreverUsuarioNaProva`), a
 * inscrição em lote feita pelo coordenador (`inscreverMembrosDaEquipe`) e a
 * tela que lista quem "se encaixa" na prova. A lista TEM de responder
 * exatamente o mesmo que a inscrição — senão o coordenador seleciona alguém
 * que o servidor recusa, ou deixa de ver alguém que seria aceito.
 */

export const GRUPO_LABEL = {
  ALUNOS_FUNDAMENTAL: 'alunos do ensino fundamental',
  ALUNOS_MEDIO: 'alunos do ensino médio',
  PROFESSORES: 'professores',
  'PAI/MÃE': 'pais/mães',
};

/**
 * Determina o "grupo" (cota de prova) de um usuário NA ESCOLA ATIVA.
 *
 * `tipo`/`turma` são por escola (Usuario.vinculos[]) — quem entrou por convite
 * só tem a turma real no vínculo, nunca no campo legado `Usuario.turma`, que
 * fica null (ver `registrarUsuario`). Ler o campo de topo aqui deixava
 * "ano escolar indeterminável" para todo mundo que se cadastrou por convite.
 *
 * COORDENADOR conta na mesma cota de ano escolar (EF/EM) que ALUNO: não existe
 * cota própria de coordenador em `requisito_usuario`, e `alterarPapelUsuario`
 * já exige turma para COORDENADOR do mesmo jeito que exige para ALUNO — um
 * aluno promovido a coordenador continua sendo, para fins de cota, um aluno
 * daquele ano escolar.
 */
export const determinarGrupo = (usuario, escolaId) => {
  const vinculo = getVinculo(usuario, escolaId);
  const tipo = vinculo?.tipo || usuario.tipo;
  const turma = vinculo ? vinculo.turma : usuario.turma;

  if (tipo === 'ALUNO' || tipo === 'COORDENADOR') {
    if (turma?.startsWith('EF')) return 'ALUNOS_FUNDAMENTAL';
    if (turma?.startsWith('EM')) return 'ALUNOS_MEDIO';
    return null;
  }
  if (tipo === 'PROFESSOR') return 'PROFESSORES';
  if (tipo === 'PAI/MÃE') return 'PAI/MÃE';
  return null;
};

/** Limite de vagas de um grupo na prova (0 ou ausente => grupo não permitido). */
export const limiteDoGrupo = (prova, grupo) => {
  const cotas = (prova?.requisito_usuario && typeof prova.requisito_usuario === 'object')
    ? prova.requisito_usuario
    : {};
  const bruto = Number(cotas[grupo]);
  return Number.isFinite(bruto) ? bruto : 0;
};

/**
 * Conta os já inscritos na prova por grupo, resolvendo o grupo de cada um pelo
 * VÍNCULO com a escola ativa (não pelos campos legados de topo).
 * @returns {Promise<Object>} mapa grupo -> quantidade
 */
export const contarInscritosPorGrupo = async (provaId, escolaId) => {
  const inscritos = await ProvaUsuario.find({ prova_id: provaId })
    .populate('usuario_id', 'tipo turma vinculos');

  return inscritos.reduce((acc, item) => {
    const u = item.usuario_id;
    if (!u) return acc;
    const grupo = determinarGrupo(u, escolaId);
    if (!grupo) return acc;
    acc[grupo] = (acc[grupo] || 0) + 1;
    return acc;
  }, {});
};

/**
 * Avalia se um usuário pode ser inscrito numa prova.
 *
 * Puro de propósito (não consulta nada): quem chama já carregou a prova, o
 * usuário e as contagens, e assim a MESMA avaliação serve para decidir uma
 * inscrição e para montar a lista da tela sem N consultas por membro.
 *
 * @param {Object} params
 * @param {Object} params.prova
 * @param {Object} params.usuario documento de Usuario (com `vinculos`)
 * @param {string} params.escolaId
 * @param {boolean} params.temEquipe usuário pertence a alguma equipe
 * @param {boolean} params.jaInscrito já existe ProvaUsuario para o par
 * @param {Object} params.inscritosPorGrupo saída de contarInscritosPorGrupo
 * @returns {{ok: boolean, grupo: string|null, status?: number, code?: string, message?: string, detalhe?: string}}
 */
export const avaliarElegibilidade = ({
  prova,
  usuario,
  escolaId,
  temEquipe,
  jaInscrito = false,
  inscritosPorGrupo = {},
}) => {
  // Quem transferiu de escola mantém a linha antiga em EquipeMembros como
  // histórico (ver notificarTransferenciaEscola.js), então continuaria passando
  // pela checagem de equipe abaixo mesmo sem acesso a esta escola. Instalação
  // legada / usuário sem nenhum vínculo registrado não é filtrada — só quem JÁ
  // tem vinculos (ou seja, passou pela migração) pode ser barrado por não ter
  // mais um ATIVO nesta escola especificamente.
  const temVinculos = (usuario.vinculos || []).length > 0;
  if (usuario.tipo !== 'SUPER_ADMIN' && temVinculos) {
    const vinculo = getVinculo(usuario, escolaId);
    if (!vinculo || vinculo.status !== 'ATIVO') {
      return {
        ok: false,
        grupo: null,
        status: 403,
        code: 'SEM_VINCULO_ESCOLA',
        message: 'Este usuário não tem mais vínculo ativo com esta escola.',
      };
    }
  }

  if (!temEquipe) {
    return {
      ok: false,
      grupo: null,
      status: 422,
      code: 'SEM_EQUIPE',
      message: 'Você precisa se inscrever em uma equipe antes de se inscrever em uma prova.',
    };
  }

  const grupo = determinarGrupo(usuario, escolaId);
  if (!grupo) {
    return {
      ok: false,
      grupo: null,
      status: 422,
      code: 'GRUPO_INDETERMINADO',
      message: 'Não foi possível determinar seu ano escolar. Verifique se a sua turma está definida (obrigatória para alunos). Se o problema persistir, contate os organizadores da gincana.',
      detalhe: 'Tipo/turma do usuário não permite determinar grupo.',
    };
  }

  const limite = limiteDoGrupo(prova, grupo);
  if (limite <= 0) {
    return {
      ok: false,
      grupo,
      status: 422,
      code: 'GRUPO_NAO_PERMITIDO',
      message: `Participação não permitida para ${GRUPO_LABEL[grupo]} nesta prova.`,
    };
  }

  // Avaliado depois das cotas de propósito: na lista da tela, "já inscrito" é o
  // estado normal de metade da equipe, e o coordenador precisa distingui-lo de
  // uma recusa de verdade.
  if (jaInscrito) {
    return {
      ok: false,
      grupo,
      status: 409,
      code: 'JA_INSCRITO',
      message: 'Usuário já inscrito nesta prova.',
    };
  }

  const inscritos = inscritosPorGrupo[grupo] || 0;
  if (inscritos >= limite) {
    return {
      ok: false,
      grupo,
      status: 422,
      code: 'VAGAS_ESGOTADAS',
      message: `Quantidade máxima para ${GRUPO_LABEL[grupo]} preenchida.`,
      detalhe: `Limite: ${limite} | Inscritos: ${inscritos}`,
    };
  }

  return { ok: true, grupo };
};

/**
 * Resumo de vagas por grupo, para a tela mostrar o que resta ANTES de escolher.
 * Só devolve os grupos que a prova aceita (limite > 0).
 * @returns {Array<{grupo, label, limite, inscritos, restantes}>}
 */
export const resumirCotas = (prova, inscritosPorGrupo = {}) =>
  Object.keys(GRUPO_LABEL)
    .map((grupo) => {
      const limite = limiteDoGrupo(prova, grupo);
      const inscritos = inscritosPorGrupo[grupo] || 0;
      return {
        grupo,
        label: GRUPO_LABEL[grupo],
        limite,
        inscritos,
        restantes: Math.max(0, limite - inscritos),
      };
    })
    .filter((cota) => cota.limite > 0);

/**
 * IDs (string) das equipes MESTRAS que o usuário coordena e que participam da
 * gincana informada. Base da autorização "só a própria equipe".
 */
export const getEquipeIdsCoordenadas = async (coordenadorId, gincanaId) => {
  const participacoes = await getEquipesGincanaDoCoordenador(coordenadorId, { gincanaId });
  return participacoes
    .map((eg) => (eg.equipe_id?._id ? eg.equipe_id._id : eg.equipe_id))
    .filter(Boolean)
    .map((id) => String(id));
};

/**
 * O coordenador só pode agir sobre quem é membro de uma equipe que ELE coordena
 * nesta gincana.
 *
 * Sem isto, `inscreverUsuarioNaProva` aceitava qualquer `usuario_id` vindo de um
 * COORDENADOR: bastava a pessoa pertencer a alguma equipe, de qualquer time —
 * dava para inscrever gente de uma equipe adversária e queimar a cota do grupo.
 */
export const coordenaMembro = async (coordenadorId, usuarioId, gincanaId) => {
  if (String(coordenadorId) === String(usuarioId)) return true;

  const equipeIds = await getEquipeIdsCoordenadas(coordenadorId, gincanaId);
  if (equipeIds.length === 0) return false;

  const membro = await EquipeMembros.exists({
    equipe_id: { $in: equipeIds },
    usuario_id: usuarioId,
  });
  return Boolean(membro);
};

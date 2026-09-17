/**
 * Rótulos e formatação das cotas de participação de uma prova.
 *
 * `requisito_usuario` define quantas vagas cada grupo (ano escolar / perfil)
 * tem na prova; 0 ou ausente significa que o grupo NÃO participa. Essa regra
 * aparece em quatro telas — lista de provas, detalhes, minhas inscrições e a
 * escalação do coordenador — e antes não aparecia em nenhuma: o participante só
 * descobria que não se encaixava ao clicar em "Inscrever-se" e levar erro.
 *
 * Os textos ficam aqui, e não em cada tela, porque precisam bater com os do
 * servidor (`GRUPO_LABEL` em elegibilidadeProva.js) — é a mesma regra dita para
 * o mesmo usuário em momentos diferentes.
 */

// Curtos, para caber num badge de card.
export const GRUPO_LABEL = {
  ALUNOS_FUNDAMENTAL: 'Ensino fundamental',
  ALUNOS_MEDIO: 'Ensino médio',
  PROFESSORES: 'Professores',
  'PAI/MÃE': 'Pais/mães',
};

export const rotuloDoGrupo = (grupo) => GRUPO_LABEL[grupo] || grupo;

/**
 * Normaliza as cotas de uma prova para exibição.
 *
 * Aceita as duas formas em que elas chegam: o `cotas` já resumido pelo servidor
 * (com ocupação e vagas restantes) ou o `requisito_usuario` cru, para telas que
 * só têm a prova em mãos. Só devolve os grupos que a prova aceita.
 *
 * @returns {Array<{grupo, label, limite, inscritos?, restantes?}>}
 */
export const cotasDaProva = (prova) => {
  if (Array.isArray(prova?.cotas)) {
    return prova.cotas.map((cota) => ({ ...cota, label: rotuloDoGrupo(cota.grupo) }));
  }

  const requisitos = (prova?.requisito_usuario && typeof prova.requisito_usuario === 'object')
    ? prova.requisito_usuario
    : {};

  return Object.keys(GRUPO_LABEL)
    .map((grupo) => ({ grupo, label: rotuloDoGrupo(grupo), limite: Number(requisitos[grupo]) || 0 }))
    .filter((cota) => cota.limite > 0);
};

/** A prova aceita alguém? (nenhum grupo com vaga = prova fechada) */
export const provaTemCotas = (prova) => cotasDaProva(prova).length > 0;

/**
 * Texto curto de uma cota: "Ensino fundamental: 2 de 5 vagas" quando o servidor
 * mandou a ocupação, ou "Ensino fundamental: 5 vagas" quando só há o limite.
 */
export const textoDaCota = (cota) => {
  if (typeof cota.restantes === 'number') {
    return cota.restantes > 0
      ? `${cota.label}: ${cota.restantes} de ${cota.limite} vaga(s)`
      : `${cota.label}: sem vagas`;
  }
  return `${cota.label}: ${cota.limite} vaga(s)`;
};

// Motivos de recusa, na voz de quem está olhando a própria inscrição.
const MOTIVO_LABEL = {
  JA_INSCRITO: 'Você já está inscrito',
  GRUPO_NAO_PERMITIDO: 'Sua turma não participa desta prova',
  GRUPO_INDETERMINADO: 'Sua turma não está definida — fale com os organizadores',
  VAGAS_ESGOTADAS: 'As vagas da sua turma já foram preenchidas',
  SEM_EQUIPE: 'Entre em uma equipe para poder se inscrever',
  SEM_VINCULO_ESCOLA: 'Você não tem vínculo ativo com esta escola',
};

/**
 * Por que ESTE usuário não pode se inscrever, em uma frase.
 * @param {{ok: boolean, code: string|null, message: string|null}|null} elegibilidade
 * @returns {string|null} null quando pode se inscrever (ou não há informação)
 */
export const motivoDaRecusa = (elegibilidade) => {
  if (!elegibilidade || elegibilidade.ok) return null;
  return MOTIVO_LABEL[elegibilidade.code] || elegibilidade.message || 'Você não pode se inscrever nesta prova';
};

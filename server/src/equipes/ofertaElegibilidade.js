import SolicitacaoEmprestimo from '../models/SolicitacaoEmprestimo.js';
import OfertaEmprestimo from '../models/OfertaEmprestimo.js';
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import EquipeMembros from '../models/EquipeMembros.js';
import ProvaUsuario from '../models/ProvaUsuario.js';
import Prova from '../models/Prova.js';
import Usuario from '../models/Usuario.js';
import { getVinculo, turmaNaEscola, usuarioDaEscola } from '../escolas/escolaHelpers.js';
import { getEquipeGincanaDoCoordenador } from './coordenadorEquipe.js';
import {
  GRUPO_LABEL,
  determinarGrupo,
  limiteDoGrupo,
  contarInscritosPorGrupo,
  resumirCotas,
} from '../provas/elegibilidadeProva.js';

/**
 * Quem, da MINHA equipe, pode ser ofertado para uma solicitação de empréstimo.
 *
 * Mesma regra de arquitetura de `elegibilidadeProva.js`: a lista que a tela
 * mostra e a validação de `criarOferta` saem daqui, da mesma função. Se
 * divergirem, o coordenador seleciona alguém que o servidor recusa — ou, pior,
 * oferta quem já não pode jogar e só descobre quando o empréstimo falha calado
 * (o índice único `uniq_emprestimo_usuario_prova_ativo` derruba o `create` em
 * `aceitarOferta`, cujo catch apenas loga).
 *
 * Os membros recusados NÃO são omitidos: vêm com `ofertavel: false` e o motivo,
 * porque "por que fulano não aparece na lista" é exatamente a pergunta que a
 * tela precisa responder.
 */

/** Motivos fixos de recusa. Os que dependem do contexto são montados abaixo. */
export const MOTIVO_OFERTA = {
  SEM_VINCULO_ESCOLA: 'Não tem mais vínculo ativo com esta escola.',
  JA_INSCRITO_NA_PROVA: 'Já está inscrito nesta prova pela sua equipe.',
  JA_EMPRESTADO: 'Já está emprestado para outra equipe nesta prova.',
  JA_OFERTADO: 'Já faz parte de uma oferta sua ainda pendente para esta prova.',
  GRUPO_INDETERMINADO: 'Sem turma definida — não dá para saber em qual cota da prova entraria.',
};

/**
 * Projeta a turma dos membros oferecidos no VÍNCULO com a escola ativa.
 *
 * `Usuario.turma` de topo é legado e fica null para quem se cadastrou por
 * convite (a turma real mora em `vinculos[].turma`) — sem isto as telas de
 * oferta mostravam "Sem turma" para a equipe inteira. Vale para toda resposta
 * que popula `membros_oferecidos.usuario_id`, aqui e em solicitações.
 *
 * @param {Object|Array} ofertaOuLista oferta(s) com `membros_oferecidos` populado
 * @param {string} escolaId
 */
export const comTurmaDaEscola = (ofertaOuLista, escolaId) => {
  const achatar = (oferta) => {
    if (!oferta) return oferta;
    const obj = typeof oferta.toObject === 'function' ? oferta.toObject() : { ...oferta };
    obj.membros_oferecidos = (obj.membros_oferecidos || []).map((membro) => {
      const usuario = membro.usuario_id;
      if (!usuario || !usuario.vinculos) return membro;
      return { ...membro, usuario_id: usuarioDaEscola(usuario, escolaId) };
    });
    return obj;
  };

  return Array.isArray(ofertaOuLista) ? ofertaOuLista.map(achatar) : achatar(ofertaOuLista);
};

const recusa = (codigo, mensagem) => ({ ofertavel: false, motivo_codigo: codigo, motivo: mensagem });

/**
 * Vagas que a solicitação ainda tem em aberto: o que foi pedido menos os
 * empréstimos ATIVOS que a equipe solicitante já recebeu nesta prova (de
 * qualquer equipe — ofertas aceitas de outros times também preenchem o pedido).
 */
const contarVagasRestantes = async (solicitacao) => {
  const jaAtendidos = await EmprestimoEquipe.countDocuments({
    prova_id: solicitacao.prova_id,
    equipe_destino_id: solicitacao.equipe_solicitante_id,
    status: 'ATIVO',
  });
  return Math.max(0, (solicitacao.quantidade_solicitada || 0) - jaAtendidos);
};

/**
 * Carrega os membros da equipe do coordenador com o veredito de cada um para
 * uma solicitação.
 *
 * @param {Object} params
 * @param {string} params.coordenadorId
 * @param {string} params.solicitacaoId
 * @param {string} params.escolaId escola ativa (papel/turma saem do vínculo com ela)
 * @param {string} params.gincanaId gincana ativa
 * @returns {Promise<Object>} `{ erro }` ou o contexto completo da oferta
 */
export const carregarMembrosOfertaveis = async ({ coordenadorId, solicitacaoId, escolaId, gincanaId }) => {
  const solicitacao = await SolicitacaoEmprestimo.findById(solicitacaoId);
  if (!solicitacao) {
    return { erro: { status: 404, message: 'Solicitação não encontrada.' } };
  }

  if (!['APROVADA', 'EM_ANDAMENTO'].includes(solicitacao.status)) {
    return {
      erro: {
        status: 409,
        code: 'SOLICITACAO_INDISPONIVEL',
        message: 'Solicitação não está disponível para ofertas.',
      },
    };
  }

  const prova = await Prova.findById(solicitacao.prova_id)
    .select('_id titulo data_inicio data_fim requisito_usuario gincana_id');
  if (!prova) {
    return { erro: { status: 404, message: 'Prova da solicitação não encontrada.' } };
  }

  // Restrito à gincana da solicitação: um coordenador com equipe em OUTRA
  // edição não coordena nada aqui.
  const minhaEquipe = await getEquipeGincanaDoCoordenador(coordenadorId, {
    populateEquipe: true,
    gincanaId: solicitacao.gincana_id || gincanaId,
  });
  if (!minhaEquipe) {
    return { erro: { status: 404, message: 'Você não é coordenador de nenhuma equipe.' } };
  }

  if (String(solicitacao.equipe_solicitante_id) === String(minhaEquipe._id)) {
    return {
      erro: {
        status: 409,
        code: 'SOLICITACAO_PROPRIA',
        message: 'Você não pode ofertar membros para sua própria solicitação.',
      },
    };
  }

  const equipeId = minhaEquipe.equipe_id?._id || minhaEquipe.equipe_id;
  const registros = await EquipeMembros.find({ equipe_id: equipeId }).select('usuario_id is_coordenador');
  const membroIds = registros.map((r) => r.usuario_id);
  const coordenadores = new Set(
    registros.filter((r) => r.is_coordenador).map((r) => String(r.usuario_id))
  );

  const [usuarios, idsJaInscritos, idsEmprestados, ofertasPendentes, inscritosPorGrupo, vagasRestantes] =
    await Promise.all([
      Usuario.find({ _id: { $in: membroIds } }).select('nome email tipo turma status vinculos'),
      ProvaUsuario.find({ prova_id: prova._id, usuario_id: { $in: membroIds } }).distinct('usuario_id'),
      EmprestimoEquipe.find({ prova_id: prova._id, status: 'ATIVO', usuario_id: { $in: membroIds } })
        .distinct('usuario_id'),
      // Ofertas minhas ainda pendentes: o membro já está "reservado". O filtro
      // é pela PROVA, e não pela solicitação, porque duas equipes podem pedir
      // reforço para a mesma prova e a pessoa só pode ser emprestada uma vez.
      OfertaEmprestimo.find({ equipe_ofertante_id: minhaEquipe._id, status: 'PENDENTE' })
        .populate({ path: 'solicitacao_id', select: 'prova_id' }),
      contarInscritosPorGrupo(prova._id, escolaId),
      contarVagasRestantes(solicitacao),
    ]);

  const jaInscritos = new Set(idsJaInscritos.map(String));
  const jaEmprestados = new Set(idsEmprestados.map(String));
  const jaOfertados = new Set(
    ofertasPendentes
      .filter((oferta) => String(oferta.solicitacao_id?.prova_id) === String(prova._id))
      .flatMap((oferta) => (oferta.membros_oferecidos || []).map((m) => String(m.usuario_id)))
  );

  const niveisExigidos = solicitacao.criterios?.niveis_escolares || [];

  const membros = usuarios.map((usuario) => {
    const vinculo = getVinculo(usuario, escolaId);
    const turma = turmaNaEscola(usuario, escolaId);
    const grupo = determinarGrupo(usuario, escolaId);
    const id = String(usuario._id);

    const veredito = (() => {
      // Instalação legada (usuário sem nenhum vínculo) não é filtrada: só quem
      // já passou pela migração tem vínculo para checar.
      if ((usuario.vinculos || []).length > 0 && vinculo?.status !== 'ATIVO') {
        return recusa('SEM_VINCULO_ESCOLA', MOTIVO_OFERTA.SEM_VINCULO_ESCOLA);
      }
      if (jaInscritos.has(id)) {
        return recusa('JA_INSCRITO_NA_PROVA', MOTIVO_OFERTA.JA_INSCRITO_NA_PROVA);
      }
      if (jaEmprestados.has(id)) {
        return recusa('JA_EMPRESTADO', MOTIVO_OFERTA.JA_EMPRESTADO);
      }
      if (jaOfertados.has(id)) {
        return recusa('JA_OFERTADO', MOTIVO_OFERTA.JA_OFERTADO);
      }
      if (!grupo) {
        return recusa('GRUPO_INDETERMINADO', MOTIVO_OFERTA.GRUPO_INDETERMINADO);
      }
      if (limiteDoGrupo(prova, grupo) <= 0) {
        return recusa('GRUPO_NAO_PERMITIDO', `Esta prova não aceita ${GRUPO_LABEL[grupo]}.`);
      }
      // Critério de quem pediu o reforço: mandar alguém fora dele é gastar a
      // decisão do outro coordenador com uma oferta que ele vai recusar.
      // Gênero não é avaliado — o cadastro não guarda esse dado.
      if (niveisExigidos.length > 0 && !niveisExigidos.includes(turma)) {
        return recusa('FORA_DOS_CRITERIOS', `A equipe pediu reforço de ${niveisExigidos.join(', ')}.`);
      }
      return { ofertavel: true, motivo_codigo: null, motivo: null };
    })();

    return {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      // Papel/turma do VÍNCULO com a escola ativa: `Usuario.turma` de topo é
      // legado e fica null para quem entrou por convite.
      tipo: vinculo?.tipo || usuario.tipo,
      turma,
      grupo,
      is_coordenador: coordenadores.has(id),
      ...veredito,
    };
  });

  // Ofertáveis primeiro (é neles que o coordenador vai clicar), depois os
  // recusados — cada bloco em ordem alfabética.
  membros.sort((a, b) =>
    Number(b.ofertavel) - Number(a.ofertavel) || a.nome.localeCompare(b.nome, 'pt-BR')
  );

  return {
    solicitacao,
    prova,
    minhaEquipe,
    membros,
    vagas_restantes: vagasRestantes,
    criterios: {
      niveis_escolares: niveisExigidos,
      genero: solicitacao.criterios?.genero || 'QUALQUER',
    },
    cotas: resumirCotas(prova, inscritosPorGrupo),
  };
};

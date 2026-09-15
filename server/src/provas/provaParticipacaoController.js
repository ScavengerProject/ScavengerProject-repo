import Prova from '../models/Prova.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import ProvaUsuario from '../models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../models/ProvaEquipeParticipacao.js';
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import Usuario, { vinculoBloqueado } from '../models/Usuario.js';
import { getEquipeGincanaDoCoordenador } from '../equipes/coordenadorEquipe.js';
import { getVinculo, statusNaEscola } from '../escolas/escolaHelpers.js';
import {
  avaliarElegibilidade,
  contarInscritosPorGrupo,
  resumirCotas,
  getEquipeIdsCoordenadas,
} from './elegibilidadeProva.js';

// Escopo da gincana ativa (injetado por resolverGincana; fallback p/ gincana legada).
const escopoGincana = (req) => req.gincanaId || 'GINCANA_PRINCIPAL';

// Uma prova está "encerrada" (e portanto não recebe mais empréstimos) quando já passou da data_fim.
const provaJaEncerrou = (prova) => {
  if (!prova?.data_fim) return false;
  return new Date() > new Date(prova.data_fim);
};

const toUniqueStrings = (arr) => Array.from(new Set((arr || []).map((item) => String(item))));

async function carregarContextoCoordenadorParaProva(coordenadorId, provaId, escolaId) {
  const prova = await Prova.findById(provaId).select('_id titulo status data_inicio data_fim proibir_membros_consecutivos gincana_id');

  if (!prova) {
    return { erro: { status: 404, message: 'Prova não encontrada.' } };
  }

  // Qualquer coordenador (is_coordenador) da equipe pode atuar — não só o
  // principal. Restrito à gincana da prova: sem isso, um coordenador com
  // equipe em OUTRA edição passaria como se coordenasse uma equipe aqui.
  const equipeGincana = await getEquipeGincanaDoCoordenador(coordenadorId, {
    populateEquipe: true,
    gincanaId: prova.gincana_id,
  });

  if (!equipeGincana) {
    return { erro: { status: 403, message: 'Você não coordena nenhuma equipe.' } };
  }

  const equipeId = equipeGincana.equipe_id?._id || equipeGincana.equipe_id;
  if (!equipeId) {
    return { erro: { status: 404, message: 'Equipe do coordenador não encontrada.' } };
  }

  // Empréstimos vigentes desta prova ligados a ESTA equipe (origem/destino usam IDs de EquipeGincana).
  // Só têm efeito enquanto a prova não terminou — depois disso o aluno volta a contar apenas pela equipe de origem.
  let emprestadosParaDentro = [];
  let idsEmprestadosParaFora = new Set();

  if (!provaJaEncerrou(prova)) {
    const [entrada, saida] = await Promise.all([
      // Alunos emprestados PARA esta equipe nesta prova
      EmprestimoEquipe.find({ prova_id: provaId, equipe_destino_id: equipeGincana._id, status: 'ATIVO' })
        .populate('usuario_id', 'nome email tipo turma status vinculos')
        .populate({ path: 'equipe_origem_id', populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' } }),
      // Alunos desta equipe emprestados PARA FORA nesta prova (não devem ser escaláveis por ela aqui)
      EmprestimoEquipe.find({ prova_id: provaId, equipe_origem_id: equipeGincana._id, status: 'ATIVO' }).select('usuario_id'),
    ]);
    emprestadosParaDentro = entrada;
    idsEmprestadosParaFora = new Set(saida.map((e) => String(e.usuario_id)));
  }

  const membroIdsBrutos = (await EquipeMembros.find({ equipe_id: equipeId }).distinct('usuario_id'))
    .filter((id) => !idsEmprestadosParaFora.has(String(id)));

  // Exclui quem já não tem vínculo ATIVO com esta escola: numa transferência a
  // linha em EquipeMembros fica de propósito como histórico (ver
  // notificarTransferenciaEscola.js), mas isso não deve deixar um ex-membro
  // escalável para uma prova nova depois que ele já foi embora. Instalação
  // legada / usuário sem nenhum vínculo registrado não é filtrada (só quem já
  // passou pela migração tem `vinculos` para checar).
  const usuariosDosMembros = await Usuario.find({ _id: { $in: membroIdsBrutos } }).select('vinculos');
  const membroIdsDaEquipe = usuariosDosMembros
    .filter((u) => (u.vinculos || []).length === 0 || getVinculo(u, escolaId)?.status === 'ATIVO')
    .map((u) => String(u._id));
  const membroIdsComCoordenador = toUniqueStrings([
    ...membroIdsDaEquipe,
    coordenadorId,
  ]);

  const inscricoes = await ProvaUsuario.find({
    prova_id: provaId,
    usuario_id: { $in: membroIdsComCoordenador },
  }).populate('usuario_id', 'nome email tipo turma status vinculos');

  const membrosInscritos = inscricoes
    .filter((inscricao) => inscricao.usuario_id)
    .map((inscricao) => ({
      id: inscricao.usuario_id._id,
      nome: inscricao.usuario_id.nome,
      email: inscricao.usuario_id.email,
      tipo: inscricao.usuario_id.tipo,
      turma: inscricao.usuario_id.turma,
      // Status do VÍNCULO com esta escola (ver statusNaEscola): desativar
      // alguém na escola A não pode aparecer como desativado na escola B.
      status: statusNaEscola(inscricao.usuario_id, escolaId),
      inscricao_id: inscricao._id,
      emprestado: false,
      equipe_origem_nome: null,
    }));

  // Anexa os alunos emprestados para esta equipe (o empréstimo é o "passe" de participação nesta prova).
  const idsJaIncluidos = new Set(membrosInscritos.map((m) => String(m.id)));
  for (const emp of emprestadosParaDentro) {
    const u = emp.usuario_id;
    if (!u || idsJaIncluidos.has(String(u._id))) continue;
    idsJaIncluidos.add(String(u._id));
    membrosInscritos.push({
      id: u._id,
      nome: u.nome,
      email: u.email,
      tipo: u.tipo,
      turma: u.turma,
      status: statusNaEscola(u, escolaId),
      inscricao_id: null,
      emprestado: true,
      equipe_origem_nome: emp.equipe_origem_id?.equipe_id?.nome || null,
    });
  }

  return {
    prova,
    equipeGincana,
    equipeId,
    membrosInscritos,
  };
}

async function buscarMemblosBloqueadosDaProvaAnterior(provaAtual, equipeId) {
  if (!provaAtual.data_inicio) return { bloqueados: [], provaTitulo: null };

  // Busca a prova imediatamente anterior (maior data_inicio que seja < data_inicio da prova atual),
  // restrita à mesma gincana — senão uma prova de outra edição/escola pode ser
  // escolhida no lugar da anterior de verdade.
  const provaAnterior = await Prova.findOne({
    _id: { $ne: provaAtual._id },
    gincana_id: provaAtual.gincana_id,
    data_inicio: { $lt: provaAtual.data_inicio },
    proibir_membros_consecutivos: true,
  })
    .sort({ data_inicio: -1, criado_em: -1 })
    .select('_id titulo proibir_membros_consecutivos');

  if (!provaAnterior) return { bloqueados: [], provaTitulo: null };

  const participacaoAnterior = await ProvaEquipeParticipacao.findOne({
    prova_id: provaAnterior._id,
    equipe_id: equipeId,
  }).select('titulares_usuario_ids suplentes_usuario_ids');

  if (!participacaoAnterior) return { bloqueados: [], provaTitulo: provaAnterior.titulo };

  const bloqueados = toUniqueStrings([
    ...(participacaoAnterior.titulares_usuario_ids || []),
    ...(participacaoAnterior.suplentes_usuario_ids || []),
  ]);

  return { bloqueados, provaTitulo: provaAnterior.titulo };
}

export const listarEquipeParticipanteDaProva = async (req, res) => {
  try {
    const { id: provaId } = req.params;
    const coordenadorId = req.usuario.id;

    const contexto = await carregarContextoCoordenadorParaProva(coordenadorId, provaId, req.escolaId);
    if (contexto.erro) {
      return res.status(contexto.erro.status).json({ message: contexto.erro.message });
    }

    const { prova, equipeGincana, equipeId, membrosInscritos } = contexto;

    const participacao = await ProvaEquipeParticipacao.findOne({
      prova_id: provaId,
      equipe_id: equipeId,
    })
      .select('titulares_usuario_ids suplentes_usuario_ids updatedAt definido_por_usuario_id')
      .populate('definido_por_usuario_id', 'nome');

    const titularesIds = toUniqueStrings(participacao?.titulares_usuario_ids || []);
    const suplentesIds = toUniqueStrings(participacao?.suplentes_usuario_ids || []);

    // Log: quem definiu por último os titulares/suplentes desta equipe nesta prova.
    // Serve para avisar quando OUTRO coordenador da mesma equipe já fez a definição.
    const definidoPor = participacao?.definido_por_usuario_id
      ? {
          id: participacao.definido_por_usuario_id._id,
          nome: participacao.definido_por_usuario_id.nome,
        }
      : null;
    const definidoPorOutro = Boolean(
      definidoPor && String(definidoPor.id) !== String(coordenadorId)
    );

    const { bloqueados, provaTitulo } = await buscarMemblosBloqueadosDaProvaAnterior(prova, equipeId);

    const membros = membrosInscritos.map((membro) => {
      const id = String(membro.id);
      const grupo = titularesIds.includes(id)
        ? 'TITULAR'
        : suplentesIds.includes(id)
          ? 'SUPLENTE'
          : 'NAO_DEFINIDO';

      return {
        ...membro,
        grupo,
      };
    });

    return res.status(200).json({
      prova,
      equipe: {
        id: equipeId,
        nome: equipeGincana.equipe_id?.nome || 'Equipe',
        cor: equipeGincana.equipe_id?.cor || null,
      },
      titulares_usuario_ids: titularesIds,
      suplentes_usuario_ids: suplentesIds,
      total_inscritos: membros.length,
      membros_inscritos: membros,
      membros_bloqueados_ids: bloqueados,
      prova_anterior_titulo: provaTitulo,
      atualizado_em: participacao?.updatedAt || null,
      definido_por: definidoPor,
      definido_por_outro: definidoPorOutro,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar membros inscritos da equipe nesta prova.',
      error: error.message,
    });
  }
};

export const salvarEquipeParticipanteDaProva = async (req, res) => {
  try {
    const { id: provaId } = req.params;
    const coordenadorId = req.usuario.id;
    const titulares = req.body?.titulares_usuario_ids;
    const suplentes = req.body?.suplentes_usuario_ids;

    if (!Array.isArray(titulares) || !Array.isArray(suplentes)) {
      return res.status(400).json({
        message: 'titulares_usuario_ids e suplentes_usuario_ids devem ser listas.',
      });
    }

    const titularesIds = toUniqueStrings(titulares);
    const suplentesIds = toUniqueStrings(suplentes);

    if (titularesIds.length === 0) {
      return res.status(400).json({
        message: 'Selecione ao menos um membro como titular.',
      });
    }

    const conflito = titularesIds.find((id) => suplentesIds.includes(id));
    if (conflito) {
      return res.status(400).json({
        message: 'Um mesmo membro não pode ser titular e suplente ao mesmo tempo.',
      });
    }

    const contexto = await carregarContextoCoordenadorParaProva(coordenadorId, provaId, req.escolaId);
    if (contexto.erro) {
      return res.status(contexto.erro.status).json({ message: contexto.erro.message });
    }

    const { prova, equipeId, membrosInscritos } = contexto;
    const idsPermitidos = new Set(membrosInscritos.map((membro) => String(membro.id)));
    const idsEnviados = [...titularesIds, ...suplentesIds];

    const idInvalido = idsEnviados.find((id) => !idsPermitidos.has(id));
    if (idInvalido) {
      return res.status(422).json({
        message: 'Há membros informados que não pertencem à sua equipe inscrita nesta prova.',
      });
    }

    // Rede de segurança: quem não tem vínculo ATIVO com a escola não é
    // escalável. Na prática o próprio `membrosInscritos` já filtra por isso
    // (ver carregarContextoCoordenadorParaProva), mas o coordenador entra na
    // lista sem passar por aquele filtro — e usuários de instalação legada, sem
    // nenhum vínculo, caem no status base.
    const membrosBloqueados = membrosInscritos.filter(
      (m) => idsEnviados.includes(String(m.id)) && vinculoBloqueado(m.status)
    );
    if (membrosBloqueados.length > 0) {
      const rotulo = { INATIVO: 'desativado', BANIDO: 'banido' };
      const nomes = membrosBloqueados
        .map((m) => `${m.nome} (${rotulo[m.status] || m.status})`)
        .join(', ');
      return res.status(400).json({
        message: `Os seguintes membros não podem participar pois não têm acesso ativo à escola: ${nomes}.`,
      });
    }

    // Validação: membros bloqueados pela prova anterior
    const { bloqueados, provaTitulo } = await buscarMemblosBloqueadosDaProvaAnterior(prova, equipeId);
    if (bloqueados.length > 0) {
      const membrosBloqueados = membrosInscritos.filter(
        (m) => idsEnviados.includes(String(m.id)) && bloqueados.includes(String(m.id))
      );
      if (membrosBloqueados.length > 0) {
        const nomes = membrosBloqueados.map((m) => m.nome).join(', ');
        return res.status(400).json({
          message: `Os seguintes membros participaram da prova anterior "${provaTitulo}" e não podem participar desta: ${nomes}.`,
        });
      }
    }

    const registro = await ProvaEquipeParticipacao.findOneAndUpdate(
      { prova_id: provaId, equipe_id: equipeId },
      {
        prova_id: provaId,
        equipe_id: equipeId,
        gincana_id: prova.gincana_id,
        titulares_usuario_ids: titularesIds,
        suplentes_usuario_ids: suplentesIds,
        definido_por_usuario_id: coordenadorId,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: 'Titulares e suplentes definidos com sucesso.',
      participacao: {
        id: registro._id,
        prova_id: registro.prova_id,
        equipe_id: registro.equipe_id,
        titulares_usuario_ids: registro.titulares_usuario_ids,
        suplentes_usuario_ids: registro.suplentes_usuario_ids,
        definido_por_usuario_id: registro.definido_por_usuario_id,
        atualizado_em: registro.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao salvar titulares e suplentes da prova.',
      error: error.message,
    });
  }
};

// [GET] /api/provas/associacoes/alunos  (ADMIN)
// Lista, por prova, as equipes e seus titulares/suplentes, marcando alunos emprestados.
export const listarAssociacoesProvas = async (req, res) => {
  try {
    const gincanaId = escopoGincana(req);
    const [provas, participacoes, equipesGincana, emprestimos] = await Promise.all([
      Prova.find({ gincana_id: gincanaId }).select('titulo data_inicio data_fim status').sort({ data_inicio: -1 }),
      ProvaEquipeParticipacao.find({ gincana_id: gincanaId })
        .populate('equipe_id', 'nome cor')
        .populate('titulares_usuario_ids', 'nome email tipo turma status')
        .populate('suplentes_usuario_ids', 'nome email tipo turma status'),
      EquipeGincana.find({ gincana_id: gincanaId }).select('_id equipe_id'),
      EmprestimoEquipe.find({ status: 'ATIVO', gincana_id: gincanaId })
        .select('usuario_id prova_id equipe_destino_id')
        .populate({ path: 'equipe_origem_id', populate: { path: 'equipe_id', model: 'Equipe', select: 'nome' } }),
    ]);

    // Equipe._id (usado na participação) -> EquipeGincana._id (usado no empréstimo)
    const equipeToGincana = new Map();
    equipesGincana.forEach((eg) => {
      if (eg.equipe_id) equipeToGincana.set(String(eg.equipe_id), String(eg._id));
    });

    // Índice de emprestados: chave `${provaId}:${equipeGincanaDestino}` -> Map(usuarioId -> nome da equipe de origem)
    const emprestadosPorProvaEquipe = new Map();
    emprestimos.forEach((emp) => {
      const chave = `${String(emp.prova_id)}:${String(emp.equipe_destino_id)}`;
      if (!emprestadosPorProvaEquipe.has(chave)) emprestadosPorProvaEquipe.set(chave, new Map());
      emprestadosPorProvaEquipe
        .get(chave)
        .set(String(emp.usuario_id), emp.equipe_origem_id?.equipe_id?.nome || null);
    });

    // Participações agrupadas por prova
    const participacoesPorProva = new Map();
    participacoes.forEach((p) => {
      const pid = String(p.prova_id);
      if (!participacoesPorProva.has(pid)) participacoesPorProva.set(pid, []);
      participacoesPorProva.get(pid).push(p);
    });

    const mapearMembro = (u, emprestadosMap) => {
      if (!u) return null;
      const emprestado = emprestadosMap ? emprestadosMap.has(String(u._id)) : false;
      return {
        id: u._id,
        nome: u.nome,
        email: u.email,
        tipo: u.tipo,
        turma: u.turma,
        status: u.status,
        emprestado,
        equipe_origem_nome: emprestado ? emprestadosMap.get(String(u._id)) : null,
      };
    };

    const resultado = provas.map((prova) => {
      const lista = participacoesPorProva.get(String(prova._id)) || [];
      const equipes = lista.map((p) => {
        const egId = p.equipe_id ? equipeToGincana.get(String(p.equipe_id._id)) : null;
        const emprestadosMap = egId
          ? emprestadosPorProvaEquipe.get(`${String(prova._id)}:${egId}`)
          : null;

        const titulares = (p.titulares_usuario_ids || []).map((u) => mapearMembro(u, emprestadosMap)).filter(Boolean);
        const suplentes = (p.suplentes_usuario_ids || []).map((u) => mapearMembro(u, emprestadosMap)).filter(Boolean);

        return {
          equipe_id: p.equipe_id?._id || null,
          equipe_nome: p.equipe_id?.nome || 'Equipe',
          equipe_cor: p.equipe_id?.cor || null,
          titulares,
          suplentes,
          total: titulares.length + suplentes.length,
        };
      });

      const contarEmprestados = (e) =>
        e.titulares.filter((m) => m.emprestado).length + e.suplentes.filter((m) => m.emprestado).length;

      return {
        prova: {
          _id: prova._id,
          titulo: prova.titulo,
          data_inicio: prova.data_inicio,
          data_fim: prova.data_fim,
          status: prova.status,
        },
        equipes,
        total_alunos: equipes.reduce((acc, e) => acc + e.total, 0),
        total_emprestados: equipes.reduce((acc, e) => acc + contarEmprestados(e), 0),
      };
    });

    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar associações de alunos às provas.',
      error: error.message,
    });
  }
};

/**
 * Carrega os membros da equipe que o coordenador comanda nesta prova, já com o
 * veredito de elegibilidade de cada um.
 *
 * Diferente de `carregarContextoCoordenadorParaProva`, que só enxerga quem JÁ
 * está inscrito (ela serve para escalar titulares/suplentes), aqui o objetivo é
 * o oposto: mostrar quem ainda PODE ser inscrito — e, para quem não pode, por
 * quê. Esconder os inelegíveis sem explicação faz a tela parecer quebrada
 * ("cadê meus alunos?"); é por isso que a lista devolve todo mundo.
 */
async function carregarMembrosParaInscricao(coordenadorId, provaId, escolaId) {
  const prova = await Prova.findById(provaId)
    .select('_id titulo status data_inicio data_fim requisito_usuario gincana_id');

  if (!prova) {
    return { erro: { status: 404, message: 'Prova não encontrada.' } };
  }

  // Restrito à gincana da prova: um coordenador com equipe em OUTRA edição não
  // coordena nada aqui.
  const equipeGincana = await getEquipeGincanaDoCoordenador(coordenadorId, {
    populateEquipe: true,
    gincanaId: prova.gincana_id,
  });

  if (!equipeGincana) {
    return { erro: { status: 403, message: 'Você não coordena nenhuma equipe nesta gincana.' } };
  }

  const equipeId = equipeGincana.equipe_id?._id || equipeGincana.equipe_id;
  if (!equipeId) {
    return { erro: { status: 404, message: 'Equipe do coordenador não encontrada.' } };
  }

  const membroIds = (await EquipeMembros.find({ equipe_id: equipeId }).distinct('usuario_id'))
    // O próprio coordenador fica de fora: ele se inscreve pelo botão normal
    // "Inscrever-se", e o modal já mostra o estado dele em separado.
    .filter((id) => String(id) !== String(coordenadorId));

  const [usuarios, idsJaInscritos, inscritosPorGrupo] = await Promise.all([
    Usuario.find({ _id: { $in: membroIds } }).select('nome email tipo turma status vinculos'),
    ProvaUsuario.find({ prova_id: provaId, usuario_id: { $in: membroIds } }).distinct('usuario_id'),
    contarInscritosPorGrupo(provaId, escolaId),
  ]);

  const jaInscritos = new Set(idsJaInscritos.map((id) => String(id)));

  // Mesmo filtro de `carregarContextoCoordenadorParaProva`: numa transferência a
  // linha em EquipeMembros fica como histórico, e um ex-membro não deve voltar a
  // ser escalável. Instalação legada (sem nenhum vínculo) não é filtrada.
  const membrosDaEscola = usuarios.filter(
    (u) => (u.vinculos || []).length === 0 || getVinculo(u, escolaId)?.status === 'ATIVO'
  );

  const membros = membrosDaEscola.map((usuario) => {
    const veredito = avaliarElegibilidade({
      prova,
      usuario,
      escolaId,
      temEquipe: true,
      jaInscrito: jaInscritos.has(String(usuario._id)),
      inscritosPorGrupo,
    });

    return {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      turma: getVinculo(usuario, escolaId)?.turma || usuario.turma || null,
      status: statusNaEscola(usuario, escolaId),
      grupo: veredito.grupo,
      elegivel: veredito.ok,
      motivo_codigo: veredito.ok ? null : veredito.code,
      motivo: veredito.ok ? null : veredito.message,
    };
  });

  // Elegíveis primeiro (é neles que o coordenador vai clicar), depois os já
  // inscritos, e por último os recusados — cada bloco em ordem alfabética.
  const peso = (m) => (m.elegivel ? 0 : m.motivo_codigo === 'JA_INSCRITO' ? 1 : 2);
  membros.sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, 'pt-BR'));

  return { prova, equipeGincana, equipeId, membros, inscritosPorGrupo };
}

/**
 * [GET] /api/provas/:id/inscricao/membros-equipe  (COORDENADOR)
 * Membros da equipe do coordenador, com elegibilidade e vagas restantes.
 */
export const listarMembrosDaEquipeParaProva = async (req, res) => {
  try {
    const { id: provaId } = req.params;
    const contexto = await carregarMembrosParaInscricao(req.usuario.id, provaId, req.escolaId);
    if (contexto.erro) {
      return res.status(contexto.erro.status).json({ message: contexto.erro.message });
    }

    const { prova, equipeGincana, equipeId, membros, inscritosPorGrupo } = contexto;

    return res.status(200).json({
      prova: { id: prova._id, titulo: prova.titulo, status: prova.status },
      equipe: {
        id: equipeId,
        nome: equipeGincana.equipe_id?.nome || 'Equipe',
        cor: equipeGincana.equipe_id?.cor || null,
      },
      cotas: resumirCotas(prova, inscritosPorGrupo),
      membros,
      total_elegiveis: membros.filter((m) => m.elegivel).length,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar membros da equipe para esta prova.',
      error: error.message,
    });
  }
};

// Teto por requisição: o lote existe para inscrever uma equipe, não para varrer
// a escola. Mantém o loop sequencial abaixo com custo previsível.
const MAX_INSCRICOES_POR_LOTE = 50;

/**
 * [POST] /api/provas/:id/inscricoes/equipe  (COORDENADOR)
 * Inscreve vários membros da própria equipe de uma vez.
 *
 * Em lote e SEQUENCIAL de propósito: N chamadas paralelas à inscrição avulsa
 * leriam a contagem da cota antes de qualquer inserção, todas passariam, e a
 * prova acabaria com mais inscritos do que o limite do grupo. Aqui a contagem é
 * incrementada a cada inserção, então a cota fecha no lugar certo e os demais
 * voltam como falha explicada.
 */
export const inscreverMembrosDaEquipe = async (req, res) => {
  try {
    const { id: provaId } = req.params;
    const coordenadorId = req.usuario.id;
    const enviados = req.body?.usuario_ids;

    if (!Array.isArray(enviados) || enviados.length === 0) {
      return res.status(400).json({ message: 'Informe ao menos um membro para inscrever.' });
    }
    if (enviados.length > MAX_INSCRICOES_POR_LOTE) {
      return res.status(400).json({
        message: `Máximo de ${MAX_INSCRICOES_POR_LOTE} membros por vez.`,
      });
    }

    const idsPedidos = toUniqueStrings(enviados);

    const contexto = await carregarMembrosParaInscricao(coordenadorId, provaId, req.escolaId);
    if (contexto.erro) {
      return res.status(contexto.erro.status).json({ message: contexto.erro.message });
    }

    const { prova, membros, inscritosPorGrupo } = contexto;

    // Autorização: só membros da equipe que ele coordena. `membros` já nasce
    // restrito a ela, então qualquer id de fora simplesmente não está aqui.
    const porId = new Map(membros.map((m) => [String(m.id), m]));
    const forasteiro = idsPedidos.find((id) => !porId.has(id));
    if (forasteiro) {
      return res.status(403).json({
        ok: false,
        code: 'NAO_AUTORIZADO',
        message: 'Você só pode inscrever membros da equipe que coordena.',
      });
    }

    // Cópia mutável: cada inserção consome uma vaga do grupo para as seguintes.
    const contagem = { ...inscritosPorGrupo };
    const inscritos = [];
    const falhas = [];

    for (const id of idsPedidos) {
      const membro = porId.get(id);
      const usuario = await Usuario.findById(id).select('nome tipo turma vinculos');
      if (!usuario) {
        falhas.push({ id, nome: membro.nome, code: 'USUARIO_NAO_ENCONTRADO', message: 'Usuário não encontrado.' });
        continue;
      }

      const jaInscrito = Boolean(await ProvaUsuario.exists({ prova_id: prova._id, usuario_id: id }));
      const veredito = avaliarElegibilidade({
        prova,
        usuario,
        escolaId: req.escolaId,
        temEquipe: true,
        jaInscrito,
        inscritosPorGrupo: contagem,
      });

      if (!veredito.ok) {
        falhas.push({ id, nome: usuario.nome, code: veredito.code, message: veredito.message });
        continue;
      }

      try {
        await ProvaUsuario.create({ prova_id: prova._id, usuario_id: id, gincana_id: prova.gincana_id });
        contagem[veredito.grupo] = (contagem[veredito.grupo] || 0) + 1;
        inscritos.push({ id, nome: usuario.nome });
      } catch (error) {
        // Corrida com outra inscrição da mesma pessoa (o índice único do par
        // prova/usuário é quem decide).
        if (error?.code === 11000) {
          falhas.push({ id, nome: usuario.nome, code: 'JA_INSCRITO', message: 'Usuário já inscrito nesta prova.' });
          continue;
        }
        throw error;
      }
    }

    const corpo = {
      ok: inscritos.length > 0,
      inscritos,
      falhas,
      message: inscritos.length > 0
        ? `${inscritos.length} membro(s) inscrito(s) com sucesso.`
        : 'Nenhum membro pôde ser inscrito.',
      // `erros` é o canal que o request() central do front já reexpõe como
      // error.erros — sem ele, o 422 abaixo chegaria na tela como uma frase
      // genérica, sem dizer quem foi recusado e por quê.
      erros: falhas.map((f) => `${f.nome}: ${f.message}`),
    };

    // Sem nenhum sucesso a resposta é um erro de verdade — assim o tratamento
    // padrão do front (catch + toast) funciona sem caso especial.
    return res.status(inscritos.length > 0 ? 201 : 422).json(corpo);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao inscrever membros da equipe na prova.',
      error: error.message,
    });
  }
};

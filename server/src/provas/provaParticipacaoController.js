import Prova from '../models/Prova.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import ProvaUsuario from '../models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../models/ProvaEquipeParticipacao.js';
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import Usuario from '../models/Usuario.js';
import { getEquipeGincanaDoCoordenador } from '../equipes/coordenadorEquipe.js';

// Uma prova está "encerrada" (e portanto não recebe mais empréstimos) quando já passou da data_fim.
const provaJaEncerrou = (prova) => {
  if (!prova?.data_fim) return false;
  return new Date() > new Date(prova.data_fim);
};

const toUniqueStrings = (arr) => Array.from(new Set((arr || []).map((item) => String(item))));

async function carregarContextoCoordenadorParaProva(coordenadorId, provaId) {
  const [prova, equipeGincana] = await Promise.all([
    Prova.findById(provaId).select('_id titulo status data_inicio data_fim proibir_membros_consecutivos'),
    // Qualquer coordenador (is_coordenador) da equipe pode atuar — não só o principal.
    getEquipeGincanaDoCoordenador(coordenadorId, { populateEquipe: true }),
  ]);

  if (!prova) {
    return { erro: { status: 404, message: 'Prova não encontrada.' } };
  }

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
        .populate('usuario_id', 'nome email tipo turma status')
        .populate({ path: 'equipe_origem_id', populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' } }),
      // Alunos desta equipe emprestados PARA FORA nesta prova (não devem ser escaláveis por ela aqui)
      EmprestimoEquipe.find({ prova_id: provaId, equipe_origem_id: equipeGincana._id, status: 'ATIVO' }).select('usuario_id'),
    ]);
    emprestadosParaDentro = entrada;
    idsEmprestadosParaFora = new Set(saida.map((e) => String(e.usuario_id)));
  }

  const membroIdsDaEquipe = (await EquipeMembros.find({ equipe_id: equipeId }).distinct('usuario_id'))
    .filter((id) => !idsEmprestadosParaFora.has(String(id)));
  const membroIdsComCoordenador = toUniqueStrings([
    ...membroIdsDaEquipe,
    coordenadorId,
  ]);

  const inscricoes = await ProvaUsuario.find({
    prova_id: provaId,
    usuario_id: { $in: membroIdsComCoordenador },
  }).populate('usuario_id', 'nome email tipo turma status');

  const membrosInscritos = inscricoes
    .filter((inscricao) => inscricao.usuario_id)
    .map((inscricao) => ({
      id: inscricao.usuario_id._id,
      nome: inscricao.usuario_id.nome,
      email: inscricao.usuario_id.email,
      tipo: inscricao.usuario_id.tipo,
      turma: inscricao.usuario_id.turma,
      status: inscricao.usuario_id.status,
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
      status: u.status,
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

  // Busca a prova imediatamente anterior (maior data_inicio que seja < data_inicio da prova atual)
  const provaAnterior = await Prova.findOne({
    _id: { $ne: provaAtual._id },
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

    const contexto = await carregarContextoCoordenadorParaProva(coordenadorId, provaId);
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

    const contexto = await carregarContextoCoordenadorParaProva(coordenadorId, provaId);
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

    // Validação: membros BANIDO ou SUSPENSO não podem participar
    const membrosBanidosSuspensos = membrosInscritos.filter(
      (m) => idsEnviados.includes(String(m.id)) && (m.status === 'BANIDO' || m.status === 'SUSPENSO')
    );
    if (membrosBanidosSuspensos.length > 0) {
      const nomes = membrosBanidosSuspensos.map((m) => `${m.nome} (${m.status})`).join(', ');
      return res.status(400).json({
        message: `Os seguintes membros não podem participar pois estão banidos ou suspensos: ${nomes}.`,
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
    const [provas, participacoes, equipesGincana, emprestimos] = await Promise.all([
      Prova.find().select('titulo data_inicio data_fim status').sort({ data_inicio: -1 }),
      ProvaEquipeParticipacao.find()
        .populate('equipe_id', 'nome cor')
        .populate('titulares_usuario_ids', 'nome email tipo turma status')
        .populate('suplentes_usuario_ids', 'nome email tipo turma status'),
      EquipeGincana.find().select('_id equipe_id'),
      EmprestimoEquipe.find({ status: 'ATIVO' })
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

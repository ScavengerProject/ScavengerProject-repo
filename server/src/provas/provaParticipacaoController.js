import Prova from '../models/Prova.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import ProvaUsuario from '../models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../models/ProvaEquipeParticipacao.js';

const toUniqueStrings = (arr) => Array.from(new Set((arr || []).map((item) => String(item))));

async function carregarContextoCoordenadorParaProva(coordenadorId, provaId) {
  const [prova, equipeGincana] = await Promise.all([
    Prova.findById(provaId).select('_id titulo status data_inicio data_fim'),
    EquipeGincana.findOne({ coordenador_usuario_id: coordenadorId }).populate('equipe_id', 'nome cor'),
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

  const membroIdsDaEquipe = await EquipeMembros.find({ equipe_id: equipeId }).distinct('usuario_id');
  const membroIdsComCoordenador = toUniqueStrings([
    ...membroIdsDaEquipe,
    coordenadorId,
  ]);

  const inscricoes = await ProvaUsuario.find({
    prova_id: provaId,
    usuario_id: { $in: membroIdsComCoordenador },
  }).populate('usuario_id', 'nome email tipo turma');

  const membrosInscritos = inscricoes
    .filter((inscricao) => inscricao.usuario_id)
    .map((inscricao) => ({
      id: inscricao.usuario_id._id,
      nome: inscricao.usuario_id.nome,
      email: inscricao.usuario_id.email,
      tipo: inscricao.usuario_id.tipo,
      turma: inscricao.usuario_id.turma,
      inscricao_id: inscricao._id,
    }));

  return {
    prova,
    equipeGincana,
    equipeId,
    membrosInscritos,
  };
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
    }).select('titulares_usuario_ids suplentes_usuario_ids updatedAt criado_por_usuario_id');

    const titularesIds = toUniqueStrings(participacao?.titulares_usuario_ids || []);
    const suplentesIds = toUniqueStrings(participacao?.suplentes_usuario_ids || []);

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
      atualizado_em: participacao?.updatedAt || null,
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

    const { equipeId, membrosInscritos } = contexto;
    const idsPermitidos = new Set(membrosInscritos.map((membro) => String(membro.id)));
    const idsEnviados = [...titularesIds, ...suplentesIds];

    const idInvalido = idsEnviados.find((id) => !idsPermitidos.has(id));
    if (idInvalido) {
      return res.status(422).json({
        message: 'Há membros informados que não pertencem à sua equipe inscrita nesta prova.',
      });
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

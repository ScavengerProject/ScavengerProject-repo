import Penalidade from "../models/Penalidade.js";           
import EquipeGincana from "../models/EquipeGincana.js";
import Usuario from "../models/Usuario.js";  
import EquipeMembros from "../models/EquipeMembros.js";


/**
 * 🆕 Função auxiliar para logar todos os dados recebidos ou preenchidos até o momento
 */
const logFormData = (req, extra = {}, participanteSelecionado = null) => {
  const data = {
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
    participanteSelecionado,
    ...extra,
  };
  console.log("📌 Dados atuais do form / request:", JSON.stringify(data, null, 2));
};

/**
 * [POST] Cria uma penalidade e atualiza pontos na EquipeGincana.
 * Body esperado: { nome?, equipeId, participanteId?, pontos, descricao }
 * Observação: equipeId pode ser o _id de EquipeGincana (recomendado) ou o _id da Equipe mestre.
 */
/**
 * [POST] Cria uma penalidade e atualiza pontos na EquipeGincana.
 * Body esperado: { nome?, equipeId, participanteId?, pontos, descricao }
 */
export const criarPenalidade = async (req, res) => {
  try {
    const { nome, equipeId, participanteId, pontos, descricao } = req.body;

    if (!equipeId || !pontos) {
      return res.status(400).json({ message: "Equipe e pontos são obrigatórios." });
    }

    // Buscar a equipe da gincana
    const equipeGincana = await EquipeGincana.findById(equipeId);
    if (!equipeGincana) {
      return res.status(404).json({ message: "EquipeGincana não encontrada." });
    }

    // Subtrair os pontos da equipe
    const pontosAntes = equipeGincana.pontos_acumulados || 0;
    const pontosRemover = Number(pontos);
    equipeGincana.pontos_acumulados = Math.max(0, pontosAntes - pontosRemover); // não deixar negativo
    await equipeGincana.save();

    // Criar penalidade
    const penalidade = await Penalidade.create({
      nome,
      equipe_gincana_id: equipeId,
      participante_id: participanteId || null,
      pontos: pontosRemover,
      descricao,
      criado_em: new Date(),
    });

    // Log completo
    logFormData(req, {
      pontosAntes,
      pontosRemover,
      pontosDepois: equipeGincana.pontos_acumulados,
      penalidadeCriada: penalidade._id.toString(),
    });

    return res.status(201).json({
      message: "Penalidade criada e pontos atualizados com sucesso!",
      penalidade,
      pontosEquipe: equipeGincana.pontos_acumulados,
    });
  } catch (err) {
    console.error("Erro criarPenalidade:", err);
    return res.status(500).json({ message: "Erro interno ao criar penalidade." });
  }
};

/**
 * [GET] Lista todas as penalidades
 */
export const listarPenalidades = async (req, res) => {
  try {
    const penalidades = await Penalidade.find()
      .populate({ path: "equipe_gincana_id", populate: { path: "equipe_id", select: "nome cor" } })
      .populate("participante_id", "nome email tipo")
      .sort({ criado_em: -1 });

    // 🆕 log de dados atuais
    logFormData(req, { totalPenalidades: penalidades.length });

    return res.status(200).json(penalidades);
  } catch (err) {
    console.error("Erro listarPenalidades:", err);
    return res.status(500).json({ message: "Erro interno ao listar penalidades." });
  }
};

/**
 * GET /api/penalidades/equipes
 */
export const listarEquipesParaPenalidade = async (req, res) => {
  try {
    const equipes = await EquipeGincana.find().populate("equipe_id", "nome cor").sort({ "equipe_id.nome": 1 });

    const formatadas = equipes.map((eg) => {
      const nome = eg.equipe_id?.nome || eg.nome || `Equipe ${eg._id.toString().slice(-6)}`;
      const cor = eg.equipe_id?.cor || eg.cor || "#cccccc";
      return {
        id: eg._id.toString(),
        nome,
        cor,
        pontos_acumulados: eg.pontos_acumulados || 0,
      };
    });

    logFormData(req, { totalEquipes: formatadas.length });

    return res.status(200).json(formatadas);
  } catch (err) {
    console.error("Erro listarEquipesParaPenalidade:", err);
    return res.status(500).json({ message: "Erro ao listar equipes para penalidade.", error: err.message });
  }
};

/**
 * [GET] Lista todos os membros da equipe
 */
export const listarMembrosDaEquipe = async (req, res) => {
  try {
    const { equipeId } = req.params;
    if (!equipeId) {
      return res.status(400).json({ message: "ID da equipe (EquipeGincana) é obrigatório." });
    }

    console.log(`🔍 Buscando membros da equipe (EquipeGincana): ${equipeId}`);

    const equipeGincana = await EquipeGincana.findById(equipeId).populate("equipe_id");
    if (!equipeGincana) return res.status(404).json({ message: "EquipeGincana não encontrada." });

    const equipeBaseId = equipeGincana.equipe_id?._id;
    if (!equipeBaseId) return res.status(404).json({ message: "Equipe base não encontrada." });

    const membros = await EquipeMembros.find({ equipe_id: equipeBaseId }).populate("usuario_id");

    const resultado = membros.map((m) => ({
      id: m.usuario_id?._id?.toString(),
      nome: m.usuario_id?.nome || "Sem nome",
      email: m.usuario_id?.email || "",
      tipo: m.usuario_id?.tipo || "",
      turma: m.usuario_id?.turma || "",
    }));

    logFormData(req, { membrosCarregados: resultado.length });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("❌ Erro ao listar membros da equipe:", error);
    return res.status(500).json({ message: "Erro interno ao buscar membros da equipe." });
  }
};

/**
 * [GET] Retorna os dados de um participante pelo ID
 * Query esperado: ?participanteId=xxxx
 */
export const buscarParticipante = async (req, res) => {
  try {
    const { participanteId } = req.query;
    if (!participanteId) {
      return res.status(400).json({ message: "ID do participante é obrigatório." });
    }

    const usuario = await Usuario.findById(participanteId);
    if (!usuario) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    const resultado = {
      id: usuario._id.toString(),
      nome: usuario.nome || "Sem nome",
      email: usuario.email || "",
      tipo: usuario.tipo || "",
      turma: usuario.turma || "",
    };

    //console.log("Participante selecionado:", resultado);
    logFormData(req, {}, resultado);

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("Erro buscarParticipante:", err);
    return res.status(500).json({ message: "Erro interno ao buscar participante." });
  }
};

/**
 * [GET] Retorna os pontos disponíveis de uma equipe
 * Query esperado: ?equipeId=xxxx
 */
export const buscarPontosEquipe = async (req, res) => {
  try {
    const { equipeId } = req.query;

    if (!equipeId) {
      return res.status(400).json({ message: "ID da equipe é obrigatório." });
    }

    const equipe = await EquipeGincana.findById(equipeId);
    if (!equipe) {
      return res.status(404).json({ message: "Equipe não encontrada." });
    }

    const pontos = equipe.pontos_acumulados || 0;

    // Log para garantir que está capturando os pontos
    logFormData(req, { pontosEquipe: pontos });

    return res.status(200).json({ equipeId, pontos });
  } catch (err) {
    console.error("Erro buscarPontosEquipe:", err);
    return res.status(500).json({ message: "Erro interno ao buscar pontos da equipe." });
  }
};

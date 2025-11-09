import Penalidade from "../models/Penalidade.js";           
import EquipeGincana from "../models/EquipeGincana.js";
import Usuario from "../models/Usuario.js";  
import EquipeMembros from "../models/EquipeMembros.js";

/**
 * [POST] Cria uma penalidade e atualiza pontos na EquipeGincana.
 * Body esperado: { nome?, equipeId, participanteId?, pontos, descricao }
 * Observação: equipeId pode ser o _id de EquipeGincana (recomendado) ou o _id da Equipe mestre.
 */
export const criarPenalidade = async (req, res) => {
};

/**
 * [GET] Lista todas as penalidades (populate para leitura)
 */
export const listarPenalidades = async (req, res) => {
  try {
    const penalidades = await Penalidade.find()
      .populate({ path: "equipe_gincana_id", populate: { path: "equipe_id", select: "nome cor" } })
      .populate("participante_id", "nome email tipo")
      .sort({ criado_em: -1 });

    return res.status(200).json(penalidades);
  } catch (err) {
    console.error("Erro listarPenalidades:", err);
    return res.status(500).json({ message: "Erro interno ao listar penalidades." });
  }
};


/**
 * GET /api/penalidades/equipes
 * Retorna array [{ id, nome, cor, pontos_acumulados }]
 */
export const listarEquipesParaPenalidade = async (req, res) => {
  try {
    const equipes = await EquipeGincana.find().populate("equipe_id", "nome cor").sort({ "equipe_id.nome": 1 });

    const formatadas = equipes.map((eg) => {
      // tenta achar nome a partir de eg.equipe_id.nome, ou algum campo direto eg.nome (caso tenha sido armazenado diferente)
      const nome = eg.equipe_id?.nome || eg.nome || `Equipe ${eg._id.toString().slice(-6)}`;
      const cor = eg.equipe_id?.cor || eg.cor || "#cccccc";
      return {
        id: eg._id.toString(),            // id do documento EquipeGincana — esse é o que o modal deve enviar
        nome,
        cor,
        pontos_acumulados: eg.pontos_acumulados || 0,
      };
    });

    return res.status(200).json(formatadas);
  } catch (err) {
    console.error("Erro listarEquipesParaPenalidade:", err);
    return res.status(500).json({ message: "Erro ao listar equipes para penalidade.", error: err.message });
  }
};

/**
 * [GET] Retorna todos os membros (usuários) de uma equipe (via EquipeGincana → Equipe → Usuarios)
 */
export const listarMembrosDaEquipe = async (req, res) => {
  try {
    const { equipeId } = req.params;

    if (!equipeId) {
      return res.status(400).json({ message: "ID da equipe (EquipeGincana) é obrigatório." });
    }

    console.log(`🔍 Buscando membros da equipe (EquipeGincana): ${equipeId}`);

    // 1️⃣ Buscar registro na collection EquipeGincana
    const equipeGincana = await EquipeGincana.findById(equipeId).populate("equipe_id");
    if (!equipeGincana) {
      return res.status(404).json({ message: "EquipeGincana não encontrada." });
    }

    // 2️⃣ Obter o id da equipe 'mestre' (collection Equipe)
    const equipeBaseId = equipeGincana.equipe_id?._id;
    if (!equipeBaseId) {
      return res.status(404).json({ message: "Equipe base (equipe_id) não encontrada na EquipeGincana." });
    }

    // 3️⃣ Buscar membros dessa equipe (collection EquipeMembros)
    const membros = await EquipeMembros.find({ equipe_id: equipeBaseId }).populate("usuario_id");

    if (!membros.length) {
      console.log("⚠️ Nenhum membro encontrado para equipe:", equipeBaseId);
      return res.status(200).json([]);
    }

    // 4️⃣ Formatar resposta para o front
    const resultado = membros.map((m) => ({
      id: m.usuario_id?._id?.toString(),
      nome: m.usuario_id?.nome || "Sem nome",
      email: m.usuario_id?.email || "",
      tipo: m.usuario_id?.tipo || "",
      turma: m.usuario_id?.turma || "",
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error("❌ Erro ao listar membros da equipe:", error);
    res.status(500).json({ message: "Erro interno ao buscar membros da equipe." });
  }
};

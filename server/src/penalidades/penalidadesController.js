import Penalidade from "../models/Penalidade.js";           
import EquipeGincana from "../models/EquipeGincana.js";   
import EquipeMembro from "../models/EquipeMembros.js";   
import Usuario from "../models/Usuario.js";  
import EquipeMembros from "../models/EquipeMembros.js";

/**
 * [POST] Cria uma penalidade e atualiza pontos na EquipeGincana.
 * Body esperado: { nome?, equipeId, participanteId?, pontos, descricao }
 * Observação: equipeId pode ser o _id de EquipeGincana (recomendado) ou o _id da Equipe mestre.
 */
export const criarPenalidade = async (req, res) => {
  try {
    const { nome, equipeId, participanteId, pontos = 1, descricao = "" } = req.body;

    if (!equipeId) return res.status(400).json({ message: "Equipe (equipeId) é obrigatória." });

    // 1) Tentar localizar o registro EquipeGincana:
    //    - primeiro tenta por _id (caso frontend envie o id de EquipeGincana)
    //    - se não achar, tenta procurar por equipe_id = equipeId (se frontend enviou id da equipe mestre)
    let equipeGincana = await EquipeGincana.findById(equipeId);
    if (!equipeGincana) {
      equipeGincana = await EquipeGincana.findOne({ equipe_id: equipeId });
    }
    if (!equipeGincana) {
      return res.status(404).json({ message: "Equipe (contexto gincana) não encontrada." });
    }

    // 2) Se houver participanteId, validar que ele pertence a essa EquipeGincana
    if (participanteId) {
      const pertence = await EquipeMembros.findOne({
        equipe_id: equipeGincana._id, // referência à EquipeGincana
        usuario_id: participanteId,
      });

      if (!pertence) {
        return res.status(400).json({ message: "O participante informado não pertence a essa equipe." });
      }
    }

    // 3) Gerar nome automático se não veio
    const gerarNome = () => {
      const d = new Date();
      const rnd = Math.floor(1000 + Math.random() * 9000);
      return `PEN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${rnd}`;
    };
    const nomePenalidade = nome || gerarNome();

    // 4) Criar registro na collection Penalidades (armazenamos equipe_id como referencia à equipe mestre para consulta fácil)
    const novaPenalidade = await Penalidade.create({
      penalidade_id: undefined, // se seu model tem pre('save') para gerar penalidade_id, deixe undefined
      nome: nomePenalidade,
      equipe_id: equipeGincana.equipe_id || equipeGincana._id, // armazena o id da equipe mestre para facilitar leitura (opcional)
      equipe_gincana_id: equipeGincana._id, // **guardar referência ao registro de EquipeGincana**
      participante_id: participanteId || null,
      pontos_removidos: Number(pontos) || 1,
      descricao,
    });

    // 5) Atualizar pontos no EquipeGincana
    equipeGincana.pontos_acumulados = Math.max(0, (equipeGincana.pontos_acumulados || 0) - Number(pontos));
    await equipeGincana.save();

    // 6) Opcional: atualizar pontos do usuário (se você guarda pontos em Usuario)
    if (participanteId) {
      try {
        const usuario = await Usuario.findById(participanteId);
        if (usuario && typeof usuario.pontos === "number") {
          usuario.pontos = Math.max(0, (usuario.pontos || 0) - Number(pontos));
          await usuario.save();
        }
      } catch (err) {
        console.warn("Não foi possível atualizar pontos do usuário:", err.message);
        // Não falhar todo o processo por causa disso
      }
    }

    return res.status(201).json({
      message: "Penalidade criada e pontos atualizados.",
      penalidade: novaPenalidade,
    });
  } catch (err) {
    console.error("Erro criarPenalidade:", err);
    return res.status(500).json({ message: "Erro interno ao criar penalidade." });
  }
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

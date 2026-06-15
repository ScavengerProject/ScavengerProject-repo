import Penalidade from "../models/Penalidade.js";           
import EquipeGincana from "../models/EquipeGincana.js";
import Usuario from "../models/Usuario.js";  
import EquipeMembros from "../models/EquipeMembros.js";
import { criarNotificacao } from "../notificacoes/notificacaoController.js";
import { getEquipesGincanaDoCoordenador, isCoordenadorDaEquipe } from "../equipes/coordenadorEquipe.js";

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
};

/**
 * [POST] Cria uma penalidade, desconta pontos e notifica TODA a equipe.
 */
export const criarPenalidade = async (req, res) => {
  try {
    const { equipeId, participanteId, pontos, descricao } = req.body;
    const usuarioAtual = req.usuario;

    // ---  VALIDAÇÕES BÁSICAS ---
    if (!equipeId) return res.status(400).json({ message: "ID da equipe é obrigatório." });

    const pontosNumber = parseInt(pontos, 10);
    if (isNaN(pontosNumber) || pontosNumber <= 0)
      return res.status(400).json({ message: "Pontos inválidos." });

    if (!descricao || descricao.trim() === "") {
      return res.status(400).json({ message: "Descrição é obrigatória." });
    }

    // ---  BUSCAR DADOS DA EQUIPE ---
    const equipeGincana = await EquipeGincana.findById(equipeId)
        .populate('equipe_id', 'nome coordenador_usuario_id'); // Pega nome e coord da equipe base
    
    if (!equipeGincana) return res.status(404).json({ message: "EquipeGincana não encontrada." });

    // Identificar ID do Coordenador (pode estar na Gincana ou na Equipe Base)
    const idCoordenador = equipeGincana.coordenador_usuario_id || equipeGincana.equipe_id?.coordenador_usuario_id;

    // Se quem está aplicando for COORDENADOR, verifica se ele coordena esta equipe
    // (qualquer coordenador da equipe pode penalizar — poderes iguais).
    if (usuarioAtual.tipo === 'COORDENADOR') {
        const podePenalizar = await isCoordenadorDaEquipe(usuarioAtual.id, equipeGincana);
        if (!podePenalizar) {
            return res.status(403).json({ message: "Você não tem permissão para penalizar esta equipe." });
        }
    }

    // ---  APLICAR PENALIDADE (Descontar Pontos) ---
    const pontosAtuais = equipeGincana.pontos_acumulados || 0;
    const pontosAtualizados = Math.max(0, pontosAtuais - pontosNumber);
    equipeGincana.pontos_acumulados = pontosAtualizados;
    await equipeGincana.save();

    // Gerar ID legível (Ex: PEN-20231025-1234)
    const gerarNomePenalidade = () => {
      const d = new Date();
      const rnd = Math.floor(1000 + Math.random() * 9000);
      return `PEN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${rnd}`;
    };

    const penalidade = new Penalidade({
      nome: gerarNomePenalidade(),
      equipe_gincana_id: equipeId,
      participante_id: participanteId || null,
      pontos_removidos: pontosNumber,
      descricao: descricao,
    });

    await penalidade.save();

    // ---  NOTIFICAÇÃO EM MASSA (COORDENADOR + ALUNOS) ---
    try {
        const idBaseEquipe = equipeGincana.equipe_id?._id || equipeGincana.equipe_id;
        const nomeEquipe = equipeGincana.equipe_id?.nome || "Sua equipe";
        const remetenteId = usuarioAtual.id.toString();

        
        const membros = await EquipeMembros.find({ equipe_id: idBaseEquipe }).select('usuario_id');
        
        const destinatariosIds = new Set();

        // Adiciona Alunos
        membros.forEach(m => {
            if (m.usuario_id) destinatariosIds.add(m.usuario_id.toString());
        });

        // Adiciona Coordenador
        if (idCoordenador) {
            destinatariosIds.add(idCoordenador.toString());
        }

        // Remove quem está aplicando a penalidade
        if (destinatariosIds.has(remetenteId)) {
            destinatariosIds.delete(remetenteId);
        }

        // Disparar notificações em paralelo
        const promises = Array.from(destinatariosIds).map(userId => {
            return criarNotificacao(
                userId,
                'PENALIDADE', // Tipo para o ícone vermelho
                'Penalidade Aplicada ⚠️',
                `A equipe ${nomeEquipe} perdeu ${pontosNumber} pontos. Motivo: ${descricao}`,
                null,
                penalidade._id
            ).catch(err => console.error(`Erro ao notificar usuário ${userId}:`, err.message));
        });

        await Promise.all(promises);

    } catch (notifError) {
        console.error("❌ Erro no envio das notificações (Penalidade criada mesmo assim):", notifError);
    }

    return res.status(201).json({
      ...penalidade.toObject(),
      pontos_restantes: pontosAtualizados,
    });

  } catch (err) {
    console.error("Erro criarPenalidade:", err);
    return res.status(500).json({ message: "Erro interno ao criar penalidade.", error: err.message });
  }
};


/**
 * [GET] Lista todas as penalidades
 * ADMIN vê todas, COORDENADOR vê apenas das equipes que coordena
 */
export const listarPenalidades = async (req, res) => {
  try {
    const usuarioAtual = req.usuario; // Obtém o usuário do middleware de autenticação
    let query = {};

    // Se for COORDENADOR, filtra apenas penalidades das equipes que ele coordena
    if (usuarioAtual.tipo === 'COORDENADOR') {
      // Encontra as EquipeGincana que o coordenador gerencia (via is_coordenador).
      const equipesCoordenadas = await getEquipesGincanaDoCoordenador(usuarioAtual.id);
      const equipeGincanaIds = equipesCoordenadas.map(eg => eg._id);
      query.equipe_gincana_id = { $in: equipeGincanaIds };
    }

    const penalidades = await Penalidade.find(query)
      .populate({
        path: "equipe_gincana_id",
        populate: { path: "equipe_id", select: "nome cor" }
      })
      .populate("participante_id", "nome email tipo")
      .sort({ criado_em: -1 });

    const resultado = penalidades.map((p) => ({
      id: p._id.toString(),
      penalidade_id: p.penalidade_id,
      nome: p.nome,
      equipe: p.equipe_gincana_id?.equipe_id
        ? { id: p.equipe_gincana_id.equipe_id._id, nome: p.equipe_gincana_id.equipe_id.nome, cor: p.equipe_gincana_id.equipe_id.cor }
        : { id: p.equipe_gincana_id?._id, nome: "Equipe sem nome", cor: "#cccccc" },
      participante: p.participante_id
        ? { id: p.participante_id._id, nome: p.participante_id.nome, email: p.participante_id.email }
        : null,
      pontos_removidos: p.pontos_removidos,
      descricao: p.descricao,
      criado_em: p.criado_em,
    }));

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("Erro listarPenalidades:", err);
    return res.status(500).json({ message: "Erro interno ao listar penalidades." });
  }
};


/**
 * GET /api/penalidades/equipes
 * ADMIN vê todas as equipes, COORDENADOR vê apenas as que coordena
 */
export const listarEquipesParaPenalidade = async (req, res) => {
  try {
    const usuarioAtual = req.usuario;
    let query = {};

    // Se for COORDENADOR, filtra apenas equipes que ele coordena (via is_coordenador)
    if (usuarioAtual.tipo === 'COORDENADOR') {
      const equipesCoordenadas = await getEquipesGincanaDoCoordenador(usuarioAtual.id);
      query._id = { $in: equipesCoordenadas.map((eg) => eg._id) };
    }

    const equipes = await EquipeGincana.find(query).populate("equipe_id", "nome cor").sort({ "equipe_id.nome": 1 });

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

    logFormData(req, { totalEquipes: formatadas.length, usuario: usuarioAtual.tipo });

    return res.status(200).json(formatadas);
  } catch (err) {
    console.error("Erro listarEquipesParaPenalidade:", err);
    return res.status(500).json({ message: "Erro ao listar equipes para penalidade.", error: err.message });
  }
};

/**
 * [GET] Lista todos os membros da equipe
 * Verifica se o usuário tem permissão para ver membros desta equipe
 */
export const listarMembrosDaEquipe = async (req, res) => {
  try {
    const { equipeId } = req.params;
    const usuarioAtual = req.usuario;

    if (!equipeId) {
      return res.status(400).json({ message: "ID da equipe (EquipeGincana) é obrigatório." });
    }

    const equipeGincana = await EquipeGincana.findById(equipeId).populate("equipe_id");
    if (!equipeGincana) return res.status(404).json({ message: "EquipeGincana não encontrada." });

    // Se for COORDENADOR, verifica se ele coordena esta equipe (via is_coordenador)
    if (usuarioAtual.tipo === 'COORDENADOR' && !(await isCoordenadorDaEquipe(usuarioAtual.id, equipeGincana))) {
      return res.status(403).json({ message: "Você não tem permissão para ver membros desta equipe." });
    }

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

    logFormData(req, {}, resultado);

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("Erro buscarParticipante:", err);
    return res.status(500).json({ message: "Erro interno ao buscar participante." });
  }
};

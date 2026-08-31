import express from "express";
import {
  criarPenalidade,
  listarPenalidades,
  listarEquipesParaPenalidade,
  listarMembrosDaEquipe,
  buscarParticipante,
} from "../penalidades/penalidadesController.js";
import { proteger, autorizar, resolverEscola, resolverGincana } from "../auth/authPermissions.js";

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de penalidades.
router.use(proteger, resolverEscola, resolverGincana);

// Todas as rotas de penalidades requerem autenticação e permissão de ADMIN ou COORDENADOR
router.post("/", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO'), criarPenalidade);
router.get("/", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO'), listarPenalidades);
router.get("/equipes", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO'), listarEquipesParaPenalidade);
router.get("/equipes/:equipeId/membros", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO'), listarMembrosDaEquipe);
router.get("/participante-selecionado", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO'), buscarParticipante);



export default router;

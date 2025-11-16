import express from "express";
import {
  criarPenalidade,
  listarPenalidades,
  listarEquipesParaPenalidade,
  listarMembrosDaEquipe,
  buscarParticipante,
} from "../penalidades/penalidadesController.js";
import { proteger, autorizar } from "../auth/authPermissions.js";

const router = express.Router();

// Todas as rotas de penalidades requerem autenticação e permissão de ADMIN
router.post("/", proteger, autorizar('ADMIN'), criarPenalidade);
router.get("/", proteger, autorizar('ADMIN'), listarPenalidades);
router.get("/equipes", proteger, autorizar('ADMIN'), listarEquipesParaPenalidade);
router.get("/equipes/:equipeId/membros", proteger, autorizar('ADMIN'), listarMembrosDaEquipe);
router.get("/participante-selecionado", proteger, autorizar('ADMIN'), buscarParticipante);



export default router;

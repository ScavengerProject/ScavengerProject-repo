import express from "express";
import {
  criarPenalidade,
  listarPenalidades,
  listarEquipesParaPenalidade,
  listarMembrosDaEquipe,
  buscarParticipante,
} from "../penalidades/penalidadesController.js"; 

const router = express.Router();

router.post("/", criarPenalidade);
router.get("/", listarPenalidades);
router.get("/equipes", listarEquipesParaPenalidade);
router.get("/equipes/:equipeId/membros", listarMembrosDaEquipe);
router.get("/participante-selecionado", buscarParticipante);



export default router;

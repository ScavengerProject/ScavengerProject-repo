import express from "express";
import {
  criarPenalidade,
  listarPenalidades,
  listarEquipesParaPenalidade,
  listarMembrosDaEquipe,
} from "../penalidades/penalidadesController.js"; 

const router = express.Router();

router.post("/", criarPenalidade);
router.get("/", listarPenalidades);
router.get("/equipes", listarEquipesParaPenalidade);
router.get("/equipes/:equipeId/membros", listarMembrosDaEquipe);

export default router;

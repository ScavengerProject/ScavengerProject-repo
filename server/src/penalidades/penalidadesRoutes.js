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

// Aplicar penalidade (e as rotas que alimentam o formulário) é de ADMIN e do
// coordenador da própria equipe. ALUNO já esteve nesta lista e conseguia
// penalizar qualquer equipe pela API.
router.post("/", proteger, autorizar('ADMIN', 'COORDENADOR'), criarPenalidade);
router.get("/equipes", proteger, autorizar('ADMIN', 'COORDENADOR'), listarEquipesParaPenalidade);
router.get("/equipes/:equipeId/membros", proteger, autorizar('ADMIN', 'COORDENADOR'), listarMembrosDaEquipe);
router.get("/participante-selecionado", proteger, autorizar('ADMIN', 'COORDENADOR'), buscarParticipante);

// Consultar é de todo participante; o controller restringe à própria equipe.
router.get("/", proteger, autorizar('ADMIN', 'COORDENADOR', 'ALUNO', 'PROFESSOR', 'PAI/MÃE'), listarPenalidades);



export default router;

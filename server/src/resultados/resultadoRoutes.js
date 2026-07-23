import express from 'express';
import {
  lancarResultados,
  listarResultadosDaProva
} from './resultadoController.js';
import { proteger, autorizar, resolverGincana } from '../auth/authPermissions.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de resultados.
router.use(proteger, resolverGincana);

// Rota pública (protegida) para listar resultados de uma prova
router.get('/', proteger, listarResultadosDaProva);

// Rota de admin para lançar resultados de uma prova
router.post('/', proteger, autorizar('ADMIN'), lancarResultados);

export default router;
import express from 'express';
import {
  lancarResultados,
  listarResultadosDaProva
} from './resultadoController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Rota pública (protegida) para listar resultados de uma prova
router.get('/', proteger, listarResultadosDaProva);

// Rota de admin para lançar resultados de uma prova
router.post('/', proteger, autorizar('ADMIN'), lancarResultados);

export default router;
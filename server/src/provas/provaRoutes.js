import express from 'express';
import { criarProva, listarProvas, obterProva, atualizarProva, deletarProva } from './provaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Rotas públicas (protegidas)
router.get('/', proteger, listarProvas);
router.get('/:id', proteger, obterProva);

// Rotas de admin
router.post('/', proteger, autorizar('ADMIN'), criarProva);
router.put('/:id', proteger, autorizar('ADMIN'), atualizarProva);
router.delete('/:id', proteger, autorizar('ADMIN'), deletarProva);

export default router;
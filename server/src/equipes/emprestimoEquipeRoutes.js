// src/equipes/emprestimoEquipeRoutes.js
import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import { criarEmprestimo, listarEmprestimos, encerrarEmprestimo } from './emprestimoEquipeController.js';

const router = express.Router();

// Admin cria empréstimo
router.post('/', proteger, autorizar('ADMIN'), criarEmprestimo);

// Admin lista todos; Coordenador lista somente os relacionados às suas equipes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR'), listarEmprestimos);

// Admin encerra empréstimo
router.patch('/:id/encerrar', proteger, autorizar('ADMIN','COORDENADOR'), encerrarEmprestimo);

export default router;

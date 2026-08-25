// src/equipes/emprestimoEquipeRoutes.js
import express from 'express';
import { proteger, autorizar, resolverEscola, resolverGincana } from '../auth/authPermissions.js';
import { criarEmprestimo, listarEmprestimos, encerrarEmprestimo } from './emprestimoEquipeController.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de empréstimos.
router.use(proteger, resolverEscola, resolverGincana);

// Admin cria empréstimo
router.post('/', proteger, autorizar('ADMIN'), criarEmprestimo);

// Admin lista todos; Coordenador lista somente os relacionados às suas equipes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR'), listarEmprestimos);

// Admin encerra empréstimo
router.patch('/:id/encerrar', proteger, autorizar('ADMIN','COORDENADOR'), encerrarEmprestimo);

export default router;

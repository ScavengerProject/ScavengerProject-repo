import express from 'express';
import {
    listarEscolas,
    minhasEscolas,
    listarEscolasPublicas,
    criarEscola,
    atualizarEscola,
    alterarStatusEscola,
    listarUsuariosDaEscola,
    vincularUsuario,
    alterarPapelUsuario,
    desvincularUsuario,
    obterResumoEscola,
} from './escolaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Pública: alimenta o seletor de escola do auto-cadastro (usuário ainda sem login).
router.get('/publicas', listarEscolasPublicas);

// Escolas do usuário logado (qualquer autenticado). Rota literal antes de '/:id'.
router.get('/minhas', proteger, minhasEscolas);

// Administração de escolas: apenas SUPER_ADMIN.
// (autorizar('SUPER_ADMIN') é explícito aqui porque ADMIN não deve criar escolas.)
router.get('/', proteger, autorizar('SUPER_ADMIN'), listarEscolas);
router.post('/', proteger, autorizar('SUPER_ADMIN'), criarEscola);
router.get('/:id/resumo', proteger, autorizar('SUPER_ADMIN'), obterResumoEscola);
router.get('/:id/usuarios', proteger, autorizar('SUPER_ADMIN'), listarUsuariosDaEscola);
router.post('/:id/usuarios', proteger, autorizar('SUPER_ADMIN'), vincularUsuario);
router.patch('/:id/usuarios/:usuarioId/papel', proteger, autorizar('SUPER_ADMIN'), alterarPapelUsuario);
router.delete('/:id/usuarios/:usuarioId', proteger, autorizar('SUPER_ADMIN'), desvincularUsuario);
router.put('/:id', proteger, autorizar('SUPER_ADMIN'), atualizarEscola);
router.patch('/:id/status', proteger, autorizar('SUPER_ADMIN'), alterarStatusEscola);

export default router;

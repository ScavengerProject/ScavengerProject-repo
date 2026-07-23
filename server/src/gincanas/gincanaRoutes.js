import express from 'express';
import {
    listarGincanas,
    minhasGincanas,
    criarGincana,
    atualizarGincana,
    alterarStatusGincana,
} from './gincanaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Gincanas em que o usuário logado participa (qualquer autenticado).
// Rota literal antes de qualquer '/:id' para não colidir.
router.get('/minhas', proteger, minhasGincanas);

// Listagem completa e escritas: apenas ADMIN.
router.get('/', proteger, autorizar('ADMIN'), listarGincanas);
router.post('/', proteger, autorizar('ADMIN'), criarGincana);
router.put('/:id', proteger, autorizar('ADMIN'), atualizarGincana);
router.patch('/:id/status', proteger, autorizar('ADMIN'), alterarStatusGincana);

export default router;

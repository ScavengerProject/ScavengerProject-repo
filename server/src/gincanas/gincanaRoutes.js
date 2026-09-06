import express from 'express';
import {
    listarGincanas,
    minhasGincanas,
    listarGincanasDisponiveis,
    criarGincana,
    atualizarGincana,
    alterarStatusGincana,
} from './gincanaController.js';
import { proteger, autorizar, resolverEscola } from '../auth/authPermissions.js';

const router = express.Router();

// Gincanas em que o usuário logado participa, dentro da escola ativa.
// Rota literal antes de qualquer '/:id' para não colidir.
router.get('/minhas', proteger, resolverEscola, minhasGincanas);

// Gincanas ATIVAS da escola, sem exigir participação — usada quando
// `minhasGincanas` vem vazio para oferecer algo em que entrar (ver
// SelecionarGincana.jsx).
router.get('/disponiveis', proteger, resolverEscola, listarGincanasDisponiveis);

// Listagem completa e escritas: ADMIN (restrito à escola ativa) ou SUPER_ADMIN.
router.get('/', proteger, resolverEscola, autorizar('ADMIN'), listarGincanas);
router.post('/', proteger, resolverEscola, autorizar('ADMIN'), criarGincana);
router.put('/:id', proteger, resolverEscola, autorizar('ADMIN'), atualizarGincana);
router.patch('/:id/status', proteger, resolverEscola, autorizar('ADMIN'), alterarStatusGincana);

export default router;

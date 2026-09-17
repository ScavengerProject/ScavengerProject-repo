// src/equipes/ofertaEmprestimoRoutes.js
import express from 'express';
import { proteger, autorizar, resolverEscola, resolverGincana } from '../auth/authPermissions.js';
import {
  criarOferta,
  listarOfertas,
  listarMembrosOfertaveis,
  aceitarOferta,
  recusarOferta,
  cancelarOferta,
} from './ofertaEmprestimoController.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de ofertas.
router.use(proteger, resolverEscola, resolverGincana);

// Coordenador cria oferta
router.post('/', proteger, autorizar('COORDENADOR'), criarOferta);

// Admin e Coordenador podem listar
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR'), listarOfertas);

// Quem da minha equipe pode ser ofertado para esta solicitação (e por que não).
// Antes de qualquer '/:id' para não ser capturado por ele.
router.get('/ofertaveis/:solicitacaoId', proteger, autorizar('COORDENADOR'), listarMembrosOfertaveis);

// Coordenador solicitante ou Admin aceita/recusa ofertas
router.patch('/:id/aceitar', proteger, autorizar('ADMIN', 'COORDENADOR'), aceitarOferta);
router.patch('/:id/recusar', proteger, autorizar('ADMIN', 'COORDENADOR'), recusarOferta);

// Coordenador ofertante cancela sua oferta
router.patch('/:id/cancelar', proteger, autorizar('COORDENADOR'), cancelarOferta);

export default router;


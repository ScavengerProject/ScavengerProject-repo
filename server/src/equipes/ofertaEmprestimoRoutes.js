// src/equipes/ofertaEmprestimoRoutes.js
import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import {
  criarOferta,
  listarOfertas,
  aceitarOferta,
  recusarOferta,
  cancelarOferta,
} from './ofertaEmprestimoController.js';

const router = express.Router();

// Coordenador cria oferta
router.post('/', proteger, autorizar('COORDENADOR'), criarOferta);

// Admin e Coordenador podem listar
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR'), listarOfertas);

// Coordenador solicitante ou Admin aceita/recusa ofertas
router.patch('/:id/aceitar', proteger, autorizar('ADMIN', 'COORDENADOR'), aceitarOferta);
router.patch('/:id/recusar', proteger, autorizar('ADMIN', 'COORDENADOR'), recusarOferta);

// Coordenador ofertante cancela sua oferta
router.patch('/:id/cancelar', proteger, autorizar('COORDENADOR'), cancelarOferta);

export default router;


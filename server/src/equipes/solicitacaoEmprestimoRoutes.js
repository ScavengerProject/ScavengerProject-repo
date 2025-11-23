// src/equipes/solicitacaoEmprestimoRoutes.js
import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import {
  criarSolicitacao,
  listarSolicitacoes,
  obterSolicitacao,
  aprovarSolicitacao,
  rejeitarSolicitacao,
  cancelarSolicitacao,
} from './solicitacaoEmprestimoController.js';

const router = express.Router();

// Coordenador cria solicitação
router.post('/', proteger, autorizar('COORDENADOR'), criarSolicitacao);

// Admin e Coordenador podem listar
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR'), listarSolicitacoes);

// Obter detalhes de uma solicitação
router.get('/:id', proteger, autorizar('ADMIN', 'COORDENADOR'), obterSolicitacao);

// Admin aprova/rejeita
router.patch('/:id/aprovar', proteger, autorizar('ADMIN'), aprovarSolicitacao);
router.patch('/:id/rejeitar', proteger, autorizar('ADMIN'), rejeitarSolicitacao);

// Coordenador cancela
router.patch('/:id/cancelar', proteger, autorizar('COORDENADOR'), cancelarSolicitacao);

export default router;


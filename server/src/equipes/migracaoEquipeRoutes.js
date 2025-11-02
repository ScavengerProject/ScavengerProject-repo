// src/equipes/migracaoEquipeRoutes.js
import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import {
  listarMinhasMigracoes,
  listarMigracoesPendentes,
  solicitarMigracao,
  decidirMigracao,
} from './migracaoEquipeController.js';

const router = express.Router();

/**
 * Minhas solicitações (ALUNO/PROFESSOR/PAI-MÃE/COORDENADOR/ADMIN)
 */
router.get(
  '/minhas',
  proteger,
  autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO', 'PAI/MÃE'),
  listarMinhasMigracoes
);

/**
 * Pendentes para decisão
 * - ADMIN: todas as PENDENTE
 * - COORDENADOR: PENDENTE em que a origem ou destino é time coordenado por mim
 */
router.get('/pendentes', proteger, autorizar('ADMIN', 'COORDENADOR'), listarMigracoesPendentes);

/**
 * Solicitar migração (self-service)
 */
router.post(
  '/solicitar',
  proteger,
  autorizar('ALUNO', 'PROFESSOR', 'PAI/MÃE', 'COORDENADOR', 'ADMIN'),
  solicitarMigracao
);

/**
 * Decisão (aprovar/rejeitar) — ADMIN ou COORDENADOR
 * body: { aprovar: boolean, justificativa?: string }
 */
router.patch('/:id/decidir', proteger, autorizar('ADMIN', 'COORDENADOR'), decidirMigracao);

export default router;

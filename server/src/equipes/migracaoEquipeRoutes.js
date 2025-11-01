import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import {
  listarMigracoes,
  solicitarMigracao,
  decidirMigracao,
} from './migracaoEquipeController.js';

const router = express.Router();

// Listagem genérica (contextual por perfil)
router.get('/', proteger, listarMigracoes);

// "Minhas" solicitações (força modo MINE)
router.get('/minhas', proteger, (req, res, next) => {
  req.query.mode = 'MINE';
  return listarMigracoes(req, res, next);
});

// "Pendentes" para coord/admin
router.get('/pendentes',
  proteger,
  autorizar('ADMIN', 'COORDENADOR'),
  (req, res, next) => {
    req.query.status = 'PENDENTE';
    req.query.mode = 'COORD';
    return listarMigracoes(req, res, next);
  }
);

// Self-service: solicitar migração
router.post(
  '/solicitar',
  proteger,
  autorizar('ALUNO', 'PROFESSOR', 'PAI/MÃE', 'COORDENADOR', 'ADMIN'),
  solicitarMigracao
);

// Decidir (aprovar/rejeitar) — compatível com body { aprovar } ou { aprovado }
router.patch(
  '/:id/decidir',
  proteger,
  autorizar('ADMIN', 'COORDENADOR'),
  decidirMigracao
);

export default router;

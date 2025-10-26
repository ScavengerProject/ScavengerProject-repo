import express from 'express';
import {
  criarProva,
  atualizarRequisitoUsuario,
  inscreverUsuarioNaProva,
  listarParticipantes
} from './provaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

router.post('/', proteger, autorizar('ADMIN'), criarProva);
router.patch('/:id/requisito-usuario', proteger, autorizar('ADMIN'), atualizarRequisitoUsuario);
router.post('/:id/inscricoes', proteger, autorizar('ADMIN','COORDENADOR','ALUNO'), inscreverUsuarioNaProva);
router.get('/:id/participantes', proteger, autorizar('ADMIN','COORDENADOR','PROFESSOR'), listarParticipantes);

export default router;
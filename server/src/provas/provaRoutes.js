import express from 'express';
import {
  criarProva,
  atualizarRequisitoUsuario,
  inscreverUsuarioNaProva,
  listarParticipantes,
  verificarInscricao,
  listarProvas,     
  obterProva,    
  atualizarProva,   
  deletarProva     
} from './provaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Rotas públicas (protegidas)
router.get('/', proteger, listarProvas);
router.get('/:id', proteger, obterProva);
router.get('/:id/inscricao/status', proteger, verificarInscricao);

// Rotas de admin
router.post('/', proteger, autorizar('ADMIN'), criarProva);
router.patch('/:id/requisito-usuario', proteger, autorizar('ADMIN'), atualizarRequisitoUsuario);
router.post('/:id/inscricoes', proteger, autorizar('ADMIN','COORDENADOR','ALUNO','PROFESSOR','PAI/MÃE'), inscreverUsuarioNaProva);
router.get('/:id/participantes', proteger, autorizar('ADMIN','COORDENADOR','PROFESSOR'), listarParticipantes);
router.put('/:id', proteger, autorizar('ADMIN'), atualizarProva);
router.delete('/:id', proteger, autorizar('ADMIN'), deletarProva);

export default router;
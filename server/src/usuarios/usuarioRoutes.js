import express from 'express';
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  registrarUsuario,
  atualizarUsuario,
  deletarUsuario,
  alternarStatusUsuario,
  obterEstatisticas
} from './usuarioController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Rota pública para registro de novos usuários (sem autenticação)
router.post('/registro', registrarUsuario);

// Todas as rotas requerem autenticação e permissão de ADMIN
router.get('/estatisticas', proteger, autorizar('ADMIN'), obterEstatisticas);
router.get('/', proteger, autorizar('ADMIN'), listarUsuarios);
router.get('/:id', proteger, autorizar('ADMIN'), obterUsuario);
router.post('/', proteger, autorizar('ADMIN'), criarUsuario);
router.put('/:id', proteger, autorizar('ADMIN'), atualizarUsuario);
router.patch('/:id/status', proteger, autorizar('ADMIN'), alternarStatusUsuario);
router.delete('/:id', proteger, autorizar('ADMIN'), deletarUsuario);

export default router;


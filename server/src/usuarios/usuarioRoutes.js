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
import { proteger, autorizar, resolverEscola } from '../auth/authPermissions.js';

const router = express.Router();

// Rota pública para registro de novos usuários (sem autenticação).
// A escola vem no corpo (escola_id) e é validada no controller.
router.post('/registro', registrarUsuario);

// Demais rotas: autenticação + escopo de escola + perfil ADMIN
// (SUPER_ADMIN também passa em autorizar('ADMIN'), ver authPermissions.js).
router.use(proteger, resolverEscola);

router.get('/estatisticas', autorizar('ADMIN'), obterEstatisticas);
router.get('/', autorizar('ADMIN'), listarUsuarios);
router.get('/:id', autorizar('ADMIN'), obterUsuario);
router.post('/', autorizar('ADMIN'), criarUsuario);
router.put('/:id', autorizar('ADMIN'), atualizarUsuario);
router.patch('/:id/status', autorizar('ADMIN'), alternarStatusUsuario);
router.delete('/:id', autorizar('ADMIN'), deletarUsuario);

export default router;

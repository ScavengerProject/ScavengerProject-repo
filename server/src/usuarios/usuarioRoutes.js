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
import { limitadorPorIp } from '../middlewares/rateLimit.js';

const router = express.Router();

// Rota pública para registro de novos usuários (sem autenticação). A escola
// vem do código de convite (ver server/src/convites/), não do corpo — o
// controller ignora um eventual escola_id enviado. Limitada por IP: sem
// limite, é possível tentar códigos de convite por força bruta aqui também.
const limiteRegistro = limitadorPorIp({
  janelaMs: 60_000,
  max: 10,
  mensagem: 'Muitas tentativas de cadastro. Aguarde um instante e tente novamente.',
});
router.post('/registro', limiteRegistro, registrarUsuario);

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

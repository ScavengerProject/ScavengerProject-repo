import express from 'express';
import {
  criarConvite,
  listarConvites,
  revogarConvite,
  listarUsuariosDoConvite,
  prevalidarConvite,
  resgatarConvite,
  listarPendentes,
  decidirPendencia,
} from './conviteController.js';
import { proteger, autorizar, resolverEscola, resolverPapelBase } from '../auth/authPermissions.js';
import { limitadorPorIp } from '../middlewares/rateLimit.js';

const router = express.Router();

const limiteConsulta = limitadorPorIp({
  janelaMs: 60_000,
  max: 20,
  mensagem: 'Muitas tentativas. Aguarde um instante e tente novamente.',
});

// Administração de convites: escola ativa + ADMIN (SUPER_ADMIN também passa,
// ver autorizar() em authPermissions.js). NÃO inclui resolverGincana: convite
// é da escola, não de uma edição específica.
//
// Rotas literais ('/pendentes', '/resgatar') vêm antes das com parâmetro de
// rota de mesmo formato ('/:id/...', '/:codigo') — mesmo padrão de escolaRoutes.js.
router.post('/', proteger, resolverEscola, autorizar('ADMIN'), criarConvite);
router.get('/', proteger, resolverEscola, autorizar('ADMIN'), listarConvites);
router.get('/pendentes', proteger, resolverEscola, autorizar('ADMIN'), listarPendentes);
router.patch('/pendentes/:usuarioId', proteger, resolverEscola, autorizar('ADMIN'), decidirPendencia);
router.patch('/:id/revogar', proteger, resolverEscola, autorizar('ADMIN'), revogarConvite);
router.get('/:id/usuarios', proteger, resolverEscola, autorizar('ADMIN'), listarUsuariosDoConvite);

// Resgate: autenticado, mas SEM resolverEscola — a escola alvo vem do código,
// e o usuário pode ainda não ter vínculo com ela (é o caso normal aqui).
// resolverPapelBase garante que req.usuario.tipo vem do banco, não do JWT
// congelado (ver comentário do próprio middleware).
router.post('/resgatar', proteger, resolverPapelBase, limiteConsulta, resgatarConvite);

// Pré-validação pública (sem login): rate-limitada porque é um oráculo de
// força bruta para adivinhar códigos sem o limitador.
router.get('/:codigo', limiteConsulta, prevalidarConvite);

export default router;

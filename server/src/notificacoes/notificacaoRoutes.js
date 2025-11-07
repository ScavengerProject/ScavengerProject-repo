import express from 'express';
import {
  listarNotificacoes,
  contarNotificacoesNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  obterNotificacao,
  deletarNotificacao
} from './notificacaoController.js';
import { proteger } from '../auth/authPermissions.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.get('/', proteger, listarNotificacoes);
router.get('/nao-lidas/contagem', proteger, contarNotificacoesNaoLidas);
router.get('/:id', proteger, obterNotificacao);
router.patch('/:id/marcar-lida', proteger, marcarComoLida);
router.patch('/marcar-todas-lidas', proteger, marcarTodasComoLidas);
router.delete('/:id', proteger, deletarNotificacao);

export default router;


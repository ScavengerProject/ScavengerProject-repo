import express from 'express';
import { obterConfiguracao, atualizarConfiguracao } from './configuracaoController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Obter configuração (todos autenticados podem ver)
router.get('/', proteger, obterConfiguracao);

// Atualizar configuração (apenas ADMIN)
router.put('/', proteger, autorizar('ADMIN'), atualizarConfiguracao);

export default router;


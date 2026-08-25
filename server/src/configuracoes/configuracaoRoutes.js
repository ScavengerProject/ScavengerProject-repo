import express from 'express';
import { obterConfiguracao, atualizarConfiguracao } from './configuracaoController.js';
import { proteger, autorizar, resolverEscola, resolverGincana } from '../auth/authPermissions.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de configuração.
router.use(proteger, resolverEscola, resolverGincana);

// Obter configuração (todos autenticados podem ver)
router.get('/', proteger, obterConfiguracao);

// Atualizar configuração (apenas ADMIN)
router.put('/', proteger, autorizar('ADMIN'), atualizarConfiguracao);

export default router;


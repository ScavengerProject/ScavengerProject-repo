import express from 'express';
import { proteger, autorizar, resolverGincana } from '../auth/authPermissions.js';
import { enviarFeedback, listarFeedbacks, responderFeedback, listarMeusFeedbacks } from './feedbackController.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de feedbacks.
router.use(proteger, resolverGincana);

router.post('/', proteger, enviarFeedback);
router.get('/', proteger, autorizar('ADMIN'), listarFeedbacks);
router.patch('/:id/responder', proteger, autorizar('ADMIN'), responderFeedback);
router.get('/minhos', proteger, listarMeusFeedbacks);

export default router;
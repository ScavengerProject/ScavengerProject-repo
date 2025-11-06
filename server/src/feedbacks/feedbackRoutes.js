import express from 'express';
import { proteger, autorizar } from '../auth/authPermissions.js';
import { enviarFeedback, listarFeedbacks, responderFeedback, listarMeusFeedbacks } from './feedbackController.js';

const router = express.Router();

router.post('/', proteger, enviarFeedback);
router.get('/', proteger, autorizar('ADMIN'), listarFeedbacks);
router.patch('/:id/responder', proteger, autorizar('ADMIN'), responderFeedback);
router.get('/minhos', proteger, listarMeusFeedbacks);

export default router;
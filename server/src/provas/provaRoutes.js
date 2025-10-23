import express from 'express';
import { criarProva } from './provaController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

router.post('/', proteger, autorizar('ADMIN'), criarProva);

export default router;
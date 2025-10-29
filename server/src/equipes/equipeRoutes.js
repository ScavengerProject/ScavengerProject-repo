import express from 'express';
import { 
    criarEquipe, 
    listarEquipes, 
    adicionarMembro 
} from './equipeController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Listar todas as equipes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR'), listarEquipes);

// Criar nova equipe
router.post('/', proteger, autorizar('ADMIN'), criarEquipe);

// Adicionar usuário a equipe (principal da US06)
router.patch('/:id/membros', proteger, autorizar('ADMIN'), adicionarMembro);

export default router;
import express from 'express';
import { 
    criarEquipe, 
    listarEquipes, 
    adicionarMembro,
    listarCoordenadoresDisponiveis,
    listarUsuariosSemEquipe
} from './equipeController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Lista todas as equipes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR'), listarEquipes);

// Criar nova equipe
router.post('/', proteger, autorizar('ADMIN'), criarEquipe);

// Adicionar usuário a equipe (principal da US06)
router.patch('/:id/membros', proteger, autorizar('ADMIN'), adicionarMembro);

// Listar usuários para Coordenadores (APENAS COORDENADOR) 
router.get('/coordenadores-disponiveis', proteger, autorizar('ADMIN'), listarCoordenadoresDisponiveis);

// Listar usuários para membros comuns (exclui ADMIN/COORDENADOR)
router.get('/membros-disponiveis', proteger, autorizar('ADMIN', 'COORDENADOR'), listarUsuariosSemEquipe);

export default router;
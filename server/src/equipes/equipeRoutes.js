import express from 'express';
import { 
    criarEquipe, 
    listarEquipes, 
    adicionarMembro,
    listarCoordenadoresDisponiveis,
    listarUsuariosSemEquipe,
    visualizarEquipe,
    removerMembroEquipe
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

// --- ROTAS PARA COORDENADORES (US07) ---
// Estas rotas são para o Coordenador gerenciar a SUA PRÓPRIA equipe.
router.get('/minha-equipe', proteger, autorizar('COORDENADOR'), visualizarEquipe);
router.delete('/minha-equipe/membros/:membroId', proteger, autorizar('COORDENADOR'), removerMembroEquipe);

export default router;
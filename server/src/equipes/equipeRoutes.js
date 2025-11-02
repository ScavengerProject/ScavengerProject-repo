import express from 'express';
import { 
  criarEquipe, 
  listarEquipes, 
  adicionarMembro,
  listarCoordenadoresDisponiveis,
  listarUsuariosSemEquipe,
  visualizarEquipe,
  removerMembroEquipe,
  listarEquipesPublicas
} from './equipeController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// ✅ rota “pública” para QUALQUER usuário autenticado (inclui aluno)
router.get('/publicas', proteger, listarEquipesPublicas);

// Rotas existentes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR'), listarEquipes);
router.post('/', proteger, autorizar('ADMIN'), criarEquipe);
router.patch('/:id/membros', proteger, autorizar('ADMIN'), adicionarMembro);
router.get('/coordenadores-disponiveis', proteger, autorizar('ADMIN'), listarCoordenadoresDisponiveis);
router.get('/membros-disponiveis', proteger, autorizar('ADMIN', 'COORDENADOR'), listarUsuariosSemEquipe);

// Coordenador gerencia sua própria equipe
router.get('/minha-equipe', proteger, autorizar('COORDENADOR'), visualizarEquipe);
router.delete('/minha-equipe/membros/:membroId', proteger, autorizar('COORDENADOR'), removerMembroEquipe);

export default router;

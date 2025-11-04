import express from 'express';
import { 
  criarEquipe, 
  listarEquipes, 
  adicionarMembro,
  listarCoordenadoresDisponiveis,
  listarUsuariosSemEquipe,
  listarTodosMembros,
  listarEquipesGincana,
  visualizarEquipe,
  removerMembroEquipe,
  listarEquipesPublicas,
  inscreverAlunoEmEquipe,
  limparMembrosorfaos,
  listarEquipesPublicas
} from './equipeController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// Lista todas as equipes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO'), listarEquipes);

// Criar nova equipe
// ✅ rota “pública” para QUALQUER usuário autenticado (inclui aluno)
router.get('/publicas', proteger, listarEquipesPublicas);

// Rotas existentes
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR'), listarEquipes);
router.post('/', proteger, autorizar('ADMIN'), criarEquipe);
router.patch('/:id/membros', proteger, autorizar('ADMIN'), adicionarMembro);
router.get('/coordenadores-disponiveis', proteger, autorizar('ADMIN'), listarCoordenadoresDisponiveis);
router.get('/membros-disponiveis', proteger, autorizar('ADMIN', 'COORDENADOR'), listarUsuariosSemEquipe);
router.get('/todos-membros', proteger, autorizar('ADMIN'), listarTodosMembros);
router.get('/equipes-gincana', proteger, autorizar('ADMIN'), listarEquipesGincana);

// Coordenador gerencia sua própria equipe
router.get('/minha-equipe', proteger, autorizar('COORDENADOR'), visualizarEquipe);
router.delete('/minha-equipe/membros/:membroId', proteger, autorizar('COORDENADOR'), removerMembroEquipe);

// --- ROTA PARA INSCRIÇÃO DE ALUNO (US08) ---
// Aluno autenticado se inscreve em uma equipe
router.post('/:equipeId/register', proteger, autorizar('ALUNO'), inscreverAlunoEmEquipe);

export default router;

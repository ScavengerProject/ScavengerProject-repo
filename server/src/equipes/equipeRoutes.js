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
  listarEquipesParaInscricao,
  inscreverAlunoEmEquipe,
  deletarEquipe,
  listarMembrosPorEquipe,
  atualizarEquipe,
  atribuirCoordenador,
  listarUsuariosElegiveisCoordenador
} from './equipeController.js';
import { proteger, autorizar } from '../auth/authPermissions.js';

const router = express.Router();

// ✅ rota "pública" para QUALQUER usuário autenticado (inclui aluno)
router.get('/publicas', proteger, listarEquipesPublicas);

// ✅ Lista equipes para inscrição, indicando qual é a equipe atual do aluno
router.get('/para-inscricao', proteger, autorizar('ALUNO', 'PROFESSOR', 'PAI/MÃE'), listarEquipesParaInscricao);

// Lista todas as equipes (Admin, Coordenador, Professor, Aluno)
router.get('/', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO'), listarEquipes);

// Criar nova equipe (apenas Admin)
router.post('/', proteger, autorizar('ADMIN'), criarEquipe);
// Excluir equipe (apenas Admin)
router.delete('/:id', proteger, autorizar('ADMIN'), deletarEquipe);
// [GET] Listar membros por ID da Equipe
router.get('/:equipeId/membros', proteger, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO'), listarMembrosPorEquipe);
// [PUT] Atualizar equipe (Admin)
router.put('/:id', proteger, autorizar('ADMIN'), atualizarEquipe);
// [PATCH] Atribuir/Trocar Coordenador
router.patch('/:id/coordenador', proteger, autorizar('ADMIN'), atribuirCoordenador);

router.patch('/:id/membros', proteger, autorizar('ADMIN'), adicionarMembro);
router.get('/coordenadores-disponiveis', proteger, autorizar('ADMIN'), listarCoordenadoresDisponiveis);
router.get('/membros-disponiveis', proteger, autorizar('ADMIN', 'COORDENADOR'), listarUsuariosSemEquipe);
router.get('/:equipeId/alunos-disponiveis', proteger, autorizar('ADMIN'), listarUsuariosElegiveisCoordenador);
router.get('/todos-membros', proteger, autorizar('ADMIN'), listarTodosMembros);
router.get('/equipes-gincana', proteger, autorizar('ADMIN'), listarEquipesGincana);

// Coordenador gerencia sua própria equipe
router.get('/minha-equipe', proteger, autorizar('COORDENADOR'), visualizarEquipe);
router.delete('/minha-equipe/membros/:membroId', proteger, autorizar('COORDENADOR'), removerMembroEquipe);

// --- ROTA PARA INSCRIÇÃO DE ALUNO (US08) ---
// Aluno autenticado se inscreve em uma equipe
router.post('/:equipeId/register', proteger, autorizar('ALUNO'), inscreverAlunoEmEquipe);

export default router;

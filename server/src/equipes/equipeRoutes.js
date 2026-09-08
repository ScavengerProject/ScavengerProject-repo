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
  adicionarCoordenador,
  removerCoordenador,
  atualizarMaxCoordenadores,
  listarUsuariosElegiveisCoordenador,
  visualizarRankingEquipes,
  buscarMinhaEquipeId,
  meuVinculoNaGincana
} from './equipeController.js';
import {
  proteger,
  autorizar,
  resolverEscola,
  resolverGincana,
  resolverGincanaParaInscricao,
} from '../auth/authPermissions.js';

const router = express.Router();

// Cada rota encadeia seu próprio resolvedor de gincana (em vez de um
// `router.use` único) porque as DUAS rotas de inscrição (logo abaixo) usam a
// variante permissiva `resolverGincanaParaInscricao`: a estrita exige que o
// usuário já participe da gincana, e são justamente essas rotas que deixam
// alguém sem equipe passar a participar pela primeira vez.

// ✅ rota "pública" para QUALQUER usuário autenticado (inclui aluno)
router.get('/publicas', proteger, resolverEscola, resolverGincana, listarEquipesPublicas);

// Vínculo de equipe do próprio usuário na gincana ativa. Permissiva de
// propósito (resolverGincanaParaInscricao): é a rota que o front consulta para
// saber se precisa obrigar a pessoa a escolher uma equipe, então ela tem de
// responder justamente para quem ainda não participa da gincana. Sem
// `autorizar`: cada um só lê o próprio vínculo.
router.get('/meu-vinculo', proteger, resolverEscola, resolverGincanaParaInscricao, meuVinculoNaGincana);

// ✅ Lista equipes para inscrição, indicando qual é a equipe atual do aluno
router.get('/para-inscricao', proteger, resolverEscola, resolverGincanaParaInscricao, autorizar('ALUNO', 'PROFESSOR', 'PAI/MÃE', 'COORDENADOR'), listarEquipesParaInscricao);

// Lista todas as equipes (Admin, Coordenador, Professor, Aluno)
router.get('/', proteger, resolverEscola, resolverGincana, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO'), listarEquipes);

// Criar nova equipe (apenas Admin)
router.post('/', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), criarEquipe);
// Excluir equipe (apenas Admin)
router.delete('/:id', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), deletarEquipe);
// [GET] Listar membros por ID da Equipe
router.get('/:equipeId/membros', proteger, resolverEscola, resolverGincana, autorizar('ADMIN', 'COORDENADOR', 'PROFESSOR', 'ALUNO'), listarMembrosPorEquipe);
// [PUT] Atualizar equipe (Admin)
router.put('/:id', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), atualizarEquipe);
// [PATCH] Atribuir/Trocar Coordenador (legado, coordenador único)
router.patch('/:id/coordenador', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), atribuirCoordenador);

// Gestão de MÚLTIPLOS coordenadores por equipe (ADMIN)
router.post('/:id/coordenadores', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), adicionarCoordenador);
router.delete('/:id/coordenadores/:usuarioId', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), removerCoordenador);
router.patch('/:id/max-coordenadores', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), atualizarMaxCoordenadores);

router.patch('/:id/membros', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), adicionarMembro);
router.get('/coordenadores-disponiveis', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), listarCoordenadoresDisponiveis);
router.get('/membros-disponiveis', proteger, resolverEscola, resolverGincana, autorizar('ADMIN', 'COORDENADOR'), listarUsuariosSemEquipe);
router.get('/:equipeId/alunos-disponiveis', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), listarUsuariosElegiveisCoordenador);
router.get('/todos-membros', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), listarTodosMembros);
router.get('/equipes-gincana', proteger, resolverEscola, resolverGincana, autorizar('ADMIN'), listarEquipesGincana);

// Coordenador gerencia sua própria equipe
router.get('/minha-equipe', proteger, resolverEscola, resolverGincana, autorizar('COORDENADOR'), visualizarEquipe);
router.delete('/minha-equipe/membros/:membroId', proteger, resolverEscola, resolverGincana, autorizar('COORDENADOR'), removerMembroEquipe);

// --- ROTA PARA INSCRIÇÃO DE ALUNO (US08) ---
// Aluno autenticado se inscreve em uma equipe
router.post('/:equipeId/register', proteger, resolverEscola, resolverGincanaParaInscricao, autorizar('ALUNO'), inscreverAlunoEmEquipe);

router.get('/ranking', proteger, resolverEscola, resolverGincana, visualizarRankingEquipes);
router.get('/minha-equipe-id', proteger, resolverEscola, resolverGincana, buscarMinhaEquipeId);
export default router;

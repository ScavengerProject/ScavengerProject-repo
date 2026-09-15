import express from 'express';
import {
  criarProva,
  atualizarRequisitoUsuario,
  inscreverUsuarioNaProva,
  listarParticipantes,
  verificarInscricao,
  listarProvas,     
  obterProva,    
  atualizarProva,   
  deletarProva     
} from './provaController.js';
import {
  listarEquipeParticipanteDaProva,
  salvarEquipeParticipanteDaProva,
  listarAssociacoesProvas,
  listarMembrosDaEquipeParaProva,
  inscreverMembrosDaEquipe,
} from './provaParticipacaoController.js';
import { proteger, autorizar, resolverEscola, resolverGincana } from '../auth/authPermissions.js';

const router = express.Router();

// Resolve o escopo da gincana ativa (X-Gincana-Id) para todas as rotas de provas.
router.use(proteger, resolverEscola, resolverGincana);

// Rotas públicas (protegidas)
router.get('/', proteger, listarProvas);
router.get('/:id', proteger, obterProva);
router.get('/:id/inscricao/status', proteger, verificarInscricao);

// Rotas de admin
router.get('/associacoes/alunos', proteger, autorizar('ADMIN'), listarAssociacoesProvas);
router.post('/', proteger, autorizar('ADMIN'), criarProva);
router.patch('/:id/requisito-usuario', proteger, autorizar('ADMIN'), atualizarRequisitoUsuario);
router.post('/:id/inscricoes', proteger, autorizar('ADMIN','COORDENADOR','ALUNO','PROFESSOR','PAI/MÃE'), inscreverUsuarioNaProva);
router.get('/:id/participantes', proteger, autorizar('ADMIN','COORDENADOR','PROFESSOR'), listarParticipantes);
// Coordenador inscreve membros da PRÓPRIA equipe (botão no modal da prova).
// A listagem devolve a equipe inteira com o motivo de cada inelegível; o POST é
// em lote para a cota do grupo não ser furada por chamadas paralelas.
router.get('/:id/inscricao/membros-equipe', proteger, autorizar('COORDENADOR'), listarMembrosDaEquipeParaProva);
router.post('/:id/inscricoes/equipe', proteger, autorizar('COORDENADOR'), inscreverMembrosDaEquipe);
router.get('/:id/equipe-participante', proteger, autorizar('COORDENADOR'), listarEquipeParticipanteDaProva);
router.put('/:id/equipe-participante', proteger, autorizar('COORDENADOR'), salvarEquipeParticipanteDaProva);
router.put('/:id', proteger, autorizar('ADMIN'), atualizarProva);
router.delete('/:id', proteger, autorizar('ADMIN'), deletarProva);

export default router;
import express from 'express';
import {
    listarEscolas,
    minhasEscolas,
    criarEscola,
    atualizarEscola,
    alterarStatusEscola,
    listarUsuariosDaEscola,
    buscarCandidatosVinculo,
    vincularUsuario,
    alterarPapelUsuario,
    desvincularUsuario,
    obterResumoEscola,
} from './escolaController.js';
import { proteger, autorizar, resolverPapelBase } from '../auth/authPermissions.js';

const router = express.Router();

// O catálogo público de escolas (GET /publicas) foi removido: o auto-cadastro
// não deixa mais o candidato escolher a escola livremente — ela vem do código
// de convite (ver server/src/convites/). Ver plano D7.

// Escolas do usuário logado (qualquer autenticado). Rota literal antes de '/:id'.
// `resolverPapelBase` porque minhasEscolas decide o que devolver a partir de
// req.usuario.tipo (SUPER_ADMIN vê todas) — e o tipo do token pode estar velho.
router.get('/minhas', proteger, resolverPapelBase, minhasEscolas);

// Administração de escolas: apenas SUPER_ADMIN.
// (autorizar('SUPER_ADMIN') é explícito aqui porque ADMIN não deve criar escolas.)
//
// Estas rotas são globais: não têm escola ativa e portanto não passam por
// `resolverEscola`. Sem `resolverPapelBase` o `autorizar` decidiria pelo tipo
// do JWT, e quem fosse rebaixado continuaria criando escolas até o token
// expirar (2h).
router.get('/', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), listarEscolas);
router.post('/', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), criarEscola);
router.get('/:id/resumo', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), obterResumoEscola);
router.get('/:id/usuarios', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), listarUsuariosDaEscola);
router.get('/:id/usuarios/candidatos', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), buscarCandidatosVinculo);
router.post('/:id/usuarios', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), vincularUsuario);
router.patch('/:id/usuarios/:usuarioId/papel', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), alterarPapelUsuario);
router.delete('/:id/usuarios/:usuarioId', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), desvincularUsuario);
router.put('/:id', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), atualizarEscola);
router.patch('/:id/status', proteger, resolverPapelBase, autorizar('SUPER_ADMIN'), alterarStatusEscola);

export default router;

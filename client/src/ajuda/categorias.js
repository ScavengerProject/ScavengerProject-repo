import { RocketLaunch, UsersThree, BookOpenText, Handshake, BellSimple, GearSix } from '@phosphor-icons/react';

// Papéis e categorias da central de ajuda, comuns a todas as versões do
// sistema (ajuda/versoes/). Uma versão que precise de outra categoria pode
// passar as suas a montarConteudo().

export const NOMES_PAPEIS = {
  TODOS: 'Todos',
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  'PAI/MÃE': 'Pai/Mãe',
  COORDENADOR: 'Coordenador de equipe',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super admin',
};

export const PARTICIPANTES = ['ALUNO', 'PROFESSOR', 'PAI/MÃE', 'COORDENADOR'];

export const CATEGORIAS = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    descricao: 'Criar conta, entrar e escolher escola e gincana.',
    icone: RocketLaunch,
  },
  {
    id: 'equipes',
    titulo: 'Equipes',
    descricao: 'Entrar numa equipe, trocar de equipe e coordenar.',
    icone: UsersThree,
  },
  {
    id: 'provas',
    titulo: 'Provas e inscrições',
    descricao: 'Encontrar provas, se inscrever e definir titulares.',
    icone: BookOpenText,
  },
  {
    id: 'emprestimos',
    titulo: 'Empréstimo de membros',
    descricao: 'Pedir e oferecer membros entre equipes.',
    icone: Handshake,
  },
  {
    id: 'acompanhamento',
    titulo: 'Avisos e acompanhamento',
    descricao: 'Notificações, penalidades e feedbacks.',
    icone: BellSimple,
  },
  {
    id: 'administracao',
    titulo: 'Administração',
    descricao: 'Para quem organiza a gincana na escola.',
    icone: GearSix,
  },
];

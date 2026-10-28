import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Estado dos providers controlado por teste: o App só lê os hooks.
const estado = {};
vi.mock('./hooks/useAuth.jsx', () => ({ useAuth: () => estado.auth }));
vi.mock('./hooks/useEscola.jsx', () => ({ useEscola: () => estado.escola }));
vi.mock('./hooks/useGincana.jsx', () => ({ useGincana: () => estado.gincana }));
vi.mock('./hooks/useEquipe.jsx', () => ({ useEquipe: () => estado.equipe }));
vi.mock('./components/ui/ToastContainer', () => ({ ToastContainer: () => null }));
vi.mock('./components/ui/toast', async (original) => ({ ...(await original()), useToast: () => ({ toasts: [] }) }));
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('./pages/SelecionarEscola.jsx', () => ({ default: () => <div>Tela de escolher escola</div> }));

import App from './App';

const visitante = () => ({
  auth: { usuario: null, isAuthenticated: false, loading: false, logout: vi.fn() },
  escola: { carregado: true, precisaSelecionarEscola: false, escolasBloqueadas: [] },
  gincana: { carregado: true, precisaSelecionarGincana: false },
  equipe: { carregado: true, precisaSelecionarEquipe: false },
});

const renderEm = (rota) => render(
  <MemoryRouter initialEntries={[rota]}>
    <App />
  </MemoryRouter>
);

beforeEach(() => {
  Object.assign(estado, visitante());
  window.scrollTo = vi.fn();
});

describe('App: landing page e central de ajuda', () => {
  it('mostra a landing page ao visitante em /', () => {
    renderEm('/');
    expect(screen.getByRole('heading', { level: 1, name: /Sua equipe, suas provas/ })).toBeInTheDocument();
    screen.getAllByRole('link', { name: /Criar minha conta/ }).forEach((link) => expect(link).toHaveAttribute('href', '/inscricao'));
  });

  it('liga a landing aos guias da central de ajuda sem link quebrado', () => {
    renderEm('/');
    // Os guias de coordenador e organizador somem em silêncio se o artigo não
    // existir mais; 6 é o número de slugs listados em GUIAS na LandingPage.
    const guias = screen.getAllByRole('link').filter((link) => /^\/ajuda\/.+/.test(link.getAttribute('href')));
    expect(guias).toHaveLength(6);
  });

  it('mostra o Dashboard em / para quem está logado', () => {
    estado.auth = { ...estado.auth, usuario: { tipo: 'ALUNO' }, isAuthenticated: true };
    renderEm('/');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('abre a ajuda mesmo com o escopo pendente, sem mandar para a seleção', () => {
    estado.auth = { ...estado.auth, usuario: { tipo: 'ALUNO' }, isAuthenticated: true };
    estado.escola = { carregado: true, precisaSelecionarEscola: true, escolasBloqueadas: [] };
    renderEm('/ajuda/entrar-e-escolher-gincana');
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar e escolher escola e gincana' })).toBeInTheDocument();
    expect(screen.queryByText('Tela de escolher escola')).not.toBeInTheDocument();
  });

  it('continua levando à seleção de escola fora da ajuda', () => {
    estado.auth = { ...estado.auth, usuario: { tipo: 'ALUNO' }, isAuthenticated: true };
    estado.escola = { carregado: true, precisaSelecionarEscola: true, escolasBloqueadas: [] };
    renderEm('/');
    expect(screen.getByText('Tela de escolher escola')).toBeInTheDocument();
  });
});

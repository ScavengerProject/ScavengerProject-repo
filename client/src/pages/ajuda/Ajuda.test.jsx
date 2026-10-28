import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const authMock = { isAuthenticated: false };
vi.mock('../../hooks/useAuth.jsx', () => ({ useAuth: () => authMock }));

import CentralAjuda from './CentralAjuda';
import ArtigoAjuda from './ArtigoAjuda';
import { VERSAO_ATUAL } from '../../ajuda/versoes';

const ARTIGOS_EM_ORDEM = VERSAO_ATUAL.emOrdem;

function renderAjuda(rota) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/ajuda" element={<CentralAjuda />} />
        <Route path="/ajuda/:slug" element={<ArtigoAjuda />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authMock.isAuthenticated = false;
  window.scrollTo = vi.fn();
});

describe('Central de ajuda', () => {
  it('mostra as categorias e filtra pela busca', async () => {
    renderAjuda('/ajuda');
    expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox'), 'penalidade');
    expect(screen.queryByRole('heading', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    const resultados = screen.getByText(/artigos? encontrados?/).closest('section');
    expect(within(resultados).getByText('Aplicar penalidades')).toBeInTheDocument();
  });

  it('avisa quando a busca não encontra nada', async () => {
    renderAjuda('/ajuda');
    await userEvent.type(screen.getByRole('searchbox'), 'xyzxyzxyz');
    expect(screen.getByText('Nenhum artigo encontrado.')).toBeInTheDocument();
  });

  it('oferece Entrar ao visitante e Voltar ao sistema a quem está logado', () => {
    const menu = () => within(screen.getByRole('navigation', { name: 'Principal' }));
    const { unmount } = renderAjuda('/ajuda');
    expect(menu().getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    unmount();

    authMock.isAuthenticated = true;
    renderAjuda('/ajuda');
    expect(menu().getByRole('link', { name: 'Voltar ao sistema' })).toHaveAttribute('href', '/');
    expect(menu().queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});

describe('Artigo de ajuda', () => {
  it('mostra trilha, papéis, passo a passo e o próximo artigo', () => {
    const [primeiro, segundo] = ARTIGOS_EM_ORDEM;
    renderAjuda(`/ajuda/${primeiro.slug}`);

    expect(screen.getByRole('heading', { level: 1, name: primeiro.titulo })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Trilha' })).toHaveTextContent('Ajuda');
    expect(screen.getByRole('heading', { name: 'Passo a passo' })).toBeInTheDocument();

    const outros = screen.getByRole('navigation', { name: 'Outros artigos' });
    expect(within(outros).queryByText('Anterior')).not.toBeInTheDocument();
    expect(within(outros).getByRole('link', { name: /Próximo/ })).toHaveAttribute('href', `/ajuda/${segundo.slug}`);
  });

  it('destaca em negrito os rótulos marcados com asteriscos', () => {
    renderAjuda('/ajuda/criar-conta');
    expect(screen.getByText('Cadastrar Conta', { selector: 'strong' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('**');
  });

  it('trata slug desconhecido sem quebrar', () => {
    renderAjuda('/ajuda/nao-existe');
    expect(screen.getByRole('heading', { name: 'Artigo não encontrado' })).toBeInTheDocument();
  });
});

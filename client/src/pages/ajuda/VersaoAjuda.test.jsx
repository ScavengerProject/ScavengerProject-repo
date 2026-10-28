import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../hooks/useAuth.jsx', () => ({ useAuth: () => ({ isAuthenticated: false }) }));

// Cenário com duas versões: uma 1.1.0 fictícia (a atual), que tirou o artigo
// "alunos-por-prova" e tem uma novidade, e a 1.0.0 real como arquivo.
vi.mock('../../ajuda/versoes', async (importOriginal) => {
  const real = await importOriginal();
  const { montarConteudo } = await import('../../ajuda/conteudo');
  const v100 = (await import('../../ajuda/versoes/1.0.0')).default;
  const nova = montarConteudo({
    ...v100,
    versao: '1.1.0',
    lancamento: 'Março de 2027',
    novidades: [{ tipo: 'novo', texto: 'Cadastro com confirmação de email.', artigo: 'criar-conta' }],
    artigos: v100.artigos.filter((artigo) => artigo.slug !== 'alunos-por-prova'),
  });
  return { ...real, ...real.criarRegistro([nova, montarConteudo(v100)]) };
});

import CentralAjuda from './CentralAjuda';
import ArtigoAjuda from './ArtigoAjuda';
import { GuardaVersao } from './versaoAjuda';

function Endereco() {
  return <output data-testid="endereco">{useLocation().pathname}</output>;
}

// Mesmas rotas do App.jsx.
function renderEm(rota) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/ajuda" element={<CentralAjuda />} />
        <Route path="/ajuda/:slug" element={<ArtigoAjuda />} />
        <Route path="/ajuda/v/:versao" element={<GuardaVersao><CentralAjuda /></GuardaVersao>} />
        <Route path="/ajuda/v/:versao/:slug" element={<GuardaVersao><ArtigoAjuda /></GuardaVersao>} />
      </Routes>
      <Endereco />
    </MemoryRouter>
  );
}

const endereco = () => screen.getByTestId('endereco').textContent;
const seletor = () => screen.getAllByRole('combobox', { name: 'Versão do sistema' })[0];

beforeEach(() => {
  window.scrollTo = vi.fn();
});

describe('Seletor de versão da central de ajuda', () => {
  it('abre na versão atual, com as novidades dela', () => {
    renderEm('/ajuda');
    expect(seletor()).toHaveValue('1.1.0');
    expect(within(seletor()).getByRole('option', { name: 'Versão 1.1.0 (atual)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O que mudou na versão 1.1.0' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver o artigo' })).toHaveAttribute('href', '/ajuda/criar-conta');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('troca de versão mantendo o artigo aberto e avisa que é uma versão antiga', async () => {
    renderEm('/ajuda/criar-conta');
    await userEvent.selectOptions(seletor(), '1.0.0');

    expect(endereco()).toBe('/ajuda/v/1.0.0/criar-conta');
    const aviso = screen.getByRole('note');
    expect(aviso).toHaveTextContent('Você está vendo a ajuda da versão 1.0.0');
    expect(within(aviso).getByRole('link', { name: 'Ver esta página na versão atual' })).toHaveAttribute('href', '/ajuda/criar-conta');
  });

  it('mantém a navegação dentro da versão antiga', () => {
    renderEm('/ajuda/v/1.0.0/criar-conta');
    const indice = screen.getByRole('navigation', { name: 'Artigos de ajuda' });
    within(indice).getAllByRole('link').forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/^\/ajuda\/v\/1\.0\.0\//);
    });
  });

  it('vai para o início da outra versão quando o artigo não existe nela', async () => {
    renderEm('/ajuda/v/1.0.0/alunos-por-prova');
    expect(within(screen.getByRole('note')).getByRole('link', { name: 'Ir para a versão atual' })).toHaveAttribute('href', '/ajuda');

    await userEvent.selectOptions(seletor(), '1.1.0');
    expect(endereco()).toBe('/ajuda');
  });

  it('manda o endereço versionado da versão atual para o endereço sem prefixo', () => {
    renderEm('/ajuda/v/1.1.0/criar-conta');
    expect(endereco()).toBe('/ajuda/criar-conta');
  });

  it('avisa quando a versão pedida não existe', () => {
    renderEm('/ajuda/v/9.9.9');
    expect(screen.getByRole('heading', { name: 'Versão não encontrada' })).toBeInTheDocument();
  });
});

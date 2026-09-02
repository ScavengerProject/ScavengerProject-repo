import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../services/api', () => ({
  escolasService: { minhas: vi.fn() },
}));

const aplicarPerfilDaEscolaMock = vi.fn();
let isAuthenticated = true;
vi.mock('./useAuth.jsx', () => ({
  useAuth: () => ({ isAuthenticated, aplicarPerfilDaEscola: aplicarPerfilDaEscolaMock }),
}));

import { EscolaProvider, useEscola } from './useEscola.jsx';
import { escolasService } from '../services/api';

const wrapper = ({ children }) => <EscolaProvider>{children}</EscolaProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  isAuthenticated = true;
});

describe('useEscola', () => {
  it('lança erro quando usado fora do EscolaProvider', () => {
    expect(() => renderHook(() => useEscola())).toThrow(/EscolaProvider/);
  });

  it('restaura a escola ativa do localStorage quando ela ainda é válida', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }, { _id: 'ESC_2', nome: 'Escola 2' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.escolaAtivaId).toBe('ESC_1');
    expect(result.current.precisaSelecionarEscola).toBe(false);
  });

  it('limpa a escola persistida quando ela não está mais na lista (perdeu vínculo) e pede seleção', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_FANTASMA');
    localStorage.setItem('gincanaAtivaId', 'GINC_1');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }, { _id: 'ESC_2', nome: 'Escola 2' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.escolaAtivaId).toBeNull();
    expect(result.current.precisaSelecionarEscola).toBe(true);
    expect(localStorage.getItem('escolaAtivaId')).toBeNull();
    // A gincana guardada também não vale mais (era da escola perdida).
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
  });

  it('com uma única escola, entra direto nela sem exigir seleção', async () => {
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_UNICA', nome: 'Única' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.escolaAtivaId).toBe('ESC_UNICA');
    expect(result.current.precisaSelecionarEscola).toBe(false);
    expect(localStorage.getItem('escolaAtivaId')).toBe('ESC_UNICA');
  });

  it('com duas ou mais escolas e nenhuma persistida, exige seleção explícita', async () => {
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }, { _id: 'ESC_2', nome: 'Escola 2' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.escolaAtivaId).toBeNull();
    expect(result.current.precisaSelecionarEscola).toBe(true);
  });

  it('setEscolaAtiva persiste a nova escola, limpa a gincana salva e navega para /selecionar-gincana', async () => {
    localStorage.setItem('gincanaAtivaId', 'GINC_VELHA');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }, { _id: 'ESC_2', nome: 'Escola 2' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    act(() => result.current.setEscolaAtiva('ESC_2'));

    await waitFor(() => expect(result.current.escolaAtivaId).toBe('ESC_2'));
    expect(localStorage.getItem('escolaAtivaId')).toBe('ESC_2');
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith('/selecionar-gincana', { replace: true });
  });

  it('limparEscolaAtiva remove o escopo salvo e navega para /selecionar-escola', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    localStorage.setItem('gincanaAtivaId', 'GINC_1');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }]);

    const { result } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    act(() => result.current.limparEscolaAtiva());

    expect(localStorage.getItem('escolaAtivaId')).toBeNull();
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith('/selecionar-escola', { replace: true });
  });

  it('aplica o papel do usuário NAQUELA escola (meu_tipo) via useAuth', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1', meu_tipo: 'COORDENADOR' }]);

    renderHook(() => useEscola(), { wrapper });

    await waitFor(() => expect(aplicarPerfilDaEscolaMock).toHaveBeenCalledWith('COORDENADOR'));
  });

  it('quando o usuário desloga, limpa a lista e a escola ativa', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    escolasService.minhas.mockResolvedValueOnce([{ _id: 'ESC_1', nome: 'Escola 1' }]);

    const { result, rerender } = renderHook(() => useEscola(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.escolaAtivaId).toBe('ESC_1');

    isAuthenticated = false;
    rerender();

    await waitFor(() => expect(result.current.escolaAtivaId).toBeNull());
    expect(result.current.minhasEscolas).toEqual([]);
    expect(localStorage.getItem('escolaAtivaId')).toBeNull();
  });

  it('erro ao buscar escolas não deixa o provider travado em loading', async () => {
    escolasService.minhas.mockRejectedValueOnce(new Error('falha de rede'));

    const { result } = renderHook(() => useEscola(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.minhasEscolas).toEqual([]);
  });
});

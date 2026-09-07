import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../services/api', () => ({
  gincanasService: { minhas: vi.fn() },
}));

let isAuthenticated = true;
vi.mock('./useAuth.jsx', () => ({
  useAuth: () => ({ isAuthenticated }),
}));

let escolaAtivaId = 'ESC_1';
vi.mock('./useEscola.jsx', () => ({
  useEscola: () => ({ escolaAtivaId }),
}));

import { GincanaProvider, useGincana } from './useGincana.jsx';
import { gincanasService } from '../services/api';

const wrapper = ({ children }) => <GincanaProvider>{children}</GincanaProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  isAuthenticated = true;
  escolaAtivaId = 'ESC_1';
});

describe('useGincana', () => {
  it('lança erro quando usado fora do GincanaProvider', () => {
    expect(() => renderHook(() => useGincana())).toThrow(/GincanaProvider/);
  });

  it('não busca gincanas antes de haver uma escola ativa', async () => {
    escolaAtivaId = null;

    const { result } = renderHook(() => useGincana(), { wrapper });
    // Sem carregar, não pode nunca virar "carregado".
    await new Promise((r) => setTimeout(r, 0));

    expect(gincanasService.minhas).not.toHaveBeenCalled();
    expect(result.current.carregado).toBe(false);
  });

  it('uma gincana encerrada persistida no localStorage nunca vira a ativa', async () => {
    localStorage.setItem('gincanaAtivaId', 'GINC_ENCERRADA');
    gincanasService.minhas.mockResolvedValueOnce([
      { _id: 'GINC_ENCERRADA', nome: 'Antiga', encerrada: true },
      { _id: 'GINC_ATIVA', nome: 'Atual', encerrada: false },
    ]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).not.toBe('GINC_ENCERRADA');
  });

  it('com uma única gincana acessível, entra direto nela', async () => {
    gincanasService.minhas.mockResolvedValueOnce([{ _id: 'GINC_1', nome: 'Única', encerrada: false }]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).toBe('GINC_1');
    expect(result.current.precisaSelecionarGincana).toBe(false);
    expect(localStorage.getItem('gincanaAtivaId')).toBe('GINC_1');
  });

  it('com duas ou mais gincanas acessíveis e nenhuma persistida, exige seleção', async () => {
    gincanasService.minhas.mockResolvedValueOnce([
      { _id: 'GINC_1', nome: 'G1', encerrada: false },
      { _id: 'GINC_2', nome: 'G2', encerrada: false },
    ]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).toBeNull();
    expect(result.current.precisaSelecionarGincana).toBe(true);
  });

  it('separa gincanasAcessiveis e gincanasEncerradas', async () => {
    gincanasService.minhas.mockResolvedValueOnce([
      { _id: 'G1', nome: 'Em Andamento', encerrada: false },
      { _id: 'G2', nome: 'Já Passou', encerrada: true },
    ]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanasAcessiveis.map((g) => g.nome)).toEqual(['Em Andamento']);
    expect(result.current.gincanasEncerradas.map((g) => g.nome)).toEqual(['Já Passou']);
  });

  it('trocar de escola ativa recarrega a lista de gincanas', async () => {
    gincanasService.minhas.mockResolvedValueOnce([{ _id: 'G_ESCOLA_1', nome: 'Da Escola 1', encerrada: false }]);

    const { result, rerender } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(gincanasService.minhas).toHaveBeenCalledTimes(1);

    gincanasService.minhas.mockResolvedValueOnce([{ _id: 'G_ESCOLA_2', nome: 'Da Escola 2', encerrada: false }]);
    escolaAtivaId = 'ESC_2';
    rerender();

    await waitFor(() => expect(gincanasService.minhas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.gincanaAtivaId).toBe('G_ESCOLA_2'));
  });

  it('setGincanaAtiva persiste e navega (padrão "/")', async () => {
    gincanasService.minhas.mockResolvedValueOnce([
      { _id: 'G1', nome: 'G1', encerrada: false },
      { _id: 'G2', nome: 'G2', encerrada: false },
    ]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    act(() => result.current.setGincanaAtiva('G2'));

    expect(localStorage.getItem('gincanaAtivaId')).toBe('G2');
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('limparGincanaAtiva remove o escopo salvo e navega para /selecionar-gincana', async () => {
    gincanasService.minhas.mockResolvedValueOnce([{ _id: 'G1', nome: 'G1', encerrada: false }]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    act(() => result.current.limparGincanaAtiva());

    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith('/selecionar-gincana', { replace: true });
  });

  it('quando o usuário desloga, limpa a lista e a gincana ativa', async () => {
    gincanasService.minhas.mockResolvedValueOnce([{ _id: 'G1', nome: 'G1', encerrada: false }]);

    const { result, rerender } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    isAuthenticated = false;
    rerender();

    await waitFor(() => expect(result.current.gincanaAtivaId).toBeNull());
    expect(result.current.minhasGincanas).toEqual([]);
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
  });
});

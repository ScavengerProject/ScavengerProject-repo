import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../services/api', () => ({
  gincanasService: { minhas: vi.fn(), disponiveis: vi.fn() },
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
  // Padrão dos testes que não exercitam o ramo de "disponíveis".
  gincanasService.disponiveis.mockResolvedValue([]);
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

  // Regressão: `minhas` só traz gincanas em que a pessoa JÁ tem equipe, então
  // para um aluno recém-aprovado ela vem sempre vazia. Antes, a gincana que ele
  // tinha acabado de escolher era apagada no primeiro reload e ele voltava para
  // /selecionar-gincana — sem nunca alcançar a inscrição em equipe.
  it('mantém a gincana escolhida por quem ainda não tem equipe (está nas disponíveis)', async () => {
    localStorage.setItem('gincanaAtivaId', 'GINC_NOVA');
    gincanasService.minhas.mockResolvedValueOnce([]);
    gincanasService.disponiveis.mockResolvedValueOnce([{ _id: 'GINC_NOVA', nome: 'Gincana 2026', ano: 2026 }]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).toBe('GINC_NOVA');
    expect(result.current.precisaSelecionarGincana).toBe(false);
    expect(localStorage.getItem('gincanaAtivaId')).toBe('GINC_NOVA');
    // Entra na lista para o seletor da navbar conseguir mostrar o nome do escopo.
    expect(result.current.gincanasAcessiveis.map((g) => g._id)).toEqual(['GINC_NOVA']);
  });

  it('descarta a gincana persistida que não está nem nas minhas nem nas disponíveis', async () => {
    localStorage.setItem('gincanaAtivaId', 'GINC_DE_OUTRA_ESCOLA');
    gincanasService.minhas.mockResolvedValueOnce([]);
    gincanasService.disponiveis.mockResolvedValueOnce([{ _id: 'GINC_DAQUI', nome: 'Daqui' }]);

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).toBeNull();
    expect(result.current.precisaSelecionarGincana).toBe(true);
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
  });

  // Uma falha na consulta não prova que a escolha é inválida. Descartá-la aqui
  // era o outro elo do laço "volta para /selecionar-gincana": bastava uma
  // requisição cancelada por navegação (ou um soluço de rede) para apagar a
  // gincana que a pessoa tinha acabado de escolher.
  it('mantém a gincana persistida quando a consulta de disponíveis falha', async () => {
    localStorage.setItem('gincanaAtivaId', 'GINC_NOVA');
    gincanasService.minhas.mockResolvedValueOnce([]);
    gincanasService.disponiveis.mockRejectedValueOnce(new Error('rede'));

    const { result } = renderHook(() => useGincana(), { wrapper });
    await waitFor(() => expect(result.current.carregado).toBe(true));

    expect(result.current.gincanaAtivaId).toBe('GINC_NOVA');
    expect(result.current.precisaSelecionarGincana).toBe(false);
    expect(localStorage.getItem('gincanaAtivaId')).toBe('GINC_NOVA');
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

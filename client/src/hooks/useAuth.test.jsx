import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mocks das dependências externas do hook.
vi.mock('../services/api', () => ({
  authService: {
    login: vi.fn(),
  },
}));
vi.mock('../components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AuthProvider, useAuth } from './useAuth';
import { authService } from '../services/api';
import { toast } from '../components/ui/toast';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useAuth', () => {
  it('lança erro quando usado fora do AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });

  it('começa não autenticado quando não há token salvo', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.usuario).toBeNull();
  });

  it('login: autentica, grava no localStorage e retorna true', async () => {
    authService.login.mockResolvedValueOnce({ token: 'tok-123', usuario: { id: 1, nome: 'Ana', tipo: 'ADMIN' } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let retorno;
    await act(async () => {
      retorno = await result.current.login('ana@x.com', 'senha');
    });

    expect(retorno).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.usuario).toMatchObject({ nome: 'Ana', tipo: 'ADMIN' });
    expect(localStorage.getItem('token')).toBe('tok-123');
    expect(localStorage.getItem('sessionExpiryTime')).not.toBeNull();
    expect(toast.success).toHaveBeenCalled();

    // Limpa o timeout de sessão para não deixar timer pendente
    act(() => result.current.logout());
  });

  it('login: em falha retorna false e mostra toast de erro', async () => {
    authService.login.mockRejectedValueOnce(new Error('Credenciais inválidas'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let retorno;
    await act(async () => {
      retorno = await result.current.login('x@x.com', 'errada');
    });

    expect(retorno).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Credenciais inválidas');
  });

  it('logout limpa estado e localStorage', async () => {
    authService.login.mockResolvedValueOnce({ token: 't', usuario: { id: 1, tipo: 'ALUNO' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.login('a@x.com', 's'); });
    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('isSessionExpired reflete o sessionExpiryTime', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    localStorage.setItem('sessionExpiryTime', String(Date.now() + 100000));
    expect(result.current.isSessionExpired()).toBe(false);

    localStorage.setItem('sessionExpiryTime', String(Date.now() - 1000));
    expect(result.current.isSessionExpired()).toBe(true);
  });
});

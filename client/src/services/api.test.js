import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, provasService } from './api';

// Mocka o fetch global para isolar a camada de rede.
beforeEach(() => {
  global.fetch = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const okJson = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe('request helper (via services)', () => {
  it('faz a requisição e retorna o JSON em caso de sucesso', async () => {
    global.fetch.mockResolvedValueOnce(okJson([{ id: 1 }]));

    const provas = await provasService.listar();

    expect(provas).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('GET');
  });

  it('inclui o header Authorization quando há token', async () => {
    localStorage.setItem('token', 'meu-token');
    global.fetch.mockResolvedValueOnce(okJson([]));

    await provasService.listar();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer meu-token');
  });

  it('NÃO inclui Authorization quando não há token', async () => {
    global.fetch.mockResolvedValueOnce(okJson([]));

    await provasService.listar();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('lança erro com a mensagem do backend quando !response.ok', async () => {
    global.fetch.mockResolvedValueOnce(okJson({ message: 'Falhou no servidor' }, 400));

    await expect(provasService.listar()).rejects.toThrow('Falhou no servidor');
  });

  it('limpa a sessão e lança erro quando a sessão já expirou (antes do fetch)', async () => {
    localStorage.setItem('token', 'x');
    localStorage.setItem('sessionExpiryTime', String(Date.now() - 1000)); // expirado

    await expect(provasService.listar()).rejects.toThrow(/sessão expirou/i);

    expect(localStorage.getItem('token')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('em 401 (fora do login) limpa a sessão e lança erro', async () => {
    localStorage.setItem('token', 'x');
    global.fetch.mockResolvedValueOnce(okJson({ message: 'nao usado' }, 401));

    await expect(provasService.listar()).rejects.toThrow(/sessão expirou/i);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('retorna null em respostas 204 (sem conteúdo)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}), text: async () => '' });

    const r = await provasService.obter('123');
    expect(r).toBeNull();
  });
});

describe('authService', () => {
  it('login envia email e senha no corpo', async () => {
    global.fetch.mockResolvedValueOnce(okJson({ token: 't', usuario: { id: 1 } }));

    const r = await authService.login('a@x.com', 'senha');

    expect(r.token).toBe('t');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(options.body)).toEqual({ email: 'a@x.com', senha: 'senha' });
  });

  it('logout limpa o armazenamento local', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('usuario', '{}');

    authService.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it('getUsuarioAtual faz parse do usuário salvo', () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 9, nome: 'Ana' }));
    expect(authService.getUsuarioAtual()).toEqual({ id: 9, nome: 'Ana' });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, provasService, convitesService } from './api';

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

  // X-Escola-Id e X-Gincana-Id são o mecanismo inteiro de isolamento
  // multi-tenant no cliente (ver resolverEscola/resolverGincana no backend):
  // toda a garantia de "não vejo dados de outra escola/edição" depende de
  // esses dois headers saírem certos em toda requisição.
  it('inclui X-Escola-Id e X-Gincana-Id quando ambos estão salvos', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    localStorage.setItem('gincanaAtivaId', 'GINC_1');
    global.fetch.mockResolvedValueOnce(okJson([]));

    await provasService.listar();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Escola-Id']).toBe('ESC_1');
    expect(options.headers['X-Gincana-Id']).toBe('GINC_1');
  });

  it('NÃO inclui X-Escola-Id nem X-Gincana-Id quando não há escopo salvo', async () => {
    global.fetch.mockResolvedValueOnce(okJson([]));

    await provasService.listar();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Escola-Id']).toBeUndefined();
    expect(options.headers['X-Gincana-Id']).toBeUndefined();
  });

  it('inclui X-Escola-Id sem X-Gincana-Id quando só a escola foi selecionada (fluxo pós-troca de escola)', async () => {
    localStorage.setItem('escolaAtivaId', 'ESC_1');
    global.fetch.mockResolvedValueOnce(okJson([]));

    await provasService.listar();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-Escola-Id']).toBe('ESC_1');
    expect(options.headers['X-Gincana-Id']).toBeUndefined();
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

  // Escopo perdido: o backend devolve um `codigo` e a camada de rede leva o
  // usuário de volta à seleção, em vez de deixar a tela com um erro genérico.
  it.each([
    ['SEM_VINCULO_ESCOLA', '/selecionar-escola'],
    ['VINCULO_INATIVO', '/selecionar-escola'],
    ['ESCOLA_NAO_SELECIONADA', '/selecionar-escola'],
    ['GINCANA_NAO_SELECIONADA', '/selecionar-gincana'],
    ['GINCANA_ENCERRADA', '/selecionar-gincana'],
  ])('o codigo %s manda o usuário para %s', async (codigo, rota) => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/provas', assign });

    localStorage.setItem('escolaAtivaId', 'ESCOLA_A');
    localStorage.setItem('gincanaAtivaId', 'GINCANA_A');
    global.fetch.mockResolvedValueOnce(okJson({ message: 'Escopo inválido', codigo }, 400));

    await expect(provasService.listar()).rejects.toThrow('Escopo inválido');

    expect(assign).toHaveBeenCalledWith(rota);
    expect(localStorage.getItem('gincanaAtivaId')).toBeNull();
    if (rota === '/selecionar-escola') {
      expect(localStorage.getItem('escolaAtivaId')).toBeNull();
    }

    vi.unstubAllGlobals();
  });

  // VINCULO_PENDENTE é uma solicitação em análise, não uma perda de acesso:
  // diferente de VINCULO_INATIVO, não pode limpar o escopo salvo (senão o
  // usuário reabre a mesma escola pendente e entra em loop) — só redireciona.
  it('o codigo VINCULO_PENDENTE manda para /aguardando-aprovacao SEM limpar o localStorage', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/provas', assign });

    localStorage.setItem('escolaAtivaId', 'ESCOLA_A');
    localStorage.setItem('gincanaAtivaId', 'GINCANA_A');
    global.fetch.mockResolvedValueOnce(okJson({ message: 'Vínculo pendente', codigo: 'VINCULO_PENDENTE' }, 403));

    await expect(provasService.listar()).rejects.toThrow('Vínculo pendente');

    expect(assign).toHaveBeenCalledWith('/aguardando-aprovacao');
    expect(localStorage.getItem('escolaAtivaId')).toBe('ESCOLA_A');
    expect(localStorage.getItem('gincanaAtivaId')).toBe('GINCANA_A');

    vi.unstubAllGlobals();
  });

  // Escola e gincana estão certas — falta a equipe. Participação na gincana vem
  // de EquipeMembros, então quem foi recém-aprovado leva 403 em toda tela até
  // entrar numa equipe. O escopo salvo continua válido e NÃO pode ser limpo.
  it('o codigo SEM_EQUIPE_NA_GINCANA manda para /selecionar-equipe sem limpar o escopo', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/provas', assign });

    localStorage.setItem('escolaAtivaId', 'ESCOLA_A');
    localStorage.setItem('gincanaAtivaId', 'GINCANA_A');
    localStorage.setItem('usuario', JSON.stringify({ id: '1', tipo: 'ALUNO' }));
    global.fetch.mockResolvedValueOnce(
      okJson({ message: 'Sem equipe', codigo: 'SEM_EQUIPE_NA_GINCANA' }, 403)
    );

    await expect(provasService.listar()).rejects.toThrow('Sem equipe');

    expect(assign).toHaveBeenCalledWith('/selecionar-equipe');
    expect(localStorage.getItem('escolaAtivaId')).toBe('ESCOLA_A');
    expect(localStorage.getItem('gincanaAtivaId')).toBe('GINCANA_A');

    vi.unstubAllGlobals();
  });

  // O gate /selecionar-equipe atende todos os perfis não-admin (PROFESSOR,
  // COORDENADOR e PAI/MÃE dependem do admin para entrar numa equipe, mas levam
  // o mesmo 403 em toda tela). Antes só o ALUNO era redirecionado e os demais
  // ficavam vendo um erro solto em cada página.
  it('redireciona qualquer perfil no SEM_EQUIPE_NA_GINCANA, não só o ALUNO', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/provas', assign });

    localStorage.setItem('usuario', JSON.stringify({ id: '1', tipo: 'PROFESSOR' }));
    global.fetch.mockResolvedValueOnce(
      okJson({ message: 'Sem equipe', codigo: 'SEM_EQUIPE_NA_GINCANA' }, 403)
    );

    await expect(provasService.listar()).rejects.toThrow('Sem equipe');

    expect(assign).toHaveBeenCalledWith('/selecionar-equipe');

    vi.unstubAllGlobals();
  });

  // Guarda do `redirecionarPara`: já estando na tela do gate, um 403 de alguma
  // requisição pendente não pode recarregar a página (laço de recargas).
  it('não redireciona quando já está em /selecionar-equipe', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/selecionar-equipe', assign });

    localStorage.setItem('usuario', JSON.stringify({ id: '1', tipo: 'ALUNO' }));
    global.fetch.mockResolvedValueOnce(
      okJson({ message: 'Sem equipe', codigo: 'SEM_EQUIPE_NA_GINCANA' }, 403)
    );

    await expect(provasService.listar()).rejects.toThrow('Sem equipe');

    expect(assign).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
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

describe('convitesService', () => {
  it('criar envia POST /convites com o corpo informado', async () => {
    global.fetch.mockResolvedValueOnce(okJson({ codigo: 'ABCD1234' }, 201));

    await convitesService.criar({ turma: 'EF - 6º Ano', limite_usos: 10 });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ turma: 'EF - 6º Ano', limite_usos: 10 });
  });

  it('listar faz GET /convites', async () => {
    global.fetch.mockResolvedValueOnce(okJson([{ codigo: 'X' }]));
    await convitesService.listar();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites$/);
    expect(options.method).toBe('GET');
  });

  it('revogar faz PATCH /convites/:id/revogar', async () => {
    global.fetch.mockResolvedValueOnce(okJson({}));
    await convitesService.revogar('conv1');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/conv1\/revogar$/);
    expect(options.method).toBe('PATCH');
  });

  it('listarUsuarios faz GET /convites/:id/usuarios', async () => {
    global.fetch.mockResolvedValueOnce(okJson([]));
    await convitesService.listarUsuarios('conv1');
    const [url] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/conv1\/usuarios$/);
  });

  it('prevalidar faz GET /convites/:codigo (rota pública)', async () => {
    global.fetch.mockResolvedValueOnce(okJson({ escola_nome: 'Escola A', turma: 'EF - 6º Ano' }));
    const r = await convitesService.prevalidar('abcd1234');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/abcd1234$/);
    expect(options.method).toBe('GET');
    expect(r).toEqual({ escola_nome: 'Escola A', turma: 'EF - 6º Ano' });
  });

  it('resgatar envia POST /convites/resgatar com o código', async () => {
    global.fetch.mockResolvedValueOnce(okJson({ message: 'ok' }));
    await convitesService.resgatar('ABCD1234');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/resgatar$/);
    expect(JSON.parse(options.body)).toEqual({ codigo: 'ABCD1234' });
  });

  it('listarPendentes faz GET /convites/pendentes', async () => {
    global.fetch.mockResolvedValueOnce(okJson([]));
    await convitesService.listarPendentes();
    const [url] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/pendentes$/);
  });

  it('decidirPendente faz PATCH /convites/pendentes/:usuarioId com a decisão', async () => {
    global.fetch.mockResolvedValueOnce(okJson({}));
    await convitesService.decidirPendente('user1', 'APROVAR');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/convites\/pendentes\/user1$/);
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ decisao: 'APROVAR' });
  });

  it('decidirPendente inclui a turma no corpo quando informada (aprovar pendente sem turma)', async () => {
    global.fetch.mockResolvedValueOnce(okJson({}));
    await convitesService.decidirPendente('user1', 'APROVAR', 'EF - 6º Ano');
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ decisao: 'APROVAR', turma: 'EF - 6º Ano' });
  });
});

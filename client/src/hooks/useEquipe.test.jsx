import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../services/api', () => ({
  equipesService: { meuVinculoNaGincana: vi.fn() },
}));

let usuario = { id: 'U1', tipo: 'ALUNO' };
let isAuthenticated = true;
vi.mock('./useAuth.jsx', () => ({
  useAuth: () => ({ isAuthenticated, usuario }),
}));

let escolaAtivaId = 'ESC_1';
vi.mock('./useEscola.jsx', () => ({
  useEscola: () => ({ escolaAtivaId }),
}));

let gincanaAtivaId = 'GINC_1';
vi.mock('./useGincana.jsx', () => ({
  useGincana: () => ({ gincanaAtivaId }),
}));

import { EquipeProvider, useEquipe } from './useEquipe.jsx';
import { equipesService } from '../services/api';

const wrapper = ({ children }) => <EquipeProvider>{children}</EquipeProvider>;

const semEquipe = { tem_equipe: false, equipe_id: null, equipe_nome: null, is_coordenador: false };
const comEquipe = { tem_equipe: true, equipe_id: 'E1', equipe_nome: 'Time Azul', is_coordenador: false };

beforeEach(() => {
  vi.clearAllMocks();
  usuario = { id: 'U1', tipo: 'ALUNO' };
  isAuthenticated = true;
  escolaAtivaId = 'ESC_1';
  gincanaAtivaId = 'GINC_1';
});

describe('useEquipe', () => {
  it('lança erro quando usado fora do EquipeProvider', () => {
    expect(() => renderHook(() => useEquipe())).toThrow(/EquipeProvider/);
  });

  it('exige a escolha de equipe quando a gincana ativa não tem vínculo', async () => {
    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(semEquipe);

    const { result } = renderHook(() => useEquipe(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.temEquipe).toBe(false);
    expect(result.current.precisaSelecionarEquipe).toBe(true);
  });

  it('libera o sistema quando o usuário já está numa equipe da gincana', async () => {
    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(comEquipe);

    const { result } = renderHook(() => useEquipe(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.temEquipe).toBe(true);
    expect(result.current.equipeNome).toBe('Time Azul');
    expect(result.current.precisaSelecionarEquipe).toBe(false);
  });

  // resolverGincana isenta ADMIN/SUPER_ADMIN da checagem de participação: eles
  // operam a gincana sem equipe nenhuma, então o gate não vale para eles — e
  // nem gasta requisição.
  it.each(['ADMIN', 'SUPER_ADMIN'])('não trava nem consulta o vínculo para %s', async (tipo) => {
    usuario = { id: 'U1', tipo };

    const { result } = renderHook(() => useEquipe(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(equipesService.meuVinculoNaGincana).not.toHaveBeenCalled();
    expect(result.current.precisaSelecionarEquipe).toBe(false);
  });

  it('não consulta nada antes de haver gincana ativa', async () => {
    gincanaAtivaId = null;

    const { result } = renderHook(() => useEquipe(), { wrapper });
    await new Promise((r) => setTimeout(r, 0));

    expect(equipesService.meuVinculoNaGincana).not.toHaveBeenCalled();
    expect(result.current.carregado).toBe(false);
    expect(result.current.precisaSelecionarEquipe).toBe(false);
  });

  // Falha da consulta não pode trancar quem já tem equipe: se a rota cair, o
  // gate solta e quem realmente estiver sem equipe é pego pelo 403 da API.
  it('não trava ninguém quando a consulta do vínculo falha', async () => {
    equipesService.meuVinculoNaGincana.mockRejectedValueOnce(new Error('rede'));

    const { result } = renderHook(() => useEquipe(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.precisaSelecionarEquipe).toBe(false);
    expect(result.current.vinculoDesconhecido).toBe(true);
  });

  // Sem esta distinção a tela /selecionar-equipe devolvia para '/' quando a
  // consulta falhava; as telas normais respondem 403, o api.js manda de volta
  // para cá e a página recarregava em laço.
  it('deixa a tela de escolha acessível quando o vínculo é desconhecido', async () => {
    equipesService.meuVinculoNaGincana.mockRejectedValueOnce(new Error('404'));

    const { result } = renderHook(() => useEquipe(), { wrapper });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    // Nada de trava forçada, mas a tela continua sendo o destino válido.
    expect(result.current.precisaSelecionarEquipe).toBe(false);
    expect(result.current.podeVerSelecaoEquipe).toBe(true);
  });

  it('tira da tela de escolha quem tem equipe confirmada e quem é admin', async () => {
    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(comEquipe);
    const { result } = renderHook(() => useEquipe(), { wrapper });
    await waitFor(() => expect(result.current.temEquipe).toBe(true));
    expect(result.current.podeVerSelecaoEquipe).toBe(false);

    usuario = { id: 'U1', tipo: 'ADMIN' };
    const admin = renderHook(() => useEquipe(), { wrapper });
    await waitFor(() => expect(admin.result.current.carregado).toBe(true));
    expect(admin.result.current.podeVerSelecaoEquipe).toBe(false);
    expect(admin.result.current.vinculoDesconhecido).toBe(false);
  });

  // A trava não pode cair no meio de uma reconsulta: se caísse, o App tiraria a
  // pessoa da tela de escolha e montaria o dashboard, que responde 403 e a
  // manda de volta — exatamente o vai-e-vem que o gate existe para acabar.
  it('mantém a trava durante uma reconsulta do vínculo', async () => {
    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(semEquipe);

    const { result } = renderHook(() => useEquipe(), { wrapper });
    await waitFor(() => expect(result.current.precisaSelecionarEquipe).toBe(true));

    let liberar;
    equipesService.meuVinculoNaGincana.mockReturnValueOnce(
      new Promise((resolve) => { liberar = resolve; })
    );
    act(() => { result.current.recarregarVinculoEquipe(); });

    // Consulta em voo: a resposta anterior ("sem equipe") continua valendo.
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.precisaSelecionarEquipe).toBe(true);

    await act(async () => { liberar(comEquipe); });
    expect(result.current.precisaSelecionarEquipe).toBe(false);
  });

  // É o que a tela de inscrição chama depois de entrar numa equipe: sem essa
  // reconsulta o App devolveria a pessoa para o gate.
  it('recarregarVinculoEquipe libera o gate depois da inscrição', async () => {
    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(semEquipe);

    const { result } = renderHook(() => useEquipe(), { wrapper });
    await waitFor(() => expect(result.current.precisaSelecionarEquipe).toBe(true));

    equipesService.meuVinculoNaGincana.mockResolvedValueOnce(comEquipe);
    await act(async () => { await result.current.recarregarVinculoEquipe(); });

    expect(result.current.precisaSelecionarEquipe).toBe(false);
    expect(result.current.temEquipe).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { tipoDaPontuacao, descreverPontuacao, pontuarPorUnidade, descreverTetoPorUnidade } from './pontuacaoProva';

describe('tipoDaPontuacao', () => {
  it('reconhece cada tipo pelas chaves da pontuação', () => {
    expect(tipoDaPontuacao({ 1: 300, 2: 200 })).toBe('RANKING');
    expect(tipoDaPontuacao({ pontos_por_unidade: 50, nome_unidade: 'doação' })).toBe('PROPORCIONAL');
    expect(tipoDaPontuacao({ quantidade_minima: 30, pontuacao_fixa: 300 })).toBe('LIMIAR');
  });

  it('cai em RANKING sem pontuação configurada', () => {
    expect(tipoDaPontuacao(undefined)).toBe('RANKING');
    expect(tipoDaPontuacao({})).toBe('RANKING');
  });

  it('usa a presença da chave, não o valor (0 pts por unidade ainda é por unidade)', () => {
    expect(tipoDaPontuacao({ pontos_por_unidade: 0 })).toBe('PROPORCIONAL');
  });
});

describe('descreverPontuacao', () => {
  it('não descreve prova sem pontuação', () => {
    expect(descreverPontuacao({})).toBeNull();
  });

  it('esconde os valores quando as notas estão ocultas', () => {
    expect(descreverPontuacao({ 1: 300, 2: 200 })).toBe('1º: 300 pts | 2º: 200 pts');
    expect(descreverPontuacao({ 1: 300, 2: 200 }, { mostrarPontos: false })).toBe('1º lugar | 2º lugar');
    expect(descreverPontuacao({ pontos_por_unidade: 50, nome_unidade: 'doação' }, { mostrarPontos: false }))
      .toBe('Pontos por doação');
  });
});

describe('pontuarPorUnidade', () => {
  it('conta só as unidades até o teto_unidades', () => {
    const regras = { pontos_por_unidade: 50, teto_unidades: 10 };
    expect(pontuarPorUnidade(regras, 12)).toEqual({ pontos: 500, tetoAtingido: true });
    expect(pontuarPorUnidade(regras, 10)).toEqual({ pontos: 500, tetoAtingido: false });
    expect(pontuarPorUnidade(regras, 3)).toEqual({ pontos: 150, tetoAtingido: false });
  });

  it('sem teto, conta tudo', () => {
    expect(pontuarPorUnidade({ pontos_por_unidade: 50 }, 30)).toEqual({ pontos: 1500, tetoAtingido: false });
  });

  it('prova não convertida: aplica o teto antigo, em pontos', () => {
    expect(pontuarPorUnidade({ pontos_por_unidade: 30, limite_pontuacao_porcoes: 500 }, 20))
      .toEqual({ pontos: 500, tetoAtingido: true });
  });
});

describe('descreverTetoPorUnidade', () => {
  it('descreve o teto em unidades com o equivalente em pontos', () => {
    expect(descreverTetoPorUnidade({ pontos_por_unidade: 50, nome_unidade: 'doação', teto_unidades: 10 }))
      .toBe('contam até 10 unidades (500 pts)');
    expect(descreverPontuacao({ pontos_por_unidade: 50, nome_unidade: 'doação', teto_unidades: 10 }))
      .toBe('50 pts por doação, contam até 10 unidades (500 pts)');
  });

  it('não descreve teto que não existe', () => {
    expect(descreverTetoPorUnidade({ pontos_por_unidade: 50 })).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { tipoDaPontuacao, descreverPontuacao } from './pontuacaoProva';

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

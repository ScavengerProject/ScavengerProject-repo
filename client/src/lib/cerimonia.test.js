import { describe, it, expect } from 'vitest';
import {
  duracaoDaEtapa,
  fraseSuspense,
  gruposDoPodio,
  montarEtapas,
  posicoesReveladas,
  tituloCampea,
} from './cerimonia';

const equipes = (...posicoes) => posicoes.map((posicao, i) => ({ posicao, nome: `E${i}` }));

describe('montarEtapas', () => {
  it('abertura, demais, 3º, 2º, 1º e final quando há mais de 3 equipes', () => {
    expect(montarEtapas(equipes(1, 2, 3, 4, 5))).toEqual([
      { tipo: 'abertura' },
      { tipo: 'demais' },
      { tipo: 'podio', posicao: 3 },
      { tipo: 'podio', posicao: 2 },
      { tipo: 'podio', posicao: 1 },
      { tipo: 'final' },
    ]);
  });

  it('sem 4º lugar não há etapa "demais"', () => {
    expect(montarEtapas(equipes(1, 2, 3)).map((e) => e.tipo)).not.toContain('demais');
  });

  it('empate no 1º: não existe 2º, e as campeãs dividem uma etapa só', () => {
    expect(montarEtapas(equipes(1, 1, 3))).toEqual([
      { tipo: 'abertura' },
      { tipo: 'podio', posicao: 3 },
      { tipo: 'podio', posicao: 1 },
      { tipo: 'final' },
    ]);
  });

  it('uma equipe só vai direto à campeã', () => {
    expect(montarEtapas(equipes(1)).map((e) => e.tipo)).toEqual(['abertura', 'podio', 'final']);
  });
});

describe('gruposDoPodio', () => {
  it('agrupa por posição e ignora do 4º em diante', () => {
    const grupos = gruposDoPodio(equipes(3, 1, 1, 4));
    expect([...grupos.keys()]).toEqual([1, 3]);
    expect(grupos.get(1)).toHaveLength(2);
  });
});

describe('posicoesReveladas', () => {
  const etapas = montarEtapas(equipes(1, 2, 3, 4));

  it('nada antes do pódio', () => {
    expect([...posicoesReveladas(etapas, 1)]).toEqual([]);
  });

  it('acumula as posições já anunciadas', () => {
    expect([...posicoesReveladas(etapas, 3)].sort()).toEqual([2, 3]);
  });

  it('tudo na etapa final', () => {
    expect([...posicoesReveladas(etapas, etapas.length - 1)].sort()).toEqual([1, 2, 3]);
  });
});

describe('duracaoDaEtapa', () => {
  it('a final fica parada (sem avanço automático)', () => {
    expect(duracaoDaEtapa({ tipo: 'final' })).toBeNull();
  });

  it('a campeã fica mais tempo que as outras posições', () => {
    expect(duracaoDaEtapa({ tipo: 'podio', posicao: 1 }))
      .toBeGreaterThan(duracaoDaEtapa({ tipo: 'podio', posicao: 2 }));
  });

  it('a lista do 4º em diante cresce com o número de equipes, até um teto', () => {
    expect(duracaoDaEtapa({ tipo: 'demais' }, 10)).toBeGreaterThan(duracaoDaEtapa({ tipo: 'demais' }, 2));
    expect(duracaoDaEtapa({ tipo: 'demais' }, 500)).toBe(12000);
  });
});

describe('tituloCampea', () => {
  it('singular e plural', () => {
    expect(tituloCampea(1)).toBe('Equipe campeã');
    expect(tituloCampea(2)).toBe('Equipes campeãs');
  });
});

describe('fraseSuspense', () => {
  it('concorda com o número de campeãs', () => {
    expect(fraseSuspense(1)).toBe('E a equipe campeã é…');
    expect(fraseSuspense(2)).toBe('E as equipes campeãs são…');
  });
});

import { faixaDaPosicao, mensagemDoPodio } from '../../../src/gincanas/mensagensPodio.js';

describe('faixaDaPosicao', () => {
  it('pódio, meio e última', () => {
    expect(faixaDaPosicao(1, 6)).toBe('CAMPEA');
    expect(faixaDaPosicao(2, 6)).toBe('SEGUNDA');
    expect(faixaDaPosicao(3, 6)).toBe('TERCEIRA');
    expect(faixaDaPosicao(4, 6)).toBe('PARTICIPANTE');
    expect(faixaDaPosicao(6, 6)).toBe('ULTIMA');
  });

  it('quem fecha o pódio não recebe a mensagem de última colocada', () => {
    expect(faixaDaPosicao(3, 3)).toBe('TERCEIRA');
    expect(faixaDaPosicao(2, 2)).toBe('SEGUNDA');
  });

  it('empate no 1º é campeã para todas', () => {
    expect(faixaDaPosicao(1, 1)).toBe('CAMPEA');
  });
});

describe('mensagemDoPodio', () => {
  it('traz emoji, cor, título e uma frase da faixa', () => {
    const msg = mensagemDoPodio({ posicao: 1, ultimaPosicao: 5, semente: 'abc' });
    expect(msg).toMatchObject({ faixa: 'CAMPEA', emoji: '🏆' });
    expect(msg.titulo).toBeTruthy();
    expect(msg.frase).toBeTruthy();
  });

  it('é determinística: a mesma equipe recebe a mesma frase (retry do job)', () => {
    const a = mensagemDoPodio({ posicao: 4, ultimaPosicao: 8, semente: '65f0c1' });
    const b = mensagemDoPodio({ posicao: 4, ultimaPosicao: 8, semente: '65f0c1' });
    expect(a.frase).toBe(b.frase);
  });

  it('varia a frase entre equipes da mesma faixa', () => {
    const frases = new Set(
      ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'].map((semente) => mensagemDoPodio({ posicao: 1, ultimaPosicao: 9, semente }).frase)
    );
    expect(frases.size).toBeGreaterThan(1);
  });
});

import { escaparHtml, montarEmailResultadoFinal } from '../../../src/utils/emailService.js';

const base = {
  nomeDestinatario: 'Ana',
  nomeEquipe: 'Leões',
  corEquipe: '#e11d48',
  posicao: 2,
  totalEquipes: 6,
  pontos: 1105,
  empatadaCom: [],
  podio: [
    { posicao: 1, nome: 'Águias' },
    { posicao: 2, nome: 'Leões' },
    { posicao: 3, nome: 'Tubarões' },
  ],
  gincanaNome: 'Gincana da Primavera',
  gincanaAno: 2026,
  escolaNome: 'Escola Modelo',
  mensagem: {
    emoji: '🥈', cor: '#64748B', corTexto: '#FFFFFF', corNoBranco: '#475569', titulo: 'Segundo lugar!', frase: 'Que campanha!',
  },
  linkCerimonia: 'https://app.exemplo/cerimonia/G1',
};

describe('montarEmailResultadoFinal', () => {
  it('assunto com a posição da equipe', () => {
    expect(montarEmailResultadoFinal(base).assunto).toBe('🥈 Leões ficou em 2º lugar — Gincana da Primavera');
  });

  it('assunto especial para a campeã', () => {
    const { assunto } = montarEmailResultadoFinal({
      ...base, posicao: 1, mensagem: { ...base.mensagem, emoji: '🏆' },
    });
    expect(assunto).toBe('🏆 Leões é a equipe campeã — Gincana da Primavera');
  });

  it('corpo traz posição, total, pontos, frase, pódio e o link da cerimônia', () => {
    const { html } = montarEmailResultadoFinal(base);
    expect(html).toContain('2º lugar');
    expect(html).toContain('entre 6 equipes');
    expect(html).toContain('1.105');
    expect(html).toContain('Que campanha!');
    expect(html).toContain('Tubarões');
    expect(html).toContain('Escola Modelo');
    expect(html).toContain('href="https://app.exemplo/cerimonia/G1"');
  });

  it('sem pontos quando a gincana não mostra notas', () => {
    const { html } = montarEmailResultadoFinal({ ...base, pontos: null });
    expect(html).not.toContain('pontos</p>');
  });

  it('avisa o empate', () => {
    const { html } = montarEmailResultadoFinal({ ...base, empatadaCom: ['Águias'] });
    expect(html).toContain('Empatada com Águias');
  });

  it('escapa nomes digitados por usuários', () => {
    const { html } = montarEmailResultadoFinal({
      ...base, nomeEquipe: '<img src=x onerror=alert(1)>', nomeDestinatario: 'Ana & "Bia"',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Ana &amp; &quot;Bia&quot;');
  });
});

describe('escaparHtml', () => {
  it('trata null/undefined como vazio', () => {
    expect(escaparHtml(null)).toBe('');
    expect(escaparHtml(undefined)).toBe('');
  });
});

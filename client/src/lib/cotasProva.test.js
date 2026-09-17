import { describe, it, expect } from 'vitest';
import { cotasDaProva, provaTemCotas, textoDaCota, motivoDaRecusa } from './cotasProva';

describe('cotasDaProva', () => {
  it('lê o `cotas` resumido pelo servidor, preservando a ocupação', () => {
    const cotas = cotasDaProva({
      cotas: [{ grupo: 'ALUNOS_FUNDAMENTAL', limite: 5, inscritos: 2, restantes: 3 }],
    });

    expect(cotas).toEqual([
      expect.objectContaining({ grupo: 'ALUNOS_FUNDAMENTAL', label: 'Ensino fundamental', restantes: 3 }),
    ]);
  });

  it('cai para o requisito_usuario cru quando a tela só tem a prova', () => {
    const cotas = cotasDaProva({
      requisito_usuario: { ALUNOS_FUNDAMENTAL: 3, ALUNOS_MEDIO: 0, PROFESSORES: 1 },
    });

    // Grupo com 0 não participa — some da lista.
    expect(cotas.map((c) => c.grupo)).toEqual(['ALUNOS_FUNDAMENTAL', 'PROFESSORES']);
  });

  it('devolve vazio quando a prova não aceita ninguém', () => {
    expect(cotasDaProva({ requisito_usuario: { ALUNOS_FUNDAMENTAL: 0 } })).toEqual([]);
    expect(cotasDaProva({})).toEqual([]);
    expect(provaTemCotas({ requisito_usuario: {} })).toBe(false);
  });
});

describe('textoDaCota', () => {
  it('mostra as vagas restantes quando o servidor mandou a ocupação', () => {
    expect(textoDaCota({ label: 'Ensino médio', limite: 5, restantes: 2 }))
      .toBe('Ensino médio: 2 de 5 vaga(s)');
  });

  it('diz "sem vagas" em vez de "0 de 5"', () => {
    expect(textoDaCota({ label: 'Ensino médio', limite: 5, restantes: 0 }))
      .toBe('Ensino médio: sem vagas');
  });

  it('mostra só o limite quando não há ocupação', () => {
    expect(textoDaCota({ label: 'Professores', limite: 2 })).toBe('Professores: 2 vaga(s)');
  });
});

describe('motivoDaRecusa', () => {
  it('não devolve nada para quem pode se inscrever', () => {
    expect(motivoDaRecusa({ ok: true })).toBeNull();
    expect(motivoDaRecusa(null)).toBeNull();
  });

  it('traduz o código do servidor para a voz do participante', () => {
    // A mensagem do servidor ("Participação não permitida para alunos do
    // ensino fundamental nesta prova") é escrita na terceira pessoa.
    expect(motivoDaRecusa({ ok: false, code: 'GRUPO_NAO_PERMITIDO', message: 'x' }))
      .toBe('Sua turma não participa desta prova');
    expect(motivoDaRecusa({ ok: false, code: 'VAGAS_ESGOTADAS', message: 'x' }))
      .toBe('As vagas da sua turma já foram preenchidas');
  });

  it('usa a mensagem do servidor para um código desconhecido', () => {
    expect(motivoDaRecusa({ ok: false, code: 'ALGO_NOVO', message: 'Motivo vindo do servidor' }))
      .toBe('Motivo vindo do servidor');
  });
});

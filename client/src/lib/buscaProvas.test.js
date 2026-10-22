import { describe, it, expect } from 'vitest';
import { provaCorrespondeBusca, filtrarProvasPorBusca } from './buscaProvas';

const provas = [
  { titulo: 'Corrida de Revezamento', descricao: 'Quatro atletas por equipe' },
  { titulo: 'Gincana da Água', descricao: 'Transportar baldes' },
  { titulo: 'Arrecadação', descricao: 'Doação de alimentos não perecíveis' },
];

describe('busca de provas', () => {
  it('acha pelo título sem diferenciar maiúsculas', () => {
    expect(filtrarProvasPorBusca(provas, 'REVEZAMENTO').map((p) => p.titulo)).toEqual(['Corrida de Revezamento']);
  });

  it('ignora acentos nos dois sentidos', () => {
    expect(filtrarProvasPorBusca(provas, 'agua').map((p) => p.titulo)).toEqual(['Gincana da Água']);
    expect(filtrarProvasPorBusca(provas, 'doação').map((p) => p.titulo)).toEqual(['Arrecadação']);
  });

  it('acha pela descrição', () => {
    expect(filtrarProvasPorBusca(provas, 'baldes').map((p) => p.titulo)).toEqual(['Gincana da Água']);
  });

  it('busca vazia ou só com espaços não filtra', () => {
    expect(filtrarProvasPorBusca(provas, '   ')).toHaveLength(3);
  });

  it('tolera prova sem descrição', () => {
    expect(provaCorrespondeBusca({ titulo: 'Sem descrição' }, 'descr')).toBe(true);
  });
});

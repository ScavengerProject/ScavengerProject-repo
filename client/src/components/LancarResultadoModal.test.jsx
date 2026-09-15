import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('./ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const listarEquipesMock = vi.fn();
const listarResultadosMock = vi.fn();
vi.mock('../services/api', () => ({
  equipesService: {
    listarEquipesGincana: (...a) => listarEquipesMock(...a),
  },
  resultadosService: {
    listarResultadosDaProva: (...a) => listarResultadosMock(...a),
    lancarResultados: vi.fn(),
  },
}));

import LancarResultadoModal from './LancarResultadoModal';

// Prova "Por Unidade" (proporcional) com uma categoria de bônus, igual ao caso
// que revelou o problema: o lançamento voltava com a quantidade da unidade,
// mas sem as quantidades de bônus.
const PROVA = {
  _id: 'prova1',
  titulo: 'Campanha do Agasalho',
  pontuacao: { pontos_por_unidade: 2, nome_unidade: 'agasalhos' },
  bonus_categorias: [
    { chave: 'EX_ALUNOS', nome: 'Ex-alunos', pontos_por_unidade: 20, teto_unidades: 5 },
  ],
};

const abrir = () => render(<LancarResultadoModal prova={PROVA} isOpen onClose={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  listarEquipesMock.mockResolvedValue([{ _id: 'eq1', nome: 'Equipe Azul', cor: '#00f' }]);
});

describe('LancarResultadoModal', () => {
  it('reabre o lançamento com as quantidades de bônus já informadas', async () => {
    // Regressão: os quesitos nasciam vazios, então uma prova lançada com bônus
    // reabria mostrando "Bônus: 0 pts" — e salvar de novo apagava esses pontos.
    listarResultadosMock.mockResolvedValue([
      { equipe_id: 'eq1', equipe_nome: 'Equipe Azul', valor: '20', quesitos: { EX_ALUNOS: '3' }, pontos_obtidos: 100 },
    ]);

    abrir();

    const campoBonus = await screen.findByLabelText(/Ex-alunos/i);
    await waitFor(() => expect(campoBonus).toHaveValue(3));
    expect(screen.getByText(/Bônus: 60 pts/i)).toBeInTheDocument();
    // 20 agasalhos × 2 + 3 ex-alunos × 20
    expect(screen.getByText(/100 pts/)).toBeInTheDocument();
  });

  it('abre vazio quando a prova ainda não tem lançamento', async () => {
    listarResultadosMock.mockResolvedValue([]);

    abrir();

    const campoBonus = await screen.findByLabelText(/Ex-alunos/i);
    expect(campoBonus).toHaveValue(null);
  });
});

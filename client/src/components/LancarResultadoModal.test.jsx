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

// Prova de ranking: a pontuação base sai da POSIÇÃO da linha.
const PROVA_RANKING = {
  _id: 'prova2',
  titulo: 'Arrecadação de Alimentos',
  pontuacao: { 1: 100, 2: 70, 3: 50 },
  bonus_categorias: [
    { chave: 'EX_ALUNOS', nome: 'Ex-alunos', pontos_por_unidade: 20, teto_unidades: 5 },
  ],
};

const abrir = (prova = PROVA) => render(<LancarResultadoModal prova={prova} isOpen onClose={vi.fn()} />);

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

  // A tela rotula as linhas pela ordem ("1º Lugar", "2º Lugar") e tira a
  // pontuação base desse rótulo, mas o cálculo do total e o que é enviado
  // saíam do valor salvo. Quando o lançamento tinha furos — uma equipe do meio
  // apagada some da listagem — as duas leituras discordavam: a linha aparecia
  // como 2º Lugar valendo 70, e pontuava/salvava como 3º, valendo 50.
  it('reindexa as posições do ranking ao reabrir um lançamento com furo', async () => {
    listarEquipesMock.mockResolvedValue([
      { _id: 'eq1', nome: 'Equipe Azul', cor: '#00f' },
      { _id: 'eq3', nome: 'Equipe Preta', cor: '#000' },
    ]);
    listarResultadosMock.mockResolvedValue([
      { equipe_id: 'eq1', equipe_nome: 'Equipe Azul', valor: '1', quesitos: {}, pontos_obtidos: 100 },
      { equipe_id: 'eq3', equipe_nome: 'Equipe Preta', valor: '3', quesitos: {}, pontos_obtidos: 50 },
    ]);

    abrir(PROVA_RANKING);

    await screen.findByText(/2º Lugar/);
    expect(screen.getByText(/Pontuação Base: 70 pts/)).toBeInTheDocument();
    // O total da segunda linha tem que ser o mesmo 70 da base, e não os 50 da
    // 3ª posição que estava salva.
    expect(screen.getByText(/^70 pts$/)).toBeInTheDocument();
    expect(screen.queryByText(/^50 pts$/)).not.toBeInTheDocument();
  });

  it('abre vazio quando a prova ainda não tem lançamento', async () => {
    listarResultadosMock.mockResolvedValue([]);

    abrir();

    const campoBonus = await screen.findByLabelText(/Ex-alunos/i);
    expect(campoBonus).toHaveValue(null);
  });
});

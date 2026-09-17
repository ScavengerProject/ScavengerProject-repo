import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../components/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../components/ProvaDetalhesModal', () => ({
  default: () => <div data-testid="modal-prova" />,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Aluno', tipo: 'ALUNO' }, logout: vi.fn() }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

const minhasInscricoesMock = vi.fn();
vi.mock('../services/api', () => ({
  provasService: {
    minhasInscricoes: (...a) => minhasInscricoesMock(...a),
  },
}));

import MinhasInscricoes from './MinhasInscricoes';

const prova = (titulo) => ({
  _id: titulo, titulo, descricao: 'desc', formato: 'PROVA_PRATICA',
  data_inicio: '2026-03-01T10:00:00.000Z', data_fim: '2026-03-01T12:00:00.000Z',
  status: 'CONCLUIDA',
});

const linha = (titulo, extras = {}) => ({
  prova: prova(titulo),
  inscrito_em: '2026-02-01T10:00:00.000Z',
  equipe: { id: 'eq1', nome: 'Time Azul', cor: '#00f' },
  origem_vinculo: 'ATUAL',
  papel: null,
  emprestado: false,
  equipe_origem_emprestimo: null,
  equipe_atual_diferente: false,
  ...extras,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MinhasInscricoes', () => {
  it('lista apenas o que o endpoint devolve, sem carimbar "Inscrito" em tudo', async () => {
    // A tela antiga listava TODAS as provas com cota e marcava todas como
    // inscritas — o título prometia uma coisa e o conteúdo era outro.
    minhasInscricoesMock.mockResolvedValue({
      equipe_atual: { id: 'eq1', nome: 'Time Azul' },
      total: 1,
      inscricoes: [linha('Corrida de Saco')],
    });

    render(<MinhasInscricoes />);

    expect(await screen.findByText('Corrida de Saco')).toBeInTheDocument();
    expect(minhasInscricoesMock).toHaveBeenCalledTimes(1);
  });

  it('mostra a equipe pela qual participou e o papel', async () => {
    minhasInscricoesMock.mockResolvedValue({
      equipe_atual: { id: 'eq1', nome: 'Time Azul' },
      total: 1,
      inscricoes: [linha('Cabo de Guerra', { papel: 'TITULAR', origem_vinculo: 'ESCALACAO' })],
    });

    render(<MinhasInscricoes />);

    expect(await screen.findByText(/Participou pela/)).toBeInTheDocument();
    expect(screen.getByText(/Titular/)).toBeInTheDocument();
  });

  it('avisa quando participou emprestado, dizendo a equipe de origem', async () => {
    minhasInscricoesMock.mockResolvedValue({
      equipe_atual: { id: 'eq1', nome: 'Time Azul' },
      total: 1,
      inscricoes: [linha('Revezamento', {
        equipe: { id: 'eq2', nome: 'Time Vermelho' },
        emprestado: true,
        equipe_origem_emprestimo: { id: 'eq1', nome: 'Time Azul' },
        equipe_atual_diferente: true,
        origem_vinculo: 'EMPRESTIMO',
      })],
    });

    render(<MinhasInscricoes />);

    expect(await screen.findByText(/Time Vermelho/)).toBeInTheDocument();
    expect(screen.getByText(/Emprestado pela Time Azul/)).toBeInTheDocument();
  });

  it('explica a equipe antiga quando a pessoa migrou depois da prova', async () => {
    // Sem esta linha, a pessoa veria uma equipe que não é a dela hoje e
    // concluiria que a tela está errada.
    minhasInscricoesMock.mockResolvedValue({
      equipe_atual: { id: 'eq2', nome: 'Time Novo' },
      total: 1,
      inscricoes: [linha('Prova Antiga', {
        equipe: { id: 'eq1', nome: 'Time Antigo' },
        equipe_atual_diferente: true,
        origem_vinculo: 'HISTORICO',
      })],
    });

    render(<MinhasInscricoes />);

    expect(await screen.findByText(/Time Antigo/)).toBeInTheDocument();
    expect(screen.getByText(/Hoje você está na Time Novo/)).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há inscrição', async () => {
    minhasInscricoesMock.mockResolvedValue({ equipe_atual: null, total: 0, inscricoes: [] });

    render(<MinhasInscricoes />);

    expect(await screen.findByText('Nenhuma inscrição ainda')).toBeInTheDocument();
  });

  it('oferece tentar de novo quando a carga falha', async () => {
    minhasInscricoesMock.mockRejectedValueOnce(new Error('Falha de rede'));

    render(<MinhasInscricoes />);

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();

    minhasInscricoesMock.mockResolvedValueOnce({
      equipe_atual: null, total: 1, inscricoes: [linha('Depois do retry')],
    });
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByText('Depois do retry')).toBeInTheDocument();
  });
});

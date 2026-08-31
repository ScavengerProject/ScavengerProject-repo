import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../components/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Admin', tipo: 'ADMIN' }, logout: vi.fn() }),
}));

vi.mock('../hooks/useEscola', () => ({
  useEscola: () => ({ escolaAtivaId: 'ESCOLA_A' }),
}));

const listarPendentesMock = vi.fn();
const decidirPendenteMock = vi.fn();
vi.mock('../services/api', () => ({
  convitesService: {
    listarPendentes: (...a) => listarPendentesMock(...a),
    decidirPendente: (...a) => decidirPendenteMock(...a),
  },
}));

import AprovarVinculosEscola from './AprovarVinculosEscola';
import { toast } from '../components/ui/toast';

const PENDENTE_FILA = {
  _id: 'user1', nome: 'Aluno Novo', email: 'novo@x.com', turma: 'EF - 6º Ano', status: 'PENDENTE',
  escola_id: 'ESCOLA_A',
  vinculos: [{ escola_id: 'ESCOLA_A', tipo: 'ALUNO', turma: 'EF - 6º Ano', status: 'PENDENTE' }],
};
const PENDENTE_TRANSFERENCIA = {
  _id: 'user2', nome: 'Aluno Transferindo', email: 'transf@x.com', turma: 'EF - 7º Ano', status: 'PENDENTE',
  escola_id: 'ESCOLA_A',
  vinculos: [
    { escola_id: 'ESCOLA_B', tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'ATIVO' },
    { escola_id: 'ESCOLA_A', tipo: 'ALUNO', turma: 'EF - 7º Ano', status: 'PENDENTE' },
  ],
};
// Cadastro pelo código PÚBLICO da escola: chega sem turma (ver plano de
// convites, Tarefa 2 — bug real de aluno ficar sem turma).
const PENDENTE_SEM_TURMA = {
  _id: 'user3', nome: 'Aluno Sem Turma', email: 'semturma@x.com', turma: null, status: 'PENDENTE',
  escola_id: 'ESCOLA_A',
  vinculos: [{ escola_id: 'ESCOLA_A', tipo: 'ALUNO', turma: null, status: 'PENDENTE' }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AprovarVinculosEscola', () => {
  it('mostra "Nenhum vínculo pendente" quando a fila está vazia', async () => {
    listarPendentesMock.mockResolvedValue([]);
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText(/Nenhum vínculo pendente/i)).toBeInTheDocument());
  });

  it('lista os pendentes e identifica quem está em transferência de outra escola', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_FILA, PENDENTE_TRANSFERENCIA]);
    render(<AprovarVinculosEscola />);

    await waitFor(() => expect(screen.getByText('Aluno Novo')).toBeInTheDocument());
    expect(screen.getByText('Aluno Transferindo')).toBeInTheDocument();
    expect(screen.getByText('Transferência de outra escola')).toBeInTheDocument();
  });

  it('aprova uma solicitação e recarrega a lista', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_FILA]);
    decidirPendenteMock.mockResolvedValue({ message: 'Vínculo de Aluno Novo com a escola aprovado.' });
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText('Aluno Novo')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(decidirPendenteMock).toHaveBeenCalledWith('user1', 'APROVAR'));
    expect(toast.success).toHaveBeenCalledWith('Vínculo de Aluno Novo com a escola aprovado.');
    await waitFor(() => expect(listarPendentesMock).toHaveBeenCalledTimes(2));
  });

  it('rejeita uma solicitação', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_FILA]);
    decidirPendenteMock.mockResolvedValue({ message: 'Solicitação de Aluno Novo rejeitada.' });
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText('Aluno Novo')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }));

    await waitFor(() => expect(decidirPendenteMock).toHaveBeenCalledWith('user1', 'REJEITAR'));
  });

  // Bug real corrigido: cadastro pelo código público chega sem turma; aprovar
  // sem escolher uma deixaria o aluno "invisível" para turmas_permitidas.
  it('exige a turma antes de aprovar um pendente sem turma', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_SEM_TURMA]);
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText('Aluno Sem Turma')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /aprovar/i })).toBeDisabled();
    expect(decidirPendenteMock).not.toHaveBeenCalled();
  });

  it('aprova um pendente sem turma depois de escolhida, enviando-a ao backend', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_SEM_TURMA]);
    decidirPendenteMock.mockResolvedValue({ message: 'Vínculo de Aluno Sem Turma com a escola aprovado.' });
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText('Aluno Sem Turma')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/turma \(obrigatória/i), { target: { value: 'EF - 6º Ano' } });
    expect(screen.getByRole('button', { name: /aprovar/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(decidirPendenteMock).toHaveBeenCalledWith('user3', 'APROVAR', 'EF - 6º Ano'));
  });

  it('não mostra seletor de turma nem exige turma para um pendente que já tem uma', async () => {
    listarPendentesMock.mockResolvedValue([PENDENTE_FILA]);
    decidirPendenteMock.mockResolvedValue({ message: 'Vínculo de Aluno Novo com a escola aprovado.' });
    render(<AprovarVinculosEscola />);
    await waitFor(() => expect(screen.getByText('Aluno Novo')).toBeInTheDocument());

    expect(screen.queryByLabelText(/turma \(obrigatória/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aprovar/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(decidirPendenteMock).toHaveBeenCalledWith('user1', 'APROVAR'));
  });
});

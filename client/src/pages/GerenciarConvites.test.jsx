import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../components/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Admin', tipo: 'ADMIN' }, logout: vi.fn() }),
}));

const listarMock = vi.fn();
const criarMock = vi.fn();
const revogarMock = vi.fn();
const listarUsuariosMock = vi.fn();
vi.mock('../services/api', () => ({
  convitesService: {
    listar: (...a) => listarMock(...a),
    criar: (...a) => criarMock(...a),
    revogar: (...a) => revogarMock(...a),
    listarUsuarios: (...a) => listarUsuariosMock(...a),
  },
}));

import GerenciarConvites from './GerenciarConvites';
import { toast } from '../components/ui/toast';

const CONVITE_TURMA = {
  _id: 'conv1', codigo: 'ABCD1234', turma: 'EF - 6º Ano', usos: 2, limite_usos: 10,
  expira_em: new Date(Date.now() + 86400000).toISOString(), revogado_em: null,
};
const CONVITE_PUBLICO = {
  _id: 'conv2', codigo: 'PUBL1234', turma: null, usos: 0, limite_usos: null,
  expira_em: new Date(Date.now() + 86400000).toISOString(), revogado_em: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  listarMock.mockResolvedValue([CONVITE_TURMA, CONVITE_PUBLICO]);
});

describe('GerenciarConvites', () => {
  it('lista os convites existentes com turma, usos e status', async () => {
    render(<GerenciarConvites />);

    await waitFor(() => expect(screen.getByText('ABCD1234')).toBeInTheDocument());
    expect(screen.getByText(/EF - 6º Ano/)).toBeInTheDocument();
    expect(screen.getByText(/Público da escola/)).toBeInTheDocument();
  });

  it('cria um novo convite e recarrega a lista', async () => {
    criarMock.mockResolvedValue({ codigo: 'NOVO1234' });
    render(<GerenciarConvites />);
    await waitFor(() => expect(screen.getByText('ABCD1234')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /novo convite/i }));
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => expect(criarMock).toHaveBeenCalledTimes(1));
    expect(criarMock.mock.calls[0][0]).toMatchObject({ turma: null, limite_usos: null });
    await waitFor(() => expect(listarMock).toHaveBeenCalledTimes(2));
  });

  it('revoga um convite ativo', async () => {
    revogarMock.mockResolvedValue({});
    render(<GerenciarConvites />);
    await waitFor(() => expect(screen.getByText('ABCD1234')).toBeInTheDocument());

    const botoesRevogar = screen.getAllByRole('button', { name: /revogar/i });
    fireEvent.click(botoesRevogar[0]);

    await waitFor(() => expect(revogarMock).toHaveBeenCalledWith('conv1'));
    expect(toast.success).toHaveBeenCalled();
  });

  it('abre o painel "quem entrou" e lista os usuários daquele convite', async () => {
    listarUsuariosMock.mockResolvedValue([{ _id: 'u1', nome: 'Fulano', email: 'fulano@x.com', turma: 'EF - 6º Ano', status: 'ATIVO' }]);
    render(<GerenciarConvites />);
    await waitFor(() => expect(screen.getByText('ABCD1234')).toBeInTheDocument());

    const botoesQuemEntrou = screen.getAllByRole('button', { name: /quem entrou/i });
    fireEvent.click(botoesQuemEntrou[0]);

    await waitFor(() => expect(listarUsuariosMock).toHaveBeenCalledWith('conv1'));
    await waitFor(() => expect(screen.getByText('Fulano')).toBeInTheDocument());
  });
});

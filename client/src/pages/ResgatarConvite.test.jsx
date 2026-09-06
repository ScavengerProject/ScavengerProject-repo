import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../components/MainLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Aluno', tipo: 'ALUNO' }, logout: vi.fn() }),
}));

const recarregarEscolasMock = vi.fn();
const limparEscolaAtivaMock = vi.fn();
let minhasEscolasMock;
vi.mock('../hooks/useEscola', () => ({
  useEscola: () => ({
    minhasEscolas: minhasEscolasMock,
    recarregarEscolas: recarregarEscolasMock,
    limparEscolaAtiva: limparEscolaAtivaMock,
  }),
}));

const prevalidarMock = vi.fn();
const resgatarMock = vi.fn();
vi.mock('../services/api', () => ({
  convitesService: {
    prevalidar: (...args) => prevalidarMock(...args),
    resgatar: (...args) => resgatarMock(...args),
  },
}));

import ResgatarConvite from './ResgatarConvite';
import { toast } from '../components/ui/toast';

const renderPagina = (initialEntry = '/convites/resgatar') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ResgatarConvite />
    </MemoryRouter>
  );

const digitarCodigoValido = async (turma = 'EF - 6º Ano') => {
  prevalidarMock.mockResolvedValue({ escola_nome: 'Escola Destino', turma });
  fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'CODIGO01' } });
  await waitFor(
    () => expect(screen.getByText(/Você está entrando na Escola Escola Destino/i)).toBeInTheDocument(),
    { timeout: 2000 }
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  // Por padrão, o usuário (ALUNO) já tem vínculo ativo com uma escola —
  // então qualquer resgate de código de outra escola é um conflito de
  // escola única (ehPerfilDeEscolaUnica('ALUNO') === true).
  minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', meu_tipo: 'ALUNO' }];
});

describe('ResgatarConvite', () => {
  it('pré-preenche o código a partir de ?convite= na URL', () => {
    renderPagina('/convites/resgatar?convite=abc12345');
    expect(screen.getByLabelText(/código de convite/i)).toHaveValue('ABC12345');
  });

  it('mostra a confirmação de escola/turma via pré-validação com debounce', async () => {
    renderPagina();
    await digitarCodigoValido('EF - 7º Ano');
    expect(screen.getByText(/EF - 7º Ano/)).toBeInTheDocument();
  });

  it('mostra um erro quando o código não pré-valida', async () => {
    prevalidarMock.mockRejectedValue(new Error('Código de convite inválido ou expirado.'));
    renderPagina();

    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'INVALIDO' } });

    await waitFor(() => {
      expect(screen.getByText('Código de convite inválido ou expirado.')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  // Caso real de conflito: aluno já vinculado a outra escola — a tela precisa
  // deixar EXPLÍCITO, antes de confirmar, que aprovar a solicitação remove o
  // vínculo atual (é destrutivo).
  it('exige a confirmação explícita da transferência antes de habilitar o envio', async () => {
    renderPagina();
    await digitarCodigoValido();

    expect(screen.getByText(/isso não pode ser desfeito automaticamente/i)).toBeInTheDocument();
    const botaoEnviar = screen.getByRole('button', { name: /resgatar código/i });
    expect(botaoEnviar).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(botaoEnviar).not.toBeDisabled();
  });

  it('não mostra aviso de transferência para um código da MESMA escola em que o aluno já está (outra turma/ano)', async () => {
    // O backend nem chega a checar conflito nesse caso — recusa direto com
    // 409 "já tem vínculo com esta escola" (ver resgatarConvite). O aviso de
    // transferência só faz sentido quando a escola do código é OUTRA.
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', nome: 'Escola Destino', meu_tipo: 'ALUNO' }];
    renderPagina();
    await digitarCodigoValido(); // prevalidarMock resolve com escola_nome: 'Escola Destino'

    expect(screen.queryByText(/isso não pode ser desfeito automaticamente/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resgatar código/i })).not.toBeDisabled();
  });

  it('não conta um vínculo PENDENTE como conflito de transferência', async () => {
    // PENDENTE é uma solicitação em análise, não um vínculo ativo que seria
    // removido — mesma regra de conflitoMultiEscola no backend.
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', nome: 'Outra Escola', meu_tipo: 'ALUNO', meu_vinculo_status: 'PENDENTE' }];
    renderPagina();
    await digitarCodigoValido();

    expect(screen.queryByText(/isso não pode ser desfeito automaticamente/i)).not.toBeInTheDocument();
  });

  it('não mostra aviso de transferência quando não há vínculo de escola única em outra escola', async () => {
    // Ex.: PROFESSOR ganhando uma segunda escola — não é um perfil preso a
    // uma escola só, então resgatar não entra em conflito.
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', meu_tipo: 'PROFESSOR' }];
    renderPagina();
    await digitarCodigoValido();

    expect(screen.queryByText(/isso não pode ser desfeito automaticamente/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resgatar código/i })).not.toBeDisabled();
  });

  it('trata o desfecho ATIVO (200): mensagem de sucesso e recarrega as escolas do usuário', async () => {
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', meu_tipo: 'PROFESSOR' }];
    resgatarMock.mockResolvedValue({ message: 'Vínculo com Escola Destino criado com sucesso.' });
    renderPagina();
    await digitarCodigoValido();

    fireEvent.click(screen.getByRole('button', { name: /resgatar código/i }));

    await waitFor(() => expect(resgatarMock).toHaveBeenCalledWith('CODIGO01'));
    await waitFor(() => expect(screen.getByText(/Vínculo criado com sucesso/i)).toBeInTheDocument());
    expect(screen.getByText('Vínculo com Escola Destino criado com sucesso.')).toBeInTheDocument();
    expect(recarregarEscolasMock).toHaveBeenCalledTimes(1);
  });

  it('trata o desfecho de transferência pendente (202 TRANSFERENCIA_PENDENTE) com mensagem distinta', async () => {
    resgatarMock.mockResolvedValue({
      codigo: 'TRANSFERENCIA_PENDENTE',
      message: 'Solicitação de transferência para Escola Destino enviada. Ao ser aprovada, seu vínculo com a escola atual será removido.',
    });
    renderPagina();
    await digitarCodigoValido();
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /resgatar código/i }));

    await waitFor(() => expect(resgatarMock).toHaveBeenCalledWith('CODIGO01'));
    await waitFor(() => expect(screen.getByText(/Solicitação de transferência enviada/i)).toBeInTheDocument());
    // Não é a mesma mensagem/tela do desfecho ATIVO nem do VINCULO_PENDENTE.
    expect(screen.queryByText(/Vínculo criado com sucesso/i)).not.toBeInTheDocument();
    expect(recarregarEscolasMock).not.toHaveBeenCalled();
  });

  it('trata o desfecho pendente sem conflito (202 VINCULO_PENDENTE) com mensagem distinta', async () => {
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', meu_tipo: 'PROFESSOR' }];
    resgatarMock.mockResolvedValue({
      codigo: 'VINCULO_PENDENTE',
      message: 'Solicitação enviada para aprovação em Escola Destino.',
    });
    renderPagina();
    await digitarCodigoValido();

    fireEvent.click(screen.getByRole('button', { name: /resgatar código/i }));

    await waitFor(() => expect(resgatarMock).toHaveBeenCalledWith('CODIGO01'));
    await waitFor(() => expect(screen.getByText('Solicitação enviada para aprovação em Escola Destino.')).toBeInTheDocument());
    expect(screen.queryByText(/Solicitação de transferência enviada/i)).not.toBeInTheDocument();
  });

  it('mostra um toast de erro quando o resgate falha', async () => {
    minhasEscolasMock = [{ _id: 'ESCOLA_ATUAL', meu_tipo: 'PROFESSOR' }];
    resgatarMock.mockRejectedValue(new Error('Você já tem um vínculo com esta escola.'));
    renderPagina();
    await digitarCodigoValido();

    fireEvent.click(screen.getByRole('button', { name: /resgatar código/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Você já tem um vínculo com esta escola.'));
  });
});

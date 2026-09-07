import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const registrarMock = vi.fn();
const prevalidarMock = vi.fn();
vi.mock('../services/api', () => ({
  usuariosService: { registrar: (...args) => registrarMock(...args) },
  convitesService: { prevalidar: (...args) => prevalidarMock(...args) },
}));

import CadastroUsuario from './CadastroUsuario';
import { toast } from '../components/ui/toast';

const preencherFormularioBasico = () => {
  fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Fulano de Tal' } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'fulano@escola.com' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '51999999999' } });
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'senha123' } });
  fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'senha123' } });
};

const renderPagina = (initialEntry = '/inscricao') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CadastroUsuario />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CadastroUsuario', () => {
  // Regressão: escolasService.publicas() foi removido (ver plano de convites,
  // D7) — a tela não pode mais depender dele nem ter um <select> de escolas.
  it('renderiza sem chamar nenhum endpoint de escolas e sem <select> de escola', () => {
    renderPagina();

    expect(screen.getByLabelText(/código de convite/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^escola$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('pré-preenche o código a partir de ?convite= na URL', () => {
    prevalidarMock.mockResolvedValue({ escola_nome: 'Escola A', turma: 'EF - 6º Ano' });
    renderPagina('/inscricao?convite=abc12345');

    expect(screen.getByLabelText(/código de convite/i)).toHaveValue('ABC12345');
  });

  it('após digitar um código válido, mostra a confirmação da escola/turma (pré-validação com debounce)', async () => {
    prevalidarMock.mockResolvedValue({ escola_nome: 'Escola Modelo', turma: 'EF - 7º Ano' });
    renderPagina();

    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'CODIGO01' } });

    await waitFor(() => expect(prevalidarMock).toHaveBeenCalledWith('CODIGO01'), { timeout: 2000 });
    await waitFor(() => {
      expect(screen.getByText(/Você está entrando na Escola Escola Modelo/i)).toBeInTheDocument();
    });
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

  it('recusa o envio sem código de convite (não chama o backend)', () => {
    renderPagina();
    preencherFormularioBasico();

    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    expect(toast.error).toHaveBeenCalledWith('Informe o código de convite da sua escola');
    expect(registrarMock).not.toHaveBeenCalled();
  });

  // Caso de teste #1 do plano (regressão do lado do front): a tela não envia
  // mais escola_id nem tipo/turma — só os dados da identidade + o código.
  it('envia nome, email, telefone, senha e codigo — sem escola_id/tipo/turma', async () => {
    registrarMock.mockResolvedValue({ message: 'Cadastro realizado com sucesso!' });
    renderPagina();
    preencherFormularioBasico();
    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'CODIGO01' } });

    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    await waitFor(() => expect(registrarMock).toHaveBeenCalledTimes(1));
    const payload = registrarMock.mock.calls[0][0];
    expect(payload).toEqual({
      nome: 'Fulano de Tal',
      email: 'fulano@escola.com',
      telefone: '(51) 9 9999-9999',
      senha: 'senha123',
      codigo: 'CODIGO01',
    });
    expect(payload.escola_id).toBeUndefined();
    expect(payload.tipo).toBeUndefined();
    expect(payload.turma).toBeUndefined();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Cadastro realizado com sucesso!'));
  });
});

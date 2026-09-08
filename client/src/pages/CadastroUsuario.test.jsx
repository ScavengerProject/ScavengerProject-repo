import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const registrarMock = vi.fn();
// `convitesService` NÃO entra no mock de propósito: a tela não pré-valida mais
// o código de convite, e se voltar a importá-lo o teste quebra.
vi.mock('../services/api', () => ({
  usuariosService: { registrar: (...args) => registrarMock(...args) },
}));

// Erro no formato que services/api.js lança: `message` + `erros` (a lista com
// todos os motivos de recusa apurados pelo backend).
const erroDeCadastro = (mensagens) => {
  const erro = new Error(mensagens[0]);
  erro.erros = mensagens;
  erro.codigo = 'CADASTRO_INVALIDO';
  return erro;
};

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
    renderPagina('/inscricao?convite=abc12345');

    expect(screen.getByLabelText(/código de convite/i)).toHaveValue('ABC12345');
  });

  // O campo do código é um input comum: digitar não pode dizer se o código
  // existe ou não (nem "verificando", nem a escola/turma confirmada).
  it('não dá nenhum retorno sobre o código enquanto a pessoa digita', async () => {
    renderPagina();

    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'CODIGO01' } });
    // Mais do que o debounce da antiga pré-validação (400ms).
    await new Promise((r) => setTimeout(r, 700));

    expect(screen.queryByText(/verificando código/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/você está entrando na escola/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inválido ou expirado/i)).not.toBeInTheDocument();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de erro do código somente depois do envio', async () => {
    registrarMock.mockRejectedValue(erroDeCadastro(['Código de convite inválido ou expirado.']));
    renderPagina();
    preencherFormularioBasico();
    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'INVALIDO' } });

    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Código de convite inválido ou expirado.');
    });
  });

  // O backend apura todos os motivos de recusa de uma vez; a tela precisa
  // mostrar a lista inteira, senão a pessoa reenvia o formulário uma vez por
  // erro para descobrir o que mais está errado.
  it('mostra todas as mensagens quando o cadastro tem mais de um erro', async () => {
    registrarMock.mockRejectedValue(erroDeCadastro([
      'Código de convite inválido ou expirado.',
      'Não foi possível concluir o cadastro com os dados informados.',
    ]));
    renderPagina();
    preencherFormularioBasico();
    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'INVALIDO' } });

    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    const alerta = await waitFor(() => screen.getByRole('alert'));
    expect(alerta).toHaveTextContent('Código de convite inválido ou expirado.');
    expect(alerta).toHaveTextContent('Não foi possível concluir o cadastro com os dados informados.');
    expect(alerta.querySelectorAll('li')).toHaveLength(2);
  });

  // Falha sem lista (rede, 500) continua sendo mostrada como uma mensagem só.
  it('mostra a mensagem única quando o erro não traz lista', async () => {
    registrarMock.mockRejectedValue(new Error('Erro ao registrar usuário.'));
    renderPagina();
    preencherFormularioBasico();
    fireEvent.change(screen.getByLabelText(/código de convite/i), { target: { value: 'CODIGO01' } });

    fireEvent.click(screen.getByRole('button', { name: /cadastrar conta/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erro ao registrar usuário.');
    });
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

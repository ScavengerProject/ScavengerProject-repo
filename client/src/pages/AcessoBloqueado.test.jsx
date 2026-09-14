import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const logoutMock = vi.fn();
const recarregarEscolasMock = vi.fn();
const setEscolaAtivaMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Ana Bloqueada' }, logout: logoutMock }),
}));

let escolasBloqueadasMock;
let escolasDisponiveisMock;
vi.mock('../hooks/useEscola', () => ({
  useEscola: () => ({
    escolasBloqueadas: escolasBloqueadasMock,
    escolasDisponiveis: escolasDisponiveisMock,
    loading: false,
    recarregarEscolas: recarregarEscolasMock,
    setEscolaAtiva: setEscolaAtivaMock,
  }),
}));

import AcessoBloqueado from './AcessoBloqueado';

beforeEach(() => {
  vi.clearAllMocks();
  escolasBloqueadasMock = [
    { _id: 'ESC_1', nome: 'Escola Modelo', meu_vinculo_status: 'BANIDO' },
  ];
  escolasDisponiveisMock = [];
});

describe('AcessoBloqueado', () => {
  // Destino dos codigos VINCULO_INATIVO / VINCULO_BANIDO (ver services/api.js).
  // Antes os dois caíam no tratamento de "perdi acesso" e voltavam para
  // /selecionar-escola, onde a escola recusada era a única da lista — o
  // EscolaProvider a selecionava sozinho e o 403 seguinte recarregava a página
  // de volta para a seleção, em laço.
  it('explica o banimento com o nome do usuário e da escola', () => {
    render(<AcessoBloqueado />);

    expect(screen.getByText(/Acesso encerrado/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Bloqueada/)).toBeInTheDocument();
    expect(screen.getByText(/Escola Modelo/)).toBeInTheDocument();
  });

  // A diferença entre os dois estados é justamente o texto: INATIVO é
  // reversível por um admin, BANIDO é decisão da administração.
  it('usa um texto diferente para o vínculo apenas desativado', () => {
    escolasBloqueadasMock = [
      { _id: 'ESC_1', nome: 'Escola Modelo', meu_vinculo_status: 'INATIVO' },
    ];
    render(<AcessoBloqueado />);

    expect(screen.getByText(/Acesso desativado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Acesso encerrado/i)).not.toBeInTheDocument();
    expect(screen.getByText(/pode ser desfeita por um administrador/i)).toBeInTheDocument();
  });

  it('não quebra quando a lista de bloqueadas ainda não carregou', () => {
    escolasBloqueadasMock = [];
    render(<AcessoBloqueado />);
    expect(screen.getByText(/Acesso desativado/i)).toBeInTheDocument();
  });

  // Perfil multi-escola (ADMIN/PROFESSOR) bloqueado em uma escola e ativo em
  // outra: a tela é só passagem, e precisa oferecer a saída.
  it('oferece as escolas em que o usuário continua com acesso', () => {
    escolasDisponiveisMock = [{ _id: 'ESC_OK', nome: 'Escola Aberta' }];
    render(<AcessoBloqueado />);

    fireEvent.click(screen.getByText('Escola Aberta'));
    expect(setEscolaAtivaMock).toHaveBeenCalledWith('ESC_OK');
  });

  it('o botão Verificar novamente recarrega as escolas do usuário', () => {
    render(<AcessoBloqueado />);
    fireEvent.click(screen.getByText(/Verificar novamente/i));
    expect(recarregarEscolasMock).toHaveBeenCalledTimes(1);
  });

  it('permite sair da conta', () => {
    render(<AcessoBloqueado />);
    fireEvent.click(screen.getByText(/Sair/i));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});

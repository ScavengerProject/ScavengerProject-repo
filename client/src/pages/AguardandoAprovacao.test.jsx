import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const logoutMock = vi.fn();
const recarregarEscolasMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: { nome: 'Ana Pendente' }, logout: logoutMock }),
}));

let escolaAtivaMock;
vi.mock('../hooks/useEscola', () => ({
  useEscola: () => ({
    escolaAtiva: escolaAtivaMock,
    loading: false,
    recarregarEscolas: recarregarEscolasMock,
  }),
}));

import AguardandoAprovacao from './AguardandoAprovacao';

beforeEach(() => {
  vi.clearAllMocks();
  escolaAtivaMock = { nome: 'Escola Modelo' };
});

describe('AguardandoAprovacao', () => {
  // Destino do codigo VINCULO_PENDENTE (ver services/api.js): precisa deixar
  // claro que não é um erro, e mostrar qual escola está em análise.
  it('mostra o nome do usuário e da escola cuja aprovação está pendente', () => {
    render(<AguardandoAprovacao />);

    expect(screen.getByText(/Aguardando aprovação/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Pendente/)).toBeInTheDocument();
    expect(screen.getByText(/Escola Modelo/)).toBeInTheDocument();
  });

  it('funciona mesmo sem a escola já carregada (sem quebrar)', () => {
    escolaAtivaMock = null;
    render(<AguardandoAprovacao />);
    expect(screen.getByText(/Aguardando aprovação/i)).toBeInTheDocument();
  });

  it('o botão Verificar novamente recarrega as escolas do usuário', () => {
    render(<AguardandoAprovacao />);
    fireEvent.click(screen.getByRole('button', { name: /verificar novamente/i }));
    expect(recarregarEscolasMock).toHaveBeenCalledTimes(1);
  });

  it('o botão Sair desloga o usuário', () => {
    render(<AguardandoAprovacao />);
    fireEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});

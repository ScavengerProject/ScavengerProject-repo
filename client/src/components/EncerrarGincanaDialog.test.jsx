import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const previaMock = vi.fn();
const encerrarMock = vi.fn();
vi.mock('../services/api', () => ({
  gincanasService: {
    previaEncerramento: (...args) => previaMock(...args),
    encerrar: (...args) => encerrarMock(...args),
  },
}));

import EncerrarGincanaDialog from './EncerrarGincanaDialog';

const GINCANA = { _id: 'G1', nome: 'Gincana da Primavera' };

const PREVIA = {
  gincana: { _id: 'G1', nome: 'Gincana da Primavera', ano: 2026, status: 'ATIVA' },
  classificacao: [
    { posicao: 1, equipe_id: 'e1', nome: 'Leões', cor: '#f00', pontos: 120, total_coordenadores: 2 },
    { posicao: 2, equipe_id: 'e2', nome: 'Águias', cor: '#00f', pontos: 90, total_coordenadores: 0 },
  ],
  total_emails: 2,
  equipes_sem_coordenador: ['Águias'],
};

const renderDialog = (props = {}) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onEncerrada: vi.fn(),
    onIniciarCerimonia: vi.fn(),
  };
  render(<EncerrarGincanaDialog gincana={GINCANA} {...handlers} {...props} />);
  return handlers;
};

beforeEach(() => {
  vi.clearAllMocks();
  previaMock.mockResolvedValue(PREVIA);
  encerrarMock.mockResolvedValue({ ja_encerrada: false, coordenadores_notificados: 2 });
});

describe('EncerrarGincanaDialog', () => {
  it('mostra a prévia: classificação, quantos emails saem e quem fica sem', async () => {
    renderDialog();

    expect(await screen.findByText('Leões')).toBeInTheDocument();
    expect(previaMock).toHaveBeenCalledWith('G1');
    expect(screen.getByText(/2 coordenadores vão receber por email/)).toBeInTheDocument();
    expect(screen.getByText(/Sem coordenador, e portanto sem email: Águias/)).toBeInTheDocument();
    expect(screen.getByText(/sai do ar para os participantes/)).toBeInTheDocument();
  });

  it('não deixa confirmar antes de a prévia chegar', () => {
    previaMock.mockReturnValue(new Promise(() => {}));
    renderDialog();

    expect(screen.getByRole('button', { name: 'Encerrar e congelar resultado' })).toBeDisabled();
  });

  it('confirma, avisa a página e oferece a cerimônia', async () => {
    const { onEncerrada, onIniciarCerimonia } = renderDialog();
    await screen.findByText('Leões');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e congelar resultado' }));

    expect(await screen.findByText('Gincana encerrada!')).toBeInTheDocument();
    expect(encerrarMock).toHaveBeenCalledWith('G1');
    expect(onEncerrada).toHaveBeenCalledWith({ ja_encerrada: false, coordenadores_notificados: 2 });
    expect(screen.getByText(/2 coordenadores vão receber o resultado por email/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Iniciar cerimônia/ }));
    expect(onIniciarCerimonia).toHaveBeenCalledWith('G1');
  });

  it('explica quando a gincana já estava encerrada (nada reenviado)', async () => {
    encerrarMock.mockResolvedValue({ ja_encerrada: true });
    renderDialog();
    await screen.findByText('Leões');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e congelar resultado' }));

    expect(await screen.findByText('Esta gincana já estava encerrada')).toBeInTheDocument();
    expect(screen.getByText(/nenhum email foi reenviado/)).toBeInTheDocument();
  });

  it('mostra o erro e continua na prévia se o encerramento falhar', async () => {
    encerrarMock.mockRejectedValue(new Error('Uma gincana arquivada não pode ser encerrada.'));
    const { onEncerrada } = renderDialog();
    await screen.findByText('Leões');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e congelar resultado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('arquivada');
    expect(onEncerrada).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Encerrar e congelar resultado' })).toBeEnabled();
  });

  it('sem equipes, explica e não deixa encerrar', async () => {
    previaMock.mockResolvedValue({ ...PREVIA, classificacao: [], total_emails: 0, equipes_sem_coordenador: [] });
    renderDialog();

    expect(await screen.findByText('Esta gincana não tem equipes para classificar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar e congelar resultado' })).toBeDisabled();
  });

  it('fechado (sem gincana), não busca nada', () => {
    renderDialog({ gincana: null });
    expect(previaMock).not.toHaveBeenCalled();
  });
});

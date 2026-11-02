import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';

const resultadoFinalMock = vi.fn();
vi.mock('../services/api', () => ({
  gincanasService: { resultadoFinal: (...args) => resultadoFinalMock(...args) },
}));

const recarregarGincanasMock = vi.fn();
vi.mock('../hooks/useGincana', () => ({
  useGincana: () => ({ recarregarGincanas: recarregarGincanasMock }),
}));

// jsdom não tem canvas: o confete vira um espião.
const confettiMock = vi.fn();
confettiMock.reset = vi.fn();
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

import Cerimonia from './Cerimonia';

const RESULTADO = {
  gincana: { _id: 'G1', nome: 'Gincana da Primavera', ano: 2026 },
  encerrada_em: '2026-10-20T12:00:00.000Z',
  mostrar_pontos: true,
  classificacao: [
    { posicao: 1, equipe_id: 'e1', nome: 'Leões', cor: '#f00', pontos: 120 },
    { posicao: 2, equipe_id: 'e2', nome: 'Águias', cor: '#00f', pontos: 90 },
    { posicao: 3, equipe_id: 'e3', nome: 'Tubarões', cor: '#0f0', pontos: 70 },
    { posicao: 4, equipe_id: 'e4', nome: 'Lobos', cor: '#999', pontos: 40 },
  ],
};

const renderCerimonia = () => render(
  <MemoryRouter initialEntries={['/cerimonia/G1']}>
    <Routes>
      <Route path="/cerimonia/:gincanaId" element={<Cerimonia />} />
      <Route path="/" element={<div>Início</div>} />
    </Routes>
  </MemoryRouter>
);

const avancar = () => fireEvent.keyDown(window, { key: ' ' });

beforeEach(() => {
  vi.clearAllMocks();
  resultadoFinalMock.mockResolvedValue(RESULTADO);
  recarregarGincanasMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Cerimonia', () => {
  it('busca o resultado da gincana da URL e abre na apresentação', async () => {
    renderCerimonia();

    expect(await screen.findByRole('heading', { name: 'Gincana da Primavera' })).toBeInTheDocument();
    expect(resultadoFinalMock).toHaveBeenCalledWith('G1');
    // Nada do resultado aparece antes da hora.
    expect(screen.queryByText('Leões')).not.toBeInTheDocument();
  });

  it('revela do último ao primeiro, com suspense antes da campeã', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });
    vi.useFakeTimers();

    avancar(); // 4º em diante
    expect(screen.getByText('Lobos')).toBeInTheDocument();
    expect(screen.queryByText('Tubarões')).not.toBeInTheDocument();

    avancar(); // 3º
    expect(screen.getByText('Tubarões')).toBeInTheDocument();
    expect(screen.queryByText('Águias')).not.toBeInTheDocument();

    avancar(); // 2º
    expect(screen.getByText('Águias')).toBeInTheDocument();

    avancar(); // 1º: suspense primeiro
    expect(screen.getByRole('heading', { name: 'E a equipe campeã é…' })).toBeInTheDocument();
    expect(screen.queryByText('Leões')).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.getByRole('heading', { name: 'Equipe campeã!' })).toBeInTheDocument();
    expect(screen.getByText('Leões')).toBeInTheDocument();
    expect(screen.getByText('120 pts')).toBeInTheDocument();
  });

  it('avançar durante o suspense antecipa o anúncio em vez de pular a campeã', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    for (let i = 0; i < 4; i += 1) avancar();
    expect(screen.queryByText('Leões')).not.toBeInTheDocument();

    avancar();
    expect(screen.getByText('Leões')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Classificação final' })).not.toBeInTheDocument();
  });

  it('solta o confete quando a campeã é anunciada', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    for (let i = 0; i < 5; i += 1) avancar();

    await vi.waitFor(() => expect(confettiMock).toHaveBeenCalled());
    expect(confettiMock.mock.calls[0][0].colors).toContain('#f00');
  });

  it('termina na classificação final e para ali', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    for (let i = 0; i < 10; i += 1) avancar();

    expect(screen.getByRole('heading', { name: 'Classificação final' })).toBeInTheDocument();
    ['Leões', 'Águias', 'Tubarões', 'Lobos'].forEach((nome) => expect(screen.getByText(nome)).toBeInTheDocument());
  });

  it('a seta para a esquerda volta uma etapa', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    avancar();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(screen.getByRole('heading', { name: 'Gincana da Primavera' })).toBeInTheDocument();
  });

  it('o modo automático avança sozinho', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Modo automático' }));
    await act(async () => { vi.advanceTimersByTime(5000); });

    expect(screen.getByText('Lobos')).toBeInTheDocument();
  });

  it('esconde os pontos quando a API não os manda', async () => {
    resultadoFinalMock.mockResolvedValue({
      ...RESULTADO,
      mostrar_pontos: false,
      classificacao: RESULTADO.classificacao.map(({ pontos, ...resto }) => resto),
    });
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    for (let i = 0; i < 10; i += 1) avancar();

    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });

  it('explica quando o resultado ainda não foi divulgado', async () => {
    resultadoFinalMock.mockRejectedValue(Object.assign(new Error('x'), { codigo: 'RESULTADO_NAO_DISPONIVEL' }));
    renderCerimonia();

    expect(await screen.findByRole('heading', { name: 'Resultado ainda não divulgado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('oferece tentar de novo em erro de rede', async () => {
    resultadoFinalMock.mockRejectedValueOnce(new Error('Falha de rede'));
    renderCerimonia();

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Gincana da Primavera' })).toBeInTheDocument();
    expect(resultadoFinalMock).toHaveBeenCalledTimes(2);
  });

  it('sair volta para a tela de onde a cerimônia foi aberta', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/gincanas']}>
        <Routes>
          <Route path="/admin/gincanas" element={<Link to="/cerimonia/G1">abrir</Link>} />
          <Route path="/cerimonia/:gincanaId" element={<Cerimonia />} />
          <Route path="/" element={<div>Início</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('abrir'));
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    fireEvent.click(screen.getByRole('button', { name: 'Sair da cerimônia' }));

    expect(await screen.findByText('abrir')).toBeInTheDocument();
  });

  it('aberta direto pelo link do email, sair vai para o início (e recarrega as gincanas)', async () => {
    renderCerimonia();
    await screen.findByRole('heading', { name: 'Gincana da Primavera' });

    fireEvent.click(screen.getByRole('button', { name: 'Sair da cerimônia' }));

    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(recarregarGincanasMock).toHaveBeenCalledTimes(1);
  });
});

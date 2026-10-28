import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const listarMock = vi.fn();
const alterarStatusMock = vi.fn();
const previaMock = vi.fn();
const encerrarMock = vi.fn();
vi.mock('../services/api', () => ({
  gincanasService: {
    listar: (...a) => listarMock(...a),
    alterarStatus: (...a) => alterarStatusMock(...a),
    previaEncerramento: (...a) => previaMock(...a),
    encerrar: (...a) => encerrarMock(...a),
  },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ usuario: { tipo: 'ADMIN' }, logout: vi.fn() }) }));
const recarregarGincanasMock = vi.fn();
vi.mock('../hooks/useGincana', () => ({ useGincana: () => ({ recarregarGincanas: recarregarGincanasMock }) }));
vi.mock('../components/MainLayout', () => ({ default: ({ children }) => <div>{children}</div> }));

import GerenciarGincanas from './GerenciarGincanas';

const ATIVA = { _id: 'G1', nome: 'Primavera', ano: 2026, status: 'ATIVA', tem_resultado_final: false };
const COM_RESULTADO = { _id: 'G2', nome: 'Outono', ano: 2025, status: 'ENCERRADA', tem_resultado_final: true };
const ENCERRADA_SEM_RESULTADO = { _id: 'G3', nome: 'Inverno', ano: 2025, status: 'ENCERRADA', tem_resultado_final: false };

const renderTela = () => render(
  <MemoryRouter initialEntries={['/admin/gincanas']}>
    <Routes>
      <Route path="/admin/gincanas" element={<GerenciarGincanas />} />
      <Route path="/cerimonia/:gincanaId" element={<div>Cerimônia aberta</div>} />
    </Routes>
  </MemoryRouter>
);

const card = async (nome) => (await screen.findByRole('heading', { name: nome })).closest('[class*="p-4"]');

beforeEach(() => {
  vi.clearAllMocks();
  listarMock.mockResolvedValue([ATIVA, COM_RESULTADO, ENCERRADA_SEM_RESULTADO]);
  previaMock.mockResolvedValue({
    gincana: ATIVA,
    classificacao: [{ posicao: 1, equipe_id: 'e1', nome: 'Leões', cor: '#f00', pontos: 10, total_coordenadores: 1 }],
    total_emails: 1,
    equipes_sem_coordenador: [],
  });
  encerrarMock.mockResolvedValue({ ja_encerrada: false, coordenadores_notificados: 1 });
  recarregarGincanasMock.mockResolvedValue(undefined);
});

describe('GerenciarGincanas - encerramento', () => {
  it('"Encerrar" abre a prévia em vez de trocar o status direto', async () => {
    renderTela();

    fireEvent.click(within(await card('Primavera')).getByRole('button', { name: /Encerrar/ }));

    expect(await screen.findByText('Leões')).toBeInTheDocument();
    expect(previaMock).toHaveBeenCalledWith('G1');
    expect(alterarStatusMock).not.toHaveBeenCalled();
  });

  it('depois de encerrar, recarrega a lista e o escopo, e leva à cerimônia', async () => {
    renderTela();
    fireEvent.click(within(await card('Primavera')).getByRole('button', { name: /Encerrar/ }));
    await screen.findByText('Leões');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e congelar resultado' }));
    await screen.findByText('Gincana encerrada!');

    expect(recarregarGincanasMock).toHaveBeenCalled();
    expect(listarMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /Iniciar cerimônia/ }));
    expect(await screen.findByText('Cerimônia aberta')).toBeInTheDocument();
  });

  it('gincana com resultado congelado tem atalho para a cerimônia e não oferece encerrar de novo', async () => {
    renderTela();
    const cardOutono = await card('Outono');

    expect(within(cardOutono).queryByRole('button', { name: /Encerrar|Gerar resultado/ })).not.toBeInTheDocument();
    fireEvent.click(within(cardOutono).getByRole('button', { name: /Cerimônia/ }));

    expect(await screen.findByText('Cerimônia aberta')).toBeInTheDocument();
  });

  it('gincana encerrada pelo caminho antigo pode gerar o resultado final', async () => {
    renderTela();
    const cardInverno = await card('Inverno');

    expect(within(cardInverno).queryByRole('button', { name: /Cerimônia/ })).not.toBeInTheDocument();
    fireEvent.click(within(cardInverno).getByRole('button', { name: /Gerar resultado final/ }));

    expect(previaMock).toHaveBeenCalledWith('G3');
  });
});

describe('GerenciarGincanas - reativar', () => {
  beforeEach(() => {
    alterarStatusMock.mockResolvedValue({});
  });

  it('com resultado congelado, pede confirmação antes de reativar', async () => {
    renderTela();

    fireEvent.click(within(await card('Outono')).getByRole('button', { name: /Reativar/ }));

    expect(await screen.findByRole('heading', { name: 'Reativar Outono?' })).toBeInTheDocument();
    expect(screen.getByText(/os coordenadores recebem um novo email/)).toBeInTheDocument();
    expect(alterarStatusMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reativar mesmo assim' }));

    await vi.waitFor(() => expect(alterarStatusMock).toHaveBeenCalledWith('G2', 'ATIVA'));
  });

  it('cancelar não reativa', async () => {
    renderTela();
    fireEvent.click(within(await card('Outono')).getByRole('button', { name: /Reativar/ }));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(alterarStatusMock).not.toHaveBeenCalled();
  });

  it('sem resultado congelado, reativa direto como antes', async () => {
    renderTela();

    fireEvent.click(within(await card('Inverno')).getByRole('button', { name: /Reativar/ }));

    await vi.waitFor(() => expect(alterarStatusMock).toHaveBeenCalledWith('G3', 'ATIVA'));
    expect(screen.queryByRole('heading', { name: /Reativar Inverno/ })).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('./ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const listarMembrosMock = vi.fn();
const inscreverMembrosMock = vi.fn();
vi.mock('../services/api', () => ({
  provasService: {
    listarMembrosDaEquipeParaProva: (...a) => listarMembrosMock(...a),
    inscreverMembrosDaEquipe: (...a) => inscreverMembrosMock(...a),
  },
}));

import InscreverMembrosEquipeModal from './InscreverMembrosEquipeModal';
import { toast } from './ui/toast';

const PROVA = { _id: 'prova1', titulo: 'Corrida de Saco' };

const resposta = (overrides = {}) => ({
  prova: { id: 'prova1', titulo: 'Corrida de Saco', status: 'EM_ANDAMENTO' },
  equipe: { id: 'eq1', nome: 'Time Azul', cor: '#00f' },
  cotas: [{ grupo: 'ALUNOS_FUNDAMENTAL', label: 'alunos do ensino fundamental', limite: 5, inscritos: 0, restantes: 5 }],
  membros: [],
  total_elegiveis: 0,
  ...overrides,
});

const membro = (nome, extras = {}) => ({
  id: nome, nome, email: `${nome}@x.com`, turma: 'EF - 6º Ano', status: 'ATIVO',
  grupo: 'ALUNOS_FUNDAMENTAL', elegivel: true, motivo_codigo: null, motivo: null,
  ...extras,
});

const abrir = () => render(
  <InscreverMembrosEquipeModal prova={PROVA} isOpen onClose={vi.fn()} onInscricaoSucesso={vi.fn()} />
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InscreverMembrosEquipeModal', () => {
  it('lista também os membros inelegíveis, com o motivo de cada um', async () => {
    // Esconder quem não se encaixa faz a tela parecer quebrada ("cadê meus
    // alunos?") em vez de explicar a regra da prova.
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [
        membro('Ana'),
        membro('Bruno', { elegivel: false, motivo_codigo: 'JA_INSCRITO' }),
        membro('Carla', { elegivel: false, motivo_codigo: 'GRUPO_NAO_PERMITIDO', grupo: 'ALUNOS_MEDIO' }),
      ],
      total_elegiveis: 1,
    }));

    abrir();

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(screen.getByText('Já inscrito')).toBeInTheDocument();
    expect(screen.getByText('Fora das cotas desta prova')).toBeInTheDocument();
  });

  it('só habilita a seleção de quem é elegível', async () => {
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [membro('Ana'), membro('Bruno', { elegivel: false, motivo_codigo: 'JA_INSCRITO' })],
      total_elegiveis: 1,
    }));

    abrir();
    await screen.findByText('Ana');

    expect(screen.getByRole('checkbox', { name: /Ana/ })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /Bruno/ })).toBeDisabled();
  });

  it('impede selecionar mais gente do que as vagas restantes do grupo', async () => {
    // Duas vagas, três candidatos: a terceira caixa trava assim que a seleção
    // enche a cota — em vez de deixar escolher e devolver erro no envio.
    listarMembrosMock.mockResolvedValue(resposta({
      cotas: [{ grupo: 'ALUNOS_FUNDAMENTAL', label: 'alunos do ensino fundamental', limite: 2, inscritos: 0, restantes: 2 }],
      membros: [membro('Ana'), membro('Bruno'), membro('Carla')],
      total_elegiveis: 3,
    }));

    abrir();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByRole('checkbox', { name: /Ana/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Bruno/ }));

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Carla/ })).toBeDisabled();
    });
    // Quem já está marcado continua desmarcável.
    expect(screen.getByRole('checkbox', { name: /Ana/ })).toBeEnabled();
  });

  it('avisa quando nenhum membro se encaixa na prova', async () => {
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [membro('Ana', { elegivel: false, motivo_codigo: 'GRUPO_NAO_PERMITIDO' })],
      total_elegiveis: 0,
    }));

    abrir();

    expect(await screen.findByText(/Nenhum membro se encaixa nesta prova/i)).toBeInTheDocument();
  });

  it('avisa quando a equipe não tem outros membros', async () => {
    listarMembrosMock.mockResolvedValue(resposta());

    abrir();

    expect(await screen.findByText(/ainda não tem outros membros/i)).toBeInTheDocument();
  });

  it('envia os selecionados num único lote', async () => {
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [membro('Ana'), membro('Bruno')],
      total_elegiveis: 2,
    }));
    inscreverMembrosMock.mockResolvedValue({ ok: true, inscritos: [{ id: 'Ana' }, { id: 'Bruno' }], falhas: [] });

    abrir();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByRole('checkbox', { name: /Ana/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Bruno/ }));
    fireEvent.click(screen.getByRole('button', { name: /Inscrever 2 membros/i }));

    await waitFor(() => {
      // Uma requisição só: em paralelo, cada uma leria a cota antes da outra
      // inserir e o limite do grupo seria furado.
      expect(inscreverMembrosMock).toHaveBeenCalledTimes(1);
    });
    expect(inscreverMembrosMock).toHaveBeenCalledWith('prova1', ['Ana', 'Bruno']);
  });

  it('mostra quem ficou de fora quando o lote é parcial', async () => {
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [membro('Ana'), membro('Bruno')],
      total_elegiveis: 2,
    }));
    inscreverMembrosMock.mockResolvedValue({
      ok: true,
      inscritos: [{ id: 'Ana', nome: 'Ana' }],
      falhas: [{ id: 'Bruno', nome: 'Bruno', code: 'VAGAS_ESGOTADAS', message: 'Quantidade máxima preenchida.' }],
    });

    abrir();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByRole('checkbox', { name: /Ana/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Bruno/ }));
    fireEvent.click(screen.getByRole('button', { name: /Inscrever 2 membros/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Bruno (Vagas do grupo esgotadas)')
      );
    });
  });

  it('mostra o motivo de cada recusa quando nenhum entra', async () => {
    listarMembrosMock.mockResolvedValue(resposta({
      membros: [membro('Ana')],
      total_elegiveis: 1,
    }));
    const erro = new Error('Nenhum membro pôde ser inscrito.');
    erro.erros = ['Ana: Quantidade máxima para alunos do ensino fundamental preenchida.'];
    inscreverMembrosMock.mockRejectedValue(erro);

    abrir();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByRole('checkbox', { name: /Ana/ }));
    fireEvent.click(screen.getByRole('button', { name: /Inscrever 1 membro/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Ana: Quantidade máxima'));
    });
  });

  it('oferece tentar de novo quando a carga falha', async () => {
    listarMembrosMock.mockRejectedValueOnce(new Error('Falha de rede'));

    abrir();

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();

    listarMembrosMock.mockResolvedValueOnce(resposta({ membros: [membro('Ana')], total_elegiveis: 1 }));
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });
});

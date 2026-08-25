import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gincanasService } from '../services/api';
import { useAuth } from './useAuth.jsx';
import { useEscola } from './useEscola.jsx';

const GincanaContext = createContext(null);

const STORAGE_KEY = 'gincanaAtivaId';

/**
 * Contexto do escopo de gincana ativa ("workspace").
 *
 * Mantém a lista de gincanas da escola ativa e qual está ativa. A gincana ativa
 * é persistida em localStorage ('gincanaAtivaId') e enviada em todas as
 * requisições pelo header X-Gincana-Id (ver services/api.js).
 *
 * Edições encerradas (status ENCERRADA/ARQUIVADA ou de anos passados) continuam
 * na lista — como histórico — mas não podem ser abertas: a API recusa com
 * `codigo: 'GINCANA_ENCERRADA'`, e aqui elas nunca viram a gincana ativa.
 *
 * Deve ficar aninhado DENTRO do AuthProvider e do EscolaProvider: a lista de
 * gincanas é sempre a da escola ativa, e trocar de escola recarrega esta lista.
 */
export const GincanaProvider = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { escolaAtivaId } = useEscola();
  const [minhasGincanas, setMinhasGincanas] = useState([]);
  const [gincanaAtivaId, setGincanaAtivaIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(false);
  const [carregado, setCarregado] = useState(false);

  // Troca a gincana ativa sem reiniciar a aplicação. As páginas da rota de
  // destino montam já com o novo id persistido e o header correto.
  // `destino` permite sair da tela de seleção já na rota certa; sem ele, a
  // troca acontece onde o usuário estiver (o caso do seletor da navbar).
  const setGincanaAtiva = useCallback((id, destino) => {
    if (!id) return;
    if (id === gincanaAtivaId && !destino) return;
    localStorage.setItem(STORAGE_KEY, id);
    setGincanaAtivaIdState(id);
    navigate(destino || '/', { replace: true });
  }, [gincanaAtivaId, navigate]);

  // Volta para a tela de seleção (usado pelo "trocar de gincana").
  const limparGincanaAtiva = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGincanaAtivaIdState(null);
    navigate('/selecionar-gincana', { replace: true });
  }, [navigate]);

  const carregarGincanas = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await gincanasService.minhas();
      setMinhasGincanas(lista || []);

      // Só edições em andamento podem ser o escopo ativo.
      const idsAcessiveis = (lista || []).filter((g) => !g.encerrada).map((g) => g._id);
      const atualPersistida = localStorage.getItem(STORAGE_KEY);

      if (atualPersistida && idsAcessiveis.includes(atualPersistida)) {
        setGincanaAtivaIdState(atualPersistida);
        return;
      }

      if (idsAcessiveis.length === 1) {
        // Uma gincana só em andamento: entra direto, sem tela intermediária.
        localStorage.setItem(STORAGE_KEY, idsAcessiveis[0]);
        setGincanaAtivaIdState(idsAcessiveis[0]);
      } else {
        // Nenhuma ou várias: quem decide é a tela /selecionar-gincana.
        localStorage.removeItem(STORAGE_KEY);
        setGincanaAtivaIdState(null);
      }
    } catch (error) {
      console.error('Erro ao carregar gincanas:', error);
      setMinhasGincanas([]);
    } finally {
      setLoading(false);
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    // Só busca depois que a escola ativa estiver resolvida: sem o header
    // X-Escola-Id o backend cairia no fallback e listaria a escola errada.
    if (isAuthenticated && escolaAtivaId) {
      carregarGincanas();
    } else {
      setMinhasGincanas([]);
      setGincanaAtivaIdState(null);
      setCarregado(false);
      if (!isAuthenticated) localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated, escolaAtivaId, carregarGincanas]);

  const gincanaAtiva = minhasGincanas.find((g) => g._id === gincanaAtivaId) || null;

  const gincanasAcessiveis = useMemo(
    () => minhasGincanas.filter((g) => !g.encerrada),
    [minhasGincanas]
  );
  const gincanasEncerradas = useMemo(
    () => minhasGincanas.filter((g) => g.encerrada),
    [minhasGincanas]
  );

  const value = {
    minhasGincanas,
    gincanasAcessiveis,
    gincanasEncerradas,
    gincanaAtivaId,
    gincanaAtiva,
    loading,
    carregado,
    // Já carregou a lista da escola ativa e ainda não há gincana escolhida.
    precisaSelecionarGincana: carregado && !loading && !gincanaAtivaId,
    setGincanaAtiva,
    limparGincanaAtiva,
    recarregarGincanas: carregarGincanas,
  };

  return <GincanaContext.Provider value={value}>{children}</GincanaContext.Provider>;
};

export function useGincana() {
  const ctx = useContext(GincanaContext);
  if (!ctx) {
    throw new Error('useGincana deve ser usado dentro de GincanaProvider');
  }
  return ctx;
}

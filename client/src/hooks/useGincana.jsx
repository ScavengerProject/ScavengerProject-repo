import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { gincanasService } from '../services/api';
import { useAuth } from './useAuth.jsx';

const GincanaContext = createContext(null);

const STORAGE_KEY = 'gincanaAtivaId';

/**
 * Contexto do escopo de gincana ativa ("workspace").
 *
 * Mantém a lista de gincanas do usuário e qual está ativa. A gincana ativa é
 * persistida em localStorage ('gincanaAtivaId') e enviada em todas as
 * requisições pelo header X-Gincana-Id (ver services/api.js).
 *
 * Deve ficar aninhado DENTRO do AuthProvider (depende de isAuthenticated).
 */
export const GincanaProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [minhasGincanas, setMinhasGincanas] = useState([]);
  const [gincanaAtivaId, setGincanaAtivaIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(false);

  // Troca a gincana ativa: persiste e recarrega a aplicação para que todas as
  // telas re-busquem os dados já no novo escopo.
  const setGincanaAtiva = useCallback((id) => {
    if (!id || id === gincanaAtivaId) return;
    localStorage.setItem(STORAGE_KEY, id);
    setGincanaAtivaIdState(id);
    window.location.reload();
  }, [gincanaAtivaId]);

  const carregarGincanas = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await gincanasService.minhas();
      setMinhasGincanas(lista || []);

      // Garante uma gincana ativa válida.
      const idsValidos = (lista || []).map((g) => g._id);
      const atualPersistida = localStorage.getItem(STORAGE_KEY);

      if (!atualPersistida || !idsValidos.includes(atualPersistida)) {
        const nova = idsValidos[0] || null;
        if (nova) {
          localStorage.setItem(STORAGE_KEY, nova);
          setGincanaAtivaIdState(nova);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setGincanaAtivaIdState(null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar gincanas:', error);
      setMinhasGincanas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      carregarGincanas();
    } else {
      setMinhasGincanas([]);
      setGincanaAtivaIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated, carregarGincanas]);

  const gincanaAtiva = minhasGincanas.find((g) => g._id === gincanaAtivaId) || null;

  const value = {
    minhasGincanas,
    gincanaAtivaId,
    gincanaAtiva,
    loading,
    setGincanaAtiva,
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

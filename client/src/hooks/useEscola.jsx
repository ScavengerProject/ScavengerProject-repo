import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { escolasService } from '../services/api';
import { useAuth } from './useAuth.jsx';

const EscolaContext = createContext(null);

const STORAGE_KEY = 'escolaAtivaId';
// Chave do escopo de gincana: precisa ser limpa ao trocar de escola, senão o
// próximo request iria com uma gincana que não pertence à nova escola.
const STORAGE_KEY_GINCANA = 'gincanaAtivaId';

/**
 * Contexto do escopo de ESCOLA ativa (tenant raiz).
 *
 * Mantém a lista de escolas do usuário e qual está ativa. A escola ativa é
 * persistida em localStorage ('escolaAtivaId') e enviada em todas as
 * requisições pelo header X-Escola-Id (ver services/api.js).
 *
 * Duas responsabilidades além de guardar o id:
 *  1. Quando o usuário tem mais de uma escola, NÃO escolhe uma sozinho: quem
 *     escolhe é a tela /selecionar-escola. Entrar numa escola aleatória era o
 *     que fazia o sistema abrir com o perfil "errado" depois de um vínculo novo.
 *  2. Aplica no useAuth o papel do usuário NAQUELA escola (`meu_tipo`), já que
 *     o papel do token é apenas o papel base.
 *
 * Deve ficar aninhado DENTRO do AuthProvider e FORA do GincanaProvider — a
 * gincana ativa só faz sentido dentro de uma escola.
 */
export const EscolaProvider = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated, aplicarPerfilDaEscola } = useAuth();
  const [minhasEscolas, setMinhasEscolas] = useState([]);
  const [escolaAtivaId, setEscolaAtivaIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(false);
  // Vira true depois da primeira busca: antes disso não dá para dizer se o
  // usuário precisa escolher uma escola ou se ele só tem uma.
  const [carregado, setCarregado] = useState(false);

  // Troca a escola ativa: descarta a gincana selecionada (era de outra escola),
  // persiste e recarrega a aplicação para tudo re-buscar no novo escopo — com o
  // papel da escola nova, que pode ser diferente do papel da anterior.
  // `destino` permite sobrescrever a próxima etapa. Por padrão, toda troca de
  // escola vai explicitamente para a seleção de gincana. A navegação é interna
  // ao React Router: não reinicia os providers nem recria o estado em uma ordem
  // diferente, que era o que produzia o ciclo escola -> gincana -> escola.
  const setEscolaAtiva = useCallback((id, destino) => {
    if (!id) return;
    if (id === escolaAtivaId && !destino) return;
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.removeItem(STORAGE_KEY_GINCANA);
    setEscolaAtivaIdState(id);
    navigate(destino || '/selecionar-gincana', { replace: true });
  }, [escolaAtivaId, navigate]);

  // Volta para a tela de seleção (usado pelo "trocar de escola").
  const limparEscolaAtiva = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_GINCANA);
    setEscolaAtivaIdState(null);
    navigate('/selecionar-escola', { replace: true });
  }, [navigate]);

  const carregarEscolas = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await escolasService.minhas();
      setMinhasEscolas(lista || []);

      const idsValidos = (lista || []).map((e) => e._id);
      const atualPersistida = localStorage.getItem(STORAGE_KEY);

      if (atualPersistida && idsValidos.includes(atualPersistida)) {
        setEscolaAtivaIdState(atualPersistida);
        return;
      }

      // A escola persistida não vale mais (perdeu o vínculo, escola inativada...):
      // a gincana guardada também não vale, porque era de lá.
      localStorage.removeItem(STORAGE_KEY_GINCANA);

      if (idsValidos.length === 1) {
        // Uma escola só: não faz sentido pedir para escolher.
        localStorage.setItem(STORAGE_KEY, idsValidos[0]);
        setEscolaAtivaIdState(idsValidos[0]);
      } else {
        // Nenhuma ou várias: quem decide é a tela de seleção.
        localStorage.removeItem(STORAGE_KEY);
        setEscolaAtivaIdState(null);
      }
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      setMinhasEscolas([]);
    } finally {
      setLoading(false);
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      carregarEscolas();
    } else {
      setMinhasEscolas([]);
      setEscolaAtivaIdState(null);
      setCarregado(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated, carregarEscolas]);

  const escolaAtiva = minhasEscolas.find((e) => e._id === escolaAtivaId) || null;

  // Papel do usuário nesta escola: é ele que vale nas telas, não o do token.
  useEffect(() => {
    if (escolaAtiva?.meu_tipo) {
      aplicarPerfilDaEscola(escolaAtiva.meu_tipo);
    }
  }, [escolaAtiva, aplicarPerfilDaEscola]);

  const value = {
    minhasEscolas,
    escolaAtivaId,
    escolaAtiva,
    perfilNaEscola: escolaAtiva?.meu_tipo || null,
    loading,
    carregado,
    // Já carregou a lista e ainda não há escola escolhida.
    precisaSelecionarEscola: carregado && !loading && !escolaAtivaId,
    setEscolaAtiva,
    limparEscolaAtiva,
    recarregarEscolas: carregarEscolas,
  };

  return <EscolaContext.Provider value={value}>{children}</EscolaContext.Provider>;
};

export function useEscola() {
  const ctx = useContext(EscolaContext);
  if (!ctx) {
    throw new Error('useEscola deve ser usado dentro de EscolaProvider');
  }
  return ctx;
}

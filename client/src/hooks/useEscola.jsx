import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { escolasService } from '../services/api';
import { useAuth } from './useAuth.jsx';

const EscolaContext = createContext(null);

/**
 * Uma escola pode ser aberta quando o vínculo não está bloqueado. Espelha
 * `vinculoBloqueado` do backend (server/src/models/Usuario.js): INATIVO e
 * BANIDO barram; PENDENTE não, porque ele tem tela de espera própria.
 */
const selecionavel = (escola) => !escola?.meu_vinculo_bloqueado;

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
 *  3. Separa as escolas SELECIONÁVEIS das BLOQUEADAS (`meu_vinculo_bloqueado`,
 *     vindo do backend: vínculo INATIVO ou BANIDO). Uma escola bloqueada nunca
 *     pode virar a escola ativa — ela responde 403 em toda rota com escopo — e
 *     selecioná-la era exatamente o laço escola <-> gincana: com uma escola só,
 *     o ramo de auto-seleção abaixo a escolhia sozinho, /selecionar-gincana
 *     levava 403 e o api.js devolvia o usuário para cá, em recarga infinita.
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
    // Trava final contra o laço: mesmo que alguma tela ofereça uma escola
    // bloqueada, ela nunca vira o escopo ativo — persistir esse id é o que
    // reabre o ciclo 403 -> limpar escopo -> voltar para cá.
    const alvo = minhasEscolas.find((e) => e._id === id);
    if (alvo && !selecionavel(alvo)) return;
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.removeItem(STORAGE_KEY_GINCANA);
    setEscolaAtivaIdState(id);
    navigate(destino || '/selecionar-gincana', { replace: true });
  }, [escolaAtivaId, minhasEscolas, navigate]);

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

      // Só as escolas que o usuário realmente consegue abrir entram na conta.
      // PENDENTE continua aqui de propósito: ela PRECISA ser selecionável para
      // a pessoa chegar em /aguardando-aprovacao (ver codigo VINCULO_PENDENTE).
      const idsValidos = (lista || []).filter(selecionavel).map((e) => e._id);
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

  // Duas listas derivadas: o que a tela de seleção oferece e o que ela (ou a
  // tela terminal) precisa EXPLICAR. Sem a segunda, quem tem só uma escola e
  // foi banido dela veria "Nenhuma escola disponível", sem saber o motivo.
  const escolasDisponiveis = minhasEscolas.filter(selecionavel);
  const escolasBloqueadas = minhasEscolas.filter((e) => !selecionavel(e));

  // Papel do usuário nesta escola: é ele que vale nas telas, não o do token.
  useEffect(() => {
    if (escolaAtiva?.meu_tipo) {
      aplicarPerfilDaEscola(escolaAtiva.meu_tipo);
    }
  }, [escolaAtiva, aplicarPerfilDaEscola]);

  const value = {
    minhasEscolas,
    escolasDisponiveis,
    escolasBloqueadas,
    // Não sobrou nenhuma escola aberta e existe pelo menos uma bloqueada: é o
    // fim de linha do usuário desativado/banido, e o App manda para
    // /acesso-bloqueado em vez da seleção (que não teria o que oferecer).
    acessoBloqueado: carregado && !loading
      && escolasDisponiveis.length === 0 && escolasBloqueadas.length > 0,
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

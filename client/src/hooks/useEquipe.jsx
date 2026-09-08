import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { equipesService } from '../services/api';
import { useAuth } from './useAuth.jsx';
import { useEscola } from './useEscola.jsx';
import { useGincana } from './useGincana.jsx';
import { ehAdmin } from '../lib/perfis';

const EquipeContext = createContext(null);

/**
 * Terceira e última etapa do escopo de entrada: escola -> gincana -> EQUIPE.
 *
 * Existe porque participar de uma gincana é derivado de `EquipeMembros`, e não
 * do vínculo com a escola (ver getGincanaIdsDoUsuario no backend). Quem foi
 * aprovado na escola e escolheu a gincana mas ainda não entrou numa equipe leva
 * 403 `SEM_EQUIPE_NA_GINCANA` em TODA rota estrita — provas, resultados,
 * notificações, penalidades, feedbacks, configurações. Sem saber disso ANTES de
 * montar as telas, o app deixava a pessoa navegar para o dashboard e só então
 * era jogada de volta pelas requisições que falhavam.
 *
 * Aqui a informação é buscada uma vez, logo depois de a gincana ser resolvida,
 * numa rota permissiva (`GET /equipes/meu-vinculo`, alcançável justamente por
 * quem ainda não participa). O App usa `precisaSelecionarEquipe` para prender a
 * pessoa em /selecionar-equipe até ela entrar numa equipe.
 *
 * ADMIN/SUPER_ADMIN nunca passam pelo gate: `resolverGincana` os isenta da
 * checagem de participação, então eles operam a gincana sem equipe nenhuma.
 *
 * Deve ficar aninhado DENTRO do GincanaProvider: a pergunta "tenho equipe?" só
 * faz sentido dentro de uma gincana ativa.
 */
export const EquipeProvider = ({ children }) => {
  const { isAuthenticated, usuario } = useAuth();
  const { escolaAtivaId } = useEscola();
  const { gincanaAtivaId } = useGincana();

  const [vinculoEquipe, setVinculoEquipe] = useState(null);
  const [loading, setLoading] = useState(false);
  // Vira true depois da primeira consulta no escopo atual: antes disso não dá
  // para dizer se falta equipe, e adivinhar levaria ou a um gate indevido ou a
  // uma tela montando para levar 403.
  const [carregado, setCarregado] = useState(false);

  const isAdmin = ehAdmin(usuario);

  const carregarVinculo = useCallback(async () => {
    setLoading(true);
    try {
      const vinculo = await equipesService.meuVinculoNaGincana();
      setVinculoEquipe(vinculo || null);
    } catch (error) {
      // Falha de rede/servidor não pode trancar quem já tem equipe: deixa
      // passar e, se realmente faltar equipe, o 403 de qualquer requisição cai
      // no tratamento de `SEM_EQUIPE_NA_GINCANA` em services/api.js, que manda
      // para o mesmo gate. Errar para o lado do bloqueio deixaria o sistema
      // inacessível a todo mundo se esta única rota ficasse fora do ar.
      console.error('Erro ao verificar o vínculo de equipe:', error);
      setVinculoEquipe(null);
    } finally {
      setLoading(false);
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    // Sem gincana ativa não há o que perguntar (e o header X-Gincana-Id nem
    // seria enviado): quem resolve essa etapa é o GincanaProvider.
    if (!isAuthenticated || !escolaAtivaId || !gincanaAtivaId) {
      setVinculoEquipe(null);
      setCarregado(false);
      return;
    }

    // Perfil administrativo não precisa de equipe para operar a gincana.
    // Marca como carregado sem gastar requisição.
    if (isAdmin) {
      setVinculoEquipe(null);
      setCarregado(true);
      return;
    }

    // Trocar de gincana invalida a resposta anterior: a pessoa pode ter equipe
    // numa edição e não na outra. Enquanto a nova não chega, `carregado` falso
    // faz o App mostrar a tela de carregando em vez de deixar uma página montar
    // com a resposta da edição antiga.
    setVinculoEquipe(null);
    setCarregado(false);
    carregarVinculo();
  }, [isAuthenticated, escolaAtivaId, gincanaAtivaId, isAdmin, carregarVinculo]);

  const temEquipe = Boolean(vinculoEquipe?.tem_equipe);

  const value = {
    vinculoEquipe,
    temEquipe,
    equipeId: vinculoEquipe?.equipe_id || null,
    equipeNome: vinculoEquipe?.equipe_nome || null,
    loading,
    carregado,
    // A consulta terminou sem resposta utilizável (rota fora do ar, rede caindo,
    // API velha sem o endpoint). Não é "tem equipe" nem "não tem": é "não sei" —
    // e a tela de escolha usa isso para oferecer "tentar novamente" em vez de
    // fingir que a pessoa não tem equipe.
    vinculoDesconhecido: !isAdmin && carregado && vinculoEquipe === null,
    // Se /selecionar-equipe faz sentido para este usuário. Deliberadamente mais
    // largo que `precisaSelecionarEquipe`: só quem SABIDAMENTE tem equipe (ou é
    // admin) é mandado de volta para o app.
    //
    // A diferença entre os dois é o que impede um laço de recargas: quando a
    // consulta do vínculo falha, `precisaSelecionarEquipe` é false (não travamos
    // ninguém por erro de rede), mas as telas normais ainda respondem 403 e o
    // api.js manda todo mundo para cá. Se esta tela devolvesse a pessoa para '/'
    // nesse estado, ela ia rebater entre '/' e aqui recarregando a página.
    podeVerSelecaoEquipe: !isAdmin && !temEquipe,
    // Já consultou o vínculo na gincana ativa e a resposta foi "sem equipe".
    //
    // `=== false` de propósito: um erro na consulta deixa `vinculoEquipe` nulo,
    // e nesse caso NÃO se bloqueia ninguém (ver comentário no catch).
    //
    // Sem `!loading` (diferente de useEscola/useGincana): aqui a resposta
    // anterior continua valendo durante uma reconsulta, então olhar o `loading`
    // faria a trava cair por um instante — o suficiente para o App tirar a
    // pessoa da tela de escolha e montar o dashboard, que responderia 403.
    precisaSelecionarEquipe:
      !isAdmin
      && Boolean(gincanaAtivaId)
      && carregado
      && vinculoEquipe?.tem_equipe === false,
    recarregarVinculoEquipe: carregarVinculo,
  };

  return <EquipeContext.Provider value={value}>{children}</EquipeContext.Provider>;
};

export function useEquipe() {
  const ctx = useContext(EquipeContext);
  if (!ctx) {
    throw new Error('useEquipe deve ser usado dentro de EquipeProvider');
  }
  return ctx;
}

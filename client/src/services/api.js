const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Função helper para fazer requisições
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Verificar se a sessão expirou
  const expiryTime = localStorage.getItem('sessionExpiryTime');
  if (expiryTime) {
    const currentTime = new Date().getTime();
    if (currentTime > parseInt(expiryTime)) {
      // Sessão expirada, remover dados
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('sessionExpiryTime');
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }
  
  // Adicionar token à requisição se disponível
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('sessionExpiryTime');
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
    }

    if (!response.ok) {
      // tenta parsear JSON; se vier HTML (erro do Express padrão), evita quebrar com "<!DOCTYPE"
      let errorMessage = 'Erro na requisição';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (_) {
        // Se não conseguir fazer parse de JSON, tentar ler como texto
        // Mas só tenta se houver body ainda disponível
        try {
          const text = await response.text();
          if (text && text.startsWith('<!DOCTYPE')) {
            errorMessage = 'Erro (HTML) do servidor. Verifique a rota no backend.';
          } else if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          errorMessage = `${response.status} - ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    // pode haver 204
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    console.error(`Erro em ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Serviço de Autenticação
 */
export const authService = {
  login: (email, senha) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionExpiryTime');
  },
  getToken: () => localStorage.getItem('token'),
  getUsuarioAtual: () => {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  },
};

/**
 * Serviço de Provas
 */
export const provasService = {
  listar: () => request('/provas', { method: 'GET' }),
  obter: (id) => request(`/provas/${id}`, { method: 'GET' }),
  criar: (dados) =>
    request('/provas', {
      method: 'POST',
      body: JSON.stringify({ 
        titulo: dados.titulo,
        descricao: dados.descricao,
        formato: dados.formato,
        data_inicio: dados.data_inicio || null,
        data_fim: dados.data_fim || null,
        status: dados.status || 'NAO_INICIADA',
        quesitos_de_avaliacao: dados.quesitos_de_avaliacao || [],
        requisito_usuario: dados.requisito_usuario || null,
        restricao_participacao: dados.restricao_participacao || {},
        criterio_elegibilidade: dados.criterio_elegibilidade || {},
        sequenciamento: dados.sequenciamento || {},
        pontuacao: dados.pontuacao || {},
      }),
    }),
  atualizar: (id, dados) =>
    request(`/provas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        titulo: dados.titulo,
        descricao: dados.descricao,
        formato: dados.formato,
        data_inicio: dados.data_inicio || null,
        data_fim: dados.data_fim || null,
        status: dados.status || 'NAO_INICIADA',
        quesitos_de_avaliacao: dados.quesitos_de_avaliacao || [],
        requisito_usuario: dados.requisito_usuario || null,
        restricao_participacao: dados.restricao_participacao || {},
        criterio_elegibilidade: dados.criterio_elegibilidade || {},
        sequenciamento: dados.sequenciamento || {},
        pontuacao: dados.pontuacao || {},
      }),
    }),
  deletar: (id) => request(`/provas/${id}`, { method: 'DELETE' }),
  
  // Inscrever usuário na prova
  inscrever: (provaId, usuarioId = null) =>
    request(`/provas/${provaId}/inscricoes`, {
      method: 'POST',
      body: JSON.stringify(usuarioId ? { usuario_id: usuarioId } : {}),
    }),
  
  // Verificar se está inscrito na prova
  verificarInscricao: (provaId) =>
    request(`/provas/${provaId}/inscricao/status`, { method: 'GET' }),
  
  // Listar participantes de uma prova
  listarParticipantes: (provaId) =>
    request(`/provas/${provaId}/participantes`, { method: 'GET' }),
};

/**
* Serviço de Equipes
*/
export const equipesService = {
  listarEquipes: () => request('/equipes', { method: 'GET' }),

  // ✅ público para autenticados (nomes/ids) – usado pelos alunos ao solicitar migração
  listarEquipesPublicas: () => request('/equipes/publicas', { method: 'GET' }),

  // ✅ Lista equipes para inscrição, marcando qual é a equipe atual
  listarEquipesParaInscricao: () => request('/equipes/para-inscricao', { method: 'GET' }),

  listarCoordenadoresDisponiveis: () =>
    request('/equipes/coordenadores-disponiveis', { method: 'GET' }),


  criarEquipe: (dados) =>
    request('/equipes', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

    // [GET] /api/equipes/minha-equipe
    visualizarMinhaEquipe: () =>
      request('/equipes/minha-equipe', {
        method: 'GET',
      }),
    
    /**
     * [POST] /api/equipes/minha-equipe/membros
     */
    adicionarMembroMinhaEquipe: (usuarioId) =>
      request('/equipes/minha-equipe/membros', {
        method: 'POST',
        body: JSON.stringify({ usuario_id: usuarioId }),
      }),
    
    /**
     * [DELETE] /api/equipes/minha-equipe/membros/:membroId
     */
    removerMembroMinhaEquipe: (membroId) =>
      request(`/equipes/minha-equipe/membros/${membroId}`, {
        method: 'DELETE',
      }),

    /**
     * [POST] /api/equipes/:equipeId/register - Inscrever aluno em equipe
     */
    inscreverEmEquipe: (equipeId) =>
      request(`/equipes/${equipeId}/register`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    
    /**
     * [DELETE] /api/equipes/:equipeId
     */
    deletarEquipe: (equipeId) =>
      request(`/equipes/${equipeId}`, {
        method: 'DELETE',
      }),

  adicionarMembro: (equipeId, usuarioId) =>
    request(`/equipes/${equipeId}/membros`, {
      method: 'PATCH',
      body: JSON.stringify({ usuario_id: usuarioId }),
    }),

    /**
     * [PUT] /api/equipes/:equipeId (Atualiza nome, cor e Coordenador)
     */
    atualizarEquipe: (equipeId, dados) =>
        request(`/equipes/${equipeId}`, {
            method: 'PUT',
            body: JSON.stringify(dados),
        }),

    /**
     * [PATCH] /api/equipes/:equipeId/coordenador
     * Atribui ou remove um coordenador de uma equipe.
     */
    atribuirCoordenador: (equipeId, novoCoordenadorId) =>
        request(`/equipes/${equipeId}/coordenador`, {
            method: 'PATCH',
            body: JSON.stringify({ usuario_id: novoCoordenadorId }), // Envia o ID ou null
        }),

  listarMembrosDisponiveis: () =>
    request('/equipes/membros-disponiveis', { method: 'GET' }),

  // ✅ Lista todos os membros de todas as equipes
  listarTodosMembros: () =>
    request('/equipes/todos-membros', { method: 'GET' }),

  // ✅ Lista EquipeGincana para seleção (empréstimos)
  listarEquipesGincana: () =>
    request('/equipes/equipes-gincana', { method: 'GET' }),

  /**
   * [GET] /api/equipes/:equipeId/membros
   * Lista os membros de uma equipe específica.
   */
  listarMembrosPorIdEquipe: (equipeId) =>
    request(`/equipes/${equipeId}/membros`, { method: 'GET' }),

  listarElegiveisParaCoordenador: (equipeId) =>
        request(`/equipes/${equipeId}/alunos-disponiveis`, {method: 'GET', }),

  visualizarRanking: () =>
        request('/equipes/ranking', {
            method: 'GET',
        }),
  buscarMinhaEquipeId: () =>
        request('/equipes/minha-equipe-id', { method: 'GET' }),

  };

/**
 * Serviço de Penalidades
 */
export const penalidadesService = {
  listarEquipes: () =>
    request("/penalidades/equipes", { method: "GET" }),

  listarPenalidades: () =>
    request("/penalidades", { method: "GET" }),

  listarMembrosDaEquipe: (equipeId) =>
  request(`/penalidades/equipes/${equipeId}/membros`, { method: "GET" }),

  criarPenalidade: (dados) =>
    request("/penalidades", {
      method: "POST",
      body: JSON.stringify(dados),
    }),

  participanteSelecionado: (participanteId) =>
    request(`/penalidades/participante-selecionado?participanteId=${participanteId}`, {
      method: "GET",
    }),
};


/**
 * Serviço de Testes
 */
export const testesService = {
  listar: (provaId) => request(`/provas/${provaId}/testes`, { method: 'GET' }),
  responder: (provaId, testeId, resposta) =>
    request(`/provas/${provaId}/testes/${testeId}/resposta`, {
      method: 'POST',
      body: JSON.stringify({ resposta }),
    }),
};


/**
 * Serviço de Migrações de Equipe
 */
export const migracoesService = {
  listarMinhas: () => request('/equipes/migracoes/minhas', { method: 'GET' }),

  listarPendentes: () =>
    request('/equipes/migracoes/pendentes', { method: 'GET' }),

  solicitar: (equipe_destino_id, motivo) =>
    request('/equipes/migracoes/solicitar', {
      method: 'POST',
      body: JSON.stringify({ equipe_destino_id, motivo }),
    }),

  // ✅ Corrigido: backend espera { aprovar }, não { aprovado }
  decidir: (migracaoId, aprovar, justificativa) =>
    request(`/equipes/migracoes/${migracaoId}/decidir`, {
      method: 'PATCH',
      body: JSON.stringify({ aprovar, justificativa }),
    }),
};

/**
 * Serviço de Empréstimos de Equipe
 */
export const emprestimosService = {
  // Lista empréstimos (Admin vê tudo, Coordenador vê apenas os relacionados às suas equipes)
  listar: (status, provaId, usuarioId) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (provaId) params.append('provaId', provaId);
    if (usuarioId) params.append('usuarioId', usuarioId);
    
    const queryString = params.toString();
    return request(`/equipes/emprestimos${queryString ? '?' + queryString : ''}`, { method: 'GET' });
  },

  // Criar novo empréstimo
  criar: (usuario_id, equipe_destino_id, prova_id, inicio, fim) =>
    request('/equipes/emprestimos', {
      method: 'POST',
      body: JSON.stringify({ usuario_id, equipe_destino_id, prova_id, inicio, fim }),
    }),

  // Encerrar empréstimo
  encerrar: (emprestimoId, justificativa) =>
    request(`/equipes/emprestimos/${emprestimoId}/encerrar`, {
      method: 'PATCH',
      body: JSON.stringify({ justificativa }),
    }),
};

/**
 * Serviço de Usuários (apenas ADMIN)
 */
export const usuariosService = {
  // Listar todos os usuários com filtros opcionais
  listar: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.tipo) params.append('tipo', filtros.tipo);
    if (filtros.status) params.append('status', filtros.status);
    if (filtros.turma) params.append('turma', filtros.turma);
    if (filtros.search) params.append('search', filtros.search);
    
    const queryString = params.toString();
    return request(`/usuarios${queryString ? '?' + queryString : ''}`, { method: 'GET' });
  },

  // Obter um usuário específico
  obter: (id) => request(`/usuarios/${id}`, { method: 'GET' }),

  // Criar novo usuário
  criar: (dados) =>
    request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  // Atualizar usuário existente
  atualizar: (id, dados) =>
    request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    }),

  // Deletar usuário
  deletar: (id) => request(`/usuarios/${id}`, { method: 'DELETE' }),

  // Alternar status (ATIVO/INATIVO)
  alternarStatus: (id) =>
    request(`/usuarios/${id}/status`, { method: 'PATCH' }),

  // Obter estatísticas
  obterEstatisticas: () => request('/usuarios/estatisticas', { method: 'GET' }),
};

/**
 * Serviço de Feedbacks (US18)
 */
export const feedbacksService = {
    // Para TODOS os perfis: Enviar um novo feedback/relato
    enviarFeedback: (descricao) =>
        request('/feedbacks', {
            method: 'POST',
            body: JSON.stringify({ descricao }),
        }),

    // Para o ADMIN: Listar todos os feedbacks
    listarFeedbacks: () =>
        request('/feedbacks', {
            method: 'GET',
        }),

    // Para o ADMIN: Responder um feedback
    responderFeedback: (feedbackId, respostaTexto) =>
        request(`/feedbacks/${feedbackId}/responder`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                resposta_admin: respostaTexto 
            }),
        }),

    listarMeusFeedbacks: () =>
          request('/feedbacks/minhos', {
              method: 'GET',
          }),
};

/**
 * Serviço de Notificações (US17)
 */
export const notificacoesService = {
    // Listar todas as notificações do usuário
    listar: (filtros = {}) => {
        const params = new URLSearchParams();
        if (filtros.lida !== undefined) params.append('lida', filtros.lida);
        if (filtros.tipo) params.append('tipo', filtros.tipo);
        
        const queryString = params.toString();
        return request(`/notificacoes${queryString ? '?' + queryString : ''}`, { method: 'GET' });
    },

    // Obter contagem de notificações não lidas
    contarNaoLidas: () =>
        request('/notificacoes/nao-lidas/contagem', { method: 'GET' }),

    // Obter uma notificação específica
    obter: (id) =>
        request(`/notificacoes/${id}`, { method: 'GET' }),

    // Marcar notificação como lida
    marcarComoLida: (id) =>
        request(`/notificacoes/${id}/marcar-lida`, {
            method: 'PATCH',
        }),

    // Marcar todas as notificações como lidas
    marcarTodasComoLidas: () =>
        request('/notificacoes/marcar-todas-lidas', {
            method: 'PATCH',
        }),

    // Deletar uma notificação
    deletar: (id) =>
        request(`/notificacoes/${id}`, { method: 'DELETE' }),
};

export default {
  authService,
  provasService,
  testesService,
  equipesService,
  feedbacksService,
  notificacoesService
};
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

    // Se a resposta for 401 (não autorizado), limpar dados de sessão
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('sessionExpiryTime');
      throw new Error('Sua sessão expirou. Por favor, faça login novamente.');
    }

    // Se a resposta não for ok, lançar erro
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro na requisição');
    }

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
  // Login
  login: (email, senha) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),

  // Logout (apenas limpar cliente)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionExpiryTime');
  },

  // Obter token atual
  getToken: () => localStorage.getItem('token'),

  // Obter usuário atual
  getUsuarioAtual: () => {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  },
};

/**
 * Serviço de Provas
 */
export const provasService = {
  // Listar todas as provas
  listar: () =>
    request('/provas', {
      method: 'GET',
    }),

  // Obter uma prova específica
  obter: (id) =>
    request(`/provas/${id}`, {
      method: 'GET',
    }),

  // Criar nova prova (admin)
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
      }),
    }),

  // Atualizar prova (admin)
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
      }),
    }),

  // Deletar prova (admin)
  deletar: (id) =>
    request(`/provas/${id}`, {
      method: 'DELETE',
    }),
};

/**
* Serviço de Equipes
*/
export const equipesService = {
    // [GET] /api/equipes
    listarEquipes: () =>
      request('/equipes', {
        method: 'GET',
      }),

    // Rota para Coordenadores
    listarCoordenadoresDisponiveis: () =>
      request('/equipes/coordenadores-disponiveis', { method: 'GET' }),
    
    // [POST] /api/equipes
    criarEquipe: (dados) =>
      request('/equipes', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),

    // [PATCH] /api/equipes/:id/membros
    adicionarMembro: (equipeId, usuarioId) =>
      request(`/equipes/${equipeId}/membros`, {
        method: 'PATCH',
        body: JSON.stringify({ usuario_id: usuarioId }),
      }),

    // [GET] /api/equipes/usuarios-disponiveis
    listarMembrosDisponiveis: () =>
      request('/equipes/membros-disponiveis', { method: 'GET' }),

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
};

/**
 * Serviço de Testes
 */
export const testesService = {
  // Listar testes de uma prova
  listar: (provaId) =>
    request(`/provas/${provaId}/testes`, {
      method: 'GET',
    }),

  // Enviar resposta de teste
  responder: (provaId, testeId, resposta) =>
    request(`/provas/${provaId}/testes/${testeId}/resposta`, {
      method: 'POST',
      body: JSON.stringify({ resposta }),
    }),
};

export default {
  authService,
  provasService,
  testesService,
  equipesService, // Adicionado o service de equipes
};

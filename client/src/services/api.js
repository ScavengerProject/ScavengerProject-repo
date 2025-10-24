const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Função helper para fazer requisições
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
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
        formato: dados.formato 
      }),
    }),

  // Atualizar prova (admin)
  atualizar: (id, dados) =>
    request(`/provas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        titulo: dados.titulo,
        descricao: dados.descricao,
        formato: dados.formato 
      }),
    }),

  // Deletar prova (admin)
  deletar: (id) =>
    request(`/provas/${id}`, {
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
};

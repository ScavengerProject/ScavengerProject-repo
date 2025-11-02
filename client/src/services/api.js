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
        const text = await response.text();
        if (text && text.startsWith('<!DOCTYPE')) {
          errorMessage = 'Erro (HTML) do servidor. Verifique a rota no backend.';
        } else if (text) {
          errorMessage = text;
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
      }),
    }),
  deletar: (id) => request(`/provas/${id}`, { method: 'DELETE' }),
};

/**
* Serviço de Equipes
*/
export const equipesService = {
  listarEquipes: () => request('/equipes', { method: 'GET' }),

  // ✅ público para autenticados (nomes/ids) – usado pelos alunos ao solicitar migração
  listarEquipesPublicas: () => request('/equipes/publicas', { method: 'GET' }),

  listarCoordenadoresDisponiveis: () =>
    request('/equipes/coordenadores-disponiveis', { method: 'GET' }),

  criarEquipe: (dados) =>
    request('/equipes', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  adicionarMembro: (equipeId, usuarioId) =>
    request(`/equipes/${equipeId}/membros`, {
      method: 'PATCH',
      body: JSON.stringify({ usuario_id: usuarioId }),
    }),

  listarMembrosDisponiveis: () =>
    request('/equipes/membros-disponiveis', { method: 'GET' }),

  visualizarMinhaEquipe: () =>
    request('/equipes/minha-equipe', { method: 'GET' }),

  adicionarMembroMinhaEquipe: (usuarioId) =>
    request('/equipes/minha-equipe/membros', {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId }),
    }),

  removerMembroMinhaEquipe: (membroId) =>
    request(`/equipes/minha-equipe/membros/${membroId}`, {
      method: 'DELETE',
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

export default {
  authService,
  provasService,
  testesService,
  equipesService,
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

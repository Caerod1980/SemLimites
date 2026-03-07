// ============================================
// api.js - CONFIGURAÇÃO DA API
// ============================================

const AZURE_URL = 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net';

const getApiUrl = () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${AZURE_URL}/api`;
  }
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
}

// ========== API DE AUTENTICAÇÃO ==========
export const authAPI = {
  login: (email, senha, tipo) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha, tipo })
  }),
  
  register: (email, senha, tipo, nome, telefone) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, senha, tipo, nome, telefone })
  }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// ========== API DE PRESTADORES ==========
export const prestadoresAPI = {
  buscar: async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.cidade) params.append('cidade', filtros.cidade);
    if (filtros.categoria) params.append('categoria', filtros.categoria);
    if (filtros.q) params.append('q', filtros.q);
    
    return request(`/prestadores/busca?${params}`);
  },

  getBySlug: (slug) => request(`/prestadores/${slug}`),

  verificarCNPJ: (cnpj) => request('/prestadores/verificar-cnpj', {
    method: 'POST',
    body: JSON.stringify({ cnpj })
  }),

  criar: (dados) => request('/prestadores', {
    method: 'POST',
    body: JSON.stringify(dados)
  }),

  getPerfil: () => request('/prestadores/perfil'),

  atualizarPerfil: (dados) => request('/prestadores/perfil', {
    method: 'PUT',
    body: JSON.stringify(dados)
  })
};

// ========== API DE SERVIÇOS ==========
export const servicosAPI = {
  /**
   * Listar serviços do prestador logado
   * @param {string} status - Filtrar por status (aguardando, avaliado, expirado)
   * @returns {Promise} Lista de serviços
   */
  listar: (status = '') => {
    const params = status ? `?status=${status}` : '';
    return request(`/servicos/meus${params}`);
  },
  
  /**
   * Criar um novo serviço
   * @param {Object} dados - Dados do serviço
   * @returns {Promise} Serviço criado
   */
  criar: (dados) => request('/servicos', {
    method: 'POST',
    body: JSON.stringify(dados)
  }),
  
  /**
   * Buscar serviço por ID
   * @param {string} id - ID do serviço
   * @returns {Promise} Serviço encontrado
   */
  buscarPorId: (id) => request(`/servicos/${id}`),
  
  /**
   * Buscar serviço por token de avaliação (público)
   * @param {string} token - Token de avaliação
   * @returns {Promise} Serviço encontrado
   */
  buscarPorToken: (token) => request(`/servicos/avaliar/${token}`),
  
  /**
   * Registrar avaliação de um serviço (público)
   * @param {string} token - Token de avaliação
   * @param {number} estrelas - Nota de 1 a 5
   * @param {string} comentario - Comentário do cliente
   * @returns {Promise} Resultado da avaliação
   */
  avaliar: (token, estrelas, comentario) => request(`/servicos/avaliar/${token}`, {
    method: 'POST',
    body: JSON.stringify({ estrelas, comentario })
  }),
  
  /**
   * Reenviar link de avaliação (gerar novo token)
   * @param {string} id - ID do serviço
   * @returns {Promise} Novo link gerado
   */
  reenviarLink: (id) => request(`/servicos/${id}/reenviar`, {
    method: 'POST'
  }),
  
  /**
   * Excluir um serviço (apenas não avaliados)
   * @param {string} id - ID do serviço
   * @returns {Promise} Resultado da exclusão
   */
  excluir: (id) => request(`/servicos/${id}`, {
    method: 'DELETE'
  }),
  
  /**
   * Buscar serviços avaliados de um prestador (público para perfil)
   * @param {string} prestadorId - ID do prestador
   * @param {number} limit - Limite de resultados
   * @returns {Promise} Lista de serviços avaliados
   */
  buscarPorPrestador: (prestadorId, limit = 5) => 
    request(`/servicos/prestador/${prestadorId}?limit=${limit}`)
};

// ========== UTILITÁRIOS ==========
export const testarConexao = async () => {
  try {
    const resultado = await fetch(`${AZURE_URL}/health`).then(r => r.json());
    console.log('✅ Conexão OK:', resultado);
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão:', error);
    return false;
  }
};

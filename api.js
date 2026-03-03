// ============================================
// api.js - CONFIGURAÇÃO DA API SEMLIMITES
// ============================================

// 🔥 SUA URL DO AZURE (já configurada!)
const AZURE_URL = 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net';

// Determina a URL base da API
const getApiUrl = () => {
  // Em produção (GitHub Pages), usa o backend no Azure
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${AZURE_URL}/api`;
  }
  
  // Em desenvolvimento local, usa localhost
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

console.log('🌐 API configurada para:', API_URL);
console.log('📡 Ambiente:', window.location.hostname);

// ============================================
// FUNÇÃO GENÉRICA PARA REQUISIÇÕES
// ============================================

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    console.log(`📡 Requisição para: ${url}`);
    
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
}

// ============================================
// API DE PRESTADORES
// ============================================

export const prestadoresAPI = {
  /**
   * Buscar prestadores com filtros
   * @param {Object} filtros - cidade, categoria, q, ordenacao, apenasVerificados, page, limit
   */
  buscar: async (filtros = {}) => {
    // Remove filtros vazios
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );
    
    const params = new URLSearchParams(filtrosLimpos).toString();
    const endpoint = params ? `/prestadores/busca?${params}` : '/prestadores/busca';
    
    return request(endpoint);
  },

  /**
   * Buscar prestador por slug
   * @param {string} slug - slug do prestador (ex: joao-souza-eletricista)
   */
  getBySlug: (slug) => request(`/prestadores/${slug}`),

  /**
   * Verificar CNPJ na Receita Federal
   * @param {string} cnpj - CNPJ a ser verificado
   */
  verificarCNPJ: (cnpj) => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return request('/prestadores/verificar-cnpj', {
      method: 'POST',
      body: JSON.stringify({ cnpj: cnpjLimpo })
    });
  },

  /**
   * Adicionar avaliação a um prestador
   * @param {string} id - ID do prestador
   * @param {Object} dados - { nome, estrelas, texto, servico }
   */
  avaliar: (id, dados) => request(`/prestadores/${id}/avaliacoes`, {
    method: 'POST',
    body: JSON.stringify(dados)
  }),

  /**
   * Buscar avaliações de um prestador
   * @param {string} id - ID do prestador
   */
  getAvaliacoes: (id) => request(`/prestadores/${id}/avaliacoes`)
};

// ============================================
// API DE AUTENTICAÇÃO
// ============================================

export const authAPI = {
  /**
   * Solicitar link mágico de login
   * @param {string} email - E-mail do usuário
   */
  login: (email) => request('/auth/cliente/login', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  /**
   * Verificar token de login
   * @param {string} token - Token recebido por e-mail
   */
  verificarToken: (token) => request(`/auth/verificar/${token}`)
};

// ============================================
// FUNÇÃO DE TESTE RÁPIDO
// ============================================

export const testarConexao = async () => {
  try {
    const resultado = await fetch(`${AZURE_URL}/health`).then(r => r.json());
    console.log('✅ Conexão com Azure OK:', resultado);
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão com Azure:', error);
    return false;
  }
};

// ============================================
// EXPORTAÇÃO PADRÃO
// ============================================

export default {
  prestadores: prestadoresAPI,
  auth: authAPI,
  testarConexao
};

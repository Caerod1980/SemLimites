// /src/services/receitaFederal.js
import axios from 'axios';

// Cache em memória para evitar consultas repetidas
const cache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

// Controle de rate limiting (ReceitaWS gratuita: 3 consultas por minuto)
let ultimasConsultas = [];
const LIMITE_CONSULTAS = 3;
const JANELA_TEMPO = 60 * 1000; // 1 minuto em milissegundos

/**
 * Aguarda até que haja disponibilidade no rate limit
 */
async function aguardarRateLimit() {
    const agora = Date.now();
    
    // Remover consultas antigas da janela
    ultimasConsultas = ultimasConsultas.filter(timestamp => 
        agora - timestamp < JANELA_TEMPO
    );
    
    if (ultimasConsultas.length >= LIMITE_CONSULTAS) {
        // Calcular tempo de espera
        const consultaMaisAntiga = ultimasConsultas[0];
        const tempoEspera = JANELA_TEMPO - (agora - consultaMaisAntiga);
        
        console.log(`⏳ Rate limit atingido. Aguardando ${Math.ceil(tempoEspera / 1000)} segundos...`);
        await new Promise(resolve => setTimeout(resolve, tempoEspera));
    }
    
    // Registrar esta consulta
    ultimasConsultas.push(Date.now());
}

/**
 * Consulta CNPJ na ReceitaWS (API pública)
 * @param {string} cnpj - CNPJ com ou sem pontuação
 * @returns {Promise<Object>} Dados da empresa
 */
export async function consultarCNPJ(cnpj) {
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return { 
        valido: false, 
        motivo: "CNPJ inválido (deve ter 14 dígitos)" 
      };
    }

    // Verificar cache
    const cacheKey = `cnpj_${cnpjLimpo}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📦 Dados do CNPJ ${cnpjLimpo} obtidos do cache`);
        return {
          valido: true,
          situacao: cached.data.situacao,
          empresa: cached.data
        };
      } else {
        cache.delete(cacheKey);
      }
    }

    // Aguardar rate limit
    await aguardarRateLimit();

    console.log(`🔍 Consultando CNPJ real na ReceitaWS: ${cnpjLimpo}`);
    
    // Fazer requisição à ReceitaWS
    const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
      timeout: 10000 // 10 segundos de timeout
    });

    const data = response.data;
    
    // Verificar se a consulta foi bem-sucedida
    if (data.status === 'ERROR') {
      return {
        valido: false,
        motivo: data.message || 'CNPJ não encontrado na Receita Federal'
      };
    }

    // Verificar se o CNPJ está ativo
    const situacao = data.situacao || 'DESCONHECIDA';
    const isAtivo = situacao.toUpperCase() === 'ATIVA';

    // Estruturar dados relevantes
    const empresa = {
      razaoSocial: data.nome || 'Não informado',
      nomeFantasia: data.fantasia || data.nome || 'Não informado',
      dataAbertura: data.abertura || 'Não informada',
      situacao: situacao,
      dataSituacao: data.data_situacao || null,
      tipo: data.tipo || 'Não informado',
      porte: data.porte || 'Não informado',
      naturezaJuridica: data.natureza_juridica || 'Não informada',
      atividadePrincipal: data.atividade_principal?.[0]?.text || 'Não informada',
      atividadesSecundarias: data.atividades_secundarias?.map(a => a.text) || [],
      endereco: {
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cep: data.cep || '',
        municipio: data.municipio || '',
        uf: data.uf || ''
      },
      enderecoCompleto: `${data.logradouro || ''}, ${data.numero || ''}${data.complemento ? ' - ' + data.complemento : ''} - ${data.bairro || ''}, ${data.municipio || ''}/${data.uf || ''}`.trim(),
      contato: {
        telefone: data.telefone || 'Não informado',
        email: data.email || 'Não informado'
      },
      capitalSocial: data.capital_social || '0',
      simples: {
        optante: data.simples?.optante === 'S',
        dataOpcao: data.simples?.data_opcao || null,
        dataExclusao: data.simples?.data_exclusao || null
      },
      mei: data.simei?.optante === 'S'
    };

    // Salvar no cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: empresa
    });

    return {
      valido: isAtivo,
      situacao: situacao,
      empresa: empresa
    };

  } catch (error) {
    console.error('❌ Erro ao consultar CNPJ na ReceitaWS:', error.message);
    
    // Tratamento específico para erros
    if (error.code === 'ECONNABORTED') {
      return { 
        valido: false, 
        motivo: "Tempo limite excedido. Tente novamente." 
      };
    }
    
    if (error.response && error.response.status === 429) {
      return { 
        valido: false, 
        motivo: "Muitas consultas. Aguarde um minuto e tente novamente." 
      };
    }
    
    return { 
      valido: false, 
      motivo: "Erro ao consultar Receita Federal. Tente novamente mais tarde." 
    };
  }
}

/**
 * Versão com API Key (para plano pago da ReceitaWS)
 */
export async function consultarCNPJComChave(cnpj, apiKey) {
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    
    const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    // Processar dados (similar à função principal)
    const data = response.data;
    
    if (data.status === 'ERROR') {
      return { valido: false, motivo: data.message };
    }

    return {
      valido: data.situacao === 'ATIVA',
      situacao: data.situacao,
      empresa: {
        razaoSocial: data.nome,
        nomeFantasia: data.fantasia,
        dataAbertura: data.abertura,
        atividadePrincipal: data.atividade_principal?.[0]?.text,
        endereco: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`,
        telefone: data.telefone
      }
    };

  } catch (error) {
    console.error('Erro ao consultar CNPJ com chave:', error);
    return { valido: false, motivo: "Erro na consulta" };
  }
}

// Manter os dados mockados para testes (opcional)
export const MOCK_CNPJS = {
  "12345678000199": {
    nome: "J. SOUZA ELETRICISTA LTDA",
    fantasia: "JOÃO SOUZA ELETRICISTA"
  },
  "98765432000188": {
    nome: "PAULA MARTINS DIARISTA ME",
    fantasia: "PAULA MARTINS"
  },
  "11122233000177": {
    nome: "RAFAEL LIMA ENCANADOR LTDA",
    fantasia: "R LIMA ENCANADOR"
  }
};

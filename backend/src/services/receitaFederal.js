// /src/services/receitaFederal.js
import axios from 'axios';

// Cache em memória para evitar consultas repetidas
const cache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

// Controle de rate limiting
let ultimasConsultas = [];
const LIMITE_CONSULTAS = 10; // Aumentei para 10 consultas
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
        const consultaMaisAntiga = ultimasConsultas[0];
        const tempoEspera = JANELA_TEMPO - (agora - consultaMaisAntiga);
        
        console.log(`⏳ Rate limit atingido. Aguardando ${Math.ceil(tempoEspera / 1000)} segundos...`);
        await new Promise(resolve => setTimeout(resolve, tempoEspera));
    }
    
    ultimasConsultas.push(Date.now());
}

/**
 * Consulta CNPJ na BrasilAPI (mais confiável)
 * @param {string} cnpj - CNPJ com ou sem pontuação
 * @returns {Promise<Object>} Dados da empresa
 */
async function consultarCNPJBrasilAPI(cnpjLimpo) {
    try {
        console.log(`🔍 Consultando CNPJ na BrasilAPI: ${cnpjLimpo}`);
        
        const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'SemLimites/1.0'
            }
        });

        const data = response.data;
        
        // Mapear dados da BrasilAPI para o formato esperado
        return {
            success: true,
            fonte: 'brasilapi',
            dados: {
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia || data.razao_social,
                situacao: data.descricao_situacao_cadastral || data.situacao_cadastral,
                situacao_cadastral: data.descricao_situacao_cadastral || data.situacao_cadastral,
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento || '',
                bairro: data.bairro,
                municipio: data.municipio,
                uf: data.uf,
                cep: data.cep,
                telefone: data.ddd_telefone_1 || '',
                email: data.email || '',
                data_abertura: data.data_inicio_atividade,
                porte: data.porte,
                natureza_juridica: data.natureza_juridica,
                capital_social: data.capital_social,
                cnae_principal: data.cnae_fiscal_descricao,
                atividade_principal: data.cnae_fiscal_descricao
            }
        };
    } catch (error) {
        console.error(`❌ Erro na BrasilAPI:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Consulta CNPJ na ReceitaWS (fallback)
 * @param {string} cnpjLimpo 
 * @returns {Promise<Object>}
 */
async function consultarCNPJReceitaWS(cnpjLimpo) {
    try {
        console.log(`🔍 Consultando CNPJ na ReceitaWS: ${cnpjLimpo}`);
        
        const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            timeout: 10000
        });

        const data = response.data;
        
        // Verificar se a consulta foi bem-sucedida
        if (data.status === 'ERROR') {
            return { 
                success: false, 
                error: data.message || 'CNPJ não encontrado na ReceitaWS' 
            };
        }

        // Mapear dados da ReceitaWS
        return {
            success: true,
            fonte: 'receitaws',
            dados: {
                razao_social: data.nome || '',
                nome_fantasia: data.fantasia || data.nome || '',
                situacao: data.situacao || '',
                situacao_cadastral: data.situacao || '',
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                municipio: data.municipio || '',
                uf: data.uf || '',
                cep: data.cep || '',
                telefone: data.telefone || '',
                email: data.email || '',
                data_abertura: data.abertura || '',
                porte: data.porte || '',
                natureza_juridica: data.natureza_juridica || '',
                capital_social: data.capital_social || '0',
                cnae_principal: data.atividade_principal?.[0]?.text || '',
                atividade_principal: data.atividade_principal?.[0]?.text || ''
            }
        };
    } catch (error) {
        console.error(`❌ Erro na ReceitaWS:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Consulta CNPJ com fallback automático
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
                    valido: cached.situacao === 'ATIVA' || cached.situacao === 'Ativa',
                    situacao: cached.situacao,
                    empresa: cached.dados
                };
            } else {
                cache.delete(cacheKey);
            }
        }

        // Aguardar rate limit
        await aguardarRateLimit();

        // Tentar BrasilAPI primeiro (mais confiável)
        let resultado = await consultarCNPJBrasilAPI(cnpjLimpo);
        
        // Se falhar, tentar ReceitaWS
        if (!resultado.success) {
            console.log('⚠️ BrasilAPI falhou, tentando ReceitaWS...');
            resultado = await consultarCNPJReceitaWS(cnpjLimpo);
        }

        if (!resultado.success) {
            return {
                valido: false,
                motivo: "Não foi possível consultar o CNPJ em nenhuma fonte. Tente novamente mais tarde."
            };
        }

        const dados = resultado.dados;
        
        // Verificar se o CNPJ está ativo (aceitar diferentes formatos)
        const situacao = dados.situacao || '';
        const isAtivo = situacao.toUpperCase().includes('ATIVA') || 
                       situacao.toUpperCase() === 'ATIVO' ||
                       situacao.toUpperCase().includes('REGULAR') ||
                       situacao.toUpperCase().includes('HABILITADO');

        // Estruturar dados retornados
        const empresa = {
            razaoSocial: dados.razao_social || 'Não informado',
            nomeFantasia: dados.nome_fantasia || dados.razao_social || 'Não informado',
            dataAbertura: dados.data_abertura || 'Não informada',
            situacao: dados.situacao || dados.situacao_cadastral || 'DESCONHECIDA',
            dataSituacao: null,
            tipo: 'MATRIZ',
            porte: dados.porte || 'Não informado',
            naturezaJuridica: dados.natureza_juridica || 'Não informada',
            atividadePrincipal: dados.atividade_principal || dados.cnae_principal || 'Não informada',
            atividadesSecundarias: [],
            endereco: {
                logradouro: dados.logradouro || '',
                numero: dados.numero || '',
                complemento: dados.complemento || '',
                bairro: dados.bairro || '',
                cep: dados.cep || '',
                municipio: dados.municipio || '',
                uf: dados.uf || ''
            },
            enderecoCompleto: `${dados.logradouro || ''}, ${dados.numero || ''}${dados.complemento ? ' - ' + dados.complemento : ''} - ${dados.bairro || ''}, ${dados.municipio || ''}/${dados.uf || ''}`.trim(),
            contato: {
                telefone: dados.telefone || 'Não informado',
                email: dados.email || 'Não informado'
            },
            capitalSocial: dados.capital_social || '0',
            simples: {
                optante: false,
                dataOpcao: null,
                dataExclusao: null
            },
            mei: false,
            fonte: resultado.fonte
        };

        // Salvar no cache
        cache.set(cacheKey, {
            timestamp: Date.now(),
            situacao: dados.situacao,
            dados: empresa
        });

        return {
            valido: isAtivo,
            situacao: dados.situacao,
            empresa: empresa
        };

    } catch (error) {
        console.error('❌ Erro ao consultar CNPJ:', error.message);
        
        return { 
            valido: false, 
            motivo: "Erro ao consultar Receita Federal. Tente novamente mais tarde." 
        };
    }
}

/**
 * Versão simplificada para validação rápida
 */
export async function validarCNPJ(cnpj) {
    const resultado = await consultarCNPJ(cnpj);
    return {
        valido: resultado.valido,
        situacao: resultado.situacao,
        razaoSocial: resultado.empresa?.razaoSocial
    };
}

// Manter MOCK_CNPJS para testes (opcional)
export const MOCK_CNPJS = {
    "12345678000199": {
        nome: "J. SOUZA ELETRICISTA LTDA",
        fantasia: "JOÃO SOUZA ELETRICISTA",
        situacao: "ATIVA"
    },
    "98765432000188": {
        nome: "PAULA MARTINS DIARISTA ME",
        fantasia: "PAULA MARTINS",
        situacao: "ATIVA"
    },
    "11122233000177": {
        nome: "RAFAEL LIMA ENCANADOR LTDA",
        fantasia: "R LIMA ENCANADOR",
        situacao: "ATIVA"
    }
};

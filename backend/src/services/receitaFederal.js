// /src/services/receitaFederal.js
import axios from 'axios';

// Cache em memória para evitar consultas repetidas
const cache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

// Controle de rate limiting
let ultimasConsultas = [];
const LIMITE_CONSULTAS = 10;
const JANELA_TEMPO = 60 * 1000; // 1 minuto

/**
 * Aguarda até que haja disponibilidade no rate limit
 */
async function aguardarRateLimit() {
    const agora = Date.now();
    
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
 * Consulta CNPJ na BrasilAPI
 */
async function consultarCNPJBrasilAPI(cnpjLimpo) {
    try {
        console.log(`🔍 Consultando CNPJ na BrasilAPI: ${cnpjLimpo}`);
        
        const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'SemLimites/1.0' }
        });

        const data = response.data;
        
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
                capital_social: data.capital_social
            }
        };
    } catch (error) {
        console.error(`❌ Erro na BrasilAPI:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Consulta CNPJ na ReceitaWS
 */
async function consultarCNPJReceitaWS(cnpjLimpo) {
    try {
        console.log(`🔍 Consultando CNPJ na ReceitaWS: ${cnpjLimpo}`);
        
        const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            timeout: 10000
        });

        const data = response.data;
        
        if (data.status === 'ERROR') {
            return { success: false, error: data.message };
        }

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
                capital_social: data.capital_social || '0'
            }
        };
    } catch (error) {
        console.error(`❌ Erro na ReceitaWS:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Consulta CNPJ principal
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
                    valido: cached.valido,
                    situacao: cached.situacao,
                    empresa: cached.empresa
                };
            }
        }

        // Aguardar rate limit
        await aguardarRateLimit();

        // Tentar BrasilAPI primeiro
        let resultado = await consultarCNPJBrasilAPI(cnpjLimpo);
        
        // Se falhar, tentar ReceitaWS
        if (!resultado.success) {
            console.log('⚠️ BrasilAPI falhou, tentando ReceitaWS...');
            resultado = await consultarCNPJReceitaWS(cnpjLimpo);
        }

        if (!resultado.success) {
            return {
                valido: false,
                motivo: "Não foi possível consultar o CNPJ. Tente novamente mais tarde."
            };
        }

        const dados = resultado.dados;
        
        // CORREÇÃO: Verificar situação de forma mais precisa
        const situacao = dados.situacao || '';
        const situacaoUpper = situacao.toUpperCase().trim();
        
        // Lista de situações consideradas ativas
        const situacoesAtivas = ['ATIVA', 'ATIVO', 'REGULAR', 'HABILITADO', 'APTA', 'ATIVO'];
        
        const isAtivo = situacoesAtivas.some(s => situacaoUpper.includes(s));

        // Estruturar dados retornados
        const empresa = {
            razaoSocial: dados.razao_social || 'Não informado',
            nomeFantasia: dados.nome_fantasia || dados.razao_social || 'Não informado',
            dataAbertura: dados.data_abertura || 'Não informada',
            situacao: situacao,
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
            porte: dados.porte || 'Não informado',
            naturezaJuridica: dados.natureza_juridica || 'Não informada',
            fonte: resultado.fonte
        };

        // Salvar no cache
        cache.set(cacheKey, {
            timestamp: Date.now(),
            valido: isAtivo,
            situacao: situacao,
            empresa: empresa
        });

        return {
            valido: isAtivo,
            situacao: situacao,
            empresa: empresa
        };

    } catch (error) {
        console.error('❌ Erro ao consultar CNPJ:', error.message);
        
        return { 
            valido: false, 
            motivo: "Erro ao consultar CNPJ. Tente novamente." 
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

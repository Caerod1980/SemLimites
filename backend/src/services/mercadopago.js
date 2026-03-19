// /src/services/mercadopago.js
import { MercadoPagoConfig, Preference, Payment, Customer, MerchantOrder } from 'mercadopago';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado!');
}

// Configuração do cliente Mercado Pago - NOVA FORMA DE CONFIGURAÇÃO
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { 
    timeout: 10000, // Aumentei o timeout para 10 segundos
    idempotencyKey: crypto.randomUUID()
  }
});

// Instâncias dos serviços
const preference = new Preference(client);
const payment = new Payment(client);
const customer = new Customer(client);
const merchantOrder = new MerchantOrder(client);

/**
 * Cria uma preferência de pagamento (pública - para cadastro)
 * @param {Object} dados - Dados do cliente
 * @returns {Promise<Object>} Dados da preferência
 */
export async function criarPreferenciaPublica({ email, nome, plano = 'mensal', valor = 29.90 }) {
  try {
    console.log(`📝 Criando preferência pública para: ${email}`);
    
    // Criar preferência de pagamento
    const body = {
      items: [
        {
          id: `plano-${plano}-${Date.now()}`,
          title: `Plano SemLimites - ${plano === 'mensal' ? 'Mensalidade' : 'Plano Anual'}`,
          description: 'Acesso à plataforma SemLimites para prestadores de serviço',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valor,
          category_id: 'services',
          picture_url: 'https://semlimites.com.br/logo.png'
        }
      ],
      payer: {
        email: email,
        name: nome
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/cadastro/sucesso`,
        failure: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/cadastro/erro`,
        pending: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/cadastro/pendente`
      },
      auto_return: 'approved',
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' }
        ]
      },
      metadata: {
        tipo: 'assinatura_mensal',
        email: email,
        nome: nome,
        ambiente: process.env.NODE_ENV || 'production'
      },
      notification_url: `${process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net'}/api/webhooks/mercadopago`
    };
    
    const response = await preference.create({ body });
    
    console.log(`✅ Preferência criada com ID: ${response.id}`);
    
    return {
      success: true,
      preferenceId: response.id,
      initPoint: response.init_point || response.sandbox_init_point,
      sandboxInitPoint: response.sandbox_init_point
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar preferência pública:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Cria uma assinatura (ordem) para o prestador
 * @param {Object} dados - Dados do prestador e plano
 * @returns {Promise<Object>} Dados da assinatura criada
 */
export async function criarAssinatura(dados) {
  try {
    const { prestadorId, email, nome, cpf, plano = 'mensal', valor = 29.90 } = dados;
    
    console.log(`📝 Criando assinatura para prestador: ${prestadorId}`);
    
    // 1. Criar ou buscar cliente no Mercado Pago
    let customerId = null;
    try {
      const customerResponse = await customer.search({ email });
      if (customerResponse.results && customerResponse.results.length > 0) {
        customerId = customerResponse.results[0].id;
        console.log(`👤 Cliente existente encontrado: ${customerId}`);
      }
    } catch (error) {
      console.log('Cliente não encontrado, criando novo...');
    }
    
    // 2. Criar preferência de pagamento
    const body = {
      items: [
        {
          id: `plano-${plano}-${prestadorId}`,
          title: `Plano SemLimites - ${plano === 'mensal' ? 'Mensalidade' : 'Plano Anual'}`,
          description: 'Acesso à plataforma SemLimites para prestadores de serviço',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valor,
          category_id: 'services'
        }
      ],
      payer: {
        email: email,
        name: nome
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/dashboard?pagamento=sucesso`,
        failure: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/dashboard?pagamento=erro`,
        pending: `${process.env.FRONTEND_URL || 'https://caerod1980.github.io'}/SemLimites/dashboard?pagamento=pending`
      },
      auto_return: 'approved',
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' }
        ]
      },
      metadata: {
        prestador_id: prestadorId,
        tipo: 'assinatura_mensal',
        ambiente: process.env.NODE_ENV || 'production'
      },
      notification_url: `${process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net'}/api/webhooks/mercadopago`
    };
    
    // Se tiver customerId, associar
    if (customerId) {
      body.payer.id = customerId;
    }
    
    // Se tiver CPF, adicionar identificação
    if (cpf) {
      body.payer.identification = {
        type: 'CPF',
        number: cpf.replace(/\D/g, '')
      };
    }
    
    const response = await preference.create({ body });
    
    console.log(`✅ Assinatura criada com ID: ${response.id}`);
    
    return {
      success: true,
      preferenceId: response.id,
      initPoint: response.init_point || response.sandbox_init_point,
      sandboxInitPoint: response.sandbox_init_point,
      customerId: customerId
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar assinatura:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Processa notificação de pagamento recebida via webhook
 * @param {Object} notificacao - Dados da notificação
 * @returns {Promise<Object>} Resultado do processamento
 */
export async function processarNotificacao(notificacao) {
  try {
    console.log('📩 Processando notificação:', JSON.stringify(notificacao, null, 2));
    
    const { action, data, type } = notificacao;
    
    // Verificar tipo de notificação
    if (type !== 'payment') {
      console.log(`⏭️ Tipo ignorado: ${type}`);
      return { success: true, message: 'Tipo ignorado' };
    }
    
    // Buscar detalhes do pagamento
    const paymentId = data.id;
    console.log(`💰 Buscando detalhes do pagamento: ${paymentId}`);
    
    const paymentData = await payment.get({ id: paymentId });
    
    console.log('📊 Dados do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      metadata: paymentData.metadata
    });
    
    // Extrair ID do prestador dos metadados
    const prestadorId = paymentData.metadata?.prestador_id;
    
    if (!prestadorId) {
      console.error('❌ prestador_id não encontrado nos metadados');
      return { success: false, error: 'prestador_id não encontrado' };
    }
    
    // Retornar dados para atualização no banco
    return {
      success: true,
      prestadorId,
      paymentId: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      valor: paymentData.transaction_amount,
      dataPagamento: new Date(),
      metadata: paymentData.metadata
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar notificação:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Busca status de uma assinatura
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<Object>} Status da assinatura
 */
export async function buscarStatusAssinatura(paymentId) {
  try {
    const paymentData = await payment.get({ id: paymentId });
    
    return {
      success: true,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      data: paymentData
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancela uma assinatura no Mercado Pago
 * @param {string} paymentId - ID do pagamento/preferência
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelarAssinatura(paymentId) {
  try {
    console.log(`🔄 Tentando cancelar assinatura: ${paymentId}`);
    
    // Verificar se é uma preferência ou um pagamento
    if (paymentId.includes('-')) {
      // É uma preferência (formato: 257585069-xxxxx)
      console.log(`ℹ️ É uma preferência. Não é possível cancelar diretamente.`);
      
      // Para preferências, podemos apenas marcar como cancelada no nosso banco
      // Ou tentar cancelar o pagamento associado se existir
      
      return {
        success: true,
        message: 'Preferência marcada como cancelada no sistema',
        tipo: 'preferencia'
      };
    } else {
      // É um paymentId numérico - podemos tentar cancelar
      try {
        const response = await payment.cancel({ id: paymentId });
        
        console.log(`✅ Assinatura ${paymentId} cancelada no Mercado Pago`);
        
        return {
          success: true,
          data: response,
          tipo: 'payment'
        };
      } catch (cancelError) {
        console.error('❌ Erro ao cancelar payment:', cancelError);
        
        // Se não conseguir cancelar, pelo menos registramos
        return {
          success: true,
          message: 'Não foi possível cancelar no Mercado Pago, mas removido do sistema',
          tipo: 'erro_cancelamento'
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { client, preference, payment, customer, merchantOrder };

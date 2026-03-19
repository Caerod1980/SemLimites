// /src/services/mercadopago.js
import { MercadoPagoConfig, Preference, Payment, Customer, MerchantOrder } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do cliente Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { 
    timeout: 5000,
    idempotencyKey: crypto.randomUUID()
  }
});

// Instâncias dos serviços
const preference = new Preference(client);
const payment = new Payment(client);
const customer = new Customer(client);
const merchantOrder = new MerchantOrder(client);

/**
 * Cria uma assinatura (ordem) para o prestador
 * @param {Object} dados - Dados do prestador e plano
 * @returns {Promise<Object>} Dados da assinatura criada
 */
export async function criarAssinatura(dados) {
  try {
    const { prestadorId, email, nome, plano = 'mensal', valor = 29.90 } = dados;
    
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
    
    // 2. Criar preferência de pagamento com assinatura
    const body = {
      items: [
        {
          id: `plano-${plano}-${prestadorId}`,
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
        name: nome,
        identification: {
          type: 'CPF',
          number: dados.cpf || '00000000000'
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/SemLimites/cadastro/sucesso?prestador=${prestadorId}`,
        failure: `${process.env.FRONTEND_URL}/SemLimites/cadastro/erro`,
        pending: `${process.env.FRONTEND_URL}/SemLimites/cadastro/pendente`
      },
      auto_return: 'approved',
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'debit_card' }
        ]
      },
      metadata: {
        prestador_id: prestadorId,
        tipo: 'assinatura_mensal',
        ambiente: process.env.NODE_ENV || 'production'
      },
      // Configuração específica para assinatura recorrente
      subscription_plan: {
        frequency: 1,
        frequency_type: 'months',
        repetitions: 12,
        billing_day: 1,
        free_trial: {
          frequency: 7,
          frequency_type: 'days'
        }
      }
    };
    
    // Se tiver customerId, associar
    if (customerId) {
      body.payer.id = customerId;
    }
    
    const response = await preference.create({ body });
    
    console.log(`✅ Assinatura criada com ID: ${response.id}`);
    
    return {
      success: true,
      preferenceId: response.id,
      initPoint: response.init_point,
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
    console.log('📩 Processando notificação:', notificacao);
    
    const { action, data, type } = notificacao;
    
    // Verificar tipo de notificação
    if (type !== 'payment' && type !== 'subscription') {
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
      external_reference: paymentData.external_reference,
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
 * Cancela uma assinatura
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelarAssinatura(paymentId) {
  try {
    const response = await payment.cancel({ id: paymentId });
    
    console.log(`✅ Assinatura ${paymentId} cancelada`);
    
    return {
      success: true,
      data: response
    };
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { client, preference, payment, customer, merchantOrder };

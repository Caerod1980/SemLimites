// /src/services/mercadopago.js
import pkg from 'mercadopago';
import dotenv from 'dotenv';
import crypto from 'crypto';

const { MercadoPagoConfig, Preference, Payment, Customer, MerchantOrder } = pkg;

dotenv.config();

if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado!');
}

// Determinar ambiente baseado no token
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const IS_PRODUCTION = ACCESS_TOKEN && ACCESS_TOKEN.startsWith('APP_USR-');
const AMBIENTE = IS_PRODUCTION ? 'PRODUÇÃO' : 'SANDBOX';

console.log(`🌍 Mercado Pago configurado em: ${AMBIENTE}`);
console.log(`🔑 Token prefixo: ${ACCESS_TOKEN?.substring(0, 8)}...`);

const client = new MercadoPagoConfig({
  accessToken: ACCESS_TOKEN,
  options: { 
    timeout: 10000,
    idempotencyKey: crypto.randomUUID()
  }
});

const preference = new Preference(client);
const payment = new Payment(client);
const customer = new Customer(client);
const merchantOrder = new MerchantOrder(client);

// ========== CONSTANTES ==========
const PLANO_MENSAL_ID = process.env.MP_PLAN_ID_MENSAL; // ID do plano criado na interface
const VALOR_MENSAL = 9.90;

// ========== FUNÇÕES PARA ASSINATURA USANDO API REST ==========

/**
 * Cria assinatura recorrente no Mercado Pago usando API REST
 * @param {Object} params - Parâmetros da assinatura
 * @param {string} params.email - Email do prestador
 * @param {string} params.nome - Nome do prestador
 * @param {string} params.prestadorId - ID do prestador (opcional)
 * @param {string} params.cpf - CPF do prestador (opcional)
 * @param {string} params.cardTokenId - Token do cartão gerado pelo CardForm (OBRIGATÓRIO)
 * @returns {Promise<Object>} Resultado da criação
 */
export async function criarAssinaturaRecorrente({ email, nome, prestadorId, cpf, cardTokenId }) {
  try {
    console.log(`📝 [${AMBIENTE}] Criando assinatura recorrente para: ${email}`);
    console.log(`🏷️ Plano ID: ${PLANO_MENSAL_ID}`);
    console.log(`💳 Card Token: ${cardTokenId ? '✅ RECEBIDO' : '❌ NÃO RECEBIDO'}`);
    
    if (!PLANO_MENSAL_ID) {
      console.error('❌ MP_PLAN_ID_MENSAL não configurado!');
      return { 
        success: false, 
        error: 'Plano de assinatura não configurado. Configure MP_PLAN_ID_MENSAL no .env' 
      };
    }
    
    // ===== VALIDAÇÃO OBRIGATÓRIA: cardTokenId é necessário =====
    if (!cardTokenId) {
      console.error('❌ card_token_id não fornecido');
      return { 
        success: false, 
        error: 'card_token_id é obrigatório para criar assinatura' 
      };
    }
    
    // Usar API REST diretamente
    const url = 'https://api.mercadopago.com/preapproval';
    
    // ===== CORREÇÃO: Body com card_token_id e status 'authorized' =====
    const body = {
      preapproval_plan_id: PLANO_MENSAL_ID,
      reason: 'Plano Mensal SemLimites - Prestadores',
      external_reference: `prestador_${prestadorId || 'novo'}_${Date.now()}`,
      payer_email: email,
      card_token_id: cardTokenId,           // ← ADICIONADO: Token do cartão
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: VALOR_MENSAL,
        currency_id: 'BRL'
      },
      status: 'authorized'                  // ← ALTERADO: de 'pending' para 'authorized'
    };
    
    // Adicionar dados do pagador
    body.payer = {
      email: email,
      name: nome,
      identification: cpf ? {
        type: 'CPF',
        number: cpf.replace(/\D/g, '')
      } : undefined
    };
    
    console.log('📤 Enviando para Mercado Pago (API REST):', JSON.stringify({
      ...body,
      card_token_id: '***'  // Esconder token no log por segurança
    }, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na API do Mercado Pago:', data);
      throw new Error(data.message || 'Erro ao criar assinatura');
    }
    
    console.log(`✅ Assinatura criada com ID: ${data.id}`);
    console.log(`📊 Status: ${data.status}`);
    
    return {
      success: true,
      subscriptionId: data.id,
      customerId: data.payer_id,
      status: data.status,
      ambiente: AMBIENTE
      // ⚠️ NÃO retornar initPoint - assinatura já está autorizada
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar assinatura recorrente:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Busca status de uma assinatura recorrente
 */
export async function buscarStatusAssinatura(subscriptionId) {
  try {
    console.log(`🔍 [${AMBIENTE}] Buscando status da assinatura: ${subscriptionId}`);
    
    const url = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro ao buscar assinatura:', data);
      throw new Error(data.message || 'Erro ao buscar assinatura');
    }
    
    console.log(`📊 Status: ${data.status}`);
    
    return {
      success: true,
      status: data.status,
      nextPaymentDate: data.next_payment_date,
      lastPaymentDate: data.last_payment_date,
      paymentMethodId: data.payment_method_id,
      externalReference: data.external_reference,
      data: data
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar status da assinatura:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Cancela uma assinatura recorrente
 * @param {string} subscriptionId - ID da assinatura (preapproval)
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelarAssinaturaRecorrente(subscriptionId) {
  try {
    console.log(`🔄 [${AMBIENTE}] Cancelando assinatura recorrente: ${subscriptionId}`);
    
    const url = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro ao cancelar assinatura:', data);
      throw new Error(data.message || 'Erro ao cancelar assinatura');
    }
    
    console.log(`✅ Assinatura ${subscriptionId} cancelada com sucesso`);
    
    return {
      success: true,
      data: data,
      message: 'Assinatura cancelada com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura recorrente:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ========== FUNÇÕES EXISTENTES (MANTIDAS) ==========

/**
 * Cria preferência de pagamento para cadastro de prestador (PAGAMENTO ÚNICO)
 */
export async function criarPreferenciaPublica({ email, nome, plano = 'mensal', valor = 9.90 }) {
  try {
    console.log(`📝 [${AMBIENTE}] Criando preferência para: ${email}`);
    
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
          picture_url: 'https://www.semlimitesprestadores.com.br/logo.png'
        }
      ],
      payer: {
        email: email,
        name: nome
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'https://www.semlimitesprestadores.com.br'}/cadastro?retorno=sucesso`,
        failure: `${process.env.FRONTEND_URL || 'https://www.semlimitesprestadores.com.br'}/cadastro?retorno=erro`,
        pending: `${process.env.FRONTEND_URL || 'https://www.semlimitesprestadores.com.br'}/cadastro?retorno=pending`
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
        ambiente: AMBIENTE
      },
      notification_url: `${process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net'}/api/assinatura/webhooks/mercadopago`
    };
    
    const response = await preference.create({ body });
    
    console.log(`✅ Preferência criada com ID: ${response.id}`);
    
    return {
      success: true,
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      ambiente: AMBIENTE
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Processa notificação de pagamento/assinatura recebida via webhook
 */
export async function processarNotificacao(notificacao) {
  try {
    console.log(`📩 [${AMBIENTE}] Processando notificação`);
    console.log('📦 Payload:', JSON.stringify(notificacao, null, 2));

    const { data, type, topic } = notificacao;
    const tipoNotificacao = type || topic;

    // ===============================
    // TRATAR SOMENTE EVENTOS DA ASSINATURA (PREAPPROVAL)
    // ===============================
    if (
      tipoNotificacao === 'subscription_preapproval' ||
      tipoNotificacao === 'preapproval'
    ) {
      const subscriptionId = data?.id;

      if (!subscriptionId) {
        return {
          success: false,
          error: 'subscriptionId não encontrado'
        };
      }

      const statusAssinatura = await buscarStatusAssinatura(subscriptionId);

      if (!statusAssinatura.success) {
        return {
          success: false,
          type: 'subscription',
          subscriptionId,
          error: statusAssinatura.error
        };
      }

      const dados = statusAssinatura.data || {};

      console.log(`📊 Assinatura ${subscriptionId} com status: ${dados.status}`);

      return {
        success: true,
        type: 'subscription',
        subscriptionId,
        status: dados.status,
        externalReference: dados.external_reference || null,
        payerEmail: dados.payer_email || null,
        raw: dados
      };
    }

    // ===============================
    // IGNORAR EVENTOS DE PAYMENT/AUTHORIZED_PAYMENT
    // ===============================
    if (
      tipoNotificacao === 'subscription_authorized_payment' ||
      tipoNotificacao === 'payment'
    ) {
      console.log(`⏭️ Ignorando evento de pagamento: ${tipoNotificacao}`);
      return { success: true };
    }

    console.log(`⏭️ Tipo ignorado: ${tipoNotificacao}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Erro ao processar notificação:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Busca status de um pagamento (mantido para compatibilidade)
 */
export async function buscarStatusPagamento(paymentId) {
  try {
    const paymentData = await payment.get({ id: paymentId });
    
    console.log(`📊 Status do pagamento ${paymentId}: ${paymentData.status}`);
    
    return {
      success: true,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      data: paymentData
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancela assinatura/pagamento (mantido para compatibilidade)
 * ATENÇÃO: Esta função é para pagamentos únicos. Para assinaturas recorrentes,
 * use cancelarAssinaturaRecorrente()
 */
export async function cancelarAssinatura(paymentId) {
  try {
    console.log(`🔄 [${AMBIENTE}] Cancelando: ${paymentId}`);
    
    // IDs de preferência contêm hífen, IDs de pagamento são apenas números
    if (paymentId.includes('-')) {
      console.log(`ℹ️ É uma preferência. Cancelamento apenas no sistema.`);
      return {
        success: true,
        message: 'Preferência cancelada no sistema',
        tipo: 'preferencia'
      };
    }
    
    try {
      const response = await payment.cancel({ id: paymentId });
      console.log(`✅ Pagamento ${paymentId} cancelado com sucesso`);
      return {
        success: true,
        data: response,
        tipo: 'payment'
      };
    } catch (cancelError) {
      console.error(`❌ Erro ao cancelar: ${cancelError.message}`);
      return {
        success: false,
        message: 'Não foi possível cancelar no Mercado Pago',
        error: cancelError.message
      };
    }
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    return { success: false, error: error.message };
  }
}

// ========== EXPORTAÇÕES ==========
export { 
  client, 
  preference, 
  payment, 
  customer, 
  merchantOrder
};

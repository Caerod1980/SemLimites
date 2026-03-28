// /src/services/mercadopago.js
import pkg from 'mercadopago';
import dotenv from 'dotenv';
import crypto from 'crypto';

const { MercadoPagoConfig, Preference, Payment, Customer, MerchantOrder, Subscription } = pkg;

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
const subscription = new Subscription(client); // AGORA FUNCIONA

// ========== CONSTANTES ==========
const PLANO_MENSAL_ID = process.env.MP_PLAN_ID_MENSAL; // ID do plano criado na interface
const VALOR_MENSAL = 9.90;

// ========== FUNÇÕES EXISTENTES (MANTIDAS) ==========

/**
 * Cria preferência de pagamento para cadastro de prestador (PAGAMENTO ÚNICO)
 * Mantido para compatibilidade, mas recomendado usar criarAssinaturaRecorrente
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

// ========== NOVAS FUNÇÕES PARA ASSINATURA RECORRENTE ==========

/**
 * Cria assinatura recorrente no Mercado Pago (PAGAMENTO RECORRENTE)
 * @param {Object} dados - Dados da assinatura
 * @param {string} dados.email - Email do prestador
 * @param {string} dados.nome - Nome do prestador
 * @param {string} dados.prestadorId - ID do prestador (opcional, para renovação)
 * @param {string} dados.cpf - CPF do prestador (opcional)
 * @returns {Promise<Object>} Resultado da criação
 */
export async function criarAssinaturaRecorrente({ email, nome, prestadorId, cpf }) {
  try {
    console.log(`📝 [${AMBIENTE}] Criando assinatura recorrente para: ${email}`);
    console.log(`🏷️ Plano ID: ${PLANO_MENSAL_ID}`);
    
    if (!PLANO_MENSAL_ID) {
      console.error('❌ MP_PLAN_ID_MENSAL não configurado!');
      return { 
        success: false, 
        error: 'Plano de assinatura não configurado. Configure MP_PLAN_ID_MENSAL no .env' 
      };
    }
    
    // Buscar ou criar cliente no Mercado Pago
    let customerId = null;
    try {
      const searchResponse = await customer.search({ email });
      if (searchResponse.results && searchResponse.results.length > 0) {
        customerId = searchResponse.results[0].id;
        console.log(`👤 Cliente existente: ${customerId}`);
      }
    } catch (error) {
      console.log('Cliente não encontrado, será criado na assinatura...');
    }
    
    // Montar o corpo da requisição de assinatura
    const body = {
      preapproval_plan_id: PLANO_MENSAL_ID,
      reason: 'Plano Mensal SemLimites - Prestadores',
      external_reference: `prestador_${prestadorId || 'novo'}_${Date.now()}`,
      payer_email: email,
      back_url: `${process.env.FRONTEND_URL || 'https://www.semlimitesprestadores.com.br'}/cadastro?retorno=sucesso`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: VALOR_MENSAL,
        currency_id: 'BRL'
      },
      status: 'pending'
    };
    
    // Adicionar payer_id se cliente existir
    if (customerId) {
      body.payer_id = customerId;
    }
    
    // Adicionar CPF se fornecido
    if (cpf) {
      body.cardholder_identification = {
        type: 'CPF',
        number: cpf.replace(/\D/g, '')
      };
    }
    
    console.log('📤 Enviando para Mercado Pago:', JSON.stringify(body, null, 2));
    
    const response = await subscription.create({ body });
    
    console.log(`✅ Assinatura criada com ID: ${response.id}`);
    console.log(`🔗 Link de pagamento: ${response.init_point}`);
    
    return {
      success: true,
      subscriptionId: response.id,
      initPoint: response.init_point,
      customerId: response.payer_id || customerId,
      status: response.status,
      ambiente: AMBIENTE
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
 * @param {string} subscriptionId - ID da assinatura
 * @returns {Promise<Object>} Status da assinatura
 */
export async function buscarStatusAssinatura(subscriptionId) {
  try {
    console.log(`🔍 [${AMBIENTE}] Buscando status da assinatura: ${subscriptionId}`);
    
    const response = await subscription.get({ id: subscriptionId });
    
    console.log(`📊 Status: ${response.status}`);
    
    return {
      success: true,
      status: response.status,
      nextPaymentDate: response.next_payment_date,
      lastPaymentDate: response.last_payment_date,
      paymentMethodId: response.payment_method_id,
      externalReference: response.external_reference,
      data: response
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
 * @param {string} subscriptionId - ID da assinatura
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelarAssinaturaRecorrente(subscriptionId) {
  try {
    console.log(`🔄 [${AMBIENTE}] Cancelando assinatura: ${subscriptionId}`);
    
    const response = await subscription.cancel({ id: subscriptionId });
    
    console.log(`✅ Assinatura ${subscriptionId} cancelada com sucesso`);
    
    return {
      success: true,
      data: response,
      message: 'Assinatura cancelada com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Processa notificação de pagamento/assinatura recebida via webhook
 * VERSÃO ATUALIZADA - Suporta tanto pagamento único quanto assinatura
 */
export async function processarNotificacao(notificacao) {
  try {
    console.log(`📩 [${AMBIENTE}] Processando notificação`);
    console.log('📦 Tipo:', notificacao.type);
    console.log('📦 Action:', notificacao.action);
    
    const { action, data, type, topic, resource } = notificacao;
    const tipoNotificacao = type || topic;
    
    // ===== PROCESSAR ASSINATURA =====
    if (tipoNotificacao === 'subscription' || tipoNotificacao === 'subscription_authorized_payment') {
      console.log('🔄 Processando evento de assinatura');
      
      let subscriptionId = data?.id;
      
      if (!subscriptionId && resource) {
        const match = resource.match(/\/([^/]+)$/);
        if (match) subscriptionId = match[1];
      }
      
      if (subscriptionId) {
        const statusAssinatura = await buscarStatusAssinatura(subscriptionId);
        
        return {
          success: true,
          type: 'subscription',
          subscriptionId: subscriptionId,
          action: action,
          status: statusAssinatura.status,
          nextPaymentDate: statusAssinatura.nextPaymentDate
        };
      }
    }
    
    // ===== PROCESSAR PAGAMENTO (único) =====
    if (tipoNotificacao !== 'payment') {
      console.log(`⏭️ Tipo ignorado: ${tipoNotificacao}`);
      return { success: true, message: 'Tipo ignorado' };
    }
    
    let paymentId = data?.id;
    let preferenceId = null;
    let emailPagador = null;
    let nomePagador = null;
    
    // Extrair dados da URL resource
    if (resource && typeof resource === 'string') {
      const prefMatch = resource.match(/pref_id=([^&]+)/);
      if (prefMatch) {
        preferenceId = prefMatch[1];
      }
      
      if (!paymentId) {
        const paymentMatch = resource.match(/\/(\d+)$/);
        if (paymentMatch) {
          paymentId = paymentMatch[1];
        }
      }
    }
    
    if (!paymentId) {
      console.error('❌ paymentId não encontrado');
      return { success: false, error: 'paymentId não encontrado' };
    }
    
    console.log(`💰 Buscando pagamento: ${paymentId}`);
    
    let paymentData;
    let pagamentoAprovado = false;
    
    try {
      paymentData = await payment.get({ id: paymentId });
      pagamentoAprovado = paymentData.status === 'approved';
      emailPagador = paymentData.payer?.email;
      nomePagador = paymentData.metadata?.nome || paymentData.payer?.name;
      preferenceId = paymentData.metadata?.preference_id || paymentData.order?.id || preferenceId;
      
      console.log(`📊 Status: ${paymentData.status} | Email: ${emailPagador}`);
    } catch (error) {
      console.error(`⚠️ Pagamento ${paymentId} não encontrado via API:`, error.message);
      
      if (!IS_PRODUCTION) {
        console.log(`ℹ️ Modo sandbox: considerando pagamento ${paymentId} como aprovado`);
        pagamentoAprovado = true;
      } else {
        console.log(`❌ Pagamento não encontrado em produção - rejeitando`);
        return { success: false, error: 'Pagamento não encontrado' };
      }
      
      if (notificacao.data?.id) paymentId = notificacao.data.id;
      if (notificacao.originalBody?.payer?.email) emailPagador = notificacao.originalBody.payer.email;
    }
    
    if (!pagamentoAprovado) {
      console.log(`⏸️ Pagamento não aprovado: ${paymentId}`);
      return { success: true, message: 'Pagamento pendente', pagamentoConfirmado: false };
    }
    
    console.log(`✅ Pagamento ${paymentId} confirmado!`);
    
    const Prestador = (await import('../models/Prestador.js')).default;
    
    let prestadorExistente = null;
    
    if (preferenceId) {
      prestadorExistente = await Prestador.findOne({ preferenceId });
    }
    
    if (!prestadorExistente && emailPagador) {
      prestadorExistente = await Prestador.findOne({ email: emailPagador });
    }
    
    if (prestadorExistente) {
      console.log(`✅ Prestador encontrado: ${prestadorExistente._id}`);
      
      prestadorExistente.planoStatus = 'ativo';
      prestadorExistente.planoAtivo = true;
      prestadorExistente.assinaturaAtivadaEm = new Date();
      prestadorExistente.pagamentoConfirmado = true;
      if (preferenceId) prestadorExistente.preferenceId = preferenceId;
      await prestadorExistente.save();
      
      console.log(`🎉 Prestador ${prestadorExistente.nome} ativado!`);
      
      return {
        success: true,
        prestadorId: prestadorExistente._id,
        status: 'ativado',
        paymentId: paymentId,
        message: 'Prestador ativado com sucesso'
      };
    }
    
    console.log('ℹ️ Pagamento confirmado - aguardando criação do prestador');
    
    return {
      success: true,
      pagamentoConfirmado: true,
      paymentId: paymentId,
      status: 'approved',
      email: emailPagador,
      nome: nomePagador,
      preferenceId: preferenceId,
      message: 'Pagamento confirmado, aguardando criação do prestador'
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar notificação:', error);
    return { success: false, error: error.message };
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
  merchantOrder,
  subscription
};

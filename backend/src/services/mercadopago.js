// /src/services/mercadopago.js
import { MercadoPagoConfig, Preference, Payment, Customer, MerchantOrder } from 'mercadopago';
import dotenv from 'dotenv';
import crypto from 'crypto';

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

// URL base para retornos (produção)
const BASE_URL = 'https://www.semlimitesprestadores.com.br';
const BACKEND_URL = process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net';

/**
 * Cria preferência de pagamento para cadastro de prestador
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
        success: `${BASE_URL}/cadastro?retorno=sucesso`,
        failure: `${BASE_URL}/cadastro?retorno=erro`,
        pending: `${BASE_URL}/cadastro?retorno=pending`
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
      notification_url: `${BACKEND_URL}/api/assinatura/webhooks/mercadopago`
    };
    
    const response = await preference.create({ body });
    
    console.log(`✅ Preferência criada com ID: ${response.id}`);
    
    // Para produção, usar init_point. Para sandbox, sandbox_init_point.
    const linkPagamento = IS_PRODUCTION ? response.init_point : response.sandbox_init_point;
    console.log(`🔗 Link de pagamento (${AMBIENTE}): ${linkPagamento}`);
    
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
 * Cria assinatura para prestador existente
 */
export async function criarAssinatura(dados) {
  try {
    const { prestadorId, email, nome, cpf, plano = 'mensal', valor = 9.90 } = dados;
    
    console.log(`📝 [${AMBIENTE}] Criando assinatura para prestador: ${prestadorId}`);
    
    let customerId = null;
    try {
      const customerResponse = await customer.search({ email });
      if (customerResponse.results && customerResponse.results.length > 0) {
        customerId = customerResponse.results[0].id;
        console.log(`👤 Cliente existente: ${customerId}`);
      }
    } catch (error) {
      console.log('Cliente não encontrado, criando novo...');
    }
    
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
        success: `${BASE_URL}/cadastro?retorno=sucesso`,
        failure: `${BASE_URL}/cadastro?retorno=erro`,
        pending: `${BASE_URL}/cadastro?retorno=pending`
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
        ambiente: AMBIENTE
      },
      notification_url: `${BACKEND_URL}/api/assinatura/webhooks/mercadopago`
    };
    
    if (customerId) {
      body.payer.id = customerId;
    }
    
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
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      customerId: customerId,
      ambiente: AMBIENTE
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
 */
export async function processarNotificacao(notificacao) {
  try {
    console.log(`📩 [${AMBIENTE}] Processando notificação`);
    
    const { action, data, type, topic, resource } = notificacao;
    const tipoNotificacao = type || topic;
    
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
      
      // Em produção, NÃO assumir pagamento como aprovado se não encontrar
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
 * Busca status de um pagamento
 */
export async function buscarStatusAssinatura(paymentId) {
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
 * Cancela assinatura/pagamento
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

export { client, preference, payment, customer, merchantOrder };

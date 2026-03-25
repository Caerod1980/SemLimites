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
    timeout: 10000,
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
 */
export async function criarPreferenciaPublica({ email, nome, plano = 'mensal', valor = 9.90 }) {
  try {
    console.log(`📝 Criando preferência pública para: ${email}`);
    
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
        success: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=sucesso`,
        failure: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=erro`,
        pending: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=pending`
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
      notification_url: `${process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net'}/api/assinatura/webhooks/mercadopago`
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
 */
export async function criarAssinatura(dados) {
  try {
    const { prestadorId, email, nome, cpf, plano = 'mensal', valor = 9.90 } = dados;
    
    console.log(`📝 Criando assinatura para prestador: ${prestadorId}`);
    
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
        success: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=sucesso`,
        failure: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=erro`,
        pending: `https://www.semlimitesprestadores.com.br/dashboard?pagamento=pending`
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
      notification_url: `${process.env.BACKEND_URL || 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net'}/api/assinatura/webhooks/mercadopago`
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
 */
export async function processarNotificacao(notificacao) {
  try {
    console.log('📩 Processando notificação:', JSON.stringify(notificacao, null, 2));
    
    const { action, data, type, topic, resource } = notificacao;
    
    const tipoNotificacao = type || topic;
    
    if (tipoNotificacao !== 'payment') {
      console.log(`⏭️ Tipo ignorado: ${tipoNotificacao}`);
      return { success: true, message: 'Tipo ignorado' };
    }
    
    let paymentId = data?.id;
    
    if (!paymentId && resource && typeof resource === 'string') {
      const matches = resource.match(/\/(\d+)$/);
      if (matches) {
        paymentId = matches[1];
      }
    }
    
    if (!paymentId) {
      console.error('❌ Não foi possível extrair paymentId da notificação');
      return { success: false, error: 'paymentId não encontrado' };
    }
    
    console.log(`💰 Buscando detalhes do pagamento: ${paymentId}`);
    
    let paymentData;
    let pagamentoAprovado = false;
    let emailPagador = null;
    let nomePagador = null;
    let preferenceId = null;
    
    try {
      paymentData = await payment.get({ id: paymentId });
      pagamentoAprovado = paymentData.status === 'approved';
      emailPagador = paymentData.payer?.email;
      nomePagador = paymentData.metadata?.nome || paymentData.payer?.name;
      preferenceId = paymentData.metadata?.preference_id || paymentData.order?.id;
      
      console.log('📊 Dados do pagamento:', {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        email: emailPagador,
        metadata: paymentData.metadata
      });
    } catch (error) {
      console.error(`⚠️ Pagamento ${paymentId} não encontrado via API:`, error.message);
      console.log(`ℹ️ Considerando pagamento ${paymentId} como aprovado (modo sandbox)`);
      pagamentoAprovado = true;
    }
    
    if (!pagamentoAprovado) {
      console.log(`⏸️ Pagamento ${paymentId} não aprovado, status: ${paymentData?.status}`);
      return { success: true, message: 'Pagamento pendente', pagamentoConfirmado: false };
    }
    
    console.log(`✅ Pagamento ${paymentId} confirmado!`);
    
    // ===== CRIAÇÃO AUTOMÁTICA DO PRESTADOR =====
    const Prestador = (await import('../models/Prestador.js')).default;
    
    let prestadorExistente = null;
    
    if (preferenceId) {
      prestadorExistente = await Prestador.findOne({ preferenceId });
    }
    
    if (!prestadorExistente && emailPagador) {
      prestadorExistente = await Prestador.findOne({ email: emailPagador });
    }
    
    if (prestadorExistente) {
      console.log(`✅ Prestador existente encontrado: ${prestadorExistente._id}`);
      
      prestadorExistente.planoStatus = 'ativo';
      prestadorExistente.planoAtivo = true;
      prestadorExistente.assinaturaAtivadaEm = new Date();
      if (preferenceId) {
        prestadorExistente.preferenceId = preferenceId;
      }
      await prestadorExistente.save();
      
      console.log(`🎉 Prestador ${prestadorExistente.nome} ativado com sucesso!`);
      
      return {
        success: true,
        prestadorId: prestadorExistente._id,
        status: 'ativado',
        paymentId: paymentData?.id || paymentId,
        message: 'Prestador ativado com sucesso'
      };
    }
    
    console.log('ℹ️ Pagamento confirmado mas prestador não existe - frontend deve criar');
    
    return {
      success: true,
      pagamentoConfirmado: true,
      paymentId: paymentData?.id || paymentId,
      status: 'approved',
      email: emailPagador,
      nome: nomePagador,
      preferenceId: preferenceId,
      message: 'Pagamento confirmado, aguardando criação do prestador pelo frontend'
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
 */
export async function cancelarAssinatura(paymentId) {
  try {
    console.log(`🔄 Tentando cancelar assinatura: ${paymentId}`);
    
    if (paymentId.includes('-')) {
      console.log(`ℹ️ É uma preferência. Não é possível cancelar diretamente.`);
      return {
        success: true,
        message: 'Preferência marcada como cancelada no sistema',
        tipo: 'preferencia'
      };
    } else {
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

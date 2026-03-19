import mercadopago from 'mercadopago';

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

/**
 * Criar preferência pública (para cadastro)
 */
export async function criarPreferenciaPublica({ email, nome, plano, valor }) {
  try {
    console.log('🔄 Criando preferência pública para:', email);
    
    const preference = {
      items: [
        {
          title: `Plano ${plano} - SemLimites`,
          description: `Assinatura mensal para prestador de serviços`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(valor)
        }
      ],
      payer: {
        email: email,
        name: nome
      },
      back_urls: {
        success: 'https://caerod1980.github.io/SemLimites/pagamento/sucesso',
        failure: 'https://caerod1980.github.io/SemLimites/pagamento/falha',
        pending: 'https://caerod1980.github.io/SemLimites/pagamento/pendente'
      },
      auto_return: 'approved',
      external_reference: email,
      notification_url: 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net/api/webhooks/mercadopago'
    };
    
    const response = await mercadopago.preferences.create(preference);
    
    return {
      success: true,
      preferenceId: response.body.id,
      initPoint: response.body.init_point,
      sandboxInitPoint: response.body.sandbox_init_point
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar preferência pública:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

/**
 * Criar assinatura para prestador já cadastrado
 */
export async function criarAssinatura({ prestadorId, email, nome, cpf, plano, valor }) {
  try {
    console.log('🔄 Criando assinatura para prestador:', prestadorId);
    
    // Similar à função anterior, mas com dados do prestador
    const preference = {
      items: [
        {
          title: `Plano ${plano} - SemLimites`,
          description: `Assinatura mensal para prestador ID: ${prestadorId}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(valor)
        }
      ],
      payer: {
        email: email,
        name: nome,
        identification: cpf ? { type: 'CPF', number: cpf } : undefined
      },
      back_urls: {
        success: 'https://caerod1980.github.io/SemLimites/pagamento/sucesso',
        failure: 'https://caerod1980.github.io/SemLimites/pagamento/falha',
        pending: 'https://caerod1980.github.io/SemLimites/pagamento/pendente'
      },
      auto_return: 'approved',
      external_reference: prestadorId,
      notification_url: 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net/api/webhooks/mercadopago'
    };
    
    const response = await mercadopago.preferences.create(preference);
    
    return {
      success: true,
      preferenceId: response.body.id,
      initPoint: response.body.init_point,
      sandboxInitPoint: response.body.sandbox_init_point
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar assinatura:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

/**
 * Buscar status de uma assinatura
 */
export async function buscarStatusAssinatura(paymentId) {
  try {
    const payment = await mercadopago.payment.findById(paymentId);
    
    return {
      success: true,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      data: payment.body
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
 * Cancelar uma assinatura
 */
export async function cancelarAssinatura(paymentId) {
  try {
    // Implementar cancelamento conforme documentação do Mercado Pago
    // Pode ser um refund ou cancelamento de assinatura recorrente
    
    return {
      success: true,
      message: 'Assinatura cancelada'
    };
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

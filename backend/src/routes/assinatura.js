// /src/routes/assinatura.js
import express from 'express';
import {
  criarAssinaturaRecorrente as criarAssinatura,
  criarPreferenciaPublica,
  criarPagamentoPixManual,
  buscarStatusAssinatura,
  cancelarAssinatura,
  cancelarAssinaturaRecorrente,
  processarNotificacao
} from '../services/mercadopago.js';
import authMiddleware from '../middlewares/auth.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

// ========== CONSTANTES ==========
const PLANO_MENSAL_ID = process.env.MP_PLAN_ID_MENSAL; // ID do plano criado no MP
const VALOR_MENSAL = 9.90;

// ========== ROTAS PÚBLICAS ==========

/**
 * @route   POST /api/assinatura/criar-assinatura
 * @desc    Criar uma assinatura recorrente no Mercado Pago
 * @access  Public (para cadastro inicial)
 */
router.post('/criar-assinatura', async (req, res) => {
  try {
    console.log('📝 Criando assinatura recorrente');
    
    // ===== CORREÇÃO: Aceitar card_token_id =====
    const { email, nome, cpf, card_token_id } = req.body;
    
    if (!email || !nome) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e nome são obrigatórios' 
      });
    }
    
    // ===== NOVO: Validar card_token_id =====
    if (!card_token_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'card_token_id é obrigatório para criar assinatura' 
      });
    }
    
    // Verificar se já existe prestador com este email (para casos de renovação)
    const prestadorExistente = await Prestador.findOne({ email });
    const prestadorId = prestadorExistente?._id;
    
    // ===== CORREÇÃO: Passar card_token_id para o serviço =====
    const resultado = await criarAssinatura({
      email,
      nome,
      cpf,
      prestadorId,
      cardTokenId: card_token_id,
      planId: PLANO_MENSAL_ID
    });
    
    if (!resultado.success) {
      return res.status(500).json({ 
        success: false, 
        error: resultado.error,
        details: resultado.details
      });
    }
    
    // Se já existe prestador, atualizar com os dados da assinatura
    if (prestadorExistente) {
      prestadorExistente.mercadoPago = prestadorExistente.mercadoPago || {};
      prestadorExistente.mercadoPago.subscriptionId = resultado.subscriptionId;
      prestadorExistente.mercadoPago.customerId = resultado.customerId;
      prestadorExistente.planoStatus = 'ativo';
      prestadorExistente.planoAtivo = true;
      prestadorExistente.assinaturaAtivadaEm = new Date();
      
      if (typeof prestadorExistente.adicionarHistoricoPlano === 'function') {
        prestadorExistente.adicionarHistoricoPlano(
          'assinatura_criada',
          `Assinatura criada e autorizada - ID: ${resultado.subscriptionId}`,
          { subscriptionId: resultado.subscriptionId }
        );
      }
      await prestadorExistente.save();
    }
    
    res.json({
      success: true,
      subscriptionId: resultado.subscriptionId,
      message: 'Assinatura criada e autorizada com sucesso',
      status: resultado.status
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar assinatura:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assinatura/criar-pix
 * @desc    Criar cobrança PIX manual para plano mensal
 * @access  Private
 */
router.post('/criar-pix', authMiddleware, async (req, res) => {
  try {
    const { prestadorId } = req.body;

    if (!prestadorId) {
      return res.status(400).json({
        success: false,
        error: 'prestadorId é obrigatório'
      });
    }

    const prestador = await Prestador.findById(prestadorId);

    if (!prestador) {
      return res.status(404).json({
        success: false,
        error: 'Prestador não encontrado'
      });
    }

    const autorizado =
      req.usuario.prestadorId?.toString() === prestadorId ||
      req.usuario.id?.toString() === prestadorId ||
      req.usuario.tipo === 'admin';

    if (!autorizado) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const resultado = await criarPagamentoPixManual({
      email: prestador.email,
      nome: prestador.nome,
      prestadorId: prestador._id.toString(),
      valor: VALOR_MENSAL
    });

    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        error: resultado.error,
        details: resultado.details
      });
    }

    prestador.mercadoPago = prestador.mercadoPago || {};
    prestador.mercadoPago.lastPix = {
      paymentId: null,
      preferenceId: resultado.preferenceId,
      qrCode: null,
      qrCodeBase64: null,
      ticketUrl: resultado.initPoint || null,
      status: 'pending',
      createdAt: new Date()
    };

    if (typeof prestador.adicionarHistoricoPlano === 'function') {
      prestador.adicionarHistoricoPlano(
        'pix_gerado',
        `Cobrança PIX manual gerada - Preference ID: ${resultado.preferenceId}`,
        { valor: VALOR_MENSAL }
      );
    }

    await prestador.save();

    return res.json({
      success: true,
      tipo: 'pix_manual',
      preferenceId: resultado.preferenceId,
      initPoint: resultado.initPoint,
      sandboxInitPoint: resultado.sandboxInitPoint,
      message: 'Cobrança PIX gerada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar PIX manual:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/assinatura/criar-preferencia
 * @desc    Criar uma preferência de pagamento (pagamento único)
 * @desc    USAR APENAS PARA TESTES OU PAGAMENTOS AVULSOS
 * @access  Public
 */
router.post('/criar-preferencia', async (req, res) => {
  try {
    console.log('📝 Criando preferência de pagamento (pagamento único)');
    
    const { email, nome, plano, valor } = req.body;
    
    if (!email || !nome) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e nome são obrigatórios' 
      });
    }
    
    const resultado = await criarPreferenciaPublica({
      email,
      nome,
      plano: plano || 'mensal',
      valor: valor || VALOR_MENSAL
    });
    
    if (!resultado.success) {
      return res.status(500).json({ 
        success: false, 
        error: resultado.error,
        details: resultado.details
      });
    }
    
    res.json({
      success: true,
      preferenceId: resultado.preferenceId,
      initPoint: resultado.initPoint,
      sandboxInitPoint: resultado.sandboxInitPoint,
      message: 'Preferência criada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assinatura/status-preferencia/:preferenceId
 * @desc    Buscar status de uma preferência (pagamento único)
 * @access  Public
 */
router.get('/status-preferencia/:preferenceId', async (req, res) => {
  try {
    const { preferenceId } = req.params;
    
    console.log(`🔍 Buscando status da preferência: ${preferenceId}`);
    
    const prestador = await Prestador.findOne({ preferenceId });
    
    if (prestador) {
      return res.json({
        status: prestador.planoStatus === 'ativo' ? 'approved' : 'pending',
        pagamentoConfirmado: prestador.planoStatus === 'ativo',
        preferenceId,
        prestadorId: prestador._id
      });
    }
    
    res.json({
      status: 'pending',
      pagamentoConfirmado: false,
      preferenceId
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assinatura/status-assinatura/:subscriptionId
 * @desc    Buscar status de uma assinatura recorrente
 * @access  Private
 */
router.get('/status-assinatura/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    console.log(`🔍 Buscando status da assinatura: ${subscriptionId}`);
    
    const prestador = await Prestador.findOne({ 
      'mercadoPago.subscriptionId': subscriptionId 
    });
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assinatura não encontrada' 
      });
    }
    
    const autorizado = 
      req.usuario.prestadorId?.toString() === prestador._id.toString() ||
      req.usuario.id?.toString() === prestador._id.toString() ||
      req.usuario.tipo === 'admin';
    
    if (!autorizado) {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
    }
    
    const statusMP = await buscarStatusAssinatura(subscriptionId);
    
    res.json({
      success: true,
      subscriptionId,
      status: statusMP?.status || prestador.planoStatus,
      planoAtivo: prestador.planoAtivo,
      planoStatus: prestador.planoStatus,
      planoExpiracao: prestador.planoExpiracao,
      lastPayment: prestador.mercadoPago?.lastPayment,
      proximaCobranca: statusMP?.next_payment_date,
      historico: prestador.planoHistorico?.slice(-5)
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar status da assinatura:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assinatura/cancelar-assinatura
 * @desc    Cancelar assinatura recorrente
 * @access  Private
 */
router.post('/cancelar-assinatura', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'subscriptionId é obrigatório' 
      });
    }
    
    const prestador = await Prestador.findOne({ 
      'mercadoPago.subscriptionId': subscriptionId 
    });
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assinatura não encontrada' 
      });
    }
    
    const autorizado = 
      req.usuario.prestadorId?.toString() === prestador._id.toString() ||
      req.usuario.id?.toString() === prestador._id.toString() ||
      req.usuario.tipo === 'admin';
    
    if (!autorizado) {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
    }
    
    const resultado = await cancelarAssinaturaRecorrente(subscriptionId);
    
    if (resultado.success) {
      prestador.planoAtivo = false;
      prestador.planoStatus = 'cancelado';
      if (typeof prestador.adicionarHistoricoPlano === 'function') {
        prestador.adicionarHistoricoPlano(
          'assinatura_cancelada',
          `Assinatura cancelada pelo usuário - ID: ${subscriptionId}`,
          { subscriptionId }
        );
      }
      await prestador.save();
      
      console.log(`✅ Assinatura cancelada: ${subscriptionId}`);
    }
    
    res.json({
      success: resultado.success,
      message: resultado.message || 'Assinatura cancelada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========== WEBHOOK ==========

/**
 * @route   POST /api/assinatura/webhooks/mercadopago
 * @desc    Webhook para receber notificações do Mercado Pago
 * @access  Public
 */
router.post('/webhooks/mercadopago', async (req, res) => {
  try {
    console.log('📨 Webhook recebido');
    console.log('📦 Tipo:', req.body.type || req.body.topic);
    console.log('📦 Action:', req.body.action);
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));

    // Sempre responder 200 rapidamente para o Mercado Pago
    res.status(200).json({ message: 'OK' });

    const resultado = await processarNotificacao(req.body);

    if (!resultado || !resultado.success) {
      console.error('❌ Falha ao processar webhook:', resultado?.error || 'Resultado inválido');
      return;
    }

    // ===== EVENTOS DE ASSINATURA =====
    if (resultado.type === 'subscription') {
      console.log(`🔄 Processando assinatura ${resultado.subscriptionId} com status ${resultado.status}`);

      let prestador = await Prestador.findOne({
        'mercadoPago.subscriptionId': resultado.subscriptionId
      });

      // Fallback 1: tentar localizar pelo external_reference
      if (!prestador && resultado.externalReference) {
        const match = String(resultado.externalReference).match(/^prestador_([^_]+)_/);
        if (match && match[1] && match[1] !== 'novo') {
          prestador = await Prestador.findById(match[1]);
        }
      }

      // Fallback 2: tentar localizar pelo email do pagador
      if (!prestador && resultado.payerEmail) {
        prestador = await Prestador.findOne({ email: resultado.payerEmail });
      }

      if (!prestador) {
        console.warn(`⚠️ Nenhum prestador encontrado para a assinatura ${resultado.subscriptionId}`);
        return;
      }

      const statusAnterior = prestador.planoStatus;

      prestador.mercadoPago = prestador.mercadoPago || {};
      prestador.mercadoPago.subscriptionId = resultado.subscriptionId;
      prestador.planoId = resultado.subscriptionId;

      if (resultado.status === 'authorized') {
        prestador.planoAtivo = true;
        prestador.planoStatus = 'ativo';
        prestador.planoExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        prestador.mercadoPago.lastPayment = {
          date: new Date(),
          amount: VALOR_MENSAL,
          status: 'approved',
          paymentId: null
        };

        if (typeof prestador.adicionarHistoricoPlano === 'function') {
          prestador.adicionarHistoricoPlano(
            'pagamento_aprovado',
            `Assinatura autorizada/renovada automaticamente - ID: ${resultado.subscriptionId}`,
            { valor: VALOR_MENSAL }
          );
        }

        console.log(`✅ Plano ativado/renovado para: ${prestador._id}`);

      } else if (resultado.status === 'paused' || resultado.status === 'pending') {
        prestador.planoAtivo = false;
        prestador.planoStatus = 'pendente';

        if (typeof prestador.adicionarHistoricoPlano === 'function') {
          prestador.adicionarHistoricoPlano(
            'pagamento_pendente',
            `Assinatura pendente/pausada - ID: ${resultado.subscriptionId}`
          );
        }

        console.log(`⏳ Plano pendente/pausado para: ${prestador._id}`);

      } else if (resultado.status === 'cancelled') {
        prestador.planoAtivo = false;
        prestador.planoStatus = 'cancelado';

        if (typeof prestador.adicionarHistoricoPlano === 'function') {
          prestador.adicionarHistoricoPlano(
            'assinatura_cancelada',
            `Assinatura cancelada via webhook - ID: ${resultado.subscriptionId}`
          );
        }

        console.log(`❌ Assinatura cancelada para: ${prestador._id}`);

      } else {
        console.log(`ℹ️ Status de assinatura não tratado explicitamente: ${resultado.status}`);
      }

      await prestador.save();
      console.log(`📊 Status alterado: ${statusAnterior} -> ${prestador.planoStatus}`);
      return;
    }

    // ===== EVENTOS DE PIX MANUAL =====
    if (resultado.type === 'pix_manual') {
      console.log(`💰 Processando PIX manual ${resultado.paymentId} com status ${resultado.status}`);

      let prestador = null;

      // 1. Tenta pelo prestadorId vindo do metadata
      if (resultado.prestadorId) {
        prestador = await Prestador.findById(resultado.prestadorId);
      }

      // 2. Fallback pelo externalReference: prestador_pix_<prestadorId>_<timestamp>
      if (!prestador && resultado.externalReference) {
        const match = String(resultado.externalReference).match(/^prestador_pix_([^_]+)_/);
        if (match && match[1] && match[1] !== 'novo') {
          prestador = await Prestador.findById(match[1]);
        }
      }

      // 3. Fallback pelo e-mail do pagador
      if (!prestador && resultado.payerEmail) {
        prestador = await Prestador.findOne({ email: resultado.payerEmail });
      }

      if (!prestador) {
        console.warn(`⚠️ Prestador não encontrado para PIX manual`, {
          paymentId: resultado.paymentId,
          prestadorId: resultado.prestadorId || null,
          payerEmail: resultado.payerEmail || null,
          externalReference: resultado.externalReference || null
        });
        return;
      }

      const statusAnterior = prestador.planoStatus;
      prestador.mercadoPago = prestador.mercadoPago || {};
      prestador.mercadoPago.lastPix = prestador.mercadoPago.lastPix || {};

      prestador.mercadoPago.lastPix.paymentId = resultado.paymentId;
      prestador.mercadoPago.lastPix.status = resultado.status;

      if (resultado.status === 'approved') {
        // Se havia assinatura automática antiga, cancelar para evitar nova cobrança
        if (prestador.mercadoPago.subscriptionId) {
          const subscriptionAntiga = prestador.mercadoPago.subscriptionId;
          const cancelamento = await cancelarAssinaturaRecorrente(subscriptionAntiga);

          if (cancelamento.success) {
            prestador.mercadoPago.subscriptionId = null;

            if (typeof prestador.adicionarHistoricoPlano === 'function') {
              prestador.adicionarHistoricoPlano(
                'assinatura_cancelada_por_migracao_pix',
                `Assinatura automática cancelada após pagamento via PIX - ID: ${subscriptionAntiga}`
              );
            }
          } else {
            console.warn(`⚠️ Não foi possível cancelar assinatura automática antiga: ${subscriptionAntiga}`);
          }
        }

        prestador.ativarPlano({
          paymentId: resultado.paymentId,
          preferenceId: prestador.mercadoPago.lastPix.preferenceId || null,
          valor: VALOR_MENSAL,
          tipoPlano: 'manual',
          formaPagamentoAtual: 'pix'
        });

        prestador.mercadoPago.lastPix.status = 'approved';

        if (typeof prestador.adicionarHistoricoPlano === 'function') {
          prestador.adicionarHistoricoPlano(
            'pix_aprovado',
            `Pagamento PIX aprovado - ID: ${resultado.paymentId}`,
            { paymentId: resultado.paymentId, valor: VALOR_MENSAL }
          );
        }

        await prestador.save();
        console.log(`📊 Status alterado: ${statusAnterior} -> ${prestador.planoStatus}`);
        return;
      }

      if (resultado.status === 'pending' || resultado.status === 'in_process') {
        prestador.planoAtivo = false;
        prestador.planoStatus = 'pendente';
        prestador.tipoPlano = 'manual';
        prestador.formaPagamentoAtual = 'pix';
        prestador.mercadoPago.lastPix.status = resultado.status;

        if (typeof prestador.adicionarHistoricoPlano === 'function') {
          prestador.adicionarHistoricoPlano(
            'pix_pendente',
            `Pagamento PIX pendente - ID: ${resultado.paymentId}`
          );
        }

        await prestador.save();
        console.log(`📊 Status alterado: ${statusAnterior} -> ${prestador.planoStatus}`);
        return;
      }

      if (resultado.status === 'rejected' || resultado.status === 'cancelled') {
  const ultimoManual = prestador.ultimoPagamentoManual;
  const expiraEm = prestador.planoExpiracao ? new Date(prestador.planoExpiracao) : null;
  const agora = new Date();

  // ===== PROTEÇÃO: ignorar PIX antigo/rejeitado se já existe pagamento manual aprovado e vigente =====
  if (
    ultimoManual &&
    ultimoManual.status === 'approved' &&
    ultimoManual.paymentId &&
    String(ultimoManual.paymentId) !== String(resultado.paymentId) &&
    expiraEm &&
    expiraEm > agora
  ) {
    console.log('⏭️ Ignorando PIX rejeitado/cancelado antigo, pois já existe pagamento manual aprovado vigente.', {
      paymentIdRejeitado: resultado.paymentId,
      paymentIdAprovadoVigente: ultimoManual.paymentId,
      planoExpiracao: prestador.planoExpiracao
    });

    // Atualiza apenas o lastPix do evento atual, sem derrubar o plano vigente
    prestador.mercadoPago.lastPix.status = resultado.status;
    prestador.mercadoPago.lastPix.paymentId = resultado.paymentId;

    if (typeof prestador.adicionarHistoricoPlano === 'function') {
      prestador.adicionarHistoricoPlano(
        'pix_rejeitado_ignorado',
        `PIX rejeitado/cancelado ignorado por existir pagamento manual vigente - ID: ${resultado.paymentId}`
      );
    }

    await prestador.save();
    return;
  }

  // ===== FLUXO NORMAL: rejeição/cancelamento do PIX atual realmente afeta o plano =====
  prestador.planoAtivo = false;
  prestador.planoStatus = 'pendente';
  prestador.tipoPlano = 'manual';
  prestador.formaPagamentoAtual = 'pix';
  prestador.mercadoPago.lastPix.status = resultado.status;

  if (typeof prestador.adicionarHistoricoPlano === 'function') {
    prestador.adicionarHistoricoPlano(
      'pix_rejeitado',
      `Pagamento PIX não aprovado - ID: ${resultado.paymentId}`
    );
  }

  await prestador.save();
  console.log(`📊 Status alterado: ${statusAnterior} -> ${prestador.planoStatus}`);
  return;
}

      console.log(`ℹ️ Status PIX não tratado explicitamente: ${resultado.status}`);
      return;
    }

    console.log('ℹ️ Webhook recebido sem tipo tratado.');

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
  }
});

// ========== ROTAS DE CONSULTA ==========

/**
 * @route   GET /api/assinatura/status-prestador/:prestadorId
 * @desc    Buscar status da assinatura de um prestador
 * @access  Private
 */
router.get('/status-prestador/:prestadorId', authMiddleware, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    
    const prestador = await Prestador.findById(prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prestador não encontrado' 
      });
    }
    
    const autorizado = 
      req.usuario.prestadorId?.toString() === prestadorId ||
      req.usuario.id?.toString() === prestadorId ||
      req.usuario.tipo === 'admin';
    
    if (!autorizado) {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
    }
    
    res.json({
      success: true,
      planoStatus: prestador.planoStatus || 'inativo',
      planoAtivo: prestador.planoAtivo || false,
      planoExpiracao: prestador.planoExpiracao,
      subscriptionId: prestador.mercadoPago?.subscriptionId,
      lastPayment: prestador.mercadoPago?.lastPayment,
      tipoPlano: prestador.tipoPlano || 'automatico',
      formaPagamentoAtual: prestador.formaPagamentoAtual || 'cartao',
      lastPix: prestador.mercadoPago?.lastPix || null,
      historico: prestador.planoHistorico || []
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar status do prestador:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/mercadopago/public-key
 * @desc    Retorna a chave pública do Mercado Pago
 * @access  Public
 */
router.get('/public-key', async (req, res) => {
  try {
    const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('❌ MERCADO_PAGO_PUBLIC_KEY não configurada');
      return res.status(500).json({ 
        error: 'Chave pública do Mercado Pago não configurada' 
      });
    }
    
    res.json({ publicKey });
    
  } catch (error) {
    console.error('❌ Erro ao obter chave pública:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

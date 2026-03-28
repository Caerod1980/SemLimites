// /src/routes/assinatura.js
import express from 'express';
import { 
  criarAssinaturaRecorrente as criarAssinatura,
  criarPreferenciaPublica, 
  buscarStatusAssinatura, 
  cancelarAssinatura,
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
    
    const { email, nome, plano, valor } = req.body;
    
    if (!email || !nome) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e nome são obrigatórios' 
      });
    }
    
    // Verificar se já existe prestador com este email (para casos de renovação)
    const prestadorExistente = await Prestador.findOne({ email });
    const prestadorId = prestadorExistente?._id;
    
    const resultado = await criarAssinatura({
      email,
      nome,
      prestadorId,
      plano: plano || 'mensal',
      valor: valor || VALOR_MENSAL,
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
      prestadorExistente.planoStatus = 'pendente';
      prestadorExistente.planoAtivo = false;
      
      // Verificar se o método existe
      if (typeof prestadorExistente.adicionarHistoricoPlano === 'function') {
        prestadorExistente.adicionarHistoricoPlano(
          'assinatura_criada',
          `Assinatura criada - ID: ${resultado.subscriptionId}`,
          { subscriptionId: resultado.subscriptionId }
        );
      }
      await prestadorExistente.save();
    }
    
    res.json({
      success: true,
      subscriptionId: resultado.subscriptionId,
      initPoint: resultado.initPoint,
      message: 'Assinatura criada com sucesso'
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
    
    // Buscar prestador pela assinatura
    const prestador = await Prestador.findOne({ 
      'mercadoPago.subscriptionId': subscriptionId 
    });
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assinatura não encontrada' 
      });
    }
    
    // Verificar permissão
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
    
    // Buscar status atual no Mercado Pago
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
    
    // Buscar prestador pela assinatura
    const prestador = await Prestador.findOne({ 
      'mercadoPago.subscriptionId': subscriptionId 
    });
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assinatura não encontrada' 
      });
    }
    
    // Verificar permissão
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
    
    // Cancelar no Mercado Pago
    const resultado = await cancelarAssinatura(subscriptionId);
    
    if (resultado.success) {
      // Atualizar localmente
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
    console.log('📦 Tipo:', req.body.type);
    console.log('📦 Action:', req.body.action);
    
    const resultado = await processarNotificacao(req.body);
    
    // Se for evento de assinatura
    if (resultado.type === 'subscription') {
      console.log(`🔄 Processando evento de assinatura: ${resultado.action}`);
      
      const prestador = await Prestador.findOne({ 
        'mercadoPago.subscriptionId': resultado.subscriptionId 
      });
      
      if (prestador) {
        const statusAnterior = prestador.planoStatus;
        
        if (resultado.action === 'subscription_authorized_payment') {
          // Pagamento de assinatura aprovado
          prestador.planoAtivo = true;
          prestador.planoStatus = 'ativo';
          prestador.planoExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
          prestador.mercadoPago = prestador.mercadoPago || {};
          prestador.mercadoPago.lastPayment = {
            date: new Date(),
            amount: resultado.valor || VALOR_MENSAL,
            status: 'approved',
            paymentId: resultado.paymentId
          };
          
          if (typeof prestador.adicionarHistoricoPlano === 'function') {
            prestador.adicionarHistoricoPlano(
              'pagamento_aprovado',
              `Pagamento de assinatura aprovado - ID: ${resultado.paymentId}`,
              { paymentId: resultado.paymentId, valor: resultado.valor }
            );
          }
          
          console.log(`✅ Pagamento de assinatura aprovado: ${prestador._id}`);
          
        } else if (resultado.action === 'subscription_cancelled') {
          prestador.planoAtivo = false;
          prestador.planoStatus = 'cancelado';
          if (typeof prestador.adicionarHistoricoPlano === 'function') {
            prestador.adicionarHistoricoPlano(
              'assinatura_cancelada',
              `Assinatura cancelada via webhook - ID: ${resultado.subscriptionId}`
            );
          }
          console.log(`❌ Assinatura cancelada: ${prestador._id}`);
          
        } else if (resultado.action === 'subscription_failed_payment') {
          if (typeof prestador.adicionarHistoricoPlano === 'function') {
            prestador.adicionarHistoricoPlano(
              'pagamento_falhou',
              `Pagamento de assinatura falhou - ID: ${resultado.paymentId}`
            );
          }
          console.log(`⚠️ Pagamento falhou para: ${prestador._id}`);
        }
        
        await prestador.save();
        console.log(`📊 Status alterado: ${statusAnterior} -> ${prestador.planoStatus}`);
      }
    }
    
    // Sempre retornar 200 para o Mercado Pago
    res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(200).json({ message: 'OK' });
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
    
    // Verificar permissão
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

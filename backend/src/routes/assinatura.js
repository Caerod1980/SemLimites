// /src/routes/assinatura.js
import express from 'express';
import { 
  criarAssinatura, 
  criarPreferenciaPublica, 
  buscarStatusAssinatura, 
  cancelarAssinatura,
  processarNotificacao 
} from '../services/mercadopago.js';
import authMiddleware from '../middlewares/auth.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

/**
 * @route   POST /api/assinatura/criar-preferencia
 * @desc    Criar uma preferência de pagamento (público - para cadastro)
 * @access  Public
 */
router.post('/criar-preferencia', async (req, res) => {
  try {
    console.log('📝 Requisição para criar preferência de pagamento (pública)');
    
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
      valor: valor || 29.90
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
    console.error('❌ Erro na rota pública de preferência:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assinatura/associar
 * @desc    Associar uma preferência existente ao prestador
 * @access  Private
 */
router.post('/associar', authMiddleware, async (req, res) => {
  try {
    console.log('📝 Associando preferência ao prestador');
    console.log('👤 Usuário autenticado:', req.usuario);
    
    const { prestadorId, preferenceId, email, nome, plano, valor } = req.body;
    
    // Converter IDs para string para comparação segura
    const usuarioId = req.usuario.id?.toString();
    const usuarioPrestadorId = req.usuario.prestadorId?.toString();
    const prestadorIdStr = prestadorId?.toString();
    
    // Verificar se é o mesmo usuário (aceitar tanto id do usuário quanto prestadorId)
    const autorizado = 
      (usuarioId && usuarioId === prestadorIdStr) || 
      (usuarioPrestadorId && usuarioPrestadorId === prestadorIdStr);
    
    if (!autorizado) {
      console.log('❌ Acesso negado:', {
        usuarioId,
        usuarioPrestadorId,
        prestadorId: prestadorIdStr
      });
      return res.status(403).json({ 
        success: false, 
        error: 'Não autorizado' 
      });
    }
    
    // Buscar prestador
    const prestador = await Prestador.findById(prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prestador não encontrado' 
      });
    }
    
    // Verificar se já tem uma assinatura ativa
    if (prestador.planoStatus === 'ativo') {
      return res.status(400).json({
        success: false,
        error: 'Prestador já possui assinatura ativa'
      });
    }
    
    // Atualizar status do prestador
    prestador.planoStatus = 'pendente';
    prestador.planoId = preferenceId;
    prestador.planoHistorico = prestador.planoHistorico || [];
    prestador.planoHistorico.push({
      data: new Date(),
      evento: 'preferencia_associada',
      detalhes: `Preference ID: ${preferenceId}`
    });
    
    await prestador.save();
    
    console.log(`✅ Preferência ${preferenceId} associada ao prestador ${prestadorId}`);
    
    res.json({
      success: true,
      message: 'Preferência associada com sucesso',
      planoStatus: 'pendente'
    });
    
  } catch (error) {
    console.error('❌ Erro ao associar:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/assinatura/webhooks/mercadopago
 * @desc    Webhook para receber notificações do Mercado Pago
 * @access  Public
 */
router.post('/webhooks/mercadopago', async (req, res) => {
  try {
    console.log('📨 Webhook recebido em /assinatura/webhooks/mercadopago');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    
    const resultado = await processarNotificacao(req.body);
    
    if (resultado.success && resultado.prestadorId) {
      console.log(`✅ Webhook processado para prestador: ${resultado.prestadorId}`);
      
      // Atualizar status do prestador
      const prestador = await Prestador.findById(resultado.prestadorId);
      
      if (prestador) {
        const statusAnterior = prestador.planoStatus;
        
        if (resultado.status === 'approved') {
          prestador.planoStatus = 'ativo';
          prestador.planoAtivo = true;
          prestador.assinaturaAtivadaEm = new Date();
        } else if (resultado.status === 'rejected' || resultado.status === 'cancelled') {
          prestador.planoStatus = 'falhou';
        } else if (resultado.status === 'pending') {
          prestador.planoStatus = 'pendente';
        }
        
        prestador.planoHistorico = prestador.planoHistorico || [];
        prestador.planoHistorico.push({
          data: new Date(),
          evento: `webhook_${resultado.status}`,
          detalhes: `Payment ID: ${resultado.paymentId}`
        });
        
        await prestador.save();
        
        console.log(`📊 Status do prestador ${resultado.prestadorId}: ${statusAnterior} -> ${prestador.planoStatus}`);
      }
    }
    
    // Sempre retornar 200 para o Mercado Pago
    res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    // Mesmo com erro, retornar 200 para não bloquear o webhook
    res.status(200).json({ message: 'OK' });
  }
});

/**
 * @route   GET /api/assinatura/status-prestador/:prestadorId
 * @desc    Buscar status da assinatura de um prestador
 * @access  Private
 */
router.get('/status-prestador/:prestadorId', authMiddleware, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    
    // Converter IDs para string para comparação segura
    const usuarioId = req.usuario.id?.toString();
    const usuarioPrestadorId = req.usuario.prestadorId?.toString();
    const prestadorIdStr = prestadorId?.toString();
    
    // Verificar se é o mesmo usuário
    const autorizado = 
      (usuarioId && usuarioId === prestadorIdStr) || 
      (usuarioPrestadorId && usuarioPrestadorId === prestadorIdStr);
    
    if (!autorizado) {
      return res.status(403).json({ 
        success: false, 
        error: 'Não autorizado' 
      });
    }
    
    const prestador = await Prestador.findById(prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prestador não encontrado' 
      });
    }
    
    res.json({
      success: true,
      planoStatus: prestador.planoStatus || 'inativo',
      planoId: prestador.planoId,
      planoHistorico: prestador.planoHistorico || []
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

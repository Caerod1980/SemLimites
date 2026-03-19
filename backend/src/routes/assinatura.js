// /src/routes/assinatura.js
import express from 'express';
import { criarAssinatura, buscarStatusAssinatura, cancelarAssinatura } from '../services/mercadopago.js';
import authMiddleware from '../middlewares/auth.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

/**
 * @route   POST /api/assinatura/criar
 * @desc    Criar uma nova assinatura para o prestador
 * @access  Private (prestador)
 */
router.post('/criar', authMiddleware, async (req, res) => {
  try {
    console.log('📝 Requisição para criar assinatura');
    
    // Verificar se é prestador
    if (req.usuario.tipo !== 'prestador') {
      return res.status(403).json({ 
        success: false, 
        error: 'Apenas prestadores podem criar assinaturas' 
      });
    }
    
    const { plano, valor } = req.body;
    
    // Buscar dados completos do prestador
    const prestador = await Prestador.findById(req.usuario.prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Prestador não encontrado' 
      });
    }
    
    // Verificar se já tem assinatura ativa
    if (prestador.planoAtivo && prestador.planoStatus === 'ativo') {
      return res.status(400).json({ 
        success: false, 
        error: 'Prestador já possui assinatura ativa' 
      });
    }
    
    // Criar assinatura no Mercado Pago
    const resultado = await criarAssinatura({
      prestadorId: prestador._id.toString(),
      email: req.usuario.email,
      nome: prestador.nome,
      cpf: prestador.cpf,
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
    
    // Atualizar status do prestador para pendente
    prestador.planoStatus = 'pendente';
    prestador.planoId = resultado.preferenceId;
    prestador.planoHistorico = prestador.planoHistorico || [];
    prestador.planoHistorico.push({
      data: new Date(),
      evento: 'assinatura_criada',
      detalhes: `Preference ID: ${resultado.preferenceId}`
    });
    
    await prestador.save();
    
    res.json({
      success: true,
      preferenceId: resultado.preferenceId,
      initPoint: resultado.initPoint,
      sandboxInitPoint: resultado.sandboxInitPoint,
      message: 'Assinatura criada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro na rota de assinatura:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/assinatura/status/:paymentId
 * @desc    Buscar status de uma assinatura
 * @access  Private (prestador)
 */
router.get('/status/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const resultado = await buscarStatusAssinatura(paymentId);
    
    if (!resultado.success) {
      return res.status(500).json({ 
        success: false, 
        error: resultado.error 
      });
    }
    
    res.json({
      success: true,
      status: resultado.status,
      status_detail: resultado.status_detail,
      data: resultado.data
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
 * @route   POST /api/assinatura/cancelar/:paymentId
 * @desc    Cancelar uma assinatura
 * @access  Private (prestador)
 */
router.post('/cancelar/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Verificar se o prestador tem esta assinatura
    const prestador = await Prestador.findById(req.usuario.prestadorId);
    
    if (!prestador || prestador.planoId !== paymentId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Assinatura não pertence a este prestador' 
      });
    }
    
    const resultado = await cancelarAssinatura(paymentId);
    
    if (!resultado.success) {
      return res.status(500).json({ 
        success: false, 
        error: resultado.error 
      });
    }
    
    // Atualizar status no banco
    prestador.planoStatus = 'cancelado';
    prestador.planoHistorico.push({
      data: new Date(),
      evento: 'assinatura_cancelada',
      detalhes: `Payment ID: ${paymentId}`
    });
    
    await prestador.save();
    
    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;

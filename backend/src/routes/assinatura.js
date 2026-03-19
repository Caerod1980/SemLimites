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
    
    const { prestadorId, preferenceId, email, nome, plano, valor } = req.body;
    
    // Verificar se é o mesmo usuário
    if (req.usuario.prestadorId !== prestadorId && req.usuario.id !== prestadorId) {
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
    
    res.json({
      success: true,
      message: 'Preferência associada com sucesso'
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
 * @route   GET /api/assinatura/status-prestador/:prestadorId
 * @desc    Buscar status da assinatura de um prestador
 * @access  Private
 */
router.get('/status-prestador/:prestadorId', authMiddleware, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    
    // Verificar se é o mesmo usuário
    if (req.usuario.prestadorId !== prestadorId && req.usuario.id !== prestadorId) {
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
    res.json({ 
      publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY 
    });
  } catch (error) {
    console.error('❌ Erro ao obter chave pública:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

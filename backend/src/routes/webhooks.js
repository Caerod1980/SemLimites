// /src/routes/webhooks.js
import express from 'express';
import crypto from 'crypto';
import { processarNotificacao } from '../services/mercadopago.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

/**
 * Valida a assinatura do webhook conforme documentação do Mercado Pago
 * @param {Object} req - Requisição Express
 * @returns {boolean} - Se a assinatura é válida
 */
function validarAssinatura(req) {
  try {
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    
    if (!xSignature || !xRequestId) {
      console.log('⚠️ Headers de assinatura ausentes');
      return false;
    }
    
    console.log('🔐 Validando assinatura:', { xSignature, xRequestId });
    
    // Extrair ts e hash do header
    const parts = xSignature.split(',');
    let ts = null;
    let hash = null;
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key.trim() === 'ts') ts = value.trim();
      if (key.trim() === 'v1') hash = value.trim();
    });
    
    if (!ts || !hash) {
      console.log('⚠️ ts ou hash não encontrados');
      return false;
    }
    
    // Construir template para validação
    const dataId = req.query['data.id'] || req.body?.data?.id;
    if (!dataId) {
      console.log('⚠️ data.id não encontrado');
      return false;
    }
    
    const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Calcular HMAC com a chave secreta
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ MERCADO_PAGO_WEBHOOK_SECRET não configurado');
      return false;
    }
    
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(template)
      .digest('hex');
    
    const isValid = computedHash === hash;
    console.log(`🔑 Assinatura ${isValid ? '✅ válida' : '❌ inválida'}`);
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Erro ao validar assinatura:', error);
    return false;
  }
}

/**
 * @route   POST /api/webhooks/mercadopago
 * @desc    Webhook para receber notificações do Mercado Pago
 * @access  Public
 */
router.post('/mercadopago', async (req, res) => {
  try {
    console.log('📩 Webhook recebido:', {
      headers: req.headers,
      query: req.query,
      body: req.body
    });
    
    // Validar assinatura (em produção, SEMPRE validar)
    if (process.env.NODE_ENV === 'production') {
      const isValid = validarAssinatura(req);
      if (!isValid) {
        console.error('❌ Assinatura inválida - possível tentativa de fraude');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    }
    
    const notificacao = req.body;
    
    // Processar notificação
    const resultado = await processarNotificacao(notificacao);
    
    if (!resultado.success) {
      console.error('❌ Erro ao processar notificação:', resultado.error);
      return res.status(500).json({ error: resultado.error });
    }
    
    // Se o pagamento foi aprovado, ativar o prestador
    if (resultado.status === 'approved') {
      console.log(`✅ Pagamento aprovado para prestador: ${resultado.prestadorId}`);
      
      const prestador = await Prestador.findById(resultado.prestadorId);
      
      if (prestador) {
        prestador.planoAtivo = true;
        prestador.planoStatus = 'ativo';
        prestador.planoExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dias
        prestador.planoHistorico = prestador.planoHistorico || [];
        prestador.planoHistorico.push({
          data: new Date(),
          evento: 'pagamento_aprovado',
          detalhes: `Payment ID: ${resultado.paymentId}, Valor: ${resultado.valor}`
        });
        
        await prestador.save();
        console.log(`✅ Prestador ${prestador.nome} ativado com sucesso`);
      }
    }
    
    // Sempre retornar 200 para o Mercado Pago
    res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    // Mesmo com erro, retornar 200 para evitar reenvios
    res.sendStatus(200);
  }
});

/**
 * @route   GET /api/webhooks/mercadopago
 * @desc    Rota de teste para verificar se o webhook está funcionando
 * @access  Public
 */
router.get('/mercadopago', (req, res) => {
  res.json({ 
    message: 'Webhook endpoint está funcionando',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

export default router;

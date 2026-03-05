import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '../services/email.js';

const router = express.Router();

// Simulação de usuários (em produção, use MongoDB)
const users = new Map();
const tokens = new Map();

// ========== SOLICITAR LINK MÁGICO ==========
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    console.log(`📧 Solicitando login para: ${email}`);

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hora

    // Salvar token
    tokens.set(token, { email, expiresAt });

    // Enviar e-mail
    await sendMagicLinkEmail(email, token);

    res.json({ 
      success: true,
      message: 'Link de acesso enviado para seu e-mail'
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: 'Erro ao processar login' });
  }
});

// ========== VERIFICAR TOKEN ==========
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const tokenData = tokens.get(token);
    
    if (!tokenData) {
      return res.status(401).json({ error: 'Link inválido' });
    }

    if (tokenData.expiresAt < Date.now()) {
      tokens.delete(token);
      return res.status(401).json({ error: 'Link expirado' });
    }

    // Gerar JWT para sessão
    const jwtToken = jwt.sign(
      { email: tokenData.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remover token usado
    tokens.delete(token);

    // Buscar ou criar usuário
    let user = users.get(tokenData.email);
    if (!user) {
      user = {
        id: crypto.randomBytes(8).toString('hex'),
        email: tokenData.email,
        tipo: 'cliente',
        createdAt: new Date()
      };
      users.set(tokenData.email, user);
    }

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        tipo: user.tipo
      }
    });

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

// ========== VALIDAR TOKEN JWT ==========
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = users.get(decoded.email);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: user.id,
      email: user.email,
      tipo: user.tipo
    });

  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';
import { sendMagicLinkEmail } from '../services/email.js';

const router = express.Router();

// Store temporário para tokens (em produção, usar Redis ou banco)
const tokens = new Map();

// Limpeza automática de tokens expirados (a cada hora)
setInterval(() => {
  const agora = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < agora) {
      tokens.delete(token);
    }
  }
  console.log(`🧹 Limpeza de tokens: ${tokens.size} tokens ativos`);
}, 3600000); // 1 hora

// ========== SOLICITAR LINK MÁGICO ==========
router.post('/login', async (req, res) => {
  try {
    const { email, tipo } = req.body; // tipo pode ser 'cliente' ou 'prestador'
    
    // Validações básicas
    if (!email || !tipo) {
      return res.status(400).json({ 
        error: 'E-mail e tipo são obrigatórios' 
      });
    }

    if (!['cliente', 'prestador'].includes(tipo)) {
      return res.status(400).json({ 
        error: 'Tipo deve ser "cliente" ou "prestador"' 
      });
    }

    console.log(`📧 Solicitando login ${tipo} para: ${email}`);

    // Se for prestador, verificar se existe cadastro
    if (tipo === 'prestador') {
      const prestador = await Prestador.findOne({ email });
      if (!prestador) {
        return res.status(404).json({ 
          error: 'Prestador não encontrado. Por favor, cadastre-se primeiro.',
          redirectTo: '/cadastro'
        });
      }
    }

    // Buscar ou criar usuário
    let user = await User.findOne({ email });
    
    if (!user) {
      // Criar novo usuário (apenas para cliente, prestador já verificamos que existe)
      if (tipo === 'cliente') {
        user = await User.create({
          email,
          tipo: 'cliente'
        });
        console.log(`✅ Novo cliente criado: ${email}`);
      } else {
        // Para prestador, associar ao prestador existente
        const prestador = await Prestador.findOne({ email });
        user = await User.create({
          email,
          tipo: 'prestador',
          prestadorId: prestador._id
        });
        console.log(`✅ Novo usuário prestador criado: ${email}`);
      }
    } else {
      // Verificar se o tipo corresponde
      if (user.tipo !== tipo) {
        return res.status(400).json({ 
          error: `Este e-mail já está cadastrado como ${user.tipo}. Use o tipo correto.` 
        });
      }
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hora

    // Salvar token com dados do usuário
    tokens.set(token, { 
      userId: user._id.toString(),
      email: user.email,
      tipo: user.tipo,
      expiresAt 
    });

    // Registrar token no histórico do usuário (opcional)
    await user.registrarToken(token, 3600000);

    // Atualizar último acesso
    user.ultimoAcesso = new Date();
    await user.save();

    // Enviar e-mail
    await sendMagicLinkEmail(email, token, tipo);

    res.json({ 
      success: true,
      message: `Link de acesso enviado para ${email}`,
      // Em desenvolvimento, podemos retornar o link para teste
      ...(process.env.NODE_ENV === 'development' && { magicLink: `${process.env.FRONTEND_URL}/auth/verify/${token}` })
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ 
      error: 'Erro ao processar login. Tente novamente mais tarde.' 
    });
  }
});

// ========== VERIFICAR TOKEN ==========
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Buscar token no store
    const tokenData = tokens.get(token);
    
    if (!tokenData) {
      return res.status(401).json({ 
        error: 'Link inválido ou já utilizado' 
      });
    }

    // Verificar expiração
    if (tokenData.expiresAt < Date.now()) {
      tokens.delete(token);
      return res.status(401).json({ 
        error: 'Link expirado. Solicite um novo link.' 
      });
    }

    // Buscar usuário no banco
    const user = await User.findById(tokenData.userId);
    if (!user) {
      tokens.delete(token);
      return res.status(401).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    // Marcar token como usado no histórico
    await user.marcarTokenComoUsado(token);

    // Gerar JWT para sessão
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        tipo: user.tipo
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remover token usado do store
    tokens.delete(token);

    // Buscar dados adicionais se for prestador
    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
    }

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestador: prestadorData ? {
          id: prestadorData._id,
          nome: prestadorData.nome,
          categoria: prestadorData.categoria,
          cidade: prestadorData.cidade,
          verificado: prestadorData.verificado,
          estrelas: prestadorData.estrelas,
          avaliacoes: prestadorData.avaliacoes
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar token' 
    });
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
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar dados adicionais se for prestador
    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
    }

    res.json({
      id: user._id,
      email: user.email,
      tipo: user.tipo,
      prestador: prestadorData ? {
        id: prestadorData._id,
        nome: prestadorData.nome,
        categoria: prestadorData.categoria,
        cidade: prestadorData.cidade,
        verificado: prestadorData.verificado,
        estrelas: prestadorData.estrelas,
        avaliacoes: prestadorData.avaliacoes
      } : null
    });

  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

// ========== LOGOUT (opcional - apenas remove token do cliente) ==========
router.post('/logout', (req, res) => {
  // O logout é feito no frontend (removendo o token do localStorage)
  // Esta rota é apenas para consistência
  res.json({ success: true, message: 'Logout realizado com sucesso' });
});

export default router;

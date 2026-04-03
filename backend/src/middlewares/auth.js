// /src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';

/**
 * Middleware de autenticação
 * Suporta usuários normais (cliente/prestador) e administradores
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Verificar se o token foi enviado
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Extrair token (formato: "Bearer TOKEN")
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco para garantir que ainda existe
    const user = await User.findById(decoded.userId || decoded.id).select('-senha');
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Buscar dados do prestador se for um prestador
    let prestadorData = null;
    let planoStatus = 'inativo';
    
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
      planoStatus = prestadorData?.planoStatus || 'inativo';
    }

    // Anexar usuário à requisição com todos os campos necessários
    req.usuario = {
      id: user._id,
      userId: user._id,
      email: user.email,
      tipo: user.tipo,
      prestadorId: user.prestadorId || decoded.prestadorId,
      planoStatus: planoStatus,
      prestador: prestadorData,
      decodedId: decoded.userId || decoded.id,
      // Campos adicionais para admin
      isAdmin: user.tipo === 'admin'
    };

    // ===== PROTEÇÃO DE ACESSO BASEADA NO STATUS DO PLANO DO PRESTADOR=====
    // Se for prestador com plano pendente, bloquear acesso a rotas protegidas
    if (user.tipo === 'prestador' && planoStatus !== 'ativo') {
      
      // CORREÇÃO SIMPLES: PERMITIR TODAS AS ROTAS DE UPLOAD
      // Verificar se é uma rota de upload
      const isUploadRoute = req.path.includes('/upload') || 
                            req.path.includes('sas-token') || 
                            req.path.includes('sas-token-leitura');
      
      // Verificar outras rotas permitidas
      const isAuthRoute = req.path.includes('/auth');
      const isAssinaturaRoute = req.originalUrl.includes('/assinatura');
      const isPerfilRoute = req.path.includes('/prestadores/perfil');
      const isHealthRoute = req.path === '/health';
      
      // PERMITIR ACESSO A ESTAS ROTAS MESMO COM PLANO PENDENTE
      const permitido = isUploadRoute || isAuthRoute || isAssinaturaRoute || isPerfilRoute || isHealthRoute;
      
      if (!permitido) {
        console.log(`🚫 Acesso negado para prestador ${user._id} - Plano: ${planoStatus} - Rota: ${req.path}`);
        return res.status(403).json({ 
          error: 'Acesso negado. Pagamento pendente.',
          planoStatus: planoStatus,
          message: 'Sua assinatura ainda não foi ativada. Complete o pagamento para acessar esta funcionalidade.'
        });
      }
      
      // Log para rotas permitidas
      console.log(`✅ Acesso permitido (plano pendente) para prestador ${user._id} - Rota: ${req.path}`);
    }

    // Log para debug (opcional - remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Usuário autenticado:', {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestadorId: user.prestadorId,
        planoStatus: planoStatus,
        isAdmin: user.tipo === 'admin'
      });
    }

    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error('❌ Token inválido:', error.message);
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      console.error('❌ Token expirado:', error.message);
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    console.error('❌ Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

/**
 * Middleware específico para verificar se o usuário é administrador
 * Deve ser usado APÓS o authMiddleware
 */
export const isAdmin = async (req, res, next) => {
  // Verificar se o usuário já foi autenticado pelo authMiddleware
  if (!req.usuario) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
  
  // Verificar se o usuário é admin
  if (req.usuario.tipo !== 'admin') {
    console.warn(`🚫 Acesso negado: Usuário ${req.usuario.id} (${req.usuario.tipo}) tentou acessar rota admin`);
    return res.status(403).json({ error: 'Acesso negado. Área restrita a administradores.' });
  }
  
  // Log de acesso admin
  if (process.env.NODE_ENV === 'development') {
    console.log(`🛡️ Acesso admin autorizado: ${req.usuario.email}`);
  }
  
  next();
};

/**
 * Middleware para rotas que exigem que o prestador tenha plano ativo
 * Use este middleware APÓS o authMiddleware para rotas que realmente precisam de plano ativo
 */
export const planoAtivo = async (req, res, next) => {
  if (req.usuario.tipo !== 'prestador') {
    return next();
  }
  
  if (req.usuario.planoStatus !== 'ativo') {
    return res.status(403).json({
      error: 'Acesso negado',
      planoStatus: req.usuario.planoStatus,
      message: 'Seu plano não está ativo. Complete o pagamento para acessar esta funcionalidade.'
    });
  }
  
  next();
};

export default authMiddleware;

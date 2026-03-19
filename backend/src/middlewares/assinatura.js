// /src/middlewares/assinatura.js
import Prestador from '../models/Prestador.js';

/**
 * Middleware para verificar se o prestador tem assinatura ativa
 */
export async function verificarAssinatura(req, res, next) {
  try {
    // Pular verificação para rotas públicas
    const rotasPublicas = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/esqueci-senha',
      '/api/auth/resetar-senha',
      '/api/webhooks',
      '/health'
    ];
    
    const isPublicRoute = rotasPublicas.some(rota => req.path.startsWith(rota));
    
    if (isPublicRoute) {
      return next();
    }
    
    // Verificar se o usuário está autenticado
    if (!req.usuario) {
      return next();
    }
    
    // Se for cliente, não precisa verificar assinatura
    if (req.usuario.tipo === 'cliente') {
      return next();
    }
    
    // Para prestadores, verificar assinatura
    if (req.usuario.tipo === 'prestador') {
      const prestador = await Prestador.findById(req.usuario.prestadorId);
      
      if (!prestador) {
        return res.status(404).json({ error: 'Prestador não encontrado' });
      }
      
      // Verificar se tem assinatura ativa
      if (!prestador.planoAtivo || prestador.planoStatus !== 'ativo') {
        return res.status(403).json({ 
          error: 'Assinatura necessária',
          message: 'Você precisa ter uma assinatura ativa para acessar esta funcionalidade',
          planoStatus: prestador.planoStatus,
          redirecionarPara: '/assinatura'
        });
      }
      
      // Verificar se a assinatura expirou
      if (prestador.planoExpiracao && prestador.planoExpiracao < new Date()) {
        prestador.planoAtivo = false;
        prestador.planoStatus = 'expirado';
        await prestador.save();
        
        return res.status(403).json({ 
          error: 'Assinatura expirada',
          message: 'Sua assinatura expirou. Por favor, renove para continuar.',
          redirecionarPara: '/assinatura/renovar'
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Erro no middleware de assinatura:', error);
    next();
  }
}

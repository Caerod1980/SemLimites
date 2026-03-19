// /src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js'; // IMPORTANTE: Importar o modelo Prestador

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
      userId: user._id, // Para compatibilidade
      email: user.email,
      tipo: user.tipo,
      prestadorId: user.prestadorId || decoded.prestadorId,
      planoStatus: planoStatus, // NOVO: Status do plano
      prestador: prestadorData, // NOVO: Dados completos do prestador
      decodedId: decoded.userId || decoded.id
    };

    // ===== PROTEÇÃO DE ACESSO BASEADA NO STATUS DO PLANO =====
    // Se for prestador com plano pendente, bloquear acesso a rotas protegidas
    if (user.tipo === 'prestador' && planoStatus !== 'ativo') {
      
      // Lista de rotas que podem ser acessadas mesmo com pagamento pendente
      const rotasPermitidas = [
        '/assinatura',      // Rotas de assinatura (para pagar)
        '/auth',            // Rotas de autenticação
        '/prestadores/perfil', // Perfil básico (editar dados)
        '/upload',          // Upload de fotos
        '/webhooks',        // Webhooks (público)
        '/health',          // Health check
        '/test'             // Rotas de teste
      ];
      
      // Verificar se a rota atual está na lista de permitidas
      const rotaAtual = req.path;
      const permitida = rotasPermitidas.some(rota => rotaAtual.includes(rota));
      
      if (!permitida) {
        console.log(`🚫 Acesso negado para prestador ${user._id} - Plano: ${planoStatus}`);
        return res.status(403).json({ 
          error: 'Acesso negado. Pagamento pendente.',
          planoStatus: planoStatus,
          message: 'Sua assinatura ainda não foi ativada. Complete o pagamento para acessar esta funcionalidade.'
        });
      }
    }

    // Log para debug (opcional - remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Usuário autenticado:', {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestadorId: user.prestadorId,
        planoStatus: planoStatus
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

export default authMiddleware;

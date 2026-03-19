// /src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

    // Anexar usuário à requisição com todos os campos necessários
    req.usuario = {
      id: user._id,
      userId: user._id, // Para compatibilidade
      email: user.email,
      tipo: user.tipo,
      prestadorId: user.prestadorId || decoded.prestadorId, // Garantir que o prestadorId esteja presente
      // Adicionar também o ID decodificado para casos de fallback
      decodedId: decoded.userId || decoded.id
    };

    // Log para debug (opcional - remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Usuário autenticado:', {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestadorId: user.prestadorId
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

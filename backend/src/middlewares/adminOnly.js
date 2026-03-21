// middleware/adminOnly.js
import User from '../models/User.js';

export const adminOnly = async (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }
    
    if (req.usuario.tipo !== 'admin') {
      console.warn(`🚫 Tentativa de acesso admin negada: ${req.usuario.email}`);
      return res.status(403).json({ error: 'Acesso negado. Área restrita a administradores.' });
    }
    
    // Log de acesso admin (para auditoria)
    console.log(`🛡️ Acesso admin: ${req.usuario.email} - ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error('Erro no middleware adminOnly:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

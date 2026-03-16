// routes/usuarios.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Favorito from '../models/Favorito.js';

const router = express.Router();

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erro de autenticação:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ========== EXCLUIR PERFIL DO USUÁRIO ==========
router.delete('/perfil', autenticar, async (req, res) => {
  try {
    const userId = req.user._id;
    const userTipo = req.user.tipo;

    console.log(`🗑️ Iniciando exclusão do usuário: ${userId} (${userTipo})`);

    // Se for cliente, excluir todos os favoritos primeiro
    if (userTipo === 'cliente') {
      const favoritosExcluidos = await Favorito.deleteMany({ clienteId: userId });
      console.log(`✅ ${favoritosExcluidos.deletedCount} favoritos excluídos`);
    }

    // Excluir o usuário
    await User.findByIdAndDelete(userId);

    console.log(`✅ Usuário ${userId} excluído permanentemente`);

    res.json({ 
      success: true,
      message: 'Perfil excluído permanentemente com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao excluir perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR DADOS DO USUÁRIO ==========
router.get('/me', autenticar, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-senha');
    
    res.json({
      id: user._id,
      email: user.email,
      tipo: user.tipo,
      createdAt: user.createdAt
    });

  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

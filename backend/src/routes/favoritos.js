// routes/favoritos.js
import express from 'express';
import jwt from 'jsonwebtoken';
import Favorito from '../models/Favorito.js';
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';

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

    if (user.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Apenas clientes podem curtir prestadores' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erro de autenticação:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ========== CURTIR PRESTADOR ==========
router.post('/:prestadorId', autenticar, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const clienteId = req.user._id;

    console.log(`❤️ Cliente ${clienteId} quer curtir prestador ${prestadorId}`);

    // Verificar se prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    // Verificar se já curtiu
    const existe = await Favorito.findOne({ clienteId, prestadorId });

    if (existe) {
      return res.status(400).json({ error: 'Você já curtiu este prestador' });
    }

    // Criar favorito
    const favorito = new Favorito({
      clienteId,
      prestadorId
    });
    await favorito.save();

    // Incrementar total no prestador
    await Prestador.findByIdAndUpdate(prestadorId, {
      $inc: { totalCurtidas: 1 }
    });

    console.log(`✅ Cliente ${clienteId} curtiu prestador ${prestadorId}`);

    res.json({ 
      success: true, 
      curtido: true,
      message: 'Prestador curtido com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao curtir prestador:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== DESCURTIR PRESTADOR ==========
router.delete('/:prestadorId', autenticar, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const clienteId = req.user._id;

    console.log(`💔 Cliente ${clienteId} quer descurtir prestador ${prestadorId}`);

    // Verificar se prestador existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    // Remover favorito
    const resultado = await Favorito.findOneAndDelete({ clienteId, prestadorId });

    if (!resultado) {
      return res.status(404).json({ error: 'Você não tinha curtido este prestador' });
    }

    // Decrementar total no prestador
    await Prestador.findByIdAndUpdate(prestadorId, {
      $inc: { totalCurtidas: -1 }
    });

    console.log(`✅ Cliente ${clienteId} descurtiu prestador ${prestadorId}`);

    res.json({ 
      success: true, 
      curtido: false,
      message: 'Prestador descurtido com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao descurtir prestador:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== VERIFICAR SE CLIENTE CURTIU PRESTADOR ==========
router.get('/:prestadorId/check', autenticar, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const clienteId = req.user._id;

    const favorito = await Favorito.findOne({ clienteId, prestadorId });

    res.json({ 
      curtido: !!favorito
    });

  } catch (error) {
    console.error('❌ Erro ao verificar curtida:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== LISTAR PRESTADORES CURTIDOS PELO CLIENTE ==========
router.get('/meus-favoritos', autenticar, async (req, res) => {
  try {
    const clienteId = req.user._id;

    const favoritos = await Favorito.find({ clienteId })
      .populate({
        path: 'prestadorId',
        populate: [
          { path: 'categoriaPrincipal', select: 'nome slug' },
          { path: 'servicos', select: 'nome slug' }
        ]
      })
      .sort({ createdAt: -1 });

    const prestadores = favoritos
  .filter(f => f.prestadorId) // 🔥 REMOVE NULOS
  .map(f => ({
    ...f.prestadorId.toObject(),
    favoritadoEm: f.createdAt
  }));

    res.json({ prestadores });

  } catch (error) {
    console.error('❌ Erro ao listar favoritos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== OBTER TOTAL DE CURTIDAS DE UM PRESTADOR ==========
router.get('/prestador/:prestadorId/total', async (req, res) => {
  try {
    const { prestadorId } = req.params;

    const prestador = await Prestador.findById(prestadorId).select('totalCurtidas');
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    res.json({ 
      prestadorId,
      totalCurtidas: prestador.totalCurtidas || 0
    });

  } catch (error) {
    console.error('❌ Erro ao buscar total de curtidas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

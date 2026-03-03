import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const usuarios = new Map();

// Login cliente
router.post('/cliente/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    
    usuarios.set(token, { 
      email, 
      tipo: 'cliente', 
      expira: Date.now() + 3600000 
    });

    res.json({ 
      mensagem: 'Link de acesso enviado para seu e-mail',
      token 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar token
router.get('/verificar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const usuario = usuarios.get(token);
    
    if (!usuario || usuario.expira < Date.now()) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    res.json({
      valido: true,
      usuario: {
        email: usuario.email,
        tipo: usuario.tipo
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

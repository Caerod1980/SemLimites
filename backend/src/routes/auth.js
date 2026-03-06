import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

// ========== REGISTRO ==========
router.post('/register', async (req, res) => {
  try {
    // Agora recebemos TODOS os dados do prestador
    const { 
      email, 
      senha, 
      tipo, 
      nome,          // ← Nome do prestador
      slug,          // ← NOVO: slug gerado
      cnpj,          // ← NOVO
      categoria,     // ← NOVO
      cidade,        // ← NOVO
      descricao,     // ← NOVO
      whatsapp,      // ← NOVO
      telefone,      // ← NOVO
      tags,          // ← NOVO
      verificado,
      dadosCNPJ,
      dataVerificacaoCNPJ
    } = req.body;
    
    // Verificar se já existe
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    let prestadorId = null;
    
    // Se for prestador, criar o registro com TODOS os dados
    if (tipo === 'prestador') {
      const prestador = await Prestador.create({
        nome,
        slug,              // ← Usando o slug gerado no frontend
        email,
        cnpj,
        categoria,
        cidade,
        descricao,
        whatsapp,
        telefone,
        tags: tags || [],
        verificado: verificado || false,
        dadosCNPJ: dadosCNPJ || null,
        dataVerificacaoCNPJ: dataVerificacaoCNPJ || null
      });
      prestadorId = prestador._id;
    }

    // Criar usuário
    const user = await User.create({
      email,
      senha: senhaHash,
      tipo,
      prestadorId
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { 
        id: user._id, 
        email: user.email, 
        tipo: user.tipo 
      },
      prestadorId // Opcional: retornar o ID do prestador criado
    });

  } catch (error) {
    console.error('❌ Erro detalhado no registro:', error);
    res.status(500).json({ error: error.message });
  }
});
// ========== LOGIN COM SENHA ==========
router.post('/login', async (req, res) => {
  try {
    const { email, senha, tipo } = req.body;
    
    if (!email || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Buscar usuário
    const user = await User.findOne({ email, tipo });
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        tipo: user.tipo 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Buscar dados do prestador se for o caso
    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestador: prestadorData
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ========== VALIDAR TOKEN ==========
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

    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
    }

    res.json({
      id: user._id,
      email: user.email,
      tipo: user.tipo,
      prestador: prestadorData
    });

  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

// ========== REGISTRO ==========
router.post('/register', async (req, res) => {
  try {
    // Log para debug (opcional)
    console.log('📥 Dados recebidos no registro:', req.body);
    
    // Extrair TODOS os dados enviados pelo frontend
    const { 
      email, 
      senha, 
      tipo, 
      nome,
      slug,
      cnpj,
      categoria,
      cidade,
      descricao,
      whatsapp,
      telefone,
      tags,
      verificado,
      dadosCNPJ,
      dataVerificacaoCNPJ
    } = req.body;
    
    // Validações básicas
    if (!email || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Verificar se já existe usuário com este e-mail
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    let prestadorId = null;
    
    // Se for prestador, criar o registro com TODOS os dados
    if (tipo === 'prestador') {
      // Validar campos obrigatórios do prestador
      if (!nome || !categoria || !cidade) {
        return res.status(400).json({ 
          error: 'Nome, categoria e cidade são obrigatórios para prestador' 
        });
      }

      // Criar o prestador com todos os campos
      const prestador = await Prestador.create({
        nome,
        slug: slug || nome.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, ''),
        email,
        cnpj: cnpj || null,
        categoria,
        cidade,
        descricao: descricao || `Profissional de ${categoria} em ${cidade}`,
        whatsapp: whatsapp || null,
        telefone: telefone || null,
        tags: tags || [],
        verificado: verificado || false,
        dadosCNPJ: dadosCNPJ || null,
        dataVerificacaoCNPJ: dataVerificacaoCNPJ || null
      });
      
      prestadorId = prestador._id;
      console.log('✅ Prestador criado:', prestadorId);
    }

    // Criar usuário
    const user = await User.create({
      email,
      senha: senhaHash,
      tipo,
      prestadorId
    });

    console.log('✅ Usuário criado:', user._id);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { 
        id: user._id, 
        email: user.email, 
        tipo: user.tipo 
      },
      prestadorId
    });

  } catch (error) {
    console.error('❌ Erro detalhado no registro:', error);
    
    // Tratamento específico para erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Erro de validação', 
        details: messages 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGIN COM SENHA ==========
router.post('/login', async (req, res) => {
  try {
    const { email, senha, tipo } = req.body;
    
    console.log('🔐 Tentativa de login:', { email, tipo });
    
    if (!email || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Buscar usuário
    const user = await User.findOne({ email, tipo });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      console.log('❌ Senha incorreta para:', email);
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
      console.log('📋 Dados do prestador carregados:', prestadorData?._id);
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
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
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
    console.error('❌ Erro ao validar token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';
import { consultarCNPJ } from '../services/receitaFederal.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ========== CONFIGURAÇÃO DE UPLOAD DE FOTOS ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/perfil';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'perfil-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif)'));
  }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Erro de autenticação:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ========== BUSCAR PRESTADORES COM FILTROS ==========
router.get('/busca', async (req, res) => {
  try {
    const { 
      cidade, 
      categoria, 
      q, 
      apenasVerificados,
      ordenacao = 'reputacao',
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    // Filtros básicos
    if (cidade) query.cidade = cidade;
    if (categoria) query.categoria = categoria;
    if (apenasVerificados === 'true') query.verificado = true;

    // ========== BUSCA POR TEXTO ==========
    if (q && q.trim() !== '') {
      const termoBusca = q.trim();
      query.$or = [
        { nome: { $regex: termoBusca, $options: 'i' } },
        { descricao: { $regex: termoBusca, $options: 'i' } },
        { categoria: { $regex: termoBusca, $options: 'i' } },
        { especialidades: { $in: [new RegExp(termoBusca, 'i')] } },
        { certificacoes: { $in: [new RegExp(termoBusca, 'i')] } }
      ];
    }

    // Configurar ordenação
    let sort = {};
    switch(ordenacao) {
      case 'reputacao':
        sort = { estrelas: -1, avaliacoes: -1 };
        break;
      case 'avaliacoes':
        sort = { avaliacoes: -1 };
        break;
      case 'experiencia':
        sort = { experiencia: -1 };
        break;
      case 'nome':
        sort = { nome: 1 };
        break;
      default:
        sort = { estrelas: -1, avaliacoes: -1 };
    }

    // Executar a consulta com paginação
    const prestadores = await Prestador.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Prestador.countDocuments(query);

    console.log(`🔍 Busca realizada:`, {
      query,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      prestadores,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR PERFIL DO PRESTADOR LOGADO ==========
router.get('/perfil', autenticar, async (req, res) => {
  try {
    console.log('🔍 Buscando perfil do usuário:', req.user.userId);

    // Buscar o usuário para obter o prestadorId
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.tipo !== 'prestador') {
      return res.status(403).json({ error: 'Usuário não é um prestador' });
    }

    if (!user.prestadorId) {
      return res.status(404).json({ error: 'Prestador não vinculado ao usuário' });
    }

    // Buscar o prestador pelo ID
    const prestador = await Prestador.findById(user.prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    // Construir URL da foto de perfil
    const fotoPerfilUrl = prestador.fotoPerfil 
      ? `${process.env.API_URL}/uploads/perfil/${prestador.fotoPerfil}`
      : null;

    // Retornar dados completos do prestador + email do usuário
    res.json({
      ...prestador.toObject(),
      email: user.email,
      fotoPerfilUrl
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ATUALIZAR PERFIL DO PRESTADOR (COM TODOS OS CAMPOS) ==========
router.put('/perfil', autenticar, async (req, res) => {
  try {
    console.log('📝 Atualizando perfil do usuário:', req.user.userId);

    const user = await User.findById(req.user.userId);
    
    if (!user || user.tipo !== 'prestador' || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Validar campos obrigatórios
    if (!req.body.nome || !req.body.categoria || !req.body.cidade || !req.body.whatsapp) {
      return res.status(400).json({ 
        error: 'Nome, categoria, cidade e WhatsApp são obrigatórios' 
      });
    }

    // Processar arrays
    const especialidades = req.body.especialidades 
      ? (Array.isArray(req.body.especialidades) 
          ? req.body.especialidades 
          : req.body.especialidades.split(',').map(e => e.trim()).filter(e => e))
      : [];

    const certificacoes = req.body.certificacoes 
      ? (Array.isArray(req.body.certificacoes) 
          ? req.body.certificacoes 
          : req.body.certificacoes.split(',').map(c => c.trim()).filter(c => c))
      : [];

    const regioesAtendimento = req.body.regioesAtendimento 
      ? (Array.isArray(req.body.regioesAtendimento) 
          ? req.body.regioesAtendimento 
          : req.body.regioesAtendimento.split(',').map(r => r.trim()).filter(r => r))
      : [];

    const dadosAtualizados = {
      nome: req.body.nome,
      descricao: req.body.descricao || '',
      especialidades: especialidades,
      certificacoes: certificacoes,
      experiencia: req.body.experiencia || '',
      regioesAtendimento: regioesAtendimento,
      whatsapp: req.body.whatsapp.replace(/\D/g, ''),
      telefone: req.body.telefone ? req.body.telefone.replace(/\D/g, '') : '',
      cidade: req.body.cidade,
      categoria: req.body.categoria,
      tags: req.body.tags || []
    };

    const prestador = await Prestador.findByIdAndUpdate(
      user.prestadorId,
      dadosAtualizados,
      { new: true, runValidators: true }
    );

    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    console.log(`✅ Perfil atualizado: ${prestador.nome}`);

    res.json({
      message: '✅ Perfil atualizado com sucesso!',
      prestador
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== UPLOAD DE FOTO DE PERFIL ==========
router.post('/foto', autenticar, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const prestador = await Prestador.findById(user.prestadorId);
    
    // Se já tinha foto, remover a antiga
    if (prestador.fotoPerfil) {
      const oldPath = path.join('./uploads/perfil', prestador.fotoPerfil);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Atualizar com a nova foto
    prestador.fotoPerfil = req.file.filename;
    await prestador.save();

    const fotoUrl = `${process.env.API_URL}/uploads/perfil/${req.file.filename}`;

    res.json({
      message: '✅ Foto de perfil atualizada com sucesso!',
      fotoPerfil: req.file.filename,
      fotoPerfilUrl: fotoUrl
    });

  } catch (error) {
    console.error('❌ Erro no upload de foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== REMOVER FOTO DE PERFIL ==========
router.delete('/foto', autenticar, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const prestador = await Prestador.findById(user.prestadorId);
    
    if (prestador.fotoPerfil) {
      const oldPath = path.join('./uploads/perfil', prestador.fotoPerfil);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      prestador.fotoPerfil = null;
      await prestador.save();
    }

    res.json({ message: '✅ Foto removida com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao remover foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR PRESTADOR POR SLUG ==========
router.get('/:slug', async (req, res) => {
  try {
    const prestador = await Prestador.findOne({ slug: req.params.slug });
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    const fotoPerfilUrl = prestador.fotoPerfil 
      ? `${process.env.API_URL}/uploads/perfil/${prestador.fotoPerfil}`
      : null;

    res.json({
      ...prestador.toObject(),
      fotoPerfilUrl
    });
  } catch (error) {
    console.error('❌ Erro ao buscar prestador por slug:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR PRESTADOR POR ID ==========
router.get('/id/:id', async (req, res) => {
  try {
    const prestador = await Prestador.findById(req.params.id);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    const fotoPerfilUrl = prestador.fotoPerfil 
      ? `${process.env.API_URL}/uploads/perfil/${prestador.fotoPerfil}`
      : null;

    res.json({
      ...prestador.toObject(),
      fotoPerfilUrl
    });
  } catch (error) {
    console.error('❌ Erro ao buscar prestador por ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CRIAR NOVO PRESTADOR ==========
router.post('/', async (req, res) => {
  try {
    // Verifica se já existe prestador com este CNPJ
    if (req.body.cnpj) {
      const cnpjLimpo = req.body.cnpj.replace(/\D/g, '');
      const existe = await Prestador.findOne({ cnpj: cnpjLimpo });
      if (existe) {
        return res.status(400).json({ error: 'CNPJ já cadastrado' });
      }
    }

    // Verifica se já existe prestador com este e-mail
    if (req.body.email) {
      const existe = await Prestador.findOne({ email: req.body.email });
      if (existe) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }
    }

    // Processar arrays
    const especialidades = req.body.especialidades 
      ? (Array.isArray(req.body.especialidades) 
          ? req.body.especialidades 
          : req.body.especialidades.split(',').map(e => e.trim()).filter(e => e))
      : [];

    const certificacoes = req.body.certificacoes 
      ? (Array.isArray(req.body.certificacoes) 
          ? req.body.certificacoes 
          : req.body.certificacoes.split(',').map(c => c.trim()).filter(c => c))
      : [];

    const regioesAtendimento = req.body.regioesAtendimento 
      ? (Array.isArray(req.body.regioesAtendimento) 
          ? req.body.regioesAtendimento 
          : req.body.regioesAtendimento.split(',').map(r => r.trim()).filter(r => r))
      : [];

    // Prepara os dados
    const dadosPrestador = {
      ...req.body,
      cnpj: req.body.cnpj?.replace(/\D/g, ''),
      whatsapp: req.body.whatsapp?.replace(/\D/g, ''),
      telefone: req.body.telefone?.replace(/\D/g, ''),
      slug: req.body.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      especialidades: especialidades,
      certificacoes: certificacoes,
      experiencia: req.body.experiencia || '',
      regioesAtendimento: regioesAtendimento,
      estrelas: 0,
      avaliacoes: 0,
      servicosRealizados: 0,
      clientesFieis: 0
    };

    const prestador = new Prestador(dadosPrestador);
    await prestador.save();
    
    console.log(`✅ Novo prestador cadastrado: ${prestador.nome} (${prestador._id})`);
    
    res.status(201).json({
      message: '✅ Prestador cadastrado com sucesso!',
      prestador: {
        id: prestador._id,
        nome: prestador.nome,
        slug: prestador.slug,
        email: prestador.email,
        categoria: prestador.categoria,
        cidade: prestador.cidade,
        verificado: prestador.verificado || false
      }
    });
  } catch (error) {
    console.error('❌ Erro no cadastro:', error);
    res.status(400).json({ error: error.message });
  }
});

// ========== VERIFICAR CNPJ ==========
router.post('/verificar-cnpj', async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }

    const resultado = await consultarCNPJ(cnpj);
    
    if (resultado.valido) {
      const prestador = await Prestador.findOneAndUpdate(
        { cnpj: cnpj.replace(/[^\d]/g, '') },
        {
          verificado: true,
          dataVerificacaoCNPJ: new Date(),
          dadosCNPJ: resultado.empresa
        },
        { new: true }
      );
      
      res.json({
        valido: true,
        situacao: resultado.situacao,
        empresa: resultado.empresa,
        prestador
      });
    } else {
      res.status(400).json({ 
        valido: false, 
        motivo: resultado.motivo 
      });
    }

  } catch (error) {
    console.error('❌ Erro na verificação de CNPJ:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SERVIÇO PARA SIRVA AS IMAGENS ==========
router.get('/uploads/perfil/:filename', (req, res) => {
  const filePath = path.join('./uploads/perfil', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Imagem não encontrada' });
  }
});

export default router;

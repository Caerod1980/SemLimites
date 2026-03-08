import express from 'express';
import jwt from 'jsonwebtoken';
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';
import { consultarCNPJ } from '../services/receitaFederal.js';

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
      estado,
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
    if (estado) query.estado = estado;
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
        { certificacoes: { $in: [new RegExp(termoBusca, 'i')] } },
        { tags: { $in: [new RegExp(termoBusca, 'i')] } }
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

    // Retornar dados completos do prestador + email do usuário
    res.json({
      ...prestador.toObject(),
      email: user.email
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
    if (!req.body.nome || !req.body.categoria || !req.body.cidade || !req.body.estado || !req.body.whatsapp) {
      return res.status(400).json({ 
        error: 'Nome, categoria, cidade, estado e WhatsApp são obrigatórios' 
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

    const tags = req.body.tags 
      ? (Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map(t => t.trim()).filter(t => t))
      : [];

    const dadosAtualizados = {
      nome: req.body.nome,
      descricao: req.body.descricao || '',
      experiencia: req.body.experiencia || '',
      especialidades: especialidades,
      certificacoes: certificacoes,
      regioesAtendimento: regioesAtendimento,
      whatsapp: req.body.whatsapp.replace(/\D/g, ''),
      telefone: req.body.telefone ? req.body.telefone.replace(/\D/g, '') : '',
      cidade: req.body.cidade,
      estado: req.body.estado,
      categoria: req.body.categoria,
      tags: tags
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

// ========== BUSCAR PRESTADOR POR SLUG ==========
router.get('/:slug', async (req, res) => {
  try {
    const prestador = await Prestador.findOne({ slug: req.params.slug });
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    res.json(prestador);
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

    res.json(prestador);
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

    const tags = req.body.tags 
      ? (Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map(t => t.trim()).filter(t => t))
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
      tags: tags,
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
        estado: prestador.estado,
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

export default router;

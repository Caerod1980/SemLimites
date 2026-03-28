import express from 'express';
import jwt from 'jsonwebtoken';
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';
import Servico from '../models/Servico.js';
import { consultarCNPJ } from '../services/receitaFederal.js';
import { cancelarAssinatura } from '../services/mercadopago.js';

const router = express.Router();

// ========== CONFIGURAÇÃO PARA CRIAR ÍNDICES AUTOMATICAMENTE ==========
async function garantirIndices() {
  try {
    console.log('🔧 Verificando/criando índices da coleção Prestador...');
    
    await Prestador.collection.createIndex({ cidade: 1, estado: 1 });
    await Prestador.collection.createIndex({ estado: 1 });
    await Prestador.collection.createIndex({ categoria: 1 });
    await Prestador.collection.createIndex({ categoriaPrincipal: 1 });
    await Prestador.collection.createIndex({ servicos: 1 });
    await Prestador.collection.createIndex({ estrelas: -1, avaliacoes: -1 });
    await Prestador.collection.createIndex({ avaliacoes: -1 });
    
    // NOVO ÍNDICE PARA planoStatus (otimiza busca)
    await Prestador.collection.createIndex({ planoStatus: 1 });
    
    await Prestador.collection.createIndex(
      { 
        nome: "text",
        descricao: "text", 
        especialidades: "text", 
        certificacoes: "text", 
        tags: "text" 
      },
      { 
        name: "busca_textual",
        weights: {
          nome: 10,
          especialidades: 8,
          certificacoes: 5,
          tags: 3,
          descricao: 1
        }
      }
    );
    
    await Prestador.collection.createIndex({ verificado: 1 });
    await Prestador.collection.createIndex({ experiencia: -1 });
    await Prestador.collection.createIndex({ nome: 1 });
    await Prestador.collection.createIndex({ slug: 1 }, { unique: true });
    
    console.log('✅ Todos os índices criados/verificados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
  }
}

garantirIndices();

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

// ========== BUSCAR PRESTADORES COM FILTROS (CORRIGIDO - FILTRA PLANO ATIVO) ==========
router.get('/busca', async (req, res) => {
  try {
    const { 
      cidade, 
      estado,
      categoria,
      categoriaPrincipal,
      servico,
      q, 
      apenasVerificados,
      ordenacao = 'reputacao',
      page = 1,
      limit = 12
    } = req.query;

    let query = {};

    // ===== CORREÇÃO: FILTRAR APENAS PRESTADORES COM PLANO ATIVO =====
    // Prestadores com plano pendente não aparecem nas buscas
    query.planoStatus = 'ativo';
    query.planoAtivo = true;

    if (cidade) {
      query.cidade = new RegExp(cidade, 'i');
    }
    
    if (estado) {
      query.estado = estado;
    }

    if (categoriaPrincipal) {
      query.categoriaPrincipal = categoriaPrincipal;
      console.log(`🔍 Filtrando por categoriaPrincipal: ${categoriaPrincipal}`);
    } 
    else if (categoria) {
      query.categoria = categoria;
      console.log(`🔍 Filtrando por categoria (antiga): ${categoria}`);
    }

    if (servico) {
      query.servicos = servico;
      console.log(`🔍 Filtrando por servico: ${servico}`);
    }

    if (q && q.trim() !== '') {
      const termoBusca = q.trim();
      query.$text = { $search: termoBusca };
    }

    if (apenasVerificados === 'true') {
      query.verificado = true;
    }

    console.log('📦 Query de busca:', JSON.stringify(query, null, 2));

    let sort = {};
    if (q && q.trim() !== '' && query.$text) {
      sort = { score: { $meta: "textScore" } };
    } else {
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
    }

    let prestadoresQuery = Prestador.find(query)
      .populate('categoriaPrincipal', 'nome slug')
      .populate('servicos', 'nome slug')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    if (q && q.trim() !== '' && query.$text) {
      prestadoresQuery = prestadoresQuery.sort({ score: { $meta: "textScore" } });
    } else {
      prestadoresQuery = prestadoresQuery.sort(sort);
    }

    const prestadores = await prestadoresQuery;
    const total = await Prestador.countDocuments(query);

    console.log(`🔍 Busca realizada:`, {
      query: JSON.stringify(query),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (prestadores.length > 0) {
      console.log('📋 Primeiro prestador:', {
        nome: prestadores[0].nome,
        categoriaPrincipal: prestadores[0].categoriaPrincipal,
        servicos: prestadores[0].servicos?.map(s => s.nome || s),
        planoStatus: prestadores[0].planoStatus
      });
    }

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

    const prestador = await Prestador.findById(user.prestadorId)
      .populate('categoriaPrincipal', 'nome slug')
      .populate('servicos', 'nome slug');
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    res.json({
      ...prestador.toObject(),
      email: user.email
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ATUALIZAR PERFIL DO PRESTADOR ==========
router.put('/perfil', autenticar, async (req, res) => {
  try {
    console.log('📝 Atualizando perfil do usuário:', req.user.userId);

    const user = await User.findById(req.user.userId);
    
    if (!user || user.tipo !== 'prestador' || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!req.body.nome || !req.body.cidade || !req.body.estado || !req.body.whatsapp) {
      return res.status(400).json({ 
        error: 'Nome, cidade, estado e WhatsApp são obrigatórios' 
      });
    }

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

    const tags = req.body.tags 
      ? (Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map(t => t.trim()).filter(t => t))
      : [];

    const prestadorAtual = await Prestador.findById(user.prestadorId);
    
    const dadosAtualizados = {
      nome: req.body.nome,
      descricao: req.body.descricao || '',
      experiencia: req.body.experiencia || '',
      especialidades: especialidades,
      certificacoes: certificacoes,
      whatsapp: req.body.whatsapp.replace(/\D/g, ''),
      telefone: req.body.telefone ? req.body.telefone.replace(/\D/g, '') : '',
      cidade: req.body.cidade,
      estado: req.body.estado,
      categoria: req.body.categoria,
      categoriaPrincipal: req.body.categoriaPrincipal || prestadorAtual.categoriaPrincipal,
      servicos: req.body.servicos || prestadorAtual.servicos,
      tags: tags,
      
      ...(req.body.cpf && { cpf: req.body.cpf.replace(/\D/g, '') }),
      ...(req.body.responsavel && { responsavel: req.body.responsavel }),
      ...(req.body.tipoPessoa && { tipoPessoa: req.body.tipoPessoa })
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

// ========== SALVAR URL DA FOTO DE PERFIL ==========
router.post('/foto', autenticar, async (req, res) => {
  try {
    const { fotoUrl, blobName } = req.body;
    
    console.log('📸 Requisição para salvar foto recebida');
    console.log('👤 Usuário:', req.user.userId);
    
    if (!fotoUrl) {
      return res.status(400).json({ error: 'fotoUrl é obrigatório' });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user || !user.prestadorId) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    const prestador = await Prestador.findById(user.prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    prestador.foto = fotoUrl;
    await prestador.save();

    console.log(`✅ Foto salva para prestador: ${prestador.nome} (ID: ${prestador._id})`);
    console.log(`📎 URL: ${fotoUrl}`);

    res.json({ 
      success: true, 
      fotoUrl: prestador.foto,
      message: 'Foto salva com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao salvar foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== REMOVER FOTO DE PERFIL ==========
router.delete('/foto', autenticar, async (req, res) => {
  try {
    console.log('🗑️ Requisição para remover foto recebida');
    console.log('👤 Usuário:', req.user.userId);

    const user = await User.findById(req.user.userId);
    
    if (!user || !user.prestadorId) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    const prestador = await Prestador.findById(user.prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    prestador.foto = null;
    await prestador.save();

    console.log(`✅ Foto removida para prestador: ${prestador.nome}`);

    res.json({ 
      success: true, 
      message: 'Foto removida com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao remover foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== EXCLUIR PERFIL DO PRESTADOR PERMANENTEMENTE (COM CANCELAMENTO DE ASSINATURA) ==========
router.delete('/perfil', autenticar, async (req, res) => {
  try {
    console.log('🗑️ Iniciando exclusão permanente do prestador:', req.user.userId);

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

    const prestadorId = user.prestadorId;

    const prestador = await Prestador.findById(prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    let assinaturaCancelada = false;
    
    // Cancelar assinatura no Mercado Pago (usando subscriptionId ou planoId)
    const subscriptionId = prestador.mercadoPago?.subscriptionId || prestador.planoId;
    
    if (subscriptionId) {
      try {
        console.log(`🔄 Cancelando assinatura no Mercado Pago: ${subscriptionId}`);
        
        const resultado = await cancelarAssinatura(subscriptionId);
        
        if (resultado.success) {
          console.log(`✅ Assinatura cancelada com sucesso no Mercado Pago`);
          assinaturaCancelada = true;
        } else {
          console.error(`❌ Erro ao cancelar assinatura no Mercado Pago:`, resultado.error);
        }
      } catch (mpError) {
        console.error('❌ Erro ao chamar API do Mercado Pago:', mpError);
      }
    } else {
      console.log('ℹ️ Prestador não possui assinatura ativa');
    }

    const servicosExcluidos = await Servico.deleteMany({ prestadorId: prestadorId });
    console.log(`✅ ${servicosExcluidos.deletedCount} serviços excluídos`);

    const prestadorExcluido = await Prestador.findByIdAndDelete(prestadorId);
    
    if (!prestadorExcluido) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    await User.findByIdAndDelete(req.user.userId);

    console.log(`✅ Prestador ${prestadorId} e usuário ${req.user.userId} excluídos permanentemente`);
    console.log(`📊 Assinatura cancelada: ${assinaturaCancelada ? 'Sim' : 'Não'}`);

    res.json({ 
      success: true,
      message: 'Perfil excluído permanentemente com sucesso',
      assinaturaCancelada: assinaturaCancelada,
      servicosExcluidos: servicosExcluidos.deletedCount
    });

  } catch (error) {
    console.error('❌ Erro ao excluir perfil permanentemente:', error);
    res.status(500).json({ error: 'Erro ao excluir perfil permanentemente: ' + error.message });
  }
});

// ========== BUSCAR PRESTADOR POR SLUG ==========
router.get('/:slug', async (req, res) => {
  try {
    const prestador = await Prestador.findOne({ slug: req.params.slug })
      .populate('categoriaPrincipal', 'nome slug')
      .populate('servicos', 'nome slug');
    
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
    console.log(`🔍 Buscando prestador por ID: ${req.params.id}`);
    
    const prestador = await Prestador.findById(req.params.id)
      .populate('categoriaPrincipal', 'nome slug')
      .populate('servicos', 'nome slug');
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    console.log(`✅ Prestador encontrado: ${prestador.nome}`);
    console.log(`📦 Categoria Principal:`, prestador.categoriaPrincipal);
    console.log(`📦 Serviços (${prestador.servicos?.length || 0}):`, prestador.servicos);
    console.log(`📸 Foto:`, prestador.foto || 'Sem foto');
    console.log(`💰 Plano Status: ${prestador.planoStatus || 'pendente'}`);

    res.json(prestador);
  } catch (error) {
    console.error('❌ Erro ao buscar prestador por ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== CRIAR NOVO PRESTADOR ==========
router.post('/', async (req, res) => {
  try {
    if (req.body.email) {
      const existe = await Prestador.findOne({ email: req.body.email });
      if (existe) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }
    }

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

    const tags = req.body.tags 
      ? (Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map(t => t.trim()).filter(t => t))
      : [];

    const dadosPrestador = {
      ...req.body,
      cnpj: req.body.cnpj?.replace(/\D/g, ''),
      cpf: req.body.cpf?.replace(/\D/g, ''),
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
      tags: tags,
      estrelas: 0,
      avaliacoes: 0,
      servicosRealizados: 0,
      clientesFieis: 0,
      foto: null,
      planoStatus: 'pendente',  // Inicia como pendente
      planoAtivo: false          // Inicia como inativo
    };

    const prestador = new Prestador(dadosPrestador);
    await prestador.save();
    
    console.log(`✅ Novo prestador cadastrado: ${prestador.nome} (${prestador._id})`);
    console.log(`📊 Plano Status inicial: ${prestador.planoStatus}`);
    
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
        verificado: prestador.verificado || false,
        foto: prestador.foto,
        planoStatus: prestador.planoStatus
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
      res.json({
        valido: true,
        situacao: resultado.situacao,
        empresa: resultado.empresa
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

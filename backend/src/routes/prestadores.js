import express from 'express';
import Prestador from '../models/Prestador.js';
import { consultarCNPJ } from '../services/receitaFederal.js';

const router = express.Router();

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

    if (cidade) query.cidade = cidade;
    if (categoria) query.categoria = categoria;
    if (apenasVerificados === 'true') query.verificado = true;

    if (q) {
      query.$text = { $search: q };
    }

    let sort = {};
    switch(ordenacao) {
      case 'reputacao':
        sort = { estrelas: -1, avaliacoes: -1 };
        break;
      case 'avaliacoes':
        sort = { avaliacoes: -1 };
        break;
      case 'experiencia':
        sort = { tempoMercado: -1 };
        break;
      case 'nome':
        sort = { nome: 1 };
        break;
    }

    const prestadores = await Prestador.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Prestador.countDocuments(query);

    res.json({
      prestadores,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
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

    // Prepara os dados
    const dadosPrestador = {
      ...req.body,
      cnpj: req.body.cnpj?.replace(/\D/g, ''),
      slug: req.body.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      estrelas: 0,
      avaliacoes: 0,
      servicosRealizados: 0,
      clientesFieis: 0
    };

    const prestador = new Prestador(dadosPrestador);
    await prestador.save();
    
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
    console.error('Erro no cadastro:', error);
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
    res.status(500).json({ error: error.message });
  }
});

export default router;

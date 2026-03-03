import express from 'express';
import Prestador from '../models/Prestador.js';
import { consultarCNPJ } from '../services/receitaFederal.js';

const router = express.Router();

// Buscar prestadores com filtros
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

// Buscar prestador por slug
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

// Verificar CNPJ
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

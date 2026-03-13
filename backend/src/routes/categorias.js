// routes/categorias.js
import express from 'express';
import Categoria from '../models/Categoria.js';

const router = express.Router();

// Buscar categorias principais (nível 1)
router.get('/principais', async (req, res) => {
  try {
    const categorias = await Categoria.find({ nivel: 1, ativa: true })
      .sort({ ordem: 1 });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar serviços por categoria principal
router.get('/:categoriaId/servicos', async (req, res) => {
  try {
    const servicos = await Categoria.find({ 
      categoriaPai: req.params.categoriaId,
      nivel: 3,
      ativa: true 
    }).sort({ nome: 1 });
    res.json(servicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar todas as categorias em árvore
router.get('/arvore', async (req, res) => {
  try {
    const categorias = await Categoria.find({ ativa: true }).lean();
    
    const arvore = categorias
      .filter(c => c.nivel === 1)
      .sort((a, b) => a.ordem - b.ordem)
      .map(cat1 => ({
        ...cat1,
        servicos: categorias
          .filter(c => c.categoriaPai?.toString() === cat1._id.toString())
          .sort((a, b) => a.nome.localeCompare(b.nome))
      }));
    
    res.json(arvore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

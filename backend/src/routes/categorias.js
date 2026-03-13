// routes/categorias.js
import express from 'express';
import Categoria from '../models/Categoria.js';

const router = express.Router();

// ========== BUSCAR CATEGORIAS PRINCIPAIS (NÍVEL 1) ==========
router.get('/principais', async (req, res) => {
  try {
    const categorias = await Categoria.find({ nivel: 1, ativa: true })
      .sort({ ordem: 1 });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR SERVIÇOS POR CATEGORIA PRINCIPAL (NÍVEL 2) ==========
router.get('/:categoriaId/servicos', async (req, res) => {
  try {
    const { categoriaId } = req.params;
    
    console.log(`🔍 Buscando serviços para categoria: ${categoriaId}`);
    
    const servicos = await Categoria.find({ 
      categoriaPai: categoriaId,
      nivel: 2,  // ✅ CORRIGIDO
      ativa: true 
    }).sort({ nome: 1 });
    
    console.log(`✅ Encontrados ${servicos.length} serviços`);
    res.json(servicos);
  } catch (error) {
    console.error('❌ Erro ao buscar serviços:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR TODAS AS CATEGORIAS EM ÁRVORE ==========
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

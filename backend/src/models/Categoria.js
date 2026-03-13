// models/Categoria.js
import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true, 
    trim: true 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  nivel: { 
    type: Number, 
    required: true, 
    enum: [1, 2, 3] // 1 = categoria principal, 2 = serviço, 3 = subserviço (futuro)
  },
  categoriaPai: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    default: null
  },
  // Campo para compatibilidade futura (se quiser agrupar subserviços)
  servicos: [{ 
    type: String, 
    trim: true 
  }],
  ativa: { 
    type: Boolean, 
    default: true 
  },
  ordem: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices
categoriaSchema.index({ slug: 1 });
categoriaSchema.index({ categoriaPai: 1 });
categoriaSchema.index({ nivel: 1 });

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria;

// models/Categoria.js
import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  nivel: { type: Number, required: true }, // 1, 2 ou 3
  categoriaPai: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categoria',
    default: null 
  },
  servicos: [{ type: String }], // Para nível 3, lista de serviços específicos
  ativa: { type: Boolean, default: true },
  ordem: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Índices
categoriaSchema.index({ slug: 1 });
categoriaSchema.index({ categoriaPai: 1 });
categoriaSchema.index({ nivel: 1 });

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria;

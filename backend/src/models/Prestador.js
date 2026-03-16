import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  estrelas: { type: Number, min: 1, max: 5, required: true },
  texto: { type: String, required: true },
  data: { type: Date, default: Date.now },
  servico: String,
  gostaram: { type: Number, default: 0 }
});

const prestadorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  foto: String,
  
  // ===== CAMPOS PARA CPF/CNPJ =====
  tipoPessoa: { 
    type: String, 
    enum: ['fisica', 'juridica'], 
    default: 'juridica'
  },
  cpf: { 
    type: String, 
    sparse: true
  },
  responsavel: { type: String },
  
  // CNPJ e verificação
  cnpj: { 
    type: String, 
    sparse: true
  },
  verificado: { type: Boolean, default: false },
  dataVerificacaoCNPJ: Date,
  dadosCNPJ: {
    razaoSocial: String,
    nomeFantasia: String,
    dataAbertura: String,
    situacao: String,
    atividadePrincipal: String,
    endereco: String,
    telefone: String
  },
  
  // ===== NOVOS CAMPOS PARA CATEGORIAS HIERÁRQUICAS =====
  categoriaPrincipal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categoria',
    required: false // Temporariamente opcional para migração
  },
  servicos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria'
  }], // Múltiplos serviços específicos (nível 3)
  
  // ===== NOVO CAMPO PARA CURTIDAS =====
  totalCurtidas: {
    type: Number,
    default: 0
  },
  
  // ===== CAMPOS PROFISSIONAIS (MANTIDOS PARA COMPATIBILIDADE) =====
  categoria: { type: String }, // Mantido para compatibilidade com dados existentes
  cidade: { type: String, required: true },
  regioes: [String],
  descricao: { type: String, required: true },
  sobre: String,
  tags: [String],
  
  // Campos já existentes
  experiencia: { type: String, default: '' },
  especialidades: { type: [String], default: [] }, // Mantido para compatibilidade
  
  // Contato
  whatsapp: String,
  telefone: String,
  email: String,
  
  // Estatísticas
  estrelas: { type: Number, default: 0 },
  avaliacoes: { type: Number, default: 0 },
  servicosRealizados: { type: Number, default: 0 },
  clientesFieis: { type: Number, default: 0 },
  
  // Informações adicionais
  disponibilidade: String,
  tempoResposta: String,
  tempoMercado: String,
  garantia: String,
  destaque: { type: Boolean, default: false },
  
  // Geolocalização
  localizacao: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' }
  },
  
  // Relacionamentos
  reviews: [reviewSchema],
  portfolio: [String],
  certificacoes: [String],
  
}, { timestamps: true });

// ===== ÍNDICES ATUALIZADOS =====
prestadorSchema.index({ cidade: 1, categoriaPrincipal: 1 });
prestadorSchema.index({ cidade: 1, categoria: 1 }); // Mantido para compatibilidade
prestadorSchema.index({ estrelas: -1, avaliacoes: -1 });
prestadorSchema.index({ verificado: 1 });
prestadorSchema.index({ experiencia: -1 });
prestadorSchema.index({ especialidades: 1 });
prestadorSchema.index({ tipoPessoa: 1 });
prestadorSchema.index({ cpf: 1 });
prestadorSchema.index({ cnpj: 1 });

// Índices para busca por serviços
prestadorSchema.index({ servicos: 1 });

// Índice composto para busca avançada
prestadorSchema.index({ 
  categoriaPrincipal: 1, 
  cidade: 1, 
  estrelas: -1 
});

// ===== ÍNDICE PARA CURTIDAS =====
prestadorSchema.index({ totalCurtidas: -1 });

// ===== MIDDLEWARE PARA CRIAR SLUG =====
prestadorSchema.pre('save', function(next) {
  if (this.isModified('nome') || !this.slug) {
    this.slug = this.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// ===== MÉTODOS DE INSTÂNCIA =====

/**
 * Buscar detalhes completos da categoria principal
 */
prestadorSchema.methods.getCategoriaPrincipal = async function() {
  if (!this.categoriaPrincipal) return null;
  
  const Categoria = mongoose.model('Categoria');
  return await Categoria.findById(this.categoriaPrincipal);
};

/**
 * Buscar detalhes completos dos serviços
 */
prestadorSchema.methods.getServicosDetalhados = async function() {
  if (!this.servicos || this.servicos.length === 0) return [];
  
  const Categoria = mongoose.model('Categoria');
  return await Categoria.find({ _id: { $in: this.servicos } });
};

/**
 * Verificar se prestador oferece um serviço específico
 * @param {string} servicoId - ID do serviço
 */
prestadorSchema.methods.ofereceServico = function(servicoId) {
  return this.servicos && this.servicos.some(
    s => s.toString() === servicoId.toString()
  );
};

// ===== MÉTODOS ESTÁTICOS =====

/**
 * Buscar prestadores por serviço específico
 * @param {string} servicoId - ID do serviço
 * @param {Object} filtros - Filtros adicionais (cidade, etc)
 */
prestadorSchema.statics.buscarPorServico = async function(servicoId, filtros = {}) {
  const query = { servicos: servicoId, ...filtros };
  return await this.find(query)
    .sort({ estrelas: -1, avaliacoes: -1, totalCurtidas: -1 })
    .limit(20);
};

/**
 * Buscar prestadores por categoria principal
 * @param {string} categoriaId - ID da categoria principal
 * @param {Object} filtros - Filtros adicionais
 */
prestadorSchema.statics.buscarPorCategoria = async function(categoriaId, filtros = {}) {
  const query = { categoriaPrincipal: categoriaId, ...filtros };
  return await this.find(query)
    .sort({ estrelas: -1, avaliacoes: -1, totalCurtidas: -1 });
};

/**
 * Busca avançada combinando múltiplos critérios
 * @param {Object} params - Parâmetros de busca
 */
prestadorSchema.statics.buscaAvancada = async function(params) {
  const {
    servicoId,
    categoriaId,
    cidade,
    texto,
    page = 1,
    limit = 12
  } = params;

  let query = {};

  if (servicoId) {
    query.servicos = servicoId;
  } else if (categoriaId) {
    query.categoriaPrincipal = categoriaId;
  }

  if (cidade) {
    query.cidade = new RegExp(cidade, 'i');
  }

  if (texto) {
    query.$text = { $search: texto };
  }

  const prestadores = await this.find(query)
    .sort({ estrelas: -1, avaliacoes: -1, totalCurtidas: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await this.countDocuments(query);

  return {
    prestadores,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  };
};

const Prestador = mongoose.model('Prestador', prestadorSchema);

export default Prestador;

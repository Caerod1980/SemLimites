// ========== MODELO PRESTADOR.JS CORRIGIDO ==========
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
  foto: { type: String, default: null },
  
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
  
  // ===== CORREÇÃO: dadosCNPJ com endereço como objeto aninhado =====
  dadosCNPJ: {
    razaoSocial: String,
    nomeFantasia: String,
    dataAbertura: String,
    situacao: String,
    atividadePrincipal: String,
    // Endereço como objeto (não como string)
    endereco: {
      logradouro: String,
      numero: String,
      complemento: String,
      bairro: String,
      cep: String,
      municipio: String,
      uf: String
    },
    telefone: String,
    email: String,
    capitalSocial: String,
    porte: String,
    naturezaJuridica: String,
    simples: {
      optante: Boolean,
      dataOpcao: String,
      dataExclusao: String
    },
    mei: Boolean
  },
  
  // ===== NOVOS CAMPOS PARA CATEGORIAS HIERÁRQUICAS =====
  categoriaPrincipal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categoria',
    required: false
  },
  servicos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria'
  }],
  
  // ===== NOVO CAMPO PARA CURTIDAS =====
  totalCurtidas: {
    type: Number,
    default: 0
  },
  
  // ===== CAMPOS PROFISSIONAIS =====
  categoria: { type: String },
  cidade: { type: String, required: true },
  regioes: [String],
  descricao: { type: String, required: true },
  sobre: String,
  tags: [String],
  
  experiencia: { type: String, default: '' },
  especialidades: { type: [String], default: [] },
  
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

// ===== ÍNDICES =====
prestadorSchema.index({ cidade: 1, categoriaPrincipal: 1 });
prestadorSchema.index({ cidade: 1, categoria: 1 });
prestadorSchema.index({ estrelas: -1, avaliacoes: -1 });
prestadorSchema.index({ verificado: 1 });
prestadorSchema.index({ experiencia: -1 });
prestadorSchema.index({ especialidades: 1 });
prestadorSchema.index({ tipoPessoa: 1 });
prestadorSchema.index({ cpf: 1 });
prestadorSchema.index({ cnpj: 1 });
prestadorSchema.index({ servicos: 1 });
prestadorSchema.index({ totalCurtidas: -1 });

// Índice composto para busca avançada
prestadorSchema.index({ 
  categoriaPrincipal: 1, 
  cidade: 1, 
  estrelas: -1 
});

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
prestadorSchema.methods.getCategoriaPrincipal = async function() {
  if (!this.categoriaPrincipal) return null;
  const Categoria = mongoose.model('Categoria');
  return await Categoria.findById(this.categoriaPrincipal);
};

prestadorSchema.methods.getServicosDetalhados = async function() {
  if (!this.servicos || this.servicos.length === 0) return [];
  const Categoria = mongoose.model('Categoria');
  return await Categoria.find({ _id: { $in: this.servicos } });
};

prestadorSchema.methods.ofereceServico = function(servicoId) {
  return this.servicos && this.servicos.some(
    s => s.toString() === servicoId.toString()
  );
};

// ===== MÉTODOS ESTÁTICOS =====
prestadorSchema.statics.buscarPorServico = async function(servicoId, filtros = {}) {
  const query = { servicos: servicoId, ...filtros };
  return await this.find(query)
    .sort({ estrelas: -1, avaliacoes: -1, totalCurtidas: -1 })
    .limit(20);
};

prestadorSchema.statics.buscarPorCategoria = async function(categoriaId, filtros = {}) {
  const query = { categoriaPrincipal: categoriaId, ...filtros };
  return await this.find(query)
    .sort({ estrelas: -1, avaliacoes: -1, totalCurtidas: -1 });
};

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

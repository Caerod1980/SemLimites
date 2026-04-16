// /src/models/Prestador.js - VERSÃO COM MIXED TYPE E ASSINATURAS
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
  
  // ===== SOLUÇÃO: USAR MIXED TYPE PARA ACEITAR QUALQUER OBJETO =====
  dadosCNPJ: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
   // ===== CAMPOS PARA ASSINATURA E PLANOS =====
  planoAtivo: {
    type: Boolean,
    default: false
  },

  planoExpiracao: Date,

  planoId: String, // ID principal do plano/assinatura no MP

  planoStatus: {
    type: String,
    enum: ['pendente', 'ativo', 'cancelado', 'expirado'],
    default: 'pendente'
  },

  // automatico = assinatura no cartão
  // manual = renovação por PIX
  tipoPlano: {
    type: String,
    enum: ['automatico', 'manual'],
    default: 'automatico'
  },

  // forma atual usada pelo prestador
  formaPagamentoAtual: {
    type: String,
    enum: ['cartao', 'pix'],
    default: 'cartao'
  },

  // referência do último pagamento manual por PIX
  ultimoPagamentoManual: {
    paymentId: String,
    preferenceId: String,
    date: Date,
    amount: Number,
    status: String
  },
  planoHistorico: [{
    data: { type: Date, default: Date.now },
    evento: String,
    detalhes: String,
    paymentId: String,
    valor: Number
  }],
  
  mercadoPago: {
    customerId: String,
    subscriptionId: String, // assinatura automática
    paymentMethod: String,
    lastPayment: {
      date: Date,
      amount: Number,
      status: String,
      paymentId: String
    },

    // referência do último PIX/manual gerado
    lastPix: {
      paymentId: String,
      preferenceId: String,
      qrCode: String,
      qrCodeBase64: String,
      ticketUrl: String,
      status: String,
      createdAt: Date
    }
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

// ===== ÍNDICES ATUALIZADOS =====
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

// ===== NOVOS ÍNDICES PARA ASSINATURAS =====
prestadorSchema.index({ planoAtivo: 1 });
prestadorSchema.index({ planoStatus: 1 });
prestadorSchema.index({ planoExpiracao: 1 });
prestadorSchema.index({ 'mercadoPago.customerId': 1 });
prestadorSchema.index({ 'mercadoPago.subscriptionId': 1 });
prestadorSchema.index({ tipoPlano: 1 });
prestadorSchema.index({ formaPagamentoAtual: 1 });
prestadorSchema.index({ 'mercadoPago.lastPix.paymentId': 1 });
prestadorSchema.index({ 'mercadoPago.lastPix.preferenceId': 1 });

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

/**
 * Verificar se o prestador tem plano ativo
 */
prestadorSchema.methods.temPlanoAtivo = function() {
  if (!this.planoAtivo || this.planoStatus !== 'ativo') return false;
  
  if (this.planoExpiracao && this.planoExpiracao < new Date()) {
    this.planoAtivo = false;
    this.planoStatus = 'expirado';
    this.save();
    return false;
  }
  
  return true;
};

/**
 * Adicionar evento ao histórico do plano
 * @param {string} evento - Nome do evento
 * @param {string} detalhes - Detalhes do evento
 * @param {Object} opcoes - Opções adicionais (paymentId, valor, etc)
 */
prestadorSchema.methods.adicionarHistoricoPlano = function(evento, detalhes, opcoes = {}) {
  this.planoHistorico = this.planoHistorico || [];
  this.planoHistorico.push({
    data: new Date(),
    evento,
    detalhes,
    paymentId: opcoes.paymentId,
    valor: opcoes.valor
  });
};

/**
 * Ativar plano após pagamento aprovado
 * @param {Object} dados - Dados do pagamento
 */
prestadorSchema.methods.ativarPlano = function(dados = {}) {
  this.planoAtivo = true;
  this.planoStatus = 'ativo';
  this.planoExpiracao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (dados.tipoPlano) {
    this.tipoPlano = dados.tipoPlano;
  }

  if (dados.formaPagamentoAtual) {
    this.formaPagamentoAtual = dados.formaPagamentoAtual;
  }

  this.mercadoPago = this.mercadoPago || {};

  if (dados.paymentId) {
    this.mercadoPago.lastPayment = {
      date: new Date(),
      amount: dados.valor,
      status: 'approved',
      paymentId: dados.paymentId
    };
  }

  if (dados.preferenceId || dados.paymentId) {
    this.ultimoPagamentoManual = {
      paymentId: dados.paymentId || null,
      preferenceId: dados.preferenceId || null,
      date: new Date(),
      amount: dados.valor || null,
      status: 'approved'
    };
  }

  this.adicionarHistoricoPlano(
    'pagamento_aprovado',
    `Pagamento aprovado - ID: ${dados.paymentId || 'N/A'}`,
    { paymentId: dados.paymentId, valor: dados.valor }
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

/**
 * Buscar prestadores com planos expirados
 * (para jobs de limpeza/notificação)
 */
prestadorSchema.statics.buscarExpirados = async function() {
  const now = new Date();
  return await this.find({
    planoAtivo: true,
    planoStatus: 'ativo',
    planoExpiracao: { $lt: now }
  });
};

/**
 * Buscar prestadores com pagamentos pendentes
 */
prestadorSchema.statics.buscarPendentes = async function() {
  return await this.find({
    planoStatus: 'pendente'
  });
};

const Prestador = mongoose.model('Prestador', prestadorSchema);

export default Prestador;

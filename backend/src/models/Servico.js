import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Modelo de Serviço realizado
 * Representa um serviço prestado que aguarda ou já recebeu avaliação
 */
const servicoSchema = new mongoose.Schema({
  // ========== RELACIONAMENTOS ==========
  prestadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prestador',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ========== DADOS DO CLIENTE ==========
  clienteNome: { 
    type: String, 
    required: true,
    trim: true
  },
  
  clienteWhatsApp: { 
    type: String, 
    required: true,
    trim: true
  },
  
  clienteEmail: { 
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'E-mail inválido']
  },

  // ========== DADOS DO SERVIÇO ==========
  titulo: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 20
  },
  
  descricao: { 
    type: String, 
    required: true,
    trim: true
  },
  
  dataRealizacao: { 
    type: Date, 
    default: Date.now 
  },
  
  valor: {
    type: Number,
    min: 0,
    default: null
  },

  // ========== TOKEN DE AVALIAÇÃO ==========
  avaliacaoToken: { 
    type: String, 
    unique: true,
    sparse: true,
    index: true
  },
  
  tokenExpiracao: { 
    type: Date 
  },
  
  tokenUsado: { 
    type: Boolean, 
    default: false 
  },

  // ========== AVALIAÇÃO ==========
  avaliacao: {
    estrelas: { 
      type: Number, 
      min: 1, 
      max: 5 
    },
    comentario: { 
      type: String, 
      trim: true,
      maxlength: 500
    },
    dataAvaliacao: { 
      type: Date 
    },
    ipAvaliador: String,
    userAgent: String
  },

  // ========== STATUS ==========
  status: { 
    type: String, 
    enum: {
      values: ['aguardando', 'avaliado', 'expirado'],
      message: 'Status inválido'
    },
    default: 'aguardando',
    index: true
  },

  // ========== METADADOS ==========
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== VIRTUAIS ==========
servicoSchema.virtual('linkAvaliacao').get(function() {
  if (!this.avaliacaoToken) return null;
  const frontendUrl = process.env.FRONTEND_URL || 'https://semlimites.com.br';
  return `${frontendUrl}/avaliar/${this.avaliacaoToken}`;
});

servicoSchema.virtual('mensagemWhatsApp').get(function() {
  return `Olá ${this.clienteNome}! 👋\n\n` +
    `Você contratou ${this.titulo} pelo SemLimites.\n\n` +
    `Por favor, avalie o serviço clicando no link abaixo:\n` +
    `${this.linkAvaliacao}\n\n` +
    `Sua avaliação é muito importante para nós! ⭐`;
});

// ========== ÍNDICES ==========
servicoSchema.index({ prestadorId: 1, status: 1 });
servicoSchema.index({ prestadorId: 1, createdAt: -1 });
servicoSchema.index({ avaliacaoToken: 1 }, { unique: true, sparse: true });
servicoSchema.index({ status: 1, 'avaliacao.dataAvaliacao': -1 }); // NOVO: para admin - últimas avaliações
servicoSchema.index({ prestadorId: 1, createdAt: -1, status: 1 }); // NOVO: para consultas combinadas

// ========== MIDDLEWARES ==========
servicoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ========== MÉTODOS DE INSTÂNCIA ==========
/**
 * Gerar token único para avaliação
 * @returns {string} Token gerado
 */
servicoSchema.methods.gerarTokenAvaliacao = function() {
  const token = crypto.randomBytes(16).toString('hex');
  
  this.avaliacaoToken = token;
  this.tokenExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  this.tokenUsado = false;
  this.status = 'aguardando';
  
  return token;
};

/**
 * Regenerar token (para reenvio)
 * @returns {string} Novo token gerado
 */
servicoSchema.methods.regenerarToken = function() {
  const token = crypto.randomBytes(16).toString('hex');
  
  this.avaliacaoToken = token;
  this.tokenExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  this.tokenUsado = false;
  this.status = 'aguardando';
  
  return token;
};

/**
 * Verificar se o token é válido
 * @param {string} token - Token a ser verificado
 * @returns {boolean}
 */
servicoSchema.methods.verificarToken = function(token) {
  if (this.avaliacaoToken !== token) return false;
  if (this.tokenUsado) return false;
  if (this.tokenExpiracao && this.tokenExpiracao < new Date()) return false;
  if (this.status !== 'aguardando') return false;
  return true;
};

/**
 * Registrar avaliação
 * @param {number} estrelas - Nota de 1 a 5
 * @param {string} comentario - Comentário do cliente
 * @param {Object} metadata - Dados adicionais (IP, user agent)
 */
servicoSchema.methods.registrarAvaliacao = async function(estrelas, comentario, metadata = {}) {
  this.avaliacao = {
    estrelas,
    comentario,
    dataAvaliacao: new Date(),
    ipAvaliador: metadata.ip,
    userAgent: metadata.userAgent
  };
  
  this.status = 'avaliado';
  this.tokenUsado = true;
  
  // Atualizar estatísticas do prestador
  const Prestador = mongoose.model('Prestador');
  const prestador = await Prestador.findById(this.prestadorId);
  
  if (prestador) {
    // Calcular nova média de estrelas
    const novaSomaEstrelas = (prestador.estrelas * prestador.avaliacoes) + estrelas;
    const novasAvaliacoes = prestador.avaliacoes + 1;
    
    prestador.estrelas = novaSomaEstrelas / novasAvaliacoes;
    prestador.avaliacoes = novasAvaliacoes;
    
    await prestador.save();
  }
  
  await this.save();
};

/**
 * Marcar como expirado (token não usado)
 */
servicoSchema.methods.marcarComoExpirado = async function() {
  this.status = 'expirado';
  await this.save();
};

// ========== MÉTODOS ESTÁTICOS ==========
/**
 * Buscar serviço por token válido
 * @param {string} token - Token de avaliação
 * @returns {Promise<Object>} Serviço encontrado
 */
servicoSchema.statics.findByToken = async function(token) {
  return this.findOne({
    avaliacaoToken: token,
    tokenUsado: false,
    tokenExpiracao: { $gt: new Date() },
    status: 'aguardando'
  }).populate('prestadorId', 'nome categoria cidade estado foto');
};

/**
 * Buscar serviços de um prestador
 * @param {string} prestadorId - ID do prestador
 * @param {Object} options - Opções de paginação/filtro
 */
servicoSchema.statics.findByPrestador = async function(prestadorId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  
  const query = { prestadorId };
  if (status) query.status = status;
  
  const [servicos, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),
    this.countDocuments(query)
  ]);
  
  return { servicos, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Buscar serviços de um cliente (por email)
 * @param {string} email - Email do cliente
 * @param {Object} options - Opções de paginação/filtro
 */
servicoSchema.statics.findByClienteEmail = async function(email, options = {}) {
  const { page = 1, limit = 20, status } = options;
  
  const query = { clienteEmail: email.toLowerCase() };
  if (status) query.status = status;
  
  const [servicos, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('prestadorId', 'nome categoria cidade estado foto'),
    this.countDocuments(query)
  ]);
  
  return { servicos, total, page, totalPages: Math.ceil(total / limit) };
};

// ========== MÉTODOS ADMIN ==========

/**
 * Obter últimas avaliações (para painel admin)
 * @param {number} limit - Quantidade máxima de resultados
 * @returns {Promise<Array>} Lista de avaliações recentes
 */
servicoSchema.statics.getUltimasAvaliacoes = async function(limit = 10) {
  const avaliacoes = await this.find({
    status: 'avaliado',
    'avaliacao.estrelas': { $exists: true }
  })
    .sort({ 'avaliacao.dataAvaliacao': -1 })
    .limit(limit)
    .populate('prestadorId', 'nome email cidade estado')
    .select('clienteNome avaliacao prestadorId titulo dataRealizacao');
  
  return avaliacoes.map(servico => ({
    id: servico._id,
    estrelas: servico.avaliacao.estrelas,
    comentario: servico.avaliacao.comentario || '',
    cliente: servico.clienteNome,
    profissional: servico.prestadorId?.nome || 'Profissional',
    profissionalId: servico.prestadorId?._id,
    profissionalEmail: servico.prestadorId?.email,
    tituloServico: servico.titulo,
    data: servico.avaliacao.dataAvaliacao,
    dataRealizacao: servico.dataRealizacao
  }));
};

/**
 * Obter estatísticas de avaliações (para admin)
 * @returns {Promise<Object>} Estatísticas consolidadas
 */
servicoSchema.statics.getEstatisticasAvaliacoes = async function() {
  const [total, media, distribuicao] = await Promise.all([
    this.countDocuments({ status: 'avaliado' }),
    this.aggregate([
      { $match: { status: 'avaliado', 'avaliacao.estrelas': { $exists: true } } },
      { $group: { _id: null, media: { $avg: '$avaliacao.estrelas' } } }
    ]),
    this.aggregate([
      { $match: { status: 'avaliado', 'avaliacao.estrelas': { $exists: true } } },
      { $group: { _id: '$avaliacao.estrelas', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  
  const distribuicaoMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribuicao.forEach(item => {
    if (item._id >= 1 && item._id <= 5) {
      distribuicaoMap[item._id] = item.count;
    }
  });
  
  return {
    total,
    media: media[0]?.media || 0,
    distribuicao: distribuicaoMap
  };
};

/**
 * Limpar tokens expirados (job diário)
 * @returns {Promise<Object>} Resultado da operação
 */
servicoSchema.statics.cleanExpiredTokens = async function() {
  const result = await this.updateMany(
    {
      tokenExpiracao: { $lt: new Date() },
      status: 'aguardando',
      tokenUsado: false
    },
    { status: 'expirado' }
  );
  
  console.log(`🧹 Limpeza de tokens: ${result.modifiedCount} serviços expirados`);
  return result;
};

/**
 * Excluir todos os serviços de um prestador (para exclusão de conta)
 * @param {string} prestadorId - ID do prestador
 * @returns {Promise<Object>} Resultado da operação
 */
servicoSchema.statics.excluirPorPrestador = async function(prestadorId) {
  const result = await this.deleteMany({ prestadorId });
  console.log(`🗑️ ${result.deletedCount} serviços excluídos para prestador ${prestadorId}`);
  return result;
};

const Servico = mongoose.model('Servico', servicoSchema);

export default Servico;

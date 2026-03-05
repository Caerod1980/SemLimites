import mongoose from 'mongoose';

/**
 * Modelo unificado de usuários do SemLimites
 * Suporta tanto clientes quanto prestadores
 */
const userSchema = new mongoose.Schema({
  // ========== DADOS BÁSICOS ==========
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'E-mail inválido']
  },
  
  // Tipo de usuário: cliente ou prestador
  tipo: { 
    type: String, 
    enum: {
      values: ['cliente', 'prestador'],
      message: 'Tipo deve ser cliente ou prestador'
    },
    required: true 
  },
  
  // Referência ao prestador (se for do tipo prestador)
  prestadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prestador',
    default: null
  },
  
  // ========== CONTROLE DE ACESSO ==========
  ultimoAcesso: {
    type: Date,
    default: null
  },
  
  // Histórico de tokens (para auditoria)
  tokensHistorico: [{
    token: String,
    criadoEm: { type: Date, default: Date.now },
    usadoEm: Date,
    expiraEm: Date
  }],
  
  // ========== METADADOS ==========
  ativo: {
    type: Boolean,
    default: true
  },
  
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
  // Configurações adicionais
  timestamps: true, // gerencia automaticamente createdAt e updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== VIRTUAIS ==========
// Campo virtual para buscar dados completos do prestador
userSchema.virtual('prestador', {
  ref: 'Prestador',
  localField: 'prestadorId',
  foreignField: '_id',
  justOne: true
});

// ========== ÍNDICES ==========
// Índice único para email (já criado pelo unique: true)
// Índice composto para buscas comuns
userSchema.index({ email: 1, tipo: 1 });
userSchema.index({ prestadorId: 1 }, { sparse: true });
userSchema.index({ ultimoAcesso: -1 });

// ========== MIDDLEWARES ==========
// Atualizar updatedAt antes de salvar
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ========== MÉTODOS DE INSTÂNCIA ==========
/**
 * Registrar um novo token para o usuário
 * @param {string} token - Token gerado
 * @param {number} expiresIn - Tempo de expiração em ms
 */
userSchema.methods.registrarToken = function(token, expiresIn = 3600000) {
  this.tokensHistorico.push({
    token,
    expiraEm: new Date(Date.now() + expiresIn)
  });
  return this.save();
};

/**
 * Marcar token como usado
 * @param {string} token - Token a ser marcado
 */
userSchema.methods.marcarTokenComoUsado = function(token) {
  const tokenEntry = this.tokensHistorico.find(t => t.token === token);
  if (tokenEntry) {
    tokenEntry.usadoEm = new Date();
  }
  return this.save();
};

/**
 * Verificar se o usuário é prestador
 */
userSchema.methods.isPrestador = function() {
  return this.tipo === 'prestador' && this.prestadorId;
};

/**
 * Verificar se o usuário é cliente
 */
userSchema.methods.isCliente = function() {
  return this.tipo === 'cliente';
};

// ========== MÉTODOS ESTÁTICOS ==========
/**
 * Buscar ou criar usuário por email e tipo
 * @param {string} email - Email do usuário
 * @param {string} tipo - Tipo (cliente/prestador)
 * @param {ObjectId} prestadorId - ID do prestador (se aplicável)
 */
userSchema.statics.findOrCreate = async function(email, tipo, prestadorId = null) {
  let user = await this.findOne({ email });
  
  if (!user) {
    user = await this.create({
      email,
      tipo,
      prestadorId
    });
  }
  
  return user;
};

/**
 * Buscar usuário com dados completos do prestador
 * @param {string} email - Email do usuário
 */
userSchema.statics.findWithPrestador = async function(email) {
  return this.findOne({ email }).populate('prestador');
};

// ========== VALIDAÇÕES PERSONALIZADAS ==========
// Validar se prestadorId é obrigatório para tipo prestador
userSchema.pre('validate', function(next) {
  if (this.tipo === 'prestador' && !this.prestadorId) {
    next(new Error('Prestador deve ter um prestadorId associado'));
  } else {
    next();
  }
});

// ========== EXPORTAÇÃO ==========
const User = mongoose.model('User', userSchema);

export default User;

// models/User.js - ATUALIZADO COM SUPORTE PAINEL ADMIN
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  senha: { 
    type: String, 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ['cliente', 'prestador', 'admin'],  // ADICIONADO: suporte a admin
    required: true 
  },
  nome: { 
    type: String,
    default: function() {
      // Se for admin e não tiver nome, usar padrão
      if (this.tipo === 'admin' && !this.nome) {
        return 'Administrador Sem Limites';
      }
      return '';
    }
  },
  prestadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prestador',
    default: null
  },
  
  // CAMPOS PARA RECUPERAÇÃO DE SENHA
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // CAMPOS PARA ADMIN (metadados)
  isVerified: { 
    type: Boolean, 
    default: function() {
      // Admin já é verificado por padrão
      return this.tipo === 'admin';
    }
  },
  lastLogin: Date,
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Middleware para atualizar updatedAt antes de salvar
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para verificar se o usuário é admin
userSchema.methods.isAdmin = function() {
  return this.tipo === 'admin';
};

// Método para verificar se o usuário é prestador
userSchema.methods.isPrestador = function() {
  return this.tipo === 'prestador';
};

// Método para verificar se o usuário é cliente
userSchema.methods.isCliente = function() {
  return this.tipo === 'cliente';
};

// Método para obter dados públicos (sem senha)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    tipo: this.tipo,
    nome: this.nome,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };
};

// Índices para otimização de buscas
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ tipo: 1 });  // NOVO: índice para filtrar por tipo

// Índice composto para buscas administrativas
userSchema.index({ tipo: 1, createdAt: -1 });

const User = mongoose.model('User', userSchema);

export default User;

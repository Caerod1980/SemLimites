// models/User.js - ATUALIZADO
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  senha: { 
    type: String, 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ['cliente', 'prestador'], 
    required: true 
  },
  prestadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prestador',
    default: null
  },
  
  // NOVOS CAMPOS PARA RECUPERAÇÃO DE SENHA
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.model('User', userSchema);

export default User;

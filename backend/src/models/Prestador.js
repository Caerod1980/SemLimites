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
  
  // ===== NOVOS CAMPOS PARA CPF =====
  tipoPessoa: { 
    type: String, 
    enum: ['fisica', 'juridica'], 
    default: 'juridica' // Para compatibilidade com dados existentes
  },
  cpf: { 
    type: String, 
    sparse: true, // Permite múltiplos null, não exige unicidade
    // unique removido para permitir múltiplos perfis com mesmo CPF
  },
  responsavel: { type: String }, // Para PJ - nome do responsável
  
  // CNPJ e verificação (agora opcional e sem unique)
  cnpj: { 
    type: String, 
    sparse: true,
    // unique: true removido para permitir múltiplos perfis com mesmo CNPJ
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
  
  // Dados profissionais
  categoria: { type: String, required: true },
  cidade: { type: String, required: true },
  regioes: [String],
  descricao: { type: String, required: true },
  sobre: String,
  tags: [String],
  
  // Campos já existentes
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

// Índices
prestadorSchema.index({ cidade: 1, categoria: 1 });
prestadorSchema.index({ estrelas: -1, avaliacoes: -1 });
prestadorSchema.index({ verificado: 1 });
prestadorSchema.index({ experiencia: -1 });
prestadorSchema.index({ especialidades: 1 });
prestadorSchema.index({ tipoPessoa: 1 }); // Novo índice
prestadorSchema.index({ cpf: 1 }); // Novo índice

// Middleware para criar slug
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

const Prestador = mongoose.model('Prestador', prestadorSchema);

export default Prestador;

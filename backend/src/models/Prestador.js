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
  
  // CNPJ e verificação
  cnpj: { type: String, unique: true, sparse: true },
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

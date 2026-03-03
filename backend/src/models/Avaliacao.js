import mongoose from 'mongoose';

const avaliacaoSchema = new mongoose.Schema({
  prestadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prestador', required: true },
  clienteId: { type: String },
  nome: { type: String, required: true },
  estrelas: { type: Number, min: 1, max: 5, required: true },
  texto: { type: String, required: true },
  servico: String,
  token: { type: String, unique: true },
  confirmado: { type: Boolean, default: false },
  dataServico: Date,
  gostaram: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

avaliacaoSchema.index({ prestadorId: 1, createdAt: -1 });
avaliacaoSchema.index({ token: 1 });

const Avaliacao = mongoose.model('Avaliacao', avaliacaoSchema);

export default Avaliacao;

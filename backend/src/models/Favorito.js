// models/Favorito.js
import mongoose from 'mongoose';

const favoritoSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  prestadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestador',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Garantir que um cliente não possa curtir o mesmo prestador duas vezes
favoritoSchema.index({ clienteId: 1, prestadorId: 1 }, { unique: true });

const Favorito = mongoose.model('Favorito', favoritoSchema);

export default Favorito;

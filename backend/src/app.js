import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import prestadoresRoutes from './routes/prestadores.js';
import authRoutes from './routes/auth.js';
import { PRESTADORES_MOCK } from './data/mockData.js';
import Prestador from './models/Prestador.js';

dotenv.config();

const app = express();

// Conectar ao MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rotas
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: 'connected'
  });
});

// Seed de dados (apenas desenvolvimento)
app.get('/api/seed', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Não permitido em produção' });
  }

  try {
    await Prestador.deleteMany({});
    await Prestador.insertMany(PRESTADORES_MOCK);
    res.json({ message: 'Dados mockados inseridos com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`📝 API disponível em http://localhost:${PORT}/api`);
});

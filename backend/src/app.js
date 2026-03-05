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

// Middlewares - CORRIGIDO para aceitar múltiplas origens
const allowedOrigins = [
  'https://caerod1980.github.io',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined/null

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Rotas
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/auth', authRoutes);

// Rota raiz - útil para teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API SemLimites funcionando!',
    endpoints: {
      health: '/health',
      seed: '/api/seed',
      prestadores: '/api/prestadores',
      auth: '/api/auth'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: 'connected',
    environment: process.env.NODE_ENV || 'development'
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
    res.json({ 
      message: '✅ Dados mockados inseridos com sucesso',
      total: PRESTADORES_MOCK.length
    });
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`📝 API disponível em http://localhost:${PORT}/api`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔓 CORS permitido para:`, allowedOrigins);
});

export default app;

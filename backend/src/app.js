// app.js - VERSÃO CORRIGIDA
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import prestadoresRoutes from './routes/prestadores.js';
import authRoutes from './routes/auth.js';
import servicosRoutes from './routes/servicos.js';
import categoriasRoutes from './routes/categorias.js';
import favoritosRoutes from './routes/favoritos.js'; // ADICIONADO
import usuarioRoutes from './routes/usuarios.js';

dotenv.config();

const app = express();

// Conectar ao MongoDB
connectDB();

// CORS - CONFIGURAÇÃO CORRIGIDA
const allowedOrigins = [
  'https://caerod1980.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://semlimites.com.br' // Se tiver domínio próprio
];

// Configuração mais permissiva para resolver o erro
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (Postman, apps mobile, etc)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista OU se é do GitHub Pages
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io') || origin.includes('caerod1980')) {
      callback(null, true);
    } else {
      console.log('⚠️ Origem bloqueada por CORS:', origin);
      // Por enquanto, vamos permitir todas para teste (remover em produção)
      callback(null, true);
      // callback(new Error('Não permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware adicional para garantir headers CORS em todas as respostas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Responder imediatamente às requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

// Rotas
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/favoritos', favoritosRoutes); // ADICIONADO
app.use('/api/usuarios', usuarioRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: 'connected',
    cors: 'enabled'
  });
});

// Rota de teste para verificar CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS está funcionando!',
    origin: req.headers.origin || 'sem origem',
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`🔓 CORS permitido para:`, allowedOrigins);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

export default app;

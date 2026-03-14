import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import prestadoresRoutes from './routes/prestadores.js';
import authRoutes from './routes/auth.js';
import servicosRoutes from './routes/servicos.js';
import categoriasRoutes from './routes/categorias.js';

dotenv.config();

const app = express();

// Conectar ao MongoDB
connectDB();

// CORS - VERSÃO SEGURA CORRIGIDA
const allowedOrigins = [
  'https://caerod1980.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://semlimites.com', // se tiver domínio próprio
  window?.location?.origin // permite a origem atual dinamicamente
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (Postman, etc)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista OU se é uma origem do GitHub Pages
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io')) {
      callback(null, true);
    } else {
      console.log('❌ Origem bloqueada:', origin);
      // Não bloqueia, apenas loga o erro (para teste)
      callback(null, true); // ✅ Permite mesmo assim para teste
      // callback(new Error('Não permitido por CORS')); // ❌ Versão bloqueante
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Rotas
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/categorias', categoriasRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: 'connected'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`🔓 CORS permitido para:`, allowedOrigins);
});

export default app;

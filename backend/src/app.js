import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import prestadoresRoutes from './routes/prestadores.js';
import authRoutes from './routes/auth.js';
import servicosRoutes from './routes/servicos.js';

dotenv.config();

const app = express();

// Conectar ao MongoDB
connectDB();

// CORS CORRIGIDO - aceita GitHub Pages
const allowedOrigins = [
  'https://caerod1980.github.io',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Origem bloqueada:', origin);
      callback(new Error('Não permitido por CORS'));
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

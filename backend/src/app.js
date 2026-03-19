// app.js - VERSÃO CORRIGIDA
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import prestadoresRoutes from './routes/prestadores.js';
import authRoutes from './routes/auth.js';
import servicosRoutes from './routes/servicos.js';
import categoriasRoutes from './routes/categorias.js';
import favoritosRoutes from './routes/favoritos.js';
import usuarioRoutes from './routes/usuarios.js';
import uploadRoutes from './routes/upload.js';
import empresaRoutes from './routes/empresa.js';

// ===== NOVAS IMPORTAÇÕES PARA AS ASSINATURAS =====
import assinaturaRoutes from './routes/assinatura.js';
// REMOVA esta linha - webhooksRoutes não existe
// import webhooksRoutes from './routes/webhooks.js';
import { verificarAssinatura } from './middlewares/assinatura.js';

dotenv.config();

const app = express();

// Conectar ao MongoDB (não bloqueante)
connectDB().catch(err => console.error('Erro no MongoDB:', err));

// ===== CONFIGURAÇÃO CORS - DEVE SER O PRIMEIRO MIDDLEWARE =====
const allowedOrigins = [
  'https://caerod1980.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://semlimites.com.br'
];

// Configuração CORS permissiva para desenvolvimento
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io') || origin.includes('caerod1980')) {
      callback(null, true);
    } else {
      console.log('⚠️ Origem bloqueada por CORS:', origin);
      callback(null, true); // Permitindo para teste
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware adicional para headers CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-ms-blob-type');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  
  if (req.method === 'OPTIONS') {
    console.log('📡 Respondendo OPTIONS com CORS headers');
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'sem origem'}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== ORDEM CORRETA DAS ROTAS =====
// 1. Primeiro, rotas públicas (NÃO aplicam verificação de assinatura)
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/empresa', empresaRoutes);

// 2. Rotas de assinatura (algumas públicas, outras privadas)
// As rotas públicas dentro de assinaturaRoutes virão primeiro
app.use('/api/assinatura', assinaturaRoutes);

// 3. Rota pública para chave do Mercado Pago (pode estar dentro de assinaturaRoutes)

// 4. Middleware de verificação de assinatura (APÓS rotas públicas)
app.use(verificarAssinatura);

// 5. Rotas protegidas que exigem assinatura
app.use('/api/prestadores', prestadoresRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/upload', uploadRoutes);

// Health check (público)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: 'connected',
    cors: 'enabled',
    upload: 'enabled',
    assinaturas: 'enabled',
    ambiente: process.env.NODE_ENV || 'development'
  });
});

// Rota de teste CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS está funcionando!',
    origin: req.headers.origin || 'sem origem',
    timestamp: new Date()
  });
});

// Rota de teste storage
app.get('/test-storage-config', (req, res) => {
  const hasConnectionString = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
  res.json({
    storage_configured: hasConnectionString,
    message: hasConnectionString ? 'Storage configurado' : 'Storage NÃO configurado'
  });
});

// Rota de teste Mercado Pago
app.get('/test-mercado-pago-config', (req, res) => {
  const hasAccessToken = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const hasPublicKey = !!process.env.MERCADO_PAGO_PUBLIC_KEY;
  
  res.json({
    access_token_configured: hasAccessToken,
    public_key_configured: hasPublicKey,
    environment: process.env.NODE_ENV || 'development',
    message: hasAccessToken && hasPublicKey ? 'Mercado Pago configurado' : 'Mercado Pago NÃO configurado completamente'
  });
});

// Rota de teste assinatura (pública para teste)
app.get('/test-assinatura-status/:prestadorId', async (req, res) => {
  try {
    const Prestador = (await import('./models/Prestador.js')).default;
    const prestador = await Prestador.findById(req.params.prestadorId);
    
    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }
    
    res.json({
      prestadorId: prestador._id,
      nome: prestador.nome,
      planoAtivo: prestador.planoAtivo,
      planoStatus: prestador.planoStatus,
      planoExpiracao: prestador.planoExpiracao,
      planoId: prestador.planoId,
      historico: prestador.planoHistorico?.slice(-5)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Mercado Pago (deve ser público e estar dentro de assinaturaRoutes)
// Se precisar de um webhook separado, crie o arquivo ou use a rota dentro de assinaturaRoutes

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro global:', err);
  res.status(500).json({ 
    error: 'Erro interno no servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`🔓 CORS permitido para:`, allowedOrigins);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📸 Upload configurado: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅' : '❌'}`);
  console.log(`💳 Mercado Pago Access Token: ${process.env.MERCADO_PAGO_ACCESS_TOKEN ? '✅' : '❌'}`);
  console.log(`🔐 Mercado Pago Public Key: ${process.env.MERCADO_PAGO_PUBLIC_KEY ? '✅' : '❌'}`);
  console.log(`🏷️ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Mostrar rotas de assinatura disponíveis
  console.log(`📋 Rotas de assinatura:`);
  console.log(`   - POST /api/assinatura/criar-preferencia (pública)`);
  console.log(`   - POST /api/assinatura/associar (privada)`);
  console.log(`   - GET /api/assinatura/status-prestador/:prestadorId (privada)`);
  console.log(`   - GET /api/mercadopago/public-key (pública)`);
  console.log(`   - POST /api/assinatura/webhooks/mercadopago (pública)`);
});

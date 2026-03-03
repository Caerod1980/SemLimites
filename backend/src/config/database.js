import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    
    // Criar índices para busca
    await conn.connection.collection('prestadores').createIndex({
      nome: 'text',
      descricao: 'text',
      tags: 'text'
    });
    
    console.log('✅ Índices de texto criados');
    
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;

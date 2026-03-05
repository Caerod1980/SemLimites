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
    console.log(`📦 Banco de dados: ${conn.connection.name}`);
    
    // Verificar se a collection 'prestadores' existe
    const collections = await conn.connection.db.listCollections({ name: 'prestadores' }).toArray();
    
    if (collections.length > 0) {
      // Criar índices de texto para busca (com tratamento de erro se já existir)
      try {
        await conn.connection.collection('prestadores').createIndex({
          nome: 'text',
          descricao: 'text',
          tags: 'text',
          categoria: 'text'
        }, {
          name: 'text_search_index',
          default_language: 'portuguese',
          weights: {
            nome: 10,
            categoria: 5,
            tags: 3,
            descricao: 1
          }
        });
        
        console.log('✅ Índices de texto criados/atualizados com sucesso');
        console.log('📊 Pesos dos campos: nome(10), categoria(5), tags(3), descricao(1)');
        
      } catch (indexError) {
        // Se o índice já existir, apenas logar e continuar
        if (indexError.code === 85) { // Código 85 = IndexAlreadyExists
          console.log('ℹ️ Índices de texto já existem');
        } else {
          console.error('⚠️ Erro ao criar índices:', indexError.message);
        }
      }
      
      // Criar índices adicionais para melhor performance
      try {
        await conn.connection.collection('prestadores').createIndex({ cidade: 1 });
        await conn.connection.collection('prestadores').createIndex({ categoria: 1 });
        await conn.connection.collection('prestadores').createIndex({ estrelas: -1, avaliacoes: -1 });
        await conn.connection.collection('prestadores').createIndex({ verificado: 1 });
        await conn.connection.collection('prestadores').createIndex({ destaque: 1 });
        
        console.log('✅ Índices de performance criados');
        console.log('   - cidade, categoria, estrelas, verificado, destaque');
        
      } catch (indexError) {
        console.log('ℹ️ Índices de performance podem já existir');
      }
      
    } else {
      console.log('ℹ️ Collection "prestadores" ainda não existe (será criada no primeiro cadastro)');
    }
    
    // Event listeners para monitorar a conexão
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro na conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconectado');
    });
    
    return conn;
    
  } catch (error) {
    console.error('❌ Erro fatal ao conectar MongoDB:', error.message);
    console.log('🔧 Verifique se:');
    console.log('   1. A string MONGODB_URI está correta');
    console.log('   2. O IP do Azure está liberado no MongoDB Atlas');
    console.log('   3. O usuário/senha estão corretos');
    
    // Em produção, não derrubar o app, apenas logar erro
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Continuando sem MongoDB (modo degradado)');
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;

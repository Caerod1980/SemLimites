// src/scripts/corrigirUsuario.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Configurar dotenv para carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function conectarBanco() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    process.exit(1);
  }
}

async function corrigirUsuario(email) {
  console.log(`\n🔧 Corrigindo usuário: ${email}`);
  console.log('=====================================');
  
  const user = await User.findOne({ email });
  if (!user) {
    console.log('❌ Usuário não encontrado');
    return false;
  }
  
  console.log('📋 Estrutura atual:');
  console.log('   ID:', user._id.toString());
  console.log('   Tipo:', user.tipo);
  console.log('   prestadorId:', user.prestadorId);
  console.log('   Tipo do prestadorId:', typeof user.prestadorId);
  
  let modificado = false;
  
  // Caso 1: Usuário sem prestadorId
  if (!user.prestadorId) {
    console.log('⚠️ Usuário sem prestadorId');
    
    // Tentar encontrar prestador pelo email
    const prestador = await Prestador.findOne({ email: user.email });
    
    if (prestador) {
      user.prestadorId = prestador._id;
      modificado = true;
      console.log('✅ Vinculado ao prestador existente:', prestador._id.toString());
    } else {
      console.log('❌ Nenhum prestador encontrado para vincular');
    }
  }
  
  // Caso 2: prestadorId é string
  else if (typeof user.prestadorId === 'string') {
    console.log('⚠️ prestadorId é string, convertendo...');
    
    try {
      // Verificar se o prestador existe com esse ID
      const prestador = await Prestador.findById(user.prestadorId);
      
      if (prestador) {
        user.prestadorId = prestador._id;
        modificado = true;
        console.log('✅ Convertido para ObjectId com sucesso');
      } else {
        console.log('❌ Prestador não encontrado com esse ID');
        
        // Tentar encontrar por email
        const prestadorPorEmail = await Prestador.findOne({ email: user.email });
        if (prestadorPorEmail) {
          user.prestadorId = prestadorPorEmail._id;
          modificado = true;
          console.log('✅ Vinculado ao prestador encontrado por email');
        }
      }
    } catch (err) {
      console.log('❌ Erro na conversão:', err.message);
    }
  }
  
  // Caso 3: prestadorId é ObjectId mas referência não existe
  else if (user.prestadorId) {
    const prestador = await Prestador.findById(user.prestadorId);
    
    if (!prestador) {
      console.log('⚠️ Referência quebrada - prestador não existe');
      
      // Tentar encontrar por email
      const prestadorPorEmail = await Prestador.findOne({ email: user.email });
      
      if (prestadorPorEmail) {
        user.prestadorId = prestadorPorEmail._id;
        modificado = true;
        console.log('✅ Referência corrigida');
      } else {
        console.log('❌ Não foi possível encontrar prestador alternativo');
      }
    } else {
      console.log('✅ Referência OK');
    }
  }
  
  // Salvar alterações se houver modificação
  if (modificado) {
    await user.save();
    console.log('💾 Usuário atualizado com sucesso!');
  } else {
    console.log('📌 Nenhuma modificação necessária');
  }
  
  return true;
}

// Função principal
async function main() {
  // Conectar ao banco
  await conectarBanco();
  
  // Pegar email dos argumentos da linha de comando
  const emails = process.argv.slice(2);
  
  if (emails.length === 0) {
    console.log('\n📝 Uso: node src/scripts/corrigirUsuario.js email1@teste.com email2@teste.com');
    console.log('   Ou para vários: node src/scripts/corrigirUsuario.js email1@teste.com email2@teste.com\n');
    process.exit(1);
  }
  
  console.log(`\n🔍 Corrigindo ${emails.length} usuário(s)...\n`);
  
  for (const email of emails) {
    await corrigirUsuario(email);
  }
  
  console.log('\n🏁 Processo concluído!');
  await mongoose.disconnect();
  console.log('👋 Desconectado do MongoDB');
}

// Executar
main();

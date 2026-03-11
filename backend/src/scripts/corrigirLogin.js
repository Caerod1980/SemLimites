// src/scripts/corrigirLogin.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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

async function corrigirLogin(email, novaSenha = '123456') {
  console.log(`\n🔧 Corrigindo login para: ${email}`);
  
  const user = await User.findOne({ email });
  
  if (!user) {
    console.log('❌ Usuário não encontrado');
    
    // Tentar encontrar prestador com este email
    const prestador = await Prestador.findOne({ email });
    
    if (prestador) {
      console.log('📌 Prestador encontrado, mas sem usuário vinculado');
      
      // Criar usuário para este prestador
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(novaSenha, salt);
      
      const novoUser = new User({
        email: prestador.email,
        senha: hash,
        tipo: 'prestador',
        prestadorId: prestador._id,
        nome: prestador.nome
      });
      
      await novoUser.save();
      console.log(`✅ Usuário criado com senha: ${novaSenha}`);
    }
    return;
  }
  
  console.log('📋 Usuário encontrado:');
  console.log('   ID:', user._id);
  console.log('   Tipo:', user.tipo);
  console.log('   Tem senha:', !!user.senha);
  
  // Resetar senha
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(novaSenha, salt);
  
  user.senha = hash;
  await user.save();
  
  console.log(`✅ Senha resetada para: ${novaSenha}`);
  
  // Verificar se tem prestador vinculado
  if (!user.prestadorId) {
    console.log('⚠️ Usuário sem prestadorId');
    
    const prestador = await Prestador.findOne({ email: user.email });
    
    if (prestador) {
      user.prestadorId = prestador._id;
      await user.save();
      console.log('✅ Vinculado ao prestador');
    }
  }
}

async function listarUsuarios() {
  const users = await User.find({}, 'email tipo prestadorId').limit(10);
  console.log('\n📋 Primeiros 10 usuários:');
  users.forEach(u => {
    console.log(`   ${u.email} - ${u.tipo} - prestadorId: ${u.prestadorId ? 'OK' : 'NÃO'}`);
  });
}

async function main() {
  await conectarBanco();
  
  const comando = process.argv[2];
  
  if (comando === 'listar') {
    await listarUsuarios();
  } else if (comando === 'corrigir') {
    const email = process.argv[3];
    const senha = process.argv[4] || '123456';
    
    if (!email) {
      console.log('Uso: npm run corrigir-login corrigir email@teste.com [nova-senha]');
      process.exit(1);
    }
    
    await corrigirLogin(email, senha);
  } else {
    console.log(`
Comandos disponíveis:
  npm run corrigir-login listar
  npm run corrigir-login corrigir email@teste.com [nova-senha]
    `);
  }
  
  await mongoose.disconnect();
  console.log('👋 Desconectado');
}

main();

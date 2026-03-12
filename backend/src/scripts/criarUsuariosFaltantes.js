// src/scripts/criarUsuariosFaltantes.js
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
    console.log('✅ Conectado ao MongoDB\n');
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    process.exit(1);
  }
}

async function criarUsuarioFaltante(email, senha = '123456') {
  console.log(`\n🔧 Processando: ${email}`);
  console.log('='.repeat(50));

  // Verificar se já existe em users
  const userExistente = await User.findOne({ email });
  if (userExistente) {
    console.log(`   ⚠️ Usuário já existe em users: ${userExistente._id}`);
    return false;
  }

  // Buscar o prestador
  const prestador = await Prestador.findOne({ email });
  if (!prestador) {
    console.log(`   ❌ Prestador não encontrado em prestadors`);
    return false;
  }

  console.log(`   ✅ Prestador encontrado:`);
  console.log(`      ID: ${prestador._id}`);
  console.log(`      Nome: ${prestador.nome}`);
  console.log(`      Categoria: ${prestador.categoria || 'N/A'}`);

  // Criar o usuário
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    const novoUser = new User({
      email: prestador.email,
      senha: hash,
      tipo: 'prestador',
      prestadorId: prestador._id,
      nome: prestador.nome,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await novoUser.save();
    
    console.log(`   ✅ USUÁRIO CRIADO COM SUCESSO!`);
    console.log(`      ID: ${novoUser._id}`);
    console.log(`      Email: ${email}`);
    console.log(`      Senha: ${senha}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Erro ao criar usuário:`, error.message);
    return false;
  }
}

async function corrigirSenhaUsuario(email, novaSenha = '123456') {
  console.log(`\n🔧 Corrigindo senha: ${email}`);
  console.log('='.repeat(50));

  const user = await User.findOne({ email });
  if (!user) {
    console.log(`   ❌ Usuário não encontrado em users`);
    return false;
  }

  console.log(`   ✅ Usuário encontrado: ${user._id}`);
  console.log(`   Status atual da senha: ${user.senha ? 'Existe' : '❌ VAZIA'}`);

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(novaSenha, salt);
    
    user.senha = hash;
    await user.save();
    
    console.log(`   ✅ SENHA RESETADA COM SUCESSO!`);
    console.log(`      Nova senha: ${novaSenha}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Erro ao resetar senha:`, error.message);
    return false;
  }
}

async function main() {
  await conectarBanco();

  console.log('🎯 CORREÇÃO DE USUÁRIOS NO MONGODB');
  console.log('=====================================\n');

  // Usuários que existem em prestadors mas não em users
  const emailsFaltantes = [
    'dgclube@hotmail.com',
    'rodrigobebcom@gmail.com'
  ];

  // Usuário com senha corrompida
  const emailCorrompido = 'caerod@gmail.com';

  console.log('📌 CRIANDO USUÁRIOS FALTANTES:');
  for (const email of emailsFaltantes) {
    await criarUsuarioFaltante(email);
  }

  console.log('\n📌 CORRIGINDO SENHA CORROMPIDA:');
  await corrigirSenhaUsuario(emailCorrompido);

  console.log('\n🏁 PROCESSO CONCLUÍDO!');
  console.log('\n📝 DADOS PARA LOGIN:');
  console.log('   dgclube@hotmail.com → Senha: 123456');
  console.log('   rodrigobebcom@gmail.com → Senha: 123456');
  console.log('   caerod@gmail.com → Senha: 123456');

  await mongoose.disconnect();
  console.log('\n👊 Desconectado do MongoDB');
}

main();

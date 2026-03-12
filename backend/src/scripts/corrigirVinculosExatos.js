// scripts/corrigirVinculosExatos.js
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

const SENHA_PADRAO = '123456';

async function conectarBanco() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    return false;
  }
}

async function corrigir() {
  console.log('🎯 CORREÇÃO CIRÚRGICA BASEADA NOS DADOS REAIS');
  console.log('===============================================\n');

  let alteracoes = {
    removidos: 0,
    criados: 0
  };

  // ===== CASO 1: Usuário com prestadorId inválido =====
  console.log('📌 CASO 1: Corrigindo usuário caerod@gmail.com');
  const userCaerod = await User.findOne({ email: 'caerod@gmail.com' });
  if (userCaerod) {
    console.log(`   👤 User encontrado: ${userCaerod._id}`);
    console.log(`   🔗 prestadorId atual: ${userCaerod.prestadorId}`);
    
    // Verificar se o prestadorId realmente não existe
    if (userCaerod.prestadorId) {
      const prestadorExiste = await Prestador.findById(userCaerod.prestadorId);
      if (!prestadorExiste) {
        userCaerod.prestadorId = null;
        await userCaerod.save();
        console.log(`   ✅ prestadorId removido (era inválido)`);
        alteracoes.removidos++;
      } else {
        console.log(`   ✅ prestadorId é válido`);
      }
    }
  }

  // ===== CASO 2: Criar usuários para prestadores sem user =====
  console.log('\n📌 CASO 2: Criando usuários para prestadores sem user');
  
  // Lista de prestadores que precisam de user
  const prestadoresSemUser = [
    { email: 'rodrigobebcom@gmail.com', nome: 'SILVIA A V CAETANO' },
    { email: 'dgclube@hotmail.com', nome: 'Dani' }
  ];

  for (const p of prestadoresSemUser) {
    console.log(`\n   🔧 Processando: ${p.email}`);
    
    const prestador = await Prestador.findOne({ email: p.email });
    if (!prestador) {
      console.log(`   ❌ Prestador não encontrado`);
      continue;
    }

    // Verificar se já não existe user
    const userExistente = await User.findOne({ email: p.email });
    if (userExistente) {
      console.log(`   ⚠️ Usuário já existe, pulando`);
      continue;
    }

    console.log(`      ID Prestador: ${prestador._id}`);
    console.log(`      Nome: ${prestador.nome}`);

    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(SENHA_PADRAO, salt);

      const novoUser = new User({
        email: p.email,
        senha: hash,
        tipo: 'prestador',
        prestadorId: prestador._id,
        nome: prestador.nome,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await novoUser.save();
      console.log(`   ✅ Usuário criado com ID: ${novoUser._id}`);
      alteracoes.criados++;
    } catch (error) {
      console.error(`   ❌ Erro ao criar usuário:`, error.message);
    }
  }

  // ===== RESUMO =====
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DAS ALTERAÇÕES:');
  console.log(`   ✅ Vínculos inválidos removidos: ${alteracoes.removidos}`);
  console.log(`   ✅ Novos usuários criados: ${alteracoes.criados}`);
  console.log('\n🔑 SENHA PARA OS NOVOS USUÁRIOS: 123456');
  console.log('\n📝 INSTRUÇÕES PÓS-CORREÇÃO:');
  console.log('   1. Faça login com:');
  console.log('      - rodrigobebcom@gmail.com (senha: 123456)');
  console.log('      - dgclube@hotmail.com (senha: 123456)');
  console.log('   2. Use o botão de exclusão no dashboard');
  console.log('   3. Confirme a exclusão permanente');
}

async function main() {
  console.log('🚀 INICIANDO CORREÇÃO CIRÚRGICA');
  console.log('================================\n');
  
  if (!await conectarBanco()) {
    process.exit(1);
  }
  
  await corrigir();
  
  await mongoose.disconnect();
  console.log('\n👋 Desconectado do MongoDB');
}

main();

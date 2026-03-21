// scripts/resetAdminPassword.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';
import User from '../src/models/User.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

async function resetAdminPassword() {
  console.log('\n🔐 ===== RESET DE SENHA ADMIN =====\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    // Buscar admin
    const admin = await User.findOne({ tipo: 'admin' });
    
    if (!admin) {
      console.log('⚠️  Nenhum usuário administrador encontrado.');
      console.log('💡 Execute primeiro: npm run create-admin\n');
      process.exit(0);
    }
    
    console.log('📧 E-mail do admin:', admin.email);
    console.log('👤 Nome:', admin.nome);
    console.log('🆔 ID:', admin._id);
    console.log('\n⚠️  ATENÇÃO: Você está prestes a resetar a senha do administrador!\n');
    
    const confirm = await question('✅ Tem certeza? (digite "SIM" para continuar): ');
    
    if (confirm !== 'SIM') {
      console.log('❌ Operação cancelada.');
      process.exit(0);
    }
    
    console.log('\n🔑 Digite a nova senha (mínimo 8 caracteres):');
    const novaSenha = await question('🔒 Nova senha: ');
    
    if (novaSenha.length < 8) {
      console.error('❌ A senha deve ter pelo menos 8 caracteres.');
      process.exit(1);
    }
    
    const confirmarSenha = await question('✅ Confirmar senha: ');
    
    if (novaSenha !== confirmarSenha) {
      console.error('❌ As senhas não coincidem.');
      process.exit(1);
    }
    
    rl.close();
    
    console.log('\n🔄 Atualizando senha...\n');
    
    const hashedPassword = await bcrypt.hash(novaSenha, 12);
    admin.senha = hashedPassword;
    admin.updatedAt = new Date();
    await admin.save();
    
    console.log('✅ Senha alterada com sucesso!\n');
    console.log('📧 E-mail:', admin.email);
    console.log('🔑 Nova senha definida (não exibida por segurança)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro ao resetar senha:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();

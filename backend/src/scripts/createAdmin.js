// scripts/createAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';
import User from '../src/models/User.js';

// Carregar variáveis de ambiente
dotenv.config();

// Função para input seguro no terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

async function createAdmin() {
  console.log('\n🔐 ===== CRIAÇÃO DE USUÁRIO ADMIN =====\n');
  
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Verificar se já existe admin
    const adminExists = await User.findOne({ tipo: 'admin' });
    
    if (adminExists) {
      console.log('⚠️  Já existe um usuário administrador no sistema!\n');
      console.log('📧 E-mail:', adminExists.email);
      console.log('🆔 ID:', adminExists._id);
      console.log('📅 Criado em:', adminExists.createdAt);
      console.log('\n💡 Se você perdeu a senha, use o sistema de recuperação de senha.');
      console.log('💡 Ou execute o script de reset de senha admin.\n');
      process.exit(0);
    }

    // Coletar dados do admin com segurança
    console.log('📝 Informe os dados do administrador:\n');
    
    const email = await question('📧 E-mail do admin: ');
    
    // Validar email
    if (!email || !email.includes('@')) {
      console.error('❌ E-mail inválido. Digite um e-mail válido.');
      process.exit(1);
    }
    
    const nome = await question('👤 Nome completo: ') || 'Administrador Sem Limites';
    
    // Coletar senha de forma segura (não mostra no terminal)
    console.log('\n🔑 Defina uma senha forte (mínimo 8 caracteres):');
    const senha = await question('🔒 Senha: ');
    
    if (senha.length < 8) {
      console.error('❌ A senha deve ter pelo menos 8 caracteres.');
      process.exit(1);
    }
    
    const confirmarSenha = await question('✅ Confirmar senha: ');
    
    if (senha !== confirmarSenha) {
      console.error('❌ As senhas não coincidem.');
      process.exit(1);
    }
    
    rl.close();
    
    console.log('\n🔄 Criando usuário administrador...\n');
    
    // Gerar hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);
    
    // Criar admin
    const admin = new User({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senha: hashedPassword,
      tipo: 'admin',
      isVerified: true,
      createdAt: new Date()
    });
    
    await admin.save();
    
    console.log('✅ ===== ADMIN CRIADO COM SUCESSO! =====\n');
    console.log('📧 E-mail:', admin.email);
    console.log('👤 Nome:', admin.nome);
    console.log('🆔 ID:', admin._id);
    console.log('📅 Criado em:', admin.createdAt);
    console.log('\n⚠️  IMPORTANTE: Guarde essas credenciais em local seguro!');
    console.log('⚠️  Use o sistema de recuperação de senha se esquecer.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro ao criar administrador:', error.message);
    process.exit(1);
  }
}

createAdmin();

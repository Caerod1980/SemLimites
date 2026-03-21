// scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const adminExists = await User.findOne({ tipo: 'admin' });
        
        if (adminExists) {
            console.log('✅ Admin já existe:', adminExists.email);
            process.exit(0);
        }
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const admin = new User({
            nome: 'Administrador Sem Limites',
            email: 'SemLimitesAdmin',
            senha: hashedPassword,
            tipo: 'admin',
            verificado: true
        });
        
        await admin.save();
        
        console.log('✅ Admin criado com sucesso!');
        console.log('E-mail: SemLimitesAdmin');
        console.log('Senha: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar admin:', error);
        process.exit(1);
    }
}

createAdmin();

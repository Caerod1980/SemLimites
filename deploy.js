const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function deploy() {
  console.log('🚀 Iniciando deploy do SemLimites...\n');

  try {
    // 1. Build do frontend
    console.log('📦 Buildando frontend...');
    execSync('cd frontend && npm run build', { 
      stdio: 'inherit' 
    });
    console.log('✅ Frontend buildado com sucesso!\n');

    // 2. Limpar arquivos antigos da raiz (exceto pastas importantes)
    console.log('🧹 Limpando arquivos antigos da raiz...');
    const arquivosManter = [
      'backend',      // Pasta do backend
      '.git',         // Pasta do git
      '.gitignore',   // Arquivo gitignore
      'README.md',    // README
      'deploy.js',    // Script de deploy
      'package.json', // Package.json da raiz
      'node_modules'  // Dependências
    ];

    const arquivosRaiz = fs.readdirSync('./');
    
    for (const arquivo of arquivosRaiz) {
      if (!arquivosManter.includes(arquivo) && arquivo !== 'node_modules') {
        fs.removeSync(`./${arquivo}`);
        console.log(`   Removido: ${arquivo}`);
      }
    }
    console.log('✅ Limpeza concluída!\n');

    // 3. Copiar build para a raiz
    console.log('📋 Copiando arquivos do build para a raiz...');
    fs.copySync('./frontend/build', './', { 
      overwrite: true,
      dereference: true 
    });
    console.log('✅ Arquivos copiados com sucesso!\n');

    // 4. Verificar resultado
    console.log('📁 Arquivos na raiz após deploy:');
    const arquivos = fs.readdirSync('./');
    arquivos.forEach(arq => {
      if (!arquivosManter.includes(arq) && arq !== 'node_modules') {
        console.log(`   - ${arq}`);
      }
    });

    console.log('\n🎉 Deploy concluído com sucesso!');
    console.log('📝 Agora faça commit e push para o GitHub:');
    console.log('   git add .');
    console.log('   git commit -m "Deploy versão X"');
    console.log('   git push origin main');

  } catch (error) {
    console.error('❌ Erro no deploy:', error);
    process.exit(1);
  }
}

deploy();

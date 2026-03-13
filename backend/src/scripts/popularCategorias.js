// scripts/popularCategorias.js
import mongoose from 'mongoose';
import Categoria from '../models/Categoria.js';
import dotenv from 'dotenv';

dotenv.config();

// Função para gerar slug de forma confiável
function gerarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Categorias principais (nível 1)
const categoriasPrincipais = [
  { nome: "Construção e reformas", ordem: 1 },
  { nome: "Manutenção e reparos", ordem: 2 },
  { nome: "Limpeza", ordem: 3 },
  { nome: "Serviços domésticos", ordem: 4 },
  { nome: "Beleza e estética", ordem: 5 },
  { nome: "Saúde e bem-estar", ordem: 6 },
  { nome: "Educação", ordem: 7 },
  { nome: "Tecnologia", ordem: 8 },
  { nome: "Marketing e design", ordem: 9 },
  { nome: "Eventos", ordem: 10 },
  { nome: "Transporte", ordem: 11 },
  { nome: "Automotivo", ordem: 12 },
  { nome: "Pets", ordem: 13 },
  { nome: "Serviços profissionais", ordem: 14 },
  { nome: "Jardinagem", ordem: 15 }
];

// Serviços por categoria (nível 2)
const servicosPorCategoria = {
  "Construção e reformas": [
    "Pedreiro", "Servente de obras", "Mestre de obras", "Carpinteiro", "Marceneiro",
    "Armador", "Eletricista residencial", "Eletricista predial", "Encanador",
    "Bombeiro hidráulico", "Instalador de chuveiro", "Instalador de ventilador",
    "Instalador de ar-condicionado", "Gesseiro", "Instalador de drywall", "Azulejista",
    "Colocador de piso cerâmico", "Colocador de porcelanato", "Instalador de piso vinílico",
    "Instalador de laminado", "Vidraceiro", "Serralheiro", "Soldador", "Pintor residencial",
    "Pintor predial", "Impermeabilizador", "Telhadista", "Instalador de calhas",
    "Instalador de rufos", "Instalador de portão", "Instalador de portas",
    "Instalador de janelas", "Instalador de box", "Instalador de corrimão",
    "Instalador de escadas metálicas"
  ],
  "Manutenção e reparos": [
    "Técnico de geladeira", "Técnico de freezer", "Técnico de máquina de lavar",
    "Técnico de secadora", "Técnico de lava-louças", "Técnico de micro-ondas",
    "Técnico de forno elétrico", "Técnico de televisão", "Técnico de home theater",
    "Técnico de ar-condicionado", "Técnico de eletrônicos", "Técnico de celular",
    "Técnico de tablet", "Técnico de computador", "Técnico de notebook",
    "Técnico de impressora", "Técnico de roteador", "Técnico de modem",
    "Técnico de internet residencial", "Montador de móveis", "Desmontador de móveis",
    "Consertador de portas", "Consertador de janelas", "Consertador de fechaduras",
    "Chaveiro residencial"
  ],
  "Limpeza": [
    "Limpeza residencial", "Limpeza comercial", "Limpeza pós-obra",
    "Limpeza de condomínio", "Limpeza pesada", "Limpeza de fachadas",
    "Limpeza de vidros", "Limpeza de piscina", "Limpeza de caixa d’água",
    "Limpeza de calhas", "Limpeza de sofá", "Limpeza de colchão",
    "Limpeza de tapetes", "Limpeza de carpetes", "Limpeza de estofados",
    "Limpeza de veículos", "Lavagem ecológica", "Lavagem de garagem",
    "Lavagem de telhado", "Higienização residencial"
  ],
  "Serviços domésticos": [
    "Diarista", "Empregada doméstica", "Passadeira", "Lavadeira",
    "Cozinheira doméstica", "Babá", "Cuidador de idosos", "Cuidador de crianças",
    "Caseiro", "Governanta", "Auxiliar doméstico", "Preparador de refeições",
    "Organizador de casa", "Personal organizer", "Limpeza de armários",
    "Lavagem de roupas", "Passar roupas", "Organização de mudanças",
    "Organização de despensa", "Organização de closet"
  ],
  "Beleza e estética": [
    "Cabeleireiro", "Barbeiro", "Maquiador", "Designer de sobrancelhas",
    "Manicure", "Pedicure", "Alongamento de unhas", "Nail designer",
    "Depiladora", "Esteticista", "Massagista estético", "Micropigmentação",
    "Lash designer", "Extensionista de cílios", "Trancista", "Colorista capilar",
    "Corte masculino", "Corte feminino", "Escovista", "Penteadista"
  ],
  "Saúde e bem-estar": [
    "Psicólogo", "Nutricionista", "Fisioterapeuta", "Massoterapeuta",
    "Quiropraxista", "Personal trainer", "Professor de yoga", "Professor de pilates",
    "Terapeuta holístico", "Acupunturista", "Instrutor de meditação",
    "Instrutor de funcional", "Instrutor de crossfit", "Treinador esportivo",
    "Reabilitação física"
  ],
  "Educação": [
    "Professor de inglês", "Professor de espanhol", "Professor de francês",
    "Professor de matemática", "Professor de física", "Professor de química",
    "Professor de português", "Professor de história", "Professor de geografia",
    "Professor de biologia", "Professor de música", "Professor de violão",
    "Professor de piano", "Professor de canto", "Professor de informática",
    "Professor de programação", "Professor de desenho", "Professor de pintura",
    "Professor de dança", "Professor de reforço escolar"
  ],
  "Tecnologia": [
    "Desenvolvedor web", "Desenvolvedor front-end", "Desenvolvedor back-end",
    "Desenvolvedor full stack", "Desenvolvedor de aplicativos", "Programador mobile",
    "Programador web", "Técnico em redes", "Suporte técnico",
    "Montagem de computador", "Formatação de computador", "Instalação de software",
    "Recuperação de dados", "Segurança digital", "Especialista em cloud",
    "Administrador de servidores", "Analista de sistemas", "DevOps",
    "Técnico em hardware", "Especialista em banco de dados"
  ],
  "Marketing e design": [
    "Designer gráfico", "Social media", "Gestor de tráfego", "Criador de sites",
    "Copywriter", "Editor de vídeo", "Motion designer", "Fotógrafo",
    "Filmaker", "Gestor de anúncios", "Especialista em SEO",
    "Especialista em branding", "Redator publicitário", "Ilustrador",
    "Designer de logotipo"
  ],
  "Eventos": [
    "DJ", "Fotógrafo de eventos", "Filmagem de eventos", "Cerimonialista",
    "Decorador de festas", "Organizador de eventos", "Buffet", "Garçom",
    "Bartender", "Segurança de eventos", "Montador de palco", "Técnico de som",
    "Técnico de iluminação", "Animador de festas", "Mestre de cerimônias"
  ],
  "Transporte": [
    "Motorista particular", "Motoboy", "Entregador", "Frete", "Carreto",
    "Mudança residencial", "Mudança comercial", "Transporte escolar",
    "Transporte executivo", "Transporte de encomendas"
  ],
  "Automotivo": [
    "Mecânico", "Eletricista automotivo", "Funileiro", "Pintor automotivo",
    "Polimento automotivo", "Lava rápido", "Instalador de som automotivo",
    "Instalador de insulfilm", "Instalador de alarmes", "Mecânico de motos"
  ],
  "Pets": [
    "Banho e tosa", "Adestrador", "Dog walker", "Pet sitter", "Veterinário",
    "Hospedagem para pets", "Passeador de cães", "Cuidador de pets"
  ],
  "Serviços profissionais": [
    "Contador", "Consultor financeiro", "Consultor empresarial", "Advogado",
    "Tradutor", "Intérprete", "Secretária virtual", "Digitador",
    "Revisor de textos", "Consultor de carreira"
  ],
  "Jardinagem": [
    "Jardineiro", "Paisagista", "Podador de árvores", "Cortador de grama",
    "Limpeza de terreno", "Plantio de jardim", "Manutenção de jardim"
  ]
};

async function popularCategorias() {
  try {
    // Verificar se a URI do MongoDB está definida
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI não definida no arquivo .env');
    }

    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Limpar categorias existentes
    console.log('🗑️ Removendo categorias antigas...');
    await Categoria.deleteMany({});
    console.log('✅ Categorias antigas removidas');

    // Criar categorias principais (nível 1)
    console.log('\n📌 Criando categorias principais (nível 1)...');
    const categoriasNivel1 = {};

    for (const cat of categoriasPrincipais) {
      const slug = gerarSlug(cat.nome);
      
      const novaCat = await Categoria.create({
        nome: cat.nome,
        slug: slug,
        nivel: 1,
        ordem: cat.ordem,
        ativa: true
      });

      categoriasNivel1[cat.nome] = novaCat._id;
      console.log(`  ✅ ${cat.nome} (ID: ${novaCat._id})`);
    }

    // Criar serviços (nível 2)
    console.log('\n📌 Criando serviços (nível 2)...');
    let totalServicos = 0;

    for (const [catNome, servicos] of Object.entries(servicosPorCategoria)) {
      const catPaiId = categoriasNivel1[catNome];

      if (!catPaiId) {
        console.warn(`  ⚠️ Categoria pai não encontrada: ${catNome} - pulando...`);
        continue;
      }

      console.log(`\n  📂 ${catNome}:`);

      for (const servico of servicos) {
        const slug = gerarSlug(servico);
        
        await Categoria.create({
          nome: servico,
          slug: slug,
          nivel: 2,
          categoriaPai: catPaiId,
          ordem: 0,
          ativa: true
        });

        totalServicos++;
        console.log(`    ✅ ${servico}`);
      }
    }

    // Estatísticas finais
    console.log('\n' + '='.repeat(50));
    console.log('🎉 POPULAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`📊 Total de categorias principais: ${categoriasPrincipais.length}`);
    console.log(`📊 Total de serviços: ${totalServicos}`);
    console.log(`📊 Total de registros: ${categoriasPrincipais.length + totalServicos}`);

    // Mostrar primeiros registros como exemplo
    const exemplo = await Categoria.find({ nivel: 1 }).limit(3);
    console.log('\n📋 Exemplo de categorias criadas:');
    exemplo.forEach(c => {
      console.log(`   - ${c.nome} (nível ${c.nivel})`);
    });

  } catch (error) {
    console.error('\n❌ ERRO DETALHADO:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Conexão com MongoDB encerrada');
  }
}

// Executar
popularCategorias();

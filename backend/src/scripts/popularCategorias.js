// scripts/popularCategorias.js
import mongoose from 'mongoose';
import Categoria from '../models/Categoria.js';
import dotenv from 'dotenv';

dotenv.config();

const categorias = [
  // Nível 1 - Categorias Principais
  { nome: "Construção e reformas", nivel: 1, ordem: 1 },
  { nome: "Manutenção e reparos", nivel: 1, ordem: 2 },
  { nome: "Limpeza", nivel: 1, ordem: 3 },
  { nome: "Serviços domésticos", nivel: 1, ordem: 4 },
  { nome: "Beleza e estética", nivel: 1, ordem: 5 },
  { nome: "Saúde e bem-estar", nivel: 1, ordem: 6 },
  { nome: "Educação", nivel: 1, ordem: 7 },
  { nome: "Tecnologia", nivel: 1, ordem: 8 },
  { nome: "Marketing e design", nivel: 1, ordem: 9 },
  { nome: "Eventos", nivel: 1, ordem: 10 },
  { nome: "Transporte", nivel: 1, ordem: 11 },
  { nome: "Automotivo", nivel: 1, ordem: 12 },
  { nome: "Pets", nivel: 1, ordem: 13 },
  { nome: "Serviços profissionais", nivel: 1, ordem: 14 },
  { nome: "Jardinagem", nivel: 1, ordem: 15 }
];

// Mapeamento de serviços por categoria
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
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Limpar categorias existentes (opcional)
    await Categoria.deleteMany({});
    console.log('🗑️ Categorias antigas removidas');

    // Inserir categorias nível 1
    const categoriasNivel1 = {};
    for (const cat of categorias) {
      const novaCat = await Categoria.create({
        nome: cat.nome,
        slug: cat.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
        nivel: 1,
        ordem: cat.ordem
      });
      categoriasNivel1[cat.nome] = novaCat._id;
      console.log(`✅ Categoria nível 1: ${cat.nome}`);
    }

    // Inserir serviços como categorias nível 3
    for (const [catNome, servicos] of Object.entries(servicosPorCategoria)) {
      const catPaiId = categoriasNivel1[catNome];
      
      for (const servico of servicos) {
        await Categoria.create({
          nome: servico,
          slug: servico.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
          nivel: 3,
          categoriaPai: catPaiId
        });
        console.log(`  ✅ Serviço: ${servico}`);
      }
    }

    console.log('🎉 Todas as categorias inseridas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

popularCategorias();

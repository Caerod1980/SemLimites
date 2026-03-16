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

// Categorias principais com suas contagens
const categoriasPrincipais = [
  { nome: "Construção e Obras", ordem: 1, total: 32 },
  { nome: "Reformas", ordem: 2, total: 30 },
  { nome: "Manutenção e Reparos", ordem: 3, total: 34 },
  { nome: "Limpeza", ordem: 4, total: 32 },
  { nome: "Serviços Domésticos", ordem: 5, total: 30 },
  { nome: "Beleza e Estética", ordem: 6, total: 35 },
  { nome: "Saúde e Bem-estar", ordem: 7, total: 30 },
  { nome: "Educação e Aulas", ordem: 8, total: 32 },
  { nome: "Tecnologia e TI", ordem: 9, total: 34 },
  { nome: "Marketing e Design", ordem: 10, total: 30 },
  { nome: "Eventos e Festas", ordem: 11, total: 28 },
  { nome: "Arte e Entretenimento", ordem: 12, total: 30 },
  { nome: "Fotografia e Vídeo", ordem: 13, total: 25 },
  { nome: "Produção Musical e Áudio", ordem: 14, total: 20 },
  { nome: "Transporte e Logística", ordem: 15, total: 20 },
  { nome: "Automotivo", ordem: 16, total: 25 },
  { nome: "Pets", ordem: 17, total: 20 },
  { nome: "Jardinagem e Paisagismo", ordem: 18, total: 20 },
  { nome: "Segurança e Monitoramento", ordem: 19, total: 20 },
  { nome: "Serviços Empresariais", ordem: 20, total: 20 },
  { nome: "Serviços Jurídicos", ordem: 21, total: 20 },
  { nome: "Finanças e Contabilidade", ordem: 22, total: 20 },
  { nome: "Tradução e Conteúdo", ordem: 23, total: 20 },
  { nome: "Moda e Costura", ordem: 24, total: 20 },
  { nome: "Outros Serviços Especializados", ordem: 25, total: 20 }
];

// Serviços por categoria
const servicosPorCategoria = {
  "Construção e Obras": [
    "Pedreiro", "Servente de obras", "Mestre de obras", "Carpinteiro", "Marceneiro",
    "Armador", "Eletricista residencial", "Eletricista predial", "Eletricista industrial",
    "Encanador", "Bombeiro hidráulico", "Instalação de chuveiro", "Instalação de ventilador",
    "Instalação de luminárias", "Instalação de tomadas", "Instalação de disjuntores",
    "Instalação de ar condicionado", "Gesseiro", "Instalador de drywall", "Azulejista",
    "Instalação de piso cerâmico", "Instalação de porcelanato", "Instalação de piso vinílico",
    "Instalação de piso laminado", "Vidraceiro", "Serralheiro", "Soldador",
    "Impermeabilizador", "Telhadista", "Instalação de calhas", "Instalação de rufos",
    "Demolição"
  ],
  "Reformas": [
    "Reforma residencial", "Reforma comercial", "Reforma de apartamento", "Reforma de banheiro",
    "Reforma de cozinha", "Reforma elétrica", "Reforma hidráulica", "Reforma estrutural",
    "Reforma de telhado", "Reforma de fachada", "Reforma de varanda", "Reforma de garagem",
    "Reforma de área gourmet", "Reforma de escritório", "Reforma de loja", "Reforma de restaurante",
    "Reforma de salão comercial", "Reforma de condomínio", "Ampliação de imóvel", "Retrofit",
    "Restauração de imóveis", "Reforma de galpão", "Reforma de prédio", "Reforma de hotel",
    "Reforma de pousada", "Reforma de escola", "Reforma hospitalar", "Reforma industrial",
    "Reforma de escadas", "Reforma de pisos"
  ],
  "Manutenção e Reparos": [
    "Técnico de geladeira", "Técnico de freezer", "Técnico de máquina de lavar",
    "Técnico de secadora", "Técnico de microondas", "Técnico de fogão",
    "Técnico de televisão", "Técnico de ar condicionado", "Técnico de ventilador",
    "Técnico de celular", "Técnico de tablet", "Técnico de computador",
    "Técnico de notebook", "Técnico de impressora", "Montador de móveis",
    "Desmontador de móveis", "Conserto de portas", "Conserto de janelas",
    "Conserto de fechaduras", "Chaveiro", "Troca de lâmpadas", "Troca de torneiras",
    "Troca de registros", "Reparo de vazamentos", "Reparo de infiltrações",
    "Troca de vidro", "Troca de telhas", "Manutenção elétrica", "Manutenção hidráulica",
    "Manutenção predial", "Instalação de câmeras", "Instalação de alarmes",
    "Instalação de sensores", "Instalação de portão eletrônico"
  ],
  "Limpeza": [
    "Limpeza residencial", "Limpeza comercial", "Limpeza industrial", "Limpeza pós-obra",
    "Limpeza pesada", "Limpeza de condomínio", "Limpeza de fachadas", "Limpeza de vidros",
    "Limpeza de piscina", "Limpeza de caixa d'água", "Limpeza de calhas",
    "Limpeza de sofá", "Limpeza de colchão", "Limpeza de tapetes", "Limpeza de carpetes",
    "Limpeza de estofados", "Lavagem de veículos", "Lavagem ecológica",
    "Lavagem de garagem", "Lavagem de telhado", "Lavagem de paredes",
    "Higienização residencial", "Higienização hospitalar", "Polimento de pisos",
    "Cristalização de pisos", "Tratamento de pisos", "Limpeza de escritórios",
    "Limpeza de escolas", "Limpeza de hospitais", "Limpeza de restaurantes",
    "Limpeza de lojas", "Limpeza de vitrines"
  ],
  "Serviços Domésticos": [
    "Diarista", "Empregada doméstica", "Passadeira", "Lavadeira",
    "Babá", "Cuidador de idosos", "Cuidador de crianças", "Caseiro",
    "Governanta", "Auxiliar doméstico", "Organizador de casa", "Personal organizer",
    "Lavagem de roupas", "Passar roupas", "Organização de mudanças",
    "Organização de despensa", "Organização de closet", "Preparação de refeições",
    "Preparação de marmitas", "Preparação de dietas", "Acompanhante hospitalar",
    "Cuidador domiciliar", "Cuidador noturno", "Serviço de lavanderia",
    "Costureira doméstica", "Conserto de roupas", "Ajuste de roupas",
    "Bordado", "Cozinheiro particular", "Preparação de festas"
  ],
  "Beleza e Estética": [
    "Cabeleireiro", "Barbeiro", "Maquiador", "Designer de sobrancelhas",
    "Manicure", "Pedicure", "Alongamento de unhas", "Depilação feminina",
    "Depilação masculina", "Esteticista", "Micropigmentação", "Extensão de cílios",
    "Trancista", "Colorista capilar", "Corte masculino", "Corte feminino",
    "Escova capilar", "Penteado para festa", "Penteado para noiva", "Maquiagem social",
    "Maquiagem profissional", "Limpeza de pele", "Peeling facial", "Drenagem linfática",
    "Massagem relaxante", "Massagem modeladora", "Spa facial", "Spa corporal",
    "Bronzeamento artificial", "Bronzeamento natural", "Design de barba",
    "Hidratação capilar", "Progressiva capilar", "Botox capilar", "Megahair"
  ],
  "Saúde e Bem-estar": [
    "Psicólogo", "Nutricionista", "Fisioterapeuta", "Massoterapeuta",
    "Quiropraxista", "Personal trainer", "Instrutor de yoga", "Instrutor de pilates",
    "Acupunturista", "Terapeuta holístico", "Instrutor de meditação",
    "Instrutor funcional", "Treinador esportivo", "Preparador físico",
    "Avaliação física", "Avaliação nutricional", "Reabilitação física",
    "Terapia ocupacional", "Hipnoterapia", "Reiki", "Shiatsu", "Reflexologia",
    "Aromaterapia", "Fitoterapia", "Consulta domiciliar", "Consulta online",
    "Treinamento para idosos", "Treinamento para gestantes", "Treinamento infantil",
    "Treino personalizado"
  ],
  "Educação e Aulas": [
    "Professor de inglês", "Professor de espanhol", "Professor de francês",
    "Professor de italiano", "Professor de matemática", "Professor de física",
    "Professor de química", "Professor de português", "Professor de história",
    "Professor de geografia", "Professor de biologia", "Professor de música",
    "Professor de violão", "Professor de guitarra", "Professor de piano",
    "Professor de teclado", "Professor de canto", "Professor de informática",
    "Professor de programação", "Professor de desenho", "Professor de pintura",
    "Professor de dança", "Professor de teatro", "Professor de fotografia",
    "Professor de marketing digital", "Professor de design gráfico",
    "Professor de edição de vídeo", "Reforço escolar", "Preparação para vestibular",
    "Preparação para concursos", "Tutor escolar", "Aulas online"
  ],
  "Tecnologia e TI": [
    "Desenvolvedor web", "Desenvolvedor front-end", "Desenvolvedor back-end",
    "Desenvolvedor full stack", "Desenvolvedor mobile", "Programador web",
    "Programador mobile", "Administrador de redes", "Técnico em redes",
    "Suporte técnico", "Montagem de computador", "Formatação de computador",
    "Instalação de software", "Recuperação de dados", "Segurança digital",
    "Pentester", "Especialista em cloud", "Administrador de servidores",
    "Analista de sistemas", "DevOps", "Especialista em banco de dados",
    "Especialista em APIs", "Especialista em automação", "Especialista em IA",
    "Especialista em machine learning", "Especialista em blockchain",
    "Especialista em IoT", "Administrador Linux", "Administrador Windows Server",
    "Analista de suporte", "Help desk", "Suporte remoto", "Suporte presencial",
    "Consultor de TI"
  ],
  "Marketing e Design": [
    "Designer gráfico", "Social media", "Gestor de tráfego", "Criador de sites",
    "Copywriter", "Editor de vídeo", "Motion designer", "Fotógrafo",
    "Filmaker", "Gestor de anúncios", "Especialista em SEO",
    "Especialista em branding", "Redator publicitário", "Ilustrador",
    "Designer de logotipo", "Designer de identidade visual", "Designer UX",
    "Designer UI", "Diretor de arte", "Produtor de conteúdo", "Roteirista",
    "Gestor de marketing", "Consultor de marketing", "Especialista em inbound marketing",
    "Especialista em e-mail marketing", "Especialista em funil de vendas",
    "Especialista em analytics", "Especialista em growth marketing",
    "Especialista em marketing digital", "Especialista em marketing de conteúdo"
  ],
  "Eventos e Festas": [
    "DJ", "Fotógrafo de eventos", "Filmagem de eventos", "Cerimonialista",
    "Decorador de festas", "Organizador de eventos", "Buffet", "Garçom",
    "Bartender", "Segurança de eventos", "Montador de palco", "Técnico de som",
    "Técnico de iluminação", "Animador de festas", "Mestre de cerimônias",
    "Banda para eventos", "Cantor para eventos", "Recepcionista de eventos",
    "Promotor de eventos", "Barman", "Churrasqueiro", "Buffet infantil",
    "Decoração de casamento", "Decoração de aniversário", "Decoração de formatura",
    "Locação de equipamentos", "Locação de tendas", "Locação de mesas e cadeiras"
  ],
  "Arte e Entretenimento": [
    "Músico", "Guitarrista", "Baixista", "Baterista", "Vocalista",
    "Cantor", "Tecladista", "Violinista", "Saxofonista", "Trompetista",
    "Percussionista", "Sanfoneiro", "Banda musical", "Trio musical",
    "Quarteto musical", "Orquestra", "Coral", "DJ produtor", "Ator",
    "Atriz", "Figurante", "Comediante", "Stand-up comedian", "Palhaço",
    "Animador infantil", "Mágico", "Ilusionista", "Malabarista", "Bailarino",
    "Dançarino"
  ],
  "Fotografia e Vídeo": [
    "Fotógrafo", "Fotógrafo de casamento", "Fotógrafo de eventos",
    "Fotógrafo de produtos", "Fotógrafo publicitário", "Fotógrafo corporativo",
    "Fotógrafo de moda", "Fotógrafo imobiliário", "Fotógrafo gastronômico",
    "Fotógrafo esportivo", "Videomaker", "Filmagem de eventos",
    "Filmagem institucional", "Filmagem publicitária", "Editor de vídeo",
    "Colorista de vídeo", "Operador de câmera", "Drone para filmagem",
    "Drone para fotografia", "Produção audiovisual", "Diretor de fotografia",
    "Produção de vídeos institucionais", "Produção de vídeos comerciais",
    "Produção de vídeos para redes sociais", "Streaming de eventos"
  ],
  "Produção Musical e Áudio": [
    "Produtor musical", "Arranjador musical", "Compositor", "Letrista",
    "Técnico de gravação", "Técnico de mixagem", "Técnico de masterização",
    "Locutor", "Locutor publicitário", "Locutor institucional", "Narrador",
    "Dublador", "Voice-over", "Apresentador", "Podcaster", "Editor de áudio",
    "Designer de som", "Operador de áudio", "Técnico de estúdio",
    "Gravação em estúdio"
  ],
  "Transporte e Logística": [
    "Motorista particular", "Motorista executivo", "Motorista de aplicativo",
    "Motoboy", "Entregador", "Frete", "Carreto", "Mudança residencial",
    "Mudança comercial", "Transporte escolar", "Transporte executivo",
    "Transporte de encomendas", "Transporte de cargas leves",
    "Transporte de cargas pesadas", "Transporte de motos", "Transporte de veículos",
    "Transporte de móveis", "Motorista para eventos", "Motorista diário",
    "Transporte corporativo"
  ],
  "Automotivo": [
    "Mecânico", "Eletricista automotivo", "Funileiro", "Pintor automotivo",
    "Polimento automotivo", "Estética automotiva", "Lava rápido",
    "Instalação de som automotivo", "Instalação de insulfilm", "Instalação de alarmes",
    "Mecânico de motos", "Troca de óleo", "Troca de pneus",
    "Alinhamento e balanceamento", "Revisão automotiva", "Diagnóstico automotivo",
    "Reparo de motores", "Reparo de câmbio", "Reparo de suspensão",
    "Reparo de freios", "Instalação de acessórios", "Instalação de sensores",
    "Higienização automotiva", "Cristalização automotiva", "Funilaria rápida"
  ],
  "Pets": [
    "Banho e tosa", "Adestrador", "Dog walker", "Pet sitter", "Veterinário",
    "Hospedagem para pets", "Passeador de cães", "Cuidador de pets",
    "Creche para pets", "Hotel para pets", "Taxi dog", "Transporte de pets",
    "Treinamento de cães", "Treinamento de comportamento", "Pet grooming",
    "Pet styling", "Fisioterapia animal", "Reabilitação animal",
    "Nutrição animal", "Consulta veterinária"
  ],
  "Jardinagem e Paisagismo": [
    "Jardineiro", "Paisagista", "Podador de árvores", "Cortador de grama",
    "Limpeza de terreno", "Plantio de jardim", "Manutenção de jardim",
    "Instalação de irrigação", "Projeto paisagístico", "Construção de jardins",
    "Jardim vertical", "Instalação de grama", "Plantio de árvores",
    "Plantio de flores", "Adubação de solo", "Controle de pragas",
    "Controle de ervas daninhas", "Poda ornamental", "Manutenção de parques",
    "Manutenção de áreas verdes"
  ],
  "Segurança e Monitoramento": [
    "Instalação de câmeras", "Instalação de alarmes", "Instalação de sensores",
    "Instalação de cerca elétrica", "Instalação de interfone",
    "Monitoramento residencial", "Monitoramento comercial", "Segurança patrimonial",
    "Segurança privada", "Segurança de eventos", "Segurança de condomínio",
    "Segurança eletrônica", "Instalação de portão eletrônico", "Controle de acesso",
    "Instalação de fechadura digital", "Instalação de biometria",
    "Instalação de catracas", "Instalação de detectores de movimento",
    "Instalação de sistemas de vigilância", "Consultoria em segurança"
  ],
  "Serviços Empresariais": [
    "Consultor empresarial", "Consultor de negócios", "Consultor de gestão",
    "Consultor de inovação", "Consultor de startups", "Consultor de franquias",
    "Consultor de processos", "Consultor de vendas", "Consultor administrativo",
    "Consultor estratégico", "Consultor de RH", "Consultor de marketing",
    "Consultor financeiro", "Consultor tributário", "Consultor contábil",
    "Consultor jurídico empresarial", "Consultor de produtividade",
    "Consultor de planejamento", "Consultor de expansão", "Consultor de mercado"
  ],
  "Serviços Jurídicos": [
    "Advogado civil", "Advogado criminal", "Advogado trabalhista",
    "Advogado empresarial", "Advogado tributário", "Advogado previdenciário",
    "Advogado imobiliário", "Advogado de família", "Advogado consumidor",
    "Advogado ambiental", "Advogado internacional", "Advogado digital",
    "Consultor jurídico", "Correspondente jurídico", "Mediação jurídica",
    "Arbitragem", "Defesa administrativa", "Assessoria jurídica",
    "Elaboração de contratos", "Análise jurídica"
  ],
  "Finanças e Contabilidade": [
    "Contador", "Consultor financeiro", "Planejador financeiro",
    "Auditor contábil", "Perito contábil", "Consultor tributário",
    "Consultor fiscal", "Consultor de investimentos", "Consultor bancário",
    "Consultor financeiro empresarial", "Consultor financeiro pessoal",
    "Gestor financeiro", "Analista financeiro", "Analista contábil",
    "Controle financeiro", "BPO financeiro", "Gestão de fluxo de caixa",
    "Planejamento tributário", "Regularização fiscal", "Abertura de empresas"
  ],
  "Tradução e Conteúdo": [
    "Tradutor", "Tradutor técnico", "Tradutor juramentado", "Tradutor de inglês",
    "Tradutor de espanhol", "Tradutor de francês", "Tradutor de alemão",
    "Tradutor de italiano", "Intérprete", "Redator", "Copywriter",
    "Revisor de textos", "Revisor acadêmico", "Revisor editorial",
    "Criador de conteúdo", "Ghostwriter", "Roteirista", "Escritor técnico",
    "Editor de texto", "Editor editorial"
  ],
  "Moda e Costura": [
    "Costureira", "Estilista", "Modelista", "Ajuste de roupas",
    "Conserto de roupas", "Bordado", "Bordado personalizado",
    "Costura sob medida", "Confecção de roupas", "Confecção de vestidos",
    "Confecção de ternos", "Confecção de fantasias", "Confecção de uniformes",
    "Customização de roupas", "Design de moda", "Consultoria de moda",
    "Consultoria de imagem", "Figurinista", "Costura criativa", "Ateliê de costura"
  ],
  "Outros Serviços Especializados": [
    "Detetive particular", "Astrólogo", "Tarólogo", "Numerólogo",
    "Coach profissional", "Coach de carreira", "Coach de negócios",
    "Consultor espiritual", "Consultor esotérico", "Consultor de lifestyle",
    "Consultor de produtividade pessoal", "Consultor de organização pessoal",
    "Consultor de carreira", "Consultor de imagem pessoal",
    "Consultor de etiqueta", "Consultor de etiqueta empresarial",
    "Mentor profissional", "Mentor de negócios", "Mentor de carreira",
    "Mentor de liderança"
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
      console.log(`  ✅ ${cat.nome.padEnd(30)} (ID: ${novaCat._id}) - ${cat.total} serviços`);
    }

    // Criar serviços (nível 2)
    console.log('\n📌 Criando serviços (nível 2)...');
    let totalServicos = 0;
    let contagemPorCategoria = {};

    for (const [catNome, servicos] of Object.entries(servicosPorCategoria)) {
      const catPaiId = categoriasNivel1[catNome];

      if (!catPaiId) {
        console.warn(`  ⚠️ Categoria pai não encontrada: ${catNome} - pulando...`);
        continue;
      }

      console.log(`\n  📂 ${catNome}:`);
      let contador = 0;

      for (const servico of servicos) {
        const slug = gerarSlug(servico);
        
        await Categoria.create({
          nome: servico,
          slug: slug,
          nivel: 2,
          categoriaPai: catPaiId,
          ordem: contador,
          ativa: true
        });

        contador++;
        totalServicos++;
        
        if (contador <= 5) {
          console.log(`    ✅ ${servico}`);
        } else if (contador === 6) {
          console.log(`    ... e mais ${servicos.length - 5} serviços`);
        }
      }
      
      contagemPorCategoria[catNome] = contador;
    }

    // Estatísticas finais
    console.log('\n' + '='.repeat(60));
    console.log('🎉 POPULAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    
    console.log(`\n📊 RESUMO GERAL:`);
    console.log(`   ├─ Total de categorias principais: ${categoriasPrincipais.length}`);
    console.log(`   ├─ Total de serviços: ${totalServicos}`);
    console.log(`   └─ Total de registros: ${categoriasPrincipais.length + totalServicos}`);

    console.log(`\n📊 DETALHAMENTO POR CATEGORIA:`);
    let totalEsperado = 0;
    for (const cat of categoriasPrincipais) {
      const criados = contagemPorCategoria[cat.nome] || 0;
      const esperado = cat.total;
      totalEsperado += esperado;
      const status = criados === esperado ? '✅' : '⚠️';
      console.log(`   ${status} ${cat.nome.padEnd(30)}: ${criados.toString().padStart(2)}/${esperado} serviços`);
    }

    console.log(`\n📊 CONFERÊNCIA:`);
    console.log(`   ├─ Total esperado de serviços: ${totalEsperado}`);
    console.log(`   ├─ Total criado de serviços: ${totalServicos}`);
    console.log(`   └─ Diferença: ${totalServicos - totalEsperado}`);

    if (totalServicos === totalEsperado) {
      console.log(`\n✅ TODAS AS CATEGORIAS FORAM CRIADAS CORRETAMENTE!`);
    } else {
      console.log(`\n⚠️ ALGUMAS CATEGORIAS PODEM TER FICADO DE FORA!`);
    }

    // Mostrar primeiros registros como exemplo
    const exemplo = await Categoria.find({ nivel: 1 }).sort({ ordem: 1 }).limit(5);
    console.log('\n📋 EXEMPLO DE CATEGORIAS PRINCIPAIS:');
    exemplo.forEach(c => {
      console.log(`   - ${c.nome} (nível ${c.nivel}, ordem ${c.ordem})`);
    });

    const exemplo2 = await Categoria.find({ nivel: 2 }).limit(5);
    console.log('\n📋 EXEMPLO DE SERVIÇOS:');
    exemplo2.forEach(c => {
      console.log(`   - ${c.nome}`);
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

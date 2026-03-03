export const PRESTADORES_MOCK = [
  {
    nome: "João Souza",
    slug: "joao-souza-eletricista",
    foto: "JS",
    cnpj: "12345678000199",
    verificado: true,
    dataVerificacaoCNPJ: new Date("2024-03-20"),
    dadosCNPJ: {
      razaoSocial: "J. SOUZA ELETRICISTA LTDA",
      nomeFantasia: "JOÃO SOUZA ELETRICISTA",
      dataAbertura: "15/03/2012",
      situacao: "ATIVA",
      atividadePrincipal: "Instalação e manutenção elétrica",
      endereco: "Rua das Flores, 123 - Centro, Bauru/SP"
    },
    categoria: "Eletricista",
    cidade: "Bauru",
    regioes: ["Centro", "Jardim Europa", "Vila Universitária"],
    descricao: "Profissional com 12 anos de experiência em instalações elétricas residenciais e comerciais. Atendimento de emergência 24h.",
    sobre: "Comecei como auxiliar aos 18 anos e hoje tenho minha própria empresa.",
    estrelas: 4.9,
    avaliacoes: 328,
    whatsapp: "5514999999999",
    telefone: "(14) 99999-9999",
    email: "joao.eletricista@email.com",
    tags: ["Emergência 24h", "Residencial", "Comercial", "Industrial", "Projetos"],
    disponibilidade: "Segunda a Sábado • 8h às 20h",
    tempoResposta: "~15 minutos",
    tempoMercado: "12 anos",
    servicosRealizados: 1247,
    clientesFieis: 89,
    garantia: "3 meses",
    destaque: true,
    localizacao: {
      type: "Point",
      coordinates: [-49.0806, -22.3218]
    },
    reviews: [
      { nome: "Mariana Costa", estrelas: 5, data: new Date("2024-03-15"), servico: "Instalação elétrica completa", texto: "João é simplesmente fantástico. Profissionalismo, pontualidade e acabamento impecável.", gostaram: 24 }
    ],
    portfolio: [
      "Instalação completa - Residência 450m² (2024)",
      "Projeto elétrico - Comercial Centro (2023)"
    ],
    certificacoes: ["NR-10", "CREA Ativo", "Projetos Elétricos - SENAI"]
  },
  {
    nome: "Paula Martins",
    slug: "paula-martins-diarista",
    foto: "PM",
    cnpj: "98765432000188",
    verificado: true,
    dataVerificacaoCNPJ: new Date("2024-03-20"),
    dadosCNPJ: {
      razaoSocial: "PAULA MARTINS DIARISTA ME",
      nomeFantasia: "PAULA MARTINS",
      dataAbertura: "10/08/2016",
      situacao: "ATIVA",
      atividadePrincipal: "Serviços de limpeza",
      endereco: "Av. Paulista, 456 - Jardim América, Bauru/SP"
    },
    categoria: "Diarista",
    cidade: "Bauru",
    regioes: ["Centro", "Vila Falcão", "Jardim América"],
    descricao: "Diarista organizada, detalhista e pontual. Limpeza pesada e manutenção semanal.",
    sobre: "Trabalho com limpeza há 8 anos. Minha especialidade é organização e otimização de espaços.",
    estrelas: 4.8,
    avaliacoes: 156,
    whatsapp: "5514988888888",
    telefone: "(14) 98888-8888",
    email: "paula.diarista@email.com",
    tags: ["Limpeza pesada", "Organização", "Semanal"],
    disponibilidade: "Segunda a Sexta • 8h às 17h",
    tempoResposta: "~30 minutos",
    tempoMercado: "8 anos",
    servicosRealizados: 856,
    clientesFieis: 94,
    garantia: "Retorno em 24h",
    destaque: true,
    localizacao: {
      type: "Point",
      coordinates: [-49.0706, -22.3118]
    },
    reviews: [
      { nome: "Renato Mendes", estrelas: 5, data: new Date("2024-03-10"), servico: "Limpeza pesada", texto: "Casa ficou impecável. Excelente profissional!", gostaram: 15 }
    ],
    portfolio: [
      "Limpeza pós-obra - Apartamento 120m² (2024)",
      "Organização de guarda-roupas - Residência (2023)"
    ],
    certificacoes: ["Curso de Limpeza Profissional", "Técnicas de Organização"]
  }
];

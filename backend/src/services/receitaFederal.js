import axios from 'axios';

export async function consultarCNPJ(cnpj) {
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return { 
        valido: false, 
        motivo: "CNPJ inválido (deve ter 14 dígitos)" 
      };
    }

    // SIMULAÇÃO: Dados mockados para testes
    const mockData = {
      "12345678000199": {
        status: "OK",
        nome: "J. SOUZA ELETRICISTA LTDA",
        fantasia: "JOÃO SOUZA ELETRICISTA",
        abertura: "15/03/2012",
        situacao: "ATIVA",
        atividade_principal: [{ text: "Instalação e manutenção elétrica" }],
        logradouro: "Rua das Flores",
        numero: "123",
        bairro: "Centro",
        municipio: "Bauru",
        uf: "SP",
        telefone: "(14) 3232-1234"
      },
      "98765432000188": {
        status: "OK",
        nome: "PAULA MARTINS DIARISTA ME",
        fantasia: "PAULA MARTINS",
        abertura: "10/08/2016",
        situacao: "ATIVA",
        atividade_principal: [{ text: "Serviços de limpeza" }],
        logradouro: "Av. Paulista",
        numero: "456",
        bairro: "Jardim América",
        municipio: "Bauru",
        uf: "SP",
        telefone: "(14) 3232-5678"
      },
      "11122233000177": {
        status: "OK",
        nome: "RAFAEL LIMA ENCANADOR LTDA",
        fantasia: "R LIMA ENCANADOR",
        abertura: "05/03/2009",
        situacao: "ATIVA",
        atividade_principal: [{ text: "Serviços de encanamento" }],
        logradouro: "Rua das Pedras",
        numero: "789",
        bairro: "Centro",
        municipio: "Agudos",
        uf: "SP",
        telefone: "(14) 3232-9012"
      }
    };

    // Simula delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const data = mockData[cnpjLimpo];
    
    if (!data) {
      return { 
        valido: false, 
        motivo: "CNPJ não encontrado na Receita Federal" 
      };
    }

    return {
      valido: data.situacao === "ATIVA",
      situacao: data.situacao,
      empresa: {
        razaoSocial: data.nome,
        nomeFantasia: data.fantasia,
        dataAbertura: data.abertura,
        atividadePrincipal: data.atividade_principal[0]?.text,
        endereco: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`,
        telefone: data.telefone
      }
    };

  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return { 
      valido: false, 
      motivo: "Erro ao consultar Receita Federal" 
    };
  }
}

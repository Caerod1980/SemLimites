// /src/routes/empresa.js
import express from 'express';
import { consultarCNPJ } from '../services/receitaFederal.js';

const router = express.Router();

/**
 * @route   GET /api/empresa/consultar-cnpj/:cnpj
 * @desc    Consultar CNPJ na Receita Federal
 * @access  Public
 */
router.get('/consultar-cnpj/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    console.log(`📨 Consultando CNPJ: ${cnpj}`);
    
    // Usar o serviço de consulta
    const resultado = await consultarCNPJ(cnpj);
    
    if (!resultado.valido) {
      return res.status(400).json({
        status: 'ERRO',
        error: resultado.motivo || 'CNPJ inválido'
      });
    }
    
    // Mapear para o formato esperado pelo frontend
    res.json({
      status: 'OK',
      situacao: resultado.situacao,
      situacao_cadastral: resultado.situacao,
      razao_social: resultado.empresa.razaoSocial,
      nome_fantasia: resultado.empresa.nomeFantasia,
      nome: resultado.empresa.nomeFantasia || resultado.empresa.razaoSocial,
      cnpj: cnpj.replace(/\D/g, ''),
      logradouro: resultado.empresa.endereco.logradouro,
      numero: resultado.empresa.endereco.numero,
      complemento: resultado.empresa.endereco.complemento,
      bairro: resultado.empresa.endereco.bairro,
      municipio: resultado.empresa.endereco.municipio,
      uf: resultado.empresa.endereco.uf,
      cep: resultado.empresa.endereco.cep,
      telefone: resultado.empresa.contato?.telefone,
      email: resultado.empresa.contato?.email,
      data_abertura: resultado.empresa.dataAbertura,
      porte: resultado.empresa.porte,
      natureza_juridica: resultado.empresa.naturezaJuridica,
      capital_social: resultado.empresa.capitalSocial,
      endereco_completo: resultado.empresa.enderecoCompleto
    });
    
  } catch (error) {
    console.error('❌ Erro na rota de consulta CNPJ:', error);
    res.status(500).json({ 
      status: 'ERRO',
      error: error.message 
    });
  }
});

export default router;

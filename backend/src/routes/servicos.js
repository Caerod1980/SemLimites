import express from 'express';
import jwt from 'jsonwebtoken';
import Servico from '../models/Servico.js';
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = express.Router();

// Middleware para verificar token de autenticação
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ========== CRIAR NOVO SERVIÇO ==========
router.post('/', autenticar, async (req, res) => {
  try {
    const { 
      clienteNome, 
      clienteWhatsApp, 
      clienteEmail,
      titulo, 
      descricao, 
      dataRealizacao,
      valor 
    } = req.body;

    // Validações básicas
    if (!clienteNome || !clienteWhatsApp || !titulo || !descricao) {
      return res.status(400).json({ 
        error: 'Nome do cliente, WhatsApp, título e descrição são obrigatórios' 
      });
    }

    // Buscar prestador pelo email do usuário logado
    const user = await User.findById(req.user.userId);
    if (!user || user.tipo !== 'prestador' || !user.prestadorId) {
      return res.status(403).json({ error: 'Usuário não é um prestador válido' });
    }

    // Criar serviço
    const servico = new Servico({
      prestadorId: user.prestadorId,
      userId: user._id,
      clienteNome,
      clienteWhatsApp: clienteWhatsApp.replace(/\D/g, ''),
      clienteEmail,
      titulo,
      descricao,
      dataRealizacao: dataRealizacao || new Date(),
      valor
    });

    // Gerar token de avaliação
    await servico.gerarTokenAvaliacao();
    await servico.save();

    // Incrementar contador de serviços do prestador
    await Prestador.findByIdAndUpdate(user.prestadorId, {
      $inc: { servicosRealizados: 1 }
    });

    // Gerar link de avaliação
    const linkAvaliacao = servico.linkAvaliacao;
    const mensagem = servico.mensagemWhatsApp;

    res.status(201).json({
      message: '✅ Serviço cadastrado com sucesso!',
      servico: {
        id: servico._id,
        clienteNome: servico.clienteNome,
        titulo: servico.titulo,
        status: servico.status,
        linkAvaliacao,
        mensagemWhatsApp: mensagem,
        token: servico.avaliacaoToken
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar serviço:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== LISTAR SERVIÇOS DO PRESTADOR ==========
router.get('/meus', autenticar, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const user = await User.findById(req.user.userId);
    if (!user || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { servicos, total, totalPages } = await Servico.findByPrestador(
      user.prestadorId,
      { page: parseInt(page), limit: parseInt(limit), status }
    );

    res.json({
      servicos,
      total,
      page: parseInt(page),
      totalPages
    });

  } catch (error) {
    console.error('❌ Erro ao listar serviços:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR SERVIÇO POR ID ==========
router.get('/:id', autenticar, async (req, res) => {
  try {
    const servico = await Servico.findById(req.params.id)
      .populate('prestadorId', 'nome categoria cidade');

    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Verificar se o prestador é dono do serviço
    const user = await User.findById(req.user.userId);
    if (servico.prestadorId._id.toString() !== user.prestadorId?.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(servico);

  } catch (error) {
    console.error('❌ Erro ao buscar serviço:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== REENVIAR LINK DE AVALIAÇÃO ==========
router.post('/:id/reenviar', autenticar, async (req, res) => {
  try {
    const servico = await Servico.findById(req.params.id);

    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Verificar permissão
    const user = await User.findById(req.user.userId);
    if (servico.prestadorId.toString() !== user.prestadorId?.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se ainda pode reenviar
    if (servico.status !== 'aguardando') {
      return res.status(400).json({ 
        error: `Serviço já foi ${servico.status === 'avaliado' ? 'avaliado' : 'expirado'}` 
      });
    }

    // Gerar novo token se o atual expirou
    if (servico.tokenExpiracao < new Date()) {
      await servico.gerarTokenAvaliacao();
      await servico.save();
    }

    res.json({
      message: '✅ Link de avaliação gerado',
      linkAvaliacao: servico.linkAvaliacao,
      mensagemWhatsApp: servico.mensagemWhatsApp,
      token: servico.avaliacaoToken
    });

  } catch (error) {
    console.error('❌ Erro ao reenviar link:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== EXCLUIR SERVIÇO ==========
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const servico = await Servico.findById(req.params.id);

    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Verificar permissão
    const user = await User.findById(req.user.userId);
    if (servico.prestadorId.toString() !== user.prestadorId?.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Só pode excluir serviços não avaliados
    if (servico.status === 'avaliado') {
      return res.status(400).json({ 
        error: 'Não é possível excluir um serviço já avaliado' 
      });
    }

    await servico.deleteOne();

    // Decrementar contador do prestador
    await Prestador.findByIdAndUpdate(user.prestadorId, {
      $inc: { servicosRealizados: -1 }
    });

    res.json({ message: '✅ Serviço excluído com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao excluir serviço:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) ==========

// ========== BUSCAR SERVIÇO POR TOKEN PARA AVALIAÇÃO ==========
router.get('/avaliar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const servico = await Servico.findByToken(token);
    
    if (!servico) {
      return res.status(404).json({ 
        error: 'Link inválido ou expirado',
        message: 'Este link de avaliação não é válido ou já foi utilizado.'
      });
    }

    res.json({
      valido: true,
      servico: {
        id: servico._id,
        titulo: servico.titulo,
        descricao: servico.descricao,
        dataRealizacao: servico.dataRealizacao,
        clienteNome: servico.clienteNome,
        prestador: {
          nome: servico.prestadorId.nome,
          categoria: servico.prestadorId.categoria,
          cidade: servico.prestadorId.cidade
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar serviço por token:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== REGISTRAR AVALIAÇÃO ==========
router.post('/avaliar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { estrelas, comentario } = req.body;
    
    // Validações
    if (!estrelas || estrelas < 1 || estrelas > 5) {
      return res.status(400).json({ 
        error: 'A avaliação deve ter de 1 a 5 estrelas' 
      });
    }

    const servico = await Servico.findByToken(token);
    
    if (!servico) {
      return res.status(404).json({ 
        error: 'Link inválido ou expirado' 
      });
    }

    // Registrar avaliação
    await servico.registrarAvaliacao(estrelas, comentario, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '✅ Avaliação registrada com sucesso!',
      servico: {
        id: servico._id,
        status: servico.status,
        estrelas: servico.avaliacao.estrelas
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar avaliação:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSCAR SERVIÇOS AVALIADOS DE UM PRESTADOR (PÚBLICO) ==========
// Rota para exibir serviços avaliados no perfil do prestador
router.get('/prestador/:prestadorId', async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const { limit = 10 } = req.query;

    // Validar se o prestadorId é válido
    if (!prestadorId) {
      return res.status(400).json({ error: 'ID do prestador não fornecido' });
    }

    // Buscar serviços avaliados do prestador
    const servicos = await Servico.find({
      prestadorId,
      status: 'avaliado'
    })
    .sort({ 'avaliacao.dataAvaliacao': -1 }) // Mais recentes primeiro
    .limit(parseInt(limit))
    .select('titulo descricao dataRealizacao clienteNome avaliacao'); // Apenas campos necessários

    // Contar total de serviços avaliados
    const total = await Servico.countDocuments({
      prestadorId,
      status: 'avaliado'
    });

    res.json({
      servicos,
      total,
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Erro ao buscar serviços do prestador:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

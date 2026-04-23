import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

// Configuração do transporte de email (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Função para validar CPF (matemática)
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// ========== FUNÇÃO PARA ENVIAR EMAIL DE RECUPERAÇÃO ==========
async function enviarEmailResetSenha(email, nome, token) {
  const resetLink = `${process.env.FRONTEND_URL}/SemLimites/resetar-senha/${token}`;
  
  console.log('🔗 Link de reset gerado:', resetLink);
  
  const mailOptions = {
    from: '"SemLimites" <' + process.env.GMAIL_USER + '>',
    to: email,
    subject: '🔐 Recuperação de senha - SemLimites',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border: 1px solid #c0dfc0;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #3d7a3d, #FFB347);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
          }
          h2 {
            color: #3d7a3d;
            font-size: 24px;
            margin-bottom: 16px;
          }
          p {
            color: #4a8a4a;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(to right, #FFB347, #FFD966);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
          }
          .info-box {
            background: #f0f7f0;
            border: 1px solid #c0dfc0;
            border-radius: 16px;
            padding: 20px;
            margin: 24px 0;
          }
          .info-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            color: #2d5a2d;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #c0dfc0;
            color: #4a8a4a;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SemLimites</div>
            <p style="color: #4a8a4a;">Conectando você a profissionais de confiança</p>
          </div>
          
          <h2>Olá, ${nome}!</h2>
          
          <p>Recebemos uma solicitação de recuperação de senha para sua conta no SemLimites.</p>
          
          <p>Para criar uma nova senha, clique no botão abaixo:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir minha senha</a>
          </div>
          
          <div class="info-box">
            <div class="info-item">
              <span>⏰</span>
              <span>Este link é válido por <strong>1 hora</strong></span>
            </div>
            <div class="info-item">
              <span>🔒</span>
              <span>É um link seguro e de uso único</span>
            </div>
            <div class="info-item">
              <span>💡</span>
              <span>Se não foi você, ignore este email</span>
            </div>
          </div>
          
          <p style="font-size: 14px;">
            Se você não solicitou esta recuperação, pode ignorar este email com segurança.
          </p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SemLimites. Todos os direitos reservados.</p>
            <p>Feito com ❤️ em Bauru, SP</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado com sucesso para: ${email}`);
    console.log(`📧 ID da mensagem: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email de recuperação');
  }
}

// ========== REGISTRO ==========
router.post('/register', async (req, res) => {
  try {
    console.log('📥 Dados recebidos no registro:', req.body);
    
    const { 
      email, 
      senha, 
      tipo,
      tipoPessoa,
      nome,
      cpf,
      responsavel,
      cnpj,
      categoriaPrincipal,
      servicos,
      cidade,
      estado,
      descricao,
      whatsapp,
      telefone,
      tags,
      verificado,
      dadosCNPJ,
      dataVerificacaoCNPJ,
      subscriptionId,
      planoStatus,
      planoAtivo,
      assinaturaAtivadaEm
    } = req.body;

    const emailNormalizado = String(email || '').trim().toLowerCase();
    
    // Validações básicas
    if (!emailNormalizado || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Verificar se já existe usuário com este e-mail
    const existe = await User.findOne({ email: emailNormalizado });
    if (existe) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    let prestadorId = null;
    
    // Se for prestador, criar o registro
    if (tipo === 'prestador') {
      if (!nome || !cidade || !estado) {
        return res.status(400).json({ 
          error: 'Nome, cidade e estado são obrigatórios para prestador' 
        });
      }

      if (!categoriaPrincipal && !req.body.categoria) {
        return res.status(400).json({ 
          error: 'Categoria é obrigatória para prestador' 
        });
      }

      if (!servicos || servicos.length === 0) {
        return res.status(400).json({ 
          error: 'Pelo menos um serviço é obrigatório' 
        });
      }

      if (tipoPessoa === 'fisica') {
        if (!cpf) {
          return res.status(400).json({ error: 'CPF é obrigatório para pessoa física' });
        }
        
        const cpfLimpo = cpf.replace(/[^\d]/g, '');
        if (!validarCPF(cpfLimpo)) {
          return res.status(400).json({ error: 'CPF inválido' });
        }
        
      } else if (tipoPessoa === 'juridica') {
        if (!cnpj) {
          return res.status(400).json({ error: 'CNPJ é obrigatório para pessoa jurídica' });
        }
        
        const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
        if (cnpjLimpo.length !== 14) {
          return res.status(400).json({ error: 'CNPJ inválido' });
        }

        if (!responsavel) {
          return res.status(400).json({ error: 'Responsável é obrigatório para pessoa jurídica' });
        }
      }

      if (!whatsapp) {
        return res.status(400).json({ error: 'WhatsApp é obrigatório' });
      }

      const slug = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slugFinal = slug;
      let contador = 1;
      while (await Prestador.findOne({ slug: slugFinal })) {
        slugFinal = `${slug}-${contador}`;
        contador++;
      }

      const tagsArray = tags
        ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(t => t))
        : [];

      const prestadorData = {
        nome,
        slug: slugFinal,
        email: emailNormalizado,
        tipoPessoa: tipoPessoa || 'juridica',
        categoriaPrincipal,
        servicos: servicos || [],
        categoria: req.body.categoria || null,
        cidade,
        estado,
        descricao: descricao || `Profissional em ${cidade}`,
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : null,
        telefone: telefone ? telefone.replace(/\D/g, '') : null,
        tags: tagsArray,
        verificado: verificado || false,
        dadosCNPJ: dadosCNPJ || null,
        dataVerificacaoCNPJ: dataVerificacaoCNPJ || null,

        estrelas: 0,
        avaliacoes: 0,
        totalCurtidas: 0,

        planoStatus: planoStatus || 'pendente',
        planoAtivo: planoAtivo === true,
        planoId: subscriptionId || null,
        planoExpiracao: planoAtivo === true
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,

        mercadoPago: subscriptionId ? {
          subscriptionId: subscriptionId
        } : {}
      };

      if (tipoPessoa === 'fisica') {
        prestadorData.cpf = cpf.replace(/[^\d]/g, '');
        prestadorData.cnpj = null;
      } else {
        prestadorData.cnpj = cnpj ? cnpj.replace(/[^\d]/g, '') : null;
        prestadorData.responsavel = responsavel || null;
      }

      const prestador = await Prestador.create(prestadorData);
      prestadorId = prestador._id;

      console.log(`✅ Prestador ${tipoPessoa} criado:`, prestadorId);
    }

    const user = await User.create({
      email: emailNormalizado,
      senha: senhaHash,
      tipo,
      prestadorId
    });

    console.log('✅ Usuário criado:', user._id);

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        tipo: user.tipo,
        prestadorId: prestadorId
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token: token,
      user: { 
        id: user._id, 
        email: user.email, 
        tipo: user.tipo,
        tipoPessoa: tipoPessoa
      },
      prestadorId
    });

  } catch (error) {
    console.error('❌ Erro detalhado no registro:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Erro de validação', 
        details: messages 
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field === 'cnpj' ? 'CNPJ' : field} já está cadastrado` 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGIN COM SENHA ==========
router.post('/login', async (req, res) => {
  try {
    const { email, senha, tipo } = req.body;
    const emailNormalizado = String(email || '').trim().toLowerCase();
    
    console.log('🔐 Tentativa de login:', { email: emailNormalizado, tipo });
    
    if (!emailNormalizado || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    const user = await User.findOne({ email: emailNormalizado, tipo });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', emailNormalizado);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      console.log('❌ Senha incorreta para:', emailNormalizado);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        tipo: user.tipo,
        prestadorId: user.prestadorId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
  prestadorData = await Prestador.findById(user.prestadorId);

  // ===== CORREÇÃO: EXPIRAÇÃO AUTOMÁTICA =====
  if (prestadorData && prestadorData.planoStatus === 'ativo' && prestadorData.planoExpiracao) {
    
    const agora = new Date();
    const expiracao = new Date(prestadorData.planoExpiracao);

    if (expiracao < agora) {
      console.log(`⏰ Plano expirado automaticamente para: ${prestadorData.email}`);

      prestadorData.planoStatus = 'expirado';
      prestadorData.planoAtivo = false;

      await prestadorData.save();
    }
  }
}

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        prestador: prestadorData
      }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});
// ========== VALIDAR TOKEN ==========
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let prestadorData = null;
if (user.tipo === 'prestador' && user.prestadorId) {
  prestadorData = await Prestador.findById(user.prestadorId);

  // ===== CORREÇÃO: EXPIRAÇÃO AUTOMÁTICA =====
  if (prestadorData && prestadorData.planoStatus === 'ativo' && prestadorData.planoExpiracao) {
    const agora = new Date();
    const expiracao = new Date(prestadorData.planoExpiracao);

    if (expiracao < agora) {
      console.log(`⏰ Plano expirado automaticamente para: ${prestadorData.email}`);

      prestadorData.planoStatus = 'expirado';
      prestadorData.planoAtivo = false;

      await prestadorData.save();
    }
  }
}

    res.json({
      id: user._id,
      email: user.email,
      tipo: user.tipo,
      prestador: prestadorData
    });

  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

// ========== VERIFICAR SE EMAIL JÁ EXISTE ==========
router.get('/verificar-email', async (req, res) => {
  try {
    const { email } = req.query;
    const emailNormalizado = String(email || '').trim().toLowerCase();
    
    if (!emailNormalizado) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }
    
    const user = await User.findOne({ email: emailNormalizado });
    
    res.json({ existe: !!user });
    
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== VERIFICAR SE CNPJ JÁ EXISTE ==========
router.get('/verificar-cnpj', async (req, res) => {
  try {
    const { cnpj } = req.query;
    
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    const prestador = await Prestador.findOne({ cnpj: cnpjLimpo });
    
    res.json({ existe: !!prestador });
    
  } catch (error) {
    console.error('Erro ao verificar CNPJ:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== PRE-CHECK PARA CADASTRO DE PRESTADOR ==========
/**
 * @route   POST /api/auth/precheck-cadastro-prestador
 * @desc    Verifica se o e-mail pode seguir para o fluxo de assinatura + cadastro de prestador
 * @access  Public
 */
router.post('/precheck-cadastro-prestador', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'E-mail válido é obrigatório'
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: emailNormalizado });
    const prestador = await Prestador.findOne({ email: emailNormalizado });

    // 1. Não existe nada -> pode seguir
    if (!user && !prestador) {
      return res.json({
        success: true,
        podeProsseguir: true,
        status: 'ok_para_seguir',
        message: 'E-mail disponível para cadastro de prestador'
      });
    }

    // 2. Existe prestador -> já pertence a prestador
    if (prestador) {
      return res.json({
        success: true,
        podeProsseguir: false,
        status: 'email_ja_pertence_a_prestador',
        message: 'Este e-mail já pertence a um prestador cadastrado'
      });
    }

    // 3. Existe user cliente sem prestador -> pertence a cliente
    if (user && user.tipo === 'cliente' && !user.prestadorId) {
      return res.json({
        success: true,
        podeProsseguir: false,
        status: 'email_ja_pertence_a_cliente',
        message: 'Este e-mail já está cadastrado como cliente'
      });
    }

    // 4. Existe user prestador sem prestadorId -> cadastro incompleto
    if (user && user.tipo === 'prestador' && !user.prestadorId) {
      return res.json({
        success: true,
        podeProsseguir: false,
        status: 'cadastro_incompleto',
        message: 'Existe um cadastro de prestador incompleto para este e-mail'
      });
    }

    // 5. Existe user prestador com prestadorId -> já pertence a prestador
    if (user && user.tipo === 'prestador' && user.prestadorId) {
      return res.json({
        success: true,
        podeProsseguir: false,
        status: 'email_ja_pertence_a_prestador',
        message: 'Este e-mail já pertence a um prestador cadastrado'
      });
    }

    // 6. Qualquer outro caso estranho
    return res.json({
      success: true,
      podeProsseguir: false,
      status: 'cadastro_inconsistente',
      message: 'Há uma inconsistência cadastral neste e-mail. Contate o suporte.'
    });

  } catch (error) {
    console.error('❌ Erro no precheck de cadastro de prestador:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar disponibilidade do e-mail'
    });
  }
});

// ========== ROTAS DE RECUPERAÇÃO DE SENHA ==========

/**
 * @route   POST /api/auth/esqueci-senha
 * @desc    Solicitar recuperação de senha
 * @access  Public
 */
router.post('/esqueci-senha', async (req, res) => {
  try {
   const { email } = req.body;
const emailNormalizado = String(email || '').trim().toLowerCase();

if (!emailNormalizado) {
  return res.status(400).json({ error: 'E-mail é obrigatório' });
}

console.log('🔑 Solicitação de recuperação para:', emailNormalizado);

const user = await User.findOne({ email: emailNormalizado });
    
    if (!user) {
      console.log('❌ Usuário não encontrado (mas não informamos)');
      return res.json({ 
        message: 'Se o e-mail estiver cadastrado, você receberá instruções para recuperar sua senha.' 
      });
    }

    console.log(`✅ Usuário encontrado: ${user.email}, tipo: ${user.tipo}`);

    // Buscar nome do usuário
    let nome = user.tipo === 'cliente' ? 'Cliente' : 'Prestador';
    
    if (user.tipo === 'prestador' && user.prestadorId) {
      const prestador = await Prestador.findById(user.prestadorId);
      if (prestador) {
        nome = prestador.nome;
      }
    } else if (user.tipo === 'cliente') {
      nome = user.nome || 'Cliente';
    }

    // Gerar token de recuperação
    const token = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    console.log(`🔑 Token gerado para ${email}: ${token.substring(0, 10)}...`);

    // Enviar e-mail
    try {
      await enviarEmailResetSenha(user.email, nome, token);
      console.log(`✅ Email de recuperação enviado para: ${email}`);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
    }

    res.json({ 
      message: 'Se o e-mail estiver cadastrado, você receberá instruções para recuperar sua senha.' 
    });

  } catch (error) {
    console.error('❌ Erro ao solicitar reset:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// ========== NOVA ROTA: VERIFICAR TOKEN DE RESET ==========
/**
 * @route   GET /api/auth/resetar-senha/:token
 * @desc    Verificar se o token de recuperação é válido
 * @access  Public
 */
router.get('/resetar-senha/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Verificando token:', token);
    
    if (!token) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }
    
    // Buscar usuário com o token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('❌ Token não encontrado ou expirado');
      return res.status(404).json({ 
        valid: false, 
        error: 'Token inválido ou expirado' 
      });
    }
    
    console.log('✅ Token válido para:', user.email);
    
    res.json({
      valid: true,
      email: user.email,
      tipo: user.tipo
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

// ========== NOVA ROTA: ALTERAR SENHA COM TOKEN ==========
/**
 * @route   POST /api/auth/resetar-senha
 * @desc    Alterar senha usando o token de recuperação
 * @access  Public
 */
router.post('/resetar-senha', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    
    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }
    
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    
    console.log('🔄 Resetando senha com token:', token);
    
    // Buscar usuário com o token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('❌ Token não encontrado ou expirado');
      return res.status(404).json({ error: 'Token inválido ou expirado' });
    }
    
    // Criptografar a nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    
    // Atualizar senha e limpar tokens
    user.senha = senhaHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    console.log('✅ Senha alterada com sucesso para:', user.email);
    
    res.json({
      success: true,
      message: 'Senha alterada com sucesso!'
    });
    
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

export default router;

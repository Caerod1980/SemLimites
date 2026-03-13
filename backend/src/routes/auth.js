
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // NOVO: para gerar tokens
import nodemailer from 'nodemailer'; // NOVO: para enviar emails
import User from '../models/User.js';
import Prestador from '../models/Prestador.js';

const router = express.Router();

// Configuração do transporte de email (Gmail - GRATUITO)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Seu email do Gmail
    pass: process.env.GMAIL_APP_PASSWORD // Senha de aplicativo
  }
});

// Função para validar CPF (matemática)
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validação do primeiro dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  // Validação do segundo dígito
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
      categoria,
      cidade,
      descricao,
      whatsapp,
      telefone,
      tags,
      verificado,
      dadosCNPJ,
      dataVerificacaoCNPJ
    } = req.body;
    
    // Validações básicas
    if (!email || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Verificar se já existe usuário com este e-mail
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    let prestadorId = null;
    
    // Se for prestador, criar o registro
    if (tipo === 'prestador') {
      // Validar campos obrigatórios do prestador
      if (!nome || !categoria || !cidade) {
        return res.status(400).json({ 
          error: 'Nome, categoria e cidade são obrigatórios para prestador' 
        });
      }

      // Validação específica por tipo de pessoa
      if (tipoPessoa === 'fisica') {
        if (!cpf) {
          return res.status(400).json({ error: 'CPF é obrigatório para pessoa física' });
        }
        
        const cpfLimpo = cpf.replace(/[^\d]/g, '');
        if (!validarCPF(cpfLimpo)) {
          return res.status(400).json({ error: 'CPF inválido' });
        }
        
        // NOTA: Não verificamos unicidade do CPF
      } else if (tipoPessoa === 'juridica') {
        if (!cnpj) {
          return res.status(400).json({ error: 'CNPJ é obrigatório para pessoa jurídica' });
        }
        
        const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
        if (cnpjLimpo.length !== 14) {
          return res.status(400).json({ error: 'CNPJ inválido' });
        }
        
        // NOTA: Não verificamos unicidade do CNPJ
      }

      // Criar o prestador com todos os campos
      const prestadorData = {
        nome,
        slug: nome.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, ''),
        email,
        tipoPessoa: tipoPessoa || 'juridica',
        categoria,
        cidade,
        descricao: descricao || `Profissional de ${categoria} em ${cidade}`,
        whatsapp: whatsapp || null,
        telefone: telefone || null,
        tags: tags || [],
        verificado: verificado || false,
        dadosCNPJ: dadosCNPJ || null,
        dataVerificacaoCNPJ: dataVerificacaoCNPJ || null
      };

      // Adicionar campos específicos
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

    // Criar usuário
    const user = await User.create({
      email,
      senha: senhaHash,
      tipo,
      prestadorId
    });

    console.log('✅ Usuário criado:', user._id);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
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
    
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGIN COM SENHA ==========
router.post('/login', async (req, res) => {
  try {
    const { email, senha, tipo } = req.body;
    
    console.log('🔐 Tentativa de login:', { email, tipo });
    
    if (!email || !senha || !tipo) {
      return res.status(400).json({ error: 'E-mail, senha e tipo são obrigatórios' });
    }

    // Buscar usuário
    const user = await User.findOne({ email, tipo });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      console.log('❌ Senha incorreta para:', email);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        tipo: user.tipo 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Buscar dados do prestador se for o caso
    let prestadorData = null;
    if (user.tipo === 'prestador' && user.prestadorId) {
      prestadorData = await Prestador.findById(user.prestadorId);
      console.log('📋 Dados do prestador carregados:', prestadorData?._id);
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

// ========== NOVAS ROTAS - ESQUECI A SENHA ==========

/**
 * @route   POST /api/auth/esqueci-senha
 * @desc    Solicitar recuperação de senha
 * @access  Public
 */
router.post('/esqueci-senha', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    console.log('🔑 Solicitação de recuperação para:', email);

    // Buscar usuário (apenas prestadores por enquanto)
    const user = await User.findOne({ email, tipo: 'prestador' });
    
    // Por segurança, sempre retornamos a mesma mensagem
    if (!user) {
      console.log('❌ Usuário não encontrado (mas não informamos)');
      return res.json({ 
        message: 'Se o e-mail estiver cadastrado, você receberá instruções para recuperar sua senha.' 
      });
    }

    // Buscar dados do prestador para ter o nome
    let nome = 'Prestador';
    if (user.prestadorId) {
      const prestador = await Prestador.findById(user.prestadorId);
      if (prestador) {
        nome = prestador.nome;
      }
    }

    // Gerar token aleatório
    const token = crypto.randomBytes(32).toString('hex');
    
    // Salvar token no banco (expira em 1 hora)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    console.log(`🔑 Token gerado para ${email}: ${token.substring(0, 10)}...`);

    // Enviar email
    try {
      await enviarEmailResetSenha(user.email, nome, token);
      console.log(`✅ Email de recuperação enviado para: ${email}`);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      // Se o email falhar, ainda assim não informamos o usuário
    }

    res.json({ 
      message: 'Se o e-mail estiver cadastrado, você receberá instruções para recuperar sua senha.' 
    });

  } catch (error) {
    console.error('❌ Erro ao solicitar reset:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

/**
 * @route   GET /api/auth/resetar-senha/:token
 * @desc    Verificar se o token é válido
 * @access  Public
 */
router.get('/resetar-senha/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Verificando token:', token.substring(0, 10) + '...');
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Token inválido ou expirado');
      return res.status(400).json({ error: 'Link inválido ou expirado' });
    }

    console.log('✅ Token válido para:', user.email);
    res.json({ valid: true });

  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

/**
 * @route   POST /api/auth/resetar-senha
 * @desc    Resetar a senha com o token
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

    console.log('🔄 Resetando senha com token:', token.substring(0, 10) + '...');

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Token inválido ou expirado');
      return res.status(400).json({ error: 'Link inválido ou expirado' });
    }

    // Criptografar nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    user.senha = senhaHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Senha alterada com sucesso para: ${user.email}`);

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

export default router;

// services/emailRecuperacao.js
import nodemailer from 'nodemailer';

// Configuração do Gmail (gratuito)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Seu email do Gmail
    pass: process.env.GMAIL_APP_PASSWORD // Senha de aplicativo (NÃO é a senha normal)
  }
});

export async function enviarEmailResetSenha(email, nome, token) {
  const resetLink = `${process.env.FRONTEND_URL}/resetar-senha/${token}`;
  
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

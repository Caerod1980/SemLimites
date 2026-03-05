import sgMail from '@sendgrid/mail';

// Configura com a chave do ambiente (Azure)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envia e-mail com link mágico personalizado por tipo de usuário
 * @param {string} email - E-mail do destinatário
 * @param {string} token - Token único de autenticação
 * @param {string} tipo - Tipo de usuário ('cliente' ou 'prestador')
 * @returns {Promise<Object>}
 */
export async function sendMagicLinkEmail(email, token, tipo = 'cliente') {
  const magicLink = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  
  // Templates personalizados por tipo de usuário
  const templates = {
    cliente: {
      subject: '🔐 Seu link de acesso ao SemLimites',
      greeting: 'Olá, cliente!',
      intro: 'Você solicitou um link de acesso ao SemLimites.',
      instructions: 'Clique no botão abaixo para acessar sua conta e começar a buscar prestadores de serviços:',
      buttonText: 'Acessar minha conta',
      footerNote: 'Este link é exclusivo para clientes e permite que você contrate prestadores e avalie serviços.'
    },
    prestador: {
      subject: '🔐 Acesso à Área do Prestador',
      greeting: 'Olá, prestador!',
      intro: 'Você solicitou acesso à sua área de prestador no SemLimites.',
      instructions: 'Clique no botão abaixo para acessar seu dashboard e gerenciar seus serviços:',
      buttonText: 'Acessar dashboard',
      footerNote: 'Na sua área você pode editar seu perfil, cadastrar serviços e ver avaliações.'
    }
  };

  const t = templates[tipo] || templates.cliente;
  
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .card {
            background: white;
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          
          .logo-circle {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }
          
          .logo-circle span {
            color: white;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          
          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 8px;
            text-align: center;
          }
          
          .subtitle {
            font-size: 16px;
            color: #64748b;
            text-align: center;
            margin-bottom: 32px;
          }
          
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #0f172a;
            margin: 0 0 16px;
          }
          
          p {
            font-size: 16px;
            line-height: 24px;
            color: #334155;
            margin: 0 0 20px;
          }
          
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 20px -10px rgba(79, 70, 229, 0.4);
          }
          
          .info-box {
            background: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            margin: 24px 0;
          }
          
          .info-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
          }
          
          .info-icon {
            width: 24px;
            height: 24px;
            background: #e0e7ff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4f46e5;
            font-weight: 600;
          }
          
          .info-text {
            flex: 1;
            font-size: 14px;
            color: #475569;
          }
          
          .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
          }
          
          .footer p {
            font-size: 12px;
            color: #94a3b8;
            margin: 4px 0;
          }
          
          .footer-links {
            margin-top: 16px;
          }
          
          .footer-links a {
            color: #64748b;
            text-decoration: none;
            font-size: 12px;
            margin: 0 8px;
          }
          
          .footer-links a:hover {
            color: #4f46e5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <div class="logo-circle">
                <span>SL</span>
              </div>
              <h1>SemLimites</h1>
              <div class="subtitle">Conectando prestadores de serviços</div>
            </div>
            
            <h2>${t.greeting}</h2>
            
            <p>${t.intro}</p>
            
            <p>${t.instructions}</p>
            
            <div class="button-container">
              <a href="${magicLink}" class="button">${t.buttonText}</a>
            </div>
            
            <div class="info-box">
              <div class="info-item">
                <div class="info-icon">⏰</div>
                <div class="info-text">Este link é válido por <strong>1 hora</strong></div>
              </div>
              <div class="info-item">
                <div class="info-icon">🔒</div>
                <div class="info-text">Link de uso único e exclusivo</div>
              </div>
              <div class="info-item">
                <div class="info-icon">💡</div>
                <div class="info-text">${t.footerNote}</div>
              </div>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin: 24px 0 0;">
              Se você não solicitou este acesso, ignore este e-mail ou entre em contato com nosso suporte.
            </p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} SemLimites. Todos os direitos reservados.</p>
              <p style="font-size: 12px; color: #94a3b8;">Feito com ❤️ em Bauru, SP</p>
              <div class="footer-links">
                <a href="#">Termos</a>
                <a href="#">Privacidade</a>
                <a href="#">Suporte</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
SemLimites - Conectando prestadores de serviços

${t.greeting}

${t.intro}

${t.instructions}

Acesse sua conta através do link abaixo (válido por 1 hora):
${magicLink}

⏰ Este link é válido por 1 hora
🔒 Link de uso único e exclusivo
💡 ${t.footerNote}

Se você não solicitou este acesso, ignore este e-mail.

© ${new Date().getFullYear()} SemLimites. Todos os direitos reservados.
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log(`✅ E-mail ${tipo} enviado com sucesso para: ${email}`);
    console.log(`📧 Template: ${tipo}, ID: ${response[0]?.headers['x-message-id'] || 'N/A'}`);
    return { success: true, messageId: response[0]?.headers['x-message-id'] };
  } catch (error) {
    console.error('❌ Erro detalhado ao enviar e-mail:');
    console.error('- Mensagem:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Corpo:', error.response.body);
      
      // Tratamento específico para erros comuns
      if (error.response.status === 401) {
        throw new Error('Erro de autenticação com SendGrid. Verifique a chave API.');
      }
      if (error.response.status === 403) {
        throw new Error('Acesso negado. Verifique as permissões da chave API.');
      }
      if (error.response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      }
    }
    
    throw new Error('Falha ao enviar e-mail de autenticação');
  }
}

/**
 * Envia e-mail de boas-vindas para novos usuários
 * @param {string} email - E-mail do usuário
 * @param {string} nome - Nome do usuário (opcional)
 * @param {string} tipo - Tipo de usuário
 */
export async function sendWelcomeEmail(email, nome = '', tipo = 'cliente') {
  const templates = {
    cliente: {
      subject: 'Bem-vindo ao SemLimites!',
      message: 'Estamos felizes em ter você conosco. Agora você pode encontrar os melhores prestadores de serviços na sua região.'
    },
    prestador: {
      subject: 'Bem-vindo à equipe SemLimites!',
      message: 'Sua conta foi criada com sucesso. Agora você pode gerenciar seus serviços e começar a receber clientes.'
    }
  };

  const t = templates[tipo] || templates.cliente;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: t.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bem-vindo ao SemLimites!</h2>
        <p>Olá ${nome ? nome : 'usuário'},</p>
        <p>${t.message}</p>
        <p>Qualquer dúvida, estamos à disposição.</p>
        <p>Equipe SemLimites</p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ E-mail de boas-vindas enviado para: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de boas-vindas:', error);
    return false;
  }
}

export default {
  sendMagicLinkEmail,
  sendWelcomeEmail
};

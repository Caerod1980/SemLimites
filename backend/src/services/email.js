import sgMail from '@sendgrid/mail';

// Configura com a chave do ambiente (Azure)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendMagicLinkEmail(email, token) {
  const magicLink = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: '🔐 Seu link de acesso ao SemLimites',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5; font-size: 28px; margin: 0;">SemLimites</h1>
          <p style="color: #64748b; font-size: 16px; margin: 5px 0;">Conectando prestadores de serviços</p>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 20px 0;">Olá!</h2>
          
          <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
            Você solicitou um link de acesso ao SemLimites. Clique no botão abaixo para entrar:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" 
               style="display: inline-block; background: #4f46e5; color: white; 
                      padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                      font-weight: 600; font-size: 16px;">
              Acessar minha conta
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            ⏰ Este link é válido por <strong>1 hora</strong>.
          </p>
          
          <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">
            Se você não solicitou este acesso, ignore este e-mail.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} SemLimites. Todos os direitos reservados.</p>
        </div>
      </div>
    `,
    text: `Acesse sua conta no SemLimites: ${magicLink} (válido por 1 hora)`
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ E-mail enviado com sucesso para: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro detalhado ao enviar e-mail:');
    console.error('- Mensagem:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Corpo:', error.response.body);
    }
    
    throw new Error('Falha ao enviar e-mail de autenticação');
  }
}

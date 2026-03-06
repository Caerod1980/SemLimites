/**
 * Serviço de integração com WhatsApp
 * Por enquanto, apenas gera a mensagem para o prestador copiar
 * Futuramente pode integrar com API do WhatsApp Business
 */

/**
 * Gera link do WhatsApp com mensagem pré-preenchida
 * @param {string} telefone - Número do WhatsApp (com código do país)
 * @param {string} mensagem - Mensagem a ser enviada
 * @returns {string} Link do WhatsApp
 */
export function gerarLinkWhatsApp(telefone, mensagem) {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  return `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Envia mensagem via WhatsApp (simulado)
 * Na versão real, integraria com API do WhatsApp Business
 * @param {string} telefone - Número do WhatsApp
 * @param {string} mensagem - Mensagem a ser enviada
 * @returns {Promise<Object>}
 */
export async function sendWhatsAppMessage(telefone, mensagem) {
  console.log('📱 Simulando envio de WhatsApp:');
  console.log(`Para: ${telefone}`);
  console.log(`Mensagem: ${mensagem}`);
  console.log(`Link: ${gerarLinkWhatsApp(telefone, mensagem)}`);
  
  // Simular delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: 'Mensagem simulada com sucesso',
    link: gerarLinkWhatsApp(telefone, mensagem)
  };
}

export default {
  gerarLinkWhatsApp,
  sendWhatsAppMessage
};

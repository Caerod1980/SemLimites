// /src/middlewares/assinatura.js
import Prestador from '../models/Prestador.js';

/**
 * Função para verificar se o plano expirou baseado na data de ativação
 * @param {Object} prestador - Documento do prestador
 * @returns {boolean} - True se expirou, false se ainda válido
 */
function verificarExpiracaoPorData(prestador) {
    // Se não tem data de ativação, não expirou
    if (!prestador.assinaturaAtivadaEm) {
        return false;
    }
    
    // Calcular data de expiração (30 dias após ativação)
    const dataAtivacao = new Date(prestador.assinaturaAtivadaEm);
    const dataExpiracao = new Date(dataAtivacao);
    dataExpiracao.setDate(dataAtivacao.getDate() + 30);
    
    // Se já passou da data de expiração
    if (dataExpiracao < new Date()) {
        return true;
    }
    
    return false;
}

/**
 * Middleware para verificar se o prestador tem assinatura ativa
 */
export async function verificarAssinatura(req, res, next) {
  try {
    // Pular verificação para rotas públicas
    const rotasPublicas = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/esqueci-senha',
      '/api/auth/resetar-senha',
      '/api/webhooks',
      '/health',
      '/api/mercadopago/public-key',
      '/api/assinatura/criar-assinatura',  // Permite criar assinatura
      '/api/assinatura/webhooks',          // Webhook é público
      '/api/assinatura/status-preferencia' // Consulta de status
    ];
    
    const isPublicRoute = rotasPublicas.some(rota => req.path.startsWith(rota));
    
    if (isPublicRoute) {
      return next();
    }
    
    // Verificar se o usuário está autenticado
    if (!req.usuario) {
      return next();
    }
    
    // Se for cliente, não precisa verificar assinatura
    if (req.usuario.tipo === 'cliente') {
      return next();
    }
    
    // Para prestadores, verificar assinatura
    if (req.usuario.tipo === 'prestador') {
      const prestador = await Prestador.findById(req.usuario.prestadorId);
      
      if (!prestador) {
        return res.status(404).json({ error: 'Prestador não encontrado' });
      }
      
      // ===== NOVA LÓGICA DE EXPIRAÇÃO =====
      let expirado = false;
      
      // 1. Verificar por planoExpiracao (se existir no banco)
      if (prestador.planoExpiracao && prestador.planoExpiracao < new Date()) {
        expirado = true;
      }
      
      // 2. Se não tem planoExpiracao, verificar por assinaturaAtivadaEm
      if (!expirado && prestador.assinaturaAtivadaEm) {
        expirado = verificarExpiracaoPorData(prestador);
      }
      
      // 3. Atualizar status se expirou
      if (expirado && (prestador.planoAtivo === true || prestador.planoStatus === 'ativo')) {
        console.log(`⚠️ Plano expirado para prestador: ${prestador.nome} (ID: ${prestador._id})`);
        prestador.planoAtivo = false;
        prestador.planoStatus = 'expirado';
        await prestador.save();
      }
      
      // 4. Verificar se o plano está ativo
      const planoAtivo = prestador.planoAtivo === true && prestador.planoStatus === 'ativo';
      
      if (!planoAtivo) {
        // Lista de rotas que podem ser acessadas mesmo com plano inativo
        const rotasPermitidasInativo = [
          '/api/prestadores/perfil',        // Editar perfil básico
          '/api/prestadores/foto',          // Upload de foto
          '/api/upload',                    // Upload de arquivos
          '/api/assinatura/status-prestador', // Verificar status
          '/api/assinatura/cancelar-assinatura', // Cancelar assinatura
          '/api/auth/me'                    // Informações do usuário
        ];
        
        const isRotaPermitida = rotasPermitidasInativo.some(rota => req.path.startsWith(rota));
        
        if (!isRotaPermitida) {
          console.log(`🚫 Acesso negado para prestador ${prestador._id} - Plano: ${prestador.planoStatus}`);
          return res.status(403).json({ 
            error: 'Assinatura necessária',
            message: prestador.planoStatus === 'expirado' 
              ? 'Sua assinatura expirou. Renove para continuar usando a plataforma.'
              : 'Você precisa ter uma assinatura ativa para acessar esta funcionalidade',
            planoStatus: prestador.planoStatus,
            redirecionarPara: '/dashboard'
          });
        }
      }
      
      // Atualizar req.usuario com o status mais recente
      req.usuario.planoStatus = prestador.planoStatus;
      req.usuario.planoAtivo = prestador.planoAtivo;
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Erro no middleware de assinatura:', error);
    next();
  }
}

// ===== FUNÇÃO AUXILIAR PARA VERIFICAR EXPIRAÇÃO =====
export function isPlanoExpirado(prestador) {
    // Verificar por planoExpiracao
    if (prestador.planoExpiracao && prestador.planoExpiracao < new Date()) {
        return true;
    }
    
    // Verificar por assinaturaAtivadaEm
    if (prestador.assinaturaAtivadaEm) {
        const dataExpiracao = new Date(prestador.assinaturaAtivadaEm);
        dataExpiracao.setDate(dataExpiracao.getDate() + 30);
        return dataExpiracao < new Date();
    }
    
    return false;
}

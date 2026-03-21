// routes/admin.js - VERSÃO CORRIGIDA (ES Module)
import express from 'express';
import { 
    getStats, 
    getPrestadoresPorCidade, 
    getPrestadoresPorCidadeDetalhado, 
    buscarPrestador, 
    excluirPrestador, 
    buscarCliente, 
    excluirCliente, 
    getUltimasAvaliacoes 
} from '../controllers/adminController.js';
import { isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Todas as rotas admin são protegidas pelo middleware isAdmin
router.use(isAdmin);

// Estatísticas gerais
router.get('/stats', getStats);

// Prestadores por cidade
router.get('/prestadores-por-cidade', getPrestadoresPorCidade);

// Prestadores de uma cidade específica
router.get('/prestadores/cidade/:cidade', getPrestadoresPorCidadeDetalhado);

// Buscar prestador por nome/email
router.get('/buscar-prestador', buscarPrestador);

// Excluir prestador
router.delete('/excluir-prestador/:id', excluirPrestador);

// Buscar cliente por email
router.get('/buscar-cliente', buscarCliente);

// Excluir cliente
router.delete('/excluir-cliente/:id', excluirCliente);

// Últimas avaliações
router.get('/avaliacoes-recentes', getUltimasAvaliacoes);

export default router;

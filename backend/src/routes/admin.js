// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

// Todas as rotas admin são protegidas pelo middleware isAdmin
router.use(isAdmin);

// Estatísticas gerais
router.get('/stats', adminController.getStats);

// Prestadores por cidade
router.get('/prestadores-por-cidade', adminController.getPrestadoresPorCidade);

// Prestadores de uma cidade específica
router.get('/prestadores/cidade/:cidade', adminController.getPrestadoresPorCidadeDetalhado);

// Buscar prestador por nome/email
router.get('/buscar-prestador', adminController.buscarPrestador);

// Excluir prestador
router.delete('/excluir-prestador/:id', adminController.excluirPrestador);

// Buscar cliente por email
router.get('/buscar-cliente', adminController.buscarCliente);

// Excluir cliente
router.delete('/excluir-cliente/:id', adminController.excluirCliente);

// Últimas avaliações
router.get('/avaliacoes-recentes', adminController.getUltimasAvaliacoes);

module.exports = router;

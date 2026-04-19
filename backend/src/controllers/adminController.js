// controllers/adminController.js - VERSÃO CORRIGIDA (ES Module)
import Prestador from '../models/Prestador.js';
import User from '../models/User.js';
import Servico from '../models/Servico.js';
import { cancelarAssinaturaRecorrente } from '../services/mercadopago.js';

// ========== ESTATÍSTICAS GERAIS ==========
export const getStats = async (req, res) => {
    try {
        const [clientes, prestadores, servicos, avaliacoes] = await Promise.all([
            User.countDocuments({ tipo: 'cliente' }),
            User.countDocuments({ tipo: 'prestador' }),
            Servico.countDocuments(),
            Servico.countDocuments({ status: 'avaliado' })
        ]);

        res.json({ clientes, prestadores, servicos, avaliacoes });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
};

// ========== PRESTADORES POR CIDADE ==========
export const getPrestadoresPorCidade = async (req, res) => {
    try {
        const prestadores = await Prestador.aggregate([
            {
                $match: {
                    cidade: { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: {
                        cidade: '$cidade',
                        estado: '$estado'
                    },
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    cidade: '$_id.cidade',
                    estado: { $ifNull: ['$_id.estado', ''] },
                    total: 1
                }
            },
            { $sort: { total: -1, cidade: 1 } }
        ]);

        res.json(prestadores);
    } catch (error) {
        console.error('Erro ao buscar prestadores por cidade:', error);
        res.status(500).json({ error: 'Erro ao carregar dados' });
    }
};
// ========== LISTAR PRESTADORES DE UMA CIDADE ==========
export const getPrestadoresPorCidadeDetalhado = async (req, res) => {
    try {
        const { cidade } = req.params;

        const prestadores = await Prestador.find({
            cidade: { $regex: new RegExp(`^${cidade}$`, 'i') }
        })
        .select('nome email cidade estado whatsapp createdAt cpf cnpj verificado planoStatus planoAtivo planoExpiracao formaPagamentoAtual tipoPlano')
        .sort({ nome: 1 });

        res.json(prestadores);
    } catch (error) {
        console.error('Erro ao buscar prestadores da cidade:', error);
        res.status(500).json({ error: 'Erro ao carregar dados' });
    }
};
// ========== PRESTADORES PENDENTES / CANCELADOS ==========
export const getPrestadoresPendentes = async (req, res) => {
    try {
        const prestadores = await Prestador.find({
            planoStatus: { $in: ['pendente', 'cancelado'] }
        })
        .select('nome email cidade estado whatsapp planoStatus planoAtivo planoExpiracao formaPagamentoAtual tipoPlano createdAt')
        .sort({ planoExpiracao: 1, nome: 1 });

        res.json(prestadores);
    } catch (error) {
        console.error('Erro ao buscar prestadores pendentes:', error);
        res.status(500).json({ error: 'Erro ao carregar prestadores pendentes' });
    }
};
// ========== BUSCAR PRESTADOR ==========
export const buscarPrestador = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Digite pelo menos 2 caracteres para buscar' });
        }

        const prestador = await Prestador.findOne({
    $or: [
        { nome: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
    ]
}).select('nome email cidade estado whatsapp createdAt cpf cnpj verificado mercadoPago planoStatus planoAtivo planoExpiracao formaPagamentoAtual tipoPlano');

        if (!prestador) {
            return res.json({ encontrado: false, mensagem: 'Prestador não encontrado' });
        }

        res.json({ encontrado: true, prestador });
    } catch (error) {
        console.error('Erro ao buscar prestador:', error);
        res.status(500).json({ error: 'Erro na busca' });
    }
};

// ========== EXCLUIR PRESTADOR ==========
export const excluirPrestador = async (req, res) => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        const user = await User.findById(id).session(session);

        if (!user || user.tipo !== 'prestador') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Prestador não encontrado' });
        }

        if (!user.prestadorId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Prestador não vinculado ao usuário' });
        }

        const prestador = await Prestador.findById(user.prestadorId).session(session);

        if (!prestador) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Documento do prestador não encontrado' });
        }

        let assinaturaCancelada = false;
        const subscriptionId = prestador?.mercadoPago?.subscriptionId || prestador?.planoId;

        if (subscriptionId) {
            console.log(`🔄 [ADMIN] Cancelando assinatura: ${subscriptionId}`);

            const resultado = await cancelarAssinaturaRecorrente(subscriptionId);

            if (!resultado || !resultado.success) {
                await session.abortTransaction();
                session.endSession();

                return res.status(400).json({
                    success: false,
                    error: 'Não foi possível cancelar a assinatura no Mercado Pago. Exclusão abortada.'
                });
            }

            console.log('✅ [ADMIN] Assinatura cancelada com sucesso');
            assinaturaCancelada = true;
        }

        const servicos = await Servico.find({ prestadorId: prestador._id }).session(session);

        if (servicos.length > 0) {
            await Servico.deleteMany({ prestadorId: prestador._id }).session(session);
        }

        await Prestador.findByIdAndDelete(prestador._id).session(session);
        await User.findByIdAndDelete(user._id).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Prestador excluído permanentemente',
            assinaturaCancelada,
            servicosExcluidos: servicos.length
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Erro ao excluir prestador:', error);
        res.status(500).json({ error: 'Erro ao excluir prestador' });
    }
};
// ========== BUSCAR CLIENTE ==========
export const buscarCliente = async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Digite um e-mail válido' });
        }

        const cliente = await User.findOne({
            tipo: 'cliente',
            email: { $regex: `^${email}$`, $options: 'i' }
        }).select('email nome createdAt');

        if (!cliente) {
            return res.json({ encontrado: false, mensagem: 'Cliente não encontrado' });
        }

        res.json({
            encontrado: true,
            cliente: {
                id: cliente._id,
                email: cliente.email,
                nome: cliente.nome || cliente.email.split('@')[0],
                dataCadastro: cliente.createdAt,
                totalFavoritos: 0 // TODO: implementar contagem de favoritos se necessário
            }
        });
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro na busca' });
    }
};

// ========== EXCLUIR CLIENTE ==========
export const excluirCliente = async (req, res) => {
    try {
        const { id } = req.params;
        
        const cliente = await User.findById(id);
        
        if (!cliente || cliente.tipo !== 'cliente') {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // TODO: Excluir favoritos do cliente se houver tabela separada
        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Cliente excluído permanentemente'
        });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
};

// ========== ÚLTIMAS AVALIAÇÕES ==========
export const getUltimasAvaliacoes = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const avaliacoes = await Servico.find({ status: 'avaliado', 'avaliacao.estrelas': { $exists: true } })
            .sort({ 'avaliacao.dataAvaliacao': -1 })
            .limit(limit)
            .populate('prestadorId', 'nome')
            .select('clienteNome avaliacao prestadorId titulo');

        const resultado = avaliacoes.map(servico => ({
            id: servico._id,
            estrelas: servico.avaliacao.estrelas,
            comentario: servico.avaliacao.comentario || '',
            cliente: servico.clienteNome,
            profissional: servico.prestadorId?.nome || 'Profissional',
            tituloServico: servico.titulo,
            data: servico.avaliacao.dataAvaliacao
        }));

        res.json(resultado);
    } catch (error) {
        console.error('Erro ao buscar últimas avaliações:', error);
        res.status(500).json({ error: 'Erro ao carregar avaliações' });
    }
};

// controllers/adminController.js - VERSÃO CORRIGIDA (ES Module)
import User from '../models/User.js';
import Servico from '../models/Servico.js';

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
        const prestadores = await User.aggregate([
            { $match: { tipo: 'prestador', cidade: { $exists: true, $ne: '' } } },
            { $group: {
                _id: { cidade: '$cidade', estado: '$estado' },
                total: { $sum: 1 }
            }},
            { $sort: { total: -1 } },
            { $project: {
                cidade: '$_id.cidade',
                estado: '$_id.estado',
                total: 1,
                _id: 0
            }}
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
        
        const prestadores = await User.find({
            tipo: 'prestador',
            cidade: { $regex: new RegExp(`^${cidade}$`, 'i') }
        }).select('nome email cidade estado whatsapp createdAt cpf cnpj verificado');

        res.json(prestadores);
    } catch (error) {
        console.error('Erro ao buscar prestadores da cidade:', error);
        res.status(500).json({ error: 'Erro ao carregar dados' });
    }
};

// ========== BUSCAR PRESTADOR ==========
export const buscarPrestador = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Digite pelo menos 2 caracteres para buscar' });
        }

        const prestador = await User.findOne({
            tipo: 'prestador',
            $or: [
                { nome: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        }).select('nome email cidade estado whatsapp createdAt cpf cnpj verificado');

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
        
        const prestador = await User.findById(id).session(session);
        
        if (!prestador || prestador.tipo !== 'prestador') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Prestador não encontrado' });
        }

        // Buscar e excluir todos os serviços do prestador
        const servicos = await Servico.find({ prestadorId: id }).session(session);
        if (servicos.length > 0) {
            await Servico.deleteMany({ prestadorId: id }).session(session);
        }

        // Excluir o usuário
        await User.findByIdAndDelete(id).session(session);

        let assinaturaCancelada = false;
        // Se tiver assinaturaId, cancelar no Mercado Pago
        if (prestador.assinaturaId) {
            try {
                // TODO: Implementar cancelamento no Mercado Pago
                assinaturaCancelada = true;
            } catch (mpError) {
                console.error('Erro ao cancelar assinatura:', mpError);
            }
        }

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

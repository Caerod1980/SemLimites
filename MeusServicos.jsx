import React, { useState, useEffect } from 'react';
import { servicosAPI } from './api';
import NovoServico from './NovoServico';

function MeusServicos() {
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [copiado, setCopiado] = useState(null);

    useEffect(() => {
        carregarServicos();
    }, []);

    const carregarServicos = async () => {
        try {
            setLoading(true);
            const data = await servicosAPI.listar();
            setServicos(data.servicos || []);
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            alert('Erro ao carregar serviços');
        } finally {
            setLoading(false);
        }
    };

    const handleCopiarLink = (link) => {
        navigator.clipboard.writeText(link);
        setCopiado(link);
        setTimeout(() => setCopiado(null), 2000);
    };

    const handleEnviarWhatsApp = (servico) => {
        const mensagem = encodeURIComponent(
            `Olá ${servico.clienteNome}! 👋\n\n` +
            `Você contratou ${servico.titulo} pelo SemLimites.\n\n` +
            `Por favor, avalie o serviço clicando no link abaixo:\n` +
            `${servico.linkAvaliacao}\n\n` +
            `Sua avaliação é muito importante para nós! ⭐`
        );
        window.open(`https://wa.me/${servico.clienteWhatsApp}?text=${mensagem}`, '_blank');
    };

    const handleReenviarLink = async (id) => {
        try {
            const data = await servicosAPI.reenviarLink(id);
            alert('✅ Link gerado com sucesso!');
            // Atualizar o serviço na lista
            setServicos(servicos.map(s => 
                s._id === id ? { ...s, linkAvaliacao: data.linkAvaliacao } : s
            ));
        } catch (error) {
            alert('Erro ao gerar novo link');
        }
    };

    const handleExcluir = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
        
        try {
            await servicosAPI.excluir(id);
            setServicos(servicos.filter(s => s._id !== id));
            alert('✅ Serviço excluído com sucesso!');
        } catch (error) {
            alert('Erro ao excluir serviço');
        }
    };

    const servicosFiltrados = servicos.filter(s => {
        if (filtro === 'todos') return true;
        return s.status === filtro;
    });

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Carregando serviços...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Meus Serviços</h2>
                <button
                    onClick={() => setMostrarForm(!mostrarForm)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Serviço
                </button>
            </div>

            {mostrarForm && (
                <NovoServico 
                    onSucesso={() => {
                        setMostrarForm(false);
                        carregarServicos();
                    }} 
                />
            )}

            {/* Filtros */}
            <div className="flex gap-2 border-b border-slate-200 pb-4">
                {['todos', 'aguardando', 'avaliado', 'expirado'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                            filtro === f
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        {f === 'todos' ? 'Todos' : 
                         f === 'aguardando' ? 'Aguardando' :
                         f === 'avaliado' ? 'Avaliados' : 'Expirados'}
                    </button>
                ))}
            </div>

            {servicosFiltrados.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                    <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium text-slate-700 mb-2">Nenhum serviço encontrado</p>
                    <p className="text-sm text-slate-500 mb-6">Cadastre seu primeiro serviço para começar a receber avaliações.</p>
                    <button
                        onClick={() => setMostrarForm(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                    >
                        + Novo Serviço
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {servicosFiltrados.map(servico => (
                        <CardServico 
                            key={servico._id} 
                            servico={servico}
                            onCopiarLink={handleCopiarLink}
                            onEnviarWhatsApp={handleEnviarWhatsApp}
                            onReenviarLink={handleReenviarLink}
                            onExcluir={handleExcluir}
                            copiado={copiado}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CardServico({ servico, onCopiarLink, onEnviarWhatsApp, onReenviarLink, onExcluir, copiado }) {
    const s = servico;
    const dataRealizacao = s.dataRealizacao ? new Date(s.dataRealizacao).toLocaleDateString('pt-BR') : 'Data não informada';
    
    const statusConfig = {
        aguardando: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Aguardando avaliação', icon: '⏳' },
        avaliado: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Avaliado', icon: '✅' },
        expirado: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'Expirado', icon: '⌛' }
    };
    
    const status = statusConfig[s.status] || statusConfig.aguardando;

    return (
        <div className={`bg-white rounded-2xl border ${status.border} overflow-hidden hover:shadow-lg transition-all`}>
            {/* Cabeçalho do card */}
            <div className={`${status.bg} px-6 py-4 border-b ${status.border} flex justify-between items-center`}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{status.icon}</span>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{s.titulo}</h3>
                        <p className="text-sm text-slate-600">
                            {s.clienteNome} • {dataRealizacao}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}>
                    {status.label}
                </span>
            </div>

            {/* Corpo do card */}
            <div className="p-6 space-y-4">
                {/* Descrição */}
                <div>
                    <p className="text-sm text-slate-600">{s.descricao}</p>
                </div>

                {/* Valor (se houver) */}
                {s.valor > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-700">Valor:</span>
                        <span className="text-emerald-600 font-semibold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.valor)}
                        </span>
                    </div>
                )}

                {/* Link de avaliação (se aguardando) */}
                {s.status === 'aguardando' && (
                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                        <p className="text-sm font-medium text-indigo-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Link de avaliação
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={s.linkAvaliacao}
                                readOnly
                                className="flex-1 px-4 py-3 bg-white rounded-xl border border-indigo-200 text-sm font-mono"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onCopiarLink(s.linkAvaliacao)}
                                    className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                                        copiado === s.linkAvaliacao
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                                    }`}
                                    title="Copiar link"
                                >
                                    {copiado === s.linkAvaliacao ? '✓ Copiado!' : '📋 Copiar'}
                                </button>
                                <button
                                    onClick={() => onEnviarWhatsApp(s)}
                                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-2"
                                    title="Enviar via WhatsApp"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.85.502 3.647 1.425 5.204L2.038 21.5l4.379-1.282c1.5.852 3.2 1.321 5.022 1.321 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18c-1.502 0-2.93-.421-4.166-1.166l-.3-.178-2.7.79.79-2.6-.164-.312A7.968 7.968 0 014 12c0-4.411 3.589-8 8.001-8 4.41 0 7.999 3.589 7.999 8 0 4.412-3.589 8-7.999 8z"/>
                                        <path d="M13.099 14.302l-1.8-.8c-.3-.1-.6-.1-.8.1l-1.2 1.4c-.1.1-.2.1-.3.1-.1 0-.2 0-.3-.1-1.3-.8-2.4-1.9-3.2-3.2 0-.1 0-.2.1-.3l1.4-1.2c.1-.1.2-.3.1-.5l-.8-1.8c0-.2-.2-.4-.4-.4h-1.4c-.2 0-.4.2-.4.4 0 2.8 1.4 5.4 3.7 7 2.3 1.6 5 2.1 7.6 1.2.2-.1.4-.3.4-.5v-1.4c.2-.2 0-.4-.2-.5z"/>
                                    </svg>
                                    WhatsApp
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                            <p className="text-xs text-indigo-600">
                                Expira em: {new Date(s.tokenExpiracao).toLocaleDateString('pt-BR')}
                            </p>
                            <button
                                onClick={() => onReenviarLink(s._id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                Gerar novo link
                            </button>
                        </div>
                    </div>
                )}

                {/* Avaliação (se já avaliado) */}
                {s.avaliacao && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1,2,3,4,5].map(estrela => (
                                        <svg
                                            key={estrela}
                                            className={`w-5 h-5 ${
                                                estrela <= s.avaliacao.estrelas
                                                    ? 'text-amber-400'
                                                    : 'text-slate-300'
                                            }`}
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <span className="text-sm font-medium text-amber-800">
                                    {s.avaliacao.estrelas}.0
                                </span>
                            </div>
                            <span className="text-xs text-slate-500">
                                {new Date(s.avaliacao.dataAvaliacao).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        {s.avaliacao.comentario && (
                            <p className="text-sm text-slate-700 italic">
                                "{s.avaliacao.comentario}"
                            </p>
                        )}
                    </div>
                )}

                {/* Informações do cliente */}
                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{s.clienteNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{s.clienteWhatsApp}</span>
                    </div>
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    {s.status === 'aguardando' && (
                        <button
                            onClick={() => onExcluir(s._id)}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                        >
                            Excluir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MeusServicos;

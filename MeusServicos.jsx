import React, { useState, useEffect } from 'react';
import { servicosAPI } from './api';

function MeusServicos() {
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);

    useEffect(() => {
        carregarServicos();
    }, []);

    const carregarServicos = async () => {
        try {
            const data = await servicosAPI.listar();
            setServicos(data.servicos);
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Meus Serviços</h2>
                <button
                    onClick={() => setMostrarForm(!mostrarForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl"
                >
                    + Novo Serviço
                </button>
            </div>

            {mostrarForm && (
                <NovoServico onSucesso={() => {
                    setMostrarForm(false);
                    carregarServicos();
                }} />
            )}

            {loading && <p>Carregando...</p>}

            <div className="grid gap-4">
                {servicos.map(s => (
                    <CardServico key={s._id} servico={s} />
                ))}
            </div>
        </div>
    );
}

function CardServico({ servico }) {
    const s = servico;
    
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{s.titulo}</h3>
                    <p className="text-sm text-slate-500">
                        {s.clienteNome} • {s.dataRealizacao?.split('T')[0]}
                    </p>
                </div>
                <Badge status={s.status} />
            </div>
            
            <p className="mt-2 text-slate-600">{s.descricao}</p>
            
            {s.status === 'aguardando' && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                    <p className="text-sm font-medium text-indigo-900 mb-2">
                        Link de avaliação (copie e envie para o cliente):
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={s.linkAvaliacao}
                            readOnly
                            className="flex-1 px-3 py-2 bg-white rounded-lg text-sm"
                        />
                        <button
                            onClick={() => navigator.clipboard.writeText(s.linkAvaliacao)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                        >
                            Copiar
                        </button>
                    </div>
                </div>
            )}
            
            {s.avaliacao && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <Stars value={s.avaliacao.estrelas} size="sm" />
                        <span className="text-xs text-slate-500">
                            {s.avaliacao.dataAvaliacao?.split('T')[0]}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600">{s.avaliacao.comentario}</p>
                </div>
            )}
        </div>
    );
}

function Badge({ status }) {
    const cores = {
        aguardando: 'bg-amber-100 text-amber-800',
        avaliado: 'bg-emerald-100 text-emerald-800',
        expirado: 'bg-slate-100 text-slate-800'
    };
    
    const labels = {
        aguardando: 'Aguardando avaliação',
        avaliado: 'Avaliado',
        expirado: 'Expirado'
    };
    
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cores[status]}`}>
            {labels[status]}
        </span>
    );
}

export default MeusServicos;

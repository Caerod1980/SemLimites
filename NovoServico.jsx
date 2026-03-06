import React, { useState } from 'react';
import { servicosAPI } from './api';

function NovoServico({ onSucesso }) {
    const [formData, setFormData] = useState({
        clienteNome: '',
        clienteWhatsApp: '',
        titulo: '',
        descricao: '',
        dataRealizacao: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await servicosAPI.criar(formData);
            alert('✅ Serviço cadastrado com sucesso!');
            onSucesso();
        } catch (error) {
            alert('Erro ao cadastrar serviço');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold mb-4">Novo Serviço Realizado</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Nome do Cliente *</label>
                    <input
                        type="text"
                        value={formData.clienteNome}
                        onChange={(e) => setFormData({...formData, clienteNome: e.target.value})}
                        required
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">WhatsApp do Cliente *</label>
                    <input
                        type="text"
                        value={formData.clienteWhatsApp}
                        onChange={(e) => setFormData({...formData, clienteWhatsApp: e.target.value})}
                        required
                        placeholder="(14) 99999-9999"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Título do Serviço *</label>
                    <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                        required
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Descrição do Serviço *</label>
                    <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Data de Realização *</label>
                    <input
                        type="date"
                        value={formData.dataRealizacao}
                        onChange={(e) => setFormData({...formData, dataRealizacao: e.target.value})}
                        required
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl"
                    >
                        {loading ? 'Salvando...' : 'Cadastrar Serviço'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default NovoServico;

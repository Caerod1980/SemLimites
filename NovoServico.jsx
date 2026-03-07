import React, { useState } from 'react';
import { servicosAPI } from './api';

function NovoServico({ onSucesso }) {
    const [formData, setFormData] = useState({
        clienteNome: '',
        clienteWhatsApp: '',
        clienteEmail: '',
        titulo: '',
        descricao: '',
        dataRealizacao: new Date().toISOString().split('T')[0],
        valor: ''
    });
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');

    const formatarWhatsApp = (valor) => {
        const numeros = valor.replace(/\D/g, '');
        if (numeros.length <= 11) {
            return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        }
        return valor;
    };

    const formatarValor = (valor) => {
        const numeros = valor.replace(/\D/g, '');
        if (!numeros) return '';
        return (Number(numeros) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'clienteWhatsApp') {
            setFormData({ ...formData, [name]: formatarWhatsApp(value) });
        } else if (name === 'valor') {
            setFormData({ ...formData, [name]: value });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErro('');

        // Validar WhatsApp
        const whatsappNumeros = formData.clienteWhatsApp.replace(/\D/g, '');
        if (whatsappNumeros.length < 10 || whatsappNumeros.length > 11) {
            setErro('WhatsApp inválido. Digite um número com DDD (ex: 14999999999)');
            setLoading(false);
            return;
        }

        // Preparar dados para envio
        const dadosEnvio = {
            ...formData,
            clienteWhatsApp: whatsappNumeros,
            valor: formData.valor ? parseFloat(formData.valor.replace(/\D/g, '')) / 100 : 0
        };

        try {
            const resultado = await servicosAPI.criar(dadosEnvio);
            alert('✅ Serviço cadastrado com sucesso!');
            onSucesso(resultado);
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            setErro(error.message || 'Erro ao cadastrar serviço');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-200 shadow-sm">
            <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Cadastrar Novo Serviço Realizado
            </h3>
            
            {erro && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{erro}</p>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Nome do Cliente */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nome do Cliente *
                        </label>
                        <input
                            type="text"
                            name="clienteNome"
                            value={formData.clienteNome}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            WhatsApp do Cliente *
                        </label>
                        <input
                            type="text"
                            name="clienteWhatsApp"
                            value={formData.clienteWhatsApp}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            placeholder="(14) 99999-9999"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Número com DDD para enviar o link
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Título */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Título do Serviço *
                        </label>
                        <input
                            type="text"
                            name="titulo"
                            value={formData.titulo}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            placeholder="Ex: Instalação de ar condicionado"
                        />
                    </div>

                    {/* Data */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Data de Realização *
                        </label>
                        <input
                            type="date"
                            name="dataRealizacao"
                            value={formData.dataRealizacao}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>
                </div>

                {/* E-mail (opcional) */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        E-mail do Cliente (opcional)
                    </label>
                    <input
                        type="email"
                        name="clienteEmail"
                        value={formData.clienteEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        placeholder="cliente@email.com"
                    />
                </div>

                {/* Descrição */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Descrição do Serviço *
                    </label>
                    <textarea
                        name="descricao"
                        value={formData.descricao}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        placeholder="Descreva o serviço realizado..."
                    />
                </div>

                {/* Valor (opcional) */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valor do Serviço (opcional)
                    </label>
                    <input
                        type="text"
                        name="valor"
                        value={formData.valor}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        placeholder="R$ 0,00"
                    />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Cadastrando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Cadastrar Serviço
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onSucesso}
                        className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                </div>
            </form>

            {/* Dica */}
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-700 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Após cadastrar, um link único será gerado para o cliente avaliar o serviço.
                </p>
            </div>
        </div>
    );
}

export default NovoServico;

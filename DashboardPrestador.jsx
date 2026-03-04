import React, { useState, useEffect } from 'react';
import { prestadoresAPI } from './api';

function DashboardPrestador({ usuario, onSair }) {
  const [prestador, setPrestador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Buscar dados do prestador (simulado por enquanto)
    setTimeout(() => {
      setPrestador({
        nome: 'João Souza',
        email: usuario?.email,
        categoria: 'Eletricista',
        cidade: 'Bauru',
        estrelas: 4.9,
        avaliacoes: 328,
        verificado: true,
        servicosRealizados: 1247,
        clientesFieis: 89
      });
      setLoading(false);
    }, 1000);
  }, [usuario]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando seu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Olá, {prestador?.nome}!
          </h1>
          <p className="text-slate-500">Gerencie seus serviços e reputação</p>
        </div>
        <button
          onClick={onSair}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
        >
          Sair
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium">Reputação</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{prestador?.estrelas}</div>
          <div className="text-xs text-slate-500 mt-1">{prestador?.avaliacoes} avaliações</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 p-6">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Serviços</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{prestador?.servicosRealizados}</div>
          <div className="text-xs text-slate-500 mt-1">realizados</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 p-6">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="text-sm font-medium">Clientes fiéis</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{prestador?.clientesFieis}%</div>
          <div className="text-xs text-slate-500 mt-1">contratariam novamente</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-6">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Verificado</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{prestador?.verificado ? '✓' : '❌'}</div>
          <div className="text-xs text-slate-500 mt-1">CNPJ ativo</div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Editar Perfil</h2>
          <p className="text-sm text-slate-600 mb-4">
            Mantenha seus dados atualizados para receber mais contatos
          </p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm">
            Editar informações
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Ver Avaliações</h2>
          <p className="text-sm text-slate-600 mb-4">
            Veja o que os clientes estão falando sobre seus serviços
          </p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm">
            Ver avaliações
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPrestador;

import React, { useState, useEffect, useMemo } from 'react';
import { prestadoresAPI, servicosAPI } from './api';
import MeusServicos from './MeusServicos';

function DashboardPrestador({ usuario, onSair }) {
  const [prestador, setPrestador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState('resumo');
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [servicos, setServicos] = useState([]);

  useEffect(() => {
    carregarDados();
  }, [usuario]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');
      
      const data = await prestadoresAPI.getPerfil();
      setPrestador(data);
      setFormData(data);
      
      const servicosData = await servicosAPI.listar();
      setServicos(servicosData.servicos || []);
      
      console.log('✅ Dados carregados:', data);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calcularClientesFieis = useMemo(() => {
    if (!servicos || servicos.length === 0) return 0;
    
    const servicosConcluidos = servicos.filter(s => s.status === 'avaliado');
    
    if (servicosConcluidos.length === 0) return 0;
    
    const servicosPorCliente = servicosConcluidos.reduce((acc, servico) => {
      const chaveCliente = `${servico.clienteNome}-${servico.clienteWhatsApp}`;
      
      if (!acc[chaveCliente]) {
        acc[chaveCliente] = [];
      }
      acc[chaveCliente].push(servico);
      return acc;
    }, {});
    
    const clientesComRetorno = Object.values(servicosPorCliente).filter(
      servicosCliente => servicosCliente.length > 1
    ).length;
    
    const totalClientes = Object.keys(servicosPorCliente).length;
    
    return totalClientes > 0 
      ? Math.round((clientesComRetorno / totalClientes) * 100)
      : 0;
  }, [servicos]);

  const estatisticas = useMemo(() => {
    const servicosAvaliados = servicos.filter(s => s.status === 'avaliado').length;
    const totalAvaliacoes = servicos.reduce((acc, s) => {
      if (s.avaliacao?.estrelas) {
        return acc + s.avaliacao.estrelas;
      }
      return acc;
    }, 0);
    
    const mediaEstrelas = servicosAvaliados > 0 
      ? (totalAvaliacoes / servicosAvaliados).toFixed(1)
      : 0;
    
    return {
      servicosRealizados: servicosAvaliados,
      totalServicos: servicos.length,
      mediaEstrelas,
      clientesFieis: calcularClientesFieis,
      aguardando: servicos.filter(s => s.status === 'aguardando').length,
      expirados: servicos.filter(s => s.status === 'expirado').length
    };
  }, [servicos, calcularClientesFieis]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e, campo) => {
    const valor = e.target.value;
    setFormData(prev => ({
      ...prev,
      [campo]: valor.split(',').map(item => item.trim()).filter(item => item)
    }));
  };

  const salvarPerfil = async () => {
    try {
      setSalvando(true);
      setErro('');
      
      await prestadoresAPI.atualizarPerfil(formData);
      setPrestador(formData);
      setEditando(false);
      alert('✅ Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      setErro('Erro ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  };

  // NOVA FUNÇÃO: Excluir perfil permanentemente
  const handleExcluirPerfilPermanente = async () => {
    // Primeira confirmação
    const confirmacao1 = window.confirm(
      '⚠️ ATENÇÃO! Esta ação é PERMANENTE e IRREVERSÍVEL!\n\n' +
      'Todo o seu histórico, serviços, avaliações e dados serão excluídos do Sem Limites.\n\n' +
      'Deseja continuar?'
    );
    
    if (!confirmacao1) return;

    // Segunda confirmação com digitação
    const confirmacao2 = window.prompt(
      'Para confirmar a exclusão PERMANENTE da sua conta, digite o seu NOME completo:'
    );

    if (!confirmacao2) {
      alert('Operação cancelada.');
      return;
    }

    if (confirmacao2.trim().toLowerCase() !== prestador?.nome?.toLowerCase()) {
      alert('❌ Nome incorreto. Operação cancelada.');
      return;
    }

    // Terceira confirmação
    const confirmacao3 = window.prompt(
      'Digite "EXCLUIR PERMANENTEMENTE" para confirmação final:'
    );

    if (confirmacao3 !== 'EXCLUIR PERMANENTEMENTE') {
      alert('❌ Código de confirmação incorreto. Operação cancelada.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      
      await prestadoresAPI.excluirPerfilPermanente();
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('✅ Perfil excluído permanentemente com sucesso.\n\nObrigado por utilizar o Sem Limites!');
      
      onSair();
      
    } catch (error) {
      console.error('❌ Erro ao excluir perfil:', error);
      setErro('Erro ao excluir perfil permanentemente. Tente novamente ou contate o suporte.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando seu dashboard...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-red-800 mb-2">Ops! Algo deu errado</h2>
          <p className="text-red-600 mb-4">{erro}</p>
          <button
            onClick={carregarDados}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
        
        <div className="relative flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {prestador?.nome || 'Prestador'}!
            </h1>
            <p className="text-indigo-100">Gerencie seus serviços e reputação</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="bg-white/20 rounded-xl px-4 py-2">
                <span className="text-sm opacity-90">Membro desde </span>
                <span className="font-semibold">
                  {prestador?.createdAt ? new Date(prestador.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
              {prestador?.verificado && (
                <div className="bg-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                  </svg>
                  <span>Verificado</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onSair}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium">Reputação</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {estatisticas.mediaEstrelas || prestador?.estrelas || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">{estatisticas.servicosRealizados || 0} avaliações</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Serviços</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{estatisticas.servicosRealizados || 0}</div>
          <div className="text-xs text-slate-500 mt-1">realizados</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="text-sm font-medium">Fiéis</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {estatisticas.clientesFieis}%
          </div>
          <div className="text-xs text-slate-500 mt-1">retornaram</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879.586.585.879 1.353.879 2.121s-.293 1.536-.879 2.121z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Aguardando</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{estatisticas.aguardando || 0}</div>
          <div className="text-xs text-slate-500 mt-1">avaliações</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{estatisticas.totalServicos || 0}</div>
          <div className="text-xs text-slate-500 mt-1">serviços</div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <div className="flex overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setAba('resumo')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                aba === 'resumo'
                  ? 'text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Resumo
              </span>
              {aba === 'resumo' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              )}
            </button>

            <button
              onClick={() => { setAba('perfil'); setEditando(false); }}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                aba === 'perfil'
                  ? 'text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perfil
              </span>
              {aba === 'perfil' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              )}
            </button>

            <button
              onClick={() => setAba('servicos')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                aba === 'servicos'
                  ? 'text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Serviços
              </span>
              {aba === 'servicos' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              )}
            </button>

            <button
              onClick={() => setAba('avaliacoes')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                aba === 'avaliacoes'
                  ? 'text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Avaliações
              </span>
              {aba === 'avaliacoes' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              )}
            </button>

            <button
              onClick={() => setAba('certificacoes')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                aba === 'certificacoes'
                  ? 'text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Certificações
              </span>
              {aba === 'certificacoes' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="p-6">
          {aba === 'resumo' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-4">Informações do Perfil</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-indigo-500 block">Nome</span>
                      <span className="text-sm font-medium text-indigo-900">{prestador?.nome}</span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-500 block">Categoria</span>
                      <span className="text-sm font-medium text-indigo-900">{prestador?.categoria}</span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-500 block">Cidade</span>
                      <span className="text-sm font-medium text-indigo-900">{prestador?.cidade}</span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-500 block">Regiões atendidas</span>
                      <span className="text-sm font-medium text-indigo-900">
                        {prestador?.regioes?.join(' • ') || 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 p-6">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-4">Contato</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-emerald-500 block">E-mail</span>
                      <span className="text-sm font-medium text-emerald-900">{prestador?.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-emerald-500 block">WhatsApp</span>
                      <span className="text-sm font-medium text-emerald-900">{prestador?.whatsapp}</span>
                    </div>
                    <div>
                      <span className="text-xs text-emerald-500 block">Telefone</span>
                      <span className="text-sm font-medium text-emerald-900">{prestador?.telefone || 'Não informado'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Sobre</h3>
                <p className="text-slate-600">{prestador?.descricao}</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {prestador?.tags?.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {aba === 'perfil' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editando ? 'Editando Perfil' : 'Meu Perfil'}
                </h2>
                <div className="flex gap-3">
                  {!editando ? (
                    <button
                      onClick={() => setEditando(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium"
                    >
                      Editar Perfil
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditando(false); setFormData(prestador); }}
                        className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium"
                        disabled={salvando}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={salvarPerfil}
                        disabled={salvando}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
                      >
                        {salvando ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editando ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                      <input
                        type="text"
                        name="categoria"
                        value={formData.categoria || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        name="cidade"
                        value={formData.cidade || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        name="whatsapp"
                        value={formData.whatsapp || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        name="telefone"
                        value={formData.telefone || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tempo de mercado</label>
                      <input
                        type="text"
                        name="tempoMercado"
                        value={formData.tempoMercado || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200"
                        placeholder="Ex: 12 anos"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Regiões atendidas</label>
                    <input
                      type="text"
                      value={formData.regioes?.join(', ') || ''}
                      onChange={(e) => handleArrayChange(e, 'regioes')}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      placeholder="Centro, Jardim Europa, Vila Universitária"
                    />
                    <p className="text-xs text-slate-500 mt-1">Separe por vírgula</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Especialidades (tags)</label>
                    <input
                      type="text"
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleArrayChange(e, 'tags')}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      placeholder="Emergência, Residencial, Comercial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <textarea
                      name="descricao"
                      value={formData.descricao || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      placeholder="Descreva seus serviços..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 block">Nome</span>
                      <span className="text-sm font-medium text-slate-900">{prestador?.nome}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 block">Categoria</span>
                      <span className="text-sm font-medium text-slate-900">{prestador?.categoria}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 block">Cidade</span>
                      <span className="text-sm font-medium text-slate-900">{prestador?.cidade}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 block">WhatsApp</span>
                      <span className="text-sm font-medium text-slate-900">{prestador?.whatsapp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {aba === 'servicos' && <MeusServicos />}
          
          {aba === 'avaliacoes' && (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-lg font-medium text-slate-700 mb-2">Nenhuma avaliação ainda</p>
              <p className="text-sm">As avaliações aparecerão aqui após os clientes concluírem os serviços.</p>
            </div>
          )}

          {aba === 'certificacoes' && (
            <div>
              <div className="flex justify-end mb-4">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm">
                  + Adicionar Certificação
                </button>
              </div>
              <div className="grid gap-3">
                {prestador?.certificacoes?.map((cert, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{cert}</span>
                    </div>
                    <button className="text-red-500 hover:text-red-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(!prestador?.certificacoes || prestador.certificacoes.length === 0) && (
                  <p className="text-center text-slate-500 py-8">Nenhuma certificação adicionada.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTÃO DE EXCLUSÃO PERMANENTE - VISÍVEL NO FINAL DA PÁGINA */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800 mb-1">Zona de Perigo</h3>
                <p className="text-sm text-red-600 max-w-xl">
                  Ações abaixo são irreversíveis. A exclusão permanente remove todos os seus dados, 
                  serviços, avaliações e histórico do Sem Limites.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleExcluirPerfilPermanente}
              disabled={salvando}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg hover:shadow-xl min-w-[200px]"
            >
              {salvando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Excluir Perfil Permanentemente</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-xs text-red-500 bg-red-100/50 p-3 rounded-xl">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Esta ação é PERMANENTE e IRREVERSÍVEL. Você precisará criar uma nova conta se desejar 
              utilizar o Sem Limites novamente.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPrestador;

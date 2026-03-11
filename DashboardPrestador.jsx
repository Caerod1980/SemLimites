import React, { useState, useEffect, useMemo } from 'react';
import { prestadoresAPI, servicosAPI } from './api';
import MeusServicos from './MeusServicos';

function DashboardPrestador({ usuario, onSair }) {
  console.log('🔥 DashboardPrestador.jsx está renderizando!'); // DEBUG

  const [prestador, setPrestador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState('resumo');
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [servicos, setServicos] = useState([]);

  useEffect(() => {
    console.log('✅ useEffect executado'); // DEBUG
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
      if (!acc[chaveCliente]) acc[chaveCliente] = [];
      acc[chaveCliente].push(servico);
      return acc;
    }, {});
    
    const clientesComRetorno = Object.values(servicosPorCliente).filter(
      servicosCliente => servicosCliente.length > 1
    ).length;
    
    const totalClientes = Object.keys(servicosPorCliente).length;
    
    return totalClientes > 0 ? Math.round((clientesComRetorno / totalClientes) * 100) : 0;
  }, [servicos]);

  const estatisticas = useMemo(() => {
    const servicosAvaliados = servicos.filter(s => s.status === 'avaliado').length;
    const totalAvaliacoes = servicos.reduce((acc, s) => {
      if (s.avaliacao?.estrelas) return acc + s.avaliacao.estrelas;
      return acc;
    }, 0);
    
    const mediaEstrelas = servicosAvaliados > 0 ? (totalAvaliacoes / servicosAvaliados).toFixed(1) : 0;
    
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

  const handleExcluirPerfilPermanente = async () => {
    const confirmacao1 = window.confirm(
      '⚠️ ATENÇÃO! Esta ação é PERMANENTE e IRREVERSÍVEL!\n\n' +
      'Todo o seu histórico, serviços, avaliações e dados serão excluídos do Sem Limites.\n\n' +
      'Deseja continuar?'
    );
    if (!confirmacao1) return;

    const confirmacao2 = window.prompt('Para confirmar a exclusão PERMANENTE, digite o seu NOME completo:');
    if (!confirmacao2) {
      alert('Operação cancelada.');
      return;
    }
    if (confirmacao2.trim().toLowerCase() !== prestador?.nome?.toLowerCase()) {
      alert('❌ Nome incorreto. Operação cancelada.');
      return;
    }

    const confirmacao3 = window.prompt('Digite "EXCLUIR PERMANENTEMENTE" para confirmação final:');
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
          <button onClick={carregarDados} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* BOTÃO DE EXCLUSÃO NO TOPO */}
      <div className="mb-8">
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
                  A exclusão permanente remove todos os seus dados, serviços, avaliações e histórico do Sem Limites.
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
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
        
        <div className="relative flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Olá, {prestador?.nome || 'Prestador'}!</h1>
            <p className="text-indigo-100">Gerencie seus serviços e reputação</p>
          </div>
          <button onClick={onSair} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition flex items-center gap-2">
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
          <div className="text-2xl font-bold text-slate-900">{estatisticas.mediaEstrelas || prestador?.estrelas || 0}</div>
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
          <div className="text-2xl font-bold text-slate-900">{estatisticas.clientesFieis}%</div>
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

      {/* Abas - versão simplificada para economizar espaço */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <div className="flex overflow-x-auto hide-scrollbar">
            {['resumo', 'perfil', 'servicos', 'avaliacoes', 'certificacoes'].map(tab => (
              <button
                key={tab}
                onClick={() => setAba(tab)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all relative ${
                  aba === tab ? 'text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'resumo' ? 'Resumo' : 
                 tab === 'perfil' ? 'Perfil' :
                 tab === 'servicos' ? 'Serviços' :
                 tab === 'avaliacoes' ? 'Avaliações' : 'Certificações'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {aba === 'resumo' && (
            <div className="space-y-6">
              <p className="text-slate-600">{prestador?.descricao || 'Nenhuma descrição fornecida.'}</p>
              <div className="flex flex-wrap gap-2">
                {prestador?.tags?.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {aba === 'perfil' && <p className="text-slate-600">Dados do perfil...</p>}
          {aba === 'servicos' && <MeusServicos />}
          {aba === 'avaliacoes' && <p className="text-slate-600">Avaliações...</p>}
          {aba === 'certificacoes' && <p className="text-slate-600">Certificações...</p>}
        </div>
      </div>
    </div>
  );
}

export default DashboardPrestador;

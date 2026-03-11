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

  // Carregar dados ao montar o componente
  useEffect(() => {
    carregarDados();
  }, []); // Removido usuario da dependência para evitar loops

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');
      
      console.log('🔄 Carregando perfil...');
      const data = await prestadoresAPI.getPerfil();
      console.log('✅ Perfil carregado:', data);
      
      setPrestador(data);
      setFormData(data);
      
      // Carregar serviços para estatísticas
      try {
        const servicosData = await servicosAPI.listar();
        setServicos(servicosData.servicos || []);
        console.log('✅ Serviços carregados:', servicosData.servicos?.length || 0);
      } catch (err) {
        console.warn('⚠️ Erro ao carregar serviços:', err);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular percentual de clientes fiéis
  const clientesFieis = useMemo(() => {
    if (!servicos || servicos.length === 0) return 0;
    
    const servicosAvaliados = servicos.filter(s => s.status === 'avaliado');
    if (servicosAvaliados.length === 0) return 0;
    
    // Agrupar por cliente (usando nome + whatsapp como identificador)
    const clientesMap = new Map();
    
    servicosAvaliados.forEach(servico => {
      const chave = `${servico.clienteNome}-${servico.clienteWhatsApp}`;
      if (!clientesMap.has(chave)) {
        clientesMap.set(chave, []);
      }
      clientesMap.get(chave).push(servico);
    });
    
    const totalClientes = clientesMap.size;
    const clientesRetornaram = Array.from(clientesMap.values()).filter(s => s.length > 1).length;
    
    return totalClientes > 0 ? Math.round((clientesRetornaram / totalClientes) * 100) : 0;
  }, [servicos]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const avaliados = servicos.filter(s => s.status === 'avaliado').length;
    const totalEstrelas = servicos.reduce((acc, s) => acc + (s.avaliacao?.estrelas || 0), 0);
    const media = avaliados > 0 ? (totalEstrelas / avaliados).toFixed(1) : 0;
    
    return {
      reputacao: media,
      servicosRealizados: avaliados,
      clientesFieis: clientesFieis,
      aguardando: servicos.filter(s => s.status === 'aguardando').length,
      total: servicos.length
    };
  }, [servicos, clientesFieis]);

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
    // Primeira confirmação
    if (!window.confirm('⚠️ ATENÇÃO! Esta ação é PERMANENTE e IRREVERSÍVEL!\n\nTodo o seu histórico será excluído. Deseja continuar?')) {
      return;
    }

    // Segunda confirmação - digitar o nome
    const nomeConfirmacao = window.prompt('Para confirmar, digite seu NOME completo:');
    if (!nomeConfirmacao) {
      alert('Operação cancelada.');
      return;
    }
    
    if (nomeConfirmacao.trim().toLowerCase() !== prestador?.nome?.toLowerCase()) {
      alert('❌ Nome incorreto. Operação cancelada.');
      return;
    }

    // Terceira confirmação - digitar código
    const codigoConfirmacao = window.prompt('Digite "EXCLUIR PERMANENTEMENTE" para confirmação final:');
    if (codigoConfirmacao !== 'EXCLUIR PERMANENTEMENTE') {
      alert('❌ Código incorreto. Operação cancelada.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      
      console.log('🔄 Excluindo perfil permanentemente...');
      await prestadoresAPI.excluirPerfilPermanente();
      
      // Limpar dados locais
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('✅ Perfil excluído permanentemente com sucesso.');
      onSair(); // Redirecionar para home
      
    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      setErro('Erro ao excluir perfil. Tente novamente.');
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
      {/* BOTÃO DE EXCLUSÃO - TOPO */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-red-800">Exclusão permanente de conta</span>
            </div>
            <button
              onClick={handleExcluirPerfilPermanente}
              disabled={salvando}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
            >
              {salvando ? 'Excluindo...' : 'Excluir minha conta'}
            </button>
          </div>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Olá, {prestador?.nome || 'Prestrador'}!
            </h1>
            <p className="text-indigo-100 text-sm">Gerencie seus serviços e reputação</p>
          </div>
          <button
            onClick={onSair}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-amber-500 text-xs font-medium mb-1">⭐ Reputação</div>
          <div className="text-xl font-bold text-slate-900">{estatisticas.reputacao}</div>
          <div className="text-xs text-slate-500">{estatisticas.servicosRealizados} avaliações</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-emerald-500 text-xs font-medium mb-1">✅ Realizados</div>
          <div className="text-xl font-bold text-slate-900">{estatisticas.servicosRealizados}</div>
          <div className="text-xs text-slate-500">serviços</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-blue-500 text-xs font-medium mb-1">🔄 Fiéis</div>
          <div className="text-xl font-bold text-slate-900">{estatisticas.clientesFieis}%</div>
          <div className="text-xs text-slate-500">retornaram</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-purple-500 text-xs font-medium mb-1">⏳ Aguardando</div>
          <div className="text-xl font-bold text-slate-900">{estatisticas.aguardando}</div>
          <div className="text-xs text-slate-500">avaliações</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-indigo-500 text-xs font-medium mb-1">📊 Total</div>
          <div className="text-xl font-bold text-slate-900">{estatisticas.total}</div>
          <div className="text-xs text-slate-500">serviços</div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-2">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'resumo', label: 'Resumo', icon: '📋' },
              { id: 'perfil', label: 'Perfil', icon: '👤' },
              { id: 'servicos', label: 'Serviços', icon: '🛠️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAba(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  aba === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {aba === 'resumo' && (
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Sobre</h3>
              <p className="text-sm text-slate-600 mb-4">{prestador?.descricao || 'Nenhuma descrição fornecida.'}</p>
              
              {prestador?.tags?.length > 0 && (
                <>
                  <h3 className="font-medium text-slate-900 mb-2">Especialidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {prestador.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          {aba === 'perfil' && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Nome:</span> {prestador?.nome}</p>
              <p><span className="font-medium">Email:</span> {prestador?.email}</p>
              <p><span className="font-medium">WhatsApp:</span> {prestador?.whatsapp}</p>
              <p><span className="font-medium">Cidade:</span> {prestador?.cidade}</p>
            </div>
          )}
          
          {aba === 'servicos' && <MeusServicos />}
        </div>
      </div>
    </div>
  );
}

export default DashboardPrestador;

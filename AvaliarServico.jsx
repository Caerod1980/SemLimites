import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AvaliarServico() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [servico, setServico] = useState(null);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [hoverEstrela, setHoverEstrela] = useState(0);

  const API_URL = 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net/api';

  // Buscar dados do serviço ao carregar
  useEffect(() => {
    carregarServico();
  }, [token]);

  const carregarServico = async () => {
    try {
      setLoading(true);
      setErro('');

      const response = await fetch(`${API_URL}/servicos/avaliar/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar serviço');
      }

      setServico(data.servico);
      console.log('✅ Serviço carregado:', data.servico);
    } catch (error) {
      console.error('❌ Erro:', error);
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (estrelas === 0) {
      alert('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    try {
      setEnviando(true);
      setErro('');

      const response = await fetch(`${API_URL}/servicos/avaliar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estrelas, comentario })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar avaliação');
      }

      setEnviado(true);
      
      // Aguarda 3 segundos e redireciona para home
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('❌ Erro:', error);
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  };

  // Renderizar estrelas interativas
  const renderEstrelas = () => {
    return [1, 2, 3, 4, 5].map((valor) => (
      <button
        key={valor}
        type="button"
        onClick={() => setEstrelas(valor)}
        onMouseEnter={() => setHoverEstrela(valor)}
        onMouseLeave={() => setHoverEstrela(0)}
        className="focus:outline-none transition-transform hover:scale-110"
      >
        <svg
          className={`w-12 h-12 md:w-14 md:h-14 ${
            valor <= (hoverEstrela || estrelas)
              ? 'text-amber-400'
              : 'text-slate-300'
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </button>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados do serviço...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Link inválido</h2>
          <p className="text-slate-600 mb-6">{erro}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
          >
            Voltar para home
          </button>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Avaliação enviada!</h2>
          <p className="text-slate-600 mb-2">
            Obrigado por avaliar o serviço de <strong>{servico?.prestador?.nome}</strong>.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Sua opinião ajuda outros clientes e valoriza bons prestadores.
          </p>
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-6">
            {[1, 2, 3, 4, 5].map((v) => (
              <svg key={v} className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-slate-400">Redirecionando para a página inicial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white grid place-items-center font-bold">
              SL
            </div>
            <h1 className="font-bold text-lg text-slate-900">SemLimites</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          {/* Cabeçalho da Avaliação */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Avalie o serviço
            </h2>
            <p className="text-slate-600">
              Sua opinião é muito importante para nós
            </p>
          </div>

          {/* Informações do Prestador */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                {servico?.prestador?.nome?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {servico?.prestador?.nome}
                </h3>
                <p className="text-sm text-slate-600">
                  {servico?.prestador?.categoria} • {servico?.prestador?.cidade}
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes do Serviço */}
          <div className="bg-slate-50 rounded-2xl p-6 mb-8">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Serviço realizado
            </h4>
            <p className="text-lg font-medium text-slate-900 mb-2">
              {servico?.titulo}
            </p>
            <p className="text-slate-600 mb-4">
              {servico?.descricao}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                Realizado em {new Date(servico?.dataRealizacao).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Formulário de Avaliação */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Seleção de Estrelas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-4">
                Como você avalia este serviço?
              </label>
              <div className="flex justify-center gap-2 md:gap-4">
                {renderEstrelas()}
              </div>
              <p className="text-center text-sm text-slate-500 mt-3">
                {estrelas === 0 && 'Clique nas estrelas para avaliar'}
                {estrelas === 1 && '1 estrela - Péssimo'}
                {estrelas === 2 && '2 estrelas - Ruim'}
                {estrelas === 3 && '3 estrelas - Regular'}
                {estrelas === 4 && '4 estrelas - Bom'}
                {estrelas === 5 && '5 estrelas - Excelente!'}
              </p>
            </div>

            {/* Comentário */}
            <div>
              <label htmlFor="comentario" className="block text-sm font-medium text-slate-700 mb-2">
                Deixe um comentário (opcional)
              </label>
              <textarea
                id="comentario"
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Conte como foi sua experiência, a qualidade do serviço, pontualidade, atendimento..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 mt-1">
                {comentario.length}/500 caracteres
              </p>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={enviando || estrelas === 0}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg"
            >
              {enviando ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enviando avaliação...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Enviar avaliação</span>
                </>
              )}
            </button>
          </form>

          {/* Mensagem de segurança */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>
                Sua avaliação é anônima e será usada apenas para melhorar a qualidade dos serviços.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AvaliarServico;

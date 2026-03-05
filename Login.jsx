import React, { useState } from 'react';
import { authAPI } from './api';

function Login({ onLoginSuccess, onVoltar }) {
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState('cliente'); // 'cliente' ou 'prestador'
  const [etapa, setEtapa] = useState('form'); // 'form', 'enviado', 'erro'
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [dadosEnvio, setDadosEnvio] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // Chamar API com email e tipo
      const resultado = await authAPI.login(email, tipo);
      
      setDadosEnvio({ email, tipo });
      setEtapa('enviado');
      console.log('✅ Link enviado:', resultado);
    } catch (error) {
      console.error('❌ Erro no login:', error);
      
      // Tratamento específico para prestador não cadastrado
      if (error.message?.includes('Prestador não encontrado')) {
        setErro('Prestador não encontrado. Deseja se cadastrar?');
        // Opcional: redirecionar para cadastro
      } else {
        setErro(error.message || 'Erro ao enviar link de acesso');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo);
    setErro(''); // Limpa erro ao mudar tipo
  };

  const handleNovoTentativa = () => {
    setEtapa('form');
    setErro('');
  };

  // Tela de link enviado
  if (etapa === 'enviado') {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="text-center">
            {/* Ícone de sucesso */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Link enviado!
            </h2>
            
            <p className="text-slate-600 mb-4">
              Enviamos um link de acesso para <br />
              <span className="font-semibold text-indigo-600">{dadosEnvio?.email}</span>
            </p>

            <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-indigo-800 mb-2 font-medium">
                {dadosEnvio?.tipo === 'prestador' ? '📋 Para prestadores:' : '🔍 Para clientes:'}
              </p>
              <p className="text-xs text-indigo-600">
                {dadosEnvio?.tipo === 'prestador' 
                  ? 'Acesse seu dashboard para gerenciar serviços e avaliações.'
                  : 'Acesse sua conta para contratar prestadores e avaliar serviços.'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleNovoTentativa}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-all"
              >
                Usar outro e-mail
              </button>

              <button
                onClick={onVoltar}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all"
              >
                Voltar para home
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              ⏰ O link é válido por 1 hora • Verifique sua caixa de spam
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de formulário
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Entrar
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Acesse sua conta no SemLimites
            </p>
          </div>
          <button
            onClick={onVoltar}
            className="text-sm text-slate-400 hover:text-indigo-600 transition-colors"
            title="Voltar"
          >
            ← Voltar
          </button>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-red-700">{erro}</p>
                {erro.includes('Prestador não encontrado') && (
                  <button
                    onClick={() => window.location.href = '/?modo=cadastro'}
                    className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 font-medium"
                  >
                    Cadastrar como prestador →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seletor de tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Acessar como
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTipoChange('cliente')}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  tipo === 'cliente'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Cliente</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('prestador')}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  tipo === 'prestador'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Prestador</span>
                </div>
              </button>
            </div>
          </div>

          {/* Campo de e-mail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all pl-10"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Informações adicionais por tipo */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                {tipo === 'prestador' ? '📋' : '🔍'}
              </div>
              <div>
                <p className="text-xs text-slate-600">
                  {tipo === 'prestador' 
                    ? 'Você receberá um link para acessar seu dashboard. Lá poderá gerenciar serviços e avaliações.'
                    : 'Você receberá um link para acessar sua conta e começar a contratar prestadores.'}
                </p>
              </div>
            </div>
          </div>

          {/* Botão de envio */}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <span>Enviar link de acesso</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Rodapé com instruções */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Enviamos um link mágico para seu e-mail. Sem senhas para lembrar.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

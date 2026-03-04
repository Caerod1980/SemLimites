import React, { useState } from 'react';
import { authAPI } from './api';

function Login({ onLoginSuccess, onVoltar, tipo }) {
  const [email, setEmail] = useState('');
  const [etapa, setEtapa] = useState('form'); // form, enviado, verificando
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const resultado = await authAPI.login(email);
      setEtapa('enviado');
      console.log('Link enviado:', resultado);
    } catch (error) {
      setErro(error.message || 'Erro ao enviar link de acesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {tipo === 'prestador' ? 'Área do Prestador' : 'Entrar no SemLimites'}
          </h1>
          <button
            onClick={onVoltar}
            className="text-sm text-slate-500 hover:text-indigo-600"
          >
            ← Voltar
          </button>
        </div>

        {etapa === 'form' && (
          <>
            <p className="text-slate-600 mb-6">
              {tipo === 'prestador' 
                ? 'Acesse sua conta para gerenciar seus serviços e avaliações'
                : 'Acesse para contratar prestadores e avaliar serviços'}
            </p>

            {erro && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{erro}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all"
              >
                {loading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>

            <p className="text-xs text-center text-slate-500 mt-4">
              Enviaremos um link mágico para seu e-mail. Sem senhas para lembrar.
            </p>
          </>
        )}

        {etapa === 'enviado' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Link enviado!
            </h2>
            <p className="text-slate-600 mb-6">
              Enviamos um link de acesso para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <button
              onClick={() => setEtapa('form')}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              Usar outro e-mail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

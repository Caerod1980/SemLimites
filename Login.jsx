import React, { useState } from 'react';
import { authAPI } from './api';

function Login({ onLoginSuccess, onVoltar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState('login'); // 'login' ou 'registro'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      let resultado;
      
      if (modo === 'login') {
        resultado = await authAPI.login(email, senha, tipo);
        localStorage.setItem('token', resultado.token);
        localStorage.setItem('user', JSON.stringify(resultado.user));
      } else {
        resultado = await authAPI.register(email, senha, tipo);
        alert('Cadastro realizado! Faça login.');
        setModo('login');
        return;
      }
      
      onLoginSuccess(resultado.user);
    } catch (error) {
      setErro(error.message || 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: "max-w-md mx-auto px-4 py-12" },
    React.createElement('div', { className: "bg-white rounded-3xl border border-slate-200 p-8 shadow-sm" },
      React.createElement('div', { className: "flex items-center justify-between mb-6" },
        React.createElement('h1', { className: "text-2xl font-bold" }, 
          modo === 'login' ? 'Entrar' : 'Criar conta'
        ),
        React.createElement('button', { 
          onClick: onVoltar, 
          className: "text-sm text-slate-500 hover:text-indigo-600" 
        }, "← Voltar")
      ),

      erro && React.createElement('div', { className: "mb-4 p-3 rounded-lg bg-red-50 border border-red-200" },
        React.createElement('p', { className: "text-sm text-red-600" }, erro)
      ),

      React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
        // Tipo de usuário
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium mb-1" }, "Tipo de acesso"),
          React.createElement('div', { className: "flex gap-4" },
            ['cliente', 'prestador'].map(t => 
              React.createElement('label', { key: t, className: "flex items-center gap-2" },
                React.createElement('input', {
                  type: "radio",
                  value: t,
                  checked: tipo === t,
                  onChange: (e) => setTipo(e.target.value),
                  className: "w-4 h-4 text-indigo-600"
                }),
                React.createElement('span', { className: "text-sm" }, 
                  t === 'cliente' ? 'Cliente' : 'Prestador'
                )
              )
            )
          )
        ),

        // E-mail
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium mb-1" }, "E-mail"),
          React.createElement('input', {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            className: "w-full px-4 py-3 rounded-xl border border-slate-200",
            required: true
          })
        ),

        // Senha
        React.createElement('div', null,
          React.createElement('label', { className: "block text-sm font-medium mb-1" }, "Senha"),
          React.createElement('input', {
            type: "password",
            value: senha,
            onChange: (e) => setSenha(e.target.value),
            className: "w-full px-4 py-3 rounded-xl border border-slate-200",
            required: true,
            minLength: 6
          })
        ),

        // Botão principal
        React.createElement('button', {
          type: "submit",
          disabled: loading,
          className: "w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold disabled:opacity-50"
        }, loading ? 'Processando...' : (modo === 'login' ? 'Entrar' : 'Cadastrar')),

        // Link para alternar entre login/registro
        React.createElement('div', { className: "text-center mt-4" },
          React.createElement('button', {
            type: "button",
            onClick: () => setModo(modo === 'login' ? 'registro' : 'login'),
            className: "text-sm text-indigo-600 hover:text-indigo-800"
          }, modo === 'login' 
            ? 'Não tem conta? Cadastre-se' 
            : 'Já tem conta? Faça login')
        )
      )
    )
  );
}

export default Login;

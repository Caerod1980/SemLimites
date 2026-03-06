import React, { useState, useEffect } from 'react';
import { prestadoresAPI } from './api';

function TelaBusca({ onVerPerfil }) {
  const [cidade, setCidade] = useState("Bauru");
  const [categoria, setCategoria] = useState("");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const CIDADES = ["Bauru", "Piratininga", "Agudos"];
  const CATEGORIAS = [
    "Eletricista", "Encanador", "Diarista", "Pedreiro", 
    "Montador de Móveis", "Ar-condicionado", "Pintor",
    "Jardineiro", "Marceneiro", "Vidraceiro"
  ];

  const buscar = async () => {
    setLoading(true);
    setErro("");
    
    try {
      const filtros = {
        cidade,
        categoria: categoria || undefined,
        q: buscaTexto || undefined
      };
      
      const data = await prestadoresAPI.buscar(filtros);
      setResultados(data.prestadores || []);
    } catch (error) {
      setErro("Erro ao buscar prestadores");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buscar();
    }, 500);

    return () => clearTimeout(timer);
  }, [cidade, categoria, buscaTexto]);

  return React.createElement('div', { className: "max-w-7xl mx-auto px-4 py-8" },
    // Filtros
    React.createElement('div', { className: "bg-white rounded-2xl border border-slate-200 p-6 mb-6" },
      React.createElement('h1', { className: "text-2xl font-bold text-slate-900 mb-4" }, 
        "Encontre profissionais"
      ),
      
      React.createElement('div', { className: "grid md:grid-cols-4 gap-4" },
        // Cidade
        React.createElement('select', {
          value: cidade,
          onChange: (e) => setCidade(e.target.value),
          className: "px-4 py-2 rounded-xl border border-slate-200"
        }, CIDADES.map(c => 
          React.createElement('option', { key: c, value: c }, c)
        )),
        
        // Categoria
        React.createElement('select', {
          value: categoria,
          onChange: (e) => setCategoria(e.target.value),
          className: "px-4 py-2 rounded-xl border border-slate-200"
        }, [
          React.createElement('option', { key: '', value: "" }, "Todas as categorias"),
          ...CATEGORIAS.map(c => 
            React.createElement('option', { key: c, value: c }, c)
          )
        ]),
        
        // Busca por texto
        React.createElement('input', {
          type: "text",
          value: buscaTexto,
          onChange: (e) => setBuscaTexto(e.target.value),
          placeholder: "Buscar por nome ou serviço...",
          className: "px-4 py-2 rounded-xl border border-slate-200 md:col-span-2"
        })
      )
    ),

    // Loading
    loading && React.createElement('div', { className: "text-center py-8" },
      React.createElement('div', { 
        className: "w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" 
      }),
      React.createElement('p', { className: "text-slate-600" }, "Buscando prestadores...")
    ),

    // Erro
    erro && React.createElement('div', { className: "text-red-600 text-center py-8" }, erro),

    // Resultados
    !loading && !erro && React.createElement('div', { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6" },
      resultados.length === 0 
        ? React.createElement('div', { className: "col-span-full text-center py-12 text-slate-500" },
            "Nenhum prestador encontrado"
          )
        : resultados.map(p => 
            React.createElement(CardPrestador, { 
              key: p._id, 
              prestador: p,
              onVerPerfil: onVerPerfil
            })
          )
    )
  );
}

function CardPrestador({ prestador, onVerPerfil }) {
  const p = prestador;
  
  return React.createElement('div', { 
    className: "bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all hover:border-indigo-200" 
  },
    React.createElement('div', { className: "flex items-start gap-4" },
      React.createElement(Avatar, { name: p.nome, size: "lg" }),
      React.createElement('div', { className: "flex-1" },
        React.createElement('h3', { className: "font-bold text-lg text-slate-900" }, p.nome),
        React.createElement('p', { className: "text-sm text-slate-500 mt-1" }, 
          `${p.categoria} • ${p.cidade}`
        ),
        React.createElement('div', { className: "flex items-center gap-2 mt-2" },
          React.createElement(Stars, { value: p.estrelas || 0 }),
          React.createElement('span', { className: "text-xs text-slate-500" }, 
            `(${p.avaliacoes || 0} avaliações)`
          )
        ),
        React.createElement('p', { className: "mt-3 text-sm text-slate-600 line-clamp-2" }, 
          p.descricao
        ),
        React.createElement('button', {
          onClick: () => onVerPerfil(p),
          className: "mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium"
        }, "Ver perfil")
      )
    )
  );
}

// Componentes auxiliares (se não estiverem no index)
function Avatar({ name, size = "md" }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-rose-500 to-pink-600"
  ];
  const colorIndex = name.length % colors.length;
  
  return React.createElement('div', {
    className: `${colors[colorIndex]} w-10 h-10 rounded-2xl flex items-center justify-center font-semibold text-white shadow-md`
  }, initials);
}

function Stars({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  
  return React.createElement('div', { className: "flex items-center gap-0.5" },
    [1,2,3,4,5].map(i => 
      React.createElement('span', {
        key: i,
        className: i <= full || (i === full + 1 && half)
          ? "text-amber-400"
          : "text-slate-200"
      }, "★")
    ),
    React.createElement('span', { className: "ml-1 text-sm font-semibold text-slate-700" },
      value.toFixed(1)
    )
  );
}

export default TelaBusca;

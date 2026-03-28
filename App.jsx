import React, { useState, useEffect } from "react";
import { prestadoresAPI, testarConexao } from "./api.js";
import CadastroPrestador from "./CadastroPrestador";
import Login from "./Login";
import DashboardPrestador from "./DashboardPrestador";

// ========== CONSTANTES ==========
const BASE_PATH = '';
const API_URL = 'https://semlimites-api-rodrigo-b5ckghhkbxdqd7a8.canadacentral-01.azurewebsites.net/api';

// ========== UTILITÁRIOS ==========
function cls(...a) {
  return a.filter(Boolean).join(" ");
}

// ========== COMPONENTE DE ESTRELAS ==========
function Stars({ value, size = "md", showNumber = true }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const total = 5;
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl"
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: total }).map((_, i) => {
          const idx = i + 1;
          const filled = idx <= full;
          const isHalf = idx === full + 1 && half;
          
          return (
            <span
              key={idx}
              className={cls(
                sizeClasses[size],
                filled || isHalf 
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent" 
                  : "text-slate-200"
              )}
            >
              ★
            </span>
          );
        })}
      </div>
      {showNumber && (
        <span className={cls(
          "font-semibold text-slate-700",
          size === "sm" ? "text-sm" : "text-base"
        )}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ========== BADGE VERIFICADO COM POPUP ==========
function BadgeVerificado({ prestador, showDetails = true }) {
  const [showPopup, setShowPopup] = useState(false);
  
  if (!prestador.verificado) return null;

  const dados = prestador.dadosCNPJ || {};
  const dataVerificacao = prestador.dataVerificacaoCNPJ;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowPopup(!showPopup)}
        onMouseEnter={() => setShowPopup(true)}
        onMouseLeave={() => setShowPopup(false)}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-help"
      >
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
        </svg>
        Verificado
      </button>

      {showPopup && showDetails && dados.razaoSocial && (
        <div className="absolute z-50 mt-2 w-72 p-4 bg-white rounded-xl shadow-lg border border-slate-200 left-0">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Empresa Verificada</h4>
              <p className="text-xs text-slate-500">CNPJ ativo na Receita Federal</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Razão Social</span>
              <span className="text-slate-900 font-medium">{dados.razaoSocial}</span>
            </div>
            
            {prestador.cnpj && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">CNPJ</span>
                <span className="text-slate-900">{prestador.cnpj}</span>
              </div>
            )}
            
            {dados.situacao && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Situação</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  {dados.situacao}
                </span>
              </div>
            )}
            
            {dados.atividadePrincipal && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Atividade</span>
                <span className="text-slate-900">{dados.atividadePrincipal}</span>
              </div>
            )}
          </div>

          {dataVerificacao && (
            <div className="mt-3 pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-400">
                Verificado em {new Date(dataVerificacao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== BADGE GENÉRICO ==========
function Badge({ children, variant = "neutral", size = "sm" }) {
  const variants = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    highlight: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-600",
    expertise: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200"
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  return (
    <span className={cls(
      "inline-flex items-center rounded-full border font-medium",
      variants[variant],
      sizeClasses[size]
    )}>
      {children}
    </span>
  );
}

// ========== AVATAR ==========
function Avatar({ name, size = "md", className = "" }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    xxl: "w-24 h-24 text-2xl"
  };

  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-purple-500 to-violet-600"
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return (
    <div className={cls(
      "rounded-2xl bg-gradient-to-br flex items-center justify-center font-semibold text-white shadow-md",
      colors[colorIndex],
      sizeClasses[size],
      className
    )}>
      {initials}
    </div>
  );
}

// ========== CARD DE PRESTADOR ==========
function CardPrestador({ prestador }) {
  const p = prestador;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all hover:border-indigo-200 group">
      <div className="flex items-start gap-4">
        <Avatar name={p.nome || 'Nome'} size="lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-slate-900 truncate">{p.nome}</h3>
                {p.verificado && <BadgeVerificado prestador={p} showDetails={false} />}
                {p.destaque && <Badge variant="highlight" size="sm">Destaque</Badge>}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{p.categoria} • {p.cidade}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <Stars value={p.estrelas || 0} size="sm" />
            <span className="text-xs text-slate-500">{p.avaliacoes || 0} avaliações</span>
          </div>
          
          <p className="mt-3 text-sm text-slate-600 line-clamp-2">{p.descricao}</p>
          
          {p.tags && p.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {p.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex gap-2">
            <button className="flex-1 px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-center text-sm font-medium text-slate-700">
              Ver perfil
            </button>
            {p.whatsapp && (
              <a
                href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`Olá ${p.nome}, vi seu perfil no SemLimites.`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-center text-sm font-medium"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== FUNÇÃO PARA LIMPAR DADOS DE PAGAMENTO ==========
function limparDadosPagamento() {
  console.log('🧹 [App] Limpando dados de pagamento');
  localStorage.removeItem('pagamentoRetorno');
  localStorage.removeItem('preferenceId');
  localStorage.removeItem('paymentId');
  localStorage.removeItem('collectionStatus');
  localStorage.removeItem('pagamentoParams');
  sessionStorage.removeItem('cadastroPendente');
  sessionStorage.removeItem('preferenceId');
  sessionStorage.removeItem('paymentId');
  sessionStorage.removeItem('pagamentoRetorno');
  sessionStorage.removeItem('collectionStatus');
  sessionStorage.removeItem('pagamentoParams');
}

// ========== TELA DE BUSCA ==========
function Busca() {
  const [cidade, setCidade] = useState("Bauru");
  const [categoria, setCategoria] = useState("");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const CIDADES = ["Bauru", "Piratininga", "Agudos"];
  const CATEGORIAS = [
    "Eletricista", "Encanador", "Diarista", "Pedreiro", 
    "Montador de Móveis", "Ar-condicionado", "Pintor"
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
    buscar();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Encontre o profissional ideal
        </h1>
        
        <div className="grid md:grid-cols-4 gap-4">
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200"
          >
            {CIDADES.map(c => <option key={c}>{c}</option>)}
          </select>
          
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200"
          >
            <option value="">Todas categorias</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          
          <input
            type="text"
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            placeholder="Buscar..."
            className="px-4 py-2 rounded-xl border border-slate-200 col-span-2"
          />
        </div>
        
        <button
          onClick={buscar}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          Buscar
        </button>
      </div>

      {loading && <div className="text-center py-8">Carregando...</div>}
      {erro && <div className="text-red-600 text-center py-8">{erro}</div>}
      
      {!loading && !erro && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resultados.map(p => (
            <CardPrestador key={p._id} prestador={p} />
          ))}
        </div>
      )}
      
      {!loading && !erro && resultados.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhum prestador encontrado. Seja o primeiro a se cadastrar!
        </div>
      )}
    </div>
  );
}

// ========== COMPONENTE PRINCIPAL ==========
export default function App() {
  const [conectado, setConectado] = useState(false);
  const [modo, setModo] = useState('busca');
  const [usuario, setUsuario] = useState(null);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // Verificar conexão com API
  useEffect(() => {
    testarConexao().then(setConectado);
  }, []);

  // Verificar autenticação existente
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setUsuario(JSON.parse(user));
      setModo('dashboard');
    }
  }, []);

  // ===== CAPTURAR RETORNO DO MERCADO PAGO - VERSÃO CORRIGIDA =====
useEffect(() => {
  console.log('🔍 [App] Verificando retorno de pagamento...');
  console.log('🔍 [App] URL atual:', window.location.href);
  console.log('🔍 [App] Pathname:', window.location.pathname);
  console.log('🔍 [App] Search:', window.location.search);
  
  // Prevenir processamento duplicado
  if (window.pagamentoProcessando || processandoPagamento) {
    console.log('⚠️ [App] Pagamento já está sendo processado');
    return;
  }
  
  // ===== 1. VERIFICAR PARÂMETROS DA URL (PRIORIDADE MÁXIMA) =====
  const urlParams = new URLSearchParams(window.location.search);
  const retornoUrl = urlParams.get('retorno');
  const collectionStatusUrl = urlParams.get('collection_status');
  const preferenceIdUrl = urlParams.get('preference_id');
  const paymentIdUrl = urlParams.get('payment_id');
  const statusUrl = urlParams.get('status');
  
  console.log('🔍 [App] URL Params (PRIORIDADE):', {
    retorno: retornoUrl,
    collection_status: collectionStatusUrl,
    preference_id: preferenceIdUrl,
    payment_id: paymentIdUrl,
    status: statusUrl
  });
  
  // ===== 2. VERIFICAR LOCALSTORAGE (BACKUP) =====
  const pagamentoRetorno = localStorage.getItem('pagamentoRetorno');
  const preferenceIdSalvo = localStorage.getItem('preferenceId');
  const paymentIdSalvo = localStorage.getItem('paymentId');
  const collectionStatusSalvo = localStorage.getItem('collectionStatus');
  const dadosSalvos = sessionStorage.getItem('cadastroPendente');
  
  console.log('🔍 [App] localStorage (BACKUP):', {
    pagamentoRetorno,
    preferenceIdSalvo,
    paymentIdSalvo,
    collectionStatusSalvo
  });
  console.log('🔍 [App] sessionStorage - dadosSalvos:', !!dadosSalvos);
  
  // ===== 3. DETERMINAR STATUS DO PAGAMENTO - PRIORIDADE URL PARAMS =====
  let statusPagamento = null;
  let preferenceId = null;
  let paymentId = null;
  
  // PRIORIDADE 1: URL Params (mais confiável para PWA)
  if (retornoUrl === 'sucesso' || collectionStatusUrl === 'approved' || statusUrl === 'approved') {
    statusPagamento = 'sucesso';
    preferenceId = preferenceIdUrl || preferenceIdSalvo;
    paymentId = paymentIdUrl || paymentIdSalvo;
    console.log('📦 [App] Pagamento detectado via URL Params (PRIORITÁRIO)');
  }
  // PRIORIDADE 2: Collection Status da URL
  else if (collectionStatusUrl === 'approved') {
    statusPagamento = 'sucesso';
    preferenceId = preferenceIdUrl;
    paymentId = paymentIdUrl;
    console.log('📦 [App] Pagamento detectado via collection_status');
  }
  // PRIORIDADE 3: localStorage
  else if (pagamentoRetorno === 'sucesso') {
    statusPagamento = pagamentoRetorno;
    preferenceId = preferenceIdSalvo;
    paymentId = paymentIdSalvo;
    console.log('📦 [App] Pagamento detectado via localStorage');
  }
  // PRIORIDADE 4: Erro ou Pendente
  else if (retornoUrl === 'erro') {
    statusPagamento = 'erro';
    console.log('📦 [App] Pagamento com erro via URL');
  }
  else if (retornoUrl === 'pending') {
    statusPagamento = 'pending';
    console.log('📦 [App] Pagamento pendente via URL');
  }
  
  console.log('🔍 [App] Status final:', statusPagamento);
  console.log('🔍 [App] Preference ID:', preferenceId);
  console.log('🔍 [App] Payment ID:', paymentId);
  console.log('🔍 [App] Dados cadastro:', !!dadosSalvos);
  
  // Se não tem dados de cadastro, não processar
  if (!dadosSalvos) {
    if (statusPagamento) {
      console.log('🧹 [App] Limpando dados sem cadastro');
      limparDadosPagamento();
    }
    return;
  }
  
  // Se já está logado, limpar e ignorar
  if (localStorage.getItem('token')) {
    console.log('⚠️ [App] Usuário já logado, limpando dados pendentes');
    limparDadosPagamento();
    return;
  }
  
  // Processar apenas se for sucesso
  if (statusPagamento === 'sucesso') {
    console.log('✅✅✅ [App] PROCESSANDO PAGAMENTO APROVADO! ✅✅✅');
    console.log('💰 Payment ID:', paymentId);
    console.log('💰 Preference ID:', preferenceId);
    console.log('📦 Dados salvos encontrados');
    
    window.pagamentoProcessando = true;
    setProcessandoPagamento(true);
    
    const dados = JSON.parse(dadosSalvos);
    
    // Atualizar preferenceId e paymentId
    if (preferenceId && !dados.preferenceId) {
      dados.preferenceId = preferenceId;
    }
    if (paymentId) {
      dados.paymentId = paymentId;
    }
    
    async function criarPrestador() {
      console.log('📝 Criando prestador para:', dados.email);
      console.log('💰 Payment ID usado:', paymentId);
      console.log('🏷️ Preference ID usado:', dados.preferenceId);
      
      var dadosEnvio = {
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        tipo: 'prestador',
        tipoPessoa: dados.tipoPessoa,
        cidade: dados.cidade,
        estado: dados.estado,
        whatsapp: dados.whatsapp,
        telefone: dados.telefone || '',
        descricao: dados.descricao || '',
        tags: dados.tags || [],
        categoriaPrincipal: dados.categoriaPrincipal,
        servicos: dados.servicos,
        aceitouTermos: true,
        preferenceId: dados.preferenceId,
        paymentId: paymentId,
        planoStatus: 'ativo',
        planoAtivo: true,
        assinaturaAtivadaEm: new Date().toISOString()
      };
      
      if (dados.tipoPessoa === 'fisica') {
        dadosEnvio.cpf = dados.cpf;
      } else {
        dadosEnvio.cnpj = dados.cnpj;
        dadosEnvio.responsavel = dados.responsavel;
        if (dados.cnpjVerificado) {
          dadosEnvio.cnpjVerificado = true;
          dadosEnvio.razaoSocialVerificada = dados.razaoSocialVerificada;
          dadosEnvio.verificado = true;
        }
      }
      
      try {
        console.log('📤 Enviando requisição para /auth/register');
        const response = await fetch(API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosEnvio)
        });
        
        const registerData = await response.json();
        console.log('📥 Resposta do registro:', registerData);
        
        if (registerData.token) {
          console.log('✅ Prestador criado com sucesso!');
          localStorage.setItem('token', registerData.token);
          localStorage.setItem('user', JSON.stringify(registerData.user));
          setUsuario(registerData.user);
          
          // Limpar todos os dados pendentes
          limparDadosPagamento();
          sessionStorage.removeItem('cadastroPendente');
          
          // Limpar parâmetros da URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          alert('✅ Pagamento confirmado! Seu cadastro foi ativado com sucesso!');
          
          setTimeout(() => {
            setModo('dashboard');
            window.pagamentoProcessando = false;
            setProcessandoPagamento(false);
          }, 2000);
        } else {
          throw new Error(registerData.error || 'Erro no cadastro');
        }
      } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        alert('Erro ao finalizar cadastro: ' + error.message + '\n\nEntre em contato com o suporte.');
        window.pagamentoProcessando = false;
        setProcessandoPagamento(false);
        // Manter os dados para tentar novamente
        // Não limpar os dados aqui para que possa tentar novamente
      }
    }
    
    criarPrestador();
    
  } else if (statusPagamento === 'erro') {
    console.log('❌ Pagamento com erro');
    alert('Ocorreu um erro no pagamento. Tente novamente.');
    limparDadosPagamento();
    setTimeout(() => setModo('cadastro'), 1500);
  } else if (statusPagamento === 'pending') {
    console.log('⏳ Pagamento pendente');
    // Para pagamento pendente, tenta verificar novamente em 5 segundos
    setTimeout(() => {
      console.log('🔄 Tentando verificar pagamento pendente novamente...');
      window.location.reload();
    }, 5000);
    alert('Seu pagamento está sendo processado. Aguarde um momento...');
  }
}, [processandoPagamento]);

  const handleLoginSuccess = (userData) => {
    setUsuario(userData);
    setModo('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUsuario(null);
    setModo('busca');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setModo('busca')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white grid place-items-center font-bold">
              SL
            </div>
            <div>
              <h1 className="font-bold text-lg">SemLimites</h1>
              <p className="text-xs text-slate-500">
                {conectado ? '✅ Online' : '🔄 Conectando...'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {!usuario ? (
              <>
                <button
                  onClick={() => setModo('login')}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  Entrar
                </button>
                <button
                  onClick={() => setModo(modo === 'busca' ? 'cadastro' : 'busca')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition shadow-sm"
                >
                  {modo === 'busca' ? '📋 Sou Prestador' : '🔍 Ver Busca'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setModo('dashboard')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {modo === 'busca' && <Busca />}
      
      {modo === 'cadastro' && (
        <CadastroPrestador 
          onCadastroSucesso={() => setModo('busca')}
          onVoltar={() => setModo('busca')}
        />
      )}
      
      {modo === 'login' && (
        <Login
          tipo="cliente"
          onLoginSuccess={handleLoginSuccess}
          onVoltar={() => setModo('busca')}
        />
      )}
      
      {modo === 'dashboard' && usuario && (
        <DashboardPrestador
          usuario={usuario}
          onSair={handleLogout}
        />
      )}
    </div>
  );
}

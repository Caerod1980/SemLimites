import React, { useState } from 'react';
import { prestadoresAPI } from './api';

function CadastroPrestador({ onCadastroSucesso, onVoltar }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cnpj: '',
    categoria: '',
    cidade: 'Bauru',
    whatsapp: '',
    telefone: '',
    descricao: '',
    tags: ''
  });

  const [etapa, setEtapa] = useState('form'); // form, verificando, verificado
  const [verificacaoCNPJ, setVerificacaoCNPJ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const CIDADES = ["Bauru", "Piratininga", "Agudos"];
  const CATEGORIAS = [
    "Eletricista", "Encanador", "Diarista", "Pedreiro", 
    "Montador de Móveis", "Ar-condicionado", "Pintor",
    "Jardineiro", "Marceneiro", "Vidraceiro"
  ];

  // Formata CNPJ
  const formatarCNPJ = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  // Formata telefone
  const formatarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 10) {
      return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cnpj') {
      setFormData({ ...formData, cnpj: formatarCNPJ(value) });
    } else if (name === 'whatsapp' || name === 'telefone') {
      setFormData({ ...formData, [name]: formatarTelefone(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleVerificarCNPJ = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    
    if (!formData.cnpj || cnpjLimpo.length !== 14) {
      setErro('CNPJ inválido. Digite um CNPJ com 14 dígitos.');
      return;
    }

    setLoading(true);
    setErro('');
    setEtapa('verificando');

    try {
      const resultado = await prestadoresAPI.verificarCNPJ(formData.cnpj);
      
      if (resultado.valido) {
        setVerificacaoCNPJ(resultado);
        setEtapa('verificado');
      } else {
        setErro(resultado.motivo || 'CNPJ não encontrado na Receita Federal');
        setEtapa('form');
      }
    } catch (error) {
      setErro(error.message || 'Erro ao verificar CNPJ');
      setEtapa('form');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // Prepara dados para envio
      const dadosEnvio = {
        nome: formData.nome,
        email: formData.email,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        categoria: formData.categoria,
        cidade: formData.cidade,
        whatsapp: formData.whatsapp.replace(/\D/g, ''),
        telefone: formData.telefone.replace(/\D/g, ''),
        descricao: formData.descricao,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        verificado: verificacaoCNPJ?.valido || false,
        dadosCNPJ: verificacaoCNPJ?.empresa || null,
        dataVerificacaoCNPJ: verificacaoCNPJ?.valido ? new Date() : null
      };

      const resposta = await fetch(`${prestadoresAPI.API_URL}/prestadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosEnvio)
      });

      const data = await resposta.json();

      if (!resposta.ok) {
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      alert('✅ Prestador cadastrado com sucesso!');
      if (onCadastroSucesso) onCadastroSucesso(data.prestador);
      
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Cadastro de Prestador
          </h1>
          <button
            onClick={onVoltar}
            className="px-4 py-2 text-sm text-slate-600 hover:text-indigo-600"
          >
            ← Voltar
          </button>
        </div>

        <p className="text-slate-600 mb-6">
          Preencha seus dados para começar a receber clientes
        </p>

        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Dados da Empresa */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
              📋 Dados da Empresa
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Ex: João Souza Eletricista"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CNPJ *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  maxLength="18"
                  required
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                  placeholder="00.000.000/0001-00"
                />
                {etapa !== 'verificado' && (
                  <button
                    type="button"
                    onClick={handleVerificarCNPJ}
                    disabled={loading || formData.cnpj.replace(/\D/g, '').length !== 14}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap"
                  >
                    {loading ? '...' : 'Verificar'}
                  </button>
                )}
              </div>
            </div>

            {etapa === 'verificando' && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">🔍 Consultando Receita Federal...</p>
              </div>
            )}

            {verificacaoCNPJ?.valido && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-600 font-semibold">✓ CNPJ Válido</span>
                </div>
                <p className="text-sm text-emerald-700">
                  <strong>Razão Social:</strong> {verificacaoCNPJ.empresa.razaoSocial}<br />
                  <strong>Situação:</strong> {verificacaoCNPJ.situacao}
                </p>
              </div>
            )}
          </div>

          {/* Seção 2: Dados Profissionais */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
              🛠️ Dados Profissionais
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Categoria *
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Selecione</option>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cidade *
                </label>
                <select
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                >
                  {CIDADES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="text"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                  placeholder="(14) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                  placeholder="(14) 3232-1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição do Serviço *
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                placeholder="Descreva seus serviços, experiência, áreas de atuação..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags / Especialidades
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200"
                placeholder="Emergência, Residencial, Comercial (separados por vírgula)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Separe por vírgula. Ex: emergência, residencial, comercial
              </p>
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading || !formData.nome || !formData.email || !formData.cnpj || !formData.categoria}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all text-lg"
          >
            {loading ? 'Cadastrando...' : '✅ Cadastrar Prestador'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CadastroPrestador;

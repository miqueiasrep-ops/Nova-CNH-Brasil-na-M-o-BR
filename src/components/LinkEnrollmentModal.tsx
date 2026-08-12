import React, { useState } from 'react';
import { Aluno } from '../types';
import { Link, Copy, Check, Sparkles, UserCheck, ShieldCheck, ArrowRight, X, ExternalLink, QrCode } from 'lucide-react';

interface LinkEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  alunos: Aluno[];
  onMatricular: (cand: Partial<Aluno>) => void;
  baseUrl?: string;
  initialSelectedAlunoId?: string;
}

export function safeBtoa(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  } catch (e) {
    try {
      return btoa(encodeURIComponent(str));
    } catch (err) {
      return str;
    }
  }
}

export function safeAtob(b64: string): string {
  if (!b64) return '';
  const cleanB64 = b64.replace(/ /g, '+');
  try {
    const bin = atob(cleanB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    try {
      return decodeURIComponent(atob(cleanB64));
    } catch (err) {
      return cleanB64;
    }
  }
}

export function parseCandidateLink(urlOrReg: string): Partial<Aluno> & { rawReg?: string } {
  let target = urlOrReg.trim();
  let result: Partial<Aluno> & { rawReg?: string } = {};

  if (!target) return result;

  // Extract query string if full URL
  let queryString = target;
  if (target.includes('?')) {
    queryString = target.substring(target.indexOf('?'));
  }
  
  const params = new URLSearchParams(queryString.startsWith('?') ? queryString : `?${queryString}`);

  // 1. Check reg or data parameter
  const regParam = params.get('reg') || params.get('data') || (!target.includes('?') && !target.startsWith('http') ? target : '');
  if (regParam) {
    result.rawReg = regParam;
    try {
      const decoded = safeAtob(regParam);
      if (decoded.trim().startsWith('{') && decoded.trim().endsWith('}')) {
        const parsed = JSON.parse(decoded);
        Object.assign(result, parsed);
      }
    } catch (e) {}
  }

  // 2. Read explicit URL parameters with support for synonyms
  const pNome = params.get('nome') || params.get('name') || params.get('nome_completo') || params.get('candidato') || params.get('aluno');
  if (pNome) result.nome = pNome;

  const pCpf = params.get('cpf') || params.get('documento') || params.get('cpf_aluno');
  if (pCpf) result.cpf = pCpf;

  const pRg = params.get('rg');
  if (pRg) result.rg = pRg;

  const pWhatsapp = params.get('whatsapp') || params.get('phone') || params.get('telefone') || params.get('celular') || params.get('tel');
  if (pWhatsapp) result.whatsapp = pWhatsapp;

  const pCategoria = params.get('categoria') || params.get('category') || params.get('cat') || params.get('cnh');
  if (pCategoria) result.categoria = pCategoria;

  const pInstrutor = params.get('instrutor') || params.get('vendedor') || params.get('instructor') || params.get('ref');
  if (pInstrutor) result.instrutor = pInstrutor;

  const pEndereco = params.get('endereco') || params.get('address');
  if (pEndereco) result.endereco = pEndereco;

  const pNacionalidade = params.get('nacionalidade');
  if (pNacionalidade) result.nacionalidade = pNacionalidade;

  const pEstadoCivil = params.get('estadoCivil');
  if (pEstadoCivil) result.estadoCivil = pEstadoCivil;

  const pDob = params.get('dob') || params.get('nascimento') || params.get('data_nascimento');
  if (pDob) result.dob = pDob;

  const pValorTotal = params.get('valorTotal') || params.get('valor') || params.get('price');
  if (pValorTotal) result.valorTotal = parseFloat(pValorTotal) || result.valorTotal;

  const pForma = params.get('formaPagamento') || params.get('forma');
  if (pForma) result.formaPagamento = pForma as any;

  return result;
}

export const getAppBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://ais-pre-3bzikdpe5rrgnzblrxzvkl-214721108853.us-west1.run.app';
};

export function generateCandidateLink(aluno: Partial<Aluno>, targetBaseUrl?: string): string {
  const defaultUrl = getAppBaseUrl();
  let baseUrlStr = (targetBaseUrl && targetBaseUrl.trim()) ? targetBaseUrl.trim() : defaultUrl;
  
  if (!baseUrlStr.startsWith('http://') && !baseUrlStr.startsWith('https://')) {
    baseUrlStr = `https://${baseUrlStr}`;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(baseUrlStr);
  } catch (e) {
    try {
      urlObj = new URL(defaultUrl);
    } catch {
      urlObj = new URL('https://ais-pre-3bzikdpe5rrgnzblrxzvkl-214721108853.us-west1.run.app');
    }
  }

  // Action indicator
  urlObj.searchParams.set('inscrever', 'true');

  // Add reg param if candidate ID is present
  if (aluno.id) {
    urlObj.searchParams.set('reg', safeBtoa(aluno.id));
  }

  // Clean explicit parameters (no bloated base64 blobs or duplicate keys that trigger WAF 403 Forbidden)
  if (aluno.nome?.trim()) urlObj.searchParams.set('nome', aluno.nome.trim());
  if (aluno.cpf?.trim()) urlObj.searchParams.set('cpf', aluno.cpf.trim());
  if (aluno.rg?.trim()) urlObj.searchParams.set('rg', aluno.rg.trim());
  if (aluno.whatsapp?.trim()) urlObj.searchParams.set('whatsapp', aluno.whatsapp.trim());
  if (aluno.categoria?.trim()) urlObj.searchParams.set('categoria', aluno.categoria.trim());
  if (aluno.instrutor?.trim()) urlObj.searchParams.set('instrutor', aluno.instrutor.trim());
  if (aluno.endereco?.trim()) urlObj.searchParams.set('endereco', aluno.endereco.trim());
  if (aluno.dob?.trim()) urlObj.searchParams.set('dob', aluno.dob.trim());
  if (aluno.valorTotal) urlObj.searchParams.set('valorTotal', String(aluno.valorTotal));

  return urlObj.toString();
}

export function LinkEnrollmentModal({ isOpen, onClose, alunos, onMatricular, baseUrl, initialSelectedAlunoId }: LinkEnrollmentModalProps) {
  const [autodriveUrl, setAutodriveUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autodrive_base_url');
      if (
        saved && 
        saved.trim() && 
        saved !== 'https://autodrive.com.br' &&
        !saved.includes('ais-pre-5mj6epgm3ydzpxhtlpj3ml')
      ) {
        return saved.trim();
      }
    }
    return getAppBaseUrl();
  });

  const handleUpdateAutodriveUrl = (newUrl: string) => {
    setAutodriveUrl(newUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autodrive_base_url', newUrl);
    }
  };

  const currentPlatformOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [inputUrl, setInputUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [parsedCandidate, setParsedCandidate] = useState<Partial<Aluno>>({});

  // Export to Autodrive state
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [genNome, setGenNome] = useState('');
  const [genCpf, setGenCpf] = useState('');
  const [genRg, setGenRg] = useState('');
  const [genWhatsapp, setGenWhatsapp] = useState('');
  const [genCategoria, setGenCategoria] = useState('Carro (B)');
  const [genInstrutor, setGenInstrutor] = useState('Miqueias Souza de Lima — Instrutor Autônomo');
  const [genEndereco, setGenEndereco] = useState('');
  const [generatedUrlResult, setGeneratedUrlResult] = useState('');
  const [showGenerateToast, setShowGenerateToast] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialSelectedAlunoId) {
      handleSelectExistingAluno(initialSelectedAlunoId);
    }
  }, [isOpen, initialSelectedAlunoId]);

  // Continuously recalculate generatedUrlResult whenever inputs change
  React.useEffect(() => {
    const link = generateCandidateLink({
      id: selectedAlunoId,
      nome: genNome,
      cpf: genCpf,
      rg: genRg,
      whatsapp: genWhatsapp,
      categoria: genCategoria,
      instrutor: genInstrutor,
      endereco: genEndereco
    }, autodriveUrl);
    setGeneratedUrlResult(link);
  }, [selectedAlunoId, genNome, genCpf, genRg, genWhatsapp, genCategoria, genInstrutor, genEndereco, autodriveUrl]);

  if (!isOpen) return null;

  const handleParseLink = (val: string) => {
    setInputUrl(val);
    if (!val.trim()) {
      setParsedCandidate({});
      return;
    }
    const extracted = parseCandidateLink(val);
    setParsedCandidate(extracted);
  };

  const handleConfirmMatricula = () => {
    if (!parsedCandidate.nome && !genNome) {
      alert("Por favor, informe ou cole um link com o Nome do Candidato!");
      return;
    }

    const candToRegister = activeTab === 'import' ? parsedCandidate : {
      nome: genNome,
      cpf: genCpf,
      rg: genRg,
      whatsapp: genWhatsapp,
      categoria: genCategoria,
      instrutor: genInstrutor,
      endereco: genEndereco
    };

    onMatricular(candToRegister);
    onClose();
  };

  const handleButtonClickGenerate = () => {
    const link = generateCandidateLink({
      id: selectedAlunoId,
      nome: genNome,
      cpf: genCpf,
      rg: genRg,
      whatsapp: genWhatsapp,
      categoria: genCategoria,
      instrutor: genInstrutor,
      endereco: genEndereco
    }, autodriveUrl);

    setGeneratedUrlResult(link);
    setCopied(true);
    setShowGenerateToast(true);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {});
    }

    setTimeout(() => {
      setCopied(false);
      setShowGenerateToast(false);
    }, 3500);
  };

  const handleSelectExistingAluno = (id: string) => {
    setSelectedAlunoId(id);
    const found = alunos.find(a => a.id === id);
    if (found) {
      setGenNome(found.nome || '');
      setGenCpf(found.cpf || '');
      setGenRg(found.rg || '');
      setGenWhatsapp(found.whatsapp || '');
      setGenCategoria(found.categoria || 'Carro (B)');
      setGenInstrutor(found.instrutor || 'Miqueias Souza de Lima — Instrutor Autônomo');
      setGenEndereco(found.endereco || '');
    }
  };

  const handleOpenInAutodrive = () => {
    let finalLink = generatedUrlResult;
    if (!finalLink) {
      finalLink = generateCandidateLink({
        id: selectedAlunoId,
        nome: genNome,
        cpf: genCpf,
        rg: genRg,
        whatsapp: genWhatsapp,
        categoria: genCategoria,
        instrutor: genInstrutor,
        endereco: genEndereco
      }, autodriveUrl);
    }
    window.open(finalLink, '_blank', 'noopener,noreferrer');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c2340] to-indigo-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Link className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-wide font-sans flex items-center gap-2">
                Integração & Link Autodrive
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  App Autodrive
                </span>
              </h3>
              <p className="text-xs text-indigo-200 font-sans mt-0.5">
                Alimente o link de inscrição com o cadastro do candidato e envie direto para o aplicativo Autodrive
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs font-sans transition-all flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-white text-[#0c2340] shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-amber-500" />
            1. Alimentar & Enviar para Autodrive
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs font-sans transition-all flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-white text-[#0c2340] shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            2. Importar Link Autodrive / Registrar Local
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-950 text-xs leading-relaxed space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900 text-sm">
                  <Link className="w-4 h-4 text-amber-600" />
                  Alimentar Link e Enviar Matrícula ao Autodrive
                </p>
                <p>
                  Selecione um candidato cadastrado neste sistema (ex: William, Sabrina, Robson, Victor) ou preencha a ficha abaixo. O sistema vai montar o <strong>link parametrizado do Autodrive</strong> com todos os dados preenchidos automaticamente.
                </p>
              </div>

              {/* Autodrive App Base URL config */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                    URL Destino do Sistema Autodrive:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateAutodriveUrl(getAppBaseUrl())}
                      className={`text-[10px] font-black px-2 py-1 rounded-md transition ${
                        autodriveUrl === getAppBaseUrl()
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Usar URL da Plataforma Atual"
                    >
                      ⚡ Plataforma CNH
                    </button>
                    {currentPlatformOrigin && currentPlatformOrigin !== getAppBaseUrl() && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAutodriveUrl(currentPlatformOrigin)}
                        className={`text-[10px] font-black px-2 py-1 rounded-md transition ${
                          autodriveUrl === currentPlatformOrigin
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Usar URL da Plataforma Local Atual"
                      >
                        🏠 Origem Atual
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={autodriveUrl}
                  onChange={(e) => handleUpdateAutodriveUrl(e.target.value)}
                  placeholder={getAppBaseUrl()}
                  className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
                <p className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Destino das requisições e formulários. A URL fica salva no seu navegador.</span>
                  <span className="font-mono text-indigo-700 font-bold">Salvo no LocalStorage ✓</span>
                </p>
              </div>

              {alunos.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5 font-sans flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Puxar Dados de Candidato Existente:
                  </label>
                  <select
                    value={selectedAlunoId}
                    onChange={(e) => handleSelectExistingAluno(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 shadow-sm"
                  >
                    <option value="">-- Selecionar candidato da lista --</option>
                    {alunos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.id} - {a.nome} {a.cpf ? `(CPF: ${a.cpf})` : ''} - {a.categoria}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Nome Completo:</label>
                  <input
                    type="text"
                    value={genNome}
                    onChange={(e) => setGenNome(e.target.value)}
                    placeholder="Ex: Sabrina Maria da Silva"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">CPF do Candidato:</label>
                  <input
                    type="text"
                    value={genCpf}
                    onChange={(e) => setGenCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">RG:</label>
                  <input
                    type="text"
                    value={genRg}
                    onChange={(e) => setGenRg(e.target.value)}
                    placeholder="9.999.999 SDS/PE"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">WhatsApp:</label>
                  <input
                    type="text"
                    value={genWhatsapp}
                    onChange={(e) => setGenWhatsapp(e.target.value)}
                    placeholder="(81) 99999-9999"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Categoria CNH:</label>
                  <select
                    value={genCategoria}
                    onChange={(e) => setGenCategoria(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  >
                    <option value="Moto (A)">Moto (A)</option>
                    <option value="Carro (B)">Carro (B)</option>
                    <option value="Moto e Carro (AB)">Moto e Carro (AB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Instrutor Responsável:</label>
                  <input
                    type="text"
                    value={genInstrutor}
                    onChange={(e) => setGenInstrutor(e.target.value)}
                    placeholder="Miqueias Souza de Lima"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-0.5 font-semibold bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleButtonClickGenerate}
                  className="flex-1 py-3 px-4 bg-[#0c2340] hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  Gerar / Atualizar Link Autodrive
                </button>
                {generatedUrlResult && (
                  <button
                    onClick={handleOpenInAutodrive}
                    className="py-3 px-5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no Autodrive
                  </button>
                )}
              </div>

              {showGenerateToast && (
                <div className="bg-emerald-600 text-white p-3 rounded-xl font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-200" />
                    Link Autodrive gerado e copiado para a área de transferência!
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded uppercase font-black">
                    Copiado!
                  </span>
                </div>
              )}

              {generatedUrlResult && (
                <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-amber-950 font-sans flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Link Alimentado Pronto para Envio ao Autodrive:
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                      Pronto
                    </span>
                  </div>
                  
                  <div className="p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono break-all text-slate-800 select-all max-h-24 overflow-y-auto">
                    {generatedUrlResult}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedUrlResult)}
                      className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Link Copiado!' : 'Copiar Link Autodrive'}
                    </button>
                    
                    <button
                      onClick={handleOpenInAutodrive}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Enviar / Abrir Sistema Autodrive
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Importar Link do Autodrive ou Parâmetro de Inscrição
                </p>
                <p>
                  Cole qualquer link de cadastro do Autodrive (por exemplo: 
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-mono break-all font-semibold ml-1">
                    https://ais-pre-5mj6epgm3ydzpxhtlpj3ml-214721108853.us-west1.run.app/?reg=...
                  </code>) para importar e matricular o candidato neste App de Gestão!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
                  Cole o Link ou Parâmetro `?reg=...` do Autodrive:
                </label>
                <textarea
                  value={inputUrl}
                  onChange={(e) => handleParseLink(e.target.value)}
                  placeholder="https://ais-pre-5mj6epgm3ydzpxhtlpj3ml-214721108853.us-west1.run.app/?reg=MTc4MDA2MTIyMzI3Mw"
                  rows={3}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                />
              </div>

              {/* Extracted candidate details preview */}
              {Object.keys(parsedCandidate).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase font-sans flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Ficha do Candidato Identificada no Link:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Nome Completo:</span>
                      <input
                        type="text"
                        value={parsedCandidate.nome || ''}
                        onChange={(e) => setParsedCandidate({ ...parsedCandidate, nome: e.target.value })}
                        placeholder="Nome do candidato"
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">CPF:</span>
                      <input
                        type="text"
                        value={parsedCandidate.cpf || ''}
                        onChange={(e) => setParsedCandidate({ ...parsedCandidate, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">WhatsApp:</span>
                      <input
                        type="text"
                        value={parsedCandidate.whatsapp || ''}
                        onChange={(e) => setParsedCandidate({ ...parsedCandidate, whatsapp: e.target.value })}
                        placeholder="(81) 99999-9999"
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Categoria Pretendida:</span>
                      <select
                        value={parsedCandidate.categoria || 'Carro (B)'}
                        onChange={(e) => setParsedCandidate({ ...parsedCandidate, categoria: e.target.value })}
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg mt-0.5 bg-white"
                      >
                        <option value="Moto (A)">Moto (A)</option>
                        <option value="Carro (B)">Carro (B)</option>
                        <option value="Moto e Carro (AB)">Moto e Carro (AB)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Instrutor Responsável:</span>
                      <input
                        type="text"
                        value={parsedCandidate.instrutor || 'Miqueias Souza de Lima — Instrutor Autônomo'}
                        onChange={(e) => setParsedCandidate({ ...parsedCandidate, instrutor: e.target.value })}
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg mt-0.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmMatricula}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-5 h-5" />
                EFETUAR MATRÍCULA IMEDIATA NO APP DE GESTÃO
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  Flame, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  Edit3, 
  Trash2, 
  FileText, 
  PhoneCall, 
  Sparkles, 
  Star, 
  Calendar,
  Send,
  X,
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { Aluno, EtapaCrm, TemperaturaLead, NotaCrm, Instrutor } from '../types';

interface SalesKanbanCrmProps {
  alunos: Aluno[];
  setAlunos: React.Dispatch<React.SetStateAction<Aluno[]>>;
  instrutores?: Instrutor[];
  onSaveToCloud?: (updatedList: Aluno[]) => void;
  onOpenCandidateDetail?: (aluno: Aluno) => void;
}

const ETAPAS: { id: EtapaCrm; titulo: string; icon: string; corBadge: string; corBorda: string; bgCol: string; descricao: string }[] = [
  {
    id: 'novo_lead',
    titulo: 'Novos Contatos / Leads',
    icon: '📥',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-200',
    corBorda: 'border-blue-500',
    bgCol: 'bg-blue-50/40',
    descricao: 'Contatos recentes aguardando primeiro atendimento'
  },
  {
    id: 'em_atendimento',
    titulo: 'Em Atendimento',
    icon: '💬',
    corBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    corBorda: 'border-amber-500',
    bgCol: 'bg-amber-50/40',
    descricao: 'Conversando no WhatsApp e identificando necessidades'
  },
  {
    id: 'proposta_enviada',
    titulo: 'Simulação Enviada',
    icon: '📊',
    corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    corBorda: 'border-indigo-500',
    bgCol: 'bg-indigo-50/40',
    descricao: 'Recebeu valores, parcelamento e categoria'
  },
  {
    id: 'negociacao',
    titulo: 'Em Negociação',
    icon: '🤝',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    corBorda: 'border-purple-500',
    bgCol: 'bg-purple-50/40',
    descricao: 'Alinhando forma de pagamento e instrutor'
  },
  {
    id: 'ganho',
    titulo: 'Matrícula Concluída',
    icon: '🏆',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    corBorda: 'border-emerald-500',
    bgCol: 'bg-emerald-50/40',
    descricao: 'Venda ganha! Aluno cadastrado e ativo'
  },
  {
    id: 'perdido',
    titulo: 'Sem Retorno / Perdido',
    icon: '⏸️',
    corBadge: 'bg-slate-100 text-slate-700 border-slate-200',
    corBorda: 'border-slate-400',
    bgCol: 'bg-slate-50/50',
    descricao: 'Adiou decisão ou não respondeu'
  }
];

export function SalesKanbanCrm({
  alunos,
  setAlunos,
  instrutores = [],
  onSaveToCloud,
  onOpenCandidateDetail
}: SalesKanbanCrmProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('todos');
  const [selectedPlanoFilter, setSelectedPlanoFilter] = useState<string>('todos');
  
  // Modal states
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [activeWhatsappScriptLead, setActiveWhatsappScriptLead] = useState<Aluno | null>(null);
  const [activeNoteModalLead, setActiveNoteModalLead] = useState<Aluno | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  
  // New Lead form state
  const [newLeadNome, setNewLeadNome] = useState('');
  const [newLeadWhatsapp, setNewLeadWhatsapp] = useState('');
  const [newLeadCategoria, setNewLeadCategoria] = useState('Carro (B)');
  const [newLeadPlano, setNewLeadPlano] = useState<'adulto-18' | 'jovem-17' | 'habilitado'>('adulto-18');
  const [newLeadTemperatura, setNewLeadTemperatura] = useState<TemperaturaLead>('quente');
  const [newLeadOrigem, setNewLeadOrigem] = useState('WhatsApp');
  const [newLeadValor, setNewLeadValor] = useState<number>(1800);
  const [newLeadObs, setNewLeadObs] = useState('');

  // Helper to infer or format CRM stage
  const getAlunoEtapa = (aluno: Aluno): EtapaCrm => {
    if (aluno.etapaCrm) return aluno.etapaCrm;
    // Auto-infer if not previously set
    if (aluno.parcelasPagas > 0) return 'ganho';
    if (aluno.dataCadastro) return 'novo_lead';
    return 'novo_lead';
  };

  const getAlunoTemperatura = (aluno: Aluno): TemperaturaLead => {
    if (aluno.temperatura) return aluno.temperatura;
    return 'quente';
  };

  // Helper update
  const updateAlunoCrm = (alunoId: string, updates: Partial<Aluno>) => {
    setAlunos(prev => {
      const updated = prev.map(a => {
        if (a.id === alunoId) {
          return {
            ...a,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      });
      if (onSaveToCloud) onSaveToCloud(updated);
      return updated;
    });
  };

  const moveAlunoStage = (alunoId: string, newEtapa: EtapaCrm) => {
    updateAlunoCrm(alunoId, { 
      etapaCrm: newEtapa,
      dataUltimoContato: new Date().toISOString()
    });
  };

  const setLeadTemperatura = (alunoId: string, temp: TemperaturaLead) => {
    updateAlunoCrm(alunoId, { temperatura: temp });
  };

  const handleAddNote = (alunoId: string) => {
    if (!newNoteText.trim()) return;
    const targetAluno = alunos.find(a => a.id === alunoId);
    if (!targetAluno) return;

    const novaNota: NotaCrm = {
      id: 'nota_' + Date.now(),
      data: new Date().toISOString(),
      texto: newNoteText.trim(),
      autor: 'Equipe de Atendimento'
    };

    const updatedNotas = [novaNota, ...(targetAluno.notasCrm || [])];
    updateAlunoCrm(alunoId, { 
      notasCrm: updatedNotas,
      dataUltimoContato: new Date().toISOString()
    });
    setNewNoteText('');
    setActiveNoteModalLead(null);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadNome.trim() || !newLeadWhatsapp.trim()) return;

    const novoId = 'LEAD-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const novoAluno: Aluno = {
      id: novoId,
      nome: newLeadNome.trim(),
      whatsapp: newLeadWhatsapp.trim(),
      categoria: newLeadCategoria,
      instrutor: 'A definir',
      dataAdesao: new Date().toISOString().substring(0, 10),
      parcelasPagas: 0,
      valorTotal: Number(newLeadValor) || 1800,
      tipoPlano: newLeadPlano === 'adulto-18' 
        ? 'Plano CNH Facilitada Maiores de 18 Anos' 
        : newLeadPlano === 'jovem-17' 
        ? 'Plano Poupança Jovem 17 Anos' 
        : 'Treinamento para Habilitados',
      dataCadastro: nowIso,
      etapaCrm: 'novo_lead',
      temperatura: newLeadTemperatura,
      origemLead: newLeadOrigem,
      observacoesCrm: newLeadObs.trim(),
      notasCrm: newLeadObs.trim() ? [{
        id: 'nota_init_' + Date.now(),
        data: nowIso,
        texto: `Lead registrado via ${newLeadOrigem}: ${newLeadObs.trim()}`,
        autor: 'Registro Inicial'
      }] : [],
      dataUltimoContato: nowIso
    };

    setAlunos(prev => {
      const updated = [novoAluno, ...prev];
      if (onSaveToCloud) onSaveToCloud(updated);
      return updated;
    });

    // Reset
    setNewLeadNome('');
    setNewLeadWhatsapp('');
    setNewLeadObs('');
    setIsNewLeadModalOpen(false);
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return alunos.filter(aluno => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (aluno.nome || '').toLowerCase().includes(term) ||
        (aluno.whatsapp || '').includes(term) ||
        (aluno.categoria || '').toLowerCase().includes(term) ||
        (aluno.endereco || '').toLowerCase().includes(term) ||
        (aluno.id || '').toLowerCase().includes(term);

      if (!matchSearch) return false;

      // Temperatura
      if (selectedTemperatura !== 'todos') {
        const temp = getAlunoTemperatura(aluno);
        if (temp !== selectedTemperatura) return false;
      }

      // Plano
      if (selectedPlanoFilter !== 'todos') {
        const tipo = (aluno.tipoPlano || '').toLowerCase();
        if (selectedPlanoFilter === 'adulto-18' && !tipo.includes('18')) return false;
        if (selectedPlanoFilter === 'jovem-17' && !tipo.includes('jovem') && !tipo.includes('17')) return false;
        if (selectedPlanoFilter === 'habilitado' && !tipo.includes('habilitado')) return false;
      }

      return true;
    });
  }, [alunos, searchTerm, selectedTemperatura, selectedPlanoFilter]);

  // Funnel Metrics
  const pipelineMetrics = useMemo(() => {
    const totalLeads = alunos.length;
    const totalValor = alunos.reduce((acc, a) => acc + (a.valorTotal || 1800), 0);
    const quentes = alunos.filter(a => getAlunoTemperatura(a) === 'quente').length;
    const ganhos = alunos.filter(a => getAlunoEtapa(a) === 'ganho').length;
    const taxaConversao = totalLeads > 0 ? Math.round((ganhos / totalLeads) * 100) : 0;

    return { totalLeads, totalValor, quentes, ganhos, taxaConversao };
  }, [alunos]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER DO CRM DE VENDAS */}
      <div className="bg-gradient-to-r from-[#0c2340] via-[#112d52] to-[#1e3a8a] text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> CRM de Vendas Inteligente
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              Kanban de Atendimento
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>📈 Funil & Acompanhamento de Leads</span>
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            Gerencie o contato com candidatos interessados, dispare mensagens rápidas pelo WhatsApp, envie simulações do <strong>Plano 18+ Anos</strong> e acompanhe o avanço das matrículas em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Lead / Interessado</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS DO PIPELINE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 md:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total no Funil</span>
            <strong className="text-xl md:text-2xl font-black text-slate-900">{pipelineMetrics.totalLeads}</strong>
            <span className="text-[10px] text-slate-500 block">oportunidades ativas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 md:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Leads Quentes</span>
            <strong className="text-xl md:text-2xl font-black text-amber-600 flex items-center gap-1">
              🔥 {pipelineMetrics.quentes}
            </strong>
            <span className="text-[10px] text-slate-500 block">alta intenção de compra</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 md:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Valor em Negociação</span>
            <strong className="text-lg md:text-xl font-black text-indigo-700">
              {pipelineMetrics.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </strong>
            <span className="text-[10px] text-slate-500 block">volume total em aberto</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 md:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Matrículas Ganhas</span>
            <strong className="text-xl md:text-2xl font-black text-emerald-600 flex items-center gap-1">
              🏆 {pipelineMetrics.ganhos}
            </strong>
            <span className="text-[10px] text-emerald-700 font-bold block">{pipelineMetrics.taxaConversao}% de conversão</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lead por nome, telefone WhatsApp ou categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0c2340] text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Temperatura */}
          <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Filter className="w-3 h-3" /> Temperatura:
            </span>
            <button
              onClick={() => setSelectedTemperatura('todos')}
              className={`text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                selectedTemperatura === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedTemperatura('quente')}
              className={`text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                selectedTemperatura === 'quente'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              🔥 Quente
            </button>
            <button
              onClick={() => setSelectedTemperatura('morno')}
              className={`text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                selectedTemperatura === 'morno'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              ⚡ Morno
            </button>
            <button
              onClick={() => setSelectedTemperatura('frio')}
              className={`text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                selectedTemperatura === 'frio'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ❄️ Frio
            </button>
          </div>

          {/* Filtro por Plano */}
          <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0">
            <select
              value={selectedPlanoFilter}
              onChange={e => setSelectedPlanoFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#0c2340]"
            >
              <option value="todos">Todos os Planos</option>
              <option value="adulto-18">⭐ Plano 18+ Anos (Adulto)</option>
              <option value="jovem-17">🌱 Poupança Jovem (17 Anos)</option>
              <option value="habilitado">🚗 Já Habilitado</option>
            </select>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1280px]">
          {ETAPAS.map((coluna, index) => {
            const leadsInCol = filteredLeads.filter(a => getAlunoEtapa(a) === coluna.id);
            const totalColValue = leadsInCol.reduce((acc, a) => acc + (a.valorTotal || 1800), 0);

            return (
              <div 
                key={coluna.id}
                className={`flex-1 min-w-[280px] max-w-[320px] rounded-2xl border ${coluna.corBorda} ${coluna.bgCol} p-3 flex flex-col space-y-3 shadow-xs`}
              >
                {/* CABEÇALHO DA COLUNA */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{coluna.icon}</span>
                    <h3 className="font-black text-xs text-slate-900 truncate">
                      {coluna.titulo}
                    </h3>
                  </div>
                  <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-full border ${coluna.corBadge} shrink-0`}>
                    {leadsInCol.length}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
                  <span>Total estimado:</span>
                  <span className="text-slate-800 font-black font-mono">
                    {totalColValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* LISTA DE CARDS NA COLUNA */}
                <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
                  {leadsInCol.length === 0 ? (
                    <div className="bg-white/80 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 space-y-1">
                      <p className="text-xs font-semibold">Nenhum lead nesta etapa</p>
                      <p className="text-[10px]">Arraste ou avance cards para cá</p>
                    </div>
                  ) : (
                    leadsInCol.map(lead => {
                      const temp = getAlunoTemperatura(lead);
                      const is18Plus = (lead.tipoPlano || '').toLowerCase().includes('18') || !lead.tipoPlano;

                      return (
                        <div
                          key={lead.id}
                          className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-md transition-all space-y-2.5 text-left group"
                        >
                          {/* BADGES SUPERIORES: TEMPERATURA & PLANO */}
                          <div className="flex items-center justify-between gap-1.5">
                            {/* Temperatura Dropdown/Toggle */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Clique para alternar temperatura (Quente / Morno / Frio)"
                                onClick={() => {
                                  const nextTemp: TemperaturaLead = temp === 'quente' ? 'morno' : temp === 'morno' ? 'frio' : 'quente';
                                  setLeadTemperatura(lead.id, nextTemp);
                                }}
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition ${
                                  temp === 'quente'
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : temp === 'morno'
                                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                                    : 'bg-slate-100 border-slate-300 text-slate-700'
                                }`}
                              >
                                {temp === 'quente' ? '🔥 Quente' : temp === 'morno' ? '⚡ Morno' : '❄️ Frio'}
                              </button>
                            </div>

                            {/* Plano Badge */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              is18Plus 
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' 
                                : (lead.tipoPlano || '').toLowerCase().includes('jovem')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}>
                              {is18Plus ? '⭐ 18+ Anos' : (lead.tipoPlano || '').toLowerCase().includes('jovem') ? '🌱 Jovem 17' : '🚗 Habilitado'}
                            </span>
                          </div>

                          {/* NOME E TELEFONE */}
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-1">
                              {lead.nome}
                            </h4>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans mt-0.5">
                              <span className="font-mono">{lead.whatsapp}</span>
                              <span className="font-bold text-slate-700">{lead.categoria}</span>
                            </div>
                          </div>

                          {/* INFORMAÇÕES FINANCEIRAS & ORIGEM */}
                          <div className="bg-slate-50 rounded-lg p-2 text-[10.5px] text-slate-600 flex justify-between items-center font-sans border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Valor Estimado</span>
                              <strong className="text-slate-900 font-black">
                                {(lead.valorTotal || 1800).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Origem</span>
                              <span className="font-extrabold text-slate-700">{lead.origemLead || 'Direto'}</span>
                            </div>
                          </div>

                          {/* NOTAS RECENTES OU OBSERVAÇÃO */}
                          {lead.notasCrm && lead.notasCrm.length > 0 && (
                            <div className="text-[10px] bg-amber-50/60 border border-amber-200/60 text-amber-900 p-2 rounded-lg leading-tight line-clamp-2">
                              💬 <strong>Última nota:</strong> {lead.notasCrm[0].texto}
                            </div>
                          )}

                          {/* AÇÕES RÁPIDAS: WHATSAPP COM SCRIPTS & NOTAS */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                            {/* Botão de Scripts WhatsApp */}
                            <button
                              type="button"
                              onClick={() => setActiveWhatsappScriptLead(lead)}
                              className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[10.5px] font-black py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                              title="Abrir scripts de vendas no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Botão de Anotar */}
                            <button
                              type="button"
                              onClick={() => setActiveNoteModalLead(lead)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                              title="Adicionar anotação de histórico"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Dossiê */}
                            {onOpenCandidateDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenCandidateDetail(lead)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                                title="Ver ficha completa do candidato"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* BARRA DE AVANÇO DE ETAPA */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {/* Voltar Etapa */}
                            {index > 0 ? (
                              <button
                                type="button"
                                onClick={() => moveAlunoStage(lead.id, ETAPAS[index - 1].id)}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md flex items-center gap-0.5 transition cursor-pointer"
                                title={`Mover para ${ETAPAS[index - 1].titulo}`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                                <span>Voltar</span>
                              </button>
                            ) : <div />}

                            {/* Avançar Etapa */}
                            {index < ETAPAS.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveAlunoStage(lead.id, ETAPAS[index + 1].id)}
                                className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
                                title={`Avançar para ${ETAPAS[index + 1].titulo}`}
                              >
                                <span>{ETAPAS[index + 1].titulo.split('/')[0].trim()}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL 1: SCRIPTS DE VENDAS NO WHATSAPP --- */}
      {activeWhatsappScriptLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden text-left animate-in zoom-in-95">
            <div className="bg-[#0c2340] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">Central de Abordagem WhatsApp</span>
                <h3 className="text-base font-black flex items-center gap-1.5 mt-0.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" /> Atendimento: {activeWhatsappScriptLead.nome}
                </h3>
              </div>
              <button 
                onClick={() => setActiveWhatsappScriptLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Selecione um dos scripts estratégicos abaixo para iniciar ou continuar a negociação com <strong>{activeWhatsappScriptLead.nome}</strong> no WhatsApp:
              </p>

              {/* SCRIPT 1: Primeiro Contato (18+ Anos em Destaque) */}
              <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-3.5 space-y-2 hover:border-indigo-400 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
                    ⭐ 1. Apresentação do Plano 18+ Anos (Início Imediato)
                  </span>
                  <span className="text-[9px] bg-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Mais Eficaz
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                  "Olá {activeWhatsappScriptLead.nome}! Tudo bem? Aqui é da equipe da Nova CNH Brasil. Vi que você tem interesse na sua habilitação ({activeWhatsappScriptLead.categoria}). O nosso **Plano 18+ Anos** está com início imediato e condições facilitadas em até 12x s/ juros. Gostaria de ver uma simulação rápida sem compromisso?"
                </p>
                <a
                  href={`https://wa.me/55${activeWhatsappScriptLead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${activeWhatsappScriptLead.nome}! Tudo bem? Aqui é da equipe da Nova CNH Brasil.\n\nVi que você tem interesse na sua primeira habilitação (${activeWhatsappScriptLead.categoria}). O nosso *Plano 18+ Anos* está com início imediato e parcelamento facilitado em até 12x sem juros!\n\nGostaria que eu te enviasse uma simulação rápida dos valores e instrutores disponíveis na sua região?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    moveAlunoStage(activeWhatsappScriptLead.id, 'em_atendimento');
                    setActiveWhatsappScriptLead(null);
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar este Script no WhatsApp
                </a>
              </div>

              {/* SCRIPT 2: Lembrete / Follow-up */}
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                  🔔 2. Lembrete & Follow-up de Decisão
                </span>
                <p className="text-[11px] text-slate-600 font-sans leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                  "Olá {activeWhatsappScriptLead.nome}! Tudo bem? Passando para saber como está o seu processo na Nova CNH Brasil. Você já escolheu seu instrutor ou ainda tem interesse em realizar o processo conosco?"
                </p>
                <a
                  href={`https://wa.me/55${activeWhatsappScriptLead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${activeWhatsappScriptLead.nome}! Tudo bem? Passando para saber como está o seu processo na Nova CNH Brasil. Você já encontrou um instrutor ou ainda tem interesse em realizar o processo conosco?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    moveAlunoStage(activeWhatsappScriptLead.id, 'negociacao');
                    setActiveWhatsappScriptLead(null);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Lembrete no WhatsApp
                </a>
              </div>

              {/* SCRIPT 3: Fechamento de Matrícula */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 space-y-2 hover:border-emerald-400 transition">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                  🏆 3. Link Direto para Fechamento de Matrícula
                </span>
                <p className="text-[11px] text-slate-600 font-sans leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                  "Perfeito {activeWhatsappScriptLead.nome}! Já deixei sua vaga pré-reservada. Segue o link oficial para você confirmar seus dados e garantir sua matrícula:"
                </p>
                <a
                  href={`https://wa.me/55${activeWhatsappScriptLead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Perfeito ${activeWhatsappScriptLead.nome}! Já deixei sua vaga pré-reservada no sistema da Nova CNH Brasil.\n\nVocê pode confirmar sua adesão diretamente por este link seguro:\n${window.location.origin}${window.location.pathname}?matricula=true\n\nQualquer dúvida estou à disposição para te auxiliar!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    moveAlunoStage(activeWhatsappScriptLead.id, 'proposta_enviada');
                    setActiveWhatsappScriptLead(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Link de Matrícula
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADICIONAR NOTA / HISTÓRICO DE NEGOCIAÇÃO --- */}
      {activeNoteModalLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden text-left animate-in zoom-in-95">
            <div className="bg-[#0c2340] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black">Histórico de Atendimento</span>
                <h3 className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                  📝 Anotações: {activeNoteModalLead.nome}
                </h3>
              </div>
              <button 
                onClick={() => setActiveNoteModalLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Nova Nota / Registro de Contato:</label>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Ex: Candidato pediu para ligar amanhã às 14h; prefere aulas aos sábados..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340] font-sans text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveNoteModalLead(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNote(activeNoteModalLead.id)}
                  disabled={!newNoteText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold py-2 px-4 rounded-xl transition shadow-xs"
                >
                  Salvar Anotação
                </button>
              </div>

              {/* Histórico Anterior */}
              {activeNoteModalLead.notasCrm && activeNoteModalLead.notasCrm.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 max-h-48 overflow-y-auto">
                  <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Histórico Anterior:</h5>
                  {activeNoteModalLead.notasCrm.map(n => (
                    <div key={n.id} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                        <span>{n.autor || 'Atendente'}</span>
                        <span>{new Date(n.data).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="font-sans leading-relaxed">{n.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: NOVO LEAD MANUAL --- */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden text-left animate-in zoom-in-95">
            <div className="bg-[#0c2340] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">Cadastro Comercial</span>
                <h3 className="text-base font-black flex items-center gap-1.5 mt-0.5">
                  <Plus className="w-4 h-4 text-emerald-400" /> Cadastrar Novo Lead no Funil
                </h3>
              </div>
              <button 
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nome do Interessado *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo ou de contato"
                  value={newLeadNome}
                  onChange={e => setNewLeadNome(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={newLeadWhatsapp}
                    onChange={e => setNewLeadWhatsapp(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Categoria Pretendida</label>
                  <select
                    value={newLeadCategoria}
                    onChange={e => setNewLeadCategoria(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340] font-semibold text-slate-800"
                  >
                    <option value="Carro (B)">🚗 Carro (B)</option>
                    <option value="Moto (A)">🏍️ Moto (A)</option>
                    <option value="Carro e Moto (A+B)">🚗+🏍️ Carro & Moto (A+B)</option>
                  </select>
                </div>
              </div>

              {/* SELEÇÃO DO PLANO */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Plano de Interesse:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLeadPlano('adulto-18')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newLeadPlano === 'adulto-18'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-[9px] font-black text-indigo-700 block uppercase">⭐ Recomendado</span>
                    <strong className="text-xs font-bold block">18+ Anos</strong>
                    <span className="text-[9px] text-slate-500">Início Imediato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewLeadPlano('jovem-17')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newLeadPlano === 'jovem-17'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-[9px] font-black text-emerald-700 block uppercase">🌱 Poupança</span>
                    <strong className="text-xs font-bold block">17 Anos</strong>
                    <span className="text-[9px] text-slate-500">Menores de 18</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewLeadPlano('habilitado')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newLeadPlano === 'habilitado'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-[9px] font-black text-purple-700 block uppercase">🚗 Prática</span>
                    <strong className="text-xs font-bold block">Habilitados</strong>
                    <span className="text-[9px] text-slate-500">Perder o Medo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Temperatura</label>
                  <select
                    value={newLeadTemperatura}
                    onChange={e => setNewLeadTemperatura(e.target.value as TemperaturaLead)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340] font-bold"
                  >
                    <option value="quente">🔥 Quente (Alto Interesse)</option>
                    <option value="morno">⚡ Morno (Em Avaliação)</option>
                    <option value="frio">❄️ Frio (Apenas Pesquisando)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Origem do Contato</label>
                  <select
                    value={newLeadOrigem}
                    onChange={e => setNewLeadOrigem(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340]"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Site / Simulador">Site / Simulador</option>
                    <option value="Instagram / Redes">Instagram / Redes</option>
                    <option value="Indicação">Indicação de Aluno</option>
                    <option value="Instrutor">Indicação de Instrutor</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={newLeadValor}
                    onChange={e => setNewLeadValor(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340] font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Observações Iniciais</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do cliente..."
                  value={newLeadObs}
                  onChange={e => setNewLeadObs(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0c2340]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0c2340] hover:bg-slate-900 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl transition shadow-md"
                >
                  Adicionar ao Funil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

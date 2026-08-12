import React, { useState, useRef, useEffect } from 'react';
import { 
  Star, 
  Quote, 
  MessageSquarePlus, 
  ThumbsUp, 
  CheckCircle2, 
  User, 
  Filter, 
  Send, 
  Car, 
  Bike, 
  Sparkles, 
  Award, 
  Search, 
  X,
  Calendar,
  Mic,
  MicOff,
  Wand2,
  Loader2,
  PlusCircle,
  Lock,
  Key,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Depoimento, Aluno } from '../types';

interface StudentTestimonialsProps {
  depoimentos: Depoimento[];
  alunos?: Aluno[];
  activeStudentId?: string;
  isAuthenticated?: boolean;
  isAdminAuthenticated?: boolean;
  onLoginStudent?: (id: string) => void;
  onAddDepoimento: (novo: Depoimento) => void;
  onDeleteDepoimento?: (id: string) => void;
  onToast: (message: string) => void;
}

export const StudentTestimonials: React.FC<StudentTestimonialsProps> = ({
  depoimentos,
  alunos = [],
  activeStudentId,
  isAuthenticated,
  isAdminAuthenticated,
  onLoginStudent,
  onAddDepoimento,
  onDeleteDepoimento,
  onToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Depoimento | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});

  // Student Authentication / Verification state
  const [loginMatricula, setLoginMatricula] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginError, setLoginError] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<Aluno | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formCategoria, setFormCategoria] = useState('Carro (B)');
  const [formOrigem, setFormOrigem] = useState('Aluno Habilitado');
  const [formAvaliacao, setFormAvaliacao] = useState(5);
  const [formComentario, setFormComentario] = useState('');
  const [formFoto, setFormFoto] = useState('');

  // Handle Photo Upload from Student device
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Por favor, selecione uma imagem de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormFoto(reader.result);
        onToast("📷 Sua foto de perfil foi anexada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Microphone Speech Recognition & AI Refine States
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Detect currently active/logged-in student
  useEffect(() => {
    if (activeStudentId && isAuthenticated && alunos && alunos.length > 0) {
      const current = alunos.find(a => a.id === activeStudentId);
      if (current) {
        setVerifiedStudent(current);
        setFormNome(current.nome);
        setFormCidade(current.endereco || 'Ipojuca / PE');
        setFormCategoria(current.categoria || 'Carro (B)');
        setFormOrigem(`Aluno Matriculado (${current.id})`);
      }
    }
  }, [activeStudentId, isAuthenticated, alunos, isModalOpen]);

  // Handle student login verification inside testimonial modal
  const handleStudentAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!alunos || alunos.length === 0) {
      setLoginError('Nenhum aluno cadastrado no sistema. Entre em contato com a Autoescola para realizar sua inscrição.');
      return;
    }

    const cleanInput = loginMatricula.trim().toUpperCase();
    const cleanSenha = loginSenha.trim();

    if (!cleanInput) {
      setLoginError('Por favor, informe seu ID de Matrícula (ex: CNH-002) ou CPF.');
      return;
    }

    const matched = alunos.find(a => {
      const cleanId = (a.id || '').trim().toUpperCase();
      if (cleanId === cleanInput) return true;
      if (!cleanInput.startsWith('CNH-') && cleanId === `CNH-${cleanInput.padStart(3, '0')}`) return true;
      if (cleanInput.startsWith('CNH-')) {
        const numPart = cleanInput.replace('CNH-', '');
        if (cleanId === `CNH-${numPart.padStart(3, '0')}`) return true;
      }
      const cleanCpf = (a.cpf || '').replace(/\D/g, '');
      const inputCpf = cleanInput.replace(/\D/g, '');
      if (cleanCpf && inputCpf && cleanCpf === inputCpf) return true;

      return false;
    });

    if (!matched) {
      setLoginError('❌ ID de Matrícula ou CPF não localizado. Apenas alunos matriculados podem postar relatos.');
      return;
    }

    const actualSenha = matched.senha || '123';
    if (cleanSenha !== actualSenha) {
      setLoginError('❌ Senha de acesso incorreta! Digite a senha cadastrada na sua matrícula.');
      return;
    }

    // Success Authentication
    setVerifiedStudent(matched);
    setFormNome(matched.nome);
    setFormCidade(matched.endereco || 'Ipojuca / PE');
    setFormCategoria(matched.categoria || 'Carro (B)');
    setFormOrigem(`Aluno Matriculado (${matched.id})`);

    if (onLoginStudent) {
      onLoginStudent(matched.id);
    }

    onToast(`✅ Aluno(a) ${matched.nome} autenticado(a) com sucesso!`);
  };

  const toggleVoiceRecording = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      onToast("🎤 Gravação por voz encerrada.");
      return;
    }

    // Check microphone availability & permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (micError: any) {
        console.warn("Acesso ao microfone indisponível ou negado:", micError);
        onToast("🔒 Permissão de microfone negada ou bloqueada no navegador. Você também pode digitar seu relato no campo de texto.");
        return;
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("O seu navegador não suporta a API de gravação por voz. Você pode digitar diretamente no campo abaixo.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      let baseText = formComentario.trim();

      recognition.onstart = () => {
        setIsListening(true);
        onToast("🎙️ Microfone ativado! Fale agora seu relato...");
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const updated = baseText ? `${baseText} ${transcript}` : transcript;
        setFormComentario(updated);
      };

      recognition.onerror = (event: any) => {
        console.warn("Aviso no reconhecimento de voz:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("🔒 Permissão de microfone negada. Verifique as permissões de mídia do seu navegador.");
        } else if (event.error === 'no-speech') {
          onToast("⚠️ Nenhum som detectado. Fale mais próximo ao microfone.");
        } else {
          onToast("⚠️ Falha temporária no microfone. Tente falar novamente.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Falha ao iniciar microfone:", err);
      setIsListening(false);
      alert("Não foi possível conectar com o microfone do seu aparelho.");
    }
  };

  const handleRefineWithAI = async () => {
    if (!formComentario || !formComentario.trim()) {
      alert("Por favor, digite ou fale um depoimento primeiro antes de solicitar o refinamento da IA!");
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch("/api/refine-testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: formComentario,
          nome: formNome,
          categoria: formCategoria,
          fase: formOrigem
        })
      });
      const data = await res.json();
      if (data.refinedText) {
        setFormComentario(data.refinedText);
        onToast("✨ Depoimento aprimorado e corrigido pela Inteligência Artificial!");
      } else {
        onToast("⚠️ Não foi possível refinar o texto no momento.");
      }
    } catch (err) {
      console.error("Erro ao refinar com IA:", err);
      onToast("⚠️ Erro de conexão ao tentar refinar com a IA.");
    } finally {
      setIsRefining(false);
    }
  };

  // Handle Like Toggle
  const handleLike = (id: string) => {
    setLikesMap(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: current + 1 };
    });
    onToast("👍 Obrigado por curtir a experiência deste aluno!");
  };

  // Submit new Testimonial
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNome.trim()) {
      alert("Por favor, preencha seu nome.");
      return;
    }
    if (!formComentario.trim() || formComentario.trim().length < 10) {
      alert("Por favor, escreva um depoimento com pelo menos 10 caracteres detalhando sua experiência.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newId = `DEP-${String(Date.now()).slice(-5)}`;

    const newDepoimento: Depoimento = {
      id: newId,
      nome: formNome.trim(),
      cidade: formCidade.trim() || 'Pernambuco',
      categoria: formCategoria,
      avaliacao: formAvaliacao,
      comentario: formComentario.trim(),
      data: todayStr,
      foto: formFoto,
      aprovado: true,
      origem: formOrigem
    };

    onAddDepoimento(newDepoimento);
    setIsModalOpen(false);

    // Reset Form
    setFormNome('');
    setFormCidade('');
    setFormComentario('');
    setFormFoto('');
    setFormAvaliacao(5);
    onToast(`🎉 Depoimento de "${newDepoimento.nome}" publicado com sucesso!`);
  };

  // Check if current user has permission to delete a specific testimonial
  const canDeleteDepoimento = (dep: Depoimento): boolean => {
    // 1. Administrator can delete any testimonial
    if (isAdminAuthenticated) return true;

    // 2. Active/Verified student can delete their own testimonials
    const currentStudent = verifiedStudent || (activeStudentId ? alunos.find(a => a.id === activeStudentId) : null);

    if (currentStudent) {
      const studentNameClean = currentStudent.nome.trim().toLowerCase();
      const studentIdClean = currentStudent.id.trim().toUpperCase();

      const depNameClean = (dep.nome || '').trim().toLowerCase();
      const depOrigemClean = (dep.origem || '').trim().toUpperCase();

      if (depNameClean === studentNameClean) return true;
      if (studentIdClean && depOrigemClean.includes(studentIdClean)) return true;
    }

    return false;
  };

  // Filtered List
  const filteredList = depoimentos.filter(dep => {
    const matchCategory = filterCategory === 'todos' || 
      (dep.categoria && dep.categoria.toLowerCase().includes(filterCategory.toLowerCase())) ||
      (filterCategory === 'jovem' && dep.origem?.toLowerCase().includes('jovem'));

    const searchLower = searchTerm.toLowerCase();
    const matchSearch = !searchTerm.trim() ||
      dep.nome.toLowerCase().includes(searchLower) ||
      dep.comentario.toLowerCase().includes(searchLower) ||
      (dep.cidade && dep.cidade.toLowerCase().includes(searchLower));

    return matchCategory && matchSearch;
  });

  return (
    <section id="secao-depoimentos-alunos" className="bg-slate-900 text-white rounded-3xl border border-indigo-950 p-6 md:p-10 shadow-2xl relative overflow-hidden space-y-8">
      {/* Background Subtle Blurs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      {/* Header Container */}
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-indigo-900/60 pb-8">
        <div className="space-y-3 max-w-3xl text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider font-mono uppercase">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Depoimentos & Experiências Reais
          </div>

          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Relatos dos Alunos Habilitados
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-200 text-xl md:text-3xl mt-1">
              Como foi conquistar a CNH com nosso acompanhamento
            </span>
          </h2>

          <p className="text-slate-350 text-xs md:text-sm leading-relaxed">
            Confira as experiências de quem planejou as parcelas, praticou no simulador de questões e realizou o treinamento prático de direção com aprovação garantida no DETRAN!
          </p>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-950/60 border border-indigo-900/80 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg font-black shrink-0">
            ★
          </div>
          <div>
            <div className="text-lg md:text-2xl font-black text-amber-400 font-mono">4.9 / 5.0</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Satisfação Geral</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-indigo-900/80 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg md:text-2xl font-black text-emerald-400 font-mono">100%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Depoimentos Verificados</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-indigo-900/80 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg md:text-2xl font-black text-cyan-400 font-mono">Carro & Moto</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Categorias A e B</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-indigo-900/80 rounded-2xl p-4 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg md:text-2xl font-black text-indigo-300 font-mono">Aprovação</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Foco na 1ª Tentativa</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-indigo-900/60">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'todos', label: 'Todos os Relatos', icon: Filter },
            { id: 'Carro', label: 'Carro (B)', icon: Car },
            { id: 'Moto', label: 'Moto (A)', icon: Bike },
            { id: 'jovem', label: 'Jovem 17 Poupança', icon: Sparkles }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = filterCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-500 text-slate-950 shadow-md' 
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <IconComp className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input and CTA */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou palavra..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {depoimentos.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Novo Relato</span>
            </button>
          )}
        </div>
      </div>

      {/* Testimonials Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <Quote className="h-10 w-10 text-emerald-500/60 mx-auto" />
          {depoimentos.length === 0 ? (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-slate-200">Ainda não há depoimentos cadastrados.</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Seja o primeiro aluno a compartilhar sua história e conquista da CNH com a Autoescola Nova CNH Brasil!
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                Publicar Meu Depoimento Espontâneo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-300">Nenhum depoimento encontrado para este filtro.</h4>
              <p className="text-xs text-slate-500">Tente ajustar a busca ou limpar os filtros selecionados.</p>
              <button
                onClick={() => { setFilterCategory('todos'); setSearchTerm(''); }}
                className="text-xs text-emerald-400 underline font-bold cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {filteredList.map((dep) => {
            const extraLikes = likesMap[dep.id] || 0;
            return (
              <div 
                key={dep.id} 
                className="bg-slate-950/70 border border-indigo-900/80 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Card Header with Avatar and Student Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-extrabold text-white text-sm md:text-base leading-tight group-hover:text-emerald-300 transition-colors">
                          {dep.nome}
                        </h4>
                        {dep.categoria && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-sans">
                            <span className="bg-emerald-950/80 text-emerald-300 text-[9.5px] font-mono px-2 py-0.5 rounded-md border border-emerald-800/60 font-bold">
                              {dep.categoria}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Star Rating and Delete Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3.5 w-3.5 ${i < dep.avaliacao ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} 
                          />
                        ))}
                      </div>

                      {canDeleteDepoimento(dep) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(dep)}
                          className="p-1.5 bg-slate-900/90 hover:bg-rose-500/20 text-rose-400/80 hover:text-rose-400 rounded-lg border border-rose-900/40 hover:border-rose-500/60 transition-all cursor-pointer shadow-sm"
                          title={isAdminAuthenticated ? "Excluir depoimento (Administrador)" : "Excluir meu depoimento"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Box */}
                  <div className="relative bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
                    <Quote className="h-4 w-4 text-emerald-500/30 absolute -top-2 -left-1 pointer-events-none" />
                    <p className="italic relative z-10 pl-1">"{dep.comentario}"</p>
                  </div>
                </div>

                {/* Footer with date, origin tag and reaction */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10.5px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      {dep.data}
                    </span>
                    {dep.origem && (
                      <span className="text-[9.5px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded-md font-extrabold border border-indigo-800/50">
                        {dep.origem}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleLike(dep.id)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold border border-slate-800"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Útil</span>
                    {extraLikes > 0 && <span className="text-emerald-400 font-mono">({extraLikes})</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL: CONFIRMAR EXCLUSÃO ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-rose-500/20 text-rose-400 p-2.5 rounded-2xl border border-rose-500/30 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Excluir Depoimento</h3>
                <p className="text-xs text-slate-400 font-sans">Tem certeza que deseja remover este relato?</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs font-extrabold text-emerald-400">{deleteTarget.nome}</span>
              <p className="text-xs text-slate-300 italic leading-relaxed">"{deleteTarget.comentario}"</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteDepoimento) {
                    onDeleteDepoimento(deleteTarget.id);
                  }
                  onToast(`🗑️ Depoimento de "${deleteTarget.nome}" removido!`);
                  setDeleteTarget(null);
                }}
                className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DEIXAR DEPOIMENTO ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col p-6 space-y-5 text-left max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl border border-emerald-500/30">
                  <MessageSquarePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Relatar Minha Experiência</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Apenas alunos autenticados podem registrar depoimentos oficiais</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* IF NOT AUTHENTICATED AS A STUDENT -> SHOW AUTHENTICATION STEP */}
            {!verifiedStudent ? (
              <div className="space-y-4 text-xs py-2">
                <div className="bg-gradient-to-br from-indigo-950/80 to-slate-950 p-4 rounded-2xl border border-indigo-500/30 text-center space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">Acesso do Aluno Requerido</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed max-w-sm mx-auto">
                    Para garantir que todos os relatos sejam autênticos e reais, informe seus dados de matrícula antes de postar seu depoimento.
                  </p>
                </div>

                <form onSubmit={handleStudentAuth} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Matrícula do Aluno ou CPF *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">ID</span>
                      <input
                        type="text"
                        required
                        placeholder="Ex: CNH-002 ou 123.456.789-00"
                        value={loginMatricula}
                        onChange={(e) => {
                          setLoginMatricula(e.target.value);
                          setLoginError('');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Senha de Acesso *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔒</span>
                      <input
                        type="password"
                        required
                        placeholder="Digite sua senha cadastrada"
                        value={loginSenha}
                        onChange={(e) => {
                          setLoginSenha(e.target.value);
                          setLoginError('');
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2.5 rounded-xl text-[11px] font-semibold flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4" />
                      Autenticar Aluno
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* WHEN AUTHENTICATED -> SHOW TESTIMONIAL FORM WITH LOCKED ALUNO INFO */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Verified Banner */}
                <div className="bg-emerald-950/70 border border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-xl border border-emerald-500/30">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-xs">{verifiedStudent.nome}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                          ✓ Verificado
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Matrícula: {verifiedStudent.id} • {verifiedStudent.categoria || 'Carro (B)'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifiedStudent(null);
                      setFormNome('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline font-semibold cursor-pointer shrink-0"
                  >
                    Trocar Conta
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">
                    Nome do Aluno (Autenticado)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formNome}
                    className="w-full bg-slate-950/50 border border-slate-800 text-emerald-300 rounded-xl px-3 py-2 font-bold cursor-not-allowed opacity-90"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">
                      Categoria da CNH
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="Carro (B)">Carro (Categoria B)</option>
                      <option value="Moto (A)">Moto (Categoria A)</option>
                      <option value="Carro e Moto (AB)">Carro e Moto (Categoria AB)</option>
                      <option value="Inclusão / Reciclagem">Inclusão / Reciclagem</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">
                      Sua Fase no Programa
                    </label>
                    <select
                      value={formOrigem}
                      onChange={(e) => setFormOrigem(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="Aluno Habilitado">Recém Habilitado pelo Detran</option>
                      <option value="Aluno em Aulas Práticas">Em Aulas Práticas de Direção</option>
                      <option value="Jovem 17 Poupança">Jovem de 17 Anos (Poupança Baú)</option>
                      <option value="Aluno do Simulador">Aluno do Simulador Teórico</option>
                    </select>
                  </div>
                </div>

                {/* Star Rating Selector */}
                <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider block">
                    Qual sua nota de avaliação? (1 a 5 estrelas)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormAvaliacao(star)}
                          className="p-1 hover:scale-110 transition cursor-pointer"
                        >
                          <Star 
                            className={`h-6 w-6 ${star <= formAvaliacao ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-400 font-mono ml-2">
                      {formAvaliacao === 5 ? '★ 5.0 (Excelente / Perfeito)' : `★ ${formAvaliacao}.0`}
                    </span>
                  </div>
                </div>

                {/* Testimonial Textarea */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">
                      Seu Depoimento / Relato Detalhado *
                    </label>
                    
                    <div className="flex items-center gap-2">
                      {/* Microfone para Falar */}
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isListening 
                            ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-400' 
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                        title="Gravar depoimento por voz usando o microfone do dispositivo"
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-3.5 w-3.5 text-white" />
                            <span>Parar Gravação</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5 text-red-400" />
                            <span>Falar no Mic</span>
                          </>
                        )}
                      </button>

                      {/* Botão Refinar com IA */}
                      <button
                        type="button"
                        onClick={handleRefineWithAI}
                        disabled={isRefining || !formComentario.trim()}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
                        title="Utiliza Inteligência Artificial para corrigir ortografia e aprimorar a escrita mantendo o tom original"
                      >
                        {isRefining ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
                            <span>Refinando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-slate-950 fill-slate-950" />
                            <span>Refinar com IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={formComentario}
                    onChange={(e) => setFormComentario(e.target.value)}
                    placeholder="Digite ou clique no microfone ao lado para falar seu relato espontâneo..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder-slate-500"
                  />

                  {isListening && (
                    <p className="text-[11px] text-red-400 font-semibold animate-pulse flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5 shrink-0" />
                      Microfone ativo! Fale diretamente no seu aparelho, o texto está sendo transcrito...
                    </p>
                  )}
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition"
                  >
                    <Send className="h-4 w-4" />
                    Publicar Depoimento Oficial
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </section>
  );
};

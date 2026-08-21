import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Aluno, Instrutor } from '../types';
import { parseCandidateLink, safeAtob } from './LinkEnrollmentModal';
import { saveAlunoToFirestore } from '../lib/firestoreService';

interface CandidateEnrollmentFormProps {
  alunos: Aluno[];
  setAlunos: React.Dispatch<React.SetStateAction<Aluno[]>>;
  instrutores?: Instrutor[];
  preSelectedPlano?: 'jovem-17' | 'adulto-18' | 'habilitado';
  preSelectedCategoria?: string;
  preSelectedDob?: string;
  preSelectedAulas?: number;
  preSelectedAulasCarro?: number;
  preSelectedAulasMoto?: number;
  preSelectedTipo?: 'carro' | 'moto' | 'ambos';
  preSelectedNome?: string;
  preSelectedCpf?: string;
  preSelectedRg?: string;
  preSelectedWhatsapp?: string;
  preSelectedEndereco?: string;
  preSelectedInstrutor?: string;
  preSelectedNacionalidade?: string;
  preSelectedEstadoCivil?: string;
  setToastMessage: (msg: string | null) => void;
  setActiveStudentId: (id: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setCurrentTab: (tab: any) => void;
  onAulasChange?: (v: number) => void;
  onAulasCarroChange?: (v: number) => void;
  onAulasMotoChange?: (v: number) => void;
  onCategoriaChange?: (v: string) => void;
  onPlanoChange?: (v: 'jovem-17' | 'adulto-18' | 'habilitado') => void;
  onDobChange?: (v: string) => void;
  preSelectedParcelas?: number;
  preSelectedFormaPagamento?: 'poupanca' | 'cartao' | 'vista' | 'hibrido';
  onFormaPagamentoChange?: (v: 'poupanca' | 'cartao' | 'vista' | 'hibrido') => void;
  setLoginIdAttempt?: (id: string) => void;
  setLoginSenhaAttempt?: (senha: string) => void;
}

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const calculateMonthsTo18 = (dobStr: string, today = new Date()): number => {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return 0;
  
  let months = (dob.getFullYear() + 18 - today.getFullYear()) * 12 + (dob.getMonth() - today.getMonth());
  if (dob.getDate() > today.getDate()) {
    months--;
  }
  return Math.max(0, months);
};

const getCreditCardInterestMultiplier = (installments: number): number => {
  const rates: Record<number, number> = {
    1: 4.859,
    2: 10.859,
    3: 12.243,
    4: 13.59,
    5: 14.92,
    6: 16.227,
    7: 17.499,
    8: 18.778,
    9: 19.994,
    10: 21.185,
    11: 21.427,
    12: 21.71
  };
  const currentRatePercent = rates[installments] || 0;
  const rateDecimal = currentRatePercent / 100;
  if (rateDecimal >= 1 || rateDecimal < 0) return 1.0;
  return parseFloat((1 / (1 - rateDecimal)).toFixed(4));
};

const safeScrollTo = (top: number) => {
  try {
    window.scrollTo({ top, behavior: 'smooth' });
  } catch (e) {
    try {
      window.scrollTo(0, top);
    } catch (err) {
      console.warn('Scroll failed', err);
    }
  }
};

export function CandidateEnrollmentForm({
  alunos,
  setAlunos,
  instrutores = [],
  preSelectedPlano = 'jovem-17',
  preSelectedCategoria = 'Carro (B)',
  preSelectedDob = '2008-08-14',
  preSelectedAulas = 10,
  preSelectedAulasCarro = 20,
  preSelectedAulasMoto = 5,
  preSelectedTipo = 'ambos',
  preSelectedNome = '',
  preSelectedCpf = '',
  preSelectedRg = '',
  preSelectedWhatsapp = '',
  preSelectedEndereco = '',
  preSelectedInstrutor = '',
  preSelectedNacionalidade = 'Brasileira',
  preSelectedEstadoCivil = 'Solteiro(a)',
  setToastMessage,
  setActiveStudentId,
  setIsAuthenticated,
  setCurrentTab,
  onAulasChange,
  onAulasCarroChange,
  onAulasMotoChange,
  onCategoriaChange,
  onPlanoChange,
  onDobChange,
  preSelectedParcelas = 12,
  preSelectedFormaPagamento = 'poupanca',
  onFormaPagamentoChange,
  setLoginIdAttempt,
  setLoginSenhaAttempt
}: CandidateEnrollmentFormProps) {
  
  // Local states
  const [enrollPlano, setEnrollPlano] = useState<'jovem-17' | 'adulto-18' | 'habilitado'>(preSelectedPlano);
  const [enrollAulas, setEnrollAulas] = useState<number>(preSelectedAulas);
  const [enrollFormaPagamento, setEnrollFormaPagamento] = useState<'poupanca' | 'cartao' | 'vista' | 'hibrido'>(preSelectedFormaPagamento);
  const [enrollParcelas, setEnrollParcelas] = useState<number>(preSelectedParcelas);
  const [enrollAulasCarro, setEnrollAulasCarro] = useState<number>(preSelectedAulasCarro);
  const [enrollAulasMoto, setEnrollAulasMoto] = useState<number>(preSelectedAulasMoto);
  const [enrollCategoria, setEnrollCategoria] = useState<string>(preSelectedCategoria);
  const [enrollDob, setEnrollDob] = useState<string>(preSelectedDob);
  const [enrollNome, setEnrollNome] = useState<string>(preSelectedNome);
  const [enrollWhatsapp, setEnrollWhatsapp] = useState<string>(preSelectedWhatsapp);
  const [enrollWhatsappResponsavel, setEnrollWhatsappResponsavel] = useState<string>('');
  const [enrollCep, setEnrollCep] = useState<string>('');
  const [enrollEndereco, setEnrollEndereco] = useState<string>(preSelectedEndereco);
  const [enrollInstrutor, setEnrollInstrutor] = useState<string>(() => {
    if (preSelectedInstrutor && preSelectedInstrutor !== 'Sem Instrutor') return preSelectedInstrutor;
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const refInst = urlParams.get('instrutor') || urlParams.get('ref') || urlParams.get('instructor');
        if (refInst) return decodeURIComponent(refInst).trim();
        const stored = sessionStorage.getItem('autodrive_pending_candidate');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.instrutor) return parsed.instrutor.trim();
        }
      }
    } catch (e) {}
    return '';
  });
  
  // Custom contract fields requested by the user
  const [enrollCpf, setEnrollCpf] = useState<string>(preSelectedCpf);
  const [enrollRg, setEnrollRg] = useState<string>(preSelectedRg);
  const [enrollNacionalidade, setEnrollNacionalidade] = useState<string>(preSelectedNacionalidade || 'Brasileira');
  const [enrollEstadoCivil, setEnrollEstadoCivil] = useState<string>(preSelectedEstadoCivil || 'Solteiro(a)');
  
  // Guardian details if minor (< 18)
  const [enrollNomeResponsavel, setEnrollNomeResponsavel] = useState<string>('');
  const [enrollCpfResponsavel, setEnrollCpfResponsavel] = useState<string>('');
  const [enrollRgResponsavel, setEnrollRgResponsavel] = useState<string>('');

  // Sign State
  const [isContractSigned, setIsContractSigned] = useState<boolean>(false);
  const [signatureDate, setSignatureDate] = useState<string>('');
  const [signatureHash, setSignatureHash] = useState<string>('');
  const [signatureIp, setSignatureIp] = useState<string>('');
  
  const [isCepLoading, setIsCepLoading] = useState<boolean>(false);
  const [cepError, setCepError] = useState<string | null>(null);
  
  const [enrollCreatedCard, setEnrollCreatedCard] = useState<any | null>(null);
  const [copiedEnrollCred, setCopiedEnrollCred] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);

  const handleCloseAndRedirectWithSafeScroll = () => {
    try {
      const studentId = enrollCreatedCard?.id;
      const studentSenha = enrollCreatedCard?.senha;
      
      if (studentId && setLoginIdAttempt) {
        setLoginIdAttempt(studentId);
      }
      if (studentSenha && setLoginSenhaAttempt) {
        setLoginSenhaAttempt(studentSenha);
      }

      // Auto-authenticate student for supreme UX and no-friction experience
      if (studentId && setActiveStudentId) {
        setActiveStudentId(studentId);
      }
      if (setIsAuthenticated) {
        setIsAuthenticated(true);
      }
      
      setShowCredentialsModal(false);
      setEnrollCreatedCard(null);
      setIsContractSigned(false);
      setCurrentTab('app-jovem');
      setToastMessage("📱 Sucesso! Você foi autenticado(a) de forma automática e direcionado(a) ao Smartphone Digital!");
      
      setTimeout(() => {
        safeScrollTo(0);
      }, 200);
    } catch (e) {
      console.error("Error redirecting to smartphone portal:", e);
      // Fallback rescue
      setShowCredentialsModal(false);
      setEnrollCreatedCard(null);
      setCurrentTab('app-jovem');
    }
  };

  // Sync state if parent pre-selections change (e.g. from the planner calculator tool)
  useEffect(() => {
    if (preSelectedPlano && preSelectedPlano !== enrollPlano) {
      setEnrollPlano(preSelectedPlano);
    }
  }, [preSelectedPlano, enrollPlano]);

  useEffect(() => {
    if (preSelectedCategoria && preSelectedCategoria !== enrollCategoria) {
      setEnrollCategoria(preSelectedCategoria);
    }
  }, [preSelectedCategoria, enrollCategoria]);

  useEffect(() => {
    if (preSelectedDob && preSelectedDob !== enrollDob) {
      setEnrollDob(preSelectedDob);
    }
  }, [preSelectedDob, enrollDob]);

  useEffect(() => {
    if (preSelectedAulas && preSelectedAulas !== enrollAulas) {
      setEnrollAulas(preSelectedAulas);
    }
  }, [preSelectedAulas, enrollAulas]);

  useEffect(() => {
    if (preSelectedAulasCarro && preSelectedAulasCarro !== enrollAulasCarro) {
      setEnrollAulasCarro(preSelectedAulasCarro);
    }
  }, [preSelectedAulasCarro, enrollAulasCarro]);

  useEffect(() => {
    if (preSelectedAulasMoto && preSelectedAulasMoto !== enrollAulasMoto) {
      setEnrollAulasMoto(preSelectedAulasMoto);
    }
  }, [preSelectedAulasMoto, enrollAulasMoto]);

  useEffect(() => {
    if (preSelectedParcelas && preSelectedParcelas !== enrollParcelas) {
      setEnrollParcelas(preSelectedParcelas);
    }
  }, [preSelectedParcelas, enrollParcelas]);

  useEffect(() => {
    if (preSelectedFormaPagamento && preSelectedFormaPagamento !== enrollFormaPagamento) {
      setEnrollFormaPagamento(preSelectedFormaPagamento);
    }
  }, [preSelectedFormaPagamento, enrollFormaPagamento]);

  useEffect(() => {
    if (preSelectedNome && preSelectedNome !== enrollNome) setEnrollNome(preSelectedNome);
  }, [preSelectedNome]);

  useEffect(() => {
    if (preSelectedCpf && preSelectedCpf !== enrollCpf) setEnrollCpf(preSelectedCpf);
  }, [preSelectedCpf]);

  useEffect(() => {
    if (preSelectedRg && preSelectedRg !== enrollRg) setEnrollRg(preSelectedRg);
  }, [preSelectedRg]);

  useEffect(() => {
    if (preSelectedWhatsapp && preSelectedWhatsapp !== enrollWhatsapp) setEnrollWhatsapp(preSelectedWhatsapp);
  }, [preSelectedWhatsapp]);

  useEffect(() => {
    if (preSelectedEndereco && preSelectedEndereco !== enrollEndereco) setEnrollEndereco(preSelectedEndereco);
  }, [preSelectedEndereco]);

  useEffect(() => {
    if (preSelectedInstrutor && preSelectedInstrutor !== enrollInstrutor) setEnrollInstrutor(preSelectedInstrutor);
  }, [preSelectedInstrutor]);

  useEffect(() => {
    if (preSelectedNacionalidade && preSelectedNacionalidade !== enrollNacionalidade) setEnrollNacionalidade(preSelectedNacionalidade);
  }, [preSelectedNacionalidade]);

  useEffect(() => {
    if (preSelectedEstadoCivil && preSelectedEstadoCivil !== enrollEstadoCivil) setEnrollEstadoCivil(preSelectedEstadoCivil);
  }, [preSelectedEstadoCivil]);

  // Resilient mount/update listener reading URL parameters and sessionStorage
  useEffect(() => {
    try {
      let parsed: any = null;
      if (typeof window !== 'undefined' && window.location.search) {
        parsed = parseCandidateLink(window.location.search);
      }
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('autodrive_pending_candidate') : null;
      let storedObj: any = null;
      if (stored) {
        try {
          storedObj = JSON.parse(stored);
        } catch (e) {}
      }
      const combined = { ...(storedObj || {}), ...(parsed || {}) };
      if (combined && (combined.nome || combined.cpf || combined.rawReg || combined.instrutor || combined.categoria)) {
        if (combined.nome) setEnrollNome(combined.nome);
        if (combined.cpf) setEnrollCpf(combined.cpf);
        if (combined.rg) setEnrollRg(combined.rg);
        if (combined.whatsapp) setEnrollWhatsapp(combined.whatsapp);
        if (combined.endereco) setEnrollEndereco(combined.endereco);
        if (combined.instrutor && combined.instrutor !== 'Sem Instrutor') setEnrollInstrutor(combined.instrutor);
        if (combined.categoria) setEnrollCategoria(combined.categoria);
        if (combined.dob) setEnrollDob(combined.dob);
        if (combined.nacionalidade) setEnrollNacionalidade(combined.nacionalidade);
        if (combined.estadoCivil) setEnrollEstadoCivil(combined.estadoCivil);

        // Also if candidate rawReg or ID is in combined, match in `alunos`
        if (alunos && alunos.length > 0 && (combined.rawReg || combined.cpf || combined.nome)) {
          const rawRegVal = combined.rawReg || '';
          const decodedRegVal = rawRegVal ? safeAtob(rawRegVal) : '';
          const cleanNewCpf = (combined.cpf || '').replace(/\D/g, '');
          const cleanNewName = (combined.nome || '').trim().toLowerCase();

          const existingStudent = alunos.find(a => {
            if (rawRegVal && a.id === rawRegVal) return true;
            if (decodedRegVal && a.id === decodedRegVal) return true;
            const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
            if (cleanNewCpf && cleanExistingCpf && cleanNewCpf === cleanExistingCpf) return true;
            return cleanNewName && a.nome.trim().toLowerCase() === cleanNewName;
          });

          if (existingStudent) {
            if (existingStudent.nome) setEnrollNome(existingStudent.nome);
            if (existingStudent.cpf) setEnrollCpf(existingStudent.cpf);
            if (existingStudent.rg) setEnrollRg(existingStudent.rg);
            if (existingStudent.whatsapp) setEnrollWhatsapp(existingStudent.whatsapp);
            if (existingStudent.endereco) setEnrollEndereco(existingStudent.endereco);
            if (existingStudent.instrutor && existingStudent.instrutor !== 'Sem Instrutor') setEnrollInstrutor(existingStudent.instrutor);
            if (existingStudent.nacionalidade) setEnrollNacionalidade(existingStudent.nacionalidade);
            if (existingStudent.estadoCivil) setEnrollEstadoCivil(existingStudent.estadoCivil);
            if (existingStudent.dob) setEnrollDob(existingStudent.dob);
            if (existingStudent.categoria) setEnrollCategoria(existingStudent.categoria);
          }
        }
      }
    } catch (e) {
      console.error("Error parsing URL/storage parameters in candidate enrollment form:", e);
    }
  }, [alunos]);

  const handleEnrollDobChange = (dobStr: string) => {
    setEnrollDob(dobStr);
    if (!dobStr) {
      if (onDobChange) onDobChange('');
      return;
    }
    // Only synchronize and trigger demographic validations on parent once a full date has been completely typed/selected (10 characters: YYYY-MM-DD)
    if (dobStr.length === 10) {
      if (onDobChange) onDobChange(dobStr);
      const age = calculateAge(dobStr);
      if (age >= 18 && enrollPlano === 'jovem-17') {
        setEnrollPlano('adulto-18');
        if (onPlanoChange) onPlanoChange('adulto-18');
      } else if (age < 18) {
        if (enrollPlano !== 'jovem-17') {
          setEnrollPlano('jovem-17');
          if (onPlanoChange) onPlanoChange('jovem-17');
        }
        // Set parcelas based on months to 18
        const months = calculateMonthsTo18(dobStr);
        if (months >= 1 && months <= 12) {
          setEnrollParcelas(months);
        } else {
          setEnrollParcelas(12);
        }
      }
    }
  };

  const handleEnrollEnderecoChange = (addressValue: string) => {
    setEnrollEndereco(addressValue);
  };

  const fetchAddressByCep = async (cepCode: string) => {
    const cleaned = cepCode.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    
    setIsCepLoading(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (!response.ok) throw new Error('Falha ao buscar CEP');
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
      } else {
        const addressParts = [];
        if (data.logradouro) addressParts.push(data.logradouro);
        if (data.bairro) addressParts.push(data.bairro);
        if (data.localidade) {
          addressParts.push(data.uf ? `${data.localidade}/${data.uf}` : data.localidade);
        }
        const fullAddress = addressParts.join(', ');
        handleEnrollEnderecoChange(fullAddress);
      }
    } catch {
      setCepError('Erro de conexão ao buscar CEP.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
    
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = cleaned.substring(0, 5) + '-' + cleaned.substring(5);
    }
    setEnrollCep(formatted);
    if (cleaned.length === 8) {
      fetchAddressByCep(cleaned);
    }
  };

  const handleCopyEnrollCredentials = () => {
    if (!enrollCreatedCard) return;
    const credText = `Inscrição Nova CNH Realizada!\nID de Acesso: ${enrollCreatedCard.id}\nSenha Inicial: ${enrollCreatedCard.senha}\nCategoria: ${enrollCreatedCard.categoria}`;
    try {
      navigator.clipboard.writeText(credText);
      setCopiedEnrollCred(true);
      setTimeout(() => setCopiedEnrollCred(false), 3000);
      setToastMessage('📋 Credenciais copiadas com sucesso!');
    } catch (err) {
      setToastMessage('Por favor, copie os dados diretamente na tela.');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('printable-contract-content');
    if (!element) return;

    setToastMessage('⏳ Abrindo gerenciador de impressão do navegador...');

    // Save style
    const originalStyle = element.getAttribute('style') || '';
    // Make sure all text is fully visible for cloning
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    // Create a temporary iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      setToastMessage('❌ Não foi possível abrir o gerenciador de impressão.');
      element.setAttribute('style', originalStyle);
      return;
    }

    doc.write(`
      <html>
        <head>
          <title>Contrato Nova CNH - ${enrollCreatedCard?.nome || 'Candidato'}</title>
          <style>
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              padding: 40px;
              color: #1e293b;
              line-height: 1.6;
              font-size: 13px;
              background-color: #fff;
            }
            .text-center { text-align: center; }
            .font-black { font-weight: 900; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .mt-0\\.5 { margin-top: 2px; }
            .mt-2 { margin-top: 8px; }
            .mt-3 { margin-top: 12px; }
            .mt-1 { margin-top: 4px; }
            .mt-1\\.5 { margin-top: 6px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .space-y-5 > * + * { margin-top: 20px; }
            .space-y-8 > * + * { margin-top: 32px; }
            .border-b-2 { border-bottom: 2px solid #cbd5e1; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .pb-6 { padding-bottom: 24px; }
            .pb-1 { padding-bottom: 4px; }
            .pl-1 { padding-left: 4px; }
            .pl-3 { padding-left: 12px; }
            .border-l-2 { border-left: 2px solid #ef4444; }
            .bg-red-50 { background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 12px; }
            .text-red-950 { color: #450a0a; }
            .text-red-800 { color: #991b1b; }
            .text-emerald-800 { color: #065f46; font-weight: bold; }
            .font-sans { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
            .font-mono { font-family: monospace; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: 1fr; }
            @media (min-width: 640px) {
              .sm\\:grid-cols-2 { grid-template-columns: 1fr 1fr; }
            }
            .gap-2 { gap: 8px; }
            p { margin: 8px 0; text-align: justify; }
            h3, h4, h5 { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 15px; margin-bottom: 5px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .rounded { border-radius: 4px; }
            .border { border: 1px solid #cbd5e1; }
            .w-4 { width: 16px; }
            .h-4 { height: 16px; }
            .inline-flex { display: inline-flex; }
            .justify-center { justify-content: center; }
            .bg-white { background-color: #ffffff; }
            .text-slate-950 { color: #020617; }
            @media print {
              body { padding: 15px; font-size: 11px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Clean up iframe off-screen safely after 10 seconds (no blocking, zero UI freeze)
    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (err) {
        console.warn('Iframe cleanup safe error:', err);
      }
    }, 10000);

    // Restore style
    element.setAttribute('style', originalStyle);
    setToastMessage('✅ Gerenciador de impressão aberto! Escolha "Salvar como PDF" se desejar o arquivo.');
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-contract-content');
    if (!element) return;

    setIsDownloadingPdf(true);
    setToastMessage('⏳ Preparando download do contrato...');

    const candidateDocName = enrollCreatedCard?.nome
      ? enrollCreatedCard.nome.trim().replace(/\s+/g, '_').toLowerCase()
      : 'candidato';

    // Standalone, beautifully styled HTML offline file is downloaded instantly
    const triggerHtmlDownloadAndNativePrint = () => {
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <title>Contrato Nova CNH - ${enrollCreatedCard?.nome || 'Candidato'}</title>
              <style>
                body {
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  padding: 30px;
                  color: #1e293b;
                  line-height: 1.5;
                  font-size: 13px;
                  background-color: #f8fafc;
                }
                .container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: #ffffff;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                  border: 1px solid #e2e8f0;
                }
                .text-center { text-align: center; }
                .font-black { font-weight: 900; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .tracking-wider { letter-spacing: 0.05em; }
                .mt-2 { margin-top: 8px; }
                .mt-3 { margin-top: 12px; }
                .mb-2 { margin-bottom: 8px; }
                .border-b { border-bottom: 1px solid #e2e8f0; }
                .pb-6 { padding-bottom: 24px; }
                .border-l-2 { border-left: 2px solid #ef4444; }
                .pl-3 { padding-left: 12px; }
                .bg-red-50 { background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 12px; }
                .text-emerald-800 { color: #065f46; font-weight: bold; }
                .font-sans { font-family: sans-serif; }
                .font-mono { font-family: monospace; }
                .grid { display: grid; }
                .grid-cols-1 { grid-template-columns: 1fr; }
                .gap-2 { gap: 8px; }
                p { margin: 8px 0; text-align: justify; }
                h3, h4, h5 { font-family: sans-serif; margin-top: 15px; margin-bottom: 5px; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .rounded { border-radius: 4px; }
                .border { border: 1px solid #cbd5e1; }
                .w-4 { width: 16px; }
                .h-4 { height: 16px; }
                .inline-flex { display: inline-flex; }
                .justify-center { justify-content: center; }
                .bg-white { background-color: #ffffff; }
                .text-slate-950 { color: #020617; }
                .header-actions {
                  max-width: 800px;
                  margin: 0 auto 20px auto;
                  background-color: #eff6ff;
                  border: 1px solid #bfdbfe;
                  padding: 15px;
                  border-radius: 8px;
                  text-align: center;
                }
                .btn-print {
                  background-color: #0c2340;
                  color: #ffffff;
                  border: none;
                  padding: 11px 24px;
                  font-size: 14px;
                  font-weight: bold;
                  border-radius: 6px;
                  cursor: pointer;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  transition: background-color 0.2s;
                }
                .btn-print:hover {
                  background-color: #0d2c4f;
                }
                @media print {
                  body { padding: 0px; background-color: #fff; font-size: 11px; }
                  .container { padding: 0; border: none; box-shadow: none; max-width: 100%; }
                  .header-actions { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header-actions">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #1e40af; font-weight: 500;">
                  🔒 Contrato de Adesão Eletrônica gerado com sucesso!
                </p>
                <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir Contrato</button>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
                  <strong>Dica:</strong> Para salvar em seu telefone ou computador como PDF, clique acima e selecione a opção <strong>"Salvar como PDF"</strong> no destino de impressão.
                </p>
              </div>
              <div class="container">
                ${element.innerHTML}
              </div>
              <script>
                // Auto-trigger print modal in a separate window once loaded for frictionless experience
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 300);
                };
              </script>
            </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contrato_nova_cnh_${candidateDocName}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsDownloadingPdf(false);
        setToastMessage('✅ Cópia oficial do contrato baixada com sucesso! Dica: Ao abrir o arquivo, ele imprimirá automaticamente.');
      } catch (err) {
        console.error("Error during download:", err);
        setIsDownloadingPdf(false);
        setToastMessage('⚠️ Falha ao processar download automático. Por favor, tente imprimir diretamente.');
      }
    };

    // Run this instantly in a tick to ensure non-blocking UI
    setTimeout(triggerHtmlDownloadAndNativePrint, 100);
  };

  const handleCandidateEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollNome.trim()) {
      alert('Por favor, informe seu nome completo.');
      return;
    }
    if (!enrollDob) {
      alert('Por favor, informe sua data de nascimento.');
      return;
    }
    const age = calculateAge(enrollDob);
    if (age < 17) {
      alert(`Para se cadastrar é necessário ter no mínimo 17 anos.`);
      return;
    }
    if (!enrollCpf.trim()) {
      alert('Por favor, informe seu CPF para fins de preenchimento do contrato legal.');
      return;
    }
    if (!enrollRg.trim()) {
      alert('Por favor, informe seu RG para fins de preenchimento do contrato legal.');
      return;
    }
    if (!enrollWhatsapp.trim()) {
      alert('Por favor, informe um WhatsApp para contato.');
      return;
    }

    // Checking guardian's whatsapp and details if minor (< 18)
    if (age < 18) {
      if (!enrollNomeResponsavel.trim()) {
        alert('Por favor, informe o Nome Completo do responsável legal.');
        return;
      }
      if (!enrollCpfResponsavel.trim()) {
        alert('Por favor, informe o CPF do responsável legal.');
        return;
      }
      if (!enrollRgResponsavel.trim()) {
        alert('Por favor, informe o RG do responsável legal.');
        return;
      }
      if (!enrollWhatsappResponsavel.trim()) {
        alert('Por favor, informe o WhatsApp de um responsável legal.');
        return;
      }
    }

    // Auto generate high-quality random password
    const autoSenha = String(Math.floor(1000 + Math.random() * 9000));

    // Normalizing numbers to check duplicates of whatsapp / cpf
    const cleanWhatsapp = enrollWhatsapp.replace(/\D/g, '');
    const cleanNewCpf = enrollCpf.replace(/\D/g, '');
    const cleanNewName = enrollNome.trim().toLowerCase();

    const existingStudent = alunos.find(a => {
      const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
      if (cleanNewCpf && cleanExistingCpf && cleanNewCpf === cleanExistingCpf) return true;
      if (cleanNewName && a.nome.trim().toLowerCase() === cleanNewName) return true;
      if (cleanWhatsapp && (a.whatsapp || '').replace(/\D/g, '') === cleanWhatsapp) return true;
      return false;
    });

    const nextIdNum = alunos.length > 0 
      ? Math.max(...alunos.map(a => {
          if (!a || !a.id) return 0;
          const match = a.id.match(/\d+/);
          return match ? parseInt(match[0], 10) || 0 : 0;
        })) + 1 
      : 1;
    const formattedId = `CNH-${String(nextIdNum).padStart(3, '0')}`;

    const getCarroPrice = (qty: number) => (qty === 2 ? 250 : qty * 125);
    const getMotoPrice = (qty: number) => (qty === 2 ? 200 : qty * 90);
    const getAmbosPrice = (carroQty: number, motoQty: number) => {
      if (carroQty === 2 && motoQty === 2) return 450;
      return getCarroPrice(carroQty) + getMotoPrice(motoQty);
    };

    const rawBaseValorTotal = enrollCategoria === 'Moto (A)' 
      ? getMotoPrice(enrollAulas) 
      : enrollCategoria === 'Carro (B)' 
        ? getCarroPrice(enrollAulas) 
        : getAmbosPrice(enrollAulasCarro, enrollAulasMoto);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    let passesToNextYear = false;
    if (enrollPlano === 'jovem-17' && enrollFormaPagamento !== 'vista') {
      if (enrollDob && enrollDob.length === 10) {
        const birthDate = new Date(enrollDob);
        if (!isNaN(birthDate.getTime())) {
          passesToNextYear = (birthDate.getFullYear() + 18) > currentYear;
        } else {
          passesToNextYear = (currentMonth + enrollParcelas - 1) > 12;
        }
      } else {
        passesToNextYear = (currentMonth + enrollParcelas - 1) > 12;
      }
    }
    const baseValorTotal = passesToNextYear ? Math.round(rawBaseValorTotal * 1.3) : rawBaseValorTotal;

    let enrollValorTotal = Math.round(baseValorTotal);
    if (enrollFormaPagamento === 'cartao') {
      const multiplier = getCreditCardInterestMultiplier(enrollParcelas);
      const perMonth = Math.ceil(((baseValorTotal * multiplier) / enrollParcelas) * 100) / 100;
      enrollValorTotal = perMonth * enrollParcelas;
    } else if (enrollFormaPagamento === 'hibrido') {
      const partVista = baseValorTotal / 2;
      const partCartaoUnrounded = baseValorTotal / 2;
      const multiplier = getCreditCardInterestMultiplier(enrollParcelas);
      const partCartaoMonthly = Math.ceil(((partCartaoUnrounded * multiplier) / enrollParcelas) * 100) / 100;
      enrollValorTotal = partVista + (partCartaoMonthly * enrollParcelas);
    } else {
      const perMonth = Math.ceil((baseValorTotal / (enrollFormaPagamento === 'vista' ? 1 : enrollParcelas)) * 100) / 100;
      enrollValorTotal = perMonth * (enrollFormaPagamento === 'vista' ? 1 : enrollParcelas);
    }

    const finalAulasCount = enrollCategoria === 'Carro e Moto (A+B)' 
      ? (enrollAulasCarro + enrollAulasMoto) 
      : enrollAulas;

    // Search for existing student by CPF or Name to avoid wiping out payments or generating duplicate IDs
    const matchedStudent = existingStudent || alunos.find(a => {
      const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
      if (cleanNewCpf && cleanExistingCpf && cleanNewCpf === cleanExistingCpf) return true;
      return a.nome.trim().toLowerCase() === cleanNewName;
    });

    const targetId = matchedStudent ? matchedStudent.id : formattedId;
    const existingParcelasPagas = matchedStudent ? (matchedStudent.parcelasPagas || 0) : 0;
    const existingBaixas = matchedStudent ? (matchedStudent.baixasPagamento || []) : [];
    const existingComprovantes = matchedStudent ? (matchedStudent.comprovantes || []) : [];
    const existingSenha = matchedStudent ? (matchedStudent.senha || autoSenha) : autoSenha;

    const newObj: Aluno = {
      id: targetId,
      nome: enrollNome.trim(),
      dob: enrollDob,
      whatsapp: enrollWhatsapp,
      whatsappResponsavel: age < 18 ? enrollWhatsappResponsavel : undefined,
      categoria: enrollCategoria,
      instrutor: (() => {
        if (enrollInstrutor && enrollInstrutor !== 'Sem Instrutor' && enrollInstrutor !== 'A definir') {
          return enrollInstrutor.trim();
        }
        if (preSelectedInstrutor && preSelectedInstrutor !== 'Sem Instrutor' && preSelectedInstrutor !== 'A definir') {
          return preSelectedInstrutor.trim();
        }
        if (matchedStudent && matchedStudent.instrutor) return matchedStudent.instrutor;
        try {
          const stored = sessionStorage.getItem('autodrive_pending_candidate');
          if (stored) {
            const parsedStored = JSON.parse(stored);
            if (parsedStored.instrutor && parsedStored.instrutor !== 'Sem Instrutor') {
              return parsedStored.instrutor.trim();
            }
          }
          const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
          const referrerInstrutor = urlParams.get('instrutor') || urlParams.get('ref') || urlParams.get('instructor');
          if (referrerInstrutor) return decodeURIComponent(referrerInstrutor).trim();
        } catch (e) {}
        return 'Sem Instrutor';
      })(),
      dataAdesao: matchedStudent ? matchedStudent.dataAdesao : new Date().toISOString().substring(0, 10),
      parcelasPagas: existingParcelasPagas, // Preserves actual payments or starts at 0 (unpaid)
      valorTotal: enrollValorTotal,
      pontosSimulado: matchedStudent ? (matchedStudent.pontosSimulado || 120) : 120,
      senha: existingSenha,
      endereco: enrollEndereco.trim(),
      tipoPlano: (enrollPlano === 'jovem-17' && age < 18) ? 'Plano Poupança Jovem 17 Anos' : enrollPlano === 'habilitado' ? 'Treinamento para Habilitados' : 'Plano CNH Facilitada Maiores de 18 Anos',
      cpf: enrollCpf.trim(),
      rg: enrollRg.trim(),
      nacionalidade: enrollNacionalidade.trim(),
      estadoCivil: enrollEstadoCivil.trim(),
      nomeResponsavel: age < 18 ? enrollNomeResponsavel.trim() : undefined,
      cpfResponsavel: age < 18 ? enrollCpfResponsavel.trim() : undefined,
      rgResponsavel: age < 18 ? enrollRgResponsavel.trim() : undefined,
      aulas: finalAulasCount,
      parcelasTotal: enrollParcelas,
      formaPagamento: enrollFormaPagamento,
      baixasPagamento: existingBaixas,
      comprovantes: existingComprovantes,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...alunos.filter(a => {
      const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
      const cleanNewCpf = (newObj.cpf || '').replace(/\D/g, '');
      if (cleanExistingCpf && cleanNewCpf && cleanExistingCpf === cleanNewCpf) return false;
      if (a.nome.trim().toLowerCase() === newObj.nome.trim().toLowerCase()) return false;
      return true;
    }), newObj];

    setAlunos(updatedList);
    try {
      localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(updatedList));
      localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(updatedList));
    } catch (e) {}

    // Persistência direta no Firestore (salva apenas o novo candidato para otimização de cota)
    saveAlunoToFirestore(newObj).catch(err => console.warn("Aviso ao salvar aluno no Firestore:", err));

    // Backup adicional via Webhook Google Sheets (se configurado)
    try {
      const gasUrl = localStorage.getItem('nova_cnh_gas_webhook_url');
      if (gasUrl && gasUrl.startsWith('https://script.google.com')) {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'syncAluno',
            aluno: newObj,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});
      }
    } catch (e) {}

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunos: updatedList })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.alunos && Array.isArray(data.alunos)) {
          setAlunos(data.alunos);
          try {
            localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(data.alunos));
          } catch (e) {}

          const savedCandidate = data.alunos.find(a => {
            const cleanA = (a.cpf || '').replace(/\D/g, '');
            const cleanN = (newObj.cpf || '').replace(/\D/g, '');
            if (cleanA && cleanN && cleanA === cleanN) return true;
            return a.nome.trim().toLowerCase() === newObj.nome.trim().toLowerCase();
          });

          if (savedCandidate) {
            setEnrollCreatedCard({
              id: savedCandidate.id,
              nome: savedCandidate.nome,
              senha: savedCandidate.senha || autoSenha,
              categoria: savedCandidate.categoria,
              instrutor: savedCandidate.instrutor,
              whatsapp: savedCandidate.whatsapp,
              whatsappResponsavel: savedCandidate.whatsappResponsavel,
              endereco: savedCandidate.endereco,
              cpf: savedCandidate.cpf,
              rg: savedCandidate.rg,
              nacionalidade: savedCandidate.nacionalidade,
              estadoCivil: savedCandidate.estadoCivil,
              nomeResponsavel: savedCandidate.nomeResponsavel,
              cpfResponsavel: savedCandidate.cpfResponsavel,
              rgResponsavel: savedCandidate.rgResponsavel,
              valorTotal: savedCandidate.valorTotal,
              baseValorTotal: baseValorTotal,
              aulas: finalAulasCount
            });
            return;
          }
        }
      })
      .catch(err => console.error("Erro ao sincronizar cadastro com servidor/nuvem:", err));

    setEnrollCreatedCard({
      id: formattedId,
      nome: newObj.nome,
      senha: autoSenha,
      categoria: newObj.categoria,
      instrutor: newObj.instrutor,
      whatsapp: newObj.whatsapp,
      whatsappResponsavel: newObj.whatsappResponsavel,
      endereco: newObj.endereco,
      cpf: newObj.cpf,
      rg: newObj.rg,
      nacionalidade: newObj.nacionalidade,
      estadoCivil: newObj.estadoCivil,
      nomeResponsavel: newObj.nomeResponsavel,
      cpfResponsavel: newObj.cpfResponsavel,
      rgResponsavel: newObj.rgResponsavel,
      valorTotal: newObj.valorTotal,
      baseValorTotal: baseValorTotal,
      aulas: finalAulasCount
    });

    // Generate random Gov.br simulation parameters
    const hash = Math.random().toString(16).substring(2, 10).toUpperCase() + 
                 Math.random().toString(16).substring(2, 10).toUpperCase();
    const mockIp = `177.${Math.floor(10 + Math.random() * 240)}.${Math.floor(Math.random() * 255)}.${Math.floor(1 + Math.random() * 254)}`;
    const formattedDate = new Date().toLocaleString('pt-BR');
    
    setSignatureDate(formattedDate);
    setSignatureHash(hash);
    setSignatureIp(mockIp);
    setIsContractSigned(false);
    setShowCredentialsModal(true);

    setToastMessage(`🎉 Cadastro concluído com sucesso! Agora preencha e assine o contrato.`);
  };

  const isMinor = enrollDob ? calculateAge(enrollDob) < 18 : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 scroll-mt-28" id="candidate-self-enrollment-platform">
      {enrollCreatedCard ? (
        /* EXIBIÇÃO DE CREDENCIAIS + CONTRATO TOTALMENTE PREENCHIDO */
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-200 text-left">
          
          {/* TOPO: CRIAÇÃO DE CONTA E LOGIN */}
          <div className="bg-slate-900 border border-emerald-500/35 rounded-2xl text-slate-100 overflow-hidden shadow-xl p-6 text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-400 font-mono">
                  Inscrição Ativa & Acesso Gerado
                </span>
                <h4 className="text-lg font-extrabold text-white">✨ Conta Criada com Sucesso!</h4>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/10 text-emerald-400 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                  Adesão Registrada • Código {enrollCreatedCard.id}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEnrollCreatedCard(null);
                    setIsContractSigned(false);
                  }}
                  className="bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-black text-[11px] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Fechar totalmente e voltar"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para entrar no seu smartphone virtual após assinar o contrato, utilize as credenciais de acesso oficiais geradas dinamicamente:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase font-sans block">ID de Acesso (Login):</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-black text-emerald-400 font-mono">{enrollCreatedCard.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(enrollCreatedCard.id);
                      setToastMessage("📋 ID copiado!");
                    }}
                    className="text-[10px] text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 font-semibold transition"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase font-sans block">Senha de Acesso:</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-black text-amber-400 font-mono">{enrollCreatedCard.senha}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(enrollCreatedCard.senha);
                      setToastMessage("🔑 Senha copiada!");
                    }}
                    className="text-[10px] text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 font-semibold transition"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            {enrollCreatedCard.whatsappResponsavel ? (
              <div className="bg-red-950/40 border border-red-900/30 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
                <span className="text-base mt-0.5">👨‍👩‍👦</span>
                <div className="space-y-1.5">
                  <span className="font-bold text-red-300 block">Canal do Responsável Ativo</span>
                  <span className="text-slate-300 leading-normal block">
                    Por se tratar de candidato menor de idade, esta senha inicial de acesso também foi disparada por segurança para o WhatsApp do responsável cadastrado: <strong className="text-red-200 font-mono font-black">{enrollCreatedCard.whatsappResponsavel}</strong>
                  </span>
                  <a 
                    href={`https://wa.me/55${enrollCreatedCard.whatsappResponsavel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Como responsável legal de ${enrollCreatedCard.nome}, confirmo que preenchemos a inscrição do programa Nova CNH. ID do aluno: ${enrollCreatedCard.id} | Senha de login: ${enrollCreatedCard.senha}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                  >
                    📲 Disparar Protocolo Responsável por WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-900/40 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
                <span className="text-base mt-0.5">✅</span>
                <div className="space-y-1.5 animate-in fade-in">
                  <span className="font-bold text-emerald-400 block font-sans">Canal do(a) Candidato(a) Ativo(a) (Maior de Idade)</span>
                  <span className="text-slate-300 block leading-normal">
                    Como o candidato já possui maiores de 18 anos, ele gerencia seu próprio progresso no trânsito. O ID e a senha foram emitidos de forma direta para seu número principal: <strong className="text-emerald-300 font-mono font-black">{enrollCreatedCard.whatsapp}</strong>
                  </span>
                  <a 
                    href={`https://wa.me/55${enrollCreatedCard.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${enrollCreatedCard.nome}! Seguem seus acessos oficiais gerados no sistema Nova CNH Brasil na Mão: ID ${enrollCreatedCard.id} e Senha ${enrollCreatedCard.senha}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                  >
                    📲 Disparar Acessos ao WhatsApp do(a) Candidato(a)
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* MEIO: O CONTRATO JURÍDICO FORMATADO */}
          <div className="bg-white border border-slate-300 rounded-2xl shadow-lg overflow-hidden flex flex-col pt-1.5" id="p-contract-to-print">
            
            {/* Cabeçalho do Bloco do Contrato */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h5 className="font-black text-[#0c2340] text-sm tracking-tight flex items-center gap-1.5 uppercase font-sans">
                  <span>📄</span> Instrumento Contratual de Adesão Prática
                </h5>
                <p className="text-[11px] text-slate-500 font-medium">
                  Documento formalizado de acréscimo de aulas e proteção jurídica. Revise todas as cláusulas e assine ao final.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg border border-indigo-500/30 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  🖨️ Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-80"
                >
                  {isDownloadingPdf ? (
                    <>⏳ Gerando PDF...</>
                  ) : (
                    <>📥 Baixar Contrato em PDF</>
                  )}
                </button>
              </div>
            </div>

            {/* PAPEL DO CONTRATO (ESTILO OFICIAL PERGAMINHO / LEGAL PAPER) */}
            <div id="printable-contract-content" className="p-8 md:p-12 bg-amber-50/20 border-b border-slate-200 text-slate-850 space-y-8 font-serif leading-relaxed text-xs max-h-[500px] overflow-y-auto shadow-inner">
              
              {/* Logotipo ou Identificador de Cabeçalho Jurídico */}
              <div className="text-center space-y-2 border-b-2 border-slate-200 pb-6">
                <div className="text-center">
                  <span className="font-black text-xl text-[#0c2340] tracking-wider uppercase font-sans block">NOVA CNH BRASIL NA MÃO</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase font-sans block tracking-widest mt-0.5">Treinamento Prático de Direção & Cidadania no Trânsito</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 font-sans tracking-wide uppercase mt-3">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TREINAMENTO PRÁTICO
                </h3>
              </div>

              {/* CONTRATANTE E CONTRATADO */}
              <section className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 font-sans uppercase border-b border-slate-200 pb-1 mb-2">I. CONTRATANTE</h4>
                  <div className="space-y-1">
                    <p>
                      <strong>Nome Completo:</strong> <span className="font-sans font-bold underline">{enrollCreatedCard.nome}</span>
                    </p>
                    <p>
                      <strong>Nacionalidade:</strong> {enrollCreatedCard.nacionalidade || "Brasileira"} | <strong>Estado Civil:</strong> {enrollCreatedCard.estadoCivil || "Solteiro(a)"}
                    </p>
                    <p>
                      <strong>CPF nº:</strong> <span className="font-mono font-bold">{enrollCreatedCard.cpf}</span>
                    </p>
                    <p>
                      <strong>Endereço Residencial:</strong> {enrollCreatedCard.endereco || "Não cadastrado"}
                    </p>
                    <p>
                      <strong>Telefone/WhatsApp:</strong> <span className="font-mono">{enrollCreatedCard.whatsapp}</span>
                    </p>
                    
                    {/* Representação de menores para eliminar brecha civil/ruptura jurídica */}
                    {enrollCreatedCard.whatsappResponsavel ? (
                      <div className="bg-red-50 border border-red-200 text-red-950 p-3 rounded-lg mt-3 font-sans text-[11px] leading-relaxed">
                        <span className="font-black text-[10px] text-red-800 uppercase block mb-1">📋 CLÁUSULA DE ASSISTÊNCIA CIVIL (OBRIGATÓRIO POR LEI):</span>
                        Como o CONTRATANTE é menor de 18 anos (17 anos completos), este instrumento é qualificado pela assistência de seu representante legal, que assume corresponsabilidade civil e financeira:
                        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 font-serif text-[11px] text-slate-900 pl-1 border-l-2 border-red-400">
                          <p><strong>Nome do Responsável:</strong> {enrollCreatedCard.nomeResponsavel}</p>
                          <p><strong>WhatsApp do Responsável:</strong> {enrollCreatedCard.whatsappResponsavel}</p>
                          <p><strong>CPF do Responsável:</strong> {enrollCreatedCard.cpfResponsavel}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 font-sans uppercase border-b border-slate-200 pb-1 mb-2">II. CONTRATADO</h4>
                  <div className="space-y-1 pl-1">
                    <p>
                      <strong>Miqueias Souza de Lima - Instrutor Autônomo</strong>
                    </p>
                    <p>
                      <strong>Registro na SENATRAN:</strong> 1674704384
                    </p>
                    <p>
                      <strong>CPF nº:</strong> 869.496.594-15 | <strong>Operadora Parceira:</strong> Nova CNH Brasil na Mão
                    </p>
                    <p>
                      <strong>WhatsApp de Atendimento Técnico:</strong> (81) 99201-1024
                    </p>
                  </div>
                </div>
              </section>

              {/* CLÁUSULAS CONTRATUAIS */}
              <section className="space-y-5 text-[11px] text-slate-800">
                
                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA PRIMEIRA – DO OBJETO</h5>
                  <p className="mt-1">
                    O presente contrato tem por objeto a prestação de serviços de aulas práticas de direção veicular e aperfeiçoamento de competências práticas de trânsito para:
                  </p>
                  
                  <div className="mt-2 pl-3 space-y-1 font-sans text-xs">
                    <p className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-slate-400 inline-flex items-center justify-center font-bold font-mono bg-white text-slate-950">
                        {enrollPlano !== 'habilitado' ? "X" : " "}
                      </span>
                      <span><strong>Primeira Habilitação</strong> (Candidatos inscritos no plano inteligente preparatório Nova CNH)</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-slate-400 inline-flex items-center justify-center font-bold font-mono bg-white text-slate-950">
                        {enrollPlano === 'habilitado' ? "X" : " "}
                      </span>
                      <span><strong>Motoristas Já Habilitados</strong> (Condutores que buscam reabilitação prática emocional ou técnica)</span>
                    </p>
                  </div>
                  
                  <p className="mt-2">
                    Todos os serviços de instrução contidos neste instrumento são supervisionados pelo <strong>CONTRATADO</strong> sob o amparo tecnológico da marca <strong>Nova CNH Brasil na Mão</strong>.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA SEGUNDA – DA CARGA HORÁRIA E AGENDAMENTO</h5>
                  <p className="mt-1">
                    <strong>2.1.</strong> O pacote de treinamento prático contratado compreende o total de <strong>{enrollCreatedCard.aulas} aulas práticas</strong>, com duração estipulada de <strong>50 minutos</strong> cada uma
                    {enrollCreatedCard.categoria === 'Carro e Moto (A+B)' ? (
                      <span> (sendo divididas sob medida em <strong>{enrollAulasCarro} aulas de Carro (B)</strong> e <strong>{enrollAulasMoto} aulas de Moto (A)</strong> pelo programa Fórmula Flex de aproveitamento de habilidade prévia)</span>
                    ) : (
                      <span> para a categoria especificada (<strong>{enrollCreatedCard.categoria}</strong>)</span>
                    )}.
                  </p>
                  <p className="mt-1">
                    <strong>2.2.</strong> As sessões práticas de direção serão pré-agendadas por meio de canais oficiais entre o aluno e o instrutor. Cancelamentos ou solicitações de remarcação de horários por parte do <strong>CONTRATANTE</strong> deverão ser comunicados com, no mínimo, <strong>24 horas de antecedência</strong>. O descumprimento deste prazo ensejará a marcação do serviço como "aula dada" (faturada), sem direito ao reposicionamento da referida hora-aula.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA TERCEIRA – DO PREÇO E DA FORMA DE PAGAMENTO</h5>
                  <p className="mt-1">
                    <strong>3.1.</strong> Como contraprestação financeira direta pelos serviços agendados na Cláusula Terceira deste instrumento, o <strong>CONTRATANTE</strong> pagará ao <strong>CONTRATADO</strong> a importância total líquida de <strong>{enrollCreatedCard.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                  </p>
                  <p className="mt-1">
                    <strong>3.2.</strong> O valor acima especificado será liquidado nos seguintes termos estipulados à escolha do candidato:
                    <span className="block mt-1 pl-3 font-semibold text-emerald-800">
                      {enrollFormaPagamento === 'vista'
                        ? `• Pagamento À Vista realizado em cota única de ${enrollCreatedCard.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via Pix, Boleto ou Dinheiro espécie.`
                        : enrollFormaPagamento === 'cartao'
                          ? `• Financiamento no Cartão de Crédito realizado em ${enrollParcelas}x parcelas mensais de ${(enrollCreatedCard.valorTotal/enrollParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
                          : enrollFormaPagamento === 'hibrido'
                            ? (() => {
                                const baseVal = enrollCreatedCard.baseValorTotal || (enrollCreatedCard.valorTotal / 1.07);
                                const partVista = baseVal / 2;
                                const multiplier = getCreditCardInterestMultiplier(enrollParcelas);
                                const partCartaoMonthly = Math.ceil(((baseVal / 2) * multiplier) / enrollParcelas * 100) / 100;
                                return `• Pagamento Híbrido realizado sob acordo: 50% de entrada à vista no Pix/Dinheiro (${partVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) + 50% restante no Cartão de Crédito em ${enrollParcelas}x parcelas mensais de ${partCartaoMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
                              })()
                            : enrollPlano === 'jovem-17' 
                            ? `• Plano Inteligente Poupança Jovem 17 anos (investimento em depósitos de poupança congelada em ${enrollParcelas}x parcelas mensais confortáveis faturadas sob adesão de ${(enrollCreatedCard.valorTotal/enrollParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros).`
                            : enrollPlano === 'habilitado'
                            ? `• Plano de Treinamento Autônomo para Habilitados parcelado sob opção in até ${enrollParcelas}x de ${(enrollCreatedCard.valorTotal/enrollParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros.`
                            : `• Plano CNH Facilitada Maiores de 18 anos, dividido em até ${enrollParcelas}x parcelas mensais recorrentes de ${(enrollCreatedCard.valorTotal/enrollParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros.`
                      }
                    </span>
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA QUARTA – DAS TAXAS E CUSTOS EXTRAS (DETRAN-PE)</h5>
                  <p className="mt-1">
                    <strong>4.1.</strong> Os montantes definidos na Cláusula Terceira compreendem estritamente os custos técnicos e operacionais de instrução e acompanhamento veicular executado pela Nova CNH.
                  </p>
                  <p className="mt-1">
                    <strong>4.2.</strong> Fica explicitamente convencionado que <strong>todas e quaisquer taxas cobradas pelo órgão oficial estadual (DETRAN-PE)</strong> (tais como taxas federais ou estaduais de prontuário, confecção de LADV, taxas municipais, exames médicos/psicotécnicos, retestes, reagendamentos, taxas de aprovação, CNH física e emissão de taxas adicionais de exame) são de <strong>inteira e exclusiva responsabilidade financeira e tributária do CONTRATANTE</strong>, as quais deverão ser quitadas diretamente aos cofres estaduais ou repassadas sob guia específica disponibilizada pelo instrutor.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA QUINTA – DA RESCISÃO CONTRATUAL</h5>
                  <p className="mt-1">
                    <strong>5.1.</strong> O presente contrato de instrução e adesão virtual poderá ser rescindido de pleno direito por qualquer das partes, mediante notificação por escrito com antecedência (inclusive por meio digital oficial ou WhatsApp verificado).
                  </p>
                  <p className="mt-1">
                    <strong>5.2.</strong> Em caso de pedido de rescisão imotivada por conveniência exclusiva do <strong>CONTRATANTE</strong>, ou por sua inadimplência reiterada, incidirá uma <strong>multa compensatória administrativa/rescisória irrevogável de 10,5% (dez inteiros e cinco décimos por cento)</strong> sobre o valor financeiro do saldo remanescente decorrente das aulas não executadas.
                  </p>
                  <p className="mt-1">
                    <strong>5.3.</strong> Caso subsistam valores rescisórios líquidos a restituir em favor do candidato contratante após apuração e dedução das horas ministradas e da incidência da multa descrita no item 5.2, a devolução dar-se-á no prazo limite de 30 (trinta) dias úteis por depósito pix em conta homônima.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA SEXTA – DAS OBRIGAÇÕES DAS PARTES</h5>
                  <p className="mt-1">
                    <strong>6.1. Do CONTRATADO:</strong> Compromete-se a ministrar as aulas práticas e instrução com presteza, técnica adequada, zelando pela integridade do aluno condutor, seguindo as diretrizes pedagógicas oficiais do programa Nova CNH e observando os preceitos de prudência estabelecidos no Código de Trânsito Brasileiro (CTB).
                  </p>
                  <p className="mt-1">
                    <strong>6.2. Do CONTRATANTE:</strong> Obriga-se a comparecer com assiduidade e pontualidade, portando toda a documentação legal indispensável à circulação exigida pelo DETRAN local (LADV original ou CNH e RG se já habilitado), trajando calçados adequados e em perfeitas condições psicofísicas e motoras adequadas para operar o veículo, abstendo-se de álcool ou substâncias com influência psicotrópica.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA SÉTIMA – DA VALIDADE DA ASSINATURA ELETRÔNICA</h5>
                  <p className="mt-1">
                    <strong>7.1.</strong> As partes declaram para todos os efeitos de direito que estão plenamente cientes e anuem que este contrato <strong>será assinado eletronicamente através de validação de login na plataforma oficial federal GOV.BR</strong>, nos termos regidos expressamente pela <strong>Lei Federal nº 14.063/2020</strong>. A assinatura digital decorrente possui plena validade jurídica, idoneidade fiduciária e eficácia legal inequívoca perante as partes e terceiros, restando desnecessário qualquer ato cartorário de reconhecimento físico de firma no trâmite civil.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA OITAVA – DO FORO</h5>
                  <p className="mt-1">
                    As partes contratantes elegem, de comum acordo, o Foro da <strong>Comarca de Cabo de Santo Agostinho - Pernambuco</strong> como competência jurisdicional exclusiva para julgar e dirimir toda e qualquer controvérsia judicial originária deste negócio, renunciando expressamente a qualquer outro domicílio judicial por mais preferencial ou favorável que se apresente.
                  </p>
                </div>

              </section>

              {/* ASSINATURAS DO CONTRATO */}
              <div className="border-t border-slate-300 pt-8 mt-10 space-y-6">
                <p className="italic text-[11px] text-slate-500 text-center font-sans">
                  Por estarem de acordo, justo e contratantes, firmam o presente contrato de adesão eletrônica.
                </p>
                
                <p className="text-center font-sans text-xs text-slate-800">
                  Cabo de Santo Agostinho - PE, {new Date().getDate()} de {new Date().toLocaleString('pt-BR', {month: 'long'})} de {new Date().getFullYear()}.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* CONTRATANTE */}
                  <div className="border-t border-slate-400 pt-3 text-center space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">CONTRATANTE (Assinatura Eletrônica)</span>
                    <strong className="text-xs text-slate-800 font-sans block">{enrollCreatedCard.nome}</strong>
                    {enrollCreatedCard.whatsappResponsavel ? (
                      <span className="text-[10px] text-[#4f46e5] font-black uppercase font-sans block">
                        👨‍👩‍👦 ASSISTIDO POR SEU RESPONSÁVEL: {enrollCreatedCard.nomeResponsavel}
                      </span>
                    ) : null}
                    
                    {isContractSigned ? (
                      <div className="bg-emerald-50 border border-emerald-400/40 p-2.5 rounded-lg inline-block text-left text-[10px] space-y-0.5 text-emerald-800 font-sans shadow-sm w-full">
                        <span className="font-bold text-emerald-600 block uppercase">✓ Assinado via GOV.BR</span>
                        <p>CPF do Aluno: ***.{enrollCreatedCard.cpf.slice(4,11)}**</p>
                        {enrollCreatedCard.cpfResponsavel && <p>CPF Responsável: ***.{enrollCreatedCard.cpfResponsavel.slice(4,11)}**</p>}
                        <p className="font-mono text-[9px] text-slate-500 leading-tight">IP: {signatureIp}</p>
                        <p className="font-mono text-[9px] text-slate-500 leading-tight">Hash: {signatureHash}</p>
                        <p className="font-mono text-[9px] text-slate-500 leading-tight">Data: {signatureDate}</p>
                      </div>
                    ) : (
                      <span className="inline-block bg-amber-50 text-amber-800 border border-amber-300 rounded px-3 py-1 text-[10px] font-bold font-sans uppercase animate-pulse">
                        ⚠️ AGUARDANDO ASSINATURA ELETRÔNICA DO CANDIDATO
                      </span>
                    )}
                  </div>

                  {/* CONTRATADO */}
                  <div className="border-t border-slate-400 pt-3 text-center space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">CONTRATADO (Assinatura Eletrônica)</span>
                    <strong className="text-xs text-slate-800 font-sans block">Miqueias Souza de Lima — Instrutor Autônomo</strong>
                    <div className="bg-emerald-50/80 border border-emerald-400/30 p-2.5 rounded-lg inline-block text-left text-[10px] space-y-0.5 text-slate-705 font-sans w-full">
                      <span className="font-bold text-emerald-600 block uppercase">✓ Assinado Digitalmente via GOV.BR</span>
                      <p>CPF do Instrutor: ***.496.594-**</p>
                      <p className="font-mono text-[9px] text-slate-400">Hash: BD829FA1-4ECA-391B-89E1-E9238F</p>
                      <p className="font-mono text-[9px] text-slate-400">Status: Válido e Credenciado SENATRAN nº 1674704384</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* BOTÃO INTERATIVO DE ASSINATURA DIGITAL DO GOV.BR */}
            <div className="bg-slate-50 p-6 text-center space-y-4">
              
              {!isContractSigned ? (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 max-w-xl mx-auto flex items-start gap-3">
                    <span className="text-xl">ℹ️</span>
                    <div className="text-left space-y-1">
                      <span className="font-black text-sky-900 text-xs font-sans uppercase block">Análise de Ruptura Jurídica Concluída</span>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                        Este contrato está rigorosamente resguardado perante o <strong>Código Civil Brasileiro (Artigos 4º, 14, 104 e 421)</strong> e a <strong>Lei Federal de Assinatura Eletrônica (Plataforma Gov.br - Lei nº 14.063/2020)</strong>. Há total conformidade jurídica ao envolver o responsável legal para menor de idade, sem qualquer ruptura de invalidade.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsContractSigned(true);
                        setToastMessage("🖊️ Sucesso! Contrato assinado via certificado digital Gov.br.");
                        safeScrollTo(300);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#133055] hover:bg-[#0c2340] text-white font-black py-4 px-8 rounded-xl text-xs sm:text-sm shadow-xl hover:shadow-cyan-500/10 cursor-pointer active:scale-95 transition-all font-sans"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>✍️ Assinar Contrato via GOV.BR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnrollCreatedCard(null);
                        setIsContractSigned(false);
                      }}
                      className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 px-6 rounded-xl text-xs sm:text-sm transition cursor-pointer"
                    >
                      Cancelar e Voltar
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans block">Você será autenticado no ambiente simulado padrão GOV.BR. Não são necessários dados externos.</p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-4 shadow-sm animate-in zoom-in-95">
                  <div className="h-10 w-10 bg-emerald-500 text-white font-sans text-xl rounded-full flex items-center justify-center mx-auto shadow-md">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-emerald-900 text-sm font-sans uppercase">Contrato Ativado com Sucesso!</h5>
                    <p className="text-xs text-slate-700 font-medium">
                      O termo juridico digital foi assinado por ambas as partes e arquivado. O candidato está oficializado na base do programa.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStudentId(enrollCreatedCard.id);
                        setIsAuthenticated(true);
                        setCurrentTab('app-jovem');
                        setToastMessage(`📱 Bem-vindo ao painel virtual, ${enrollCreatedCard.nome}!`);
                        safeScrollTo(0);
                      }}
                      className="w-full bg-emerald-550 hover:bg-emerald-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 text-center"
                    >
                      📱 Ir para o Simulador de Celular
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnrollCreatedCard(null);
                        setEnrollNome('');
                        setEnrollDob('2008-08-14');
                        setEnrollWhatsapp('');
                        setEnrollWhatsappResponsavel('');
                        setEnrollEndereco('');
                        setEnrollCep('');
                        setCepError(null);
                        setEnrollCpf('');
                        setEnrollRg('');
                        setEnrollNomeResponsavel('');
                        setEnrollCpfResponsavel('');
                        setEnrollRgResponsavel('');
                        setIsContractSigned(false);
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-755 text-slate-200 font-semibold py-3 px-4 rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Nova Inscrição / Voltar
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      ) : (
        /* FORMULÁRIO DE INSCRIÇÃO DO CANDIDATO */
        <form onSubmit={handleCandidateEnroll} className="space-y-6 text-left">
          {(() => {
            const activeRefInstrutor = (enrollInstrutor && enrollInstrutor !== 'Sem Instrutor' && enrollInstrutor !== 'A definir') 
              ? enrollInstrutor 
              : (preSelectedInstrutor && preSelectedInstrutor !== 'Sem Instrutor' && preSelectedInstrutor !== 'A definir')
                ? preSelectedInstrutor
                : (() => {
                    try {
                      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                      const refParam = urlParams.get('instrutor') || urlParams.get('ref') || urlParams.get('instructor');
                      if (refParam) return decodeURIComponent(refParam).trim();
                      const stored = sessionStorage.getItem('autodrive_pending_candidate');
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.instrutor && parsed.instrutor !== 'Sem Instrutor') return parsed.instrutor.trim();
                      }
                    } catch (e) {}
                    return '';
                  })();

            if (activeRefInstrutor) {
              return (
                <div className="bg-emerald-950/90 text-emerald-100 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl animate-bounce">🤝</span>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 font-mono flex items-center gap-1">
                        <span>⚡</span> Vínculo Oficial de Atendimento
                      </p>
                      <p className="text-sm text-white font-extrabold mt-0.5">
                        Inscrição vinculada ao instrutor parceiro: <strong className="text-emerald-300 underline font-black">{activeRefInstrutor}</strong>
                      </p>
                      <p className="text-[10.5px] text-emerald-300/80">
                        Suas aulas práticas e comissionamento serão direcionados diretamente para este instrutor.
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-500 text-slate-950 text-xs font-black uppercase px-4 py-2 rounded-full font-mono shrink-0 select-none shadow-md flex items-center gap-1.5 self-start sm:self-auto">
                    <span>✓</span> Instrutor Vinculado
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="space-y-4 md:col-span-2">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase block font-sans">
                Dados Pessoais do Candidato
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div id="enrollment-name-section" className="space-y-1 scroll-mt-32">
                  <label className="block text-xs font-bold text-slate-700">Nome Completo do(a) Novo(a) Candidato(a):</label>
                  <input 
                    type="text" 
                    id="enrollment-fullname"
                    required
                    value={enrollNome} 
                    onChange={(e) => setEnrollNome(e.target.value)}
                    placeholder="Ex: Arthur Ramos de Souza"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold scroll-mt-32"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">CPF do Candidato:</label>
                  <input 
                    type="text" 
                    required
                    value={enrollCpf} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.substring(0, 11);
                      if (val.length > 9) {
                        val = val.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                      } else if (val.length > 6) {
                        val = val.replace(/^(\d{3})(\d{3})(\d{0,3})$/, "$1.$2.$3");
                      } else if (val.length > 3) {
                        val = val.replace(/^(\d{3})(\d{0,3})$/, "$1.$2");
                      }
                      setEnrollCpf(val);
                    }}
                    placeholder="Ex: 123.456.789-00"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">RG do Candidato:</label>
                  <input 
                    type="text" 
                    required
                    value={enrollRg} 
                    onChange={(e) => setEnrollRg(e.target.value)}
                    placeholder="Ex: 8.765.432-SSP/PE"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nacionalidade:</label>
                  <input 
                    type="text" 
                    required
                    value={enrollNacionalidade} 
                    onChange={(e) => setEnrollNacionalidade(e.target.value)}
                    placeholder="Ex: Brasileira"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Estado Civil:</label>
                  <select 
                    value={enrollEstadoCivil} 
                    onChange={(e) => setEnrollEstadoCivil(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Data de Nascimento:</label>
                  <input 
                    type="date" 
                    required
                    value={enrollDob} 
                    onChange={(e) => handleEnrollDobChange(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">Iniciativa com foco principal de 17 a 24 anos, mas aberta a qualquer pessoa.</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">WhatsApp de Contato:</label>
                  <input 
                    type="text" 
                    required
                    value={enrollWhatsapp} 
                    onChange={(e) => setEnrollWhatsapp(e.target.value)}
                    placeholder="Ex: (81) 98765-4321"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold"
                  />
                </div>

                {enrollDob && calculateAge(enrollDob) < 18 && (
                  <div className="md:col-span-2 bg-[#fdf2f2] p-4 rounded-xl border border-red-200/60 space-y-4 transition-all duration-300">
                    <span className="text-[10.5px] font-extrabold text-red-850 uppercase block font-mono flex items-center gap-1.5">
                      <span>👨‍👩‍👦</span> ASSISTÊNCIA DE MAIORIDADE (MENOR DE 18 ANOS)
                    </span>
                    <p className="text-[10.5px] text-red-950 leading-normal">
                      Por ter 17 anos (menor de idade), você é relativamente incapaz civilmente (Art. 4º, I do Código Civil). Seu contrato **deve ser assinado em conjunto (assistência) por seu responsável legal** para garantir plena validade civil e evitar anulação judicial posterior.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Nome Completo do Responsável Legal:</label>
                        <input 
                          type="text" 
                          required
                          value={enrollNomeResponsavel} 
                          onChange={(e) => setEnrollNomeResponsavel(e.target.value)}
                          placeholder="Ex: Márcia Ramos de Souza"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">WhatsApp do Responsável Legal:</label>
                        <input 
                          type="text" 
                          required
                          value={enrollWhatsappResponsavel} 
                          onChange={(e) => setEnrollWhatsappResponsavel(e.target.value)}
                          placeholder="Ex: (81) 98888-7777"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">CPF do Responsável Legal:</label>
                        <input 
                          type="text" 
                          required
                          value={enrollCpfResponsavel} 
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 11) val = val.substring(0, 11);
                            if (val.length > 9) {
                              val = val.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                            } else if (val.length > 6) {
                              val = val.replace(/^(\d{3})(\d{3})(\d{0,3})$/, "$1.$2.$3");
                            } else if (val.length > 3) {
                              val = val.replace(/^(\d{3})(\d{0,3})$/, "$1.$2");
                            }
                            setEnrollCpfResponsavel(val);
                          }}
                          placeholder="Ex: 987.654.321-99"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 font-semibold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">RG do Responsável Legal:</label>
                        <input 
                          type="text" 
                          required
                          value={enrollRgResponsavel} 
                          onChange={(e) => setEnrollRgResponsavel(e.target.value)}
                          placeholder="Ex: 9.876.543-SSP/PE"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>CEP para Busca:</span>
                        {isCepLoading && <span className="text-[10px] text-indigo-500 font-bold animate-pulse">Buscando...</span>}
                      </label>
                      <input 
                        type="text"
                        value={enrollCep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="Digite o CEP"
                        maxLength={9}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Endereço Residencial (Rua, Nº, Bairro/Cidade):</label>
                      <input 
                        type="text" 
                        required
                        value={enrollEndereco} 
                        onChange={(e) => handleEnrollEnderecoChange(e.target.value)}
                        placeholder="Puxado pelo CEP ou digite completo"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold"
                      />
                    </div>
                  </div>
                  {cepError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1">⚠️ {cepError}</p>
                  )}
                  <p className="text-[10px] text-slate-400 block font-medium mt-1">Insira seu CEP para preencher o endereço automaticamente ou digite o endereço completo manualmente.</p>
                </div>

                <div className="space-y-1 md:col-span-2 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-left">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Forma de Pagamento Pré-Selecionada:</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`text-[10.5px] font-black px-3 py-1 rounded-full tracking-wide shadow-xs ${
                      enrollFormaPagamento === 'vista' 
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200/50' 
                        : enrollFormaPagamento === 'cartao' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200/50' 
                          : enrollFormaPagamento === 'hibrido'
                            ? 'bg-teal-100 text-teal-800 border border-teal-200/50'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
                    }`}>
                      {enrollFormaPagamento === 'vista' 
                        ? '💵 À VISTA (COTA ÚNICA)' 
                        : enrollFormaPagamento === 'cartao' 
                          ? '💳 CARTÃO DE CRÉDITO' 
                          : enrollFormaPagamento === 'hibrido'
                            ? '🔀 HÍBRIDO (À VISTA/PIX + CARTÃO)'
                            : '📦 BAÚ (POUPANÇA PLANEJADA)'}
                    </span>
                    <span className="text-[11.5px] text-slate-550 font-medium">
                      (Configurada na simulação acima. Ajuste o simulador caso pretenda alterar.)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Instrutor Responsável / Vinculado:</span>
                    {enrollInstrutor && enrollInstrutor !== 'Sem Instrutor' && enrollInstrutor !== 'A definir' && (
                      <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <span>✓</span> Vinculado via Indicação/QR Code
                      </span>
                    )}
                  </label>
                  <select
                    value={enrollInstrutor || 'Sem Instrutor'}
                    onChange={(e) => setEnrollInstrutor(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold text-slate-800"
                  >
                    <option value="Sem Instrutor">Sem Instrutor Direto (Atendimento Geral / Central)</option>
                    {instrutores && instrutores.map((inst, idx) => (
                      <option key={inst.nome || idx} value={inst.nome}>
                        {inst.nome} {inst.regiao ? `— (${inst.regiao})` : ''}
                      </option>
                    ))}
                    {enrollInstrutor && enrollInstrutor !== 'Sem Instrutor' && !instrutores?.some(i => i.nome.toLowerCase() === enrollInstrutor.toLowerCase()) && (
                      <option value={enrollInstrutor}>{enrollInstrutor} (Instrutor Vinculado)</option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 block font-medium">
                    Instrutor autônomo credenciado responsável pelo atendimento e acompanhamento deste candidato.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Categoria de Carteira Desejada:</label>
                    <select 
                      value={enrollCategoria} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setEnrollCategoria(val);
                        if (onCategoriaChange) onCategoriaChange(val);
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold text-slate-800"
                    >
                      <option value="Carro (B)">Carro (B)</option>
                      <option value="Moto (A)">Moto (A)</option>
                      <option value="Carro e Moto (A+B)">Carro e Moto (A+B)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Parcelas para o Financiamento:</label>
                    {(() => {
                      const getCarroPrice = (qty: number) => (qty === 2 ? 250 : qty * 125);
                      const getMotoPrice = (qty: number) => (qty === 2 ? 200 : qty * 90);
                      const getAmbosPrice = (carroQty: number, motoQty: number) => {
                        if (carroQty === 2 && motoQty === 2) return 450;
                        return getCarroPrice(carroQty) + getMotoPrice(motoQty);
                      };

                      const rawBaseVal = enrollCategoria === 'Moto (A)' 
                        ? getMotoPrice(enrollAulas) 
                        : enrollCategoria === 'Carro (B)' 
                          ? getCarroPrice(enrollAulas) 
                          : getAmbosPrice(enrollAulasCarro, enrollAulasMoto);

                      const currentMonth = new Date().getMonth() + 1;
                      const currentYear = new Date().getFullYear();

                      return (
                        <select 
                          disabled={enrollFormaPagamento === 'vista'}
                          value={enrollFormaPagamento === 'vista' ? 1 : enrollParcelas} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEnrollParcelas(val);
                          }}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c2340] font-semibold text-slate-800 disabled:opacity-60"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                            // Calculate if it passes to next year for this option n
                            let passesToNextYear = false;
                            if (enrollPlano === 'jovem-17' && enrollFormaPagamento !== 'vista') {
                              if (enrollDob && enrollDob.length === 10) {
                                const birthDate = new Date(enrollDob);
                                if (!isNaN(birthDate.getTime())) {
                                  passesToNextYear = (birthDate.getFullYear() + 18) > currentYear;
                                } else {
                                  passesToNextYear = (currentMonth + n - 1) > 12;
                                }
                              } else {
                                passesToNextYear = (currentMonth + n - 1) > 12;
                              }
                            }
                            const baseValForN = passesToNextYear ? Math.round(rawBaseVal * 1.3) : rawBaseVal;

                            const isCartao = enrollFormaPagamento === 'cartao';
                            const isHibrido = enrollFormaPagamento === 'hibrido';
                            
                            let perMonth = 0;
                            let totalForN = 0;
                            
                            if (isCartao) {
                              const multiplier = getCreditCardInterestMultiplier(n);
                              perMonth = Math.ceil(((baseValForN * multiplier) / n) * 100) / 100;
                              totalForN = perMonth * n;
                            } else if (isHibrido) {
                              const partVista = baseValForN / 2;
                              const partCartaoUnrounded = baseValForN / 2;
                              const multiplier = getCreditCardInterestMultiplier(n);
                              const partCartaoMonthly = Math.ceil(((partCartaoUnrounded * multiplier) / n) * 100) / 100;
                              perMonth = partCartaoMonthly;
                              totalForN = partVista + (partCartaoMonthly * n);
                            } else {
                              perMonth = Math.ceil((baseValForN / (enrollFormaPagamento === 'vista' ? 1 : n)) * 100) / 100;
                              totalForN = perMonth * (enrollFormaPagamento === 'vista' ? 1 : n);
                            }

                            if (n === 1) {
                              return (
                                <option key={n} value={1}>
                                  À vista — 1x de {totalForN.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </option>
                              );
                            }
                            return (
                              <option key={n} value={n}>
                                {n} Parcelas Mensais — {enrollFormaPagamento === 'hibrido' ? `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + Entrada` : `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                              </option>
                            );
                          })}
                        </select>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>

            {/* Coluna 2: Informativo & Envio */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4 font-sans">
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">
                  Adesão Inteligente Prática
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Ao realizar a auto-inscrição, o candidato adere à modalidade de poupança inteligente preventiva. 
                </p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Todos os dados informados estarão imediatamente cadastrados e disponíveis na aba de gestão para que os administradores acompanhem o progresso.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#0c2340] hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md font-sans"
                >
                  <span>✍️</span> Enviar Minha Inscrição & Obtude Acesso
                </button>
              </div>
            </div>

          </div>
        </form>
      )}

      {showCredentialsModal && enrollCreatedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl text-slate-100 overflow-hidden shadow-2xl max-w-lg w-full p-6 relative space-y-5 animate-in zoom-in-95 duration-300">
            
            <button 
              id="dismiss-credentials-modal-btn"
              className="absolute top-4 right-4 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/50 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              onClick={handleCloseAndRedirectWithSafeScroll}
              type="button"
            >
              ✕ Fechar
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl mb-1 animate-bounce">
                ✨
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Inscrição Realizada com Sucesso!</h3>
              <p className="text-xs text-slate-400">
                Suas credenciais de acesso ao smartphone virtual foram geradas:
              </p>
            </div>

            {/* Visual Credentials Container - High contrast, extremely readable */}
            <div className="space-y-3 bg-slate-950/95 p-4 rounded-2xl border border-slate-800">
              
              {/* LOGIN ID */}
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest font-mono block">
                  🔑 ID DE ACESSO (LOGIN)
                </span>
                <div className="flex items-center justify-between bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-black text-emerald-400 font-mono tracking-wider">
                    {enrollCreatedCard.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(enrollCreatedCard.id);
                      setToastMessage("📋 ID de Acesso copiado!");
                    }}
                    className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg transition-all transform active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest font-mono block">
                  🔒 SENHA DE ACESSO
                </span>
                <div className="flex items-center justify-between bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-black text-amber-400 font-mono tracking-wider">
                    {enrollCreatedCard.senha}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(enrollCreatedCard.senha);
                      setToastMessage("🔑 Senha de Acesso copiada!");
                    }}
                    className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg transition-all transform active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
              </div>
              
            </div>

            {/* Instructional Help Note */}
            <div className="bg-indigo-950/40 border border-indigo-900/30 p-3 rounded-xl text-center">
              <p className="text-[10.5px] text-indigo-200 leading-normal">
                💡 <strong>Como usar?</strong> Faça o download do seu contrato oficial abaixo e depois utilize o ID e senha gerados para entrar no dispositivo virtual simulador!
              </p>
            </div>

            {/* Buttons: Enviar e Baixar Contrato and Close */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleDownloadPDF();
                }}
                disabled={isDownloadingPdf}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-700 disabled:to-slate-800 text-slate-950 font-black py-3.5 px-4 rounded-xl text-xs md:text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer uppercase tracking-wider animate-pulse"
              >
                {isDownloadingPdf ? (
                  <>⏳ Preparando PDF...</>
                ) : (
                  <>📥 Enviar e Baixar Contrato</>
                )}
              </button>

              <button
                type="button"
                onClick={handleCloseAndRedirectWithSafeScroll}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 uppercase"
              >
                <span>📱</span> Fechar e Ir para o Smartphone Digital
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

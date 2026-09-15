export interface ReciboQuitacao {
  id: string;
  dataEmissao: string;
  valor: number;
  status: 'pendente_assinatura' | 'assinado_gov';
  dataAssinatura?: string;
  identificadorGov?: string;
  documentoAssinado?: string;
}

export interface Instrutor {
  id?: string;
  nome: string;
  regiao: string;
  vagas: number;
  whatsapp: string;
  endereco?: string;
  credencialSenatran?: string;
  foto?: string;
  login?: string;
  senha?: string;
  tempoExperiencia?: string;
  historia?: string;
  saldoPago?: number;
  recibos?: ReciboQuitacao[];
  chavePix?: string;
}

export interface BaixaPagamento {
  id: string;
  data: string;
  valor: number;
  formaPagamento: string;
  parcelasBaixadas: number;
  observacao?: string;
  operador?: string;
  nsuComprovante?: string;
}

export interface Comprovante {
  id: string;
  nomeArquivo: string;
  conteudo: string;
  dataEnvio: string;
  valor: number;
  validado: boolean;
  observacao?: string;
}

export type EtapaCrm = 'novo_lead' | 'em_atendimento' | 'proposta_enviada' | 'negociacao' | 'ganho' | 'perdido';

export type TemperaturaLead = 'quente' | 'morno' | 'frio';

export interface NotaCrm {
  id: string;
  data: string;
  texto: string;
  autor?: string;
}

export interface CompraAulasExtras {
  id: string;
  data: string;
  quantidadeAulas: number;
  tipo: 'carro' | 'moto' | 'ambos';
  aulasCarro?: number;
  aulasMoto?: number;
  valorBase: number;
  valorTotal: number;
  valorInstrutor?: number;
  valorAutoescola?: number;
  formaPagamento: 'pix' | 'cartao';
  parcelasCartao?: number;
  detalhes?: string;
  status?: 'pago';
}

export interface Aluno {
  id: string;
  nome: string;
  dob?: string;
  whatsapp: string;
  telefone?: string;
  dataCadastro?: string;
  servico?: string;
  valorPago?: number;
  whatsappResponsavel?: string;
  categoria: string;
  instrutor: string;
  dataAdesao: string;
  parcelasPagas: number;
  valorTotal: number;
  valorContratoBase?: number;
  aulasBase?: number;
  aulasExtras?: number;
  valorAulasExtras?: number;
  comprasAulasExtras?: CompraAulasExtras[];
  pontosSimulado?: number;
  senha?: string;
  endereco?: string;
  tipoPlano?: string;
  cpf?: string;
  cpfResponsavel?: string;
  nomeResponsavel?: string;
  rgResponsavel?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  rg?: string;
  aulas?: number;
  parcelasTotal?: number;
  formaPagamento?: 'poupanca' | 'cartao' | 'vista' | 'hibrido';
  comprovantes?: Comprovante[];
  baixasPagamento?: BaixaPagamento[];
  updatedAt?: string;
  // CRM Kanban fields
  etapaCrm?: EtapaCrm;
  temperatura?: TemperaturaLead;
  origemLead?: string;
  observacoesCrm?: string;
  notasCrm?: NotaCrm[];
  dataUltimoContato?: string;
  [key: string]: any;
}

export interface Depoimento {
  id: string;
  nome: string;
  cidade?: string;
  categoria?: string;
  avaliacao: number;
  comentario: string;
  data: string;
  foto?: string;
  aprovado: boolean;
  origem?: string;
}

/**
 * Retorna se um candidato é considerado oficialmente matriculado
 * (i.e. possui contrato CNH, matrícula ativa ou está no programa)
 * Leads de prospecção sem matrícula, leads com valor zerado/não negociado ou explicitamente 'perdido' são excluídos.
 */
export const isAlunoMatriculado = (aluno?: Aluno | null): boolean => {
  if (!aluno) return false;
  // Se foi explicitamente cancelado ou perdido
  if (aluno.etapaCrm === 'perdido') {
    return false;
  }
  // Se foi gerado apenas como lead de prospecção (LEAD-) e ainda não foi convertido
  if (aluno.id && aluno.id.startsWith('LEAD-') && aluno.etapaCrm !== 'ganho') {
    return false;
  }
  // Candidatos registrados no funil que ainda estão como novo lead sem parcelas pagas
  if (aluno.etapaCrm === 'novo_lead' && (aluno.parcelasPagas || 0) === 0) {
    return false;
  }
  // Qualquer candidato com registro de matrícula, adesão ou ID CNH é contabilizado
  return true;
};


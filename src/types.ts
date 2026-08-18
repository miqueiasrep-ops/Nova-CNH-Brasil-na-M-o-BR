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


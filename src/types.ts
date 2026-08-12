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
  dob: string;
  whatsapp: string;
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


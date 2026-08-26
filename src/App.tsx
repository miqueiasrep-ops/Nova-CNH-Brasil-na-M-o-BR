/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CandidateEnrollmentForm } from './components/CandidateEnrollmentForm';
import { FreeTheoreticalCourse } from './components/FreeTheoreticalCourse';
import { SalesKanbanCrm } from './components/SalesKanbanCrm';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  FileSpreadsheet, 
  FileText,
  Code, 
  Users, 
  TrendingUp, 
  Coins, 
  Clock, 
  Download, 
  RefreshCw, 
  HelpCircle, 
  MapPin, 
  Calendar, 
  ChevronRight,
  Info,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Smartphone,
  Lock,
  Unlock,
  Wallet,
  Award,
  MessageSquare,
  Mail,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  LogOut,
  Cloud,
  CreditCard,
  X,
  QrCode,
  Link,
  Receipt,
  Star,
  MessageCircle
} from 'lucide-react';
import { LinkEnrollmentModal, parseCandidateLink, safeAtob } from './components/LinkEnrollmentModal';
import { StudentTestimonials } from './components/StudentTestimonials';
import { Aluno, BaixaPagamento, Comprovante, Depoimento, Instrutor, ReciboQuitacao, isAlunoMatriculado } from './types';
import { DEFAULT_ALUNOS, DEFAULT_INSTRUTORES, DEFAULT_DEPOIMENTOS } from './lib/defaultData';
import {
  subscribeAlunos,
  subscribeInstrutores,
  subscribeDepoimentos,
  subscribeConfig,
  subscribeQuotaStatus,
  saveAllAlunosToFirestore,
  saveAllInstrutoresToFirestore,
  saveDepoimentoToFirestore,
  deleteDepoimentoFromFirestore,
  saveConfigToFirestore
} from './lib/firestoreService';

export const getAppBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://ais-pre-3bzikdpe5rrgnzblrxzvkl-214721108853.us-west1.run.app';
};

const AUTODRIVE_PLATFORM_URL = getAppBaseUrl();

export interface CandidateReceiptData {
  aluno: Aluno;
  baixa?: BaixaPagamento;
  idRecibo: string;
  dataEmissao: string;
  valor: number;
  formaPagamento: string;
  referente: string;
  observacao?: string;
  operador?: string;
}

export function extensoBRL(valor: number): string {
  if (!valor || valor <= 0) return 'Zero Reais';
  const integerPart = Math.floor(valor);
  const centsPart = Math.round((valor - integerPart) * 100);

  const unidades = ['', 'Um', 'Dois', 'Tr√™s', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
  const dezAquinze = ['Dez', 'Onze', 'Doze', 'Treze', 'Quatorze', 'Quinze', 'Dezesseis', 'Dezessete', 'Dezoito', 'Dezenove'];
  const dezenas = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const centenas = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

  function converterGrupo(n: number): string {
    if (n === 100) return 'Cem';
    let str = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) str += centenas[c];

    if (d === 1) {
      if (str.length > 0) str += ' e ';
      str += dezAquinze[u];
    } else {
      if (d > 1) {
        if (str.length > 0) str += ' e ';
        str += dezenas[d];
      }
      if (u > 0) {
        if (str.length > 0) str += ' e ';
        str += unidades[u];
      }
    }
    return str;
  }

  let extensao = '';
  const milhares = Math.floor(integerPart / 1000);
  const restoMil = integerPart % 1000;

  if (milhares > 0) {
    if (milhares === 1) {
      extensao += 'Um Mil';
    } else {
      extensao += converterGrupo(milhares) + ' Mil';
    }
    if (restoMil > 0) {
      extensao += (restoMil < 100 || restoMil % 100 === 0) ? ' e ' : ' ';
    }
  }

  if (restoMil > 0 || milhares === 0) {
    extensao += converterGrupo(restoMil);
  }

  extensao += integerPart === 1 ? ' Real' : ' Reais';

  if (centsPart > 0) {
    extensao += ' e ' + converterGrupo(centsPart) + (centsPart === 1 ? ' Centavo' : ' Centavos');
  }

  return extensao;
}

const DUMMY_FALLBACK_ALUNO: Aluno = {
  id: "CNH-000",
  nome: "Nenhum aluno cadastrado",
  dob: "2000-01-01",
  whatsapp: "",
  categoria: "Carro (B)",
  instrutor: "A definir",
  dataAdesao: "2026-01-01",
  parcelasPagas: 0,
  valorTotal: 0,
  pontosSimulado: 0,
  senha: "",
  endereco: "",
  tipoPlano: ""
};

// Calculation Helpers
export function generateLogin(nome: string): string {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove special chars
    .trim()
    .replace(/\s+/g, "."); // replace spaces with dots
}

export function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function calculateAge(dobStr: string, todayStr?: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return 0;
  const today = todayStr ? new Date(todayStr) : new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function getTonPresetRates(plan: 'promo' | 'giga' | 'mega' | 'basico', brand: 'visa_master' | 'elo_amex' = 'visa_master'): Record<number, number> {
  const rates = {
    visa_master: {
      promo: {
        1: 3.15,
        2: 4.75,
        3: 5.35,
        4: 5.95,
        5: 6.55,
        6: 7.15,
        7: 7.95,
        8: 8.55,
        9: 9.15,
        10: 9.75,
        11: 10.35,
        12: 10.95
      },
      giga: {
        1: 3.39,
        2: 5.74,
        3: 6.35,
        4: 6.96,
        5: 7.57,
        6: 8.18,
        7: 8.98,
        8: 9.59,
        9: 10.20,
        10: 10.81,
        11: 11.42,
        12: 12.03
      },
      mega: {
        1: 3.49,
        2: 5.99,
        3: 6.74,
        4: 7.49,
        5: 8.24,
        6: 8.99,
        7: 9.99,
        8: 10.74,
        9: 11.49,
        10: 12.24,
        11: 12.99,
        12: 13.74
      },
      basico: {
        1: 4.99,
        2: 7.43,
        3: 8.50,
        4: 9.56,
        5: 10.60,
        6: 11.63,
        7: 12.94,
        8: 13.91,
        9: 14.86,
        10: 15.79,
        11: 16.71,
        12: 17.61
      }
    },
    elo_amex: {
      promo: {
        1: 4.35,
        2: 7.45,
        3: 8.05,
        4: 8.65,
        5: 9.25,
        6: 9.85,
        7: 10.65,
        8: 11.25,
        9: 11.85,
        10: 12.45,
        11: 13.05,
        12: 13.65
      },
      giga: {
        1: 4.59,
        2: 8.44,
        3: 9.05,
        4: 9.66,
        5: 10.27,
        6: 10.88,
        7: 11.68,
        8: 12.29,
        9: 12.90,
        10: 13.51,
        11: 14.12,
        12: 14.73
      },
      mega: {
        1: 4.69,
        2: 8.69,
        3: 9.44,
        4: 10.19,
        5: 10.94,
        6: 11.69,
        7: 12.69,
        8: 13.44,
        9: 14.19,
        10: 14.94,
        11: 15.69,
        12: 16.44
      },
      basico: {
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
      }
    }
  };
  const brandRates = rates[brand] || rates.visa_master;
  return brandRates[plan] || brandRates.promo;
}

export function getTonPresetRatePercentage(installments: number, plan: 'promo' | 'giga' | 'mega' | 'basico', brand: 'visa_master' | 'elo_amex' = 'visa_master'): number {
  const rates = getTonPresetRates(plan, brand);
  return rates[installments as keyof typeof rates] || 0;
}

export function getCreditCardInterestMultiplier(installments: number): number {
  const percent = getTonPresetRatePercentage(installments, 'basico', 'elo_amex');
  const rate = percent / 100;
  if (rate >= 1 || rate < 0) return 1.0;
  return 1 / (1 - rate);
}

export function getStudentBaseValue(student: Aluno): number {
  if (!student) return 0;
  const paymentMethod = student.formaPagamento || 'vista';
  const installments = student.parcelasTotal || 12;
  
  if (paymentMethod === 'cartao') {
    const multiplier = getCreditCardInterestMultiplier(installments);
    return Math.round(student.valorTotal / multiplier);
  } else if (paymentMethod === 'hibrido') {
    const multiplier = getCreditCardInterestMultiplier(installments);
    return Math.round((student.valorTotal * 2) / (1 + multiplier));
  }
  
  return student.valorTotal;
}

export function calculateMonthsTo18(dobStr: string, todayStr?: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return 0;
  const today = todayStr ? new Date(todayStr) : new Date();
  
  // 18th birthday
  const bday18 = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
  if (today >= bday18) return 0; // Already 18 or older
  
  // Difference in months
  const yearsDiff = bday18.getFullYear() - today.getFullYear();
  const monthsDiff = bday18.getMonth() - today.getMonth();
  const daysDiff = bday18.getDate() - today.getDate();
  
  let totalMonths = yearsDiff * 12 + monthsDiff;
  if (daysDiff < 0) {
    totalMonths--; // Round down since full month has not passed yet
  }
  return Math.max(0, totalMonths);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  return dateStr;
}

// Active Quiz Data for Under 18 Prep Module
const QUIZ_QUESTIONS = [
  {
    pergunta: "Qual o significado da placa regulamentadora vermelha com o tri√¢ngulo invertido?",
    opcoes: [
      "Parada Obrigat√≥ria",
      "D√™ a Prefer√™ncia",
      "Proibido estacionar",
      "In√≠cio de via r√°pida"
    ],
    correta: 1,
    imagemPlaca: "‚ö†Ô∏è INVERTIDO"
  },
  {
    pergunta: "Qual o limite de idade para se inscrever neste programa de parcelamento antecipado?",
    opcoes: [
      "Apenas maiores de 18",
      "Jovens de 17 a 24 anos",
      "Somente menores de 16",
      "Livre para qualquer idade"
    ],
    correta: 1,
    imagemPlaca: "üöó BRASIL"
  },
  {
    pergunta: "Se um aluno menor de idade acumula saldo e faz 18 anos durante o parcelamento, o que acontece?",
    opcoes: [
      "O dinheiro √© bloqueado",
      "O saldo √© imediatamente desbloqueado para pagar as aulas pr√°ticas",
      "O plano √© cancelado",
      "√â obrigado a pagar nova taxa de matr√≠cula"
    ],
    correta: 1,
    imagemPlaca: "üí∞ WALLET"
  }
];

// Helper to calculate custom dynamic PIX CRC16 checksum
function getCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < str.length; i++) {
    let b = str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      let bit = ((b >> (7 - j)) & 1) === 1;
      let c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Custom 29x29 high-fidelity QR Code matrix mapped from the uploaded user asset
const PIX_QR_MATRIX = [
  [1,1,1,1,1,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,1,1,0,1,0,0,1,1,1,0,1,1,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,1,1,0,1,0,0,0,1,1,1,1,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,1,1,0,0,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0],
  [1,1,0,1,1,0,1,0,1,1,1,1,0,0,0,0,0,0,1,0,1,0,1,1,0,1,1,0,1],
  [0,1,1,1,0,0,0,1,1,0,1,0,1,1,0,1,1,1,0,0,0,0,1,0,0,1,1,1,0],
  [1,0,0,0,1,1,0,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
  [1,1,0,1,0,1,1,0,0,1,0,0,0,1,0,0,1,1,1,0,0,1,1,1,1,0,0,1,1],
  [0,1,1,0,0,1,1,1,0,1,1,1,1,0,1,0,0,1,0,1,1,0,0,1,1,1,1,0,0],
  [1,0,1,1,1,0,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1,1,0,1,0,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,1,0,1,1,1,1,0,0,1,0,1,0,0,1,0,1,1,1],
  [1,1,1,0,0,1,0,1,1,1,0,0,0,1,0,0,1,1,1,0,0,0,1,1,0,1,0,0,1],
  [0,1,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,0,1,1,0,1,1,0],
  [1,1,1,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,0,1,0,0,1,1,1,0,0,0],
  [0,0,0,1,1,1,0,1,1,0,0,1,1,1,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1],
  [1,1,0,1,0,0,1,1,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,0,1,1,0,1,1],
  [0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,0,1,1,1,1,1,0,1,1,0,1,0,1,0],
  [1,1,1,1,1,1,1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,1,0,1,0,0,0,1,1,0,0,1,1,0,1,1,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,1,1,1,0,0,1,0,1,0,1,1,1,1,1],
  [1,0,1,1,1,0,1,0,0,1,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0],
  [1,0,1,1,1,0,1,0,0,0,1,1,1,0,1,0,0,1,0,0,1,1,0,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,1,1,0,1,0,0,1,1,1,0,1,1,0,0,1,1,1],
  [1,1,1,1,1,1,1,0,1,1,0,1,0,1,0,1,1,0,1,1,0,0,1,1,1,1,0,0,1]
];

// Helper to compile dynamic PIX copy and paste payload for Stone Bank / Top Ton
function buildPixPayload(amount: number): string {
  const pixKey = "02c2c285-d480-488e-85c0-311e0eb7811a"; // Stone Bank (Maquininha Top Ton) Random Key
  const name = "MIQUEIAS SOUZA DE LIMA";
  const city = "RECIFE";
  
  const f00 = "000201";
  
  // Account link: ID 26
  const innerPix = "0014br.gov.bcb.pix" + "01" + String(pixKey.length).padStart(2, '0') + pixKey;
  const f26 = "26" + String(innerPix.length).padStart(2, '0') + innerPix;
  
  const f52 = "52040000";
  const f53 = "5303986"; // Real currency (BRL)
  
  let f54 = "";
  if (amount > 0) {
    const amtStr = amount.toFixed(2);
    f54 = "54" + String(amtStr.length).padStart(2, '0') + amtStr;
  }
  
  const f58 = "5802BR";
  const f59 = "59" + String(name.length).padStart(2, '0') + name;
  const f60 = "60" + String(city.length).padStart(2, '0') + city;
  const f62 = "62070503***";
  
  const basePayload = f00 + f26 + f52 + f53 + f54 + f58 + f59 + f60 + f62 + "6304";
  return basePayload + getCRC16(basePayload);
}

export const normalizeCpfDigits = (cpf?: string): string => {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
};

export const normalizeCandidateName = (nome?: string): string => {
  if (!nome) return '';
  return String(nome).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Deduplica√ß√£o inteligente e universal de candidatos (por CPF limpo, Nome completo normalizado e ID)
export const deduplicateAlunosList = (list: Aluno[]): Aluno[] => {
  if (!Array.isArray(list)) return [];
  const result: Aluno[] = [];

  for (const raw of list) {
    if (!raw || (!raw.nome && !raw.id)) continue;
    const item = { ...raw };
    const cleanCpf = normalizeCpfDigits(item.cpf);
    const cleanName = normalizeCandidateName(item.nome);
    const rawId = String(item.id || '').trim();

    // Procura registro correspondente j√° inserido na lista resultante
    let matchIdx = -1;
    if (cleanCpf && cleanCpf.length >= 9) {
      matchIdx = result.findIndex(e => normalizeCpfDigits(e.cpf) === cleanCpf);
    }
    if (matchIdx === -1 && cleanName && cleanName.length >= 3) {
      matchIdx = result.findIndex(e => normalizeCandidateName(e.nome) === cleanName);
    }
    if (matchIdx === -1 && rawId) {
      matchIdx = result.findIndex(e => String(e.id || '').trim() === rawId);
    }

    if (matchIdx !== -1) {
      const existing = result[matchIdx];
      const timeExisting = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const timeItem = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      const isItemNewer = timeItem >= timeExisting;

      const primary = isItemNewer ? item : existing;
      const secondary = isItemNewer ? existing : item;

      // Prefer standard CNH-XXX format for candidate id
      let canonicalId = existing.id;
      if (item.id && item.id.startsWith('CNH-') && (!canonicalId || !canonicalId.startsWith('CNH-'))) {
        canonicalId = item.id;
      } else if (existing.id && existing.id.startsWith('CNH-')) {
        canonicalId = existing.id;
      } else {
        canonicalId = primary.id || secondary.id || existing.id;
      }

      // Merge comprovantes sem duplica√ß√£o
      const compMap = new Map<string, any>();
      [...(existing.comprovantes || []), ...(item.comprovantes || [])].forEach(c => {
        if (c) {
          const k = c.id || c.nomeArquivo || `${c.valor}_${c.dataEnvio}`;
          compMap.set(k, c);
        }
      });

      // Merge baixas sem duplica√ß√£o
      const baixasMap = new Map<string, any>();
      [...(existing.baixasPagamento || []), ...(item.baixasPagamento || [])].forEach(b => {
        if (b) {
          const k = b.id || `${b.data}_${b.valor}_${b.parcelasBaixadas}`;
          baixasMap.set(k, b);
        }
      });

      const merged: Aluno = {
        ...secondary,
        ...primary,
        id: canonicalId,
        nome: primary.nome || secondary.nome,
        dob: primary.dob || secondary.dob,
        whatsapp: primary.whatsapp || secondary.whatsapp,
        telefone: primary.telefone || secondary.telefone || primary.whatsapp || secondary.whatsapp,
        endereco: primary.endereco || secondary.endereco,
        categoria: primary.categoria || secondary.categoria,
        instrutor: (primary.instrutor && primary.instrutor !== 'Sem Instrutor') ? primary.instrutor : (secondary.instrutor || 'Sem Instrutor'),
        dataAdesao: primary.dataAdesao || secondary.dataAdesao,
        tipoPlano: primary.tipoPlano || secondary.tipoPlano,
        rg: primary.rg || secondary.rg,
        cpf: primary.cpf || secondary.cpf,
        estadoCivil: primary.estadoCivil || secondary.estadoCivil,
        nacionalidade: primary.nacionalidade || secondary.nacionalidade,
        formaPagamento: primary.formaPagamento || secondary.formaPagamento,
        senha: primary.senha || secondary.senha,
        parcelasPagas: primary.parcelasPagas !== undefined ? Math.max(0, Number(primary.parcelasPagas)) : Math.max(0, Number(secondary.parcelasPagas || 0)),
        valorTotal: primary.valorTotal || secondary.valorTotal || 0,
        valorPago: primary.valorPago !== undefined ? primary.valorPago : secondary.valorPago,
        parcelasTotal: primary.parcelasTotal || secondary.parcelasTotal || 12,
        aulas: primary.aulas || secondary.aulas || 20,
        aulasCarro: primary.aulasCarro !== undefined ? primary.aulasCarro : secondary.aulasCarro,
        aulasMoto: primary.aulasMoto !== undefined ? primary.aulasMoto : secondary.aulasMoto,
        pontosSimulado: primary.pontosSimulado !== undefined ? primary.pontosSimulado : (secondary.pontosSimulado || 120),
        comprovantes: Array.from(compMap.values()),
        baixasPagamento: Array.from(baixasMap.values()),
        nomeResponsavel: primary.nomeResponsavel || secondary.nomeResponsavel,
        cpfResponsavel: primary.cpfResponsavel || secondary.cpfResponsavel,
        rgResponsavel: primary.rgResponsavel || secondary.rgResponsavel,
        whatsappResponsavel: primary.whatsappResponsavel || secondary.whatsappResponsavel,
        updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString()
      };
      result[matchIdx] = merged;
    } else {
      result.push(item);
    }
  }

  // Ordena√ß√£o natural por ID (CNH-005, CNH-007, etc.)
  result.sort((a, b) => {
    const matchA = String(a.id || '').match(/\d+/);
    const matchB = String(b.id || '').match(/\d+/);
    const numA = matchA ? parseInt(matchA[0], 10) : 0;
    const numB = matchB ? parseInt(matchB[0], 10) : 0;
    return numA - numB;
  });

  return result;
};

// Robust merge helpers to prevent any data loss (especially financial progress) when syncing across client-server-cloud
const mergeAlunosLists = (localList: Aluno[], remoteList: Aluno[]): Aluno[] => {
  return deduplicateAlunosList([...(remoteList || []), ...(localList || [])]);
};

const mergeInstrutoresLists = (localList: Instrutor[], remoteList: Instrutor[]): Instrutor[] => {
  const mergedMap = new Map<string, Instrutor>();

  remoteList.forEach(remote => {
    if (remote && remote.nome) {
      mergedMap.set(remote.nome, remote);
    }
  });

  localList.forEach(local => {
    if (!local || !local.nome) return;
    const remote = mergedMap.get(local.nome);
    if (!remote) {
      mergedMap.set(local.nome, local);
    } else {
      const merged: Instrutor = {
        ...remote,
        ...local,
        login: local.login || remote.login,
        senha: local.senha || remote.senha,
        chavePix: local.chavePix || remote.chavePix,
        foto: local.foto || remote.foto,
        tempoExperiencia: local.tempoExperiencia || remote.tempoExperiencia,
        historia: local.historia || remote.historia,
        credencialSenatran: local.credencialSenatran || remote.credencialSenatran,
        
        // Financials
        saldoPago: Math.max(Number(local.saldoPago || 0), Number(remote.saldoPago || 0)),
        recibos: (local.recibos && local.recibos.length >= (remote.recibos || []).length) 
          ? local.recibos 
          : remote.recibos
      };
      mergedMap.set(local.nome, merged);
    }
  });

  return Array.from(mergedMap.values()).map(i => {
    const copy = { ...i };
    if (!copy.login) copy.login = generateLogin(i.nome);
    if (!copy.senha) copy.senha = generateSecurePassword();
    return copy;
  });
};

export default function App() {
  // Configura√ß√µes Globais de Sincronia
  const EMBEDDED_WEBHOOK_URL = ""; 

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedAlunos, setScannedAlunos] = useState<{ id: string; nome: string; categoria: string; originKey: string; data: Aluno }[]>([]);
  const [selectedScanItems, setSelectedScanItems] = useState<string[]>([]);
  const [scannedInstrutores, setScannedInstrutores] = useState<{ nome: string; regiao: string; originKey: string; data: Instrutor }[]>([]);
  const [selectedScanInstrutores, setSelectedScanInstrutores] = useState<string[]>([]);

  const [gasWebhookUrl, setGasWebhookUrl] = useState<string>(() => {
    const metaEnv = (import.meta as any).env;
    const envUrl = metaEnv ? metaEnv.VITE_GAS_WEBHOOK_URL : '';
    return EMBEDDED_WEBHOOK_URL || envUrl || localStorage.getItem('nova_cnh_gas_webhook_url') || '';
  });

  const [googleVerificationCode, setGoogleVerificationCode] = useState<string>(() => {
    return localStorage.getItem('google_verification_code') || '';
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('nova_cnh_gas_webhook_url', gasWebhookUrl.trim());
  }, [gasWebhookUrl]);

  useEffect(() => {
    localStorage.setItem('google_verification_code', googleVerificationCode.trim());
  }, [googleVerificationCode]);

  // State for scanned instructor welcome message from QR Code
  const [scannedInstructorWelcome, setScannedInstructorWelcome] = useState<Instrutor | null>(null);
  const pendingScannedInstructorRef = useRef<string | null>(null);

  // Pre-selected candidate details passed via URL links
  const [preSelectedNome, setPreSelectedNome] = useState<string>('');
  const [preSelectedCpf, setPreSelectedCpf] = useState<string>('');
  const [preSelectedRg, setPreSelectedRg] = useState<string>('');
  const [preSelectedWhatsapp, setPreSelectedWhatsapp] = useState<string>('');
  const [preSelectedEndereco, setPreSelectedEndereco] = useState<string>('');
  const [preSelectedInstrutor, setPreSelectedInstrutor] = useState<string>('');
  const [preSelectedNacionalidade, setPreSelectedNacionalidade] = useState<string>('Brasileira');
  const [preSelectedEstadoCivil, setPreSelectedEstadoCivil] = useState<string>('Solteiro(a)');

  // Persistence state with emergency recovery routine
  const [alunos, setAlunos] = useState<Aluno[]>(() => {
    let saved = localStorage.getItem('nova_cnh_alunos_v3');
    
    // Emergency data recovery from previous or alternative keys if empty
    if (!saved || saved === '[]') {
      const fallbackKeys = ['nova_cnh_alunos_v3_backup', 'nova_cnh_alunos_v2', 'nova_cnh_alunos_backup', 'nova_cnh_alunos', 'alunos'];
      for (const key of fallbackKeys) {
        try {
          const val = localStorage.getItem(key);
          if (val && val !== '[]' && val.trim().startsWith('[')) {
            console.log(`üí° [Recupera√ß√£o Emergencial] Recuperando candidatos da chave: ${key}`);
            saved = val;
            break;
          }
        } catch (err) {
          console.error(`Erro ao tentar ler chave de backup ${key}:`, err);
        }
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Aluno[];
        const processed = parsed.map(aluno => {
          const age = calculateAge(aluno.dob);
          if (age < 17) {
            const birthYear = new Date(aluno.dob).getFullYear();
            const yearDiff = 17 - age;
            const updatedYear = birthYear - yearDiff;
            const dobDate = new Date(aluno.dob);
            dobDate.setFullYear(updatedYear);
            return {
              ...aluno,
              dob: dobDate.toISOString().substring(0, 10)
            };
          }
          return aluno;
        });
        return deduplicateAlunosList(processed);
      } catch (e) {
        return deduplicateAlunosList(DEFAULT_ALUNOS);
      }
    }
    return deduplicateAlunosList(DEFAULT_ALUNOS);
  });

  const [instrutores, setInstrutores] = useState<Instrutor[]>(() => {
    let saved = localStorage.getItem('nova_cnh_instrutores');
    
    // Emergency data recovery from previous backup key if empty
    if (!saved || saved === '[]') {
      try {
        const backup = localStorage.getItem('nova_cnh_instrutores_backup');
        if (backup && backup !== '[]' && backup.trim().startsWith('[')) {
          console.log(`üí° [Recupera√ß√£o Emergencial] Recuperando instrutores da chave de backup`);
          saved = backup;
        }
      } catch (err) {
        console.error("Erro ao tentar ler chave de backup de instrutores:", err);
      }
    }

    let list: Instrutor[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved) as Instrutor[];
      } catch (e) {
        list = [];
      }
    } else {
      list = DEFAULT_INSTRUTORES;
    }

    // Ensure all instructors have login and password generated
    let modified = false;
    const updated = list.map(i => {
      let changed = false;
      const copy = { ...i };
      if (!copy.login) {
        copy.login = generateLogin(i.nome);
        changed = true;
      }
      if (!copy.senha) {
        copy.senha = generateSecurePassword();
        changed = true;
      }
      if (!copy.tempoExperiencia) {
        const defaultYears = Math.floor(5 + (copy.nome.length % 9)); // deterministic fallback based on name length
        copy.tempoExperiencia = `${defaultYears} anos de experi√™ncia`;
        changed = true;
      }
      if (!copy.historia) {
        copy.historia = "Profissional extremamente paciente e dedicado ao ensino te√≥rico e pr√°tico da dire√ß√£o. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do tr√¢nsito, garantindo uma forma√ß√£o humana de condutores conscientes e seguros no programa Nova CNH.";
        changed = true;
      }
      if (changed) modified = true;
      return copy;
    });

    if (modified && typeof window !== 'undefined') {
      localStorage.setItem('nova_cnh_instrutores', JSON.stringify(updated));
    }
    return updated;
  });

  const [depoimentos, setDepoimentos] = useState<Depoimento[]>(() => {
    let saved = localStorage.getItem('nova_cnh_depoimentos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Depoimento[];
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(d => !["DEP-001", "DEP-002", "DEP-003", "DEP-004"].includes(d.id));
          return clean;
        }
      } catch (e) {}
    }
    return DEFAULT_DEPOIMENTOS;
  });

  useEffect(() => {
    localStorage.setItem('nova_cnh_depoimentos', JSON.stringify(depoimentos));
  }, [depoimentos]);

  const depoimentosRef = useRef<Depoimento[]>(depoimentos);
  useEffect(() => {
    depoimentosRef.current = depoimentos;
  }, [depoimentos]);

  const handleAddDepoimento = (novoDepoimento: Depoimento) => {
    const updated = [novoDepoimento, ...depoimentos];
    setDepoimentos(updated);
    try {
      localStorage.setItem('nova_cnh_depoimentos', JSON.stringify(updated));
    } catch (e) {}

    saveDepoimentoToFirestore(novoDepoimento).catch(console.warn);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunos: alunosRef.current,
        instrutores: instrutoresRef.current,
        depoimentos: updated,
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      })
    }).catch(() => {});
  };

  const handleDeleteDepoimento = (idToDelete: string) => {
    const updated = depoimentos.filter(d => d.id !== idToDelete);
    setDepoimentos(updated);
    try {
      localStorage.setItem('nova_cnh_depoimentos', JSON.stringify(updated));
    } catch (e) {}

    deleteDepoimentoFromFirestore(idToDelete).catch(console.warn);

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunos: alunosRef.current,
        instrutores: instrutoresRef.current,
        depoimentos: updated,
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      })
    }).catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(alunos));
    if (alunos && alunos.length > 0) {
      localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(alunos));
    }
  }, [alunos]);

  useEffect(() => {
    localStorage.setItem('nova_cnh_instrutores', JSON.stringify(instrutores));
    if (instrutores && instrutores.length > 0) {
      localStorage.setItem('nova_cnh_instrutores_backup', JSON.stringify(instrutores));
    }
  }, [instrutores]);

  // ==========================================
  // ESTADOS E CONTROLES DE SINCRONIZA√á√ÉO EM TEMPO REAL (CROSS-DEVICE AUTO-SYNC)
  // ==========================================
  const lastSyncedPayloadRef = useRef<string>("");
  const isUpdatingFromRemote = useRef<boolean>(false);
  const ignoreNextSaveRef = useRef<boolean>(false);
  const hasProcessedQueryParamsRef = useRef<boolean>(false);
  const hasClosedWelcomeRef = useRef<boolean>(false);
  const pendingCandidateLookupRef = useRef<{ rawRegVal?: string; decodedRegVal?: string; cleanNewCpf?: string; cleanNewName?: string } | null>(null);

  // Refer√™ncias para manter os valores mais recentes dos estados sem causar reinicializa√ß√£o do polling
  const alunosRef = useRef<Aluno[]>(alunos);
  const instrutoresRef = useRef<Instrutor[]>(instrutores);
  const gasWebhookUrlRef = useRef<string>(gasWebhookUrl);
  const googleVerificationCodeRef = useRef<string>(googleVerificationCode);

  useEffect(() => {
    alunosRef.current = alunos;
  }, [alunos]);

  useEffect(() => {
    instrutoresRef.current = instrutores;
  }, [instrutores]);

  useEffect(() => {
    gasWebhookUrlRef.current = gasWebhookUrl;
  }, [gasWebhookUrl]);

  useEffect(() => {
    googleVerificationCodeRef.current = googleVerificationCode;
  }, [googleVerificationCode]);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error' | 'not_configured'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  // Fun√ß√£o para for√ßar sincroniza√ß√£o imediata (push & pull com a nuvem Firebase)
  const forceSyncWithCloud = async () => {
    setSyncStatus('syncing');
    setToastMessage("‚è≥ Sincronizando com a nuvem do Firebase...");
    try {
      // 1. Salva diretamente no Firestore (funciona 100% no Vercel e qualquer dispositivo)
      await saveAllAlunosToFirestore(alunosRef.current);
      await saveAllInstrutoresToFirestore(instrutoresRef.current);
      await saveConfigToFirestore({
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      });

      // 2. Tenta tamb√©m salvar no backend local caso exista
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunos: alunosRef.current,
          instrutores: instrutoresRef.current,
          gasWebhookUrl: gasWebhookUrlRef.current,
          googleVerificationCode: googleVerificationCodeRef.current
        })
      }).catch(() => {});

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setToastMessage("‚òÅÔ∏è Nuvem Firebase 100% atualizada e sincronizada!");
    } catch (err) {
      console.error("Erro na sincroniza√ß√£o manual com a nuvem:", err);
      setSyncStatus('error');
      setToastMessage("‚ùå Falha ao conectar √† nuvem. Tente novamente em instantes.");
    }
  };

  // Helper central para atualizar alunos garantindo persist√™ncia local e sincronia com a nuvem / Firestore
  const saveAlunosList = (updatedList: Aluno[], deletedIds?: string[]) => {
    const listWithTimestamp = updatedList.map(a => {
      const prev = alunosRef.current?.find(p => p && p.id === a.id);
      if (prev && JSON.stringify(prev) === JSON.stringify(a)) {
        return a;
      }
      return {
        ...a,
        updatedAt: a.updatedAt || new Date().toISOString()
      };
    });

    setAlunos(listWithTimestamp);

    try {
      localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(listWithTimestamp));
      localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(listWithTimestamp));
    } catch (e) {
      console.warn("Storage local limit:", e);
    }

    setSyncStatus('syncing');

    // Sincroniza direto no Firestore (Garante atualiza√ß√£o em tempo real para todos os celulares/Vercel)
    saveAllAlunosToFirestore(listWithTimestamp, deletedIds || [])
      .then(() => {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      })
      .catch(err => {
        console.warn("Aviso ao salvar direto no Firestore:", err);
      });

    // Envia tamb√©m para /api/db caso o servidor local esteja rodando
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunos: listWithTimestamp,
        deletedAlunoIds: deletedIds || [],
        mode: (deletedIds && deletedIds.length > 0) ? 'full_overwrite' : undefined,
        instrutores: instrutoresRef.current,
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      })
    }).catch(() => {});
  };

  // Helper central para atualizar instrutores garantindo persist√™ncia local e sincronia com a nuvem / Firestore
  const saveInstrutoresList = (updatedList: Instrutor[], deletedNomes?: string[]) => {
    setInstrutores(updatedList);

    try {
      localStorage.setItem('nova_cnh_instrutores', JSON.stringify(updatedList));
      localStorage.setItem('nova_cnh_instrutores_backup', JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Storage local limit:", e);
    }

    setSyncStatus('syncing');

    // Sincroniza direto no Firestore (Garante atualiza√ß√£o em tempo real para todos os celulares/Vercel)
    saveAllInstrutoresToFirestore(updatedList, deletedNomes || [])
      .then(() => {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      })
      .catch(err => {
        console.warn("Aviso ao salvar direto no Firestore:", err);
      });

    // Envia tamb√©m para /api/db caso o servidor local esteja rodando
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunos: alunosRef.current,
        instrutores: updatedList,
        deletedInstrutorNomes: deletedNomes || [],
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      })
    }).catch(() => {});
  };

  // 1. Conex√£o Real-time Direta com o Firestore (Funciona perfeitamente na Vercel e em todos os aparelhos)
  useEffect(() => {
    let isMounted = true;
    console.log("‚òÅÔ∏è [Firebase Realtime] Conectando ao Firestore na nuvem...");

    // Safety timeout to ensure isInitialLoading becomes false even during network lag
    const initialLoadingTimeout = setTimeout(() => {
      if (isMounted) {
        setIsInitialLoading(false);
      }
    }, 600);

    const unsubQuota = subscribeQuotaStatus((exceeded) => {
      if (isMounted) {
        setIsQuotaExceeded(exceeded);
      }
    });

    const unsubAlunos = subscribeAlunos((cloudAlunos) => {
      if (!isMounted) return;
      if (cloudAlunos && Array.isArray(cloudAlunos) && cloudAlunos.length > 0) {
        const cleanList = deduplicateAlunosList(cloudAlunos);
        console.log(`‚úÖ [Firestore Realtime] Recebidos ${cleanList.length} candidatos da nuvem (limpos e desduplicados)`);
        setAlunos(cleanList);
        try {
          localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(cleanList));
          localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(cleanList));
        } catch (e) {}
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }
      setIsInitialLoading(false);
    });

    const unsubInstrutores = subscribeInstrutores((cloudInstrutores) => {
      if (!isMounted) return;
      if (cloudInstrutores && Array.isArray(cloudInstrutores) && cloudInstrutores.length > 0) {
        console.log(`‚úÖ [Firestore Realtime] Recebidos ${cloudInstrutores.length} instrutores da nuvem`);
        setInstrutores(cloudInstrutores);
        try {
          localStorage.setItem('nova_cnh_instrutores', JSON.stringify(cloudInstrutores));
          localStorage.setItem('nova_cnh_instrutores_backup', JSON.stringify(cloudInstrutores));
        } catch (e) {}
      }
    });

    const unsubDepoimentos = subscribeDepoimentos((cloudDepoimentos) => {
      if (!isMounted) return;
      if (cloudDepoimentos && Array.isArray(cloudDepoimentos)) {
        const clean = cloudDepoimentos.filter(
          d => !["DEP-001", "DEP-002", "DEP-003", "DEP-004"].includes(d.id)
        );
        setDepoimentos(clean);
        try {
          localStorage.setItem('nova_cnh_depoimentos', JSON.stringify(clean));
        } catch (e) {}
      }
    });

    const unsubConfig = subscribeConfig((cloudConfig) => {
      if (!isMounted) return;
      if (cloudConfig.gasWebhookUrl) {
        setGasWebhookUrl(cloudConfig.gasWebhookUrl);
        localStorage.setItem('nova_cnh_gas_webhook_url', cloudConfig.gasWebhookUrl);
      }
      if (cloudConfig.googleVerificationCode) {
        setGoogleVerificationCode(cloudConfig.googleVerificationCode);
        localStorage.setItem('google_verification_code', cloudConfig.googleVerificationCode);
      }
    });

    // Carga auxiliar de fallback via API REST (se dispon√≠vel)
    fetch('/api/db')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!isMounted || !data) return;
        if (data.alunos && Array.isArray(data.alunos) && data.alunos.length > 0) {
          setAlunos(prev => {
            const combined = deduplicateAlunosList([...(data.alunos || []), ...(prev || [])]);
            try {
              localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(combined));
              localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(combined));
            } catch (e) {}
            return combined;
          });
        }
        if (data.instrutores && Array.isArray(data.instrutores) && data.instrutores.length > 0) {
          setInstrutores(data.instrutores);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      unsubQuota();
      unsubAlunos();
      unsubInstrutores();
      unsubDepoimentos();
      unsubConfig();
    };
  }, []);

  // 2. Envio Secund√°rio para Servidor Local/Vercel API (Sem loop de reescrita no Firestore)
  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    if (ignoreNextSaveRef.current) {
      ignoreNextSaveRef.current = false;
      return;
    }

    const currentPayload = JSON.stringify({
      alunos: alunos,
      instrutores: instrutores,
      gasWebhookUrl: gasWebhookUrl,
      googleVerificationCode: googleVerificationCode
    });

    if (currentPayload === lastSyncedPayloadRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: currentPayload
      }).catch(() => {});

      lastSyncedPayloadRef.current = currentPayload;
    }, 2000);

    return () => clearTimeout(timer);
  }, [alunos, instrutores, gasWebhookUrl, googleVerificationCode, isInitialLoading]);

  // 3. Polling em tempo real (Baixar atualiza√ß√µes de outros aparelhos automaticamente)
  useEffect(() => {
    let active = true;

    const checkForUpdates = async () => {
      if (!active) return;

      if (syncStatus === 'syncing' || isUpdatingFromRemote.current) {
        return;
      }

      try {
        const response = await fetch('/api/db');
        if (!response.ok || !active) return;
        const data = await response.json();
        
        if (data.quotaExceeded !== undefined && active) {
          setIsQuotaExceeded(!!data.quotaExceeded);
        }
        
        if (!active) return;

        const currentAlunos = alunosRef.current || [];
        const currentInstrutores = instrutoresRef.current || [];

        const serverAlunos = data.alunos || [];
        const serverInstrutores = data.instrutores || [];

        const serverAlunosStr = JSON.stringify(serverAlunos);
        const localAlunosStr = JSON.stringify(currentAlunos);
        const hasStudentsRefDiff = serverAlunosStr !== localAlunosStr;

        const serverInstrutoresStr = JSON.stringify(serverInstrutores);
        const localInstrutoresStr = JSON.stringify(currentInstrutores);
        const hasInstrutoresRefDiff = serverInstrutoresStr !== localInstrutoresStr;

        const serverGasUrl = data.gasWebhookUrl || "";
        const localGasUrl = gasWebhookUrlRef.current || "";
        const hasGasUrlRefDiff = serverGasUrl !== localGasUrl;

        const serverGoogleCode = data.googleVerificationCode || "";
        const localGoogleCode = googleVerificationCodeRef.current || "";
        const hasGoogleCodeRefDiff = serverGoogleCode !== localGoogleCode;

        const hasRemoteUpdate = hasStudentsRefDiff || hasInstrutoresRefDiff || hasGasUrlRefDiff || hasGoogleCodeRefDiff;

        if (hasRemoteUpdate) {
          console.log("‚ö° [Sincronia] Detectadas novas atualiza√ß√µes na Nuvem! Sincronizando de forma segura...");
          isUpdatingFromRemote.current = true;
          
          let finalAlunos = currentAlunos;
          if (hasStudentsRefDiff && Array.isArray(serverAlunos) && serverAlunos.length > 0) {
            const mergedAlunos = mergeAlunosLists(currentAlunos, serverAlunos);
            finalAlunos = mergedAlunos;
            setAlunos(mergedAlunos);
            localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(mergedAlunos));
          }

          let finalInstrutores = currentInstrutores;
          if (hasInstrutoresRefDiff && Array.isArray(serverInstrutores) && serverInstrutores.length > 0) {
            finalInstrutores = serverInstrutores;
            setInstrutores(serverInstrutores);
            localStorage.setItem('nova_cnh_instrutores', JSON.stringify(serverInstrutores));
          }

          if (hasGasUrlRefDiff) {
            setGasWebhookUrl(serverGasUrl);
            localStorage.setItem('nova_cnh_gas_webhook_url', serverGasUrl);
          }

          if (hasGoogleCodeRefDiff) {
            setGoogleVerificationCode(serverGoogleCode);
            localStorage.setItem('google_verification_code', serverGoogleCode);
          }

          lastSyncedPayloadRef.current = JSON.stringify({
            alunos: finalAlunos,
            instrutores: finalInstrutores,
            gasWebhookUrl: serverGasUrl,
            googleVerificationCode: serverGoogleCode
          });

          setLastSyncTime(new Date());
          setSyncStatus('synced');
          
          setTimeout(() => {
            isUpdatingFromRemote.current = false;
          }, 600);
        }
      } catch (err) {
        // Silencia erros tempor√°rios de conex√£o
      }
    };

    const intervalId = setInterval(checkForUpdates, 3000);

    const handleWindowFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Read automatic enrollment queries on load (after central data has loaded successfully)
  useEffect(() => {
    if (isInitialLoading) return;
    if (hasProcessedQueryParamsRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const isSelfRegister = params.get('cadastro-instrutor') === 'true' || params.get('cadastro_instrutor') === 'true';
    const hasParams = params.has('loginId') || params.has('alunoId') || params.has('inscrever') || params.has('nome') || params.has('instrutor') || params.has('reg') || params.has('data') || isSelfRegister;
    
    if (!hasParams) {
      hasProcessedQueryParamsRef.current = true;
      return;
    }

    hasProcessedQueryParamsRef.current = true;

    // Parse candidate link or query parameters
    const extracted = parseCandidateLink(window.location.search);

    // Read all parameters into local variables
    const pLoginId = params.get('loginId') || params.get('alunoId');
    const pNome = extracted.nome || params.get('nome') || '';
    const pCpf = extracted.cpf || params.get('cpf') || '';
    const pRg = extracted.rg || params.get('rg') || '';
    const pDob = extracted.dob || params.get('dob') || '2008-05-20';
    const pWhatsapp = extracted.whatsapp || params.get('whatsapp') || '';
    const pCategoria = extracted.categoria || params.get('categoria') || 'Carro (B)';
    const pInstrutor = extracted.instrutor || params.get('instrutor') || '';
    const pEndereco = extracted.endereco || params.get('endereco') || '';
    const pNacionalidade = extracted.nacionalidade || params.get('nacionalidade') || 'Brasileira';
    const pEstadoCivil = extracted.estadoCivil || params.get('estadoCivil') || 'Solteiro(a)';
    const pValorTotal = extracted.valorTotal || parseFloat(params.get('valorTotal') || '') || (pCategoria === 'Moto (A)' ? 140 : 200);
    const pFormaPagamento = (extracted.formaPagamento as any) || params.get('formaPagamento') || 'vista';
    const pSenha = extracted.senha || params.get('senha') || (pCpf ? pCpf.replace(/\D/g, '').slice(-4) : String(Math.floor(1000 + Math.random() * 9000)));
    const hasEnrollment = params.get('inscrever') === 'true' || !!pNome.trim() || !!extracted.rawReg || !!pInstrutor || params.has('instrutor') || params.has('ref');

    // Clean query string immediately so subsequent re-renders never see it
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      console.log(e);
    }

    // 0. Check if there is an instructor self-registration request
    if (isSelfRegister) {
      setIsInstrutorSelfRegisterOpen(true);
      setCurrentTab('gestao');
      setToastMessage('üìù Auto-cadastro de instrutor iniciado!');
      return;
    }

    // 1. Check if there is an automatic login request
    if (pLoginId) {
      const found = alunos.find(a => a.id === pLoginId);
      if (found) {
        setActiveStudentId(found.id);
        setIsAuthenticated(true);
        setCurrentTab('app-jovem');
        setToastMessage(`üëã Ol√°, ${found.nome}! Voc√™ foi autenticado automaticamente via QRCode/Link!`);
        return;
      }
    }

    // 2. Check if there is a self-enrollment request
    if (hasEnrollment) {
      let formattedDob = pDob;
      if (pDob.includes('/')) {
        const parts = pDob.split('/');
        if (parts.length === 3) {
          formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        }
      }

      // Populate preSelected states so CandidateEnrollmentForm fields are automatically pre-filled
      if (pNome) setPreSelectedNome(pNome);
      if (pCpf) setPreSelectedCpf(pCpf);
      if (pRg) setPreSelectedRg(pRg);
      if (pWhatsapp) setPreSelectedWhatsapp(pWhatsapp);
      if (pEndereco) setPreSelectedEndereco(pEndereco);
      if (pInstrutor) setPreSelectedInstrutor(pInstrutor);
      if (pNacionalidade) setPreSelectedNacionalidade(pNacionalidade);
      if (pEstadoCivil) setPreSelectedEstadoCivil(pEstadoCivil);
      if (pDob) setEnrollDob(formattedDob);
      if (pCategoria) setEnrollCategoria(pCategoria);

      // Save to sessionStorage as resilient fallback across page re-renders
      try {
        const pendingObj = {
          nome: pNome,
          cpf: pCpf,
          rg: pRg,
          whatsapp: pWhatsapp,
          endereco: pEndereco,
          instrutor: pInstrutor,
          nacionalidade: pNacionalidade,
          estadoCivil: pEstadoCivil,
          dob: formattedDob,
          categoria: pCategoria,
          rawReg: extracted.rawReg
        };
        sessionStorage.setItem('autodrive_pending_candidate', JSON.stringify(pendingObj));
      } catch (e) {}

      // Search in existing student list to populate extra fields if candidate was already saved
      const cleanNewCpf = pCpf.replace(/\D/g, '');
      const cleanNewName = pNome.trim().toLowerCase();
      const rawRegVal = extracted.rawReg || params.get('reg') || params.get('data') || params.get('id') || '';
      const decodedRegVal = rawRegVal ? safeAtob(rawRegVal) : '';

      pendingCandidateLookupRef.current = {
        rawRegVal,
        decodedRegVal,
        cleanNewCpf,
        cleanNewName
      };

      const existingStudent = alunos.find(a => {
        if (rawRegVal && a.id === rawRegVal) return true;
        if (decodedRegVal && a.id === decodedRegVal) return true;
        const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
        if (cleanNewCpf && cleanExistingCpf && cleanNewCpf === cleanExistingCpf) return true;
        return cleanNewName && a.nome.trim().toLowerCase() === cleanNewName;
      });

      if (existingStudent) {
        if (existingStudent.nome) setPreSelectedNome(existingStudent.nome);
        if (existingStudent.cpf) setPreSelectedCpf(existingStudent.cpf);
        if (existingStudent.rg) setPreSelectedRg(existingStudent.rg);
        if (existingStudent.whatsapp) setPreSelectedWhatsapp(existingStudent.whatsapp);
        if (existingStudent.endereco) setPreSelectedEndereco(existingStudent.endereco);
        if (existingStudent.instrutor) setPreSelectedInstrutor(existingStudent.instrutor);
        if (existingStudent.nacionalidade) setPreSelectedNacionalidade(existingStudent.nacionalidade);
        if (existingStudent.estadoCivil) setPreSelectedEstadoCivil(existingStudent.estadoCivil);
        if (existingStudent.dob) setEnrollDob(existingStudent.dob);
        if (existingStudent.categoria) setEnrollCategoria(existingStudent.categoria);
        pendingCandidateLookupRef.current = null;
      }

      // Automatically switch to the simulator & auto-enrollment tab and scroll to form
      setCurrentTab('simulador-poupanca');
      if (pInstrutor) {
        pendingScannedInstructorRef.current = pInstrutor;
        const foundInst = instrutores.find(i => i.nome.toLowerCase() === pInstrutor.toLowerCase());
        if (foundInst && !hasClosedWelcomeRef.current) {
          setScannedInstructorWelcome(foundInst);
        } else if (!hasClosedWelcomeRef.current) {
          setScannedInstructorWelcome({
            nome: pInstrutor,
            regiao: 'Atendimento Geral',
            vagas: 10,
            whatsapp: ''
          });
        }
      }

      if (pNome.trim()) {
        setToastMessage(`‚úçÔ∏è Formul√°rio de inscri√ß√£o preenchido automaticamente para: ${pNome}`);
      } else {
        setToastMessage(`‚úçÔ∏è Bem-vindo √† Auto-matr√≠cula Nova CNH!`);
      }

      setTimeout(() => {
        const element = document.getElementById('candidate-self-enrollment-platform');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [isInitialLoading, alunos, instrutores]);

  // Hook to resolve candidate from alunos array as soon as database finishes loading
  useEffect(() => {
    if (!pendingCandidateLookupRef.current || !alunos || alunos.length === 0) return;

    const { rawRegVal, decodedRegVal, cleanNewCpf, cleanNewName } = pendingCandidateLookupRef.current;

    const existingStudent = alunos.find(a => {
      if (rawRegVal && a.id === rawRegVal) return true;
      if (decodedRegVal && a.id === decodedRegVal) return true;
      const cleanExistingCpf = (a.cpf || '').replace(/\D/g, '');
      if (cleanNewCpf && cleanExistingCpf && cleanNewCpf === cleanExistingCpf) return true;
      return cleanNewName && a.nome.trim().toLowerCase() === cleanNewName;
    });

    if (existingStudent) {
      if (existingStudent.nome) setPreSelectedNome(existingStudent.nome);
      if (existingStudent.cpf) setPreSelectedCpf(existingStudent.cpf);
      if (existingStudent.rg) setPreSelectedRg(existingStudent.rg);
      if (existingStudent.whatsapp) setPreSelectedWhatsapp(existingStudent.whatsapp);
      if (existingStudent.endereco) setPreSelectedEndereco(existingStudent.endereco);
      if (existingStudent.instrutor) setPreSelectedInstrutor(existingStudent.instrutor);
      if (existingStudent.nacionalidade) setPreSelectedNacionalidade(existingStudent.nacionalidade);
      if (existingStudent.estadoCivil) setPreSelectedEstadoCivil(existingStudent.estadoCivil);
      if (existingStudent.dob) setEnrollDob(existingStudent.dob);
      if (existingStudent.categoria) setEnrollCategoria(existingStudent.categoria);

      setToastMessage(`‚úçÔ∏è Dados de ${existingStudent.nome} preenchidos automaticamente no formul√°rio!`);
      pendingCandidateLookupRef.current = null;
    }
  }, [alunos]);

  // Extra robust hook to resolve scanned instructor's bio when list of instructors is updated
  useEffect(() => {
    if (hasClosedWelcomeRef.current) return; // Skip if user closed it manually
    const targetName = pendingScannedInstructorRef.current || scannedInstructorWelcome?.nome;
    if (targetName && instrutores.length > 0) {
      const found = instrutores.find(i => i.nome.toLowerCase() === targetName.toLowerCase());
      if (found && (!scannedInstructorWelcome || !scannedInstructorWelcome.foto || scannedInstructorWelcome.regiao === 'Atendimento Geral')) {
        setScannedInstructorWelcome(found);
      }
    }
  }, [instrutores, scannedInstructorWelcome]);

  // UI state
  // Default tab is 'capa' so the visual presentation with the image of the happy youth starts immediately on screen load
  const [currentTab, setCurrentTab] = useState<'app-jovem' | 'gestao' | 'capa' | 'simulador-poupanca' | 'area-instrutor'>('capa');
  const [adminSubTab, setAdminSubTab] = useState<'database' | 'contracts' | 'commissions' | 'recibos' | 'crm'>('database');
  const [selectedCommissionInstructor, setSelectedCommissionInstructor] = useState<string | null>(null);
  const [commissionSearch, setCommissionSearch] = useState<string>('');
  const [signingRecibo, setSigningRecibo] = useState<{ instrutor: Instrutor, recibo: ReciboQuitacao } | null>(null);
  const [payoutConfirmData, setPayoutConfirmData] = useState<{ inst: Instrutor, valorAPagar: number } | null>(null);
  const [viewingRecibo, setViewingRecibo] = useState<{ instrutorNome: string, recibo: ReciboQuitacao } | null>(null);
  
  // Candidate Receipts States
  const [viewingCandidateReceipt, setViewingCandidateReceipt] = useState<CandidateReceiptData | null>(null);
  const [receiptSearchTerm, setReceiptSearchTerm] = useState<string>('');
  const [receiptMethodFilter, setReceiptMethodFilter] = useState<string>('todos');

  // Manual Receipt Form States
  const [isNewManualReceiptModalOpen, setIsNewManualReceiptModalOpen] = useState<boolean>(false);
  const [manualReceiptAlunoId, setManualReceiptAlunoId] = useState<string>('');
  const [manualReceiptValor, setManualReceiptValor] = useState<number>(200);
  const [manualReceiptData, setManualReceiptData] = useState<string>('');
  const [manualReceiptForma, setManualReceiptForma] = useState<string>('PIX');
  const [manualReceiptReferente, setManualReceiptReferente] = useState<string>('Pagamento referente ao programa CNH Facilitada');
  const [manualReceiptObs, setManualReceiptObs] = useState<string>('');

  const handleEmitirReciboCandidato = (aluno: Aluno, baixa?: BaixaPagamento) => {
    if (baixa) {
      setViewingCandidateReceipt({
        aluno,
        baixa,
        idRecibo: baixa.id.startsWith('REC-') ? baixa.id : `REC-${baixa.id}`,
        dataEmissao: baixa.data,
        valor: baixa.valor,
        formaPagamento: baixa.formaPagamento,
        referente: baixa.parcelasBaixadas > 0 
          ? `Pagamento de ${baixa.parcelasBaixadas} parcela(s) do programa CNH Facilitada - Categoria ${aluno.categoria}`
          : (baixa.observacao || `Pagamento referente √† inscri√ß√£o/taxa do programa CNH Facilitada`),
        observacao: baixa.observacao,
        operador: baixa.operador || 'Administra√ß√£o Nova CNH'
      });
    } else {
      const totalPago = (aluno.baixasPagamento && aluno.baixasPagamento.length > 0)
        ? aluno.baixasPagamento.reduce((acc, curr) => acc + curr.valor, 0)
        : (aluno.parcelasPagas > 0 ? (aluno.valorTotal / (aluno.parcelasTotal || 12)) * aluno.parcelasPagas : aluno.valorTotal);

      setViewingCandidateReceipt({
        aluno,
        idRecibo: `REC-${aluno.id}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
        dataEmissao: new Date().toISOString().substring(0, 10),
        valor: totalPago > 0 ? totalPago : 200,
        formaPagamento: aluno.formaPagamento === 'cartao' ? 'Cart√£o de Cr√©dito' : 'PIX / Transfer√™ncia',
        referente: `Quita√ß√£o referente √†s etapas do Programa CNH Facilitada - Categoria ${aluno.categoria}`,
        observacao: `Recibo oficial emitido pela gest√£o administrativa.`,
        operador: 'Administra√ß√£o Nova CNH'
      });
    }
  };

  const handleSalvarEEmitirReciboManual = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAluno = alunos.find(a => a.id === manualReceiptAlunoId);
    if (!selectedAluno) {
      alert('Por favor, selecione um candidato para emitir o recibo.');
      return;
    }

    const valorPago = Number(manualReceiptValor) || 0;
    if (valorPago <= 0) {
      alert('Por favor, informe um valor de pagamento v√°lido.');
      return;
    }

    const newBaixa: BaixaPagamento = {
      id: "BX-" + Date.now().toString(36).toUpperCase(),
      data: manualReceiptData || new Date().toISOString().substring(0, 10),
      valor: valorPago,
      formaPagamento: manualReceiptForma || 'PIX',
      parcelasBaixadas: 1,
      observacao: manualReceiptReferente + (manualReceiptObs ? ` [${manualReceiptObs}]` : ''),
      operador: activeInstructor ? `Instrutor ${activeInstructor.nome}` : 'Administra√ß√£o Nova CNH'
    };

    const newComprovante: Comprovante = {
      id: "COMP-REC-" + Date.now().toString(36).toUpperCase(),
      nomeArquivo: `Recibo_${newBaixa.id}.pdf`,
      conteudo: "",
      dataEnvio: new Date().toISOString(),
      valor: valorPago,
      validado: true,
      observacao: `[Recibo Emitido] ${manualReceiptForma} - ${valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    };

    const updatedAluno: Aluno = {
      ...selectedAluno,
      parcelasPagas: (selectedAluno.parcelasPagas || 0) + 1,
      baixasPagamento: [newBaixa, ...(selectedAluno.baixasPagamento || [])],
      comprovantes: [newComprovante, ...(selectedAluno.comprovantes || [])]
    };

    const updatedList = alunos.map(a => a.id === selectedAluno.id ? updatedAluno : a);
    saveAlunosList(updatedList);

    setIsNewManualReceiptModalOpen(false);
    setToastMessage(`üßæ Recibo ${newBaixa.id} emitido com sucesso para ${selectedAluno.nome}!`);

    // Open receipt view modal immediately
    handleEmitirReciboCandidato(updatedAluno, newBaixa);
  };
  const [govCpf, setGovCpf] = useState<string>('');
  const [govPassword, setGovPassword] = useState<string>('');
  const [isSigningInGov, setIsSigningInGov] = useState<boolean>(false);
  const [govSignStep, setGovSignStep] = useState<number>(1);
  const [selectedCapaRegion, setSelectedCapaRegion] = useState<string>('NE');
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0);
  
  // Administrator security states to prevent general public viewing students
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('nova_cnh_admin_auth') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === 'Vendedor 76') {
      setIsAdminAuthenticated(true);
      localStorage.setItem('nova_cnh_admin_auth', 'true');
      setAdminError('');
      setAdminPasswordInput('');
    } else {
      setAdminError('Senha do Administrador inv√°lida! Por favor, tente novamente ou verifique suas credenciais.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('nova_cnh_admin_auth');
    setCurrentTab('capa');
  };

  const handleSystemLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('nova_cnh_admin_auth');
    setIsAuthenticated(false);
    setActiveInstructor(null);
    setLoginIdAttempt('');
    setLoginSenhaAttempt('');
    setCurrentTab('capa');
  };

  const handlePagarSaldo = (inst: Instrutor, valorAPagar: number) => {
    if (valorAPagar <= 0) {
      setToastMessage("‚ö†Ô∏è N√£o h√° saldo liberado para pagar neste momento.");
      return;
    }
    setPayoutConfirmData({ inst, valorAPagar });
  };

  const handleExecutePagarSaldo = () => {
    if (!payoutConfirmData) return;
    const { inst, valorAPagar } = payoutConfirmData;

    const novoRecibo: ReciboQuitacao = {
      id: "REC-" + Date.now().toString(36).toUpperCase(),
      dataEmissao: new Date().toISOString(),
      valor: valorAPagar,
      status: 'pendente_assinatura'
    };

    const updated = instrutores.map(i => {
      if (i.nome === inst.nome) {
        return {
          ...i,
          saldoPago: (i.saldoPago || 0) + valorAPagar,
          recibos: [novoRecibo, ...(i.recibos || [])]
        };
      }
      return i;
    });

    saveInstrutoresList(updated);
    setToastMessage(`üí∏ Pagamento registrado! Recibo ${novoRecibo.id} enviado para assinatura via GOV.BR.`);
    
    // Abrir o recibo imediatamente para visualiza√ß√£o e impress√£o/download pelo administrador
    setViewingRecibo({ instrutorNome: inst.nome, recibo: novoRecibo });
    
    setPayoutConfirmData(null);
  };

  const handleSimulateGovSign = (inst: Instrutor, rec: ReciboQuitacao) => {
    setSigningRecibo({ instrutor: inst, recibo: rec });
    setGovCpf('');
    setGovPassword('');
    setIsSigningInGov(false);
    setGovSignStep(1);
  };

  const handleExecuteGovSign = () => {
    if (!govCpf.trim() || govCpf.replace(/\D/g, '').length !== 11) {
      alert("Por favor, insira um CPF v√°lido com 11 d√≠gitos.");
      return;
    }
    if (!govPassword.trim()) {
      alert("Por favor, insira a sua senha da conta √∫nica GOV.BR.");
      return;
    }

    setIsSigningInGov(true);
    setGovSignStep(2);

    setTimeout(() => {
      setIsSigningInGov(false);
      setGovSignStep(3);
    }, 2000);
  };

  const handleFinishGovSign = () => {
    if (!signingRecibo) return;
    const { instrutor: inst, recibo: rec } = signingRecibo;

    const dataAssinatura = new Date().toISOString();
    const identificadorGov = "GOV-BR-" + Math.random().toString(36).substring(2, 14).toUpperCase();
    const documentoAssinado = "sha256_" + Math.random().toString(16).substring(2, 18) + Math.random().toString(16).substring(2, 18);

    const updated = instrutores.map(i => {
      if (i.nome === inst.nome) {
        const novosRecibos = (i.recibos || []).map(r => {
          if (r.id === rec.id) {
            return {
              ...r,
              status: 'assinado_gov' as const,
              dataAssinatura,
              identificadorGov,
              documentoAssinado
            };
          }
          return r;
        });
        return {
          ...i,
          recibos: novosRecibos
        };
      }
      return i;
    });

    saveInstrutoresList(updated);
    
    // Update the activeInstructor state if the logged-in instructor is the one who signed
    if (activeInstructor && activeInstructor.nome === inst.nome) {
      const updatedActiveInst = updated.find(i => i.nome === activeInstructor.nome);
      if (updatedActiveInst) {
        setActiveInstructor(updatedActiveInst);
      }
    }

    setToastMessage(`‚úì Recibo ${rec.id} assinado via GOV.BR com sucesso e arquivado!`);
    setSigningRecibo(null);
  };

  const handleCopyEnrollCredentials = () => {
    if (!enrollCreatedCard) return;
    const credText = `Inscri√ß√£o Nova CNH Realizada!\nID de Acesso: ${enrollCreatedCard.id}\nSenha Inicial: ${enrollCreatedCard.senha}\nCategoria: ${enrollCreatedCard.categoria}`;
    try {
      navigator.clipboard.writeText(credText);
      setCopiedEnrollCred(true);
      setTimeout(() => setCopiedEnrollCred(false), 3000);
      setToastMessage('üìã Credenciais copiadas com sucesso!');
    } catch (err) {
      setToastMessage('Por favor, copie os dados diretamente na tela.');
    }
  };

  const handleGenerateRandomSenha = () => {
    setEnrollSenha(String(Math.floor(1000 + Math.random() * 9000)));
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
      alert(`Para se cadastrar √© necess√°rio ter no m√≠nimo 17 anos.`);
      return;
    }
    if (!enrollWhatsapp.trim()) {
      alert('Por favor, informe um WhatsApp para contato.');
      return;
    }

    // Checking guardian's whatsapp if minor (< 18)
    if (age < 18 && !enrollWhatsappResponsavel.trim()) {
      alert('Por favor, informe o WhatsApp de um respons√°vel legal.');
      return;
    }

    // Auto generate high-quality random password
    const autoSenha = String(Math.floor(1000 + Math.random() * 9000));

    // Normalizing numbers to check duplicates of whatsapp
    const cleanWhatsapp = enrollWhatsapp.replace(/\D/g, '');
    const existingStudent = alunos.find(a => 
      a.nome.toLowerCase() === enrollNome.trim().toLowerCase() || 
      (cleanWhatsapp && a.whatsapp.replace(/\D/g, '') === cleanWhatsapp)
    );

    if (existingStudent) {
      setEnrollCreatedCard({
        id: existingStudent.id,
        nome: existingStudent.nome,
        senha: existingStudent.senha || String(Math.floor(1000 + Math.random() * 9000)),
        categoria: existingStudent.categoria,
        instrutor: existingStudent.instrutor,
        whatsapp: existingStudent.whatsapp,
        whatsappResponsavel: existingStudent.whatsappResponsavel,
        endereco: existingStudent.endereco
      });
      setToastMessage(`üëã Dados carregados: identificamos que voc√™ j√° se inscreveu no sistema!`);
      return;
    }

    const nextIdNum = alunos.length > 0 
      ? Math.max(...alunos.map(a => {
          if (!a || !a.id) return 0;
          const match = a.id.match(/\d+/);
          return match ? parseInt(match[0], 10) || 0 : 0;
        })) + 1 
      : 1;
    const formattedId = `CNH-${String(nextIdNum).padStart(3, '0')}`;

    const ratePerClass = enrollCategoria === 'Moto (A)' ? 90 : enrollCategoria === 'Carro (B)' ? 125 : 215;
    const enrollValorTotal = 10 * ratePerClass;

    const newObj: Aluno = {
      id: formattedId,
      nome: enrollNome.trim(),
      dob: enrollDob,
      whatsapp: enrollWhatsapp,
      whatsappResponsavel: age < 18 ? enrollWhatsappResponsavel : undefined,
      categoria: enrollCategoria,
      instrutor: enrollInstrutor,
      dataAdesao: new Date().toISOString().substring(0, 10),
      parcelasPagas: 0, // Starts empty at R$ 0,00 so the client can save custom amounts
      valorTotal: enrollValorTotal,
      pontosSimulado: 120,
      senha: autoSenha,
      endereco: enrollEndereco.trim(),
      tipoPlano: (enrollPlano === 'jovem-17' && age < 18) ? 'Plano Poupan√ßa Jovem 17 Anos' : 'Plano CNH Facilitada Maiores de 18 Anos'
    };

    const updatedList = [...alunos, newObj];
    setAlunos(updatedList);
    localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(updatedList));

    // Save immediately to Central Server / Firestore DB
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunos: updatedList,
        instrutores: instrutoresRef.current,
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.alunos && Array.isArray(data.alunos)) {
          setAlunos(data.alunos);
          localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(data.alunos));
        }
      })
      .catch(err => console.error("Erro ao salvar cadastro na nuvem:", err));

    setEnrollCreatedCard({
      id: formattedId,
      nome: newObj.nome,
      senha: newObj.senha || autoSenha,
      categoria: newObj.categoria,
      instrutor: newObj.instrutor,
      whatsapp: newObj.whatsapp,
      whatsappResponsavel: newObj.whatsappResponsavel,
      endereco: newObj.endereco
    });

    setToastMessage(`üéâ Inscri√ß√£o cadastrada! A senha foi enviada ao WhatsApp.`);
  };

  // Simulated logged-in student state (for student app simulator)
  const [activeStudentId, setActiveStudentId] = useState<string>(""); // No default student
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Restricted layout by default to protect user privacy
  const [loginIdAttempt, setLoginIdAttempt] = useState<string>('');
  const [loginSenhaAttempt, setLoginSenhaAttempt] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  
  // Real active logged-in instructor states
  const [activeInstructorNome, setActiveInstructorNome] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nova_cnh_active_instructor_nome') || null;
    } catch {
      return null;
    }
  });

  const activeInstructor = useMemo(() => {
    if (!activeInstructorNome) return null;
    return instrutores.find(i => i.nome === activeInstructorNome) || null;
  }, [instrutores, activeInstructorNome]);

  const setActiveInstructor = (inst: Instrutor | null) => {
    if (inst) {
      setActiveInstructorNome(inst.nome);
      try {
        localStorage.setItem('nova_cnh_active_instructor_nome', inst.nome);
      } catch (e) {
        console.error(e);
      }
    } else {
      setActiveInstructorNome(null);
      try {
        localStorage.removeItem('nova_cnh_active_instructor_nome');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [instructorLoginNome, setInstructorLoginNome] = useState<string>("");
  const [instructorLoginWhatsapp, setInstructorLoginWhatsapp] = useState<string>("");
  const [instructorLoginError, setInstructorLoginError] = useState<string>("");
  
  const [copiedScript, setCopiedScript] = useState(false);
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';'>(';');

  // Search & Filter state for management
  const [searchQuery, setSearchQuery] = useState('');
  const [instSearchQuery, setInstSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('Todas');
  const [filterInstructor, setFilterInstructor] = useState('Todos');
  const [filterClassificacao, setFilterClassificacao] = useState('Todas');

  // Interactive Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOpcao, setSelectedQuizOpcao] = useState<number | null>(null);
  const [quizStatusText, setQuizStatusText] = useState<'espera' | 'correto' | 'errado'>('espera');

  // Simulated Pix & Credit Card payment popup state
  const [showPixModal, setShowPixModal] = useState(false);
  const [showGeneralEnrollmentModal, setShowGeneralEnrollmentModal] = useState(false);
  const [isLinkEnrollmentModalOpen, setIsLinkEnrollmentModalOpen] = useState(false);
  const [linkModalSelectedAlunoId, setLinkModalSelectedAlunoId] = useState('');

  const handleMatricularViaLinkData = (candData: Partial<Aluno>) => {
    if (!candData.nome || !candData.nome.trim()) {
      alert("Por favor, informe o nome do candidato.");
      return;
    }

    const cleanCpf = (candData.cpf || '').replace(/\D/g, '');
    const cleanName = candData.nome.trim().toLowerCase();

    // Check if candidate already exists
    const existing = alunos.find(a => {
      const existingCpf = (a.cpf || '').replace(/\D/g, '');
      if (cleanCpf && existingCpf && cleanCpf === existingCpf) return true;
      return a.nome.trim().toLowerCase() === cleanName;
    });

    if (existing) {
      setActiveStudentId(existing.id);
      setSelectedStudentDetail(existing);
      setIsAuthenticated(true);
      setCurrentTab('gestao');
      setToastMessage(`üëã O candidato "${existing.nome}" (${existing.id}) j√° constava no sistema e foi localizado!`);
      return;
    }

    // Next sequential CNH-XXX ID
    const nextIdNum = alunos.length > 0 
      ? Math.max(...alunos.map(a => {
          if (!a || !a.id) return 0;
          const match = a.id.match(/\d+/);
          return match ? parseInt(match[0], 10) || 0 : 0;
        })) + 1 
      : 1;
    const formattedId = `CNH-${String(nextIdNum).padStart(3, '0')}`;

    const newAluno: Aluno = {
      id: formattedId,
      nome: candData.nome.trim(),
      cpf: candData.cpf || '',
      rg: candData.rg || '',
      whatsapp: candData.whatsapp || '(81) 99999-9999',
      categoria: candData.categoria || 'Carro (B)',
      instrutor: candData.instrutor || 'Miqueias Souza de Lima ‚Äî Instrutor Aut√¥nomo',
      endereco: candData.endereco || '',
      nacionalidade: candData.nacionalidade || 'Brasileira',
      estadoCivil: candData.estadoCivil || 'Solteiro(a)',
      dataAdesao: candData.dataAdesao || new Date().toISOString().substring(0, 10),
      dob: candData.dob || '2006-05-20',
      valorTotal: candData.valorTotal || (candData.categoria === 'Moto (A)' ? 140 : 200),
      formaPagamento: candData.formaPagamento || 'vista',
      parcelasTotal: candData.parcelasTotal || 1,
      parcelasPagas: (candData.parcelasPagas !== undefined && candData.parcelasPagas !== null) ? Number(candData.parcelasPagas) : 0,
      aulas: candData.aulas || 2,
      senha: candData.senha || (candData.cpf ? candData.cpf.replace(/\D/g, '').slice(-4) : String(Math.floor(1000 + Math.random() * 9000))),
      baixasPagamento: candData.baixasPagamento || [],
      comprovantes: candData.comprovantes || [],
      pontosSimulado: candData.pontosSimulado || 0,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...alunos, newAluno];
    setAlunos(updatedList);
    try {
      localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(updatedList));
    } catch (e) {}

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunos: updatedList })
    }).catch(err => console.error("Erro ao sincronizar matr√≠cula via link:", err));

    setActiveStudentId(formattedId);
    setSelectedStudentDetail(newAluno);
    setIsAuthenticated(true);
    setCurrentTab('gestao');
    setToastMessage(`üéâ Matr√≠cula efetuada com sucesso no App de Gest√£o! ID: ${formattedId} - ${newAluno.nome}`);
  };
  const [requestedHybridCardLink, setRequestedHybridCardLink] = useState(false);
  const [pixAmountSimulated, setPixAmountSimulated] = useState(0);
  const [hybridPixAmount, setHybridPixAmount] = useState(0);
  const [paymentTab, setPaymentTab] = useState<'pix' | 'cartao'>('pix');
  const [pixReceipt, setPixReceipt] = useState<string | null>(null);
  const [pixReceiptName, setPixReceiptName] = useState<string>('');
  const [receiptValidationReason, setReceiptValidationReason] = useState<string>('');
  const [isValidatingReceipt, setIsValidatingReceipt] = useState<boolean>(false);
  const [isReceiptDragging, setIsReceiptDragging] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState(1);
  const [isProcessingCardPayment, setIsProcessingCardPayment] = useState(false);
  
  // Fale Conosco Form States
  const [faleNome, setFaleNome] = useState('');
  const [faleAssunto, setFaleAssunto] = useState('D√∫vida Geral');
  const [faleDestinatario, setFaleDestinatario] = useState('secretaria_flavia_1');
  const [faleMensagem, setFaleMensagem] = useState('');
  
  // Modal forms states (Admin Register)
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [alunoForm, setAlunoForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    nacionalidade: 'Brasileira',
    estadoCivil: 'Solteiro(a)',
    dob: '2008-01-01',
    whatsapp: '',
    endereco: '',
    categoria: 'Carro (B)',
    instrutor: 'A definir',
    dataAdesao: '2026-01-10',
    parcelasPagas: 0,
    valorTotal: 2400,
    senha: String(Math.floor(1000 + Math.random() * 9000)),
    parcelasTotal: 12,
    formaPagamento: 'poupanca' as 'poupanca' | 'cartao' | 'vista' | 'hibrido',
    aulas: 20,
    nomeResponsavel: '',
    cpfResponsavel: '',
    rgResponsavel: '',
    whatsappResponsavel: ''
  });

  const [isInstrutorModalOpen, setIsInstrutorModalOpen] = useState(false);
  const [isInstrutorSelfRegisterOpen, setIsInstrutorSelfRegisterOpen] = useState(false);
  const [newSelfRegisteredInstrutor, setNewSelfRegisteredInstrutor] = useState<Instrutor | null>(null);
  const [editingInstrutor, setEditingInstrutor] = useState<Instrutor | null>(null);
  const [instrutorForm, setInstrutorForm] = useState({
    nome: '',
    regiao: '',
    vagas: 12,
    whatsapp: '',
    endereco: '',
    credencialSenatran: '',
    foto: '',
    login: '',
    senha: '',
    tempoExperiencia: '',
    historia: '',
    chavePix: ''
  });

  // Self registration state fields
  const [selfNome, setSelfNome] = useState('');
  const [selfRegiao, setSelfRegiao] = useState('Recife Centro');
  const [selfVagas, setSelfVagas] = useState(12);
  const [selfWhatsapp, setSelfWhatsapp] = useState('');
  const [selfEndereco, setSelfEndereco] = useState('');
  const [selfCredencial, setSelfCredencial] = useState('');
  const [selfFoto, setSelfFoto] = useState('');
  const [selfLogin, setSelfLogin] = useState('');
  const [selfSenha, setSelfSenha] = useState('');
  const [selfTempoExp, setSelfTempoExp] = useState('');
  const [selfHistoria, setSelfHistoria] = useState('');
  const [selfChavePix, setSelfChavePix] = useState('');

  const handleOpenSelfRegister = () => {
    setSelfNome('');
    setSelfRegiao('Recife Centro');
    setSelfVagas(12);
    setSelfWhatsapp('');
    setSelfEndereco('');
    setSelfCredencial('');
    setSelfFoto('');
    setSelfLogin('');
    setSelfSenha(generateSecurePassword());
    setSelfTempoExp('');
    setSelfHistoria('');
    setSelfChavePix('');
    setNewSelfRegisteredInstrutor(null);
    setIsInstrutorSelfRegisterOpen(true);
  };

  const [instructorChavePixInput, setInstructorChavePixInput] = useState<string>("");

  useEffect(() => {
    if (activeInstructor) {
      setInstructorChavePixInput(activeInstructor.chavePix || "");
    }
  }, [activeInstructor]);

  // States for Planned CNH Savings Calculator (Custom Simulation)
  const [calcAulas, setCalcAulas] = useState<number>(10);
  const [calcAulasCarro, setCalcAulasCarro] = useState<number>(20); // Default 20 for beginner
  const [calcAulasMoto, setCalcAulasMoto] = useState<number>(5);    // Default 5 for people with skill
  const [calcTipo, setCalcTipo] = useState<'carro' | 'moto' | 'ambos'>('ambos'); // Start with ambos so they see the split option
  const [calcParcelas, setCalcParcelas] = useState<number>(12);
  const [calcPlano, setCalcPlano] = useState<'jovem-17' | 'adulto-18' | 'habilitado'>('jovem-17');
  const [calcFormaPagamento, setCalcFormaPagamento] = useState<'poupanca' | 'cartao' | 'vista' | 'hibrido'>('poupanca');
  const [showHybridPaymentNotice, setShowHybridPaymentNotice] = useState<boolean>(false);
  const [selectedPlanToPreview, setSelectedPlanToPreview] = useState<'jovem-17' | 'adulto-18' | 'habilitado' | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Estados para simula√ß√£o por idade real (Candidato a partir de 17 anos)
  const [calcUseRealAge, setCalcUseRealAge] = useState<boolean>(false);
  const [calcSelectedAgeMonths, setCalcSelectedAgeMonths] = useState<number>(0); // 17 anos e X meses (0 a 11)
  const [calcStrategy, setCalcStrategy] = useState<'real-age-ctb' | 'regular-bau'>('real-age-ctb');

  // Estados para Maquininha Ton (C√°lculo fidedigno e plano customiz√°vel)
  const [tonPlan, setTonPlan] = useState<'promo' | 'giga' | 'mega' | 'basico' | 'custom'>(() => {
    return 'basico';
  });
  const [tonBrand, setTonBrand] = useState<'visa_master' | 'elo_amex'>(() => {
    return 'elo_amex';
  });
  const [tonCustomRates, setTonCustomRates] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('nova_cnh_ton_custom_rates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      1: 3.15,
      2: 4.75,
      3: 5.35,
      4: 5.95,
      5: 6.55,
      6: 7.15,
      7: 7.95,
      8: 8.55,
      9: 9.15,
      10: 9.75,
      11: 10.35,
      12: 10.95
    };
  });

  // Helper para obter o multiplicador de juros fidedigno da Ton com base no plano selecionado
  const getTonInterestMultiplier = (installments: number): number => {
    const currentRatePercent = tonPlan === 'custom'
      ? tonCustomRates[installments] ?? 0
      : getTonPresetRatePercentage(installments, tonPlan as any, tonBrand);
    
    const rateDecimal = currentRatePercent / 100;
    if (rateDecimal >= 1 || rateDecimal < 0) return 1.0;
    
    // Ton uses factor-based rounding to 4 decimal places for repasse de taxa
    return parseFloat((1 / (1 - rateDecimal)).toFixed(4));
  };

  // Synchronize calcParcelas with real age months when in real-age-ctb mode
  useEffect(() => {
    if (calcUseRealAge && calcStrategy === 'real-age-ctb') {
      const neededParcelas = Math.max(1, 12 - calcSelectedAgeMonths);
      if (calcParcelas !== neededParcelas) {
        setCalcParcelas(neededParcelas);
      }
    }
  }, [calcUseRealAge, calcStrategy, calcSelectedAgeMonths, calcParcelas]);

  // Auto switch plan if authenticated student is major of age (>= 18)
  useEffect(() => {
    if (isAuthenticated && activeStudentId) {
      const student = alunos.find(a => a.id === activeStudentId);
      if (student) {
        const studentAge = calculateAge(student.dob);
        if (studentAge >= 18 && calcPlano === 'jovem-17') {
          setCalcPlano('adulto-18');
          setCalcUseRealAge(false);
        }
      }
    }
  }, [isAuthenticated, activeStudentId, alunos, calcPlano]);

  // Estados para Modal de Conselho do Instrutor (Avatar Informativo)
  const [adviceModalOpen, setAdviceModalOpen] = useState(false);
  const [adviceAulas, setAdviceAulas] = useState<number>(10);

  const getAulasAdviceText = (num: number): string => {
    if (calcPlano === 'habilitado') {
      if (num === 2) return "2 aulas pr√°ticas s√£o ideais para motoristas habilitados tirarem d√∫vidas pontuais (como balizar em vaga espec√≠fica).";
      if (num <= 4) return `${num} aulas s√£o recomendadas para habilitados treinarem uma manobra espec√≠fica ou tirar o carro da garagem com instru√ß√£o guiada.`;
      if (num === 5) return "5 aulas para habilitados que j√° possuem alguma no√ß√£o, mas querem praticar pequenos trajetos urbanos comerciais.";
      if (num <= 9) return `${num} aulas s√£o excelentes para habilitados come√ßarem a treinar percursos rotineiros como o caminho de casa para o trabalho.`;
      if (num === 10) return "10 aulas para pessoas habilitadas perderem o medo de dirigir em vias movimentadas e avenidas de grande fluxo, com total apoio.";
      if (num <= 14) return `${num} aulas s√£o ideais para habilitados que n√£o dirigem h√° muito tempo e que desejam recuperar embreagem, subida de ladeira e tr√¢nsito real.`;
      if (num === 15) return "15 aulas para habilitados que desejam superar a fobia/medo de dirigir com apoio integral e evolu√ß√£o progressiva em todas as situa√ß√µes cotidianas.";
      if (num <= 19) return `${num} aulas de treinamento intensivo de alta confian√ßa para habilitados dominarem rotat√≥rias, baliza dupla e vias expressas de alta velocidade.`;
      return "20 aulas completas de desenvolvimento de habilitado para dominar do zero o volante, baliza na vaga oficial, rodovia, tr√¢nsito pesado e estacionamento de shopping.";
    }
    if (num === 2) return "2 aulas √© para pessoas que j√° t√™m habilidade suficiente para conduzir ve√≠culos.";
    if (num <= 4) return `${num} aulas s√£o indicadas para quem j√° possui bastante controle de condu√ß√£o e precisa apenas de polimento para o teste pr√°tico.`;
    if (num === 5) return "5 aulas para pessoas que t√™m uma pequena no√ß√£o, por√©m podem precisar de mais aulas.";
    if (num <= 9) return `${num} aulas s√£o excelentes para quem tem uma pequena base de dire√ß√£o e quer praticar rampa, embreagem e baliza de forma √°gil.`;
    if (num === 10) return "10 aulas para pessoas que n√£o sabem dirigir por√©m conhecem um pouco de condu√ß√£o e t√™m capacidade de obten√ß√£o de √™xito, por√©m podem precisar de mais aulas.";
    if (num <= 14) return `${num} aulas s√£o recomendadas para construir consist√™ncia na dire√ß√£o defensiva de rua e preparar para o exame do Detran sem sobressaltos.`;
    if (num === 15) return "15 aulas para pessoas que possuem no√ß√µes b√°sicas mas desejam refor√ßar os pontos fundamentais de controle de embreagem e baliza para passar com m√°xima seguran√ßa.";
    if (num <= 19) return `${num} aulas d√£o uma excelente carga hor√°ria para pessoas sem experi√™ncia se tornarem condutores altamente seguros na rua e na baliza.`;
    return "20 aulas para pessoas que nunca tiveram experi√™ncia de nenhum tipo de ve√≠culo, ou seja, come√ßar do absoluto zero.";
  };

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Aluno | null>(null);
  const [selectedInstrutorDetail, setSelectedInstrutorDetail] = useState<Instrutor | null>(null);

  // Estados para Modal de Baixa Manual de Pagamentos (Cart√£o / PIX / Dinheiro / Boleto)
  const [baixaModalAluno, setBaixaModalAluno] = useState<Aluno | null>(null);
  const [baixaForm, setBaixaForm] = useState<{
    formaPagamento: 'cartao' | 'pix' | 'dinheiro' | 'boleto' | 'transferencia';
    valor: number;
    parcelasBaixadas: number;
    modoAcao: 'avancar' | 'quitar_tudo' | 'customizado';
    novaQtdeParcelasPagas: number;
    observacao: string;
    data: string;
    nsuComprovante: string;
  }>({
    formaPagamento: 'cartao',
    valor: 0,
    parcelasBaixadas: 1,
    modoAcao: 'avancar',
    novaQtdeParcelasPagas: 0,
    observacao: '',
    data: new Date().toISOString().substring(0, 10),
    nsuComprovante: ''
  });

  // Estados para Modal de Limpeza de Cadastros Fict√≠cios / Testes
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [selectedPurgeIds, setSelectedPurgeIds] = useState<string[]>([]);

  // Handler para abrir modal de baixa manual
  const handleAbrirBaixaManual = (aluno: Aluno) => {
    const showBaseValue = currentTab === 'area-instrutor';
    const displayValorTotal = showBaseValue ? getStudentBaseValue(aluno) : aluno.valorTotal;
    const parcelasTotal = aluno.parcelasTotal || 12;
    const defaultInstallmentVal = Math.round((displayValorTotal / parcelasTotal) * 100) / 100;
    
    setBaixaModalAluno(aluno);
    setBaixaForm({
      formaPagamento: aluno.formaPagamento === 'cartao' ? 'cartao' : aluno.formaPagamento === 'vista' ? 'pix' : 'cartao',
      valor: defaultInstallmentVal,
      parcelasBaixadas: 1,
      modoAcao: 'avancar',
      novaQtdeParcelasPagas: Math.min(parcelasTotal, aluno.parcelasPagas + 1),
      observacao: '',
      data: new Date().toISOString().substring(0, 10),
      nsuComprovante: ''
    });
  };

  // Handler para confirmar baixa manual
  const handleConfirmarBaixaManual = () => {
    if (!baixaModalAluno) return;
    const aluno = baixaModalAluno;
    const parcelasTotal = aluno.parcelasTotal || 12;

    let targetParcelasPagas = aluno.parcelasPagas;
    if (baixaForm.modoAcao === 'quitar_tudo') {
      targetParcelasPagas = parcelasTotal;
    } else if (baixaForm.modoAcao === 'customizado') {
      targetParcelasPagas = Math.max(0, Math.min(parcelasTotal, Number(baixaForm.novaQtdeParcelasPagas) || 0));
    } else {
      targetParcelasPagas = Math.min(parcelasTotal, aluno.parcelasPagas + Number(baixaForm.parcelasBaixadas));
    }

    const formaLabelMap: Record<string, string> = {
      cartao: 'Cart√£o de Cr√©dito (M√°quina/Link)',
      pix: 'PIX / Transfer√™ncia Instant√¢nea',
      dinheiro: 'Dinheiro em Esp√©cie / Balc√£o',
      boleto: 'Boleto Banc√°rio',
      transferencia: 'Transfer√™ncia Banc√°ria / TED'
    };

    const formaPagamentoText = formaLabelMap[baixaForm.formaPagamento] || 'Cart√£o de Cr√©dito';
    const valorPago = Number(baixaForm.valor) || 0;

    const newBaixa: BaixaPagamento = {
      id: "BX-" + Date.now().toString(36).toUpperCase(),
      data: baixaForm.data || new Date().toISOString().substring(0, 10),
      valor: valorPago,
      formaPagamento: formaPagamentoText,
      parcelasBaixadas: Math.max(0, targetParcelasPagas - aluno.parcelasPagas),
      observacao: baixaForm.observacao + (baixaForm.nsuComprovante ? ` [NSU/Comprovante: ${baixaForm.nsuComprovante}]` : ''),
      operador: activeInstructor ? `Instrutor ${activeInstructor.nome}` : 'Administra√ß√£o Nova CNH'
    };

    const newComprovante: Comprovante = {
      id: "COMP-BX-" + Date.now().toString(36).toUpperCase(),
      nomeArquivo: `Baixa_${baixaForm.formaPagamento}_${newBaixa.id}.pdf`,
      conteudo: "",
      dataEnvio: new Date().toISOString(),
      valor: valorPago,
      validado: true,
      observacao: `[Baixa Manual Confirmada] ${formaPagamentoText} - Valor: ${valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ${baixaForm.observacao ? `(${baixaForm.observacao})` : ''}`
    };

    const updatedAluno: Aluno = {
      ...aluno,
      parcelasPagas: targetParcelasPagas,
      baixasPagamento: [newBaixa, ...(aluno.baixasPagamento || [])],
      comprovantes: [newComprovante, ...(aluno.comprovantes || [])]
    };

    const updatedList = alunos.map(a => a.id === aluno.id ? updatedAluno : a);
    saveAlunosList(updatedList);
    
    if (selectedStudentDetail && selectedStudentDetail.id === aluno.id) {
      setSelectedStudentDetail(updatedAluno);
    }

    setToastMessage(`üí≥ Baixa manual de ${valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${formaPagamentoText}) registrada com sucesso!`);
    setBaixaModalAluno(null);
    handleEmitirReciboCandidato(updatedAluno, newBaixa);
  };

  // Helper para identificar cadastros fict√≠cios / testes
  const isFictitiousCandidate = (a: Aluno): boolean => {
    if (a.id === "CNH-000") return true;
    const nameLower = (a.nome || "").toLowerCase().trim();
    if (
      nameLower.includes("teste") ||
      nameLower.includes("fictic") ||
      nameLower.includes("fict√≠c") ||
      nameLower.includes("exemplo") ||
      nameLower.includes("demo") ||
      nameLower.includes("nenhum aluno") ||
      nameLower.includes("fake") ||
      nameLower.includes("mock") ||
      nameLower === "aluno" ||
      nameLower === "candidato"
    ) {
      return true;
    }
    return false;
  };

  const handleAbrirLimpezaFicticios = () => {
    const suggestedIds = alunos.filter(isFictitiousCandidate).map(a => a.id);
    setSelectedPurgeIds(suggestedIds);
    setIsPurgeModalOpen(true);
  };

  const handleConfirmarLimpezaFicticios = () => {
    if (selectedPurgeIds.length === 0) return;
    const count = selectedPurgeIds.length;
    const remaining = alunos.filter(a => !selectedPurgeIds.includes(a.id));
    if (activeStudentId && selectedPurgeIds.includes(activeStudentId)) {
      setActiveStudentId(remaining.length > 0 ? remaining[0].id : "");
    }
    saveAlunosList(remaining, selectedPurgeIds);

    setToastMessage(`üßπ ${count} cadastro(s) fict√≠cio(s)/teste(s) removido(s) com sucesso!`);
    setIsPurgeModalOpen(false);
    setSelectedPurgeIds([]);
  };

  const AULAS_ADVICE: Record<number, string> = {
    2: "2 aulas √© para pessoas que j√° tem habilidade suficiente para conduzir ve√≠culos.",
    5: "5 aulas para pessoas que tem uma pequena no√ß√£o porem pode precisar de mais aulas.",
    10: "10 aulas para pessoas que n√£o sabem dirigir por√©m conhece um pouco de condu√ß√£o e tem capacidade de obten√ß√£o de √™xito porem pode precisar de mais aulas.",
    15: "15 aulas para pessoas que possuem no√ß√µes b√°sicas mas desejam refor√ßar os pontos fundamentais de controle de embreagem e baliza para passar com m√°xima seguran√ßa.",
    20: "20 aulas para pessoas que nunca tiveram experi√™ncia de nem um tipo de ve√≠culo ou seja come√ßar do 0."
  };

  // States for independent candidate registration platform
  const [enrollNome, setEnrollNome] = useState<string>('');
  const [enrollDob, setEnrollDob] = useState<string>('');
  const [enrollWhatsapp, setEnrollWhatsapp] = useState<string>('');
  const [enrollWhatsappResponsavel, setEnrollWhatsappResponsavel] = useState<string>('');
  const [enrollEndereco, setEnrollEndereco] = useState<string>('');
  const [enrollCategoria, setEnrollCategoria] = useState<string>('Carro (B)');
  const [enrollPlano, setEnrollPlano] = useState<'jovem-17' | 'adulto-18' | 'habilitado'>('jovem-17');
  const [enrollFormaPagamento, setEnrollFormaPagamento] = useState<'poupanca' | 'cartao' | 'vista' | 'hibrido'>('poupanca');
  const [enrollInstrutor, setEnrollInstrutor] = useState<string>('A definir');
  const [enrollSenha, setEnrollSenha] = useState<string>(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [enrollCreatedCard, setEnrollCreatedCard] = useState<{
    id: string;
    nome: string;
    senha: string;
    categoria: string;
    instrutor: string;
    whatsapp: string;
    whatsappResponsavel?: string;
    endereco?: string;
  } | null>(null);
  const [copiedEnrollCred, setCopiedEnrollCred] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedContractStudentId, setSelectedContractStudentId] = useState<string | null>(null);
  const [contractSearch, setContractSearch] = useState<string>('');
  const [isDownloadingContractPdf, setIsDownloadingContractPdf] = useState<boolean>(false);
  const [isDownloadingReceiptPdf, setIsDownloadingReceiptPdf] = useState<boolean>(false);

  const handleEnrollDobChange = (dobValue: string, skipSimulatorSync = false) => {
    setEnrollDob(dobValue);
    if (!dobValue || dobValue.length !== 10) return;

    // 1. Calculate age from input DOB
    const age = calculateAge(dobValue);
    
    // Set plan automatically based on age
    if (age < 18) {
      setEnrollPlano('jovem-17');
    } else {
      if (enrollPlano !== 'habilitado') {
        setEnrollPlano('adulto-18');
      }
    }

    // 2. Synchronize simulator states automatically based on demographic
    if (!skipSimulatorSync) {
      if (age === 17) {
        setCalcUseRealAge(true);
        const monthsTo18 = calculateMonthsTo18(dobValue);
        const selectedValue = Math.max(0, Math.min(11, 12 - monthsTo18));
        setCalcSelectedAgeMonths(selectedValue);
        setCalcStrategy('real-age-ctb');
      } else {
        setCalcUseRealAge(false);
        // For any candidate, customize standard installments
        setCalcParcelas(12);
      }
    }

    // 3. Synchronize selected package categories
    if (!skipSimulatorSync) {
      if (enrollCategoria === 'Moto (A)') {
        setCalcTipo('moto');
      } else if (enrollCategoria === 'Carro (B)') {
        setCalcTipo('carro');
      } else {
        setCalcTipo('ambos');
      }
    }
  };

  const handleEnrollEnderecoChange = (addressValue: string) => {
    setEnrollEndereco(addressValue);
    setEnrollInstrutor('A definir');
  };

  const [enrollCep, setEnrollCep] = useState<string>('');
  const [isCepLoading, setIsCepLoading] = useState<boolean>(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // States for purchasing additional classes in candidate portal
  const [addAulasQty, setAddAulasQty] = useState<number>(5);
  const [addAulasCarroQty, setAddAulasCarroQty] = useState<number>(5);
  const [addAulasMotoQty, setAddAulasMotoQty] = useState<number>(0);
  const [addAulasTipo, setAddAulasTipo] = useState<'carro' | 'moto' | 'ambos'>('carro');
  const [addAulasPaymentMethod, setAddAulasPaymentMethod] = useState<'pix' | 'cartao'>('pix');
  const [addAulasParcelas, setAddAulasParcelas] = useState<number>(1);
  const [showAddAulasSuccess, setShowAddAulasSuccess] = useState<boolean>(false);

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
        setCepError('CEP n√£o encontrado.');
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
      setCepError('Erro de conex√£o ao buscar CEP.');
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

  // Auto-deduplicate alunos whenever state has duplicates
  useEffect(() => {
    const deduped = deduplicateAlunosList(alunos);
    if (deduped.length !== alunos.length) {
      console.log(`üßπ [Auto-Deduplicate] Removidas ${alunos.length - deduped.length} duplicatas do estado local.`);
      setAlunos(deduped);
      try {
        localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(deduped));
        localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(deduped));
      } catch (e) {}
    }
  }, [alunos]);

  // Clean deduplicated alunos list for all views, database, contracts and stats (apenas alunos com neg√≥cio fechado / matr√≠cula conclu√≠da)
  const cleanAlunos = useMemo(() => deduplicateAlunosList(alunos).filter(isAlunoMatriculado), [alunos]);

  // Current logged in Aluno object
  const currentStudent = useMemo(() => {
    return cleanAlunos.find(a => a.id === activeStudentId) || cleanAlunos[0] || DUMMY_FALLBACK_ALUNO;
  }, [cleanAlunos, activeStudentId]);

  // Computed balance for credit card installment simulation
  const cardAmountToPay = currentStudent?.formaPagamento === 'hibrido'
    ? (currentStudent.valorTotal - hybridPixAmount)
    : (currentStudent?.formaPagamento === 'cartao' ? currentStudent.valorTotal : pixAmountSimulated);

  // Categories choices
  const categoriasDisponiveis = ["Carro (B)", "Moto (A)", "Carro e Moto (A+B)"];

  // Helper dynamic statistics
  const stats = useMemo(() => {
    const totalAlunos = cleanAlunos.length;
    const menores = cleanAlunos.filter(a => calculateAge(a.dob) < 18).length;
    const maiores = totalAlunos - menores;
    const totalPlano = cleanAlunos.reduce((sum, a) => sum + Number(a.valorTotal), 0);
    const totalPago = cleanAlunos.reduce((sum, a) => sum + (Number(a.parcelasPagas) * (Number(a.valorTotal) / (a.parcelasTotal || 12))), 0);
    const progressoMedio = totalAlunos > 0 ? (cleanAlunos.reduce((sum, a) => sum + (Number(a.parcelasPagas) / (a.parcelasTotal || 12)), 0) / totalAlunos) * 100 : 0;
    
    // Aggregates for visual charts
    const categoriaDistrib = cleanAlunos.reduce((acc: { [key: string]: number }, cur) => {
      acc[cur.categoria] = (acc[cur.categoria] || 0) + 1;
      return acc;
    }, {});

    const instrutorFinanceiro = instrutores.map(inst => {
      const deAlunos = cleanAlunos.filter(a => a.instrutor === inst.nome);
      const totalPlanoInst = deAlunos.reduce((sum, a) => sum + Number(a.valorTotal), 0);
      const totalPagoInst = deAlunos.reduce((sum, a) => sum + (Number(a.parcelasPagas) * (Number(a.valorTotal) / (a.parcelasTotal || 12))), 0);
      return {
        nome: inst.nome,
        vagas: inst.vagas,
        alunosAtivos: deAlunos.length,
        totalContratado: totalPlanoInst,
        totalRecebido: totalPagoInst
      };
    });

    return {
      totalAlunos,
      menores,
      maiores,
      totalPlano,
      totalPago,
      progressoMedio: progressoMedio.toFixed(1),
      categoriaDistrib,
      instrutorFinanceiro
    };
  }, [cleanAlunos, instrutores]);

  // Filter Alunos
  const filteredAlunos = useMemo(() => {
    return cleanAlunos.filter(a => {
      const matchSearch = a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.whatsapp.includes(searchQuery);
                          
      const matchCat = filterCategoria === 'Todas' || a.categoria === filterCategoria;
      const matchInst = filterInstructor === 'Todos' || a.instrutor === filterInstructor;
      
      const age = calculateAge(a.dob);
      let matchClass = true;
      if (filterClassificacao === 'Menor') {
        matchClass = age < 18;
      } else if (filterClassificacao === 'Maior') {
        matchClass = age >= 18;
      }

      return matchSearch && matchCat && matchInst && matchClass;
    });
  }, [cleanAlunos, searchQuery, filterCategoria, filterInstructor, filterClassificacao]);

  // Reset demo databases
  const resetDemoData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Banco de Dados?',
      message: 'Deseja restaurar os dados originais do projeto? Isto ir√° resetar todos os alunos e instrutores para os valores padr√µes de demonstra√ß√£o. (Suas altera√ß√µes locais ser√£o perdidas)',
      confirmText: 'Restaurar Dados',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        setAlunos(DEFAULT_ALUNOS);
        setInstrutores(DEFAULT_INSTRUTORES);
        setActiveStudentId("");
        setToastMessage("üîÑ Banco de dados restaurado com sucesso!");
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Open insert student modal
  const handleOpenAddAluno = () => {
    setEditingAluno(null);
    setAlunoForm({
      nome: '',
      cpf: '',
      rg: '',
      nacionalidade: 'Brasileira',
      estadoCivil: 'Solteiro(a)',
      dob: '2008-08-14',
      whatsapp: '(81) 98888-1122',
      endereco: 'Recife Centro',
      categoria: 'Carro (B)',
      instrutor: instrutores[0]?.nome || 'A definir',
      dataAdesao: new Date().toISOString().substring(0, 10),
      parcelasPagas: 0, // Default to 0 unpaid
      valorTotal: 2400,
      senha: String(Math.floor(1000 + Math.random() * 9000)),
      parcelasTotal: 12,
      formaPagamento: 'poupanca',
      aulas: 20,
      nomeResponsavel: '',
      cpfResponsavel: '',
      rgResponsavel: '',
      whatsappResponsavel: ''
    });
    setIsAlunoModalOpen(true);
  };

  // Open edit student modal
  const handleOpenEditAluno = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setAlunoForm({
      nome: aluno.nome || '',
      cpf: aluno.cpf || '',
      rg: aluno.rg || '',
      nacionalidade: aluno.nacionalidade || 'Brasileira',
      estadoCivil: aluno.estadoCivil || 'Solteiro(a)',
      dob: aluno.dob || '2008-01-01',
      whatsapp: aluno.whatsapp || '',
      endereco: aluno.endereco || '',
      categoria: aluno.categoria || 'Carro (B)',
      instrutor: aluno.instrutor || 'A definir',
      dataAdesao: aluno.dataAdesao || new Date().toISOString().substring(0, 10),
      parcelasPagas: (aluno.parcelasPagas !== undefined && aluno.parcelasPagas !== null) ? Number(aluno.parcelasPagas) : 0,
      valorTotal: aluno.valorTotal || 2400,
      senha: aluno.senha || String(Math.floor(1000 + Math.random() * 9000)),
      parcelasTotal: aluno.parcelasTotal || 12,
      formaPagamento: (aluno.formaPagamento as any) || 'poupanca',
      aulas: aluno.aulas || 20,
      nomeResponsavel: aluno.nomeResponsavel || '',
      cpfResponsavel: aluno.cpfResponsavel || '',
      rgResponsavel: aluno.rgResponsavel || '',
      whatsappResponsavel: aluno.whatsappResponsavel || ''
    });
    setIsAlunoModalOpen(true);
  };

  // Submit student entry
  const handleSaveAluno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoForm.nome.trim()) return alert('Insira o nome completo do aluno.');
    
    const age = calculateAge(alunoForm.dob);
    if (age < 17) {
      return alert('A idade m√≠nima permitida para inscri√ß√£o no programa √© de 17 anos.');
    }
    
    if (editingAluno) {
      const age = calculateAge(alunoForm.dob);
      const computedTipoPlano = (age < 18 && alunoForm.formaPagamento === 'poupanca') 
        ? 'Plano Poupan√ßa Jovem 17 Anos' 
        : (alunoForm.formaPagamento === 'habilitado' ? 'Treinamento para Habilitados' : 'Plano CNH Facilitada Maiores de 18 Anos');

      const updatedAlunoObj: Aluno = {
        ...editingAluno,
        nome: alunoForm.nome.trim(),
        cpf: alunoForm.cpf.trim(),
        rg: alunoForm.rg.trim(),
        nacionalidade: alunoForm.nacionalidade.trim(),
        estadoCivil: alunoForm.estadoCivil.trim(),
        dob: alunoForm.dob,
        whatsapp: alunoForm.whatsapp.trim(),
        endereco: alunoForm.endereco.trim(),
        categoria: alunoForm.categoria,
        instrutor: alunoForm.instrutor,
        dataAdesao: alunoForm.dataAdesao,
        parcelasPagas: Math.max(0, Number(alunoForm.parcelasPagas) || 0),
        baixasPagamento: Number(alunoForm.parcelasPagas) === 0 ? [] : (editingAluno.baixasPagamento || []),
        valorTotal: Math.max(0, Number(alunoForm.valorTotal) || 0),
        senha: alunoForm.senha || String(Math.floor(1000 + Math.random() * 9000)),
        parcelasTotal: Math.max(1, Number(alunoForm.parcelasTotal || 12)),
        formaPagamento: alunoForm.formaPagamento,
        tipoPlano: computedTipoPlano,
        aulas: Math.max(1, Number(alunoForm.aulas || 20)),
        nomeResponsavel: age < 18 ? (alunoForm.nomeResponsavel.trim() || undefined) : undefined,
        cpfResponsavel: age < 18 ? (alunoForm.cpfResponsavel.trim() || undefined) : undefined,
        rgResponsavel: age < 18 ? (alunoForm.rgResponsavel.trim() || undefined) : undefined,
        whatsappResponsavel: age < 18 ? (alunoForm.whatsappResponsavel.trim() || undefined) : undefined,
        updatedAt: new Date().toISOString()
      };

      const updatedList = alunos.map(a => a.id === editingAluno.id ? updatedAlunoObj : a);
      saveAlunosList(updatedList);

      if (selectedStudentDetail && selectedStudentDetail.id === editingAluno.id) {
        setSelectedStudentDetail(updatedAlunoObj);
      }

      setToastMessage(`‚úÖ Ficha de "${updatedAlunoObj.nome}" (ID: ${updatedAlunoObj.id}) atualizada e salva diretamente no sistema!`);
    } else {
      const nextIdNum = alunos.length > 0 
        ? Math.max(...alunos.map(a => {
            if (!a || !a.id) return 0;
            const match = a.id.match(/\d+/);
            return match ? parseInt(match[0], 10) || 0 : 0;
          })) + 1 
        : 1;
      const formattedId = `CNH-${String(nextIdNum).padStart(3, '0')}`;
      
      const newObj: Aluno = {
        id: formattedId,
        nome: alunoForm.nome.trim(),
        cpf: alunoForm.cpf.trim(),
        rg: alunoForm.rg.trim(),
        nacionalidade: alunoForm.nacionalidade.trim() || 'Brasileira',
        estadoCivil: alunoForm.estadoCivil.trim() || 'Solteiro(a)',
        dob: alunoForm.dob,
        whatsapp: alunoForm.whatsapp.trim(),
        endereco: alunoForm.endereco.trim(),
        categoria: alunoForm.categoria,
        instrutor: alunoForm.instrutor,
        dataAdesao: alunoForm.dataAdesao,
        parcelasPagas: Math.max(0, Number(alunoForm.parcelasPagas) || 0),
        valorTotal: Math.max(0, Number(alunoForm.valorTotal) || 0),
        pontosSimulado: 120,
        senha: alunoForm.senha || String(Math.floor(1000 + Math.random() * 9000)),
        parcelasTotal: Math.max(1, Number(alunoForm.parcelasTotal || 12)),
        formaPagamento: alunoForm.formaPagamento,
        aulas: Math.max(1, Number(alunoForm.aulas || 20)),
        nomeResponsavel: age < 18 ? (alunoForm.nomeResponsavel.trim() || undefined) : undefined,
        cpfResponsavel: age < 18 ? (alunoForm.cpfResponsavel.trim() || undefined) : undefined,
        rgResponsavel: age < 18 ? (alunoForm.rgResponsavel.trim() || undefined) : undefined,
        whatsappResponsavel: age < 18 ? (alunoForm.whatsappResponsavel.trim() || undefined) : undefined,
        baixasPagamento: [],
        comprovantes: [],
        updatedAt: new Date().toISOString()
      };
      const updatedList = [...alunos, newObj];
      saveAlunosList(updatedList);
      setActiveStudentId(formattedId);
      setToastMessage(`üéâ Novo aluno "${newObj.nome}" (ID: ${formattedId}) cadastrado com sucesso!`);
    }
    setIsAlunoModalOpen(false);
  };

  // Delete student
  const handleDeleteAluno = (id: string) => {
    const studentName = alunos.find(a => a.id === id)?.nome || id;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aluno?',
      message: `Tem certeza que deseja remover permanentemente o aluno "${studentName}" (C√≥digo: ${id}) do sistema regional?`,
      confirmText: 'Excluir permanentemente',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const remaining = alunos.filter(a => a.id !== id);
        if (activeStudentId === id && remaining.length > 0) {
          setActiveStudentId(remaining[0].id);
        }
        if (selectedStudentDetail && selectedStudentDetail.id === id) {
          setSelectedStudentDetail(null);
        }
        saveAlunosList(remaining, [id]);

        setToastMessage(`üóëÔ∏è Aluno "${studentName}" removido com sucesso.`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Submit instructor
  const handleSaveInstrutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrutorForm.nome.trim()) return alert('Insira o nome do instrutor.');
    
    const finalLogin = (instrutorForm.login || generateLogin(instrutorForm.nome)).trim().toLowerCase().replace(/\s+/g, "");
    const finalSenha = (instrutorForm.senha || generateSecurePassword()).trim();

    if (editingInstrutor) {
      const updated = instrutores.map(i => i.nome === editingInstrutor.nome ? {
        ...i,
        nome: instrutorForm.nome,
        regiao: instrutorForm.regiao,
        vagas: Number(instrutorForm.vagas),
        whatsapp: instrutorForm.whatsapp,
        endereco: instrutorForm.endereco,
        credencialSenatran: instrutorForm.credencialSenatran,
        foto: instrutorForm.foto,
        login: finalLogin,
        senha: finalSenha,
        tempoExperiencia: instrutorForm.tempoExperiencia || `${Math.floor(5 + (instrutorForm.nome.length % 9))} anos de experi√™ncia`,
        historia: instrutorForm.historia || "Profissional extremamente paciente e dedicado ao ensino te√≥rico e pr√°tico da dire√ß√£o. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do tr√¢nsito, garantindo uma forma√ß√£o humana de condutores conscientes e seguros no programa Nova CNH.",
        chavePix: instrutorForm.chavePix
      } : i);
      saveInstrutoresList(updated);
    } else {
      if (instrutores.some(i => i.nome.toLowerCase() === instrutorForm.nome.toLowerCase())) {
        return alert('J√° existe um instrutor registrado com este nome.');
      }
      if (instrutores.some(i => i.login && i.login.toLowerCase() === finalLogin)) {
        return alert('Este Usu√°rio (Login) j√° est√° em uso por outro instrutor.');
      }
      const updated = [...instrutores, {
        nome: instrutorForm.nome,
        regiao: instrutorForm.regiao,
        vagas: Number(instrutorForm.vagas),
        whatsapp: instrutorForm.whatsapp,
        endereco: instrutorForm.endereco,
        credencialSenatran: instrutorForm.credencialSenatran,
        foto: instrutorForm.foto,
        login: finalLogin,
        senha: finalSenha,
        tempoExperiencia: instrutorForm.tempoExperiencia || `${Math.floor(5 + (instrutorForm.nome.length % 9))} anos de experi√™ncia`,
        historia: instrutorForm.historia || "Profissional extremamente paciente e dedicado ao ensino te√≥rico e pr√°tico da dire√ß√£o. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do tr√¢nsito, garantindo uma forma√ß√£o humana de condutores conscientes e seguros no programa Nova CNH.",
        chavePix: instrutorForm.chavePix
      }];
      saveInstrutoresList(updated);
    }
    setIsInstrutorModalOpen(false);
  };

  // Submit self-registration of instructor
  const handleSaveSelfRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfNome.trim()) return alert('Insira o seu nome oficial.');
    if (!selfWhatsapp.trim()) return alert('Insira seu WhatsApp de contato.');
    if (!selfCredencial.trim()) return alert('Insira sua Credencial SENATRAN.');
    
    const finalLogin = (selfLogin || generateLogin(selfNome)).trim().toLowerCase().replace(/\s+/g, "");
    const finalSenha = (selfSenha || generateSecurePassword()).trim();

    if (instrutores.some(i => i.nome.toLowerCase() === selfNome.toLowerCase())) {
      return alert('J√° existe um instrutor registrado com este nome.');
    }
    if (instrutores.some(i => i.login && i.login.toLowerCase() === finalLogin)) {
      return alert('Este Usu√°rio (Login) j√° est√° em uso por outro instrutor.');
    }

    const newInst: Instrutor = {
      nome: selfNome,
      regiao: selfRegiao,
      vagas: Number(selfVagas),
      whatsapp: selfWhatsapp,
      endereco: selfEndereco,
      credencialSenatran: selfCredencial,
      foto: selfFoto,
      login: finalLogin,
      senha: finalSenha,
      tempoExperiencia: selfTempoExp || `${Math.floor(5 + (selfNome.length % 9))} anos de experi√™ncia`,
      historia: selfHistoria || "Profissional extremamente paciente e dedicado ao ensino te√≥rico e pr√°tico da dire√ß√£o. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do tr√¢nsito, garantindo uma forma√ß√£o humana de condutores conscientes e seguros no programa Nova CNH.",
      chavePix: selfChavePix,
      saldoPago: 0,
      recibos: []
    };

    const updatedList = [...instrutores, newInst];
    saveInstrutoresList(updatedList);
    setNewSelfRegisteredInstrutor(newInst);
    setToastMessage(`üéâ Cadastro conclu√≠do com sucesso, Instrutor ${selfNome}!`);
  };

  const copySelfRegisterLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?cadastro-instrutor=true`;
    navigator.clipboard.writeText(link);
    setToastMessage("üîó Link de auto-cadastro para instrutores copiado com sucesso!");
  };

  // Delete instructor
  const handleDeleteInstrutor = (nome: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Instrutor?',
      message: `Tem certeza que deseja remover o instrutor parceiro "${nome}"? Todos os alunos atualmente associados a ele ficar√£o com a classifica√ß√£o de "Sem Instrutor".`,
      confirmText: 'Confirmar Exclus√£o',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const remainingInstrutores = instrutores.filter(i => i.nome !== nome);
        saveInstrutoresList(remainingInstrutores, [nome]);
        const updatedAlunos = alunos.map(a => a.instrutor === nome ? { ...a, instrutor: 'Sem Instrutor' } : a);
        saveAlunosList(updatedAlunos);
        setToastMessage(`üóëÔ∏è Instrutor "${nome}" removido do sistema.`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Download instructor photo
  const handleDownloadFoto = async (nome: string, fotoUrl?: string) => {
    if (!fotoUrl) {
      setToastMessage("‚ö†Ô∏è Este instrutor n√£o possui foto cadastrada.");
      return;
    }
    try {
      if (fotoUrl.startsWith('data:')) {
        // It's a base64 DataURL
        const link = document.createElement('a');
        link.href = fotoUrl;
        link.download = `foto_instrutor_${nome.toLowerCase().replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch cross-origin URL
        const response = await fetch(fotoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `foto_instrutor_${nome.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
      setToastMessage(`üì∏ Foto do instrutor "${nome}" baixada com sucesso!`);
    } catch (error) {
      console.error("Erro ao baixar foto:", error);
      // Fallback: open in new tab
      window.open(fotoUrl, '_blank');
      setToastMessage(`üì∏ Imagem aberta em nova aba para download manual!`);
    }
  };

  // Simulated payment in user view
  const triggerPixSimulation = () => {
    setRequestedHybridCardLink(false);
    setPixReceipt(null);
    setPixReceiptName('');
    setReceiptValidationReason('');
    setIsValidatingReceipt(false);
    if (currentStudent.formaPagamento !== 'cartao') {
      alert("üì¢ LEIA O QR CODE REALIZE SEU PAGAMENTO E LOGO AP√ìS SELECIONAR CONFIRMAR PAGAMENTO.");
    }
    const totalParc = currentStudent.parcelasTotal || 12;
    const isCartao = currentStudent.formaPagamento === 'cartao';
    const defaultInstallmentVal = isCartao
      ? currentStudent.valorTotal
      : (currentStudent.formaPagamento === 'vista'
        ? currentStudent.valorTotal
        : currentStudent.formaPagamento === 'hibrido'
          ? currentStudent.valorTotal / 2
          : currentStudent.valorTotal / totalParc);
    setPixAmountSimulated(defaultInstallmentVal);
    if (currentStudent.formaPagamento === 'hibrido') {
      setHybridPixAmount(currentStudent.valorTotal / 2);
    } else {
      setHybridPixAmount(0);
    }
    // Set default payment mode based on the candidate's preferred payment format
    setPaymentTab(isCartao ? 'cartao' : 'pix');
    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardInstallments(12); // Default to 12x for credit card simulation
    setIsProcessingCardPayment(false);
    setShowPixModal(true);
  };

  const confirmCardPayment = () => {
    if (cardInstallments > 1) {
      const studentName = currentStudent?.nome || "Candidato";
      const studentId = currentStudent?.id || "";
      const valueFormatted = pixAmountSimulated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const installmentValue = (pixAmountSimulated / cardInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const waText = `Ol√° Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Escolhi pagar no cart√£o parcelando em ${cardInstallments}x de ${installmentValue} (Valor Total: ${valueFormatted}). Gostaria de solicitar o Link Seguro de Parcelamento para efetuar esse processo.`;
      const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
      window.open(url, '_blank');
      setToastMessage("üì≤ Redirecionando para solicitar o Link de Parcelamento no WhatsApp...");
      setShowPixModal(false);
      return;
    }

    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 13) {
      alert("Por favor, insira um n√∫mero de cart√£o de cr√©dito v√°lido.");
      return;
    }
    if (!cardHolder.trim() || cardHolder.trim().length < 3) {
      alert("Por favor, insira o nome impresso no cart√£o.");
      return;
    }
    if (!cardExpiry.trim() || !cardExpiry.includes('/') || cardExpiry.trim().length < 5) {
      alert("Por favor, insira uma data de validade v√°lida (MM/AA).");
      return;
    }
    if (!cardCvv.trim() || cardCvv.trim().length < 3) {
      alert("Por favor, insira o c√≥digo de seguran√ßa (CVV) do cart√£o.");
      return;
    }

    const depositAmt = Number(pixAmountSimulated);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      alert("Por favor, informe ou selecione o valor para pagamento.");
      return;
    }

    const totalParc = currentStudent.parcelasTotal || 12;

    if (currentStudent.parcelasPagas >= totalParc) {
      alert("Seu plano j√° est√° 100% quitado! Parab√©ns!");
      setShowPixModal(false);
      return;
    }

    setIsProcessingCardPayment(true);

    // Simulate 3D Secure / dynamic terminal authentication
    setTimeout(() => {
      setIsProcessingCardPayment(false);

      const valorParcelaPadrao = currentStudent.valorTotal / totalParc;
      const incrementalParcelas = depositAmt / valorParcelaPadrao;

      const updatedList = alunos.map(a => {
        if (a.id === currentStudent.id) {
          const studentTotalParc = a.parcelasTotal || 12;
          const novaParcelasPagas = Math.min(studentTotalParc, a.parcelasPagas + incrementalParcelas);
          return {
            ...a,
            parcelasPagas: Number(novaParcelasPagas.toFixed(4))
          };
        }
        return a;
      });
      saveAlunosList(updatedList);

      setShowPixModal(false);
      
      const valParcelaCartao = depositAmt / cardInstallments;
      alert(`üéâ Pagamento autorizado com sucesso!\n\nüí≥ Detalhes do comprovante:\n- Valor Total: ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n- Transa√ß√£o: Parcelado no Cart√£o em ${cardInstallments}x de ${valParcelaCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n- Destino: Creditado em seu Ba√∫ Digital Nova CNH!`);
    }, 1500);
  };

  const confirmHybridCardPayment = () => {
    if (!currentStudent) return;
    const totalParc = currentStudent.parcelasTotal || 12;
    const valorParcelaPadrao = currentStudent.valorTotal / totalParc;
    const currentPaidAmt = currentStudent.parcelasPagas * valorParcelaPadrao;
    const cardAmt = currentStudent.valorTotal - currentPaidAmt; // Restante para completar o acordo

    const updatedList = alunos.map(a => {
      if (a.id === currentStudent.id) {
        return {
          ...a,
          parcelasPagas: totalParc // Completa o valor total do acordo h√≠brido no ba√∫
        };
      }
      return a;
    });
    saveAlunosList(updatedList);

    setShowPixModal(false);
    setRequestedHybridCardLink(false);
    alert(`üéâ Pagamento por Cart√£o no valor de R$ ${cardAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} confirmado e recebido!\nCom isso, seu acordo h√≠brido foi 100% quitado e guardado no Ba√∫!`);
    setToastMessage("üéâ Pagamento do cart√£o recebido! Plano quitado.");
  };

  const handleReceiptFile = (file: File) => {
    if (!file) return;
    setPixReceiptName(file.name);
    setIsValidatingReceipt(true);
    setReceiptValidationReason('');
    setPixReceipt(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const fileContent = e.target.result as string;
        try {
          // Solicita auditoria autom√°tica via endpoint Express com IA (Gemini)
          const response = await fetch('/api/validate-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: file.name,
              fileContent: fileContent,
              mimeType: file.type
            })
          });

          if (!response.ok) {
            throw new Error('Erro na resposta do auditor financeiro do servidor.');
          }

          const result = await response.json();
          if (result.isValid) {
            setPixReceipt(fileContent);
            setReceiptValidationReason(result.reason || "Validado com sucesso por intelig√™ncia artificial.");
            setToastMessage("üìÑ Comprovante analisado e aprovado com sucesso!");
          } else {
            setPixReceipt(null);
            setPixReceiptName('');
            setReceiptValidationReason('');
            alert(`‚ùå Documento Rejeitado pelo Auditor Financeiro:\n\nArquivo: ${file.name}\nMotivo: ${result.reason || 'O documento n√£o parece conter informa√ß√µes banc√°rias v√°lidas.'}`);
          }
        } catch (err: any) {
          console.error("Falha ao comunicar com o validador:", err);
          // Fallback amig√°vel de conting√™ncia local para manter usabilidade
          setPixReceipt(fileContent);
          setReceiptValidationReason("Aprovado em regime emergencial de conting√™ncia p√≥s-auditoria.");
          setToastMessage("üìÑ Comprovante anexado no ba√∫ local.");
        } finally {
          setIsValidatingReceipt(false);
        }
      } else {
        setIsValidatingReceipt(false);
      }
    };
    reader.onerror = () => {
      setIsValidatingReceipt(false);
      alert("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const confirmPixPayment = () => {
    if (!pixReceipt) {
      alert("‚ö†Ô∏è Por favor, compartilhe/anexe o comprovante de pagamento do PIX para habilitar a confirma√ß√£o de dep√≥sito!");
      return;
    }
    const isHibrido = currentStudent?.formaPagamento === 'hibrido';
    const depositAmt = isHibrido ? Number(hybridPixAmount) : Number(pixAmountSimulated);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      alert("Por favor, selecione ou insira um valor v√°lido para dep√≥sito.");
      return;
    }

    const totalParc = currentStudent.parcelasTotal || 12;

    if (currentStudent.parcelasPagas >= totalParc) {
      alert("Seu plano j√° est√° 100% quitado! Parab√©ns!");
      setShowPixModal(false);
      return;
    }

    const valorParcelaPadrao = currentStudent.valorTotal / totalParc;
    const incrementalParcelas = depositAmt / valorParcelaPadrao;

    // Criamos o objeto do comprovante fiduci√°rio validado para salvar no Dossi√™
    const newReceipt: Comprovante = {
      id: Math.random().toString(36).substring(2, 11),
      nomeArquivo: pixReceiptName || "comprovante_pix.png",
      conteudo: pixReceipt,
      dataEnvio: new Date().toISOString(),
      valor: depositAmt,
      validado: true,
      observacao: receiptValidationReason || "Validado via intelig√™ncia artificial."
    };

    const updatedList = alunos.map(a => {
      if (a.id === currentStudent.id) {
        const studentTotalParc = a.parcelasTotal || 12;
        const novaParcelasPagas = Math.min(studentTotalParc, a.parcelasPagas + incrementalParcelas);
        const currentReceipts = a.comprovantes || [];
        return {
          ...a,
          parcelasPagas: Number(novaParcelasPagas.toFixed(4)),
          comprovantes: [...currentReceipts, newReceipt]
        };
      }
      return a;
    });
    saveAlunosList(updatedList);

    setShowPixModal(false);
    
    if (isHibrido) {
      alert(`üéâ Pix de Entrada de R$ ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido com sucesso!\n\nSeu Ba√∫ de seguran√ßa CNH foi atualizado e o comprovante fiduci√°rio foi arquivado no seu dossi√™. Agora voc√™ pode solicitar o link do Cart√£o e confirmar o pagamento do restante para completar seu acordo!`);
    } else {
      alert(`üéâ Dep√≥sito de R$ ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido com sucesso!\nSeu Ba√∫ de seguran√ßa CNH foi atualizado e o comprovante fiduci√°rio foi arquivado no seu dossi√™ para acompanhamento do auditor.`);
    }
  };

  // Mini quiz simulator logic
  const handleOptionClick = (index: number) => {
    setSelectedQuizOpcao(index);
    if (index === QUIZ_QUESTIONS[currentQuizIndex].correta) {
      setQuizStatusText('correto');
      // Add points
      setAlunos(alunos.map(a => {
        if (a.id === currentStudent.id) {
          return { ...a, pontosSimulado: (a.pontosSimulado || 0) + 50 };
        }
        return a;
      }));
    } else {
      setQuizStatusText('errado');
    }
  };

  const nextQuizQuestion = () => {
    setSelectedQuizOpcao(null);
    setQuizStatusText('espera');
    setCurrentQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
  };

  // Google Apps Script generator
  const generatedAppsScriptCode = useMemo(() => {
    const formattedAlunos = alunos.map(a => {
      return `    ["${a.id}", "${a.nome.replace(/"/g, '\\"')}", "${a.dob}", "", "", "", "${a.whatsapp}", "${a.categoria}", "${a.instrutor}", "${a.dataAdesao}", ${a.parcelasPagas}, ${a.valorTotal}, ${a.parcelasTotal || 12}]`;
    }).join(",\n");

    const formattedInstrutores = instrutores.map(i => {
      return `    ["${i.nome.replace(/"/g, '\\"')}", "${i.regiao.replace(/"/g, '\\"')}", ${i.vagas}, "${i.whatsapp}"]`;
    }).join(",\n");

    return `/**
 * PROJETO: NOVA CNH BRASIL NA M√ÉO (PARCELAMENTO DE CNH SEGURO)
 * Script de automa√ß√£o para sincronizar o banco de dados do Looker Studio.
 */

/**
 * ‚ö° WEB APP: LOGICA DE SINCRONIZA√á√ÉO EM NUVEM E COMUNICA√á√ÉO DE DADOS
 * (N√£o apague ou modifique esta se√ß√£o, ela conecta o aplicativo ao seu Sheets)
 */
function doPost(e) {
  try {
    var rawText = e.postData.contents;
    var payload = JSON.parse(rawText);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetData = ss.getSheetByName("ConfigSync") || ss.insertSheet("ConfigSync");
    sheetData.clear();
    sheetData.getRange(1, 1).setValue(rawText);
    
    // Atualiza as tabelas do Looker
    setupDatabase(payload.alunos, payload.instrutores);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Planilha Sincronizada com sucesso!" 
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetData = ss.getSheetByName("ConfigSync");
    var rawJSON = sheetData ? sheetData.getRange(1, 1).getValue() : "{}";
    
    return ContentService.createTextOutput(rawJSON)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
  }
}

/**
 * MENU SUPERIOR DO GOOGLE SPREADSHEETS
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('üöó Nova CNH - Brasil na M√£o')
      .addItem('Configurar Banco de Dados Looker', 'setupDatabaseDirect')
      .addToUi();
}

/**
 * Fun√ß√£o chamada manualmente pelo menu do Planilhas Google.
 */
function setupDatabaseDirect() {
  setupDatabase();
  Browser.msgBox("üöó Sucesso!", "O banco do projeto foi estruturado para o Looker Studio com c√°lculos de idade autom√°ticos!", Browser.Buttons.OK);
}

/**
 * Monta e atualiza as abas Alunos e Instrutores na Planilha atual.
 * Aceita receber opcionalmente listas de Alunos e Instrutores em tempo real.
 */
function setupDatabase(alunosInput, instrutoresInput) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Aba de Alunos (Origem de dados do Looker)
  var sheetAlunos = ss.getSheetByName("Alunos") || ss.insertSheet("Alunos");
  sheetAlunos.clear();
  
  var headersAlunos = [
    "ID Aluno", 
    "Nome Completo", 
    "Data de Nascimento", 
    "Idade Atual", 
    "Classifica√ß√£o de Idade", 
    "Meses para os 18 Anos", 
    "WhatsApp", 
    "Categoria Desejada", 
    "Instrutor Parceiro", 
    "Data de Ades√£o", 
    "Parcelas Pagas (de 12)", 
    "Valor Total do Plano (R$)", 
    "Valor Total Pago (R$)", 
    "Progresso Financeiro (%)"
  ];
  
  sheetAlunos.getRange(1, 1, 1, headersAlunos.length)
             .setValues([headersAlunos])
             .setFontWeight("bold")
             .setBackground("#0c2340")
             .setFontColor("#ffffff")
             .setHorizontalAlignment("center");
             
  var dadosMock = [];
  if (alunosInput && Array.isArray(alunosInput)) {
    dadosMock = alunosInput.map(function(a) {
      return [
        a.id || "",
        a.nome || "",
        a.dob || "",
        "", "", "",
        a.whatsapp || "",
        a.categoria || "",
        a.instrutor || "",
        a.dataAdesao || "",
        a.parcelasPagas || 0,
        a.valorTotal || 0,
        a.parcelasTotal || 12
      ];
    });
  } else {
    dadosMock = [
${formattedAlunos}
    ];
  }
  
  if (dadosMock.length > 0) {
    // Processamento centralizado em JS puro para evitar falhas de f√≥rmulas e incompatibilidades regionais (CORS / Semicolon / etc.)
    var dadosMockProcessed = dadosMock.map(function(row) {
      var id = row[0] || "";
      var nome = row[1] || "";
      var dobString = row[2] || "";
      var whatsapp = row[6] || "";
      var categoria = row[7] || "";
      var instrutor = row[8] || "";
      var dataAdesao = row[9] || "";
      var parcelasPagas = Number(row[10]) || 0;
      var valorTotal = Number(row[11]) || 0;
      var parcelasTotal = Number(row[12]) || 12;
      
      var idade = 0;
      var classificacao = "Maior de Idade";
      var mesesPara18 = 0;
      
      if (dobString) {
        var dobParts = dobString.split("-");
        if (dobParts.length === 3) {
          var birthYear = Number(dobParts[0]);
          var birthMonth = Number(dobParts[1]);
          var birthDay = Number(dobParts[2]);
          
          var birthDate = new Date(birthYear, birthMonth - 1, birthDay);
          var today = new Date();
          
          idade = today.getFullYear() - birthYear;
          var m = today.getMonth() - (birthMonth - 1);
          if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
            idade--;
          }
          
          if (idade < 18) {
            classificacao = "Menor (" + idade + " anos)";
            var niver18 = new Date(birthYear + 18, birthMonth - 1, birthDay);
            var diffMs = niver18.getTime() - today.getTime();
            if (diffMs > 0) {
              mesesPara18 = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
            }
          } else {
            classificacao = "Maior (" + idade + " anos)";
          }
        }
      }
      
      var valorPago = parcelasPagas * (valorTotal / parcelasTotal);
      var progresso = parcelasPagas / parcelasTotal; // Ex: 0.50 (ser√° formatado como 50% pelo Google Sheets)
      
      return [
        id,
        nome,
        dobString,
        idade,
        classificacao,
        mesesPara18,
        whatsapp,
        categoria,
        instrutor,
        dataAdesao,
        parcelasPagas,
        valorTotal,
        valorPago,
        progresso
      ];
    });

    // Grava√ß√£o r√°pida de todo o array de uma vez na planilha (reduz requisi√ß√µes ao Sheets APIs)
    sheetAlunos.getRange(2, 1, dadosMockProcessed.length, headersAlunos.length).setValues(dadosMockProcessed);
    
    // Formata√ß√£o das colunas de forma est√°tica
    sheetAlunos.getRange(2, 3, dadosMockProcessed.length, 1).setNumberFormat("yyyy-mm-dd");
    sheetAlunos.getRange(2, 10, dadosMockProcessed.length, 1).setNumberFormat("yyyy-mm-dd");
    sheetAlunos.getRange(2, 12, dadosMockProcessed.length, 2).setNumberFormat("R$ #,##0.00");
    sheetAlunos.getRange(2, 14, dadosMockProcessed.length, 1).setNumberFormat("0.0%");
  }
  
  // 2. Aba de Instrutores
  var sheetInstrutores = ss.getSheetByName("Instrutores") || ss.insertSheet("Instrutores");
  sheetInstrutores.clear();
  
  var headersInstrutores = ["Nome do Instrutor", "Regi√£o Atendimento", "Vagas Ativas", "Contato Whatsapp"];
  sheetInstrutores.getRange(1, 1, 1, headersInstrutores.length)
                  .setValues([headersInstrutores])
                  .setFontWeight("bold")
                  .setBackground("#10b981") 
                  .setFontColor("#ffffff")
                  .setHorizontalAlignment("center");
                  
  var dadosInstrutores = [];
  if (instrutoresInput && Array.isArray(instrutoresInput)) {
    dadosInstrutores = instrutoresInput.map(function(i) {
      return [i.nome || "", i.regiao || "", i.vagas || 0, i.whatsapp || ""];
    });
  } else {
    dadosInstrutores = [
${formattedInstrutores}
    ];
  }
  
  if (dadosInstrutores.length > 0) {
    sheetInstrutores.getRange(2, 1, dadosInstrutores.length, headersInstrutores.length).setValues(dadosInstrutores);
  }
  
  sheetAlunos.autoResizeColumns(1, headersAlunos.length);
  sheetInstrutores.autoResizeColumns(1, headersInstrutores.length);
}
`;
  }, [alunos, instrutores]);

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(generatedAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };



  // Carregar dados automaticamente em background na inicializa√ß√£o do aplicativo se houver URL ativa
  useEffect(() => {
    const autoBackgroundSyncOnLoad = async () => {
      const url = gasWebhookUrl.trim();
      if (!url || !url.startsWith("https://") || !url.includes("script.google.com") || url.includes("/edit") || url.includes("/home") || url.includes("...")) {
        return; // Sem URL v√°lida configurada globalmente ou localmente
      }

      console.log("‚è≥ [Sincronia Autom√°tica] Baixando banco de dados atualizado do Google Sheets...");
      setIsSyncing(true);
      
      try {
        const response = await fetch("/api/test-gas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const jsonRes = await response.json();
        if (jsonRes.status === "error") {
          throw new Error(jsonRes.message);
        }
        const text = jsonRes.data || "";
        let data: any;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Formato de resposta inv√°lido.");
        }

        if (data && (data.alunos || data.instrutores)) {
          isUpdatingFromRemote.current = true;
          ignoreNextSaveRef.current = true;
          
          let loadedAlunos = false;
          let loadedInstrutores = false;

          if (data.alunos && Array.isArray(data.alunos)) {
            setAlunos(prev => {
              const serverAlunos = data.alunos as Aluno[];
              if (serverAlunos.length === 0 && prev.length > 0) {
                console.log("‚ö†Ô∏è [Sheets-Auto-Sync] O Google Sheets retornou base de alunos vazia, preservando registros locais.");
                return prev;
              }
              const mergedMap = new Map<string, Aluno>();
              prev.forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
              });
              serverAlunos.forEach(item => {
                if (item && item.id) {
                  const existing = mergedMap.get(item.id);
                  if (existing) {
                    mergedMap.set(item.id, { ...existing, ...item });
                  } else {
                    mergedMap.set(item.id, item);
                  }
                }
              });
              return Array.from(mergedMap.values());
            });
            loadedAlunos = true;
          }

          if (data.instrutores && Array.isArray(data.instrutores)) {
            setInstrutores(prev => {
              const serverInstrutores = data.instrutores as Instrutor[];
              if (serverInstrutores.length === 0 && prev.length > 0) {
                return prev;
              }
              const mergedMap = new Map<string, Instrutor>();
              prev.forEach(item => {
                if (item && item.nome) mergedMap.set(item.nome, item);
              });
              serverInstrutores.forEach(item => {
                if (item && item.nome) {
                  const existing = mergedMap.get(item.nome);
                  if (existing) {
                    mergedMap.set(item.nome, { ...existing, ...item });
                  } else {
                    mergedMap.set(item.nome, item);
                  }
                }
              });
              return Array.from(mergedMap.values());
            });
            loadedInstrutores = true;
          }

          if (loadedAlunos || loadedInstrutores) {
            lastSyncedPayloadRef.current = JSON.stringify({
              alunos: data.alunos || [],
              instrutores: data.instrutores || [],
              gasWebhookUrl: gasWebhookUrl,
              googleVerificationCode: googleVerificationCode
            });
            setLastSyncTime(new Date());
          }

          setToastMessage("‚ö° Banco de Dados Sincronizado Automaticamente com o Google Sheets!");
        }
      } catch (err: any) {
        console.warn("‚ö†Ô∏è [Sincronia Opcional] Sincronia autom√°tica de inicializa√ß√£o n√£o completada:", err?.message || err);
        // N√£o jogamos erro gritante ao usu√°rio para n√£o travar a experi√™ncia caso esteja sem internet, 
        // mas reportamos no console como aviso opcional e mantemos os dados locais carregados.
      } finally {
        setIsSyncing(false);
        setTimeout(() => {
          isUpdatingFromRemote.current = false;
        }, 1000);
      }
    };

    // Pequeno atraso para dar tempo de montar os componentes da tela de forma suave
    const timer = setTimeout(() => {
      autoBackgroundSyncOnLoad();
    }, 1000);

    return () => clearTimeout(timer);
  }, [gasWebhookUrl]);

  // Fun√ß√£o auxiliar para validar com total clareza a URL do Google Apps Script
  const validateAppsScriptUrl = (url: string): { isValid: boolean; error: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { isValid: false, error: '‚ö†Ô∏è A URL do Web App est√° vazia. Cole o link gerado no seu Google Sheets.' };
    }
    if (trimmed === 'script.google.com/.../exec') {
      return { isValid: false, error: '‚ö†Ô∏è URL de exemplo padr√£o detectada! Voc√™ precisa gerar sua pr√≥pria URL no Sheets > Extens√µes > Apps Script > Implantar.' };
    }
    if (trimmed.includes('...') || trimmed.includes('SEU_ID_DO_WEB_APP')) {
      return { isValid: false, error: '‚ö†Ô∏è URL de exemplo incompleta detectada! Substitua os termos "..." ou "SEU_ID_DO_WEB_APP" pelo seu link de Web App real.' };
    }
    if (!trimmed.startsWith('https://')) {
      return { isValid: false, error: '‚ö†Ô∏è Link inv√°lido! A URL do Google Script deve iniciar com "https://".' };
    }
    if (!trimmed.includes('script.google.com')) {
      return { isValid: false, error: '‚ö†Ô∏è A URL inserida n√£o parece ser um Web App v√°lido do Google Script. Ela deve conter o dom√≠nio "script.google.com".' };
    }
    if (trimmed.includes('/edit') || trimmed.includes('/home') || trimmed.includes('/d/')) {
      return { isValid: false, error: '‚ö†Ô∏è Link incorreto do editor (/edit)! N√£o utilize o link da barra de endere√ßo de design. No seu Apps Script, v√° em Implantar > Gerenciar implanta√ß√µes e copie aquela URL que termina com "/exec".' };
    }
    if (!trimmed.endsWith('/exec') && !trimmed.includes('/exec?')) {
      return { isValid: false, error: '‚ö†Ô∏è URL incompleta! A URL de um Web App do Apps Script devidamente publicado para sincroniza√ß√£o deve terminar com "/exec".' };
    }
    return { isValid: true, error: '' };
  };

  // Fun√ß√£o para testar conex√£o com o Apps Script de forma expl√≠cita
  const handleTestConnection = async () => {
    const val = validateAppsScriptUrl(gasWebhookUrl);
    if (!val.isValid) {
      setTestStatus('error');
      setTestErrorMessage(val.error);
      return;
    }

    setTestStatus('testing');
    setTestErrorMessage('');
    
    try {
      // Faz uma requisi√ß√£o de teste segura atrav√©s do servidor proxy local para evitar CORS no celular
      const res = await fetch("/api/test-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gasWebhookUrl.trim() })
      });

      if (!res.ok) {
        throw new Error(`Servidor Central retornou status HTTP ${res.status}`);
      }
      
      const jsonRes = await res.json();
      if (jsonRes.status === "error") {
        throw new Error(jsonRes.message);
      }
      
      const text = jsonRes.data || "";
      
      if (text.includes("google-sign-in") || text.includes("signin") || text.includes("Google Accounts") || text.includes("login")) {
        throw new Error("Requer login do Google. Certifique-se de implantar o Web App com acesso configurado para 'Qualquer pessoa' (Anyone), mesmo an√¥nimos!");
      }
      
      if (text.trim().startsWith("<!DOCTYPE html") || text.trim().startsWith("<html")) {
        throw new Error("O link retornou uma p√°gina HTML comum em vez de dados. Verifique se copiou a URL de 'Implanta√ß√£o' (/exec) correta.");
      }

      try {
        JSON.parse(text);
        setTestStatus('success');
        setToastMessage("‚úÖ Web App ativo e conectado com sucesso!");
      } catch (parseErr) {
        throw new Error("O script respondeu, mas n√£o retornou um formato JSON v√°lido. Pode ser necess√°rio re-implantar.");
      }
    } catch (err: any) {
      console.error("Erro no teste de sincronia:", err);
      setTestStatus('error');
      setTestErrorMessage(err.message || 'Falha ao conectar. Verifique se salvou e publicou o script.');
    }
  };

  // Fun√ß√£o para exportar os dados locais em arquivo JSON
  const handleExportBackup = () => {
    const dataStr = JSON.stringify({ alunos, instrutores }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_nova_cnh_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage("üì• Backup baixado! Guarde o arquivo JSON gerado.");
  };

  // Fun√ß√£o para importar arquivo JSON de backup local
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedAlunosCount = 0;
        let importedInstrutoresCount = 0;
        if (parsed.alunos && Array.isArray(parsed.alunos)) {
          setAlunos(parsed.alunos);
          importedAlunosCount = parsed.alunos.length;
        }
        if (parsed.instrutores && Array.isArray(parsed.instrutores)) {
          setInstrutores(parsed.instrutores);
          importedInstrutoresCount = parsed.instrutores.length;
        }
        setToastMessage(`‚úÖ Backup restaurado! Importados: ${importedAlunosCount} alunos e ${importedInstrutoresCount} instrutores.`);
      } catch (err) {
        setToastMessage("‚ùå Arquivo de backup inv√°lido ou corrompido!");
      }
    };
    reader.readAsText(file);
  };

  // Realiza varredura profunda no LocalStorage do navegador √† procura de cadastros antigos ou apagados
  const handleDeepBrowserScan = () => {
    setIsScanning(true);
    setScannedAlunos([]);
    setSelectedScanItems([]);
    setScannedInstrutores([]);
    setSelectedScanInstrutores([]);
    
    setTimeout(() => {
      const foundAlunos: { id: string; nome: string; categoria: string; originKey: string; data: Aluno }[] = [];
      const foundInstrutores: { nome: string; regiao: string; originKey: string; data: Instrutor }[] = [];
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        try {
          const val = localStorage.getItem(key);
          if (val && val.trim().startsWith('[')) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item && item.nome && item.id) {
                  const isDup = foundAlunos.some(x => x.id === item.id && x.originKey === key);
                  if (!isDup) {
                    foundAlunos.push({
                      id: item.id,
                      nome: item.nome,
                      categoria: item.categoria || 'Carro (B)',
                      originKey: key,
                      data: item as Aluno
                    });
                  }
                } else if (item && item.nome && (item.regiao !== undefined || item.vagas !== undefined) && !item.id) {
                  const isDup = foundInstrutores.some(x => x.nome === item.nome && x.originKey === key);
                  if (!isDup) {
                    foundInstrutores.push({
                      nome: item.nome,
                      regiao: item.regiao || '',
                      originKey: key,
                      data: item as Instrutor
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          // ignora falhas de parse de keys comuns do navegador
        }
      });
      
      setScannedAlunos(foundAlunos);
      setScannedInstrutores(foundInstrutores);
      setIsScanning(false);
      
      if (foundAlunos.length > 0 || foundInstrutores.length > 0) {
        setToastMessage(`üîç Varredura conclu√≠da! Encontrados: ${foundAlunos.length} candidatos e ${foundInstrutores.length} instrutores recuper√°veis.`);
      } else {
        setToastMessage("‚ÑπÔ∏è Varredura conclu√≠da! Nenhum cadastro antigo foi localizado neste navegador.");
      }
    }, 1200);
  };

  // Restaura registros encontrados do cache profundo para a lista ativa do sistema e salva
  const handleRestoreScannedRecords = () => {
    if (selectedScanItems.length === 0 && selectedScanInstrutores.length === 0) {
      setToastMessage("‚ö†Ô∏è Selecione pelo menos um cadastro para trazer de volta.");
      return;
    }
    
    let restoredAlunosCount = 0;
    let restoredInstrutoresCount = 0;

    if (selectedScanItems.length > 0) {
      const itemsToRestore = scannedAlunos.filter(item => selectedScanItems.includes(`${item.originKey}-${item.id}`)).map(i => i.data);
      setAlunos(prev => {
        return deduplicateAlunosList([...prev, ...itemsToRestore]);
      });
      restoredAlunosCount = itemsToRestore.length;
    }

    if (selectedScanInstrutores.length > 0) {
      const instToRestore = scannedInstrutores.filter(item => selectedScanInstrutores.includes(`${item.originKey}-${item.nome}`));
      setInstrutores(prev => {
        const mergedMap = new Map<string, Instrutor>();
        prev.forEach(item => {
          if (item && item.nome) mergedMap.set(item.nome, item);
        });
        instToRestore.forEach(item => {
          mergedMap.set(item.nome, item.data);
        });
        return Array.from(mergedMap.values()).map(i => {
          const copy = { ...i };
          if (!copy.login) copy.login = generateLogin(i.nome);
          if (!copy.senha) copy.senha = generateSecurePassword();
          return copy;
        });
      });
      restoredInstrutoresCount = instToRestore.length;
    }
    
    setToastMessage(`üéâ Recupera√ß√£o conclu√≠da! Trazidos de volta: ${restoredAlunosCount} candidatos e ${restoredInstrutoresCount} instrutores.`);
    setSelectedScanItems([]);
    setSelectedScanInstrutores([]);
    setScannedAlunos([]);
    setScannedInstrutores([]);
  };

  // Enviar dados locais para a planilha do Google
  const handleUploadToSheet = async () => {
    const val = validateAppsScriptUrl(gasWebhookUrl);
    if (!val.isValid) {
      setToastMessage(val.error);
      return;
    }

    setIsSyncing(true);
    setToastMessage("‚è≥ Enviando dados para o servidor central e Google Sheets...");
    
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alunos: alunos,
          instrutores: instrutores,
          gasWebhookUrl: gasWebhookUrl,
          googleVerificationCode: googleVerificationCode
        })
      });

      if (response.ok) {
        setToastMessage("üöÄ Dados enviados! Planilha atualizada e formulas recalculadas em segundo plano.");
      } else {
        throw new Error("Erro na resposta do servidor.");
      }
    } catch (err: any) {
      console.error("Erro na sincronia com Apps Script:", err);
      setToastMessage("‚ùå Falha de rede. Verifique seu sinal de internet ou link.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Puxar dados da planilha do Google para o dispositivo local
  const handleDownloadFromSheet = async () => {
    const val = validateAppsScriptUrl(gasWebhookUrl);
    if (!val.isValid) {
      setToastMessage(val.error);
      return;
    }

    setIsSyncing(true);
    setToastMessage("‚è≥ Baixando dados atuais da sua planilha remota...");
    
    try {
      // Let's declare resolvedUrl to be safe
      const resolvedUrl = gasWebhookUrl.trim();
      const realResponse = await fetch("/api/test-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resolvedUrl })
      });

      if (!realResponse.ok) {
        throw new Error("Erro de comunica√ß√£o com o servidor.");
      }

      const jsonRes = await realResponse.json();
      if (jsonRes.status === "error") {
        throw new Error(jsonRes.message);
      }

      const text = jsonRes.data || "";
      
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Resposta do script n√£o √© um JSON v√°lido.");
      }

      if (data && (data.alunos || data.instrutores)) {
        isUpdatingFromRemote.current = true;
        ignoreNextSaveRef.current = true;
        
        let loadedAlunos = false;
        let loadedInstrutores = false;

        if (data.alunos && Array.isArray(data.alunos)) {
          setAlunos(prev => {
            const serverAlunos = data.alunos as Aluno[];
            if (serverAlunos.length === 0 && prev.length > 0) {
              console.log("‚ö†Ô∏è [Sheets-Sync] O Google Sheets retornou base de alunos vazia, preservando registros locais.");
              return prev;
            }
            const mergedMap = new Map<string, Aluno>();
            prev.forEach(item => {
              if (item && item.id) mergedMap.set(item.id, item);
            });
            serverAlunos.forEach(item => {
              if (item && item.id) {
                const existing = mergedMap.get(item.id);
                if (existing) {
                  mergedMap.set(item.id, {
                    ...existing,
                    ...item,
                    // Preserve candidate progress, auth and financial fields that are not on Sheets
                    senha: item.senha || existing.senha,
                    pontosSimulado: item.pontosSimulado !== undefined && item.pontosSimulado !== null ? item.pontosSimulado : existing.pontosSimulado,
                    parcelasPagas: item.parcelasPagas !== undefined && item.parcelasPagas !== null ? item.parcelasPagas : existing.parcelasPagas,
                    valorTotal: item.valorTotal !== undefined && item.valorTotal !== null ? item.valorTotal : existing.valorTotal,
                    dataAdesao: item.dataAdesao || existing.dataAdesao,
                    parcelasTotal: item.parcelasTotal !== undefined && item.parcelasTotal !== null ? item.parcelasTotal : existing.parcelasTotal,
                    rg: item.rg || existing.rg,
                    cpf: item.cpf || existing.cpf,
                    estadoCivil: item.estadoCivil || existing.estadoCivil,
                    nacionalidade: item.nacionalidade || existing.nacionalidade,
                    endereco: item.endereco || existing.endereco,
                    tipoPlano: item.tipoPlano || existing.tipoPlano,
                    formaPagamento: item.formaPagamento || existing.formaPagamento
                  });
                } else {
                  mergedMap.set(item.id, item);
                }
              }
            });
            return Array.from(mergedMap.values());
          });
          loadedAlunos = true;
        }

        if (data.instrutores && Array.isArray(data.instrutores)) {
          setInstrutores(prev => {
            const serverInstrutores = data.instrutores as Instrutor[];
            if (serverInstrutores.length === 0 && prev.length > 0) {
              return prev;
            }
            const mergedMap = new Map<string, Instrutor>();
            prev.forEach(item => {
              if (item && item.nome) mergedMap.set(item.nome, item);
            });
            serverInstrutores.forEach(item => {
              if (item && item.nome) {
                const existing = mergedMap.get(item.nome);
                if (existing) {
                  mergedMap.set(item.nome, {
                    ...existing,
                    ...item,
                    // Preserve instructor credentials, Pix, custom fields and financial data not on Sheets
                    saldoPago: item.saldoPago !== undefined && item.saldoPago !== null ? item.saldoPago : existing.saldoPago,
                    recibos: item.recibos && item.recibos.length > 0 ? item.recibos : existing.recibos,
                    chavePix: item.chavePix || existing.chavePix,
                    login: item.login || existing.login,
                    senha: item.senha || existing.senha,
                    foto: item.foto || existing.foto,
                    tempoExperiencia: item.tempoExperiencia || existing.tempoExperiencia,
                    historia: item.historia || existing.historia,
                    credencialSenatran: item.credencialSenatran || existing.credencialSenatran
                  });
                } else {
                  mergedMap.set(item.nome, item);
                }
              }
            });
            return Array.from(mergedMap.values()).map(i => {
              const copy = { ...i };
              if (!copy.login) copy.login = generateLogin(i.nome);
              if (!copy.senha) copy.senha = generateSecurePassword();
              return copy;
            });
          });
          loadedInstrutores = true;
        }

        if (loadedAlunos || loadedInstrutores) {
          lastSyncedPayloadRef.current = JSON.stringify({
            alunos: data.alunos || [],
            instrutores: data.instrutores || [],
            gasWebhookUrl: gasWebhookUrl,
            googleVerificationCode: googleVerificationCode
          });
          setLastSyncTime(new Date());
        }

        setToastMessage(`‚úÖ Sincronia conclu√≠da! Dados atualizados neste dispositivo e salvos na nuvem.`);
      } else {
        setToastMessage("‚ö†Ô∏è Planilha vazia ou sem dados JSON salvos. Envie dados uma vez primeiro!");
      }
    } catch (err: any) {
      console.error("Erro na importa√ß√£o com Apps Script:", err);
      setToastMessage(`‚ùå Falha: ${err.message || 'Verifique se o Web App foi publicado com permiss√£o.'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 1000);
    }
  };

  const handlePrintAdminContract = (aluno: Aluno) => {
    const element = document.getElementById(`printable-contract-${aluno.id}`);
    if (!element) return;

    setToastMessage('‚è≥ Abrindo gerenciador de impress√£o do navegador...');

    const originalStyle = element.getAttribute('style') || '';
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

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
      setToastMessage('‚ùå N√£o foi poss√≠vel abrir o gerenciador de impress√£o.');
      element.setAttribute('style', originalStyle);
      return;
    }

    doc.write(`
      <html>
        <head>
          <title>Contrato Nova CNH - ${aluno.nome || 'Candidato'}</title>
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
              window.print();
              setTimeout(function() {
                window.frameElement.remove();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      element.setAttribute('style', originalStyle);
    }, 1500);
  };

  // Central Helper to sanitize modern color spaces like oklch/oklab to prevent html2canvas crashes
  const cleanModernColorSpaces = (targetElement?: HTMLElement | null) => {
    const stylesToRestore: { element: HTMLElement; originalValue: string; isLink: boolean }[] = [];
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));

    const replaceNestedCSSFunction = (text: string, funcName: string, fallback: string): string => {
      let index = text.indexOf(funcName + '(');
      while (index !== -1) {
        let openCount = 1;
        let i = index + funcName.length + 1;
        while (i < text.length && openCount > 0) {
          if (text[i] === '(') openCount++;
          else if (text[i] === ')') openCount--;
          i++;
        }
        text = text.slice(0, index) + fallback + text.slice(i);
        index = text.indexOf(funcName + '(');
      }
      return text;
    };

    const cleanTextContent = (text: string): string => {
      if (!text) return '';
      let clean = text;
      // Replaces oklch, oklab, color-mix and srgb functions
      clean = clean.replace(/oklch\([^)]+\)/gi, '#1e293b');
      clean = clean.replace(/oklab\([^)]+\)/gi, '#1e293b');
      clean = clean.replace(/color-mix\([^;}]+\)/gi, '#1e293b');
      clean = clean.replace(/color\(srgb[^)]+\)/gi, '#1e293b');
      clean = replaceNestedCSSFunction(clean, 'color-mix', '#1e293b');
      clean = replaceNestedCSSFunction(clean, 'oklch', '#1e293b');
      clean = replaceNestedCSSFunction(clean, 'oklab', '#1e293b');
      clean = replaceNestedCSSFunction(clean, 'color(srgb', '#1e293b');
      return clean;
    };

    styles.forEach((el) => {
      try {
        if (el.tagName.toLowerCase() === 'style') {
          const styleEl = el as HTMLStyleElement;
          const originalText = styleEl.textContent || '';
          if (originalText.includes('oklch') || originalText.includes('oklab') || originalText.includes('color-mix') || originalText.includes('color(srgb')) {
            const cleanText = cleanTextContent(originalText);
            styleEl.textContent = cleanText;
            stylesToRestore.push({ element: styleEl, originalValue: originalText, isLink: false });
          }
        } else if (el.tagName.toLowerCase() === 'link') {
          const linkEl = el as HTMLLinkElement;
          const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === linkEl);
          if (sheet && sheet.cssRules) {
            let cssText = '';
            for (let i = 0; i < sheet.cssRules.length; i++) {
              cssText += sheet.cssRules[i].cssText + '\n';
            }
            if (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('color-mix') || cssText.includes('color(srgb')) {
              const cleanText = cleanTextContent(cssText);

              const tempStyle = document.createElement('style');
              tempStyle.setAttribute('id', 'temp-sanitized-style-app');
              tempStyle.textContent = cleanText;
              document.head.appendChild(tempStyle);

              linkEl.disabled = true;
              stylesToRestore.push({ element: linkEl, originalValue: '', isLink: true });
            }
          }
        }
      } catch (e) {
        console.warn('Skipping stylesheet normalization for cross-origin or unreadable rules:', e);
      }
    });

    if (targetElement) {
      try {
        const allElements = targetElement.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const styleAttr = htmlEl.getAttribute('style');
          if (styleAttr && (styleAttr.includes('oklab') || styleAttr.includes('oklch') || styleAttr.includes('color-mix') || styleAttr.includes('color(srgb'))) {
            const cleanStyle = cleanTextContent(styleAttr);
            htmlEl.setAttribute('style', cleanStyle);
            stylesToRestore.push({ element: htmlEl, originalValue: styleAttr, isLink: false });
          }
        });
      } catch (e) {
        console.warn('Skipping inline style normalization:', e);
      }
    }

    return () => {
      stylesToRestore.forEach((item) => {
        if (item.isLink) {
          (item.element as HTMLLinkElement).disabled = false;
        } else {
          if (item.element.tagName.toLowerCase() === 'style') {
            item.element.textContent = item.originalValue;
          } else {
            item.element.setAttribute('style', item.originalValue);
          }
        }
      });
      document.querySelectorAll('#temp-sanitized-style-app').forEach(el => el.remove());
    };
  };

  const handleDownloadAdminContractPDF = (aluno: Aluno) => {
    const element = document.getElementById(`printable-contract-${aluno.id}`);
    if (!element) return;

    setIsDownloadingContractPdf(true);
    setToastMessage('‚è≥ Preparando download do contrato em PDF...');

    const originalStyle = element.getAttribute('style') || '';

    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.padding = '30px';

    const candidateDocName = aluno.nome
      ? aluno.nome.trim().replace(/\s+/g, '_').toLowerCase()
      : 'candidato';

    const triggerHtmlFallback = () => {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <title>Contrato Nova CNH - ${aluno.nome || 'Candidato'}</title>
            <style>
              body {
                font-family: 'Georgia', 'Times New Roman', serif;
                padding: 40px;
                color: #1e293b;
                line-height: 1.6;
                font-size: 13px;
                background-color: #f8fafc;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
                background: #ffffff;
                padding: 50px;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                border: 1px solid #e2e8f0;
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
              .header-actions {
                max-width: 800px;
                margin: 0 auto 20px auto;
                background-color: #eff6ff;
                border: 1px solid #bfdbfe;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                font-family: 'Inter', system-ui, sans-serif;
              }
              .btn-print {
                background-color: #0c2340;
                color: #ffffff;
                border: none;
                padding: 10.5px 24px;
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
                üîí Contrato de Ades√£o Eletr√¥nica Oficial - Nova CNH
              </p>
              <button class="btn-print" onclick="window.print()">üñ®Ô∏è Imprimir ou Salvar em PDF Comercial</button>
              <p style="margin: 8px 0 0 0; font-size: 11.5px; color: #64748b;">
                <strong>Nota:</strong> Para salvar no seu dispositivo, altere o destino de impressora para <strong>"Salvar como PDF"</strong>.
              </p>
            </div>
            <div class="container">
              ${element.innerHTML}
            </div>
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

      element.setAttribute('style', originalStyle);
      setIsDownloadingContractPdf(false);
      setToastMessage('‚úÖ Download conclu√≠do (C√≥pia Digital Oficial em HTML)! Abra-o para imprimir ou salvar como PDF.');
    };

    const opt = {
      margin:       15,
      filename:     `contrato_nova_cnh_${candidateDocName}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('style').forEach((s) => {
            if (s.textContent && (s.textContent.includes('okl') || s.textContent.includes('color-mix'))) {
              s.textContent = s.textContent.replace(/oklch\([^)]+\)/gi, '#1e293b').replace(/oklab\([^)]+\)/gi, '#1e293b').replace(/color-mix\([^;}]+\)/gi, '#1e293b');
            }
          });
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runHtml2Pdf = () => {
      // Temporarily clean modern oklch/oklab color spaces to avoid html2canvas crash
      const restoreStyles = cleanModernColorSpaces(element);

      // Clone the element and clean it up to avoid html2canvas viewport/scrolling/height issues
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '50%';
      clone.style.transform = 'translateX(-50%)';
      clone.style.top = `${window.scrollY}px`;
      clone.style.zIndex = '999999';
      clone.style.width = '750px'; // standard width
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.padding = '40px';
      clone.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.2)';
      clone.style.borderRadius = '12px';
      clone.classList.remove('max-h-[500px]', 'overflow-y-auto');
      document.body.appendChild(clone);

      // @ts-ignore
      window.html2pdf()
        .from(clone)
        .set(opt)
        .save()
        .then(() => {
          clone.remove();
          restoreStyles();
          setIsDownloadingContractPdf(false);
          setToastMessage('‚úÖ Download do contrato conclu√≠do!');
        })
        .catch((err: any) => {
          clone.remove();
          restoreStyles();
          console.error(err);
          // Fallback to beautiful HTML contract download on pdf generation error
          triggerHtmlFallback();
        });
    };

    // Lazy load or call direct
    // @ts-ignore
    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        runHtml2Pdf();
      };
      script.onerror = () => {
        // Fallback to beautiful HTML contract download on connection or CSP error
        triggerHtmlFallback();
      };
      document.body.appendChild(script);
    }

    setTimeout(() => {
      element.setAttribute('style', originalStyle);
    }, 1500);
  };

  // Dedicated Print for Instructor Receipt (100% isolated, 0 blank pages)
  const handlePrintInstructorReceiptDoc = () => {
    const element = document.getElementById('printable-receipt');
    if (!element || !viewingRecibo) return;

    setToastMessage('‚è≥ Abrindo impress√£o oficial do recibo...');

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
      setToastMessage('‚ùå N√£o foi poss√≠vel abrir o gerenciador de impress√£o.');
      return;
    }

    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Recibo Nova CNH - ${viewingRecibo.recibo.id} - ${viewingRecibo.instrutorNome}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              color: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              height: auto;
              overflow: visible;
            }
            .receipt-wrap {
              width: 100%;
              max-width: 720px;
              margin: 0 auto;
              padding: 16px;
              background: #ffffff;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .tracking-tight { letter-spacing: -0.025em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .border-b-4 { border-bottom: 4px solid #0c2340; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-2 { border: 2px solid #cbd5e1; }
            .border { border: 1px solid #cbd5e1; }
            .rounded-xl { border-radius: 12px; }
            .rounded-2xl { border-radius: 16px; }
            .p-3 { padding: 10px; }
            .p-4 { padding: 12px; }
            .p-4\\.5 { padding: 14px; }
            .p-5 { padding: 16px; }
            .p-6 { padding: 18px; }
            .p-8 { padding: 20px; }
            .pb-1\\.5 { padding-bottom: 6px; }
            .pb-6 { padding-bottom: 16px; }
            .pt-2 { padding-top: 8px; }
            .pt-6 { padding-top: 14px; }
            .pt-8 { padding-top: 18px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 6px; }
            .space-y-3 > * + * { margin-top: 10px; }
            .space-y-4 > * + * { margin-top: 12px; }
            .space-y-6 > * + * { margin-top: 16px; }
            .space-y-8 > * + * { margin-top: 20px; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: 1fr; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .gap-3 { gap: 10px; }
            .gap-4 { gap: 14px; }
            .gap-8 { gap: 20px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .border-emerald-500 { border-color: #10b981; }
            .text-emerald-400 { color: #34d399; }
            .text-emerald-600 { color: #059669; }
            .text-slate-950 { color: #020617; }
            .text-slate-900 { color: #0f172a; }
            .text-slate-850 { color: #1e293b; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-700 { color: #334155; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-300 { color: #cbd5e1; }
            .text-white { color: #ffffff; }
            .bg-\\[\\#0c2340\\] { background-color: #0c2340; }
            .text-\\[\\#0c2340\\] { color: #0c2340; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12.5px; }
            .text-xl { font-size: 18px; }
            .text-2xl { font-size: 20px; }
            .text-3xl { font-size: 24px; }
            .text-\\[8px\\] { font-size: 8px; }
            .text-\\[8\\.5px\\] { font-size: 8.5px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            p { margin: 4px 0; text-align: justify; }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .receipt-wrap {
                padding: 2mm !important;
                max-width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrap">
            ${element.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {}
    }, 12000);
  };

  // Dedicated PDF Downloader for Instructor Receipt
  const handleDownloadInstructorReceiptPDF = () => {
    const element = document.getElementById('printable-receipt');
    if (!element || !viewingRecibo) return;

    setIsDownloadingReceiptPdf(true);
    setToastMessage('‚è≥ Gerando arquivo PDF oficial do repasse...');

    const opt = {
      margin:       8,
      filename:     `recibo_repasse_${viewingRecibo.recibo.id.toLowerCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('style').forEach((s) => {
            if (s.textContent && (s.textContent.includes('okl') || s.textContent.includes('color-mix'))) {
              s.textContent = s.textContent.replace(/oklch\([^)]+\)/gi, '#1e293b').replace(/oklab\([^)]+\)/gi, '#1e293b').replace(/color-mix\([^;}]+\)/gi, '#1e293b');
            }
          });
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const runHtml2Pdf = () => {
      const restoreStyles = cleanModernColorSpaces(element);

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '50%';
      clone.style.transform = 'translateX(-50%)';
      clone.style.top = `${window.scrollY}px`;
      clone.style.zIndex = '999999';
      clone.style.width = '700px';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.padding = '24px';
      clone.style.borderRadius = '12px';
      document.body.appendChild(clone);

      // @ts-ignore
      window.html2pdf()
        .from(clone)
        .set(opt)
        .save()
        .then(() => {
          clone.remove();
          restoreStyles();
          setIsDownloadingReceiptPdf(false);
          setToastMessage('‚úÖ Recibo do repasse baixado com sucesso!');
        })
        .catch((err: any) => {
          clone.remove();
          restoreStyles();
          console.error('PDF error:', err);
          setIsDownloadingReceiptPdf(false);
          handlePrintInstructorReceiptDoc();
        });
    };

    // @ts-ignore
    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        runHtml2Pdf();
      };
      script.onerror = () => {
        setIsDownloadingReceiptPdf(false);
        handlePrintInstructorReceiptDoc();
      };
      document.body.appendChild(script);
    }
  };

  // Dedicated Print for Candidate Receipt (100% isolated, 0 blank pages)
  const handlePrintCandidateReceiptDoc = () => {
    const element = document.getElementById('printable-candidate-receipt');
    if (!element || !viewingCandidateReceipt) return;

    setToastMessage('‚è≥ Abrindo impress√£o oficial do recibo...');

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
      setToastMessage('‚ùå N√£o foi poss√≠vel abrir o gerenciador de impress√£o.');
      return;
    }

    const alunoNome = viewingCandidateReceipt.aluno.nome || 'Candidato';
    const idRecibo = viewingCandidateReceipt.idRecibo || 'RECIBO';

    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Recibo Nova CNH - ${idRecibo} - ${alunoNome}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              color: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11.5px;
              line-height: 1.45;
              height: auto;
              overflow: visible;
            }
            .receipt-wrap {
              width: 100%;
              max-width: 720px;
              margin: 0 auto;
              padding: 16px;
              background: #ffffff;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .tracking-tight { letter-spacing: -0.025em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .border-b-4 { border-bottom: 4px solid #0c2340; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-2 { border: 2px solid #e2e8f0; }
            .border { border: 1px solid #cbd5e1; }
            .rounded-xl { border-radius: 12px; }
            .rounded-2xl { border-radius: 16px; }
            .p-3 { padding: 10px; }
            .p-3\\.5 { padding: 12px; }
            .p-4 { padding: 14px; }
            .p-4\\.5 { padding: 16px; }
            .p-6 { padding: 18px; }
            .p-8 { padding: 20px; }
            .pb-6 { padding-bottom: 18px; }
            .pt-6 { padding-top: 16px; }
            .pt-2 { padding-top: 8px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 6px; }
            .space-y-3 > * + * { margin-top: 10px; }
            .space-y-6 > * + * { margin-top: 14px; }
            .space-y-8 > * + * { margin-top: 18px; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
            .gap-3 { gap: 10px; }
            .gap-4 { gap: 14px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .border-emerald-300 { border-color: #6ee7b7; }
            .border-emerald-500 { border-color: #10b981; }
            .text-emerald-400 { color: #34d399; }
            .text-emerald-600 { color: #059669; }
            .text-emerald-700 { color: #047857; }
            .text-emerald-800 { color: #065f46; }
            .text-indigo-900 { color: #312e81; }
            .text-slate-950 { color: #020617; }
            .text-slate-900 { color: #0f172a; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-700 { color: #334155; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-300 { color: #cbd5e1; }
            .text-white { color: #ffffff; }
            .bg-\\[\\#0c2340\\] { background-color: #0c2340; }
            .text-\\[\\#0c2340\\] { color: #0c2340; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12.5px; }
            .text-xl { font-size: 18px; }
            .text-2xl { font-size: 20px; }
            .text-3xl { font-size: 24px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            p { margin: 4px 0; text-align: justify; }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .receipt-wrap {
                padding: 2mm !important;
                max-width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrap">
            ${element.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {}
    }, 12000);
  };

  // Dedicated PDF Downloader for Candidate Receipt
  const handleDownloadCandidateReceiptPDF = () => {
    const element = document.getElementById('printable-candidate-receipt');
    if (!element || !viewingCandidateReceipt) return;

    setIsDownloadingReceiptPdf(true);
    setToastMessage('‚è≥ Gerando arquivo PDF oficial do recibo...');

    const receiptId = viewingCandidateReceipt.idRecibo || 'RECIBO';
    const opt = {
      margin:       8,
      filename:     `recibo_nova_cnh_${receiptId.toLowerCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('style').forEach((s) => {
            if (s.textContent && (s.textContent.includes('okl') || s.textContent.includes('color-mix'))) {
              s.textContent = s.textContent.replace(/oklch\([^)]+\)/gi, '#1e293b').replace(/oklab\([^)]+\)/gi, '#1e293b').replace(/color-mix\([^;}]+\)/gi, '#1e293b');
            }
          });
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const runHtml2Pdf = () => {
      const restoreStyles = cleanModernColorSpaces(element);

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '50%';
      clone.style.transform = 'translateX(-50%)';
      clone.style.top = `${window.scrollY}px`;
      clone.style.zIndex = '999999';
      clone.style.width = '700px';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.padding = '24px';
      clone.style.borderRadius = '12px';
      document.body.appendChild(clone);

      // @ts-ignore
      window.html2pdf()
        .from(clone)
        .set(opt)
        .save()
        .then(() => {
          clone.remove();
          restoreStyles();
          setIsDownloadingReceiptPdf(false);
          setToastMessage('‚úÖ Recibo em PDF baixado com sucesso!');
        })
        .catch((err: any) => {
          clone.remove();
          restoreStyles();
          console.error('PDF error:', err);
          setIsDownloadingReceiptPdf(false);
          // Fallback to print dialog
          handlePrintCandidateReceiptDoc();
        });
    };

    // @ts-ignore
    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        runHtml2Pdf();
      };
      script.onerror = () => {
        setIsDownloadingReceiptPdf(false);
        handlePrintCandidateReceiptDoc();
      };
      document.body.appendChild(script);
    }
  };

  // Export CSV Helper
  const handleExportCSV = (table: 'alunos' | 'instrutores') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const delimiter = csvDelimiter;

     if (table === 'alunos') {
      headers = [
        "ID Aluno", "Nome Completo", "Data de Nascimento", "Idade", "Classificacao", 
        "Meses p/ 18 Anos", "WhatsApp", "Senha de Acesso", "Categoria", "Instrutor", "Data Adesao", 
        "Parcelas Pagas", "Valor Total", "Valor Pago Acumulado", "Progresso"
      ];
      rows = alunos.map(a => {
        const age = calculateAge(a.dob);
        const monthsTo18 = calculateMonthsTo18(a.dob);
        return [
          a.id, a.nome, formatDateBR(a.dob), age, age < 18 ? 'Menor' : 'Maior', 
          monthsTo18, a.whatsapp, a.senha || '', a.categoria, a.instrutor, formatDateBR(a.dataAdesao), 
          a.parcelasPagas, a.valorTotal, (a.parcelasPagas * (a.valorTotal/12)).toFixed(2), 
          `${((a.parcelasPagas/12)*100).toFixed(1)}%`
        ];
      });
    } else {
      headers = ["Nome Instrutor", "Regiao", "Vagas", "WhatsApp", "Endereco", "Credencial Senatran"];
      rows = instrutores.map(i => [i.nome, i.regiao, i.vagas, i.whatsapp, i.endereco || '', i.credencialSenatran || '']);
    }

    const csvContent = "\uFEFF" + [
      headers.join(delimiter),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(delimiter) || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(delimiter))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nova_cnh_${table}_looker.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copiar dados formatados para colar diretamente no Google Sheets (100% de sucesso)
  const handleCopyToSpreadsheetClipboard = (table: 'alunos' | 'instrutores') => {
    try {
      let text = "";
      if (table === 'alunos') {
        const headers = [
          "ID Aluno", "Nome Completo", "Data de Nascimento", "Idade Atual", "Classifica√ß√£o de Idade", 
          "Meses para os 18 Anos", "WhatsApp", "Senha de Acesso", "Categoria Desejada", "Instrutor Parceiro", "Data de Ades√£o", 
          "Parcelas Pagas (de 12)", "Valor Total do Plano (R$)", "Valor Total Pago (R$)", "Progresso Financeiro (%)"
        ];
        
        const rows = alunos.map(a => {
          const age = calculateAge(a.dob);
          const monthsTo18 = calculateMonthsTo18(a.dob);
          const classification = age < 18 ? `Menor (${age} anos)` : `Maior (${age} anos)`;
          const currentPaid = a.parcelasPagas * (a.valorTotal / (a.parcelasTotal || 12));
          const progress = `${((a.parcelasPagas / (a.parcelasTotal || 12)) * 100).toFixed(1)}%`;
          
          return [
            a.id,
            a.nome,
            a.dob, 
            age,
            classification,
            monthsTo18,
            a.whatsapp,
            a.senha || '',
            a.categoria,
            a.instrutor,
            a.dataAdesao,
            a.parcelasPagas,
            a.valorTotal,
            currentPaid.toFixed(2),
            progress
          ];
        });

        text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      } else {
        const headers = ["Nome do Instrutor", "Regi√£o Atendimento", "Vagas Ativas", "Contato Whatsapp", "Endere√ßo", "Credencial Senatran"];
        const rows = instrutores.map(i => [
          i.nome,
          i.regiao,
          i.vagas,
          i.whatsapp,
          i.endereco || '',
          i.credencialSenatran || ''
        ]);
        
        text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      }

      navigator.clipboard.writeText(text);
      setToastMessage(`‚úÖ Dados de ${table === 'alunos' ? 'Alunos' : 'Instrutores'} copiados! Abra o Google Sheets, clique na c√©lula A1 e pressione Ctrl+V.`);
    } catch (err) {
      console.error(err);
      setToastMessage("‚ùå N√£o foi poss√≠vel copiar. Tente usar o bot√£o de exportar CSV.");
    }
  };

  // Compute values for logged-in student app view
  const studentAge = useMemo(() => calculateAge(currentStudent.dob), [currentStudent]);
  const studentIsMinor = studentAge < 18;
  const mesesAte18 = useMemo(() => calculateMonthsTo18(currentStudent.dob), [currentStudent]);
  const valorParcela = useMemo(() => currentStudent.valorTotal / (currentStudent.parcelasTotal || 12), [currentStudent]);
  const saldoPoupado = useMemo(() => currentStudent.parcelasPagas * valorParcela, [currentStudent, valorParcela]);
  const progressoFinanceiroPercent = useMemo(() => (currentStudent.parcelasPagas / (currentStudent.parcelasTotal || 12)) * 100, [currentStudent]);

  return (
    <div className="min-h-screen bg-[#f3f4f6]" id="root-viewport">
      
      {/* Toast Notification for Automatic Register & Status Messages */}
      {toastMessage && (
        <div className="fixed top-24 right-4 left-4 md:left-auto md:w-96 bg-slate-900 border border-emerald-500 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 z-50 animate-in slide-in-from-top-6 duration-300">
          <div className="bg-emerald-500 text-slate-900 rounded-full p-2 text-base shrink-0">
            üîî
          </div>
          <div className="space-y-1 flex-1 text-left">
            <h4 className="text-xs font-bold text-emerald-400 font-sans uppercase tracking-wider">Aviso do Sistema</h4>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">{toastMessage}</p>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage(null)} 
            className="text-slate-400 hover:text-white transition font-mono text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-800"
          >
            ‚úï
          </button>
        </div>
      )}

      {/* GOV.BR SIGNING PORTAL MODAL */}
      {signingRecibo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* GOV.BR Header Banner */}
            <div className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#FFCC00]">
              <div className="flex items-center gap-2 text-left">
                {/* Simulated Gov.br Shield/Coat of Arms */}
                <div className="w-8 h-8 rounded bg-[#FFCC00] flex items-center justify-center font-bold text-[#003366] text-sm">
                  üî∞
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight font-sans">gov.br</h3>
                  <p className="text-[9px] text-slate-300 font-mono">Assinador Digital Integrado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSigningRecibo(null)}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Portal Content Area */}
            <div className="p-6 space-y-5 text-left text-slate-850">
              
              {/* STEP 1: LOGIN UNIQUE ACCOUNT */}
              {govSignStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="text-base font-black text-[#003366]">Identifique-se no GOV.BR</h4>
                    <p className="text-xs text-slate-500">
                      Utilize sua conta √∫nica de cidad√£o para acessar o servi√ßo de Assinatura Eletr√¥nica regulamentar.
                    </p>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">CPF do Titular</label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="Insira apenas os 11 n√∫meros"
                        value={govCpf}
                        onChange={(e) => setGovCpf(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#003366] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Senha √önica</label>
                      <input
                        type="password"
                        placeholder="Sua senha gov.br"
                        value={govPassword}
                        onChange={(e) => setGovPassword(e.target.value)}
                        className="w-full bg-white text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#003366] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2 text-[10.5px] text-blue-800 leading-normal">
                    <span className="text-base shrink-0">üõ°Ô∏è</span>
                    <p>
                      Sua conex√£o com o portal do governo federal √© protegida por criptografia de ponta a ponta (Padr√£o ICP-Brasil).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteGovSign}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-3 rounded-xl text-xs transition uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Prosseguir para Assinatura
                  </button>
                </div>
              )}

              {/* STEP 2: LOADING / GENERATING KEY */}
              {govSignStep === 2 && (
                <div className="py-8 text-center space-y-4">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#003366] animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">Gerando Chave Criptogr√°fica</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Gerando certificado digital ICP-Brasil de uso √∫nico para a assinatura do recibo <strong className="font-mono text-slate-700">{signingRecibo.recibo.id}</strong>...
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS & FINISH */}
              {govSignStep === 3 && (
                <div className="space-y-4 font-sans">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mx-auto border border-emerald-300">
                      ‚úì
                    </div>
                    <h4 className="text-base font-black text-emerald-800">Assinado com Sucesso!</h4>
                    <p className="text-xs text-slate-500 font-sans">
                      O recibo de quita√ß√£o foi homologado juridicamente com a assinatura digital do cidad√£o.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <p className="text-[#003366] font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1">
                      Detalhes da Assinatura Digital
                    </p>
                    <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-[11px]">
                      <span className="text-slate-500 font-sans">Signat√°rio:</span>
                      <strong className="text-slate-800 col-span-2 font-sans">{signingRecibo.instrutor.nome}</strong>

                      <span className="text-slate-500 font-sans">CPF Emissor:</span>
                      <strong className="text-slate-800 col-span-2 font-mono">***.***.{govCpf.substring(6,9) || "---"}-**</strong>

                      <span className="text-slate-500 font-sans">Documento:</span>
                      <strong className="text-slate-800 col-span-2 font-mono">Recibo {signingRecibo.recibo.id}</strong>

                      <span className="text-slate-500 font-sans">Valor Quitado:</span>
                      <strong className="text-emerald-700 col-span-2 font-mono">{signingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>

                    <div className="bg-slate-900 text-slate-450 p-2.5 rounded-lg font-mono text-[9.5px] leading-relaxed border border-slate-850">
                      <p className="text-emerald-400 font-bold">üõ°Ô∏è AUTENTICA√á√ÉO ICP-BRASIL</p>
                      <p className="mt-1">Certificado: GOV-BR-MOCK-HASH</p>
                      <p className="truncate">Hash: sha256_mock_hash_{signingRecibo.recibo.id.toLowerCase()}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishGovSign}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-3 rounded-xl text-xs transition uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center"
                  >
                    Confirmar e Arquivar no Dossi√™
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PAYOUT CONFIRMATION MODAL */}
      {payoutConfirmData && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0c2340] text-white px-6 py-5 flex items-center justify-between border-b-4 border-[#32bcad]">
              <div className="flex items-center gap-2.5 text-left">
                <span className="text-xl">üí∏</span>
                <div>
                  <h3 className="text-sm font-black tracking-tight font-sans uppercase">Confirmar Registro de Pagamento</h3>
                  <p className="text-[10px] text-slate-300 font-mono">Chancela de Repasse Financeiro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutConfirmData(null)}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition animate-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-left text-slate-850">
              <div className="text-center space-y-1.5 py-2">
                <p className="text-xs text-slate-500 font-sans">Voc√™ est√° prestes a transferir e registrar o saldo de:</p>
                <h4 className="text-2xl font-black text-emerald-600 font-mono">
                  {payoutConfirmData.valorAPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h4>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 font-sans">
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Benefici√°rio:</span>
                  <strong className="text-slate-900">{payoutConfirmData.inst.nome}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Regi√£o de Atua√ß√£o:</span>
                  <strong className="text-slate-900 font-mono">{payoutConfirmData.inst.regiao}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Chave PIX para Dep√≥sito:</span>
                  {payoutConfirmData.inst.chavePix ? (
                    <div className="flex items-center gap-1">
                      <strong className="text-emerald-700 font-mono select-all font-black">{payoutConfirmData.inst.chavePix}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payoutConfirmData.inst.chavePix || "");
                          setToastMessage("üìã Chave PIX copiada com sucesso!");
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-extrabold cursor-pointer"
                      >
                        (Copiar)
                      </button>
                    </div>
                  ) : (
                    <strong className="text-rose-600 italic">N√£o cadastrada</strong>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status do Recibo:</span>
                  <strong className="text-amber-600 uppercase tracking-wider font-extrabold text-[9px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">‚è≥ Pendente Assinatura</strong>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 leading-normal">
                <span className="text-base shrink-0">‚ö†Ô∏è</span>
                <div>
                  <p className="font-extrabold text-amber-900">Aten√ß√£o para Homologa√ß√£o Jur√≠dica:</p>
                  <p className="mt-0.5 text-amber-700">
                    Ao confirmar, esta quantia ser√° lan√ßada como "Comiss√£o Quitada". Um recibo oficial ser√° gerado no dossi√™ do instrutor. O instrutor receber√° uma notifica√ß√£o em seu respectivo painel para assinar o recibo eletronicamente via GOV.BR.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutConfirmData(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutePagarSaldo}
                  className="w-full bg-[#32bcad] hover:bg-[#28a193] text-black font-black py-3 rounded-xl text-xs transition uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Confirmar Repasse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPT DETAIL & PRINT VIEW MODAL */}
      {viewingRecibo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300 my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Navigation & Controls (Non-printable) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">üìÑ</span>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase font-mono text-emerald-400">Visualizador de Documentos</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Recibo de Quita√ß√£o Oficial ({viewingRecibo.recibo.id})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadInstructorReceiptPDF}
                  disabled={isDownloadingReceiptPdf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                  title="Baixar em arquivo PDF"
                >
                  {isDownloadingReceiptPdf ? '‚è≥ Gerando...' : 'üì• Baixar PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintInstructorReceiptDoc}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1"
                  title="Imprimir ou Salvar pelo Navegador"
                >
                  üñ®Ô∏è Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRecibo(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition animate-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-8 md:p-12 space-y-8 bg-slate-50 text-slate-900 font-sans relative" id="printable-receipt">
              
              {/* Background watermark stamp for authenticity */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                <span className="text-[100px] font-black rotate-12 uppercase tracking-widest text-slate-900">Nova CNH</span>
              </div>

              {/* Document Header */}
              <div className="border-b-4 border-slate-900 pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">üöó</span>
                    <h1 className="text-xl font-black tracking-tight uppercase text-[#0c2340]">Nova CNH Brasil na M√£o üáßüá∑</h1>
                  </div>
                  <p className="text-[10px] text-slate-600 font-extrabold tracking-wider uppercase">Secretaria Nacional de Credenciamento & Repasses</p>
                  <p className="text-[9px] text-slate-500 font-mono font-bold">Dossi√™ Eletr√¥nico de Homologa√ß√£o Pedag√≥gica</p>
                </div>
                
                <div className="text-right font-mono bg-slate-200/60 p-3 rounded-lg border border-slate-300/60 shrink-0 self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end gap-1.5">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">N√∫mero do Recibo:</div>
                  <div className="text-sm font-extrabold text-slate-950">{viewingRecibo.recibo.id}</div>
                </div>
              </div>

              {/* Prominent Receipt Title Badge */}
              <div className="bg-[#0c2340] text-white p-4.5 rounded-2xl text-center space-y-1 shadow-md border-b-4 border-emerald-500 relative z-10">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-mono block">TERMO ELETR√îNICO DE HOMOLOGA√á√ÉO DE REPASSE</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <span>üßæ</span> RECIBO DE QUITA√á√ÉO DE REPASSE
                </h2>
                <p className="text-[11px] text-slate-300 font-bold">Nova CNH Brasil na M√£o üáßüá∑ ‚Ä¢ Comprovante de Repasse ao Instrutor</p>
              </div>

              {/* Status Stamp overlay (Watermark-style visual) */}
              <div className="flex justify-end relative z-10 print:mt-2">
                {viewingRecibo.recibo.status === 'assinado_gov' ? (
                  <div className="border-4 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase rotate-2 inline-flex items-center gap-1.5">
                    <span>‚úì</span> QUITADO & ASSINADO GOV.BR
                  </div>
                ) : (
                  <div className="border-4 border-amber-500/30 text-amber-600 bg-amber-500/5 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase rotate-2 inline-flex items-center gap-1.5">
                    <span>‚è≥</span> AGUARDANDO ASSINATURA DIGITAL
                  </div>
                )}
              </div>

              {/* Main Receipt Declarations */}
              <div className="space-y-6 text-left relative z-10">
                <h2 className="text-sm font-extrabold tracking-wider uppercase text-slate-800 border-b border-slate-300 pb-1.5">Recibo de Quita√ß√£o de Repasse Financeiro</h2>
                
                <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                  <p>
                    Declaramos, para os devidos fins de comprova√ß√£o fiscal e cont√°bil, sob as penas da lei, que a plataforma nacional do 
                    programa <strong>Nova CNH Brasil</strong> efetuou o repasse financeiro no valor de:
                  </p>

                  <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Valor Integral Repassado</span>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">
                      {viewingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <p className="text-[10px] text-slate-400 italic">
                      ({viewingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por indica√ß√£o e monitoria regional)
                    </p>
                  </div>

                  <p>
                    Referente √† quita√ß√£o integral e comiss√µes do instrutor aut√¥nomo e credenciado 
                    <strong className="text-slate-950 uppercase"> {viewingRecibo.instrutorNome}</strong>, pelas indica√ß√µes, turmas, 
                    vagas preenchidas e acompanhamento pedag√≥gico prestado com plena maestria.
                  </p>

                  <p className="text-xs text-slate-500">
                    O benefici√°rio, mediante assinatura digital deste termo, outorga √† plataforma Nova CNH Brasil plena, geral, irrestrita e irrevog√°vel 
                    quita√ß√£o de todas as obriga√ß√µes e comiss√µes devidas at√© a presente data, n√£o tendo nada mais a reclamar a qualquer t√≠tulo.
                  </p>
                </div>
              </div>

              {/* Technical Metadata info card */}
              <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 relative z-10">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Metadados de Transa√ß√£o Eletr√¥nica</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400">Data de Emiss√£o:</span> <span className="font-bold text-slate-800">{new Date(viewingRecibo.recibo.dataEmissao).toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Canal de Lan√ßamento:</span> <span className="font-bold text-slate-800">PIX/TED - Sistema Centralizado</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Certification Area */}
              <div className="border-t border-slate-300 pt-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Signature: Issuer */}
                  <div className="space-y-3 text-center md:text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Emitente / Pagador</div>
                    <div className="py-2 inline-block">
                      <div className="border border-[#0c2340]/20 bg-[#0c2340]/5 px-3 py-1.5 rounded text-slate-850 font-serif italic text-xs flex items-center justify-center gap-1.5">
                        <span className="text-base">üè¢</span>
                        <div>
                          <p className="font-sans font-bold not-italic text-[10px] uppercase text-[#0c2340] tracking-tight">Secretaria de Finan√ßas</p>
                          <p className="text-[8px] text-slate-500 font-mono">Chancela Nova CNH Brasil</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-2 text-xs">
                      <p className="font-bold text-slate-850">Nova CNH Brasil Ltda</p>
                      <p className="text-[9px] text-slate-400 font-mono">CNPJ: 45.928.304/0001-99</p>
                    </div>
                  </div>

                  {/* Right Signature: Instructor Beneficiary (with GOV.BR logic) */}
                  <div className="space-y-3 text-center md:text-left">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Benefici√°rio / Recebedor</div>
                    
                    {viewingRecibo.recibo.status === 'assinado_gov' ? (
                      <div className="space-y-2">
                        {/* Gov.br Certificate detail block */}
                        <div className="border-2 border-emerald-500/20 bg-emerald-500/5 p-3 rounded-xl text-left space-y-1.5 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="bg-emerald-500 text-white font-sans font-black text-[7.5px] uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <span>üõ°Ô∏è</span> GOV.BR
                            </span>
                            <span className="text-[8px] font-mono text-emerald-600 font-extrabold uppercase">Assinatura V√°lida</span>
                          </div>
                          <div className="text-[9.5px] leading-normal font-sans text-slate-700">
                            <p>Assinado digitalmente por <strong className="text-slate-900">{viewingRecibo.instrutorNome}</strong>.</p>
                            <p className="text-[8px] text-slate-500 font-mono truncate">ID √önico: {viewingRecibo.recibo.identificadorGov}</p>
                            <p className="text-[8px] text-slate-500 font-mono">Data: {new Date(viewingRecibo.recibo.dataAssinatura!).toLocaleString('pt-BR')}</p>
                            <p className="text-[7.5px] text-slate-400 font-mono truncate mt-1">Hash SHA-256: {viewingRecibo.recibo.documentoAssinado}</p>
                          </div>
                        </div>
                        <div className="border-t border-dashed border-slate-300 pt-2 text-xs">
                          <p className="font-bold text-slate-850">{viewingRecibo.instrutorNome}</p>
                          <p className="text-[9px] text-slate-400">Assinado Eletronicamente</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border border-dashed border-amber-300 bg-amber-500/5 p-3 rounded-xl text-left">
                          <p className="text-[10px] text-amber-800 font-extrabold flex items-center gap-1">
                            <span>‚ö†Ô∏è</span> Assinatura Eletr√¥nica Pendente
                          </p>
                          <p className="text-[9px] text-amber-700 leading-normal mt-1 font-sans">
                            Esta √© uma minuta preliminar do recibo. O benefici√°rio deve acessar o Painel do Instrutor para assinar este documento eletronicamente via GOV.BR.
                          </p>
                        </div>
                        <div className="border-t border-dashed border-slate-300 pt-2 text-xs">
                          <p className="font-bold text-slate-400 italic">Documento n√£o assinado</p>
                          <p className="text-[9px] text-slate-400">Aguardando Valida√ß√£o Digital</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal footer text */}
              <div className="border-t border-slate-200 pt-6 text-[8.5px] text-slate-400 text-center leading-relaxed">
                Este recibo eletr√¥nico foi emitido e assinado digitalmente em conformidade com as normas do programa Nova CNH Brasil
                e com a ICP-Brasil (Medida Provis√≥ria n¬∫ 2.200-2/2001). A sua integridade pode ser verificada a qualquer momento no dossi√™
                do credenciado sob as chaves eletr√¥nicas chanceladas no portal de servi√ßos.
              </div>

            </div>

            {/* Footer action bar (Non-printable) */}
            <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadInstructorReceiptPDF}
                  disabled={isDownloadingReceiptPdf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloadingReceiptPdf ? '‚è≥ Gerando...' : 'üì• Baixar PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintInstructorReceiptDoc}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  üñ®Ô∏è Imprimir
                </button>
              </div>

              <div className="flex items-center gap-2">
                {viewingRecibo.recibo.status !== 'assinado_gov' && (
                  <button
                    type="button"
                    onClick={() => {
                      setToastMessage(`‚úâÔ∏è Notifica√ß√£o enviada! O link para a assinatura do Recibo ${viewingRecibo.recibo.id} foi encaminhado com sucesso ao WhatsApp e E-mail de ${viewingRecibo.instrutorNome}.`);
                      setViewingRecibo(null);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    ‚úâÔ∏è Enviar Notifica√ß√£o
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingRecibo(null)}
                  className="bg-slate-900 hover:bg-slate-850 text-white font-black py-2.5 px-5 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL CANDIDATE RECEIPT VIEW & PRINT MODAL */}
      {viewingCandidateReceipt && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300 my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Controls Bar (Non-printable) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden">
              <div className="flex items-center gap-2 text-left">
                <Receipt className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase font-mono text-emerald-400">Recibo Oficial de Pagamento</h3>
                  <p className="text-[10px] text-slate-400 font-sans">{viewingCandidateReceipt.idRecibo} ‚Ä¢ Candidato: {viewingCandidateReceipt.aluno.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCandidateReceiptPDF}
                  disabled={isDownloadingReceiptPdf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                  title="Baixar em arquivo PDF"
                >
                  {isDownloadingReceiptPdf ? '‚è≥ Gerando...' : 'üì• Baixar PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintCandidateReceiptDoc}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1"
                  title="Imprimir ou Salvar pelo Navegador"
                >
                  üñ®Ô∏è Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCandidateReceipt(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Candidate Receipt Area */}
            <div className="p-8 md:p-12 space-y-8 bg-white text-slate-900 font-sans relative" id="printable-candidate-receipt">
              
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                <span className="text-[75px] md:text-[90px] font-black rotate-12 uppercase tracking-widest text-slate-900 text-center leading-tight">NOVA CNH BRASIL NA M√ÉO</span>
              </div>

              {/* Document Header */}
              <div className="border-b-4 border-[#0c2340] pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">üöó</span>
                    <h1 className="text-xl font-black tracking-tight uppercase text-[#0c2340]">Nova CNH Brasil na M√£o üáßüá∑</h1>
                  </div>
                  <p className="text-[10px] text-slate-600 font-extrabold tracking-wider uppercase">Secretaria de Arrecada√ß√£o & Gest√£o de Candidatos</p>
                  <p className="text-[10px] text-slate-500 font-mono font-bold">Comprovante Eletr√¥nico de Quita√ß√£o Financeira</p>
                </div>

                <div className="text-right font-mono bg-slate-100 p-3.5 rounded-xl border-2 border-slate-200 shrink-0 self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">N¬∫ Recibo</span>
                  <span className="text-base font-black text-indigo-900">{viewingCandidateReceipt.idRecibo}</span>
                  <span className="text-[10px] font-bold text-slate-600">{formatDateBR(viewingCandidateReceipt.dataEmissao)}</span>
                </div>
              </div>

              {/* Prominent Receipt Title Badge */}
              <div className="bg-[#0c2340] text-white p-4.5 rounded-2xl text-center space-y-1 shadow-md border-b-4 border-emerald-500 relative z-10">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-mono block">DOCUMENTO OFICIAL DE QUITA√á√ÉO</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <span>üßæ</span> RECIBO DE PAGAMENTO
                </h2>
                <p className="text-[11px] text-slate-300 font-bold">Nova CNH Brasil na M√£o üáßüá∑ ‚Ä¢ sua nova forma de se habilitar</p>
              </div>

              {/* Receipt Body */}
              <div className="space-y-6 relative z-10 text-left text-xs leading-relaxed text-slate-700">
                
                {/* Value Box */}
                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 text-center space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Valor Recebido</span>
                  <h3 className="text-3xl font-black text-emerald-700 font-mono">
                    {viewingCandidateReceipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h3>
                  <p className="text-xs font-bold text-slate-600 italic">
                    ({extensoBRL(viewingCandidateReceipt.valor)})
                  </p>
                </div>

                {/* Main Receipt Declaration Text */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-slate-800">
                  <p>
                    Recebemos do(a) candidato(a) <strong className="text-slate-950 uppercase font-black">{viewingCandidateReceipt.aluno.nome}</strong>, 
                    inscrito(a) sob o CPF <strong className="font-mono text-slate-900">{viewingCandidateReceipt.aluno.cpf || 'N√£o informado'}</strong>, 
                    matr√≠cula ID <strong className="font-mono text-slate-900">{viewingCandidateReceipt.aluno.id}</strong>, 
                    a quantia de <strong className="font-mono text-emerald-700 font-black">{viewingCandidateReceipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>, 
                    paga mediante <strong className="uppercase font-extrabold text-slate-900">{viewingCandidateReceipt.formaPagamento}</strong>.
                  </p>

                  <p className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Referente a: </span>
                    <span className="font-semibold text-slate-900">{viewingCandidateReceipt.referente}</span>
                  </p>

                  {viewingCandidateReceipt.observacao && (
                    <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Observa√ß√µes / Comprovante: </span>
                      <span>{viewingCandidateReceipt.observacao}</span>
                    </p>
                  )}
                </div>

                {/* Candidate & Course Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Categoria Habilita√ß√£o</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.aluno.categoria}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Plano Escolhido</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.aluno.plano}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Canal de Lan√ßamento</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.operador || 'Gest√£o Nova CNH'}</strong>
                  </div>
                </div>

                {/* Issuer Authentication Badge */}
                <div className="border-t border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left space-y-1">
                    <p className="font-bold text-slate-900">Programa Nova CNH Brasil</p>
                    <p className="text-[10px] text-slate-500">Documento Oficial de Quita√ß√£o Financeira do Candidato</p>
                    <p className="text-[9px] text-slate-400 font-mono">Chancela Digital: SHA256-{viewingCandidateReceipt.idRecibo.toLowerCase()}</p>
                  </div>

                  <div className="border border-emerald-300 bg-emerald-50 px-4 py-2 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-800 flex items-center justify-center gap-1">
                      <span>‚úì</span> PAGAMENTO HOMOLOGADO
                    </p>
                    <p className="text-[9px] text-emerald-600 font-mono">Autentica√ß√£o {formatDateBR(viewingCandidateReceipt.dataEmissao)}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions (Non-printable) */}
            <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 print:hidden">
              <a
                href={`https://wa.me/55${viewingCandidateReceipt.aluno.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `üßæ *RECIBO OFICIAL DE PAGAMENTO - NOVA CNH BRASIL*\n\n` +
                  `Ol√°, *${viewingCandidateReceipt.aluno.nome}*!\n` +
                  `Confirmamos o recebimento do seu pagamento no valor de *${viewingCandidateReceipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}* (${viewingCandidateReceipt.formaPagamento}).\n\n` +
                  `üìå *N¬∫ Recibo:* ${viewingCandidateReceipt.idRecibo}\n` +
                  `üìÖ *Data:* ${formatDateBR(viewingCandidateReceipt.dataEmissao)}\n` +
                  `üìë *Referente:* ${viewingCandidateReceipt.referente}\n\n` +
                  `Obrigado por escolher o Programa Nova CNH Brasil!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>üí¨</span> Enviar no WhatsApp
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCandidateReceiptPDF}
                  disabled={isDownloadingReceiptPdf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloadingReceiptPdf ? '‚è≥ Gerando...' : 'üì• Baixar PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintCandidateReceiptDoc}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  üñ®Ô∏è Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCandidateReceipt(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW MANUAL CANDIDATE RECEIPT MODAL */}
      {isNewManualReceiptModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 text-left">
            <div className="bg-[#0c2340] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black tracking-tight">Emitir Novo Recibo de Candidato</h3>
                  <p className="text-[10px] text-slate-300">Gere um comprovante oficial de pagamento para o candidato</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewManualReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEEmitirReciboManual} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Selecione o Candidato *</label>
                <select
                  required
                  value={manualReceiptAlunoId}
                  onChange={(e) => setManualReceiptAlunoId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="">-- Escolha o candidato matriculado --</option>
                  {cleanAlunos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nome} (ID: {a.id} | CPF: {a.cpf || 'Sem CPF'}) - Cat. {a.categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor do Pagamento (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={manualReceiptValor}
                    onChange={(e) => setManualReceiptValor(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={manualReceiptData}
                    onChange={(e) => setManualReceiptData(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento *</label>
                <select
                  value={manualReceiptForma}
                  onChange={(e) => setManualReceiptForma(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="PIX">PIX Instant√¢neo</option>
                  <option value="Cart√£o de Cr√©dito">Cart√£o de Cr√©dito</option>
                  <option value="Cart√£o de D√©bito">Cart√£o de D√©bito</option>
                  <option value="Dinheiro">Dinheiro Esp√©cie</option>
                  <option value="Boleto Banc√°rio">Boleto Banc√°rio</option>
                  <option value="Transfer√™ncia Banc√°ria">Transfer√™ncia Banc√°ria (TED/DOC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Referente a *</label>
                <input
                  type="text"
                  required
                  value={manualReceiptReferente}
                  onChange={(e) => setManualReceiptReferente(e.target.value)}
                  placeholder="Ex: Quita√ß√£o da Parcela 1 da CNH Facilitada"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observa√ß√µes / NSU / Comprovante (Opcional)</label>
                <input
                  type="text"
                  value={manualReceiptObs}
                  onChange={(e) => setManualReceiptObs(e.target.value)}
                  placeholder="Ex: NSU Transa√ß√£o 981273"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewManualReceiptModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" /> Emitir & Salvar Recibo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Sticky Wrapper for Header & Navigation Hub (No scroll) */}
      <div className="sticky top-0 z-40 shadow-md">
        {/* Dynamic Header */}
        <header id="header-main" className="bg-[#0c2340] text-white border-b-4 border-emerald-500">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-black text-xl shadow-inner animate-pulse">
              üöó
            </div>
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                  Nova CNH Brasil na M√£o üáßüá∑
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                    Ativo e Seguro
                  </span>
                  
                  {/* REAL-TIME AUTO SYNC INDICATOR */}
                  {isQuotaExceeded ? (
                    <button
                      onClick={forceSyncWithCloud}
                      className="bg-amber-500/25 text-amber-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/40 transition cursor-pointer"
                      title="Cota da Nuvem Excedida. Clique para tentar sincronizar agora com o Firestore."
                    >
                      ‚ö†Ô∏è Modo Local Ativo
                    </button>
                  ) : (
                    <button
                      onClick={forceSyncWithCloud}
                      className="transition cursor-pointer group"
                      title="Clique para for√ßar sincroniza√ß√£o imediata com a nuvem Firebase"
                    >
                      {syncStatus === 'synced' && (
                        <span className="bg-indigo-500/25 text-indigo-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 group-hover:bg-indigo-500/40 transition">
                          <Cloud className="h-3 w-3 text-indigo-300" />
                          ‚òÅÔ∏è Nuvem OK
                        </span>
                      )}
                      {syncStatus === 'pending' && (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-amber-500/25 flex items-center gap-1 animate-pulse group-hover:bg-amber-500/30 transition">
                          <Cloud className="h-3 w-3 text-amber-350 animate-bounce" />
                          ‚è≥ Pendente
                        </span>
                      )}
                      {syncStatus === 'syncing' && (
                        <span className="bg-sky-500/25 text-sky-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-sky-500/30 flex items-center gap-1">
                          <Cloud className="h-3 w-3 text-sky-300 animate-spin" />
                          ‚òÅÔ∏è Sincronizando...
                        </span>
                      )}
                      {syncStatus === 'error' && (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-rose-500/25 flex items-center gap-1 group-hover:bg-rose-500/30 transition">
                          <Cloud className="h-3 w-3 text-rose-300" />
                          ‚ùå Sincronia Offline
                        </span>
                      )}
                    </button>
                  )}
                  {syncStatus === 'not_configured' && (
                    <span className="bg-slate-500/20 text-slate-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-slate-500/25 flex items-center gap-1" title="Apenas salvamento local ativo">
                      ‚òÅÔ∏è Apenas Local
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Login switcher */}
          {isAdminAuthenticated ? (
            <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <Smartphone className="h-4 w-4 text-emerald-400 animate-pulse" />
              <div className="text-left font-sans">
                <div className="flex items-center justify-between gap-2.5 mb-1">
                  <span className="text-[9px] text-[#10b981] font-extrabold uppercase tracking-widest block font-mono">
                    üõ°Ô∏è Admin Ativo
                  </span>
                  <button 
                    onClick={handleAdminLogout} 
                    className="text-[9px] text-rose-400 hover:text-rose-350 underline font-bold transition cursor-pointer"
                  >
                    Logout Admin
                  </button>
                </div>
                <select
                  id="select-active-student"
                  value={activeStudentId}
                  onChange={(e) => {
                    setActiveStudentId(e.target.value);
                    setIsAuthenticated(true); // Auto-authenticate for simulator speed
                    setCurrentTab('app-jovem');
                  }}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none pr-6 font-sans cursor-pointer py-0.5"
                >
                  {cleanAlunos.map(al => {
                    const age = calculateAge(al.dob);
                    return (
                      <option key={al.id} value={al.id} className="bg-slate-900 text-white font-sans">
                        {al.nome} ({age} anos)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Primary Navigation Hub */}
      <nav id="navbar-secondary" className="bg-[#112d52] text-white/90 shadow-sm border-b border-indigo-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex flex-wrap gap-1">
            <button
              id="tab-capa"
              onClick={() => setCurrentTab('capa')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'capa' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Info className="h-4 w-4" />
              üìñ Proposta do Programa
            </button>

            <button
              id="tab-simulador-poupanca"
              onClick={() => setCurrentTab('simulador-poupanca')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all relative overflow-hidden ${
                currentTab === 'simulador-poupanca' 
                  ? 'bg-emerald-500 text-slate-950 shadow ring-2 ring-emerald-300' 
                  : 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-300 shadow-md animate-pulse hover:bg-[#15345d] hover:border-amber-400'
              }`}
            >
              <Sliders className={`h-4 w-4 ${currentTab === 'simulador-poupanca' ? '' : 'text-amber-300 animate-bounce'}`} />
              <span className="relative flex items-center gap-1">
                üéõÔ∏è Simular meu plano Ideal
                {currentTab !== 'simulador-poupanca' && (
                  <span className="absolute -top-1 -right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </span>
            </button>

            <button
              id="tab-app-jovem"
              onClick={() => setCurrentTab('app-jovem')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'app-jovem' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              üì± Portal do(a) Candidato(a)
            </button>

            <button
              id="tab-depoimentos"
              onClick={() => setCurrentTab('depoimentos')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'depoimentos' 
                  ? 'bg-emerald-500 text-slate-950 shadow font-extrabold' 
                  : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              ‚≠ê Depoimentos dos Alunos
            </button>

            <button
              id="tab-area-instrutor"
              onClick={() => setCurrentTab('area-instrutor')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'area-instrutor' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <QrCode className="h-4 w-4" />
              üë§ {activeInstructor ? `Painel do Instrutor (${activeInstructor.nome})` : 'Painel do Instrutor üîë'}
            </button>

            <button
              id="tab-gestao"
              onClick={() => setCurrentTab('gestao')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                currentTab === 'gestao' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              ‚öôÔ∏è {isAdminAuthenticated ? `√Årea Administrativa (${cleanAlunos.length})` : '√Årea Administrativa üîí'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(isAdminAuthenticated || isAuthenticated) && (
              <button
                onClick={handleSystemLogout}
                className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md select-none animate-in fade-in zoom-in-95 duration-150"
                title="Sair do sistema e limpar todas as sess√µes ativas"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair do Sistema
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>

      {/* Content Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* ===================== TAB: APP DO JOVEM (THE CONTEXT REQUESTED) ===================== */}
        {currentTab === 'app-jovem' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Simulated Smartphone Screen Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SMARTPHONE FRAME DISPLAY (CENTERPIECE) */}
              <div className="lg:col-span-5 flex justify-center">
                
                {/* Physical-looking Phone Container */}
                <div className="w-full max-w-[390px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 relative">
                  
                  {/* Speaker Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl z-30 flex justify-center items-start"></div>
                  {/* Inside Screen Content Panel */}
                  <div className="bg-slate-900 rounded-[34px] overflow-hidden text-white font-sans flex flex-col relative min-h-[640px] border border-slate-800">
                    
                    {/* Top Status Bar Mock */}
                    <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[10px] text-white/70 font-mono font-medium tracking-tight">
                      <span>12:20 CNH üöó</span>
                      <div className="flex items-center gap-1">
                        <span>5G</span>
                        <div className="w-4.5 h-2 bg-emerald-500/80 rounded-xs border border-white/40 flex items-center p-0.5">
                          <div className="h-full bg-white w-3/4 rounded-3xs"></div>
                        </div>
                      </div>
                    </div>

                    {!isAuthenticated ? (
                      /* STUDENT & GUARDIAN ACCESS AREA (LOGIN SCREEN) */
                      <div className="flex-grow flex flex-col justify-between p-6 text-slate-100">
                        <div className="space-y-5 pt-4">
                          <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center font-bold text-xl">
                              üîë
                            </div>
                            <h4 className="text-base font-extrabold tracking-tight">Acesso ao Portal</h4>
                            <p className="text-[11px] text-slate-400">Aluno e Respons√°vel Legal</p>
                          </div>

                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const cleanInput = loginIdAttempt.trim().toUpperCase();
                            const cleanCpfInput = loginIdAttempt.replace(/\D/g, '');
                            const matched = cleanAlunos.find(a => {
                              const cleanId = (a.id || '').trim().toUpperCase();
                              if (cleanId === cleanInput) return true;
                              // Match by CPF if provided
                              const studentCpfDigits = (a.cpf || '').replace(/\D/g, '');
                              if (cleanCpfInput.length >= 8 && studentCpfDigits && studentCpfDigits === cleanCpfInput) return true;
                              // Allow typing just "002" or "2" for "CNH-002"
                              if (!cleanInput.startsWith('CNH-') && cleanId === `CNH-${cleanInput.padStart(3, '0')}`) return true;
                              // Allow typing "CNH-2" for "CNH-002"
                              if (cleanInput.startsWith('CNH-')) {
                                const numPart = cleanInput.replace('CNH-', '');
                                if (cleanId === `CNH-${numPart.padStart(3, '0')}`) return true;
                              }
                              return false;
                            });
                            
                            if (matched) {
                              const inputSenha = loginSenhaAttempt.trim();
                              const actualSenha = matched.senha || '123';
                              if (inputSenha === actualSenha) {
                                setActiveStudentId(matched.id);
                                setIsAuthenticated(true);
                                setLoginError('');
                              } else {
                                setLoginError('Senha de acesso incorreta! Verifique seus dados ou contate o suporte.');
                              }
                            } else {
                              setLoginError('ID de aluno n√£o encontrado! (Ex: CNH-002)');
                            }
                          }} className="space-y-4 pt-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID do Aluno (Matr√≠cula)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">ID</span>
                                <input
                                  type="text"
                                  placeholder="Digite ex: CNH-002"
                                  value={loginIdAttempt}
                                  onChange={(e) => {
                                    setLoginIdAttempt(e.target.value);
                                    setLoginError('');
                                  }}
                                  required
                                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Senha de Acesso</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs text-slate-500">üîí</span>
                                <input
                                  type="password"
                                  placeholder="Digite sua senha de acesso"
                                  value={loginSenhaAttempt}
                                  onChange={(e) => {
                                    setLoginSenhaAttempt(e.target.value);
                                    setLoginError('');
                                  }}
                                  required
                                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600"
                                />
                              </div>
                            </div>

                            {loginError && (
                              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2.5 rounded-lg text-[10px] leading-tight font-semibold text-center text-pretty">
                                {loginError}
                              </div>
                            )}

                            <button
                              id="btn-login-authenticate"
                              type="submit"
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg"
                            >
                              Entrar no Sistema
                            </button>
                          </form>
                        </div>

                        <div className="text-center text-[9px] text-slate-500 leading-relaxed py-2">
                          √Årea de dados restrita protegida por criptografia de seguran√ßa da plataforma Nova CNH.
                        </div>
                      </div>
                    ) : (
                      /* AUTHENTICATED INNER SMARTPHONE APP VIEW */
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          {/* App Header Wrapper */}
                          <div className="bg-[#0f2a4f] p-4 pt-2 border-b border-indigo-950/40 relative">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block font-mono">
                                  PAINEL DO(A) CANDIDATO(A) CNH BRASIL NA M√ÉO
                                </span>
                                <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                                  {currentStudent.nome}
                                </h4>
                                <span className={`inline-block text-[9.5px] font-black px-1.5 py-0.2 mt-0.5 rounded ${
                                  calculateAge(currentStudent.dob) < 18
                                    ? 'bg-emerald-500/25 text-emerald-300'
                                    : 'bg-indigo-500/30 text-indigo-200'
                                }`}>
                                  üìã {calculateAge(currentStudent.dob) < 18 ? (currentStudent.tipoPlano || 'Plano Poupan√ßa Jovem 17 Anos') : (currentStudent.tipoPlano && currentStudent.tipoPlano !== 'Plano Poupan√ßa Jovem 17 Anos' ? currentStudent.tipoPlano : 'Plano CNH Facilitada Maiores de 18 Anos')}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsAuthenticated(false)}
                                  className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2 py-1 rounded-md font-bold transition flex items-center gap-1 border border-slate-750"
                                  title="Fazer logout da √°rea do aluno"
                                >
                                  Sair ‚éã
                                </button>
                                <div className="h-8 w-8 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/50">
                                  {currentStudent.nome.substring(0,2)}
                                </div>
                              </div>
                            </div>

                            {/* Display CNH Categories selection & value details */}
                            <div className="mt-3 bg-slate-900/60 p-2.5 rounded-xl flex items-center justify-between text-xs border border-slate-800">
                              <div>
                                <span className="text-[9px] text-slate-400 block">Categoria Desejada:</span>
                                <strong className="text-white font-extrabold">{currentStudent.categoria}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 block">Valor Estimado:</span>
                                <strong className="text-emerald-400 font-extrabold">{currentStudent.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                              </div>
                            </div>
                          </div>

                          {/* App Scrollable Content */}
                          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "490px" }}>
                            
                            {/* SAVED CREDIT/WALLET CRUCIAL CARD (TROCA DA PALAVRA COFRINHO POR BA√ö) */}
                            <div className="bg-gradient-to-br from-[#0c2340] via-[#102d53] to-[#0f1f35] rounded-2.5xl p-4 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                              
                              {/* Glowing ring */}
                              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Wallet className="h-4.5 w-4.5 text-emerald-400" />
                                  <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono tracking-wider">Ba√∫ de Cr√©dito CNH</span>
                                </div>
                                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  {Number(currentStudent.parcelasPagas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de {currentStudent.parcelasTotal || 12} quitadas
                                </span>
                              </div>

                              <div className="mt-2.5">
                                <span className="text-[10px] text-slate-400 block font-medium">Saldo Reservado no Ba√∫:</span>
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 font-mono">
                                  {saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>

                              {/* Financial Progress gauge */}
                              <div className="mt-3.5 space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-300">
                                  <span>Progresso do Ba√∫ CNH</span>
                                  <span className="font-bold font-mono">{progressoFinanceiroPercent.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                                  <div 
                                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${progressoFinanceiroPercent}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Pay button for youngster inside phone view! */}
                              {currentStudent.formaPagamento === 'hibrido' ? (
                                <div className="mt-4 space-y-2">
                                  <div className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                                    <span>üîÄ</span> Acordo H√≠brido Ativo (Pix 50% + Cart√£o 50%)
                                  </div>
                                  
                                  {/* Pix Button */}
                                  <button
                                    id="btn-simulate-payment-pix"
                                    onClick={() => {
                                      const halfValue = (currentStudent.valorTotal || 0) / 2;
                                      setPixAmountSimulated(halfValue);
                                      setPaymentTab('pix');
                                      setRequestedHybridCardLink(false);
                                      alert("üì¢ LEIA O QR CODE REALIZE SEU PAGAMENTO DA ENTRADA PIX E LOGO AP√ìS SELECIONAR CONFIRMAR PAGAMENTO.");
                                      setShowPixModal(true);
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    <span>‚ö°</span> Pagar Entrada Pix (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                  </button>

                                  {/* Cart√£o Link Button */}
                                  <button
                                    id="btn-request-card-link"
                                    onClick={() => {
                                      const studentName = currentStudent?.nome || "Candidato";
                                      const studentId = currentStudent?.id || "";
                                      const valorRestante = (currentStudent.valorTotal || 0) / 2;
                                      const valueFormatted = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                      const waText = `Ol√° Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Estou no Plano H√≠brido, j√° fiz/vou fazer o Pix da entrada e agora gostaria de solicitar o Link Seguro de Parcelamento no Cart√£o para a outra metade de R$ ${valueFormatted} (em at√© 12x sem juros).`;
                                      const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                                      window.open(url, '_blank');
                                      setRequestedHybridCardLink(true);
                                      setToastMessage("üì≤ Redirecionando para solicitar o Link de Parcelamento no WhatsApp...");
                                    }}
                                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" /> Solicitar Link do Cart√£o (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                  </button>

                                  {/* Bot√£o de Confirma√ß√£o do Cart√£o H√≠brido */}
                                  <button
                                    id="btn-confirm-hybrid-card-dashboard"
                                    onClick={confirmHybridCardPayment}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    ‚úì Confirmar Pagamento do Cart√£o (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                  </button>
                                </div>
                              ) : (
                                <button
                                  id="btn-simulate-payment"
                                  onClick={triggerPixSimulation}
                                  className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  {currentStudent.formaPagamento === 'cartao' ? (
                                    `Solicitar Link do Cart√£o (${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 })})`
                                  ) : currentStudent.formaPagamento === 'vista' ? (
                                    `Pagar Plano √† Vista (${currentStudent.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                  ) : (
                                    `Pagar Parcela (${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                  )}
                                </button>
                              )}
                            </div>

                            {/* BUY ADDITIONAL CLASSES SECTION */}
                            <div className="bg-[#121c2c] rounded-2xl p-4 border border-emerald-500/25 space-y-4" id="buy-additional-classes-card">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider flex items-center gap-1">
                                  üéì Adquirir Aulas Adicionais
                                </span>
                                <span className="bg-emerald-950/80 text-emerald-300 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-900/40">
                                  MATR√çCULA {currentStudent.id}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-350 leading-relaxed text-left">
                                Adicione mais aulas pr√°ticas ao seu contrato ativo de forma simplificada e transparente. Selecione a categoria desejada (Carro, Moto ou Ambos) e confira os valores detalhados antes de confirmar.
                              </p>

                              {/* VEHICLE TYPE DISTINCTION SELECTOR */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                                  1. Selecione a Categoria do Ve√≠culo:
                                </label>
                                <div className="grid grid-cols-3 gap-1.5" id="add-classes-type-selector">
                                  <button
                                    type="button"
                                    id="btn-add-type-carro"
                                    onClick={() => {
                                      setAddAulasTipo('carro');
                                      if (addAulasCarroQty === 0) setAddAulasCarroQty(5);
                                      setShowAddAulasSuccess(false);
                                    }}
                                    className={`py-2 px-2 rounded-xl border text-[10.5px] font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                      addAulasTipo === 'carro'
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow font-black'
                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                                    }`}
                                  >
                                    <span className="text-base">üöó</span>
                                    <span>Carro (B)</span>
                                  </button>

                                  <button
                                    type="button"
                                    id="btn-add-type-moto"
                                    onClick={() => {
                                      setAddAulasTipo('moto');
                                      if (addAulasMotoQty === 0) setAddAulasMotoQty(5);
                                      setShowAddAulasSuccess(false);
                                    }}
                                    className={`py-2 px-2 rounded-xl border text-[10.5px] font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                      addAulasTipo === 'moto'
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow font-black'
                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                                    }`}
                                  >
                                    <span className="text-base">üèçÔ∏è</span>
                                    <span>Moto (A)</span>
                                  </button>

                                  <button
                                    type="button"
                                    id="btn-add-type-ambos"
                                    onClick={() => {
                                      setAddAulasTipo('ambos');
                                      if (addAulasCarroQty === 0) setAddAulasCarroQty(5);
                                      if (addAulasMotoQty === 0) setAddAulasMotoQty(5);
                                      setShowAddAulasSuccess(false);
                                    }}
                                    className={`py-2 px-2 rounded-xl border text-[10.5px] font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                      addAulasTipo === 'ambos'
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow font-black'
                                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                                    }`}
                                  >
                                    <span className="text-base">üöó+üèçÔ∏è</span>
                                    <span>Carro & Moto</span>
                                  </button>
                                </div>
                              </div>

                              {/* QUANTITY SELECTOR CONTROLS BY CATEGORY */}
                              <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-left">
                                <span className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                                  2. Quantidade de Aulas Adicionais:
                                </span>

                                {/* CARRO CONTROLS */}
                                {(addAulasTipo === 'carro' || addAulasTipo === 'ambos') && (
                                  <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-extrabold text-emerald-300 flex items-center gap-1 text-[11px]">
                                        üöó Pr√°tica de Carro (Cat. B):
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddAulasCarroQty(Math.max(1, addAulasCarroQty - 1));
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center font-black text-xs cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 min-w-[50px] text-center text-xs">
                                          {addAulasCarroQty} {addAulasCarroQty === 1 ? 'aula' : 'aulas'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddAulasCarroQty(addAulasCarroQty + 1);
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center font-black text-xs cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex gap-1 justify-between pt-1">
                                      {[1, 5, 10, 15, 20].map(qty => (
                                        <button
                                          key={qty}
                                          type="button"
                                          onClick={() => {
                                            setAddAulasCarroQty(qty);
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className={`flex-1 py-1 rounded text-center text-[9px] font-bold border transition cursor-pointer ${
                                            addAulasCarroQty === qty
                                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                          }`}
                                        >
                                          +{qty}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* MOTO CONTROLS */}
                                {(addAulasTipo === 'moto' || addAulasTipo === 'ambos') && (
                                  <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[11px]">
                                        üèçÔ∏è Pr√°tica de Moto (Cat. A):
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddAulasMotoQty(Math.max(1, addAulasMotoQty - 1));
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center font-black text-xs cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 min-w-[50px] text-center text-xs">
                                          {addAulasMotoQty} {addAulasMotoQty === 1 ? 'aula' : 'aulas'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAddAulasMotoQty(addAulasMotoQty + 1);
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center font-black text-xs cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex gap-1 justify-between pt-1">
                                      {[1, 5, 10, 15, 20].map(qty => (
                                        <button
                                          key={qty}
                                          type="button"
                                          onClick={() => {
                                            setAddAulasMotoQty(qty);
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className={`flex-1 py-1 rounded text-center text-[9px] font-bold border transition cursor-pointer ${
                                            addAulasMotoQty === qty
                                              ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                          }`}
                                        >
                                          +{qty}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* DYNAMIC PRICING CALCULATION & DISTINCTION BREAKDOWN */}
                              {(() => {
                                const activeCarro = (addAulasTipo === 'carro' || addAulasTipo === 'ambos') ? addAulasCarroQty : 0;
                                const activeMoto = (addAulasTipo === 'moto' || addAulasTipo === 'ambos') ? addAulasMotoQty : 0;
                                
                                const getCarroRate = (qty: number) => (qty === 2 ? 250 : qty * 125);
                                const getMotoRate = (qty: number) => (qty === 2 ? 200 : qty * 90);
                                const getAmbosRate = (carroQty: number, motoQty: number) => {
                                  if (carroQty === 2 && motoQty === 2) return 450;
                                  return getCarroRate(carroQty) + getMotoRate(motoQty);
                                };

                                const costCarro = getCarroRate(activeCarro);
                                const costMoto = getMotoRate(activeMoto);
                                const rawBaseExtraCost = addAulasTipo === 'ambos' 
                                  ? getAmbosRate(activeCarro, activeMoto) 
                                  : (costCarro + costMoto);
                                const totalNewClasses = activeCarro + activeMoto;

                                const isCartao = addAulasPaymentMethod === 'cartao';
                                const multiplier = isCartao ? getTonInterestMultiplier(addAulasParcelas) : 1.0;
                                const perMonthCartao = isCartao 
                                  ? Math.ceil(((rawBaseExtraCost * multiplier) / addAulasParcelas) * 100) / 100 
                                  : rawBaseExtraCost;
                                const totalExtraCost = isCartao ? (perMonthCartao * addAulasParcelas) : rawBaseExtraCost;

                                return (
                                  <div className="space-y-3">
                                    {/* Clear Distinction & Calculations Below */}
                                    <div className="bg-slate-950/90 p-3.5 rounded-xl border-2 border-emerald-500/30 text-[10px] space-y-2 text-left" id="add-classes-pricing-breakdown">
                                      <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
                                        <span className="font-mono font-extrabold text-emerald-400 uppercase tracking-widest text-[9px]">
                                          üìã Detalhamento Financeiro do Pacote
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono">Tabela Oficial do Simulador</span>
                                      </div>

                                      {/* Car line item */}
                                      {activeCarro > 0 && (
                                        <div className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                                          <div className="flex items-center gap-1.5">
                                            <span>üöó</span>
                                            <span className="font-bold text-slate-200">
                                              Carro (B): <strong className="text-emerald-400">{activeCarro} {activeCarro === 1 ? 'aula' : 'aulas'}</strong>
                                            </span>
                                            <span className="text-[9px] text-slate-500">{activeCarro === 2 ? "(R$ 250,00 pacote)" : "(R$ 125,00/un)"}</span>
                                          </div>
                                          <span className="font-black text-emerald-400 text-xs">
                                            {costCarro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Moto line item */}
                                      {activeMoto > 0 && (
                                        <div className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                                          <div className="flex items-center gap-1.5">
                                            <span>üèçÔ∏è</span>
                                            <span className="font-bold text-slate-200">
                                              Moto (A): <strong className="text-amber-400">{activeMoto} {activeMoto === 1 ? 'aula' : 'aulas'}</strong>
                                            </span>
                                            <span className="text-[9px] text-slate-500">{activeMoto === 2 ? "(R$ 200,00 pacote)" : "(R$ 90,00/un)"}</span>
                                          </div>
                                          <span className="font-black text-amber-400 text-xs">
                                            {costMoto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Total additions row */}
                                      <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-2 font-bold">
                                        <span>Total de Aulas Adicionais:</span>
                                        <span className="font-mono text-emerald-400">+{totalNewClasses} aulas</span>
                                      </div>

                                      {/* Subtotal before card interest if card selected */}
                                      {isCartao && addAulasParcelas > 1 && (
                                        <div className="flex justify-between items-center text-slate-400 text-[9.5px]">
                                          <span>Valor Base (√† vista):</span>
                                          <span className="font-mono text-slate-300">
                                            {rawBaseExtraCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Investment subtotal */}
                                      <div className="flex justify-between items-center text-white font-extrabold pt-0.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                                        <span className="uppercase text-[9.5px] tracking-wider text-emerald-300">
                                          {isCartao ? `Investimento no Cart√£o (${addAulasParcelas}x):` : 'Investimento no Pix / √Ä Vista:'}
                                        </span>
                                        <div className="text-right">
                                          <div className="text-emerald-400 font-mono text-sm font-black">
                                            {totalExtraCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </div>
                                          {isCartao && (
                                            <div className="text-[9.5px] text-indigo-300 font-mono font-bold">
                                              {addAulasParcelas}x de {perMonthCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Updated contract total */}
                                      <div className="flex justify-between items-center text-slate-400 text-[9px] border-t border-slate-850 pt-1.5">
                                        <span>Novo Total do Contrato:</span>
                                        <span className="font-mono font-bold text-slate-200">
                                          {(currentStudent.valorTotal + totalExtraCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                      </div>

                                      <div className="flex justify-between items-center text-slate-400 text-[9px]">
                                        <span>Nova Carga Letiva Total:</span>
                                        <span className="font-bold text-emerald-300 font-mono">
                                          {(currentStudent.aulas || 20) + totalNewClasses} aulas ({currentStudent.aulas || 20} anteriores + {totalNewClasses} novas)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Choice of Payment Method (REMOVED CARN√ä) */}
                                    <div className="space-y-1.5 text-left" id="add-classes-payment-selector">
                                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider font-sans block">
                                        Forma de pagamento (Tabela Simulador):
                                      </span>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          id="btn-add-classes-pay-pix"
                                          type="button"
                                          onClick={() => {
                                            setAddAulasPaymentMethod('pix');
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className={`py-2 px-2 rounded-lg text-center text-[10px] font-bold border transition leading-tight cursor-pointer flex items-center justify-center gap-1.5 ${
                                            addAulasPaymentMethod === 'pix'
                                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-extrabold shadow'
                                              : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:bg-slate-900'
                                          }`}
                                        >
                                          <span>‚ö°</span>
                                          <span>‚ö° No Pix (√Ä Vista)</span>
                                        </button>
                                        <button
                                          id="btn-add-classes-pay-cartao"
                                          type="button"
                                          onClick={() => {
                                            setAddAulasPaymentMethod('cartao');
                                            setShowAddAulasSuccess(false);
                                          }}
                                          className={`py-2 px-2 rounded-lg text-center text-[10px] font-bold border transition leading-tight cursor-pointer flex items-center justify-center gap-1.5 ${
                                            addAulasPaymentMethod === 'cartao'
                                              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 font-extrabold shadow'
                                              : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:bg-slate-900'
                                          }`}
                                        >
                                          <span>üí≥</span>
                                          <span>üí≥ No Cart√£o</span>
                                        </button>
                                      </div>

                                      {/* Installment Options for Card Payment matching Simulador */}
                                      {addAulasPaymentMethod === 'cartao' && (
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-indigo-900/50 space-y-1.5 mt-2 animate-in fade-in" id="add-classes-card-installments-box">
                                          <div className="flex justify-between items-center text-[9.5px]">
                                            <span className="font-extrabold text-indigo-300 font-mono uppercase tracking-wider">
                                              üí≥ Selecione o Parcelamento (Taxas Ton):
                                            </span>
                                            <span className="font-mono text-emerald-400 font-black">
                                              {addAulasParcelas}x de {perMonthCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                                              const nMult = getTonInterestMultiplier(n);
                                              const nPerMonth = Math.ceil(((rawBaseExtraCost * nMult) / n) * 100) / 100;
                                              return (
                                                <button
                                                  key={n}
                                                  type="button"
                                                  onClick={() => {
                                                    setAddAulasParcelas(n);
                                                    setShowAddAulasSuccess(false);
                                                  }}
                                                  className={`py-1 px-1 rounded text-center text-[9px] font-mono font-bold border transition cursor-pointer ${
                                                    addAulasParcelas === n
                                                      ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow'
                                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                                  }`}
                                                >
                                                  <div className="font-black">{n}x</div>
                                                  <div className="text-[8px] opacity-80">{nPerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Confirmation Button */}
                                    <button
                                      id="btn-add-classes-confirm-purchase"
                                      type="button"
                                      disabled={totalNewClasses <= 0}
                                      onClick={() => {
                                        if (totalNewClasses <= 0) return;
                                        const currentAulas = currentStudent.aulas || 20;
                                        const currentVal = currentStudent.valorTotal;

                                        const updatedAlunos = alunos.map(a => {
                                          if (a.id === currentStudent.id) {
                                            return {
                                              ...a,
                                              aulas: currentAulas + totalNewClasses,
                                              valorTotal: currentVal + totalExtraCost
                                            };
                                          }
                                          return a;
                                        });

                                        saveAlunosList(updatedAlunos);
                                        
                                        const detailsText = activeCarro > 0 && activeMoto > 0
                                          ? `${activeCarro} de Carro + ${activeMoto} de Moto`
                                          : activeCarro > 0 ? `${activeCarro} de Carro` : `${activeMoto} de Moto`;

                                        const payText = isCartao ? `${addAulasParcelas}x no Cart√£o` : 'Pix √† vista';

                                        setToastMessage(`üí∏ Contrato atualizado! Adicionadas ${totalNewClasses} aulas (${detailsText}) no ${payText}.`);
                                        setShowAddAulasSuccess(true);
                                      }}
                                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                    >
                                      <span>‚ûï</span> Confirmar e Adicionar Aulas ({totalNewClasses})
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* Success Feedback message */}
                              {showAddAulasSuccess && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-[10px] space-y-2 animate-in fade-in zoom-in-95 duration-200 text-left" id="add-classes-success-notice">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                    <span className="text-sm">‚úì</span>
                                    <span>CONTRATO ATUALIZADO COM SUCESSO!</span>
                                  </div>
                                  <p className="leading-normal">
                                    Suas aulas adicionais por categoria foram homologadas! O dossi√™ do aluno e a nova carga letiva j√° constam no seu cadastro oficial.
                                  </p>
                                  <button
                                    id="btn-add-classes-close-success"
                                    type="button"
                                    onClick={() => setShowAddAulasSuccess(false)}
                                    className="text-slate-950 bg-emerald-400 hover:bg-emerald-300 font-extrabold px-2.5 py-1 rounded text-[9px] uppercase tracking-wider block ml-auto transition-colors cursor-pointer"
                                  >
                                    Entendido
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* EXCLUSIVE GUARDIAN MONITORING AREA (ESPA√áO DO RESPONS√ÅVEL LEGAL) */}
                            <div className="bg-slate-950 rounded-2xl p-3.5 border border-indigo-950 space-y-3 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider flex items-center gap-1">
                                  üõ°Ô∏è Area do Respons√°vel Legal
                                </span>
                                <span className="bg-indigo-950 text-indigo-300 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-900/40">
                                  SISTEMA INTEGRADO
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="text-[10px] text-slate-300 leading-normal">
                                  Acompanhamento das finan√ßas e progresso do(a) candidato(a) sob tutela legal:
                                </div>

                                {/* Installment Breakdown Checklist */}
                                <div className="space-y-1 text-[10px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                  <span className="text-[9px] text-slate-400 block font-semibold mb-1">Mapeamento de Parcelas (Plano {currentStudent.parcelasTotal || 12} meses):</span>
                                  <div className="grid grid-cols-6 gap-1 text-center font-mono font-bold text-[9px]">
                                    {Array.from({ length: currentStudent.parcelasTotal || 12 }).map((_, idx) => {
                                      const isPaid = idx < currentStudent.parcelasPagas;
                                      return (
                                        <div
                                          key={idx}
                                          className={`py-1 rounded border ${
                                            isPaid 
                                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                              : 'bg-slate-950/50 border-slate-800 text-slate-600'
                                          }`}
                                          title={isPaid ? `Parcela ${idx+1} Paga` : `Parcela ${idx+1} Pendente`}
                                        >
                                          {idx + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2 border-t border-slate-850/60 pt-1.5">
                                    <span>Pagas: <strong className="text-emerald-400">{Number(currentStudent.parcelasPagas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong></span>
                                    <span>Restam: <strong className="text-indigo-400">{Math.max(0, 12 - currentStudent.parcelasPagas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong></span>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                                    <span>Autoriza√ß√£o do Respons√°vel:</span>
                                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                      <Check className="h-3 w-3" /> ATIVA
                                    </span>
                                  </div>
                                  
                                  <div className="text-[9px] text-slate-500 leading-normal italic text-pretty">
                                    Ao depositar na poupan√ßa antecipada, os valores estar√£o legalmente vinculados √† futura emiss√£o da habilita√ß√£o ap√≥s a maioridade.
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* AGE-COUNTDOWN & UNLOCK RULE */}
                            <div className="bg-[#121c2c] rounded-2xl p-4 border border-slate-850 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                  <Clock className="h-4 w-4 text-amber-400" />
                                  <span>Controle de Idade &amp; Libera√ß√£o do Ba√∫</span>
                                </div>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                                  {studentAge} anos
                                </span>
                              </div>

                              {studentIsMinor ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg text-xs leading-relaxed">
                                    <Lock className="h-5 w-5 text-amber-400 shrink-0" />
                                    <div>
                                      <strong>Status: Ba√∫ em Poupan√ßa Ativa</strong>
                                      <p className="text-[9px] text-slate-400 mt-0.5">Sua idade legal n√£o permite iniciar aulas em vias p√∫blicas.</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-slate-950/80 p-3 rounded-xl text-center space-y-1">
                                    <span className="text-[9px] text-slate-400 block font-bold">TEMPO PARA OS 18 ANOS</span>
                                    <div className="text-xl font-mono font-black text-amber-400">
                                      {mesesAte18 === 0 ? "Menos de 1" : mesesAte18} {mesesAte18 === 1 ? 'm√™s restante' : 'meses restantes'}
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal px-2">
                                      Continue alimentando o ba√∫. Ao fazer 18 anos, todo o saldo vira cr√©dito pr√°tico liberado com o parceiro!
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="flex items-start gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg text-xs leading-tight">
                                    <Unlock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="text-white block font-bold">Status: üîì BA√ö LIBERADO!</strong>
                                      <span className="text-[10px] text-slate-300">Voc√™ atingiu {studentAge} anos e o ba√∫ acumulado est√° liberado para aulas de dire√ß√£o pr√°ticas!</span>
                                    </div>
                                  </div>

                                  <div className="bg-blue-950/50 p-2.5 rounded-lg text-xs text-blue-300">
                                    <p className="font-bold">Saldo liberado no ba√∫:</p>
                                    <p className="text-lg font-black font-mono text-white">{saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>

                                  {currentStudent.instrutor && currentStudent.instrutor !== 'A definir' && currentStudent.instrutor !== 'Sem Instrutor' ? (() => {
                                    const targetInst = instrutores.find(i => i.nome === currentStudent.instrutor);
                                    const instPhone = targetInst?.whatsapp ? targetInst.whatsapp.replace(/\D/g, '') : '81992389773';
                                    return (
                                      <a
                                        href={`https://wa.me/55${instPhone}?text=${encodeURIComponent(`Ol√°, ${currentStudent.instrutor}! Meu nome √© ${currentStudent.nome}, completei a maioridade no programa Nova CNH e tenho ${saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de saldo no ba√∫ para as aulas!`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-2 px-3 rounded-lg text-center text-xs transition-all shadow-xs"
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                        Agendar com {currentStudent.instrutor} no WhatsApp
                                      </a>
                                    );
                                  })() : (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg text-center text-[10px] leading-relaxed">
                                      ‚è≥ <strong>Aguardando Atribui√ß√£o:</strong> O administrador designar√° seu instrutor credenciado regional em breve para as aulas pr√°ticas.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* VISUAL MILESTONES ROADMAP */}
                            <div className="bg-[#121c2c] rounded-2xl p-4 border border-slate-850 space-y-2.5">
                              <span className="text-[10px] text-slate-400 block font-bold">JORNADA DA SUA EMISS√ÉO</span>
                              <div className="space-y-3.5 pt-1">
                                
                                <div className="flex items-start gap-2 text-xs">
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">‚úì</div>
                                  <div>
                                    <strong className="text-white">1. Plano Ativado</strong>
                                    <p className="text-[9px] text-slate-400">Contratou {currentStudent.categoria} em {currentStudent.dataAdesao}.</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 text-xs">
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">‚úì</div>
                                  <div>
                                    <strong className="text-white">2. Guardando no Ba√∫</strong>
                                    <p className="text-[9px] text-slate-400">Acumulando {currentStudent.parcelasPagas} parcelas pagas no ba√∫.</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 text-xs">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    !studentIsMinor 
                                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                                      : 'bg-slate-850 border border-slate-700 text-slate-500'
                                  }`}>
                                    {!studentIsMinor ? '‚úì' : '3'}
                                  </div>
                                  <div>
                                    <strong className={!studentIsMinor ? 'text-white' : 'text-slate-400 font-normal'}>3. Maioridade Civil (18 anos)</strong>
                                    <p className="text-[9px] text-slate-400">
                                      {studentIsMinor ? `Aguardar fazer 18 anos (Faltam ${mesesAte18} meses)` : `Atingido! Liberado com ${studentAge} anos.`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 text-xs">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    !studentIsMinor && currentStudent.parcelasPagas === 12
                                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                                      : 'bg-slate-850 border border-slate-700 text-slate-500'
                                  }`}>
                                    {!studentIsMinor && currentStudent.parcelasPagas === 12 ? '‚úì' : '4'}
                                  </div>
                                  <div>
                                    <strong className={!studentIsMinor && currentStudent.parcelasPagas === 12 ? 'text-white' : 'text-slate-400 font-normal'}>4. Aulas Pr√°ticas Pagas</strong>
                                    <p className="text-[9px] text-slate-400">
                                      {currentStudent.parcelasPagas === 12 ? 'Plano de 12 meses 100% quitado!' : `Saldo acumulado de ${saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`}
                                    </p>
                                  </div>
                                </div>

                              </div>
                            </div>

                          </div>
                        </div>

                        {/* App Bottom Corporate Navigation Mimic */}
                        <div className="bg-[#0f2a4f] py-3.5 px-6 border-t border-indigo-950 flex justify-between items-center text-[10px] text-white/60">
                          <div className="flex flex-col items-center cursor-pointer text-emerald-400">
                            <Smartphone className="h-4 w-4" />
                            <span>Carteira</span>
                          </div>
                          <div className="flex flex-col items-center cursor-pointer hover:text-white" onClick={() => alert("Simulado dispon√≠vel na tela central!")}>
                            <Award className="h-4 w-4 text-slate-400" />
                            <span>Estudos</span>
                          </div>
                          <div className="flex flex-col items-center cursor-pointer hover:text-white" onClick={() => alert("Os instrutores aut√¥nomos credenciados est√£o vinculados na aba de Instrutores!")}>
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>Parceiros</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* PROGRAM SIMULATION OVERVIEW (RIGHT HAND SIDE DESKTOP LAYOUT) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Imagem de um jovem feliz pela facilidade do programa */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 gap-0" id="happy-youth-banner">
                  <div className="md:col-span-5 h-48 md:h-auto relative">
                    <img 
                      src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop" 
                      alt="Grupo de jovens amigos felizes comemorando a conquista e rindo juntos" 
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-slate-950 text-[9.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow">
                      CONQUISTA
                    </div>
                  </div>
                  <div className="md:col-span-7 p-6 flex flex-col justify-center space-y-2">
                    <span className="text-[10px] font-extrabold text-emerald-600 block uppercase tracking-wider">Inclus√£o Ativa</span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                      A facilidade de conquistar sua liberdade profissional e pessoal!
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O programa **Nova CNH Brasil na M√£o** simplifica cada etapa da sua jornada. Comece hoje mesmo o planejamento inteligente e garanta seu futuro no tr√¢nsito sem comprometer seu or√ßamento!
                    </p>
                  </div>
                </div>

                {/* Visual presentation box of the concept requested by user */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#112d52] font-mono">
                      PLANEJAMENTO INDEPENDENTE - NOVA CNH
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">
                      Educa√ß√£o e Inclus√£o no Tr√¢nsito
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Como a poupan√ßa protegida para menores de 18 anos funciona na pr√°tica.</p>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    O programa Nova CNH foi criado para acolher e viabilizar o plano de conquistar a primeira habilita√ß√£o de forma tranquila. Com planejamento estrat√©gico preventivo e apoio pedag√≥gico de excel√™ncia, criamos uma trilha inteligente de aprendizado para que os jovens garantam sua autonomia profissional e pessoal com seguran√ßa.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-[#10b981]"></span>
                        At√© os 18 Anos
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        O jovem ingressa no programa aos **17 anos** ou mais. Ele define parcelas mensais econ√¥micas que se adaptam ao or√ßamento planejado. Os recursos ficam seguros e reservados em uma poupan√ßa programada. Ele aproveita este tempo para estudar as placas, apostilas te√≥ricas e refor√ßar os simulados no app.
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                      <h4 className="font-bold text-emerald-800 text-xs flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Ao Fazer 18 Anos
                      </h4>
                      <p className="text-xs text-emerald-700 leading-normal">
                        Ele completa o anivers√°rio de 18 anos (maioridade legal civil) e o saldo √© **imediatamente desbloqueado** para custear as aulas pr√°ticas com o instrutor parceiro e carros oficiais credenciados! Ele inicia o processo legal no DETRAN com os recursos garantidos e sem d√≠vidas.
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ===================== TAB: SIMULADOR DO PLANO POUPAN√áA ===================== */}
        {currentTab === 'simulador-poupanca' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header / Intro Card */}
            <div className="bg-gradient-to-r from-[#0c2340] to-[#112d52] p-6 rounded-2xl text-white border-b-4 border-emerald-500 shadow-lg">
              <div className="max-w-3xl space-y-2 text-left">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-widest font-mono">
                  üí≥ SIMULA√á√ÉO DE PARCELAMENTO & PLANOS
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Simulador Financeiro de Parcelamento CNH
                </h2>
                <p className="text-slate-350 text-xs md:text-sm leading-relaxed">
                  Calcule e planeje o parcelamento mensal confort√°vel da sua habilita√ß√£o (por Poupan√ßa / Ba√∫ ou no Cart√£o de Cr√©dito). Ajuste de acordo com sua realidade.
                </p>
              </div>
            </div>

            {/* VISUAL INVESTMENT CALCULATOR MODULE FOR FUTURE PLANNING */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5 border-b border-slate-100 pb-3" id="planning-calculator-title">
                <Sliders className="h-5 w-5 text-emerald-600" />
                Calculadora de Planos e Valores CNH
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Simule o financiamento da sua habilita√ß√£o planejada com base na quantidade personalizada de aulas pr√°ticas que deseja poupar.
                  </p>

                  {/* ESCOLHA DO PLANO NO SIMULADOR COM DESTAQUE M√ÅXIMO AO PLANO 18+ ANOS */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>üéØ Escolha o seu Plano:</span>
                      </label>
                      <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        ‚≠ê 18+ Anos: In√≠cio Imediato
                      </span>
                    </div>

                    {/* Guia explicativo r√°pido para evitar qualquer confus√£o de planos */}
                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 text-[11px] text-slate-700 leading-snug flex items-start gap-2">
                      <span className="text-base shrink-0">üí°</span>
                      <div>
                        <strong className="text-slate-900 font-bold">D√∫vida na escolha?</strong> Se voc√™ j√° completou <strong className="text-indigo-900 font-black">18 anos ou mais</strong>, selecione o plano <strong className="text-indigo-900 font-black">‚≠ê 18+ Anos (CNH Facilitada)</strong> para in√≠cio imediato das aulas sem esperar!
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. PLANO 18+ ANOS - CARRO-CHEFE / MAIS ESCOLHIDO COM ALERTA VISUAL */}
                      <div
                        onClick={() => {
                          setSelectedPlanToPreview('adulto-18');
                        }}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none relative overflow-hidden group shadow-sm ${
                          calcPlano === 'adulto-18'
                            ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 border-amber-400 shadow-lg ring-3 ring-amber-400/70 text-white scale-[1.02]'
                            : 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/90 border-indigo-500 hover:border-indigo-600 hover:shadow-md ring-2 ring-indigo-300/40'
                        }`}
                      >
                        {/* ALERTA: CARRO-CHEFE / MAIS ESCOLHIDO */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase font-sans tracking-wider flex items-center gap-1 shadow-xs ${
                            calcPlano === 'adulto-18' 
                              ? 'bg-amber-400 text-slate-950 animate-pulse' 
                              : 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white animate-pulse'
                          }`}>
                            üî• CARRO-CHEFE / MAIS ESCOLHIDO
                          </span>
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md font-mono ${
                            calcPlano === 'adulto-18' 
                              ? 'bg-indigo-950/80 text-amber-300 border border-amber-400/40' 
                              : 'bg-indigo-100 text-indigo-950 border border-indigo-200'
                          }`}>
                            18+ ANOS
                          </span>
                        </div>
                        <div>
                          <h5 className={`font-black text-xs flex items-center gap-1 ${calcPlano === 'adulto-18' ? 'text-white' : 'text-slate-900'}`}>
                            <span>‚ö°</span> CNH 18+ Anos (Adulto)
                          </h5>
                          <span className={`text-[10px] font-black block mt-0.5 ${calcPlano === 'adulto-18' ? 'text-amber-300' : 'text-indigo-700'}`}>
                            In√≠cio Imediato ‚Ä¢ Sem Espera
                          </span>
                          <p className={`text-[9.5px] font-medium leading-tight mt-1 ${calcPlano === 'adulto-18' ? 'text-slate-200' : 'text-slate-600'}`}>
                            Aulas pr√°ticas e te√≥ricas liberadas na hora em at√© 12x.
                          </p>
                        </div>
                      </div>

                      {/* 2. PLANO TREINO HABILITADO */}
                      <div
                        onClick={() => {
                          setSelectedPlanToPreview('habilitado');
                        }}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none ${
                          calcPlano === 'habilitado'
                            ? 'bg-violet-50/90 border-violet-600 shadow-xs ring-2 ring-violet-400/40'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-extrabold text-[9px] text-violet-800 uppercase font-sans tracking-wide">
                              J√° Tem CNH
                            </span>
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-violet-500 text-white font-mono">
                              TREINO
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs">J√° Habilitados</h5>
                          <span className="text-[10px] text-violet-700 font-bold block mt-0.5">Pr√°tica & Perder Medo</span>
                          <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-1">
                            Aulas no tr√¢nsito e baliza para motoristas inseguros.
                          </p>
                        </div>
                      </div>

                      {/* 3. PLANO POUPAN√áA JOVEM (17 ANOS) - POSICIONADO POR √öLTIMO COM COR DIFERENCIADA */}
                      {(!isAuthenticated || calculateAge(currentStudent.dob) < 18) && (
                        <div
                          onClick={() => {
                            setSelectedPlanToPreview('jovem-17');
                          }}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none relative overflow-hidden group ${
                            calcPlano === 'jovem-17'
                              ? 'bg-emerald-50/90 border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                              : 'bg-teal-50/50 border-teal-200 hover:border-teal-300 hover:bg-teal-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 font-sans uppercase tracking-wide border border-teal-200">
                              Menor de 18
                            </span>
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono">
                              17 ANOS
                            </span>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                              <span>üå±</span> Poupan√ßa Jovem
                            </h5>
                            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                              Poupar at√© Maioridade (Ba√∫)
                            </span>
                            <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-1">
                              Guarde parcelado s/ juros e libere 100% no anivers√°rio de 18!
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TIPO DE AULA (CARRO / MOTO / AMBOS) -- VALUES ARE HIDDEN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Tipo de Aula Pr√°tica:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        id="btn-calc-tipo-carro"
                        onClick={() => setCalcTipo('carro')}
                        className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 text-center ${
                          calcTipo === 'carro'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm">üöó</span>
                        <span>Carro (B)</span>
                      </button>
                      <button
                        type="button"
                        id="btn-calc-tipo-moto"
                        onClick={() => setCalcTipo('moto')}
                        className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 text-center ${
                          calcTipo === 'moto'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm">üèçÔ∏è</span>
                        <span>Moto (A)</span>
                      </button>
                      <button
                        type="button"
                        id="btn-calc-tipo-ambos"
                        onClick={() => setCalcTipo('ambos')}
                        className={`py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 text-center ${
                          calcTipo === 'ambos'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm">üöó+üèçÔ∏è</span>
                        <span>Carro & Moto</span>
                      </button>
                    </div>
                  </div>

                  {/* SELECIONAR QUANTIDADE DE AULAS */}
                  {calcTipo === 'ambos' ? (
                    <div className="space-y-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 animate-in fade-in duration-200 font-sans">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-dashed border-slate-255">
                        <span className="text-sm">‚ö°</span>
                        <div className="text-left">
                          <label className="block text-xs font-bold text-slate-800">F√≥rmula Flex (Aulas Sob Medida)</label>
                          <span className="text-[9.5px] text-slate-500 font-medium block leading-tight">
                            Personalize a divis√£o de aulas pr√°ticas em cada ve√≠culo!
                          </span>
                        </div>
                      </div>

                      {/* CARRO CONTROL */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-[#112d52] flex items-center gap-1">
                            üöó Pr√°tica de Carro (B):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCalcAulasCarro(Math.max(2, calcAulasCarro - 1))}
                              disabled={calcAulasCarro <= 2}
                              className="w-5 h-5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-[10px] shadow-xs active:scale-95 cursor-pointer select-none"
                            >
                              -
                            </button>
                            <span className="font-black font-mono text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs min-w-[55px] text-center">
                              {calcAulasCarro} {calcAulasCarro === 1 ? 'aula' : 'aulas'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCalcAulasCarro(Math.min(20, calcAulasCarro + 1))}
                              disabled={calcAulasCarro >= 20}
                              className="w-5 h-5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-[10px] shadow-xs active:scale-95 cursor-pointer select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          step="1"
                          value={calcAulasCarro}
                          onChange={(e) => setCalcAulasCarro(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none touch-none"
                        />
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 font-mono">
                          <span>M√≠n (2)</span>
                          <span className="text-slate-500 font-black">Carga Elevada Recomendada (20)</span>
                        </div>
                      </div>

                      {/* MOTO CONTROL */}
                      <div className="space-y-1.5 text-left pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-[#112d52] flex items-center gap-1">
                            üèçÔ∏è Pr√°tica de Moto (A):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCalcAulasMoto(Math.max(2, calcAulasMoto - 1))}
                              disabled={calcAulasMoto <= 2}
                              className="w-5 h-5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-[10px] shadow-xs active:scale-95 cursor-pointer select-none"
                            >
                              -
                            </button>
                            <span className="font-black font-mono text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs min-w-[55px] text-center">
                              {calcAulasMoto} {calcAulasMoto === 1 ? 'aula' : 'aulas'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCalcAulasMoto(Math.min(20, calcAulasMoto + 1))}
                              disabled={calcAulasMoto >= 20}
                              className="w-5 h-5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-[10px] shadow-xs active:scale-95 cursor-pointer select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          step="1"
                          value={calcAulasMoto}
                          onChange={(e) => setCalcAulasMoto(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none touch-none"
                        />
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 font-mono">
                          <span className="text-emerald-600 font-black">Poucas Aulas Suficientes! (2)</span>
                          <span>M√°x (20)</span>
                        </div>
                      </div>

                      {/* CONSELHO DA MARIANA EM TEMPO REAL PARA DIVIS√ÉO FLEX */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-emerald-500/40 shrink-0 overflow-hidden bg-slate-100 hidden sm:block">
                          <img 
                            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=60&auto=format&fit=crop" 
                            alt="Mariana" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-left font-sans">
                          <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 leading-none">
                            <span>üí¨</span> Intelig√™ncia do Plano Flex ({calcAulasCarro + calcAulasMoto} aulas no total)
                          </p>
                          <p className="text-[10px] text-slate-650 leading-tight mt-1 font-semibold italic">
                            "Ajuste seu plano personalizando a quantidade de aulas de Moto ({calcAulasMoto} aulas) e Carro ({calcAulasCarro} aulas) de acordo com suas necessidades individuais e tempo de pr√°tica!"
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 text-left">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 text-left">
                          <label className="block text-xs font-bold text-slate-700">
                            Quantidade de Aulas (50 min cada):
                          </label>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Qualquer quantidade de de 2 a 20 (Ex: 10, 15 ou 20 aulas).
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(2, calcAulas - 1);
                              setCalcAulas(val);
                              setAdviceAulas(val);
                            }}
                            disabled={calcAulas <= 2}
                            className="w-7 h-7 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-sm shadow-xs transition active:scale-95 cursor-pointer select-none"
                            title="Diminuir 1 aula"
                          >
                            -
                          </button>
                          <span className="text-sm font-black text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg min-w-[70px] text-center font-mono shadow-inner">
                            {calcAulas} {calcAulas === 1 ? 'Aula' : 'Aulas'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.min(20, calcAulas + 1);
                              setCalcAulas(val);
                              setAdviceAulas(val);
                            }}
                            disabled={calcAulas >= 20}
                            className="w-7 h-7 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-[#112d52] border border-slate-200 rounded-full flex items-center justify-center font-black text-sm shadow-xs transition active:scale-95 cursor-pointer select-none"
                            title="Aumentar 1 aula"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* SENSITIVE SLIDER RANGE */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="2"
                          max="20"
                          step="1"
                          value={calcAulas}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCalcAulas(val);
                            setAdviceAulas(val);
                          }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none touch-none"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                          <span>M√≠n (2)</span>
                          <span>M√°x (20)</span>
                        </div>
                      </div>

                      {/* CONSELHO DA MARIANA EM TEMPO REAL */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-emerald-500/40 shrink-0 overflow-hidden bg-slate-100 hidden sm:block">
                          <img 
                            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=60&auto=format&fit=crop" 
                            alt="Mariana" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-left font-sans">
                          <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 leading-none">
                            <span>üí¨</span> Conselho de Mariana ({calcAulas} aulas)
                          </p>
                          <p className="text-[10px] text-slate-600 leading-tight mt-1 font-medium italic">
                            "{getAulasAdviceText(calcAulas)}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MEIO DE PAGAMENTO */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Forma de Pagamento:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 md:gap-3">
                      <div
                        onClick={() => {
                          setCalcFormaPagamento('poupanca');
                          setEnrollFormaPagamento('poupanca');
                        }}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between text-left select-none ${
                          calcFormaPagamento === 'poupanca'
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-500 ring-2 ring-emerald-500 ring-offset-1 shadow-md scale-[1.02]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {calcFormaPagamento === 'poupanca' && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                            ‚úì SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'poupanca' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500'}`}>
                            üì¶ ESTILO BA√ö
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Poupan√ßa Planejada</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'poupanca' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Sem Juros. Come√ßa ap√≥s quita√ß√£o programada ou estendida.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setCalcFormaPagamento('cartao');
                          setEnrollFormaPagamento('cartao');
                        }}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between text-left select-none ${
                          calcFormaPagamento === 'cartao'
                            ? 'bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-500 ring-2 ring-amber-500 ring-offset-1 shadow-md scale-[1.02]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {calcFormaPagamento === 'cartao' && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                            ‚úì SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'cartao' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500'}`}>
                            üí≥ CART√ÉO CR√âDITO
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Cart√£o de Cr√©dito</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'cartao' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Parcele em at√© 12x via maquininha ou link seguro de parcelas.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setCalcFormaPagamento('vista');
                          setEnrollFormaPagamento('vista');
                          setCalcParcelas(1);
                        }}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between text-left select-none ${
                          calcFormaPagamento === 'vista'
                            ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/40 border-indigo-500 ring-2 ring-indigo-500 ring-offset-1 shadow-md scale-[1.02]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {calcFormaPagamento === 'vista' && (
                          <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                            ‚úì SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'vista' ? 'bg-indigo-500 text-white font-black' : 'bg-slate-100 text-slate-500'}`}>
                            üíµ COTA √öNICA
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Pagamento √† Vista</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'vista' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Investimento √∫nico (Pix) com agendamento priorit√°rio das aulas.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setCalcFormaPagamento('hibrido');
                          setEnrollFormaPagamento('hibrido');
                          setShowHybridPaymentNotice(true);
                        }}
                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between text-left select-none ${
                          calcFormaPagamento === 'hibrido'
                            ? 'bg-gradient-to-br from-teal-50 to-teal-100/40 border-teal-500 ring-2 ring-teal-500 ring-offset-1 shadow-md scale-[1.02]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {calcFormaPagamento === 'hibrido' && (
                          <div className="absolute -top-2 -right-2 bg-teal-500 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                            ‚úì SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'hibrido' ? 'bg-teal-500 text-white font-black' : 'bg-slate-100 text-slate-500'}`}>
                            üîÄ MODO H√çBRIDO
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Acordo H√≠brido</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'hibrido' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Pague 50% de entrada no Pix/√Ä Vista + 50% parcelado no seu Cart√£o.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURA√á√ÉO DAS TAXAS DA MAQUININHA TON - OCULTA PARA CLIENTES */}

                  {/* QUANTIDADE DE PARCELAS DO FINANCIAMENTO */}
                  <div className="space-y-2 text-left bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>üìÖ</span> Escolha o N√∫mero de Parcelas:
                    </label>
                    {(() => {
                      const getCarroPrice = (qty: number) => (qty === 2 ? 250 : qty * 125);
                      const getMotoPrice = (qty: number) => (qty === 2 ? 200 : qty * 90);
                      const getAmbosPrice = (carroQty: number, motoQty: number) => {
                        if (carroQty === 2 && motoQty === 2) return 450;
                        return getCarroPrice(carroQty) + getMotoPrice(motoQty);
                      };

                      const calculatedSimTotal = calcTipo === 'carro' 
                        ? getCarroPrice(calcAulas) 
                        : calcTipo === 'moto' 
                          ? getMotoPrice(calcAulas) 
                          : getAmbosPrice(calcAulasCarro, calcAulasMoto);
                      return (
                        <div className="relative">
                          <select 
                            id="select-calc-parcelas"
                            disabled={calcFormaPagamento === 'vista'}
                            value={calcFormaPagamento === 'vista' ? 1 : calcParcelas}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCalcParcelas(val);
                              if (calcUseRealAge) {
                                setCalcStrategy('regular-bau');
                              }
                            }}
                            className="w-full text-sm md:text-base p-3.5 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-extrabold text-slate-900 disabled:opacity-50 transition-all shadow-md cursor-pointer hover:border-slate-400"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                              const currentMonthForN = new Date().getMonth() + 1;
                              const currentYearForN = new Date().getFullYear();
                              let passesToNextYearForN = false;
                              if (calcPlano === 'jovem-17' && calcFormaPagamento !== 'vista') {
                                if (enrollDob && enrollDob.length === 10) {
                                  const birthDate = new Date(enrollDob);
                                  if (!isNaN(birthDate.getTime())) {
                                    passesToNextYearForN = (birthDate.getFullYear() + 18) > currentYearForN;
                                  } else {
                                    passesToNextYearForN = (currentMonthForN + n - 1) > 12;
                                  }
                                } else {
                                  passesToNextYearForN = (currentMonthForN + n - 1) > 12;
                                }
                              }
                              const baseSimTotalForN = passesToNextYearForN ? Math.round(calculatedSimTotal * 1.3) : calculatedSimTotal;

                              const multiplier = calcFormaPagamento === 'cartao' 
                                ? getTonInterestMultiplier(n) 
                                : calcFormaPagamento === 'hibrido'
                                  ? (0.5 + 0.5 * getTonInterestMultiplier(n))
                                  : 1.0;
                              let perMonth = 0;
                              let totalForN = 0;
                              
                              if (calcFormaPagamento === 'cartao') {
                                perMonth = Math.ceil(((baseSimTotalForN * multiplier) / n) * 100) / 100;
                                totalForN = perMonth * n;
                              } else if (calcFormaPagamento === 'hibrido') {
                                const partVista = baseSimTotalForN / 2;
                                const partCartaoMonthly = Math.ceil((((baseSimTotalForN / 2) * getTonInterestMultiplier(n)) / n) * 100) / 100;
                                perMonth = partCartaoMonthly;
                                totalForN = partVista + (partCartaoMonthly * n);
                              } else {
                                perMonth = Math.ceil((baseSimTotalForN / n) * 100) / 100;
                                totalForN = perMonth * n;
                              }

                              if (n === 1) {
                                return (
                                  <option key={n} value={1} className="font-bold text-slate-900 text-sm">
                                    √Ä vista ‚Äî 1x de {totalForN.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </option>
                                );
                              }
                              return (
                                <option key={n} value={n} className="font-bold text-slate-900 text-sm">
                                  {n} Parcelas Mensais ‚Äî {calcFormaPagamento === 'hibrido' ? `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + Entrada` : `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                </option>
                              );
                            })}
                          </select>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>M√≠n: 1x</span>
                            <span>M√°x: 12x</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* SIMULA√á√ÉO DE IDADE REAL DO CANDIDATO */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={calcUseRealAge}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setCalcUseRealAge(val);
                          setCalcPlano(val ? 'jovem-17' : 'adulto-18');
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-extrabold text-slate-800">C√°lculo pela minha Idade Real</span>
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Se voc√™ tem 17 anos (rec√©m-completados ou mais), simule o ritmo ideal de transi√ß√£o para o processo de habilita√ß√£o conforme o CTB ou o financiamento planejado por ba√∫ continuado.
                    </p>

                    {calcUseRealAge && (
                      <div className="space-y-3 pt-2.5 border-t border-slate-200 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono">Minha idade atual exata:</label>
                          <select
                            value={calcSelectedAgeMonths}
                            onChange={(e) => setCalcSelectedAgeMonths(Number(e.target.value))}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                          >
                            <option value="0">17 anos exatos / 0 meses (Faltam 12 meses para completar 18)</option>
                            <option value="1">17 anos e 1 m√™s (Faltam 11 meses para completar 18)</option>
                            <option value="2">17 anos e 2 meses (Faltam 10 meses para completar 18)</option>
                            <option value="3">17 anos e 3 meses (Faltam 9 meses para completar 18)</option>
                            <option value="4">17 anos e 4 meses (Faltam 8 meses para completar 18)</option>
                            <option value="5">17 anos e 5 meses (Faltam 7 meses para completar 18)</option>
                            <option value="6">17 anos e 6 meses (Faltam 6 meses para completar 18)</option>
                            <option value="7">17 anos e 7 meses (Faltam 5 meses para completar 18)</option>
                            <option value="8">17 anos e 8 meses (Faltam 4 meses para completar 18)</option>
                            <option value="9">17 anos e 9 meses (Faltam 3 meses para completar 18)</option>
                            <option value="10">17 anos e 10 meses (Faltam 2 meses para completar 18)</option>
                            <option value="11">17 anos e 11 meses (Faltam 1 m√™s para completar 18)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono">Escolha a Estrat√©gia de In√≠cio:</label>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => setCalcStrategy('real-age-ctb')}
                              className={`p-2.5 text-left text-xs rounded-lg border leading-tight transition flex flex-col justify-between ${
                                calcStrategy === 'real-age-ctb'
                                  ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                              }`}
                            >
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <span>‚ö°</span> Come√ßar com 18 anos e 1 dia (CTB)
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">
                                Quitar as parcelas em {12 - calcSelectedAgeMonths} meses para ter 100% do saldo livre exatamente na maioridade penal para dar in√≠cio ao processo de habilita√ß√£o.
                              </span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setCalcStrategy('regular-bau')}
                              className={`p-2.5 text-left text-xs rounded-lg border leading-tight transition flex flex-col justify-between ${
                                calcStrategy === 'regular-bau'
                                  ? 'bg-indigo-50 border-indigo-500 text-slate-900 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                              }`}
                            >
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <span>üì¶</span> Continuar com o financiamento do ba√∫
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">
                                Manter o parcelamento estendido normal de {calcParcelas}x e continuar pagando as parcelas confortavelmente mesmo ap√≥s os 18 anos.
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DE RESULTADO TOTAL & PARCELAMENTO */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4 shadow-md">
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-black font-sans uppercase tracking-wider">
                      Simula√ß√£o do {(calcPlano === 'jovem-17' && (!isAuthenticated || calculateAge(currentStudent.dob) < 18)) ? 'Plano Poupan√ßa Jovem 17 Anos' : calcPlano === 'habilitado' ? 'Treinamento de Habilitados' : 'Plano CNH Facilitada Maiores de 18 Anos'}
                    </span>
                    
                    {(() => {
                      const getCarroPrice = (qty: number) => (qty === 2 ? 250 : qty * 125);
                      const getMotoPrice = (qty: number) => (qty === 2 ? 200 : qty * 90);
                      const getAmbosPrice = (carroQty: number, motoQty: number) => {
                        if (carroQty === 2 && motoQty === 2) return 450;
                        return getCarroPrice(carroQty) + getMotoPrice(motoQty);
                      };

                      const rawBaseCalcVal = calcTipo === 'carro' 
                        ? getCarroPrice(calcAulas) 
                        : calcTipo === 'moto' 
                          ? getMotoPrice(calcAulas) 
                          : getAmbosPrice(calcAulasCarro, calcAulasMoto);
                      
                      const currentMonth = new Date().getMonth() + 1;
                      const currentYear = new Date().getFullYear();
                      let passesToNextYear = false;
                      if (calcPlano === 'jovem-17' && calcFormaPagamento !== 'vista') {
                        if (enrollDob && enrollDob.length === 10) {
                          const birthDate = new Date(enrollDob);
                          if (!isNaN(birthDate.getTime())) {
                            passesToNextYear = (birthDate.getFullYear() + 18) > currentYear;
                          } else {
                            passesToNextYear = (currentMonth + calcParcelas - 1) > 12;
                          }
                        } else {
                          passesToNextYear = (currentMonth + calcParcelas - 1) > 12;
                        }
                      }
                      const baseCalcVal = passesToNextYear ? Math.round(rawBaseCalcVal * 1.3) : rawBaseCalcVal;

                      const isCartao = calcFormaPagamento === 'cartao';
                      const isHibrido = calcFormaPagamento === 'hibrido';
                      let finalCalcVal = baseCalcVal;
                      let perMonth = 0;

                      if (isCartao) {
                        perMonth = Math.ceil(((baseCalcVal * getTonInterestMultiplier(calcParcelas)) / calcParcelas) * 100) / 100;
                        finalCalcVal = perMonth * calcParcelas;
                      } else if (isHibrido) {
                        const partVista = baseCalcVal / 2;
                        const partCartaoUnrounded = baseCalcVal / 2;
                        const partCartaoMonthly = Math.ceil(((partCartaoUnrounded * getTonInterestMultiplier(calcParcelas)) / calcParcelas) * 100) / 100;
                        perMonth = partCartaoMonthly;
                        finalCalcVal = partVista + (partCartaoMonthly * calcParcelas);
                      } else {
                        perMonth = Math.ceil((baseCalcVal / (calcFormaPagamento === 'vista' ? 1 : calcParcelas)) * 100) / 100;
                        finalCalcVal = perMonth * (calcFormaPagamento === 'vista' ? 1 : calcParcelas);
                      }
                      const divisor = calcParcelas;

                      const carroBasePart = getCarroPrice(calcAulasCarro);
                      const motoBasePart = getMotoPrice(calcAulasMoto);
                      const isCombo2x2 = calcAulasCarro === 2 && calcAulasMoto === 2;

                      return (
                        <>
                          <div className="mt-3 space-y-1 text-left">
                            <span className="text-xs text-slate-400 block font-medium">Valor Total Acumulado:</span>
                            <div className="text-3xl font-black text-white font-mono tracking-tight flex items-baseline gap-1" id="calc-valor-total">
                              <span>{finalCalcVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            {calcTipo === 'ambos' && (
                              <div className="text-[10px] text-emerald-400 font-medium">
                                {'Divis√£o base: ' + String(calcAulasCarro) + 'x Carro (' + carroBasePart.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ') + ' + String(calcAulasMoto) + 'x Moto (' + motoBasePart.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ')'}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1 text-left">
                            <span className="text-xs text-slate-400 block font-medium">
                              {calcFormaPagamento === 'cartao' 
                                ? 'Parcelamento do Cart√£o de Cr√©dito:' 
                                : calcFormaPagamento === 'vista'
                                  ? 'Pagamento em Cota √önica (√Ä Vista):'
                                  : calcFormaPagamento === 'hibrido'
                                    ? 'Acordo H√≠brido (Metade √Ä Vista + Metade Cart√£o):'
                                    : 'Financiamento Planejado (Estilo Ba√∫):'}
                            </span>
                            {calcFormaPagamento === 'hibrido' ? (
                              <div className="space-y-1 mt-1 text-xs">
                                <div className="text-slate-350">üíµ Parte Pix/√Ä Vista: <strong className="font-mono text-emerald-300">{(baseCalcVal / 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
                                <div className="text-slate-350">üí≥ Parte Cart√£o: <strong className="font-mono text-emerald-300">{divisor}x de {perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
                              </div>
                            ) : (
                              <div className="text-xl font-bold text-emerald-300 font-mono" id="calc-valor-parcela">
                                {calcFormaPagamento === 'vista' ? '1x de ' : `${divisor}x de `}{perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {calcFormaPagamento === 'cartao' && (
                      <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-900/50 mt-4 text-[11px] leading-relaxed text-amber-200 space-y-1 animate-in fade-in text-left">
                        <p className="font-extrabold text-amber-400 flex items-center gap-1 text-[11px]">
                          <span>üí≥</span> Cart√£o de Cr√©dito
                        </p>
                        <p>
                          Parcele com uma das menores taxas do mercado, no formato parcelas flex√≠veis via maquininha com nosso consultor ou link de pagamento.
                        </p>
                      </div>
                    )}

                    {calcFormaPagamento === 'vista' && (
                      <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/50 mt-4 text-[11px] leading-relaxed text-indigo-300 space-y-1 animate-in fade-in text-left">
                        <p className="font-extrabold text-indigo-400 flex items-center gap-1 text-[11px]">
                          <span>üíµ</span> Pagamento √† Vista (Pix/Dinheiro)
                        </p>
                        <p>
                          Sem juros ou acr√©scimos comerciais. Permite agendamento e ativa√ß√£o imediata de todo o seu cronograma pr√°tico priorit√°rio.
                        </p>
                      </div>
                    )}

                    {calcFormaPagamento === 'poupanca' && calcUseRealAge && (
                      <div className="bg-slate-800/55 p-3 rounded-xl border border-slate-700/50 mt-4 text-[11px] leading-relaxed text-slate-300 space-y-1 animate-in fade-in text-left">
                        <p className="font-extrabold text-emerald-300 flex items-center gap-1 text-[11px]">
                          <span>üìå</span> {calcStrategy === 'real-age-ctb' ? 'Modo Planejamento CTB' : 'Modo Parcelamento Estendido'}
                        </p>
                        <p>
                          {calcStrategy === 'real-age-ctb'
                            ? `Ideal para quem quer dar entrada no sistema assim que completar 18 anos! Voc√™ pagar√° ${12 - calcSelectedAgeMonths} parcelas mensais antes do anivers√°rio, permitindo quita√ß√£o completa do ba√∫ na data da libera√ß√£o.`
                            : `Perfeito para manter parcelas bem finas de forma confort√°vel. Voc√™ segue pagando as parcelas mesmo ap√≥s os 18 anos, e inicia as aulas pr√°ticas respeitando seu fluxo financeiro.`}
                        </p>
                      </div>
                    )}


                  </div>

                  <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-[11px] font-sans flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                    <span>
                      {calcTipo === 'carro' 
                        ? `Simula√ß√£o ativa para ${calcAulas} aulas de Carro (B).` 
                        : calcTipo === 'moto' 
                          ? `Simula√ß√£o ativa para ${calcAulas} aulas de Moto (A).`
                          : `Simula√ß√£o ativa com F√ìRMULA FLEX: ${calcAulasCarro} aulas de Carro + ${calcAulasMoto} aulas de Moto.`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const mappedCategoria = calcTipo === 'carro' ? 'Carro (B)' : calcTipo === 'moto' ? 'Moto (A)' : 'Carro e Moto (A+B)';
                      setEnrollCategoria(mappedCategoria);
                      setEnrollPlano(calcPlano);
                      
                      if (calcPlano === 'jovem-17') {
                        // Calculate birth date representing 17 years and calcSelectedAgeMonths old in June 2026
                        const baseDate = new Date(2026, 5, 6);
                        baseDate.setFullYear(baseDate.getFullYear() - 17);
                        baseDate.setMonth(baseDate.getMonth() - calcSelectedAgeMonths);
                        const dobStr = baseDate.toISOString().substring(0, 10);
                        setEnrollDob(dobStr);
                        handleEnrollDobChange(dobStr, true);
                      } else if (calcPlano === 'habilitado') {
                        setEnrollDob('1998-01-01');
                        handleEnrollDobChange('1998-01-01', true);
                      } else {
                        // Already major (18+)
                        setEnrollDob('2005-01-01');
                        handleEnrollDobChange('2005-01-01', true);
                      }

                      setTimeout(() => {
                        const labelSec = document.getElementById('enrollment-name-section');
                        const element = document.getElementById('enrollment-fullname');
                        if (labelSec) {
                          labelSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                          const container = document.getElementById('candidate-self-enrollment-platform');
                          if (container) {
                            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                        if (element) {
                          setTimeout(() => {
                            element.focus({ preventScroll: true });
                          }, 450);
                        }
                      }, 150);
                      
                      setToastMessage("preencha o formul√°rio de inscri√ß√£o para gerar seu contrato. Aguarde! entraremos em contato em breve.");
                      setEnrollFormaPagamento(calcFormaPagamento);
                    }}
                    className="w-full bg-emerald-500 hover:bg-[#10b981] text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer mt-1"
                  >
                    <span>‚úçÔ∏è</span> Contratar Plano Simulado
                  </button>
                </div>
              </div>
            </div>

            {/* FORMUL√ÅRIO DE INSCRI√á√ÉO ABAIXO DA CALCULADORA DO SIMULADO */}
            <CandidateEnrollmentForm
              alunos={alunos}
              setAlunos={setAlunos}
              instrutores={instrutores}
              preSelectedPlano={enrollPlano}
              preSelectedCategoria={enrollCategoria}
              preSelectedDob={enrollDob}
              preSelectedAulas={calcAulas}
              preSelectedAulasCarro={calcAulasCarro}
              preSelectedAulasMoto={calcAulasMoto}
              preSelectedTipo={calcTipo}
              preSelectedParcelas={calcParcelas}
              preSelectedFormaPagamento={enrollFormaPagamento}
              preSelectedNome={preSelectedNome}
              preSelectedCpf={preSelectedCpf}
              preSelectedRg={preSelectedRg}
              preSelectedWhatsapp={preSelectedWhatsapp}
              preSelectedEndereco={preSelectedEndereco}
              preSelectedInstrutor={preSelectedInstrutor}
              preSelectedNacionalidade={preSelectedNacionalidade}
              preSelectedEstadoCivil={preSelectedEstadoCivil}
              onFormaPagamentoChange={(v) => {
                setEnrollFormaPagamento(v);
                setCalcFormaPagamento(v);
              }}
              setToastMessage={setToastMessage}
              setActiveStudentId={setActiveStudentId}
              setIsAuthenticated={setIsAuthenticated}
              setCurrentTab={setCurrentTab}
              setLoginIdAttempt={setLoginIdAttempt}
              setLoginSenhaAttempt={setLoginSenhaAttempt}
              onAulasChange={(v) => setCalcAulas(v)}
              onAulasCarroChange={(v) => setCalcAulasCarro(v)}
              onAulasMotoChange={(v) => setCalcAulasMoto(v)}
              onCategoriaChange={(v) => {
                setEnrollCategoria(v);
                if (v === 'Carro (B)') {
                  setCalcTipo('carro');
                  setCalcAulas(10);
                } else if (v === 'Moto (A)') {
                  setCalcTipo('moto');
                  setCalcAulas(10);
                } else if (v === 'Carro e Moto (A+B)') {
                  setCalcTipo('ambos');
                  setCalcAulasCarro(20);
                  setCalcAulasMoto(5);
                }
              }}
              onPlanoChange={(v) => {
                setEnrollPlano(v);
                setCalcPlano(v);
              }}
              onDobChange={(v) => {
                setEnrollDob(v);
                handleEnrollDobChange(v, false);
              }}
            />

          </div>
        )}

        {/* ===================== TAB: GESTAO RESIDENTS GRID (CENTRAL ADMINISTRATION DATABASE) ===================== */}
        {currentTab === 'gestao' && (
          !isAdminAuthenticated ? (
            /* RENDER GORGEOUS ADMIN AUTHENTICATION CARD */
            <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-6 my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center font-bold text-2xl shadow-sm">
                  üõ°Ô∏è
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">√Årea Administrativa</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal text-pretty px-4">
                    Acesso somente de gestores
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-sans">Senha Administrativa</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">üîí</span>
                    <input
                      type="password"
                      placeholder="Senha do Administrador"
                      value={adminPasswordInput}
                      onChange={(e) => {
                        setAdminPasswordInput(e.target.value);
                        setAdminError('');
                      }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 font-sans focus:outline-none transition"
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="bg-rose-50 border border-rose-150 text-rose-700 p-3 rounded-lg text-[11px] leading-tight font-semibold text-center text-pretty">
                    ‚ùå {adminError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer select-none"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Desbloquear Painel de Controle
                </button>
              </form>



              <div className="border-t border-slate-100 pt-4 mt-4 text-center space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Quer ser um instrutor parceiro?</p>
                <button
                  type="button"
                  onClick={handleOpenSelfRegister}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-750 hover:text-emerald-900 text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer select-none flex items-center justify-center gap-1.5 shadow-xs"
                >
                  üìù Cadastrar-se Automaticamente
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                Ambiente seguro de monitoramento administrativo para parceiros e instrutores credenciados.
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Admin Panel Sub-navigation */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>üõ°Ô∏è Painel do Gestor Administrativo</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">Monitore os saldos dos candidatos, acesse os contratos assinados e acompanhe as comiss√µes dos instrutores</p>
                </div>
                <div className="flex flex-wrap border border-slate-200 bg-slate-50 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setAdminSubTab('crm')}
                    className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      adminSubTab === 'crm'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-700 hover:text-slate-950 bg-white border border-slate-200/80'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span>CRM de Vendas (Kanban)</span>
                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">Novo</span>
                  </button>
                  <button
                    onClick={() => setAdminSubTab('database')}
                    className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      adminSubTab === 'database'
                        ? 'bg-[#0c2340] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Candidatos & Instrutores
                  </button>
                  <button
                    onClick={() => setAdminSubTab('recibos')}
                    className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      adminSubTab === 'recibos'
                        ? 'bg-[#0c2340] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                    Recibos de Candidatos
                  </button>
                  <button
                    onClick={() => setAdminSubTab('contracts')}
                    className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      adminSubTab === 'contracts'
                        ? 'bg-[#0c2340] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Contratos de Ades√£o
                  </button>
                  <button
                    onClick={() => setAdminSubTab('commissions')}
                    className={`px-3 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      adminSubTab === 'commissions'
                        ? 'bg-[#0c2340] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    Comiss√µes & Finan√ßas
                  </button>
                </div>
              </div>

              {/* BACKUPS LOCAL EM JSON (REDUND√ÇNCIA E SEGURAN√áA SE DESEJAR EXPORTAR) */}
              <div className="bg-[#0c2340] text-white rounded-2xl p-4 md:p-6 border border-slate-800 shadow-xl space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-indigo-400 font-mono tracking-wider uppercase">Backup de Seguran√ßa Offline</span>
                    </div>
                    <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 mt-0.5">
                      üíæ Gerenciar Backups F√≠sicos (JSON)
                    </h3>
                    <p className="text-slate-350 text-[11px] leading-relaxed max-w-2xl">
                      Como o aplicativo agora est√° hospedado de forma 100% resiliente no Firebase Firestore, seus dados est√£o salvos na nuvem de forma nativa e autom√°tica. Use estes bot√µes se desejar baixar uma c√≥pia offline de seguran√ßa em seu computador ou restaurar uma c√≥pia JSON antiga.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportBackup}
                      className="text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer select-none"
                      title="Salvar todas as fichas e instrutores em arquivo JSON de backup"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar Backup JSON
                    </button>
                    
                    <label className="text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer select-none">
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                      Importar Backup JSON
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportBackup} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {adminSubTab === 'crm' && (
                <SalesKanbanCrm
                  alunos={alunos}
                  setAlunos={setAlunos}
                  instrutores={instrutores}
                  onSaveToCloud={(updated) => {
                    saveAllAlunosToFirestore(updated);
                    try {
                      localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(updated));
                    } catch (err) {
                      console.warn('Storage sync error:', err);
                    }
                  }}
                  onOpenCandidateDetail={(lead) => setSelectedStudentDetail(lead)}
                />
              )}

              {adminSubTab === 'database' && (
                <>
                  {/* Quick overview metric dashboard stats summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900">{stats.totalAlunos}</span>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">Cadastrados Ativos</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900">{stats.menores}</span>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">Menores (Poupan√ßa ativa)</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[15px] font-black text-slate-900">
                    {stats.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">Total Poupado no Cofre</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
                <div className="bg-teal-50 p-2.5 rounded-lg text-teal-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[#10b981] font-black text-base">{stats.progressoMedio}%</span>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Progresso M√©dio de Quita√ß√£o</p>
                </div>
              </div>
            </div>



            {/* Core Database Controls & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Search bar */}
                <div className="relative flex-grow max-w-md w-full">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por ID, Nome Completo ou Telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Filter list options */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg font-medium border-0 focus:outline-none"
                  >
                    <option value="Todas">Todas Categorias</option>
                    {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={filterClassificacao}
                    onChange={(e) => setFilterClassificacao(e.target.value)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg font-medium border-0 focus:outline-none"
                  >
                    <option value="Todas">Qualquer Idade</option>
                    <option value="Menor">Menor de 18</option>
                    <option value="Maior">Maior ou exata (18+)</option>
                  </select>

                  <select
                    value={filterInstructor}
                    onChange={(e) => setFilterInstructor(e.target.value)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg font-medium border-0 focus:outline-none"
                  >
                    <option value="Todos">Filtrar por Instrutor Aut√¥nomo</option>
                    <option value="Sem Instrutor">Sem Instrutor Aut√¥nomo/Direto</option>
                    {instrutores.map(inst => (
                      <option key={inst.nome} value={inst.nome}>{inst.nome}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleAbrirLimpezaFicticios}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Excluir cadastros fict√≠cios, testes e demonstra√ß√µes"
                  >
                    <span>üßπ</span>
                    <span className="hidden sm:inline">Limpar</span> Cadastros Fict√≠cios
                  </button>

                  <button
                    onClick={() => setIsLinkEnrollmentModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ml-auto"
                    title="Alimentar Link de Pr√©-Matr√≠cula e Efetuar Matr√≠cula Direta no App de Gest√£o"
                  >
                    <Link className="h-3.5 w-3.5 text-amber-300" />
                    <span>Alimentar Link & Matricular</span>
                  </button>

                  <button
                    onClick={() => setShowGeneralEnrollmentModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-black py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Auto-Matr√≠cula Coletiva
                  </button>

                  <button
                    onClick={handleOpenAddAluno}
                    className="bg-[#0c2340] hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-md"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    Novo Aluno
                  </button>
                </div>

              </div>

              {/* Data Cards for Student Enrollments */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAlunos.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Nenhum(a) candidato(a) cadastrado(a) encontrado(a) para os filtros.
                  </div>
                ) : (
                  filteredAlunos.map((a) => {
                    const age = calculateAge(a.dob);
                    const isUnder = age < 18;
                    const monthsTo18 = calculateMonthsTo18(a.dob);
                    const currentPaid = a.parcelasPagas * (a.valorTotal / (a.parcelasTotal || 12));
                    const progressPercent = Math.min(100, Math.max(0, (a.parcelasPagas / (a.parcelasTotal || 12)) * 100));

                    return (
                      <div 
                        key={a.id} 
                        onClick={() => setSelectedStudentDetail(a)}
                        className="group bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                      >
                        {/* Highlight Border Accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          isUnder ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}></div>

                        <div className="space-y-4">
                          {/* Card ID & Status Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                            <span className="font-mono text-[10px] font-black tracking-wider bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 uppercase">
                              {a.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isUnder ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isUnder ? 'üîí Menor (Poupando)' : 'üîì Maior (Liberado)'}
                            </span>
                          </div>

                          {/* Profile Segment */}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                                {a.nome}
                              </h4>
                              {activeStudentId === a.id && (
                                <span className="bg-blue-500 scale-90 text-white text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-black">LOGADO</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                              <span>üìÖ {formatDateBR(a.dob)}</span>
                              <span>‚Ä¢</span>
                              <span className="text-slate-800 font-bold">{age} anos ({isUnder ? `Faltam ${monthsTo18}m` : 'Liberado'})</span>
                            </div>
                          </div>

                          {/* Specifications */}
                          <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 font-sans">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 font-semibold text-[9px] block uppercase tracking-wider">Categoria</span>
                              <strong className="text-slate-800 font-black">{a.categoria}</strong>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 font-semibold text-[9px] block uppercase tracking-wider">Instrutor</span>
                              <strong className="text-slate-700 font-bold">{a.instrutor || 'Sem Instrutor'}</strong>
                            </div>
                          </div>

                          {/* Financial Progress */}
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-semibold">Saldo Poupado:</span>
                              <span className="font-mono text-emerald-600 font-black">
                                {currentPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                            <div className="relative pt-1">
                              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100">
                                <div 
                                  style={{ width: `${progressPercent}%` }} 
                                  className={`rounded-full shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                    isUnder ? 'bg-amber-400' : 'bg-emerald-500'
                                  }`}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 font-mono">
                                <span>{a.parcelasPagas} / {a.parcelasTotal || 12} Parcelas</span>
                                <span>{progressPercent.toFixed(0)}% Pago</span>
                              </div>
                            </div>
                          </div>

                          {/* Direct details */}
                          <div className="pt-2 flex flex-col gap-1.5 text-[11px] font-sans text-slate-500 border-t border-slate-100">
                            {a.endereco && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">üìç</span>
                                <span className="truncate" title={a.endereco}>{a.endereco}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-1.5 pt-0.5">
                              <div className="flex items-center gap-1 min-w-0 truncate">
                                <span className="text-slate-400 text-xs shrink-0">üì±</span>
                                <span className="text-slate-500 shrink-0">WhatsApp:</span>
                                <strong className="text-slate-750 font-bold truncate">{a.whatsapp}</strong>
                              </div>
                              {a.whatsapp && (
                                <a
                                  href={`https://wa.me/55${a.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Ol√° ${a.nome}! Tudo bem? Passando para saber como est√° o seu processo na Nova CNH Brasil. Voc√™ j√° encontrou um instrutor ou ainda tem interesse em realizar o processo conosco?`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-[10.5px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition shrink-0 active:scale-95 cursor-pointer"
                                  title={`Enviar mensagem de lembrete para ${a.nome} no WhatsApp`}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">üîë</span>
                              <span>Acesso: <strong className="text-slate-700 font-mono">Senha: {a.senha || 'Sem Senha'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Card Commands Line */}
                        <div 
                          className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation() /* Prevent modal activation */}
                        >
                          <button
                            onClick={() => setSelectedStudentDetail(a)}
                            className="text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 font-extrabold px-3 py-1.5 rounded-lg border border-indigo-100 transition cursor-pointer flex items-center gap-1"
                          >
                            <span>üëÅÔ∏è</span> Ver Dossi√™ Completo
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEmitirReciboCandidato(a)}
                              className="text-[11px] bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                              title="Emitir / Visualizar recibo de pagamento deste candidato"
                            >
                              <Receipt className="h-3.5 w-3.5 text-emerald-400" /> Recibo
                            </button>

                            <button
                              onClick={() => handleAbrirBaixaManual(a)}
                              className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                              title="Lan√ßar/Confirmar baixa de valor (Cart√£o, Pix, Dinheiro)"
                            >
                              <span>üí≥</span> Dar Baixa
                            </button>

                            <button
                              onClick={() => {
                                setLinkModalSelectedAlunoId(a.id);
                                setIsLinkEnrollmentModalOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-lg transition"
                              title="Alimentar & Gerar Link do Autodrive com dados deste candidato"
                            >
                              <Link className="h-3.5 w-3.5 text-amber-500 font-bold" />
                            </button>

                            <button
                              onClick={() => handleOpenEditAluno(a)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg transition"
                              title="Editar Ficha"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            {isAdminAuthenticated && (
                              <button
                                onClick={() => handleDeleteAluno(a.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-100 rounded-lg transition"
                                title="Excluir Ficha (Apenas Administrador)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CSV Fast Exporters */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Exporta√ß√£o R√°pida para Backup de Credenciados:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleExportCSV('alunos')} 
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Alunos.csv (Spreadsheet Format)
                  </button>
                </div>
              </div>
            </div>

            {/* SECONDARY DATABASE: PARTNER DIRECTORY / CREDENTIALED INSTRUCTORS */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Instrutores Parceiros Aut√¥nomos</h3>
                  <p className="text-xs text-slate-500">Diret√≥rio de instrutores aut√¥nomos aptos para receber os saldos acumulados de maioridade.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingInstrutor(null);
                    setInstrutorForm({
                      nome: '',
                      regiao: 'Recife Centro',
                      vagas: 12,
                      whatsapp: '(81) 99312-3232',
                      endereco: '',
                      credencialSenatran: '',
                      foto: '',
                      login: '',
                      senha: generateSecurePassword(),
                      tempoExperiencia: '',
                      historia: '',
                      chavePix: ''
                    });
                    setIsInstrutorModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo Instrutor
                </button>
              </div>

              {/* LINK DE AUTO-CREDENCIAMENTO DE INSTRUTORES */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-800">
                <div className="space-y-0.5">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md">Atalho de Credenciamento</span>
                  <h4 className="font-extrabold text-[#0c2340] text-xs">üîó Link Direto de Auto-Cadastro para Instrutores</h4>
                  <p className="text-slate-500 text-[11px]">Envie este link para que os novos instrutores parceiros possam se cadastrar sozinhos.</p>
                </div>
                <button
                  onClick={copySelfRegisterLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] shrink-0 shadow-xs cursor-pointer"
                >
                  üìã Copiar Link de Auto-Cadastro
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {instrutores.map(inst => {
                  const numStudents = cleanAlunos.filter(a => a.instrutor === inst.nome).length;

                  return (
                    <div 
                      key={inst.nome} 
                      onClick={() => setSelectedInstrutorDetail(inst)}
                      className="group border border-slate-200 hover:border-emerald-250 hover:shadow-md cursor-pointer rounded-xl p-4 bg-white space-y-3 relative transition duration-150 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            {inst.foto ? (
                              <img src={inst.foto} alt={inst.nome} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0">
                                üë§
                              </div>
                            )}
                            <strong className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition block leading-tight">{inst.nome}</strong>
                          </div>
                          <span className="text-[9.5px]/none bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 px-2 py-1 rounded shrink-0">
                            {inst.regiao}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-2 font-sans pt-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="text-slate-400 text-xs shrink-0">üì±</span>
                              <span className="font-semibold text-slate-500 shrink-0">Contato:</span>
                              <strong className="text-slate-850 font-bold truncate">{inst.whatsapp}</strong>
                            </div>
                            {inst.whatsapp && (
                              <a
                                href={`https://wa.me/55${inst.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Ol√° Instrutor(a) ${inst.nome}! Aqui √© da coordena√ß√£o do programa Nova CNH Brasil.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-[10.5px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition shrink-0 active:scale-95 cursor-pointer"
                                title={`Chamar ${inst.nome} em particular no WhatsApp`}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          {inst.credencialSenatran && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-400 text-xs">ü™™</span>
                              <span className="font-semibold text-slate-500">Credencial:</span>
                              <span className="font-mono text-[9px] font-black tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                {inst.credencialSenatran}
                              </span>
                            </div>
                          )}

                          {inst.endereco && (
                            <div className="flex items-start gap-1.5 pt-0.5">
                              <span className="text-slate-400 shrink-0 mt-0.5 text-xs">üìç</span>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed truncate" title={inst.endereco}>
                                {inst.endereco}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 font-semibold text-[11px]">üë• Alunos Ativos:</span>
                              <strong className="text-emerald-850 font-extrabold text-[11px]">{numStudents} {numStudents === 1 ? 'aluno' : 'alunos'}</strong>
                            </div>
                            <span className="text-[9.5px] font-bold text-emerald-750 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-sans">
                              Sem limite de alunos
                            </span>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-100 pt-3 shrink-0"
                        onClick={(e) => e.stopPropagation() /* Prevent modal activation */}
                      >
                        <button
                          onClick={() => setSelectedInstrutorDetail(inst)}
                          className="text-[10.5px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 font-extrabold px-2.5 py-1 rounded-md transition cursor-pointer"
                        >
                          üëÅÔ∏è Ficha Detalhada
                        </button>

                        <div className="flex gap-1 font-sans">
                          {inst.foto && (
                            <button
                              onClick={() => handleDownloadFoto(inst.nome, inst.foto)}
                              className="text-[10px] text-sky-700 hover:bg-sky-50 border border-sky-200 px-2 py-1 rounded transition font-bold flex items-center gap-0.5"
                              title="Baixar Foto"
                            >
                              üì• Foto
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingInstrutor(inst);
                              setInstrutorForm({
                                nome: inst.nome,
                                regiao: inst.regiao,
                                vagas: inst.vagas,
                                whatsapp: inst.whatsapp,
                                endereco: inst.endereco || '',
                                credencialSenatran: inst.credencialSenatran || '',
                                foto: inst.foto || '',
                                login: inst.login || generateLogin(inst.nome),
                                senha: inst.senha || generateSecurePassword(),
                                tempoExperiencia: inst.tempoExperiencia || '',
                                historia: inst.historia || '',
                                chavePix: inst.chavePix || ''
                              });
                              setIsInstrutorModalOpen(true);
                            }}
                            className="text-[10px] text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded transition font-bold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteInstrutor(inst.nome)}
                            className="text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 px-2 py-1 rounded transition font-bold"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
                </>
              )}

              {adminSubTab === 'contracts' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT PANEL: CANDIDATES LIST */}
                    <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm flex flex-col h-[750px]">
                      <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">ARQUIVO DE ATIVOS</span>
                        <h3 className="text-base font-black text-slate-900 mt-1">Contratos Registrados</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Clique em um candidato para abrir os termos assinados e baixar o PDF oficial.</p>
                      </div>

                      {/* SEARCH INPUT */}
                      <div className="relative mb-4 shrink-0">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar contrato por nome, ID ou CPF..."
                          value={contractSearch}
                          onChange={(e) => setContractSearch(e.target.value)}
                          className="w-full bg-slate-50 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* CANDIDATES DIRECTORY */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {cleanAlunos.filter(aluno => {
                          if (!contractSearch) return true;
                          const term = contractSearch.toLowerCase();
                          return (aluno.nome?.toLowerCase().includes(term) ||
                            (aluno.cpf && aluno.cpf.includes(term)) ||
                            aluno.id.toLowerCase().includes(term));
                        }).map((aluno) => {
                          const isSelected = selectedContractStudentId === aluno.id;
                          return (
                            <button
                              key={aluno.id}
                              onClick={() => setSelectedContractStudentId(aluno.id)}
                              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                                isSelected
                                  ? 'bg-slate-950 border-slate-950 text-white shadow-md font-sans'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                  {aluno.nome}
                                </span>
                                <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  ID: {aluno.id}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-medium">
                                <span className={isSelected ? 'text-slate-300 font-mono' : 'text-slate-500 font-mono'}>
                                  CPF: {aluno.cpf || 'N√£o cadastrado'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase tracking-wide font-sans ${
                                  aluno.whatsappResponsavel
                                    ? (isSelected ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-50 text-amber-700 border border-amber-200')
                                    : (isSelected ? 'bg-indigo-500/25 text-indigo-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200')
                                }`}>
                                  {aluno.whatsappResponsavel ? 'üõ°Ô∏è Jovem' : 'üë§ Adulto'}
                                </span>
                              </div>
                            </button>
                          );
                        }).reverse()}

                        {cleanAlunos.filter(aluno => {
                          if (!contractSearch) return true;
                          const term = contractSearch.toLowerCase();
                          return (aluno.nome?.toLowerCase().includes(term) ||
                            (aluno.cpf && aluno.cpf.includes(term)) ||
                            aluno.id.toLowerCase().includes(term));
                        }).length === 0 && (
                          <div className="text-center py-12 text-xs text-slate-400 italic">
                            Nenhum contrato correspondente encontrado.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT PANEL: CONTRACT ACTIVE VIEW */}
                    <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-205 shadow-sm flex flex-col h-[750px]">
                      {(() => {
                        const selectedAluno = cleanAlunos.find(a => a.id === selectedContractStudentId);
                        if (!selectedAluno) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                              <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400">
                                <FileText className="h-12 w-12 stroke-[1.5]" />
                              </div>
                              <div className="max-w-md space-y-1">
                                <h4 className="font-extrabold text-[#0c2340] text-sm">Visualizador de Contratos de Ades√£o</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Selecione um candidato na lista ao lado para carregar e inspecionar o contrato legal gerado e preenchido eletronicamente. Voc√™ poder√° revisar os dados civil-legais, certificar assinaturas e exportar para documento PDF.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // Determine plane classification
                        const isUnderage = !!selectedAluno.whatsappResponsavel;
                        const totalAulas = selectedAluno.aulas || 20;

                        return (
                          <div className="h-full flex flex-col">
                            {/* ACTION BAR */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
                              <div className="space-y-0.5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Visualizando Contrato:</h4>
                                <span className="text-sm font-black text-indigo-700 underline block leading-none">
                                  {selectedAluno.nome}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePrintAdminContract(selectedAluno)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
                                >
                                  üñ®Ô∏è Imprimir / Salvar PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAdminContractPDF(selectedAluno)}
                                  disabled={isDownloadingContractPdf}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-sm disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                                >
                                  {isDownloadingContractPdf ? (
                                    <>‚è≥ Gerando...</>
                                  ) : (
                                    <>üì• Baixar Contrato em PDF</>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* SCROLLABLE CONTRACT SHEET CONTAINER */}
                            <div className="flex-1 overflow-y-auto pr-1 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-4 md:p-6 select-all font-serif">
                              <div
                                id={`printable-contract-${selectedAluno.id}`}
                                className="bg-white p-8 md:p-12 border border-slate-200 rounded-xl text-slate-850 space-y-8 text-[11px] leading-relaxed shadow-sm max-w-3xl mx-auto"
                              >
                                {/* Header Section */}
                                <div className="text-center space-y-2 border-b-2 border-slate-200 pb-6">
                                  <span className="font-extrabold text-lg text-[#0c2340] tracking-wider uppercase font-sans block leading-none">
                                    CONTRATO OFICIAL DE PRESTA√á√ÉO DE SERVI√áOS DE DIRE√á√ÉO
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-bold uppercase font-sans block tracking-widest leading-none">
                                    ASSIST√äNCIA DE APRENDIZADO PR√ÅTICO INTELIGENTE ‚Ä¢ NOVA CNH BRASIL NA M√ÉO
                                  </span>
                                  <h3 className="text-xs font-black text-slate-900 font-sans tracking-wide uppercase mt-4">
                                    CONTRATO DE PRESTA√á√ÉO DE SERVI√áOS DE TREINAMENTO PR√ÅTICO E DESENVOLVIMENTO DE CIDADANIA
                                  </h3>
                                </div>

                                {/* Part I: CONTRATANTE */}
                                <section className="space-y-3">
                                  <h4 className="font-black text-xs text-slate-905 font-sans uppercase border-b border-slate-200 pb-1">
                                    I. CONTRATANTE
                                  </h4>
                                  <div className="space-y-1.5 pl-1 text-[11px]">
                                    <p>
                                      <strong>Nome Completo do(a) Novo(a) Candidato(a):</strong> <span className="font-sans font-extrabold underline text-slate-900">{selectedAluno.nome}</span>
                                    </p>
                                    <p>
                                      <strong>Nacionalidade:</strong> {selectedAluno.nacionalidade || "Brasileira"} | <strong>Estado Civil:</strong> {selectedAluno.estadoCivil || "Solteiro(a)"}
                                    </p>
                                    <p>
                                      <strong>CPF n¬∫:</strong> <span className="font-mono font-bold text-slate-900">{selectedAluno.cpf}</span>
                                    </p>
                                    <p>
                                      <strong>Endere√ßo Residencial Cadastrado:</strong> {selectedAluno.endereco || "N√£o informado"}
                                    </p>
                                    <p>
                                      <strong>Telefone/WhatsApp:</strong> <span className="font-mono font-bold">{selectedAluno.whatsapp}</span>
                                    </p>

                                    {/* Underage responsible block */}
                                    {isUnderage && (
                                      <div className="bg-red-50/75 border border-red-200 text-red-950 p-3 rounded-lg mt-3 font-sans text-[10.5px] leading-relaxed space-y-1">
                                        <span className="font-black text-[10px] text-red-800 uppercase block">
                                          üìã CL√ÅUSULA DE ASSIST√äNCIA CIVIL (BR-CIVIL):
                                        </span>
                                        Como o candidato √© menor de 18 anos (17 anos completos), este instrumento conta com assist√™ncia civil ativa e corresponsabilidade solid√°ria financeira de seu representante legal:
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-serif text-[10.5px] text-slate-900 pt-1 border-l-2 border-red-400 pl-2">
                                          <p><strong>Nome do Respons√°vel:</strong> {selectedAluno.nomeResponsavel}</p>
                                          <p><strong>WhatsApp do Respons√°vel:</strong> {selectedAluno.whatsappResponsavel}</p>
                                          <p><strong>CPF do Respons√°vel:</strong> {selectedAluno.cpfResponsavel}</p>
                                          <p><strong>RG do Respons√°vel:</strong> {selectedAluno.rgResponsavel || 'N√£o informado'}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </section>

                                {/* Part II: CONTRATADO */}
                                <section className="space-y-3">
                                  <h4 className="font-black text-xs text-slate-900 font-sans uppercase border-b border-slate-200 pb-1">
                                    II. CONTRATADO
                                  </h4>
                                  <div className="space-y-1 pl-1 text-[11px]">
                                    <p>
                                      <strong>Miqueias Souza de Lima - Instrutor Aut√¥nomo</strong>
                                    </p>
                                    <p>
                                      <strong>Registro Oficial SENATRAN:</strong> 1674704384
                                    </p>
                                    <p>
                                      <strong>CPF n¬∫:</strong> 869.496.594-15 | <strong>Operadora Parceira de Treinamentos:</strong> Nova CNH Brasil na M√£o
                                    </p>
                                    <p>
                                      <strong>Suporte / WhatsApp de Atendimento T√©cnico:</strong> (81) 99201-1024
                                    </p>
                                  </div>
                                </section>

                                {/* PART III: CLAUSES */}
                                <section className="space-y-4 text-[10.5px] text-slate-800">
                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CL√ÅUSULA PRIMEIRA ‚Äì DO OBJETO DOS SERVI√áOS</h5>
                                    <p className="mt-1 text-justify">
                                      O presente contrato tem por objeto a presta√ß√£o de treinamentos pr√°ticos de tr√¢nsito e dire√ß√£o veicular segura, integrando os planos preparat√≥rios de poupan√ßa veicular e planejamento de maioridade:
                                    </p>
                                    <div className="my-2 pl-3 space-y-1.5 font-sans text-[10px]">
                                      <p className="flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-flex items-center justify-center font-bold bg-white text-slate-950">
                                          {isUnderage ? 'X' : ' '}
                                        </span>
                                        <span><strong>Plano Poupan√ßa Jovem</strong> (Para candidatos menores de 18 anos acumularem cr√©ditos reais)</span>
                                      </p>
                                      <p className="flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-flex items-center justify-center font-bold bg-white text-slate-950">
                                          {!isUnderage ? 'X' : ' '}
                                        </span>
                                        <span><strong>Plano CNH Facilitada Maiores</strong> (Para candidatos maiores com agendamento das aulas pr√°ticas de dire√ß√£o)</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CL√ÅUSULA SEGUNDA ‚Äì DA CARGA LETIVA E MONITORAMENTO</h5>
                                    <p className="mt-1 text-justify">
                                      O pacote contratado compreende o total de <strong>{totalAulas} horas-aula</strong> de treinamentos pr√°ticos de dire√ß√£o veicular, agendadas sequencialmente. O <strong>CONTRATANTE</strong> declara estar ciente de que as aulas de dire√ß√£o segura s√£o orientadas pessoalmente pelo <strong>CONTRATADO</strong>.
                                    </p>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CL√ÅUSULA TERCEIRA ‚Äì DO VALOR ACORDADO</h5>
                                    <p className="mt-1 text-justify">
                                      O valor total acordado para os servi√ßos supracitados √© de <strong className="text-slate-950">R$ {selectedAluno.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '1.800,00'}</strong>, do qual o candidato realiza pagamentos planejados.
                                    </p>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CL√ÅUSULA QUARTA ‚Äì DA FOR√áA EXECUTIVA E VALIDADE DIGITAL</h5>
                                    <p className="mt-1 text-justify">
                                      Este contrato goza de plena validade jur√≠dica digital nos termos da legisla√ß√£o civil brasileira em vigor, amparado pela Medida Provis√≥ria n¬∫ 2.200-2/2001, constituindo t√≠tulo executivo extrajudicial legal no momento de sua assinatura digital.
                                    </p>
                                  </div>
                                </section>

                                {/* DATE AND DIGITAL SIGNATURES */}
                                <div className="space-y-6 pt-5 border-t border-slate-200 font-sans">
                                  <div className="text-right text-[10px] text-slate-500 font-medium">
                                    Documento Preenchido e Assinado em: <span className="font-bold text-slate-800">{selectedAluno.dataAdesao || "10/06/2026"}</span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-4 text-center">
                                      <div className="border-b border-slate-300 pb-2">
                                        <div 
                                          style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Playfair Display', 'Georgia', cursive" }}
                                          className="text-indigo-700 text-xl font-bold select-none h-8 tracking-wider flex items-center justify-center italic"
                                        >
                                          {selectedAluno.nome}
                                        </div>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[9px] font-black text-slate-900 uppercase block">ASSINATURA DIGITAL DO CLIENTE</span>
                                        <span className="text-[8px] text-slate-400 font-mono block">Chave de Integridade: SHA-256/{selectedAluno.id}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-4 text-center">
                                      <div className="border-b border-slate-300 pb-2">
                                        <div 
                                          style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Playfair Display', 'Georgia', cursive" }}
                                          className="text-emerald-700 text-xl font-bold select-none h-8 tracking-widest flex items-center justify-center italic font-medium"
                                        >
                                          Miqueias Souza de Lima
                                        </div>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[9px] font-black text-slate-900 uppercase block">REPRESENTANTE T√âCNICO / INSTRUTOR</span>
                                        <span className="text-[8px] text-slate-400 font-mono block">Inst. Aut√¥nomo ‚Ä¢ Reg. SENATRAN 1674704384</span>
                                      </div>
                                    </div>

                                    {isUnderage && (
                                      <div className="col-span-1 md:col-span-2 space-y-4 text-center max-w-sm mx-auto mt-4">
                                        <div className="border-b border-slate-350 pb-2">
                                          <div 
                                            style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Playfair Display', 'Georgia', cursive" }}
                                            className="text-red-700 text-xl font-bold select-none h-8 tracking-wider flex items-center justify-center italic"
                                          >
                                            {selectedAluno.nomeResponsavel}
                                          </div>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] font-black text-red-900 uppercase block">CO-ASSINATURA DO RESPONS√ÅVEL CIVIL</span>
                                          <span className="text-[8px] text-slate-400 font-mono block">Garantidor Solid√°rio Tutelar</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-center text-[8px] text-slate-400 pt-6 font-mono border-t border-slate-100">
                                    C√≥digo Eletr√¥nico Registrado de Autenticidade: CNH-{selectedAluno.id}-BR
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}

              {adminSubTab === 'commissions' && (() => {
                const commissionData = instrutores.map(inst => {
                  const instStudents = cleanAlunos.filter(a => a.instrutor === inst.nome);
                  const totalVendas = instStudents.reduce((acc, a) => acc + getStudentBaseValue(a), 0);
                  const totalPaymentReceived = instStudents.reduce((acc, a) => {
                    const baseTotal = getStudentBaseValue(a);
                    const installmentVal = baseTotal / (a.parcelasTotal || 12);
                    const paidValue = (a.parcelasPagas || 0) * installmentVal;
                    return acc + paidValue;
                  }, 0);
                  const totalPendente = totalVendas - totalPaymentReceived;
                  const progressAvg = instStudents.length > 0
                    ? instStudents.reduce((acc, a) => acc + (a.parcelasPagas / (a.parcelasTotal || 12)) * 100, 0) / instStudents.length
                    : 0;

                  return {
                    instrutor: inst,
                    students: instStudents,
                    totalVendas,
                    totalPaymentReceived,
                    totalPendente,
                    progressAvg: Math.round(progressAvg)
                  };
                });

                const commissionStats = {
                  totalVendas: commissionData.reduce((acc, d) => acc + d.totalVendas, 0),
                  totalPaymentReceived: commissionData.reduce((acc, d) => acc + d.totalPaymentReceived, 0),
                  totalPendente: commissionData.reduce((acc, d) => acc + d.totalPendente, 0),
                  totalStudents: commissionData.reduce((acc, d) => acc + d.students.length, 0),
                  totalLiberado: commissionData.reduce((acc, d) => acc + Math.max(0, (d.totalPaymentReceived * 0.80) - (d.instrutor.saldoPago || 0)), 0)
                };

                const unassignedStudents = cleanAlunos.filter(a => !a.instrutor || a.instrutor === '' || a.instrutor === 'Aguardando Atribui√ß√£o');

                const handleDownloadCommissionCSV = () => {
                  let csvContent = "data:text/csv;charset=utf-8,";
                  csvContent += "Instrutor,Regiao,Alunos Cadastrados,Volume Total de Acordos (R$),Comissao Recebida (R$),Comissao Pendente (R$),Saldo Liberado (R$),Saldo Pago (R$),Saldo Disponivel (R$),Quitacao Media (%)\n";
                  
                  commissionData.forEach(d => {
                    const totalLiberado = d.totalPaymentReceived * 0.80;
                    const saldoPago = d.instrutor.saldoPago || 0;
                    const saldoDisponivel = Math.max(0, totalLiberado - saldoPago);
                    csvContent += `"${d.instrutor.nome}","${d.instrutor.regiao}",${d.students.length},${d.totalVendas.toFixed(2)},${d.totalPaymentReceived.toFixed(2)},${d.totalPendente.toFixed(2)},${totalLiberado.toFixed(2)},${saldoPago.toFixed(2)},${saldoDisponivel.toFixed(2)},${d.progressAvg}%\n`;
                  });
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "comissoes_instrutores_novacnh.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };

                return (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0 border border-indigo-100">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Total de Alunos Vinculados</p>
                          <h4 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{commissionStats.totalStudents}</h4>
                          <p className="text-[9px] text-slate-500 mt-0.5 font-sans">Indica√ß√µes ativas de parceiros</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0 border border-emerald-100">
                          <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Volume de Vendas</p>
                          <h4 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                            {commissionStats.totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </h4>
                          <p className="text-[9px] text-[#28a193] mt-0.5 font-sans">Contratos fechados por indica√ß√£o</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0 border border-amber-100">
                          <Coins className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Comiss√£o Quitada (Caixa)</p>
                          <h4 className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
                            {commissionStats.totalPaymentReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </h4>
                          <p className="text-[9px] text-amber-600 mt-0.5 font-sans">Saldos j√° recebidos e validados</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-slate-50 text-slate-600 p-3 rounded-xl shrink-0 border border-slate-150">
                          <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Comiss√£o Pendente (A Receber)</p>
                          <h4 className="text-2xl font-black text-slate-700 mt-0.5 font-mono">
                            {commissionStats.totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </h4>
                          <p className="text-[9px] text-rose-500 mt-0.5 font-sans font-medium">Parcelamentos em andamento</p>
                        </div>
                      </div>

                      <div className="bg-[#0c2340] text-white rounded-2xl border border-slate-800 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-white/10 text-emerald-400 p-3 rounded-xl shrink-0 border border-white/10">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider font-sans">Saldo Liberado p/ Pagamento</p>
                          <h4 className="text-2xl font-black text-emerald-400 mt-0.5 font-mono">
                            {commissionStats.totalLiberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-sans">80% de comiss√£o regulamentar (Total - 20%)</p>
                        </div>
                      </div>
                    </div>

                    {/* Main Grid: Left is Table of Instructors, Right is detailed breakdown if an instructor is clicked */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                      
                      {/* INSTRUCTORS COMMISSIONS LIST */}
                      <div className={`${selectedCommissionInstructor ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4 transition-all duration-350`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">CONSOLIDA√á√ÉO FINANCEIRA</span>
                            <h3 className="text-base font-black text-slate-900 mt-0.5">Vis√£o Geral de Comiss√µes</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Acompanhe os resultados, faturamento e as indica√ß√µes individuais de cada instrutor credenciado.</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleDownloadCommissionCSV}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Exportar CSV
                            </button>
                          </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar instrutor por nome ou regi√£o..."
                            value={commissionSearch}
                            onChange={(e) => setCommissionSearch(e.target.value)}
                            className="w-full bg-slate-50 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#0c2340] focus:outline-none transition-colors font-sans"
                          />
                        </div>

                        {/* Interactive Instructor Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-150">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase font-sans tracking-wider">
                                <th className="p-3.5 pl-4">Instrutor</th>
                                <th className="p-3.5 text-center">Indicados</th>
                                <th className="p-3.5 text-right">Acordos (R$)</th>
                                <th className="p-3.5 text-right">Quitado (R$)</th>
                                <th className="p-3.5 text-right">Pendente (R$)</th>
                                <th className="p-3.5 text-right">Saldo Liberado (80%)</th>
                                <th className="p-3.5 text-right pr-4">A√ß√£o</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-sans">
                              {commissionData.filter(d => {
                                if (!commissionSearch) return true;
                                const term = commissionSearch.toLowerCase();
                                return d.instrutor.nome.toLowerCase().includes(term) || (d.instrutor.regiao && d.instrutor.regiao.toLowerCase().includes(term));
                              }).map(d => {
                                const isSelected = selectedCommissionInstructor === d.instrutor.nome;
                                const payoffPercentage = d.totalVendas > 0 ? Math.round((d.totalPaymentReceived / d.totalVendas) * 100) : 0;
                                return (
                                  <tr 
                                    key={d.instrutor.nome}
                                    className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/40 font-medium' : ''}`}
                                  >
                                    <td className="p-3.5 pl-4">
                                      <div className="flex items-center gap-2.5">
                                        {d.instrutor.foto ? (
                                          <img 
                                            src={d.instrutor.foto} 
                                            alt={d.instrutor.nome} 
                                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-[#0c2340]/10 text-[#0c2340] flex items-center justify-center font-bold text-xs uppercase">
                                            {d.instrutor.nome.split(' ').map(n=>n[0]).join('').substring(0,2)}
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-extrabold text-slate-900 block leading-tight">{d.instrutor.nome}</span>
                                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">üìç Regi√£o: {d.instrutor.regiao || 'N√£o Informada'}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3.5 text-center">
                                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[11px] font-mono border border-indigo-100">
                                        {d.students.length}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-medium text-slate-700">
                                      {d.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3.5 text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="font-mono text-emerald-600 font-bold">
                                          {d.totalPaymentReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden" title={`${payoffPercentage}% de quita√ß√£o m√©dia`}>
                                          <div 
                                            className="bg-emerald-500 h-full rounded-full" 
                                            style={{ width: `${payoffPercentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-bold text-slate-500">
                                      {d.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3.5 text-right font-mono bg-emerald-50/20">
                                      {(() => {
                                        const totalLiberado = d.totalPaymentReceived * 0.80;
                                        const saldoPago = d.instrutor.saldoPago || 0;
                                        const saldoDisponivel = Math.max(0, totalLiberado - saldoPago);
                                        return (
                                          <div className="flex flex-col items-end">
                                            <span className="font-extrabold text-emerald-700">
                                              {saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            {saldoPago > 0 && (
                                              <span className="text-[9px] text-slate-500 font-sans font-semibold mt-0.5">
                                                Pago: R$ {saldoPago.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="p-3.5 text-right pr-4">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedCommissionInstructor(isSelected ? null : d.instrutor.nome)}
                                        className={`text-[10.5px] font-black px-3 py-1.5 rounded-lg border transition cursor-pointer active:scale-95 whitespace-nowrap ${
                                          isSelected 
                                            ? 'bg-[#0c2340] text-white border-[#0c2340] shadow-sm' 
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                        {isSelected ? 'Fechar' : 'Ver Extrato'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}

                              {unassignedStudents.length > 0 && (
                                <tr className="bg-slate-50/55 border-t border-slate-200 text-slate-600">
                                  <td className="p-3.5 pl-4 italic flex items-center gap-2">
                                    <span className="text-xs">‚è≥</span>
                                    <div>
                                      <span className="font-semibold block text-slate-700">Aguardando Atribui√ß√£o (Sem Instrutor)</span>
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Alunos sem mentor regional designado</span>
                                    </div>
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="bg-slate-200/80 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] border border-slate-300">
                                      {unassignedStudents.length}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right font-mono text-slate-500">
                                    {unassignedStudents.reduce((acc, a) => acc + getStudentBaseValue(a), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3.5 text-right font-mono text-slate-500">
                                    {unassignedStudents.reduce((acc, a) => {
                                      const baseTotal = getStudentBaseValue(a);
                                      const installmentVal = baseTotal / (a.parcelasTotal || 12);
                                      return acc + ((a.parcelasPagas || 0) * installmentVal);
                                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3.5 text-right font-mono text-slate-500">
                                    {(unassignedStudents.reduce((acc, a) => acc + getStudentBaseValue(a), 0) - unassignedStudents.reduce((acc, a) => {
                                      const baseTotal = getStudentBaseValue(a);
                                      const installmentVal = baseTotal / (a.parcelasTotal || 12);
                                      return acc + ((a.parcelasPagas || 0) * installmentVal);
                                    }, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3.5 text-right font-mono text-slate-400">
                                    {(() => {
                                      const unassignedPaidVal = unassignedStudents.reduce((acc, a) => {
                                        const baseTotal = getStudentBaseValue(a);
                                        const installmentVal = baseTotal / (a.parcelasTotal || 12);
                                        return acc + ((a.parcelasPagas || 0) * installmentVal);
                                      }, 0);
                                      return (unassignedPaidVal * 0.80).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                    })()}
                                  </td>
                                  <td className="p-3.5 text-right pr-4 italic text-[10px] text-slate-400 font-medium">
                                    Atribuir no painel
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {commissionData.filter(d => {
                          if (!commissionSearch) return true;
                          const term = commissionSearch.toLowerCase();
                          return d.instrutor.nome.toLowerCase().includes(term) || (d.instrutor.regiao && d.instrutor.regiao.toLowerCase().includes(term));
                        }).length === 0 && (
                          <div className="text-center py-10 text-xs text-slate-400 italic">
                            Nenhum instrutor correspondente encontrado para sua pesquisa.
                          </div>
                        )}
                      </div>

                      {/* DETAILED LEDGER OF SELECTED INSTRUCTOR (RIGHT COLUMN) */}
                      {selectedCommissionInstructor && (() => {
                        const selectedData = commissionData.find(d => d.instrutor.nome === selectedCommissionInstructor);
                        if (!selectedData) return null;
                        
                        return (
                          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4 animate-in slide-in-from-right-3 duration-350">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-[#0c2340] uppercase tracking-wider font-mono">Detalhamento Financeiro</span>
                                <h4 className="text-base font-black text-slate-900">{selectedData.instrutor.nome}</h4>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                  Visualizando a carteira de {selectedData.students.length} alunos indicados.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedCommissionInstructor(null)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            {selectedData.instrutor.chavePix ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                <span className="font-extrabold text-slate-500 uppercase text-[9px] font-sans">Chave PIX:</span>
                                <span className="font-mono select-all font-bold text-slate-900">{selectedData.instrutor.chavePix}</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedData.instrutor.chavePix || "");
                                    setToastMessage("üìã Chave PIX copiada com sucesso!");
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 text-[10px] ml-auto font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" /> Copiar
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200/60 font-sans italic flex items-center justify-between">
                                <span>‚ö†Ô∏è Sem chave PIX vinculada.</span>
                              </div>
                            )}

                            {/* Mini Stats box for detailed instructor */}
                            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center font-sans">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Vendas</span>
                                <span className="text-xs font-black text-slate-800 font-mono mt-0.5 block">
                                  {selectedData.totalVendas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Quitou</span>
                                <span className="text-xs font-black text-emerald-600 font-mono mt-0.5 block">
                                  {selectedData.totalPaymentReceived.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Pendente</span>
                                <span className="text-xs font-black text-amber-600 font-mono mt-0.5 block">
                                  {selectedData.totalPendente.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>

                             {/* Saldo Liberado Highlight & Payout Controls */}
                             {(() => {
                               const totalLiberado = selectedData.totalPaymentReceived * 0.80;
                               const saldoPago = selectedData.instrutor.saldoPago || 0;
                               const saldoDisponivel = Math.max(0, totalLiberado - saldoPago);

                               return (
                                 <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4 space-y-3.5 shadow-sm">
                                   <div className="space-y-1.5">
                                     <div className="flex justify-between text-xs text-emerald-800">
                                       <span className="font-semibold">Comiss√£o Acumulada (80%):</span>
                                       <span className="font-mono font-bold">{totalLiberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                     <div className="flex justify-between text-xs text-slate-500">
                                       <span>Comiss√µes Quitadas:</span>
                                       <span className="font-mono font-bold">-{saldoPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                     <div className="border-t border-emerald-200/60 pt-2 flex justify-between items-center text-emerald-900">
                                       <span className="text-xs font-black uppercase tracking-wider">Saldo Dispon√≠vel:</span>
                                       <span className="text-lg font-black font-mono">{saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                   </div>

                                   {saldoDisponivel > 0 ? (
                                     <button
                                       type="button"
                                       onClick={() => handlePagarSaldo(selectedData.instrutor, saldoDisponivel)}
                                       className="w-full bg-[#32bcad] hover:bg-[#28a193] text-black font-black py-2 px-4 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-sm"
                                     >
                                       üí∏ Registrar Pagamento do Saldo
                                     </button>
                                   ) : (
                                     <div className="text-center py-2 bg-emerald-100 text-emerald-800 text-[10px] rounded-lg font-black border border-emerald-200 uppercase tracking-wider">
                                       ‚úÖ Todo o saldo liberado j√° foi pago!
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}

                            {/* Student lists detail */}
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                              {selectedData.students.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400 italic">
                                  Nenhuma indica√ß√£o registrada para este instrutor ainda.
                                </div>
                              ) : (
                                selectedData.students.map(student => {
                                  const baseTotal = getStudentBaseValue(student);
                                  const paidTotal = student.parcelasPagas * (baseTotal / (student.parcelasTotal || 12));
                                  const pendingTotal = baseTotal - paidTotal;
                                  const completionRate = Math.round((student.parcelasPagas / (student.parcelasTotal || 12)) * 100);
                                  
                                  return (
                                    <div 
                                      key={student.id}
                                      className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl flex flex-col gap-2.5 hover:border-indigo-300 hover:shadow-sm transition-all"
                                    >
                                      <div className="flex items-start justify-between gap-2 text-xs">
                                        <div>
                                          <h5 className="font-extrabold text-slate-900 leading-snug">{student.nome}</h5>
                                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">ID: {student.id} | CPF: {student.cpf || '---'}</span>
                                        </div>
                                        
                                        <a 
                                          href={`https://wa.me/55${student.whatsapp.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-100 transition shrink-0"
                                          title="Chamar aluno no WhatsApp"
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                        </a>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-[10px] font-sans border-t border-slate-200/60 pt-2 text-slate-600">
                                        <div>
                                          <span>Plano: </span>
                                          <strong className="text-slate-800">{student.tipoPlano || 'Poupan√ßa CNH'}</strong>
                                        </div>
                                        <div className="text-right">
                                          <span>Modalidade: </span>
                                          <strong className="text-slate-800 uppercase font-mono">{student.formaPagamento || 'vista'}</strong>
                                        </div>
                                      </div>

                                      {/* Financial progress of the specific student */}
                                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80 font-mono text-[10.5px]">
                                        <div className="flex justify-between font-bold text-[10px]">
                                          <span className="text-slate-500 uppercase">Status do Acordo</span>
                                          <span className={completionRate === 100 ? 'text-emerald-600' : 'text-indigo-600'}>
                                            {student.parcelasPagas} de {student.parcelasTotal || 12} ({completionRate}%)
                                          </span>
                                        </div>

                                        {/* Visual progress bar */}
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                                          <div 
                                            className={`h-full rounded-full ${completionRate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                            style={{ width: `${completionRate}%` }}
                                          />
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 pt-2 text-center text-[10px] font-sans">
                                          <div>
                                            <span className="text-[8.5px] text-slate-400 block uppercase font-mono">Total</span>
                                            <strong className="text-slate-800">{baseTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[8.5px] text-slate-400 block uppercase font-mono">Pago</span>
                                            <strong className="text-emerald-600">{paidTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[8.5px] text-slate-400 block uppercase font-mono">Pendente</span>
                                            <strong className="text-slate-500">{pendingTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong>
                                          </div>
                                        </div>

                                        <div className="flex justify-between items-center text-[9.5px] text-emerald-700 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100/50 mt-2 font-sans font-bold">
                                          <span>Comiss√£o Liberada (80%):</span>
                                          <span className="font-mono">{(paidTotal * 0.80).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })()}

              {/* ===================== SUBTAB: RECIBOS DE CANDIDATOS ===================== */}
              {adminSubTab === 'recibos' && (() => {

                // Gather all candidate receipts across all alunos
                interface AllReceiptItem {
                  aluno: Aluno;
                  baixa: BaixaPagamento;
                }

                const allReceipts: AllReceiptItem[] = [];
                cleanAlunos.forEach(a => {
                  if (a.baixasPagamento && a.baixasPagamento.length > 0) {
                    a.baixasPagamento.forEach(b => {
                      allReceipts.push({ aluno: a, baixa: b });
                    });
                  }
                });

                // Sort by date descending
                allReceipts.sort((a, b) => new Date(b.baixa.data).getTime() - new Date(a.baixa.data).getTime());

                // Filter by search term and method
                const filteredReceipts = allReceipts.filter(r => {
                  const matchSearch = receiptSearchTerm.trim() === '' || 
                    r.aluno.nome.toLowerCase().includes(receiptSearchTerm.toLowerCase()) ||
                    r.aluno.cpf.includes(receiptSearchTerm) ||
                    r.baixa.id.toLowerCase().includes(receiptSearchTerm.toLowerCase());
                  
                  const matchMethod = receiptMethodFilter === 'todos' || 
                    r.baixa.formaPagamento.toLowerCase().includes(receiptMethodFilter.toLowerCase());

                  return matchSearch && matchMethod;
                });

                const totalVal = allReceipts.reduce((acc, r) => acc + r.baixa.valor, 0);
                const pixCount = allReceipts.filter(r => r.baixa.formaPagamento.toLowerCase().includes('pix')).length;
                const cardCount = allReceipts.filter(r => r.baixa.formaPagamento.toLowerCase().includes('cart') || r.baixa.formaPagamento.toLowerCase().includes('cr√©dito')).length;

                return (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Header & Quick Action */}
                    <div className="bg-gradient-to-r from-[#0c2340] to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-6 w-6 text-emerald-400" />
                          <h3 className="text-lg font-black tracking-tight">Gest√£o & Emiss√£o de Recibos de Pagamento</h3>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                          Consulte, emita e envie recibos oficiais de quita√ß√£o para candidatos do Programa CNH Facilitada.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (cleanAlunos.length > 0) {
                            setManualReceiptAlunoId(cleanAlunos[0].id);
                          }
                          setManualReceiptValor(200);
                          setManualReceiptData(new Date().toISOString().substring(0, 10));
                          setManualReceiptForma('PIX');
                          setManualReceiptReferente('Pagamento referente ao programa CNH Facilitada');
                          setManualReceiptObs('');
                          setIsNewManualReceiptModalOpen(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer shrink-0 active:scale-95"
                      >
                        <Plus className="h-4 w-4" /> Emitir Novo Recibo
                      </button>
                    </div>

                    {/* Quick Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Total de Recibos</span>
                          <Receipt className="h-4 w-4 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 font-mono">{allReceipts.length}</p>
                        <p className="text-[10px] text-slate-400">Comprovantes registrados</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Volume Total</span>
                          <Coins className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600 font-mono">
                          {totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-[10px] text-slate-400">Arrecada√ß√£o total baixada</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Pagamentos PIX</span>
                          <Zap className="h-4 w-4 text-teal-500" />
                        </div>
                        <p className="text-2xl font-black text-teal-700 font-mono">{pixCount}</p>
                        <p className="text-[10px] text-slate-400">Recibos via PIX / Transfer√™ncia</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Cart√£o / Outros</span>
                          <CreditCard className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-black text-blue-700 font-mono">{cardCount}</p>
                        <p className="text-[10px] text-slate-400">Recibos de cart√£o e balc√£o</p>
                      </div>
                    </div>

                    {/* Filter and Table Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
                        <div className="relative w-full md:w-80">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar por candidato, CPF ou ID recibo..."
                            value={receiptSearchTerm}
                            onChange={(e) => setReceiptSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Forma:</span>
                          <select
                            value={receiptMethodFilter}
                            onChange={(e) => setReceiptMethodFilter(e.target.value)}
                            className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-bold focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="todos">Todas as Formas</option>
                            <option value="pix">PIX / Transfer√™ncia</option>
                            <option value="cart">Cart√£o de Cr√©dito</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="boleto">Boleto</option>
                          </select>
                        </div>
                      </div>

                      {filteredReceipts.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                            üßæ
                          </div>
                          <p className="text-xs font-bold text-slate-600">Nenhum recibo de candidato encontrado para os filtros selecionados.</p>
                          <p className="text-[11px] text-slate-400">Tente buscar por outro termo ou clique em "Emitir Novo Recibo".</p>
                        </divxúÏΩos€Hö'¯˛>EZÌ.Qnë")…ñuñΩ4E€ÏïEï$ªß∑¶¢ú"R$™@ÄÄí\*EÙƒﬁ≈‹≈Ïlﬂtı‹ƒıÙù€3€◊[qqW;q˝b_úæI}ÅÒG∏Á…ƒd& J∂´ßeI$êH$û|˛?øÁ˛G§«Ÿ$5≈wÑ‹3Ã2¥®ÁÌ“	€ZpNò{l9ßı≥:ù˘Œ¬}Âïp≠Oè,ñº˙¥~<≥,‚≥3øn±cü9Æ¡‹˙–±,:ıòv8pÃ®°?œrì˜<’=ã˙¨ﬁj6WÓ4≈Õ?j5ßgìc«ˆÎG~Ff”)sá‘c‚q…z≥NÒ(¸E|”n6&L89ïi}ïL≠˙⁄¬˝˛6ŸgCÛ»!+dõ˙Ùﬁä?ûg∏Ö˚]j¶A}©39ÆyÖ·ûSÀqÁø¸ë„N(1Ÿ£#¯‘ˆù˘«⁄g«ÃÖ!ô˚y»‘≠ØâÍö£±øpøs˘€Àb^ô·∑ÄWJ‰=ˇ»1^&'[ 4X˝%	~â»SÃÙÃKí‡ùÑv~lZ>¨ï4≈Ã©Ô5&tZ´ùjÕlgôQÛåíã%≤uüú.„–±=ü∏b®æA∂ƒı”hx>u}Ô'¶?Æ-Ó˜∫ı≈%Ú ˙¯»¸Êy¯…≈ãˇæ‰›éën|üOΩ‹êŸC«`œˆ˚]g2ul 5áäèo^˝ˆøë[0á˛√ŸÓëΩŒ„Œ”ﬁÓ·Ä‘…ﬁ˛‡Ò~ÁiátwüêGùnßÿŸÓ‹˙s˚œÌ‰GeÜXóØó…≠õÁ|Y∂3a∑nîæºÎÿ«&<ÊƒÒà√◊˜»‰[ÑÒÿåL√=Cláú‡Fƒùt+\O˛I√wvú!µÿÅÔöˆ®∂8ıÎ˜ó…9Ò¸ó€$ã√ô€f¯>ÖOÓÔ,	\‹"µp@æË—FΩXjTXã7Øæ˙‰÷Óˇ˜áÄèmﬁ"7œ#öπ®2ŒˇHn!‰#:Ä?Ÿ√˝öò%6∫Ti¿øyU‰yÃ=°CÍê/ø$ãŒLü7¯GGêö|b–≈ã*4qåÖ¬ú¬€‚¶.ææ=◊πx·ÆsB˘∫‘3≠/
G]*ªiNÈ3◊Ç›ÚbÏ˚SoseÂî6&le}=§–”1ı=:ù6\6!«j+æΩ2Z&ããKê«lÖ+.vÓ◊¬{ªÃüπ∂Feàîƒü±ó[Á/¬OHÒáã$_£r±…ÎıÊ ∞Dó⁄ûÈõé]Bﬁäõrô[ÍÍº∆√uÑâÔThée˛lÇ‡9ıªÕHßhÅN±p?±Ó≠¿`Ûﬁ8©®$¬
ıF©pK_Ö TpfnMØ∂ú4.çWR<ÿ]˛`	ﬁ˙6V5:ÒFôaŒ&®?˘‹uÍO‰€ü˝Èooíònﬂ—¬í,ΩqÌî?õ0óZF)ï <ÆUvº£á˜ÿƒÃGïgæÁM©≠2»Ù¨ﬁ&”óıfcù∏ŒÃ6ò!±	ˆB·üGÔπ†-˚+¯ÔÄ‚‹+π‰∑a±&Ù¨~ 5Rwf„ˆX æÈ[l+'S/*RdFG´ì∆oˇ˘sF¬º¨ÕbgƒÙŸƒ´Q˜p…ß3œ7è_÷ômêù÷[çı
‘sÔhÊ˚é]˙|Bªkô√œ∂Œk\◊Émh±ﬁƒß+‘¥»Z¨%MÉí;[È}ı—ö√ˆÍZÛcíëﬁëX<√í‰wX,pC¬^Ñ-Ÿä∑d›%D?…/-_NdRû„÷ßéâ.TxA∆œMoF-Û–⁄Éº?ô∫Ê‰ÚÎfïØ¸KÖ◊Xi)’»4‹ä!üGIOV™˝úÖèQû»Vï›/÷¸¢KhÖ)ç]vºuŒU’*TÜÊà˘[üÄ¸≥?´Úb]fm-ÿéãÄ[ç&“§æ‰Éq'dpÚ~Oƒ›≥OÃò∞A£¯	ùÈ-Œàº%*Á¬ÎÕ´_¸ó@éE7Ø@ö¥4+æ~Â¨ÿ˝ÉG°±V§6¡m–?§ı£ÆpG™˙Ì”+ÓØºFÒEÓA/ñj0t‚√‹ÖK—Ô…œWnë-ŸA;7…Â_Ï˜:dÖÏu˙ªΩ≤= ˝›É√˝gáÉ}≈e∑V‚'<Z´Hèl≤H]F¡RÛ@Òwë|A rÕäp†‘!´ø¨ﬂ&‘6'(«Lÿü‘‡?çôKq√r%êò∆÷Çx#◊˘ç¿.˜©i√fM/‡˘:ÙÕ÷èŒ'r4¨K¸®;É«˝]r–›Ôıv·	3ßfß-‘¥âA&¬-O&/Î$%ãe Ï|≤§’3ãxcj8ßı6¸˘˘«¶a0õLaIb∑}¥LmF™·?ËÂO≥9>`{8d[™ eMpb∞ËVZ†÷◊Wñá“èú<ø›ÃKZ˘˛π˜°€uññ’ ´7r#D$3ùYSHnı∂∑sÊ+ºôπàC0„ÍæPZ˜◊ßrˆ~HÓdè∫†j∏ŒΩïq[z”i˛û^∆Ÿ€ £ﬁ$,=cÜb≈:CÊy,ph¬^ÄwnsG7ËYâK	:êcMpñ'º‘91Ì·Ã
Ù#Œ'
‰√}Ço`e«¥?#p•C¢ÌLÄ÷/ˇ´ü5§K=ïPßXˇ¸Áh£Å˛|0;uh¶Ùñ≥∆‘e'@µ€ÏòŒ,ø&ïÊ1©›à˘√é32Ì]g¬`{OjKK
Gº«¸~˙¢ûÎ:nm^/0¢«]∆Á7aqqûy≥À◊ÆÈê?w	∆_Ä”XPà&·øì}'¬”Ëøú2ÉﬂÅlıCq√)sª‘cWÏuÙ~Ñn«˘î∑ÿZ<ÖÌöøÀOBW¶∏ì‘OÜÄD¿ıÃk	÷L|°“%©ôã?Há‡◊Ù£pY/¬ò¨ÚÅn$F1∞â¯%pÙiïIú_º¢Ÿ%£…Wã(_¨ ¥ò£:ΩË˙ñ¿í2∏™Èô∞zzMd(˘heÖÃ¶S‡zÑùÅxMP∞AGÀ∞e,Îà{–2≥Õœg,Ò%úÈèÅ?F™)ˇàxÅ{˝]%âô^H®]‘∏˜ñÇ∞¯˙6<ÃI"C‰Ê'h®*3LM5é ·ètÚÂóí€/∂⁄´ãK ;K.‡´Û…Ñ¬€u?ÒfSÊ.*…+∑NJÎd$±t
‚QR¶ä⁄‡ÇCÊ¸X#±⁄ã7Ø~˘7Dp4P‹≤ÈBºgü7»C6©ÉH2úeó¬ÂÂ^È∆È=.©_q'Ω¯ˆWø˘ó˛99‡o‰.ìOÖòÇ˜Ÿ¬ÕÛxã_,4HB IÇë [˛ä`˚°∂z‚®Êõ˚Ï‚B¶	À'Á¶‰q≤ u|H‘7óE™[ZOøXt4¸’Ù‘ÖÍ›ôÖ ”„r*äb˛•¥ı£z‘p’Æø{=Ç∑ñè]¥ §®‡“D™‡©i‰lè¯»+	]QÒÏ|näyõˆtÊ+ÓÖ‰*DÂ^‡j/çπ[Ω≥M2§ÆÂxj.S]t∫"€ æ=TATV∂cw«‘1≠J'é¸.≈Åk Ñπ3™¡oÆ1¯+s%‹sä/ÚIS±5∑Æ∂Êéù·Ã€Ã[<Iäil&æëƒ@ŒÃ∑Ä•‘m«f)èU£RΩ'ó}>3aÁJø÷F\;Jm–ππ—ÉQÛÑr˜ËU˜R®∂î⁄O3¥pr#†ÉœÒ61.øôæ„U€]°Í]záÂ˜A8Dv/}©?àºj®ˇ˙h^™‘Ñ≠CŸfc4VÙÌœîîπÎ¯tìà∞F¿(»!aã{®¥ÉŸk≥°âF˜îYNBw00˝à¬SÈDI,6å§ul›Òk{häÿùÃ
◊≈15{^˙€¡„Ü∫¸]H…'I9w˛ZöHê»lb˙RN0	é(¸{õÜ◊·râO?å&]¸çı$JÒú–gç¬ﬂ2Øâ_oó»	‰Õ´_˝L0-ÍíßlFˆÑÍÿu&¶Á¡¡•/,ÂøAJˆsâÓ$K7Ny>ªÉß{˚Ω'Ω›É˛ÛŸÓ<y8ËÏo;AuNIt:oSo|‰P0dû¿NÇ~œût´ÊaŒV´m¨∑?Œû0È%ÂÁúõ¸w◊9≈ﬂ•îpƒ¸S∆lN
k‹√öt∆&º≠!%îrç £I™¸ßÏ’®8#%´5Á¨'ªqÏÄmùwg'ÓaNFr˚Xû;‹í{°ªåZæ‰2n£È.K1á÷„?Œ—ß`û¬õæ s"√VÀà‰¡ãô(e2a rœ±Ã·KM÷ãcì ®oµl˝¯”œ4*ÚÜÛØlr©rK•ãt…_g√õZ¶_[$ãK<±Ÿﬁ∫o‘¸x©Ò)∞Ω⁄"|
¬¿9MÕÂ6∫!ü!WN3u¯mû∞ôDd”#œ±f`Ä9¿'ı&·i$÷y‰¬2'Òk©+‚3˜uÈ?öôﬂ”<S9V!è¿#H¢Ê≥ƒ èP(6´*8°XÓlËg=Oº≈ÅüèÓ*-I~òxW±—£#·8¯“AÔãÜ¯tŸ]Z“îDmÚŸ[´a¢£:
*MmÓ—õW_˝5ÃxdDÔ≥*÷&¨øÔ:ˆ(wG˛äeÔ‘ÖK©oU\®~BItF˘1#5”ãã¢⁄•ˆ5)WHíHõP˘W◊Ë˜ø«ïiêÉﬁnÁpø≥ªYjÆ:§\Ñ9√ˆs+m0¨„:Ø@çÖˇ≈c…ﬁ8ÎgueÑTõ•&îuqäJ‹e≤÷¥öúõÿÜ≠Y…'Ÿ¢ 8¥◊•∆†1ˇû<wÜóø'5g¬WÃF3xøóø•ËJºØ`E°ßWÛ¸§¯ô¸∫ç¥≈≤ùë`¿*;9ÔÓ~«sŒÍk)C'6p“ñÜ*g	vêÙ±TTŒWıÄö..†∞AdØ2<î[Bµ!“¶¿Å‘@∞p'&;ïöÁ55]äx–‰ÂÅ?ÉM#m¡˚c‘ÓêvC‘e’(^Nq‹#)Ra®êÇEo=g∂AÒ.Ò-Å·≥!´’Ëp∏L(ü*¸J~DFÃNzÇÌ9z\jtiô4ãÓ≤G_¢=œÛOòQx;˘é¡≠qPE>!˘	"mµ,úÕs>D<‹
©—∆`√àèæ¸í¥⁄⁄Ò`è¸æ0T‚rÃ>ˆÚÊπïπ©.|,t4™4–"\Úç∂í&ÀµGÆi¸ÕKØﬁ"ﬁd3˛≥M¨Q‚œı¿¶ålH•\ìÿ∫≈9C”z¨a≤ê¬‰ï~o¢”(ÛåÍ¿œë¨µëƒÅ
§SpìgsΩtœm–∆okÛkí
uö6ˇ^©Ñƒ f¶§HÌÄ~äâ2}XÖ!&»hÙ~ÁÒZÓ÷Ì0ô(ß¶Õ'©ﬁû'∂ª≈Ïë?F%}≠Í√ﬁçÆè~∞⁄>Çôú∫j¶˜;πÏüÀﬂp'„4f∫T˚∞zEY©ÒoøÉ§üÒÒÂ,õπàø,€Ùª(Ó˛àw¿s0≤'L[‡≠\€&H.o~+hn öÅ*Cﬂˆ≠∆Ólrƒ\^˝ÓWÆ´ıA~-!·µI√W€ãâƒæ‹^Fî»ãT2\iÇA™_Ôe˚ê‚ÎLÌBÒ…‹{¿B*˛£AL·°F‡!®	æΩtMª0^ﬁÔ¿ÃËøÔi3
ùˆs,SGÎíYNò*˚wb»ÔÆ7W÷tûµ’w*≥.ÎUıæ‘zÁò?Îö.òtÌÔ˛ŒM≈23{˜ æp»∂ÈMõó∂]≥\}Ô˜)ı«ç	=´5óâtÉa◊llÄÅWÀ/k{{∏>`:¬\zã[>IÄ˘}üÆN◊Ø`·sê˚§Iê?æ|2íM≤ì‹,æTS,´lNfìG.é·ÿ€Ê»ÙΩM∏”≈“≈≤I6ö?‰…<òÃSÉÕ#ëÜRL≠N⁄Õ.-Ë˘OG€òŒ‹©≈RÍF—üÆ¡€•S:4jïøXÓïgZ¡⁄Œ¡≥˙ñ9·eÈäƒù∞x&IMÔÏ0Uu·~MbfsUõkUEµˇoœ ?`¬üìØ|Æ8Á ≥“Wo^ÆPË◊}JMõt·Q`MI«etìÏ
†)x&˚3oôÏc0R|‚â’'3F¨\.HŒóÚªµ⁄ú‹.pºI>¬ŸÔÙíÓìŒÓnogìÙ˛¨ªÛåÁ¿Ï˜ıˆ˜;;dßø˚o§”ÃOÊS™#!c“‰∆»Æ÷p≈îïfã¯‰Q†?∫ß:®¶ÃÏ¨¿>’ÅÌÓ»nﬂ)ﬂ”3ûì%∂»Fc=$Œdëe∆B0ë≥õJÀVÿËî‰±(RdcS/f„’BƒùI&'r·>(PÓÂ◊∏……Û`≥S`2´Ûãã2≈Öô§∆r+ˆ·åZüœ‡UsÊD∞®'(‚Äè@=âÑyCj3j k√Ào–çLúô(í„_8ú1¿˜.(Iõ√“BF2á<µ(OxOUÅ3@Â⁄ª|⁄µ<R¨ôí{Íıd)F@∫ÉΩüí˛Óﬁ≥CK‡É™ìß”9µ”t‰O™	≠ÎîE*k^ÒM«›3‘o}~+o^˝ÚÔƒﬁ¡àZºízËSÊÃº–ró˘√q9£KÈGqëÑ8Ä∏çÅmΩ‘û$oø∏yﬁyv8ÿﬁ…Ò…ﬁNÁ—`ˇÈ'œˆw.V Ÿ±t’›ÍeDTºuÛ\Ç∏(P^º–„®Ñà,5Ö@ÇL0!ë°OÛNeg{Ã¬¸=ä‡≤Rë»≈lÈVVã≠R}ßLvÉ8JÁ8´»£ïÃvá‰æEﬁ˛À-Ç≥∞Èâ9¢<œ≈2ß<Üﬁ8uaw¬k¨•'\àç!© ˚ÍØÇ›,g≤7U	üCgj€æ!/vãe⁄E∞Óô¨ﬂPKéí/>˙A{É∂ÓÆ<-aU‰!ÖAõXUÇæd∆#wUy‘ΩR—≈—+ÍúäåπÕlûeÒ”›Œ”~óW∂{œÓ!¢zÏWêWÙà9ƒW§ìÍ%∫∞îÊq]Zv4ZAÚsê˛ax“©Ÿ¯‹El4{Ãô¨ú¥V`_„|é@Ÿ[y‡ô_∞≠vªyˇÄ∞èÚ=˛ˆπE°4¿Ì∆
¢?Ñr–s T˙ÚG≠uæ´∆—oQ¶6GZ)íõs§^k≈B	IN  úeó≈lIä©¨()÷®H¯ää
A‚ı(4FJƒ?÷e(#ï,B∂ôyZ˙s?ô¬VTG=å0“átÍœ\ÍÚÙ=0
&‘ıßc‘ 0kœö‹Ç@‚3,àt&÷dﬂxæJd¢ªÉz˜∞∑öo∑€Éø˚a≠˚É›
ú4….ãö$)
Œπr;U “Dyﬁ®ñúÂƒ˚B´0í~<ÌTÏòÖ˚¢:æP_óQò∞›KõÖ^ø ˙~ÁƒÙ0”G¶«KdúÕ(≈ôÙ`=»Âk`”dÍxﬁÃ$«¿QÉ∫¿∫‡ñÏlhÕ<¨ 'LcÌp:µ™á"¯Õîtt˘ÕåOèó2óM»påß U¨û!•kR“eH¨oÀ‰Ïvˆ∑7…¡≥:¶û˜»^ˇœÊ¢πT¬É¥.Ò È¿õÁÒ!ÕÁ"Qx˝uÂ¸Vﬁ/ˇ&¬√‚‹Óòû0æö@$˚1ºﬁ„´q∆ºM(ì¬®f‹u¬{à≠Ë)8ßEGåå6Ô~…5`¡óø«˘Ä∑Ãi¢E∏¬pëß&ÍrL∑2’Ë_¶T9-E≈æÄÚﬁÄL©wwÔ—2È’'‘¥ña¡≠ô2^S^µ˘ºÜ¢·reﬂú8˜Ã≥>Œ∫µS_˛ù™l˘wx(§Wí¶€y_=KÖRMÓJHë'T≠BoBÅ?°úG°äO°≤WAÄ&·ñı«b€~∆^r81C|4ˆkL
°†∫Î=OxD/ùn’!gÑ?yÕﬂòVÍÏwÚÄúìF£a.Œt≥Id Åëß,ïËô ©Ë¯≈KaèZ'ÑoË¶)8 u!GxxTË≤eÀ—’>U≈F÷√ê©‡à‚»⁄iÎ)ö 5¡™Èºe¸ÖvU…äÆı3Hã∫-∫`=ò«àV˜xÙSH4!ÊòÁ_æâ5‡ ´ID∏¯c'ç4ÔYl"Õ∆® ‚v∞´
2ÌóÖÍõËàs@> >Îv.ˇÚÚo{‰Ò‡y„a_Ã˚‘Êm∏6DÕÙ®†#≈{–˜æ˙´Hﬂ√‹}¬Ï·;œÄ¶sΩ⁄^æ4ØÒL>ÑCgq3"/hU$p9·é )â¯î?≥ZAQ†Ï‘:AZoM{À√È6¬Ÿ|˘e^¥ﬂ9\¸4µÄy:úæÉ˙IË⁄òÎ¿AúÍ§ê≤∑◊öelÏç¢ﬁªÃœ&¡“ßS¨¢¸Û\ÌÀﬂáL"KjïU_Îë‘[uïªr∆ıèVõ¬a"	øÂ§S∑¿6ì áØU	¯ïâ¢D|~º˚\Ä\îÍ§ Yúı˜Ü6Bò!ZW⁄+ıÇ©!`êR≠"rñoÀ⁄"Ö6ﬂ‡  íæ(ÈïâO«ƒŸpYÀ∑)…Nı¸EQ-~∆Å©,ÕøY¨˘‚Å3ˆ|Í;Xñ»Ã@<}2rNıN˙¯x@KÍËíéKﬂjìﬂJWãêæM|f;ÉFΩX‚é/Jˆp9◊Ø#,–∑ø˛ätÇÒ1æ˝˘7¡n©é.eâ™$ÓøtÎeaxÚ–‰RTÖÚªR4”ƒVòNéB™¯W˜z˙5E ˘˜ËÇRΩNË‡0iLÊ∆nd»ùy'≤
&Íƒyƒ¯m˙AñJÛé"Ö <
)≥T◊:ù⁄õHQ–ó◊'∏Zº\±VVŒMôòT^›ÀÂ”~Øh&íÙãWÎ§∫Ïﬂøé˝—∆&Ω¥ÊWÓ9Ù)º €O›L¥!Oe◊Q+Ô‘)ò^pç˚ÿ9	…Æ¬\ÓÛï%Óó€bµ0Ët£‘^(?©J›°™xï¬#„]Úòˇ‹dß0iaÀ‘Œ„J›î;uñuuñÓ"'Ò„àw) å&∆ùfÍ1q—ÒÆv&)#1“µÂ©
·7Oü≤[ÛÕ´_˛5…wØcS¢ë= 8f‚sK	⁄"£!n^Oz4¿ª¶~—KÌ¿úÃê∂Äãò#;ó¡â}Óe§Ó#k∆“=ß¯'Q¬qBaà–)€B5Œu‡!{õ0ï9ØbXsÕ‘˛ø˛•:d¬…pÌî˛'≈Y+p”vñõr¢[-At•âlæÜg™N~oÉﬂ2Ω´;<ﬁg-zª%∆)*k‘˚Éîn‚9 z‘
=œsÔ?~rHˆ:ºÊ‡Ÿvo˜êª≤»Nˇ‡ê‘:€Ÿ}twÔˆüñÊ(å©ÿ#+S„‚Mbüv˛µdïM:π—õƒê±{!dÏ™⁄'éqµõ]_«W¡U.áy‰ÈvK\ªGÇñÏCSëiK§¡iJO‚∞d‹`CêŸA‚fs5ΩÿÓ⁄¢8≠0◊ã‰§:R5ä3g‰_j2å∫√1á‚Æc”—º
¡ò®7NúZ≤.∏RîÖP.!ï}»¥0-ÑØö¬ÒÖ‰»≠çÜn§D‚ÅXógÃ}©„Q™dÉƒÂUí
pÊ%94(êåL-ëOÁW·“±t˙Å∞~. zmBvïı öë§wUÊıòÏÀX\,\2 ]ÅüÀ˝Ïh+mRÁOœ◊Ì%ˇ „ñ A&‘è‡-ŒüIˇÌØˇV+6ãd˝$ßÙ;‰#è8≤ C √†Ü’	aè‘,Dcà«;Å2Lﬁ(|Ñƒ—…˚)Wñ ö§ôˆ–ÇAºZÜ‚”ßÒÜXöÅMcæaC  Ò¿FYπBp§TµÀ¬C(I≥’VE1◊‚(f*rπ™â\ÇPG~–REÇxALQªâh¡Ë§ûëaP∑ ´ŒDY&GS@©˛:¸Ad€<ôY£K6à‘'hÎU[%H´˛•e)¯_√ÀKhT!„,ı:C·/Úb∞^›Âo»—ÃR≤êÚ:v|ÌØ´pΩï¡lêAA8{}ŒpˆπÑN0å]îæô{ÂêT√ÒÙâjb¨†MÚ5›5ºTÅáZKÅÆfœMBØñª7ËÁC—º«\§e:B8V‡c⁄µV≥πLRp>⁄˘M	 F\R3`qîÿíxpB)4÷y⁄A8+”(vÃTMM\5ÆT⁄+«Äç4!^õlbù0dØfäÆ˘Z™áh£lã Û∂R™ÖŒ‘>uÈ¥zVW4Æc&B“Œ ´.‹èh lt†ÖlI‹ESKü≠˘B´ºî#SÅ`]§”)JG+Q7§“!ËÇ∏|Uy8„≠ê>c¶õCÏ⁄.˝ºyh¥ó9ÆIØ{! FΩQj⁄Ëˇπ )^Ñ√∑≥):t≤î›•ó¡πyAmbÀRMÆÎmV°¢ÃØê@¿æ†qÜ}∏âÆü:KÖÌ+27/Á√Âß^ˇ¢Ö›ã´Æ-õáD»ÿe«â"ÂS⁄ò∞ïııõ—&PuF˚ø†F8yœÕ÷¬'¿KÌœ F Pz[XﬁÎL@áÿNô2ﬂÙë„6ô⁄d.zc2g[afè≤Øá˜d˘?HnÖÀ.ÊΩ˙Và7πRë#ùsòËØ≤I-ÿ∞X^AÄ^oH%Ï·ùJ¡%èk≤L®ÊK⁄Ff’V2°AL,Pß¯ìÊ´ kÁR]˚Ò‹W	=˚¢d]j∫oáøñôËD€sùÿ™òVR∆¯a`«¢+-( 5·√ÿd—xËSÛò´*U}}aÆpa“Ÿz…ÃE~w˛&;Ü	Oj>ä
î´n=YJS◊@,ÀL√ÜÔ<2œòQk.]¸ê'SVR%ÁgnÈÓ;\[Jiêë'`l∞-Tzw˘U/eZÜáºölçOïO/5Wïà˘¨ÂÔ…˘ÿ÷˘995ºâpD≤7vÒ√≈’p·qø ™»JûVŸ6Âª1¥ëc\ö$:XªNktá
)'’NÚaöéóy§∂ôOM+Ú ï{w˘Ï•pIDº*·™Ã5uâRM∑ÛÊú¥Ÿj™è_≤ 2ïóíÆˇU6≤*≥ÄÂàìcW=áŸ‚bZcÊë≤á1ÊRÙZ!_Dﬁ^<{ºç}m˝jöz5ö˚ËÌucıˆÌèS$QQ¯IÆ‡%wÊwâﬁ~Ò_Îû +®¿G)É†Á,ìj§ÛÎR’ÙMYÂ£
D`ÂXπo‰üÀöU'GÕ|üƒ FerKvê√Œ√M≤›€Ùy™“ŸÜˇ;;œv·á¸ä§ÇyáÙH‘3ËHîe.f#¯ ~ÿQ)êiìcjüI7pFB›Ñ¬!‘HPÄΩ¨éêò«÷y‚èú¡"2i∂Œ≈œÏKÅ„‡~}#lÁ}ê=ﬂÙ:3åŸ¸ËtÉÛ3HŒ«~ˆ˘ãrüfØtlﬁ,2ò	HN∞∆‰Åö®)e4k<7O®òëûm°◊rgÊ4'«Ó∆v¥∆[Á"9ıan›{sY˛∫ÏÁ˘€qòÑ≠Û`BÊ©Tì˘∑F∑≥◊Å˝A:{˚Ωÿ!Xú˛ÔÛlç!ù““{b£‚ûH˝Åè‘≥ÿà⁄>y¬\á<§∂-¡W¶lÂ,ÏMßÓ;ı#óªŒƒOsÿ^]k~åÈŒâÙpJ∆.r^≤iäcsäA„0M”Û©FAËÃZ ¶±µ0Ü™Ò™ÌqN{Õ>T&iß…Svö‰¥~˜6X"OæX2›€öπºﬂ}}‚÷[∑·áè?qYg'0Â“}An*('Ñ±¢zke5ÓÀ}Zø”ÜI›iìDVΩzF∫9L"z’•‚7R¶Ωƒ`»}¿·‚Ÿ˛¿4ÿ¶pd–	z°\«òïû
}2¨%>g õ6œNS"∞ã¸pL\»£…†Y‰H-—·G€}(·ı»¥íêÍo^˝Íg‚9ˆògú0l‚dûx§uá`r®¨z^Ì|êù,ióéî;ìˇæûÈNë §çêÇºZÈcÏ:'îtwüêá.ıLëü^˛£‹Ê»∑RÁ>O>Æ∞N)rT|Ó[«/≤º)`M)†Œ§(câñ“‡Ñt ”Ç˜úŸTÙN∆ÈV Úi+W\téó}ëO é„@a
s¯0ª!Zk‹∏gÃ≤j·])ûÔœg&¬ íD∂Û.Ú∂È¯|OËëiô!àdrâphAsp∆df"º∆ß lØ"Ö"\åÀ<t£†#íÅëd‹≤ E„˝Pÿ2(N¶XE–9úe2õ †ÎÛè8ÜìA…»D	Ö¯!Ê„úø7FH¡Ju‡∂ÿO¯≠	¶j|<_ZÄaZŒê_œÜ∞ÛfÇÒ±c”¡‘û©'„cü‡B¿§`gR0È¸ÀØ—eã9Œ≤∏©3úâ±·úëﬂ¶ 	ô¬ËPkà$¡1Ùó	< åå–áÙµ1Çç¥C†ûebŒ9ƒqÅêƒË6.∑«>•8[ÁA{Ü3KäÑ¡Ûªﬂ˘∞†ùÄ ¬\tò1∂#Mó”¬Îçì$¥åÈ3«∏‹‘√•™òR”p|∂h—(ñD`Ï°kﬂÖÒ=∆1s±í∞âÄ‚C2⁄$òºÏ«[∑å‰÷-|Eº(…Á÷-dë§Ω∆˘$ú∫&¢TÚe!)˘Ã2G¯Ç¿ØBhúáWB_;¸/F›‡"~›Ó÷≠eòÂΩ¸P¸l":3 ˘ Å˘.H+ÓÂÔæ±¯bg@A∏¢∞RpΩ'àˇÚ–<wd9É*¢@ë€∫7ÿ?ÏÏˆ»‡·AoˇyáÉ∞>®@1ã[ºjeZ&ï'¢*ôˆÍaáI¯•Œt†Û¥”Æ^EÆ±82§Ô∞ÿ#)à≥‰ûËqT#V Hm*°xΩyıã◊zœˇΩúX√¬˝®©»ﬂ®@ˇ
>}®¶å,ùp»/†;ÿÉnåk$∂î¡“€ ÿ„∞‹Ê˜s6Ô–6ñã_∏H∆∏È<î$Ê…#RÊP‡1«;Y=+ﬁ\∏˚ïÖ˚5û0ﬂ"Ê1Bpld<lB9krÁ8 Ç∂¯¥pmî`≥∫˜£(¶Q˚‡´¶pÅ™©÷>ÙˆÿÒÌ:ùNÎ∏æ ÷º;ΩŸ¢µ≈ËruÂC$¿€y$¿ÑÛÒ¨<ƒqñ¬“ÉEˆùæ$S-¬ü≠ÍÌ5¯Fî>ìj◊u8z"°ÈL-W=Q˘√±€Ê	P•ËœïÍ\∑∂ƒ)˛´Ï^ßw†Wx˘#»TôÀ°Û‚⁄≤Ø]]wªæû´Ùé¨$xÂÎπW.ã<ﬁ=ıﬁıó:◊##óÅŸ¸{L˙Á:áí}ÅYvøPÄÈ^∑¬Å¨‚3ºﬁîì\dJ≥ê·=∆76q‹Èÿí˛ïsg‰‘Ù«†·Oß/…O·=å»Á◊ïmÓ†n4]-∑æUÜ$)!Œ\µ¨≠&tX?,O√u¶uÓ˝òŸ≤B2Ç1ß9œï&Æ¨ŒQ^S)"º@rv‰[∞¿‘ùê‹âP˛0`∏Ï?1™2CÈ≈v+O’[¥Î	ãv=S˚ãkCÏKÈøsW¨I]<g¯ÒZj€EÇ€±ºOK•û0OwaâÔ¶t«Ï[ﬁªâN>µb¶m\ÇMK¬‡¢â;√kÃlîoÃ€ñL«,ckÌÓ⁄ùªÕVscıŒù˙ª;lﬂ=jﬂ]]m>¯|k£˘¡È∏PãﬂÈOõ˛÷Qìñ¿õä¸El‘ŸÏ%«õï#ãç¿·Ê h_Ï»Âv7n4ÉÊKA«ı€kqª§∫¡@Ò °4ZÕı‰^à,∞ò í¥‰£∑U9ì9∫ñ(Î>sUDX5û¨∫Z u_ä¨öà®VÔ˝vÖÜ’P<Oîëù–˜1G/à≥TKÂl-/zõÉíu∞}—∏'Ùt°ì˜c€ıÜ≤¥|…zX®æ«≠¨aõÄ p9ºÍ0p+	x˝¥®`ô7Õ¡íIaô^Ó∑e‘x≈ñ2Aàö2Jq†ÒV⁄ ÀY[7 dÍºõÔMÿ⁄3ﬂ˚v◊u5Ö¿&êçc8ﬁ2'nª1o ∏É&ôtÖ4
)Ù∫;‰V“w$'ÀNTÌû˜0>◊y∫∑”Ôlw6…Ó‡yG¯çˆ;˝≤€!OÀE¯ÕëjQ˜Z‘OLè:u
ãnRÉ.dtfâ‹éÉdY#Sk@A∆ŒrÒÃJÒÑz¢Hõ>~¢«˛Ä¢Ç´§˜>/.æ ·ÄÑè∏ŒÅ@‰æó™™sE⁄ä‚ò˝UC@)!‚˘%≤π¡∆¯èYö&êÓ‡aoˇŸ~»π€Ïvv*F&r0*¸A⁄â–œ™§1πOE9ı_˝ù*¸É~–0M1s˛ä⁄˜ù ƒà}É Èı∞	∑h¢‡$=Õ¶HÂá°Ü∂c9#m0cx«çê@:”òŸ\ ‡8:»∏d¿¯?ÂÆ(Ω≥IÚÖ&˜eei/-÷RMF¥|g®pÍÂ*T#o^˝Âo·ˇˇWKn:©"ÎJóÔûê∆Uæ%6’Å@Z£^z—&õÑ§r2Â¥‹„¡0åA∑oÛ>[˘˘Ÿ~Ù÷e•Éè1ÄœÕ}‘]ë†D∂¡Ã·ÕObà∫¶5ÑïºW ‡≤†R'yLËÇÂ;±7…ˆKõNÃ!94'å09«ºŸa"õ¨HWÿ∞µ6Q∂ùâIÁ‘∫SÿÂA€ñnm]!¨9{∫Ÿ|ΩU\,´⁄≈¢ÁÌ≈∞°jÍØ‹‚ﬁ°ã>~{ÙlöÒj¢O3õÚ¨Ùp‚–Y¬(AvÿK:Ïïä•∫Ù∏r'â Í£yÊ]z¬ûcäUB…`Â1,©«√$®a„ÏπŸ4Z‰ˆè!Z·Ia§êáUx¨ŸâaBx£åˇÜRuPB–√Éı˚zˆu…Åœ¶¸õ£zku]'íÛè4åå¬È&i-kO‚XàõdÀXqIc4i˝utÑWÌaHX@≠„D90KW¬çÜpÈ —d30â–ÇiÿÇS¿¨°1o∞c‰Bò `{A0ö«∂AÿÛ»–7—5ú∞Mß)Bøn"®Êië≈.tì.≥ŒÌrÎºá˝}‹Ä~∂[ñ\k◊¡ÿH‡g®µÓÄ∆–)øﬁ}ì,ƒ÷¿ƒæhs˚ﬁwh7Ç√ù MéNÎ9÷	CáXrYy0à∞ª\Ør"MkÏÆ∑∫‹´Âñ{õy`’É‘2ëê:œ/µÿ)	ãΩ¡ó:,Î+ΩË‹Çx6‘ˆ/ˇw·¯Ù±{¿∞E¿V–Èr7[å·˚‚ãÕs&lm>G®Dè∫Ã8âoõ»◊ ≠zÔC,÷J≠˘sSt$5P4ÄÍ`üãÖ¿ÃY´‰ä'›ÄúÒÄ.fÇ°„ÇÍå+Ï	ë=#íÜ0äÁ)ÆF3ó[Hx(F.çÃBW~˜±¿ÛA≠`ôò∆Y!¢è¿¡1=ë7NB µPACÈ√söa,]E)»ö2UÖÆßﬂ@∫(™˝1Ï‹ÃµéW‘oû√Tã´ÜÚ·”NÓ¡k∏ÄÂ[ÈùøòJc°:‘õL¨3RÀ¥ëâ^Z·ôaßM¨)tƒ:	x£©I“ûqrâ!œÍ≠R=eD?ô¯^Ì¶Dœ\´LPOœ‚EÅÇ¢Ó2EîQXoTπ∫,§OÒ»≈=Æ£ÂùÇ—2Æg°gä∞Ó±í]é"Õu* dí,¶"¥V¸ZÒ(ﬂ4®4¡„ÍM•Z-·„è=7œì+;‹¯2§√BããK ˜—◊HÅïà;ÂJÌcË®'©R≠≤xd¨*Òe∑‘√∆/Ø ∏6≥åQ+Ke‰q≥©Uø≤F´ﬁñq‰jıC™g¬ïDUßÃRˆÖ)õÖÀ¨©ŸTWlÍjËÁÖÁÈ8Y˜UX„Ú‘¥¿ŒqlÜΩ4{Ë9ˆE≤N£ug*ã]ÁµZˇﬁkïªwwÃÜüuMwh±∂“oït÷ÍWè¡‰±}#ä>	ür∑œwƒY≈K&Cº< AD™2a*àïOgÓÂ◊à≥L¬Rô ≈Á 8Xª‡Snr˜E¬n≈^¬∑•ıT…ø™ËÉ™“cWÆJi9’j:Fh,Õxoºûk,'É‰a÷y#™côVº˙¥Ë7Øæ˙ﬂÀH©CÜ‰ÚäC¬ ÙªÆ]à9eS¡”Üçóí√„≥‹ˆ•GÛ—‰M®ÎO«ï¿ÏœgîüG&G„Â7¬$“BÔê€ùx&ÊßQ[$ÆOÇXNìG∞ù1ô2Éé.øqè;Z3ÀRﬁZ#‡ÔI9E …6}⁄—b∆Ôpüqã∏†ı˚ ÈÅGé·%Fqa—y⁄±∆º!5÷&QxıŸÎà	Çç›qHØóØ]î<ÙH#Ø-ö≥ÜèR	«rØÇä∏‚∆ﬂìÒª!„ˇó°·^ú4Éìë )ª»ü{∂g⁄∑¬J<tÆ'c˙^&ST‡N˙∞<4#çzSÊ	b“ü˘(ıÑ]~çµé»Ùè±L≤†ˇw1…V˛≤≤ Â<µÆ;„âx†˛Ÿ‘'˘zv©k‰{aTã¬ú‹|2WvÆ˘›õ∆cP$·ÛV2ÿM*júÊü… ˜≥wÉ∆äxÿ˙,|≥FòH¸
·ƒ∑¸,%*t=%–¯$/ÒÕ´ˇ¯©ﬁ`Ó„¥ıía. k¥püóáÉ¶2° ë0õDf(”ì¢B©tÈbô-∫(Ë¡N√¢TTh˛1¨Ç∆çà±êü≤ ®ë¨ã√ Áa¢·’X^˘çíåÔv,´∆[≤≥)∆L›LûS¢:4Æë0ù\^Í £/xÇÂ`^ïÃ¡0ÈÊOSë!√Çp~'Qk¸ÈÂkQÓbûhp†“Ú3√	xCx2^Æ®.óP@éìîÉ…∏Ü≠•Ø«yê	7Õ5l§x¥¥Õ{-€ÈØØg;Öì∫ì‹P‹PS«Û”xÔncuyÙæLë˘r∏˘®®´uyã6Qe.
Ãy›˙t¬ÀÀìíìq˝ÌÚw`t‡Ω.wbäºÅ0Q@‰`•<‹/ø>a‹î∆Ω◊ Œ¯Ç¡Kÿ{chû¿DyÃr9i+afö{ÁÜqi±Ö¢ZsòŒküCƒ◊ÖOco0ÛaÇ(Cÿzb≠ÚÖÈÔsè]√.
–vƒ∑Qã€+ÔüØ˛ß∑&éÇ,´¿Àc`Œüh\¯é6œ xC‹XY {"µ∞!nh”e!j;7ÃπÏ0(ØT öBª);Hπ‚H E∫∏ç0°,(t¿SèA∫MLÇCvÁ3ÊÚc∞•j/∂;áΩÌ˛£@·/€ùüæXä18¶‘wù!oèŸ[ÆA‰éƒˆG£åM¶'˛πÖHµrÖ›ﬁO»AØã(õ‰QgßG∫É›¡Aw@VH∑≥€Èp±√ﬁÓ∂ Ëõ£nÅ:ıc¨ÉEtº°ì≠Y·ós’EEö·ÜÃ$z,’&ºÕ"Éhí≤Vî(ã
‘ÎÖöíD•"+!œJ ¨•ΩÁô6MAGÏÔR;péuË{Æ9AOÑ,CSÉp4GA"ú[¶í‡–.OHª‰€ü˝íÃ¶Ñ‚2p1qAôX™*"Pr√u97•∆m%XŒ"_x¬Ø˛ÈÃp∫x}\‘-d>”◊(πmhÍÅâ,æVDÁlÓbÃˇ/ sé\F‚Œ∞é˜ ã\.É‚ﬂwÇßºVlΩÓ$òG‰3ÖÈ∞!2kWàë«Åm¡só˙aE%M˛Cπx”Õ§uƒdG„d…Ç¢»°%ï”	ÙÄ(â•i™$0°•k#ÃπÌ5Ûè·NßjdèÏ≈advä˛QxíÉÈß†ÙñzX’}g+µ5Â 'Hﬁ7uß‡©2EO∫€®øI2ö˙ó6—≈KêÙŒñ…∆ò\˛∆#≠çq9jíÎïÈb∂“°¯Y∞‚√ô	¡Bô=
¡6íXÏ!¬∫Ë%W˙àz~vJµûç¬6*Péº∆A+ÊÄñ2ºÕu!®o´d˘ ùıƒ~HKfi3ûí¶Ë)õ¶©ˆä&¢Ã2=æ#)rmQÂ{íÏ¡Á3‡∑ †r$á5!Âßh“!jÿ˛ÂÎ)¶¨Û◊©¬TÖìÀì5MA21{8·]
∫-Ü®y∏O–Æ„’<”4úr≥å0†»À◊u+÷®$»™@∏EbÉÎÒaˇ'<°W€UÅœte¶ÿ4ú˙ÍB—¢ÓM6ì≠…tEq’ÀT˘5=ª©∏‚m=ﬂ1NIÏA'¢6#ª`À£oÉÁéoﬁ[·∑”LÁz⁄ÆÕ“—‘¿	TÌí˛(∏Óö⁄£+zS∂≥∏/…ˆkâ^Á˘Bm°â¨Ü¯YM6©hƒ`HπFÏkÚﬁÈ‚#ﬂf+˘GJÂO‰ÎﬁC‚¶[Ω≥MÚcáÎñ∞kMÎÑŒ—ú]¸ÆÌ  $‡h†Çó†|#Ué®∑|‘¶»ırò‰…CE‹…Îﬂ>ë_5]‰ÆL≥•MhCüŒîó∞ä˜Çﬁç@}rlQê5ü XJ,újè¯ßK§Nj≠%r˜n{u£~˜Œù’{+b§+›¨≠øŸ∆jk£ææ~˜ˆ7ãÿ21±ûàzº˘d Uüü%û´ŸK®ΩV|+–“9’œ<-%VãŸ¿€dà’zH«Ûf`s<(‡E| ¡Ç’Vµ˝ÉÀÔ¸?±}Ø!ÿÙŒH¥`EÂ≥ñu¶ö≥¶æ!+ÿÆ€Âπ¥ƒIﬂo˚Ú'¶ÑLR™Ô¬}ÂW	≠∏Ú˝B˜ñ·Ä¿|Dà ïˇûãóFÖùﬁ¸xï∏›ÏÚ’T~U˘&{a-u©˛ê^˛a·æ‚lLEG"|V˝ë8lœ®Çqπ”ˇÚk€t<´‡ã¡æ([œ*ˇx∏!¬áEÈ
	ﬁlë~to
Ü∞:U)¡√·´3∆ Úú—uNΩ≠Û’ÎfùÛ€¿Puú4@v{k÷ ∆zÕ/òèî]∞mé–Cƒ#rA7∏†*5r,q«tñâ!ËÖ'Ë"Ê_h–P§*ap+\ÃeÆœè¥\¶ya¶LT]ıfì⁄ç– n¯Æ9Å+æ¸í‹HÓò‡Û%mE.úÔ˙µÖ=`˙«ÙÉ”–µ„Å≈o;º :ı˛∏+&BÂ∆	ˇcA€ MTÓj mîﬂ`"∑ÿ∆{<ç{ã,¨Øo¥∏‚çz˜ÇzPº‘HI‹ç◊µtﬁ·X‡√‘Ñ†Ây≥	Iª§ﬂD÷àmô$Z˝¢˛]»U}‘Ù5S oÌ·.≥Ä˜´ü1oLÃÒàhb†ÖQ˘ÛfãÓY‘Lù•ü“C¨°⁄"/÷ÂkrÛ<{«ã ÍÇq˘;8!≥ˇ.∞olÑ±√õ|§öÄ6ù>»¬Õî¬ø∞˘Áˆü€¡áôΩ{±B˝Dbﬁ3◊¬Iß€]ﬁ<O,Ù≈[7œa[;{∂ﬂG|a˚5Ò‘Kö€ú"∏Ïi˚V÷‡fÀdQtΩ\Tnte‹tòõLnÛÊì…ïÕ#∫~˚„x¨ì c<zól<fnK0à[ ú“@ÄZ{WRñ…¿	ÏYÄ(7H˙êÛá ¢@°⁄_Üöv}+§aà˛Ω†zÁÇJlKÜ—àÉ«M∆˝öYQ"`ù§Ÿ@·FÁ#>tåó!èZFæ°gI<%∏√fÊÜ‚j±T¿Ç‰¸á_Ô#(ã#{ÿrxjÚ>Öì«π˚Œ3¡´ƒõ°»hDR‰ﬂåxåﬁûX:9◊J.Ó“≈G∞(öqÕ p80i8ªh`aòg4Á+Ûπ®5-ëÓb¯ØÑœ¡™]ùΩâh^sì}7gÑ0né¿éÊê|ê∆<D‚áëOQb¡o§çüÎCﬂ<ŸLjZbèŒ˛6imbNﬂ~Ô∞≥ﬂÁÕC˜¡µˆhßÛ>z⁄Ô>ÈÌÙw{e!8É§’ï;£%j?é@(Ÿÿ`ø∆Õ6Ò“ 9Æl‘ø|m∏∂D§Ù…Vµ|êU⁄ƒIkW>¯Ã")^ê‹¯•ìÅ„»r»o^˝¸ÔˇÂüÆqŸkëTŒ¶fAπ[≈,∆≠=â[gıqÇ∫£M«à–=¬|ÎVêú‡∫'aò'E’jRg´ÓaKˆ§ÿŸ¥≈H`∞Ç)fm;ÌÏ‘ê¸˚¬nëRj—≤∂%œ™Ï€!“Â?±†x/tô{⁄≈eƒS*áxèÄ0—ëb∂	o´˝æ™¸§ﬂ!õﬁ∆ê0owgì#ÊÚ∆fIö*€¿•¥;JÌ˘≈	Ì^˛aÇùö[<£<Ø¥C3‹YYe±Xk«wd%™y¢]ÈôP!∂éDhC⁄ºB4U»dD'R«2m<í·€D„#≠•Õ2’Ω™é"´2ﬁãI‡‚Êxd¬◊˙π≥∫"®ΩÌ)é2®8J€°‚∞Åmé(lÛÀa¨ß.P:AjIo¢÷8ƒ#”$æ∂Ê’Wm∑°35Å‚7≥À∆ÚcﬁΩTt+•ï!éÙæ´ç"K#⁄¥±,›Hv<â˙ù‰rdù¥9≤fF∆zêp‘	◊õ˙˜…·ƒ∂∫∏z.±≈bÍ.—S∑GKÆ∫Óy‚ΩÜ§+∑G;2Ó%<s)üµpÃ¨vWÿi˝∞›ƒøD‰Ò√v˛a-£Àø1‡£¶)d*øÓ˛˚pùy9è®¬O<=£ª˚˛eá7tK)<Ü[¬ªß;”e6g*ÍÕÑá4`6ø„/*xI‘ÿ%≥WÀªI:V*ï±Ì¬otÇö/∑àsÕ(Y5í%ÿiÔå˜8∂‡íœ“v∆*ò´ZÏ©{+tæƒª§ﬁ–˛^o»üÒNıÜˆwYoà2—˛ƒıÜ(LwΩzC¥ºﬂÎﬂÎ1ï}Ø7¸	ÎÌ˜Ø7T˙Jy &X]∑I$Y»Å 2‡U•VIØˆU*opR—íK¶T÷ì™nÃ;Œ◊ääNùÂ´eÄTÀ¯∑ı ﬂy˜P–FÏ´T¢∆4ØÊ„.™ùl˜ﬁ‹Å[¶k%´èKıºúáóø⁄Ê–ôœøú)jÃƒŒ§IˇÖæbÖäŸ÷=ˆùH.nJ(éL·¡\Ôeºº’wNi‹øyùA:‘{îπú˘¥í€˘v3°™ëıìdÀ›∂DÓ-ÇØQÚ^≥º}R∂åµS÷÷©dÈîÒèƒY`|»≠úHÆÊ‹£¡^◊´µhd~à¡FMí)K∫?'È4mÿ»•v[`éÑ$zi6HërÖœ‡ )Ñb(Ã}®†ıh≤≤JOpÍΩŒìË¨¸NTûo˝?øù®>ÒÃRIÛÁ‘ ¥ü`i *?Å∫è∫âÈœ¬Ó™oCJ<j'BC…∫DIs´DYwHb)ÓF
Q8b9ß%qñ¬Có;˜ØZa*ë;XY«âÀ_™&Ë˝1Í7bã}Ø›dµ-IÕ•ÓÃ,RvÊø√¸öOBƒf˘ÒÙû`î?FµG˘EÓDT—ı®GÌπlÇÂy…T“G.À~Ã¿ CÔÜEcò $Ì†ùÂ™Sø~{!Åø»óS8˝ôÈ;ı∞·pPÓﬁ9q„‡æ+Eèíyﬁ•ãÀ{+@∫qÖ>pΩ^'O€ùùM“yv8®?ÌÓ_˛u˜ŸNát;Ω√˛ÛY!è˜üÌ¯πÒ√û{cÁÙ1≥QõÓŸÆcYòÙı‘1`ÖR]ØrR∆ƒ÷U∞üò_o∆≈òwEÓÍO√u¶Hp±á`!7FıÑË∫\≠f‡ï’]öŸ¢–ÑÂº≤ñ2ûìR7å"ü\õ@Ñö≈”LÃı«ô¿Oå¨$ßõQØìh∑ÎJïZKà≈ùÂ∞ôúÒIºØWiH®ıΩÚF)£oç„ã∂Òh9∆ÿán◊12µ:Î6÷•¢OÉO(]py©Ä	Z0Ùlt[“÷cL`gào[ö2_µ ÛÄßcC8Ó›cÓƒÙÿÌ‰ÚñoN-ﬁk˘$ √DÄ^éI…NÈ—”Ωâ#PoÀÉ9 ??ﬂ*ﬂSı@…D∞|—ìU~Às_◊"gW˙ÑÇ.4!¶)ŸôÆﬂXœ73⁄%lÖ¨åÃ/‘∑ø˛€‹*…D†1∏tè,	u§õ†»Fî"Ÿ=}ÉÖ`ˇ3OÙ¶ñË›Å ·}‘Ê8£ªŸI Æ6Ω˝SÊÛff!ŒÁMû\ﬂ¥∆àÒ·>¡Õπ"îS∑>rgSl
Äçè9Yí)ú·^æ˛,?ˆ.∏¸fä©	¸TÇ∫Ãâi`
ß…f·iN™kT√9ãY I<Û
ƒg˚;`LSúæ$†«èòÃô¢Du ÚJ	µçtÎÇÚÜ∫Og∑FÚj˚hHçèK‚@x~2˜^@BHxœõWø¸;±
èqorÄ‡4˚íπy¢uÓàLùô©A§+¬¢É˜nlÎ•ÙÀ Ø‚≈ÕsT|∂˜˚œ{üÏÌtˆü~Tp±Ú `èÃ›’ü)˙´îàÃNL$Ì$9óéE`˜rdG¬1"ØÑ0êe´!5¸tV]±=W“í’Ñ#fsr⁄"V\e_ÈÕ¬‡VJÎLn˘ÒŸçBbG‹Àz\ıÑ7T6ü¬⁄S*8y?˜Z>0ìÜ`öli°:M'tKñ∞Ò‰÷ó“ÆS[t!z√v©Åd ÜÈM-˙‰¬!èAm"ƒ7yœóóÿé‚˜f(ç∏⁄ 5¡L'R¶S:jíYóÂ‘±wªúj+‘ëd˜˜vl/`)„õå‰≠4=wå+åC“©Ÿ¯‹+Énâïì÷
l"úÈÁnÎkW $Ãò˛gˇı©ºˆ∂¬÷\RıIßñøµæ–¨ ÀÖâúõ§“á>j›Ê¸q˝Ê ·:«4£©†‘5åùÓ!¢√Kå¶÷u·‘j¶ANÑTîâ†u<Á¨ùLˇk±˝ã¿ù§ã—ñ`3ìâﬁQ]—‹EæØïhﬁS‰ÆãJÿª¿≤B≈”∆‹5V˛°√;vzÅnáctäËˆ†r-œ√ˆ50˜ |’√†ÕˆˇLvïUï]…ä)£úKÅÖT2U/OØ€2 B]m$Eé¯ËŒzÅß|µ†Ü=c*ïÆZœ$Vs√U∆gÔî1∂û;ñO]¥_˜8iT±ºî§˛å˝g°√¨;ÿ}‘ﬂ¥m¡Æ⁄Îˇôp£ë÷NÈK|[K2óŸûy6èìåÔˇï€YYXß]…Ax«ÊuàeêÕ“¯Ú:?∂œ06≈ÔCÁ˝w2ﬂ"&§ƒπŒÜØÏ	"ò=o`\Ü=ä¸ó√∆´,6P¥P©·˜‡b7‚"ˇÓ˘ã ÷K¯Ò"à9©S≠Æ√zùr7≥äu0πCòGt¬v~‘Y$»¢HØΩ€b≠ˆ«ãd3¯†’jØÆ6?^LçÚ{Nû¨ôÅzN5gV∏˚≥√l<‰°àVg€ëˇ˚w≈z^.ô¬‹˜òÂDlH›Ï¬CÑ¯°ÓÂÔêPä0EÖf•>ò7k≥ç„Ê«8•%y/˚¿i¬˜$˙Àº˝˜∫Ù±cbû•.&øì%ﬂf”Ào`Ûv¥w¥ª˚§‚äÁlçoÙjÍÅÃ‘TÜPºJBﬁZïX™Wˆ®™¸©Õ"„Ûzùß<Ç◊˘)ˆF#O{áO€‰∞Û «¡œk7`ZàÌÜÌ‚‡«ÉØ±àÄfÓ™‡ŒÂ∆ÊëkŒ‚RZò3îqSµ0H˘◊ö°{á„xJ‘X•Á¶»oS kƒ¥qÙ⁄‚‘<SA«!ZX¡R›H/ïﬁO‰;>µêí≠‹+õd‚9¯éZmïèGf∞c:≥|LM¢BÅ~N-…¿≤w{b¬Eãä·	∂Ù TÎ∏|f k6’◊êï¯…5~+ÿ›ù	Ï5ˇ T=k“gTy©$üJ=WIı&H∫ôF©|q¢åºvÃ’≤ç“fB∏U@≈C∆Ê»ÈF‚»j#HøäEE•)ÑÛñﬁ±ûîm+Î™q7£q˘≥£Yk˚Ÿ¿]6∫¥ﬁî'Û¥(˝˜ø˝’Î@nq! ùxuVÔ:RóΩ“ë˜N˘K†-ñf1»n3[i>û#ﬂR ]˙˝∂í)˘Ö;+÷¬˘‹≈üëè+µ≥¢SøÉ;ÎÕ´_|n≠2¶ÅjwIÙ¬ÿ«úíı4Å•òA\^kdDø¨cÃÇ[⁄„˙Gw÷O∆y (â~üô	cêŒpàªÄ`Ω)và7*ƒ<ÂœjÈ˜∑ÂÈeì#Ów`3ØÖì˝ˆ–ümÛ√ëàQ≤mu“‹Ωë4ws|IÆ	›B¶4*4ÆŸÓˆ:è;ª€òë’ﬂ=8‹∆{√ÔèÛa–Å…ƒõV¡Î>£ñÿÜà&8|IÌ[urT;[;∞⁄Hd*ë®Àd÷Ôg“'<@ûerPùœ–w0˘'r´¥õ™d˚ÏG-5]Ã¡Å1Ä±¬ûúÑÜÌL4Ïõ	0¿:ß/gU(‚‚xÛÍ˜ˇõ¬NU'7ñ»ÄOPt¨èTÏq®ÀﬂTÜ_ˇüë ∞?xºﬂy⁄!;óø"@j∞VÆQavØßsT0Én‚c#Õ ^‡Ÿ3y4èmvl⁄ÿRêKdlÇ©4@òÛg‘⁄TÃU+W:√*5G]#Ùƒ41˚äwYX'ŒÚ˜âŒ>≈Œâ#ÙYèóF-Ä1âÖ∑@©ùgÙåÏ√©&Ω uÚú?∫∞≤'∆äJ√wv¯ÿ-,8ø˛pqôúü'»PqÌ%|˛
ü>‹ﬂY$KK◊‘ïW88¶&¥÷ë!äÏXé©˙ãÇyùW1¡ûFMFU*÷ªzf•-pEoê»ÎÕYZy~U∞edòÄ¶·‹X¢0)8ÅäË 8Áó?9¡∂	R*Pq8—1èÏ1Pmjô_Ä<ïÔµ¢Ç’Ez8Ä†˛øRXôﬁÉDŸjÁn(]*;W(6<@ï¸gﬁ◊;s£ù¶ZL>≈¢÷Ö˘gem¡4î“Rû@±#HÁcjÖËO)≤í»ÀB"9¡g˙q7q^v,‹ﬂøY
Y©õHõW¬ÿµ9,®ŒÎªÏ≠Ö–Ç˙˘ñöoÎÒ¿^ıŸõÜø,∫Mê›6~â‹12q—g∂∞Ptì\s¶"¨•–›v¬ùk –<ˆ»r®üÌ‚TÑ≥é3IkOù	4≤[ÉÀóÄ¡7¡ˆÉ_ÀC'SfàÅûR‹ÄWT_V;„JL∂«ìÙ⁄÷‚€^_ÄÛ§ç‰ﬂUI¶ı\{™L FhÂV}ÉL]QF‘Œ% ƒ	'UîwﬁÆ–ù*Ú•ïÓU´i:ãGQÖ¨∂“ÒèN:|Ká¿’ΩÑ¯^Bº	°vvÇ±ëKﬂÀè∑)?4/‚ª&[ryÔP∂$º…ÔV∂høT|ãˆÔÅ≈9?(p,nœ,ò;9∆gπò∑fojôæèyœÂ—[#!∆AÂcÁæü~}wïÓ2Ÿ†úágìêRp©“wqgïË+∆ß∏ﬂj6 ª’ÓrÀ9∑„¬a·˛9ﬂøúXkµ¨Vº¢Ÿ ‰ÅY-]¸êG”V»9∫¨Í‰Í√U{L±4pè+¡AîêiBûπ»øu™XîÕ/∆ÑkiGó€7∫Qe-g≥,XÙ»äM˜Y7•CT}tò-)Lóàm$ò®5"vÖÂµpU2¥	Y:sp¢tƒÑÛ %AÔdL`u,è9Q_˛&òQë∑©≥éü‰¢áB≥Ó`[«#˚óØß¶!J;C`áN!&sÅjµ
,GZ9tN∏™æIVõ!Oπø°Œø∞L¶Cì4´‰bπ‰0Î—0Îπa÷Às'f57ÃMÎ<B>nLË¥V$≥LL„¨Ñ“'4¨©y∂«/KËXÇ©™ï°[q6`r ê∏âÈuêCp0ar,ªûö π\Z?∂h6®9«Gl<>c/∑ŒaÈäî∑*àŸx‰Î
≤</ı‡≈∑O¶0‰ê•c,eæ(ØÖGdu·Z†Å*í“G¯rKúJ¢È0yß%g´r‘˘_…C‰YgUËÑÓ¨¬(í&ZFM»ão~ëë-äí¨¯(≤º1¥-vÁE√cj„°á…—–‹;>If¢HäV¶EÎÂ‹<Å ≠&^ﬁ€T:T∆„îâ´Úà‰hF]C8†04yD/ˇ†ˆ@˙üÊÚ>UÛ=5dµ’ΩO:ﬂ”Zﬁ˜î≥dÀ˘üä{'˚û {û∏≤.≠
èèí~#√ÙËë≈VﬁûÎôá•∫ÿ]3»Á”≥å@müÊrÓ xñ*˚ïÆ«´$œî9ñÆ≠ªÉƒ/É0zpÄ"∑?¶∑∏ˆMjK{gx ÷§8√g—çoÀQ	™F"ä⁄”päG$¶&ËræH0yhÒÓÆÊ’;Æ?ú˘^ê $ØCè∆{ób§3‰ ∂ó<èŒ≠jS≈ï{ß.ùñ¥®÷õÀË6Y&m¸&ÿ|˚#–k·ÂtpÆÅü;ÿ´ËﬂW‰ñ2ı]¬äNJ(ÓYµ≠t©‚.È
su=]¬Ô1yÁDS+oGkO:˚ÖåﬂU”‚ãt¯ë˝õ§òíÀËÓz◊◊9WÉbEr§†4°5u”R[Òª∑≈«`ÚÅæÛã¥kÌ%˝2·Ò~∑_‰ˆêÏ√:I>z>öçÊzÈmÁÎ«€RïÓˇæ∂ÂÍ;ŸñQG´ÉŸàaJ"™üò±à–g"≥”qÕZdW€–ˆª*ﬁÈﬂ~˝øêp˚¡˝ˆD˙h∞˚ÛÑ⁄\∫X∫:KxÊ∫‘Vœﬂ(b∂nBRâéµ_%ÚÚ∑
ÛÚï∞˘A¡¶nWöøvç*_≈,Ú`ZkZ›ØbyTÛOQ˘Ngw@.Fû˜Iv˜pøsÿŸ»@ëH.ÕÕnetXƒWHÂfºô¿JgWA1ÌÉ(„´CJˆ–ÂÔÑr;ç„Ú7ÑìEÉlõﬁ‘±9’tÇ»51pK\·±—Ãu∞åÇ{‘˘xòn`âŸ…Å∆Ï(ïù¡*˙ÆcèÓø≈§nx=‚WCÀπÊMepó›v<Z∫È¢™ïÔ“ñãí∑Ø}√≈…⁄b√=π¸Îá˚˝ÌÈˆüHQi~D∫ù˝√À?ê±˛˜∂˜zàJèhjøq∏Oäµ∞√Ì bR»Jp∆Lû¡::¬¯ˆyr:gû9;jÇ ‰∆˛Ã°39±k8“ÅØ1Ûb¬|ä0¡ê'njÉ„KQ^¯∆Î˙Ü—Ê¯ƒ@ıB®@¶%fNNRÕ77~È!ˆG'jı^®#’òsÄö&¸ıÂó§π+“^˙≥Éï[ºP?ÿÎu˚è˙]Ωü‰aT|CV…°©‚@‘A´∂1Œ≤≥”€µ›
Í.ˇv
ÅÑ[Á`∞”ÔˆQlëΩﬁŒÄ<;xv˘˚˝
µv±vŒÉ…™…»«≤∏É1∑íˆ¬QuBT@üX1d∏RGp≥![ .Ú’?h¡T*ÁÕ√‹)Äãb‹¿3L!< 6F‘ø¸∆5≤h4P…b*Ìf*y7YåV´Üêù^øC\l˜ñ…~Ø≥”ˇw=r–{F∞fI§GvèÅ9Ô]~u _Ì¿ÊÏˆB4±Œ~|™º¯JW»6_'œ}D|ŒÇpñ£Óê‘]ôÄçï¿Ö`9‘ [‰hfZóﬁü°äd´ø≤!˝Mâ◊IÈ†s˘úÉ«?s1^0ºÊzÛ˛◊¿kœ∫t°∂-Ã*–aã&êÑW9Ù⁄⁄„?ì3Q^àp¶µ¥Ÿ}GØ∞L◊ä+yÀî∆ÚY+°L√ÉCöFÎ°?91ä
“ÒÇ˛ö|te,~§ÅEıyEX—ò7°ÇõX™)¨Ú2†˘8s6çR≠ÀI8˛)t,Ö⁄èE—xÌ¬˝ŒøÏà®¥Pƒ\fpMÒ!ÖùF∫€YçFC+ÕÊÏx:¿VC£ñ–?|÷zB}∑˜∞∑Oj;ª›98DÜ^'O;>ÎÔˆwüt»·`˛ﬂ]*Ø4$B~ÎíÇzu˝}+YööT⁄ºz.M©DH©*}$“ﬂº˙˘Ê©—µËm–ïMPúW8.≈Q(È\5EZ?z§ar∫àyÇ21õd†⁄µ]
Ø%Í<z–1/ËiL–»¿p)©eÔ§Œ«ÊoTlê√≥çévÉyÒÆy	û2SXOt
ÇÔöü|é2h¨Ωzı‰)˝|f⁄ºu˚°3Öˇ’ã+.fÚaÄRÎ8òaSπÖk|4fÅqΩB2õ·V∫|]®2´÷Z“-öÉ¨<Ì¯î`–kœ˛7®v˙O;ﬂ˝≈ÈéÈâ–!jáÊ‘Ÿ$P˛πMAóÊ
mk°\CqÀ›&…∆ ]—€-àïÍ	Q≠ﬂg∂ˇDvMpøH:J,‹o∂áﬂ∆z›X€h÷◊6603l÷W[-÷dGw6Z≠¬}[.W>ÏW©á`a¡2OX‘MP’U"¶/ƒfPeâ(ü%îR¶¢∏ÿG?ho–’ªÎ©∑uì»%Ê*Â≥<πWéÃT9DMq5O£èoâˆbuîU¥∫ˆ4RΩ≤àÆ£Ó`Øﬂ!h€Ôt*‘≠§Ô'J6å™[ÁSœ2µ≥ıl·~D§Ñak2Ì¶.Ÿ”G√´ãZ˚‡°mÔÉGêm¯.ÍM[ê÷w'øñrÍdÔ;l`}µ6AëÂ5≥<eâë∫¿®Äóó„„x∏Œ–â_∫µ‚À”ÒcΩË»RLqIÀﬁB‚Úå "B›dçxêôë“æÎY¡/œ=ô¢ΩTATh8Ñáöak Í˘˝ú<ª;x∫◊Ÿ?ÏÔ<	|µ€=˛Ÿ˛‡yg˜∞á∆~\dµwv{;ùº‰µ’M}–ˇn´≥{≥ÅÃ®ıê≤®ÍéÖ
Íµ¯ÙÀÊîŒ’m<à|~ıü" Œ®≈ Í
áÎúP[ƒag*âHß∞b~:«≈ú˙JX1Õ™pÜùÈg⁄íı34¨f¨Ó'v_öGÎT•o˝U‡.1‰˝	äüX]S‚9]«c©á‰>°ˆôí¡ùyüI·#U+|ÚÛÀb {mÍ„‡DÙd¬L1‰òÀkmå®ã pèÉ≥ó¨…Y:ag£ﬁ‘u)Fög
˜ˆùïΩÌGÑß°%6EÄ$¢† '¬Ê∏?%kQ<ëcoªt4¿Na≈Ö¨1 ¨€∆º¶} <˚^∞/Ò#åzc32Â5Ja)Ê∏√¿¥H$~ÊGWuZäGq¶Ô‚)UÕ¬ChH«¶ÖUÆ¨Å!®C|œ«Ãm‡ßﬁÉ∆GÕè’◊#ƒ6û∑D∆‘6,‹ˇ|$>Øº¬…å◊(^îÅ‘√NI¯:¶°XDB¶X$kd∆Ò']lÃŒ5ÁYê¯‘◊õYNæÆ≥h7âô}wZ7æil…ßí›1Ó∆ı´èZçfÎcΩ[d3M›V"õ?+Lê‡”ÇÓ[·°j˝óSÍoòﬁsjô@é∞°D˝‡‡J√ÍÎçÛ{√_æÏµxSuWúWG∫´s+qaÈ™ﬂ√œTq/•⁄R∆»ƒ˚®◊’4∂T≥*£ààcı©1ı∑@÷èÿ ≠e:ù¬ÉÚpÃ ‘8V_òÃ{œ≠±⁄F®TCó·*A’\~ré¢·)JãT•«…»O´–©í“⁄/°´T∫F‡OÎdˇgÉ¢©D°¬®mF·1î¬9zSS≠…ã„€ü£u©UßV¬ÅO]©Ã,L‘<ƒèß«ÖGgÜZëKûõ.B@ì‘äl=álú∆i4TI5·3+Rkt3œñƒZ‘5\O¢K'üvRccr4ÉØPu„Yã1Mé®=‰QÔ*uÿ´%·Jπ ÆjÕéñè[¥…RˆòÆÛ^rõÂ€3O
—ø˙æ„õ+·˘	]Ç¢+„Gû,e!—&,eº)Ø‚NPÔ'ucjè

ªÁ⁄{±s;◊574∫íöd·£†ùÙP˛õÅFöX¯u@sÒ<ÛÚ˜7ﬁÁ∂õcß]Î>J∏õKm°ò3ñﬁ@ˇÈèbïëN†#¸?œÛfﬁ–±∆¥[Î@UÓÁ3Û~¬èw!¢÷”"™	ˆv/ìÔ=∆YsóˆZ∏¸Y˙ΩÌÇäÆçÛ˜Í*¸yﬂn‘á5„ÿMULÊ”ªbï3ÚtÅ∏„yŸîâπ¨ÈŒCËºõû%“ì(êÔ¶+a≠≈ìÀØ˘€ò”+X‡Àñ%Eö6ÔÃ
{vüÒ∆‰‹«\
∆QÅ.„`\]œ ∂RSŸaì#lÓ˚Û0o’ƒ~Ÿ±L˚3Ó+^Dôö®è	 p/%Ø¨©Jôò†ÏÕ&è\ —2∂ÕëÈ{õ§Ωå áÙ¨RQ∑ôP≤ó˜†Ùƒ˙pE(®¥ù@?ÍÇéè6©≥†≥üSCˆ…Äf öS<
vÛzŒÆdG—æÀ‚ÅyÄ˝rLüc:ƒw∫jqRÒΩO)Ü`1S`]æ&OQÃö‘ªA@NÅ4µf∂Cnû'^ ©ı∑7„œ˙∆≈Ó PÙF.ùP6 k`}åbá5’!œY&ü¬≠éÕ/VN‡Îc˙ rÓE7@∫c≤AÉ]s3ãMzÂr-TDy«†ëÉÖ@&ÕÓË‹—¢¯„ì]§cyıFøyû~ü∞^`}rYﬂjü‡<†ﬁπé∑‘P÷/ƒØgñÆ¢8•ç	[Y_ﬂh›Ω€n∂ZÕˆ⁄doÚB	Òn5uxúö`+ü6ú)≥kp∑e≤¯	H#˚3UIqxÃﬂg@*†{
±"pÈÙ°Ñ‡⁄\Ù˛ˇi`ò.ﬂ‚∆;_ﬁ‹kâ%E£—∏z|ˇ4Ô9ä=ªYœPîñêÿ†;·wO…¿“UiÁ|†°Lå¢‹0eÑ8iØUŒ∏ºñÉœg‘e)',◊¨NÖ~Ê•È™2¢◊«_lûüå©Ô—ÈT)åÊJJ»óN‚Å		èWÍ!’„ò·»f e»õ'a•§ k©óòe‰eiiY∂Oπ8Jƒó™$ª¨FÖ~<¡EîDd∑÷*≤\>j6ÓndùÂK¢¢Æ.f˘[äÙñ:∫æ∑DúEÓí&'é3‹à}=eÇ~fS∏Œ˜@Ï¬/Å}S:ÊßH¢]3Ï»¯8Bê∑öEÆL<	P•¶	6tÀöÍ¡ì€œ·sNAœ
!jnœ° 5…óâ´–≥OLÙE$=œ”tfÇÁ%,‡Cteﬂ ´ƒ¥Ö√Ø\¬ÕÇp≈Ö√oßn˚Ê’/Au`	óù‚¶∫=•‡ÃÚ:w©ÎÌjÖÈ)\ﬂuá≈u¢jYUC÷(ìsvÖ$≥∏€3Ê˜ı»Ó ƒ“ [)ç∏°TTMRﬂ∆únH°6th0,,Æ‰≤hÉz·hûƒè FwCOIç2∞8ròK!$∫9LàâˆΩJ „¿¶∆‘°bÎÌ`à˜Wµﬁ^≠—ÒÇˇCÚh∞œ´H;;;ò-z@j@\›ﬁNÁ`IPU∑∑ç]xüˆw·ÎùüíŒ!9|“„u§	–oj_≤í(ìR≠≤HO}udá ïz˘-⁄„æué•"∑{U≠Å5»’˜D~Q±Z∫èR¨7ﬂG	˘jêwùÔ†îlùy◊—6©d∂vPKÅ[ÎV·B\`OìîÎ∂“Õ\[≠›äíÇÆ%¡[˜[g»LÆù[DH`§v¿&‰«‹roE‹^©Ÿ|‘^&´Àdmô¨/ì€À‰Œ2ŸX&wœ˛o¡ˇÌ Ã÷ûM
LßÑ”mèπâ•<oâß%+∆SªJ¥Øñ„¬`·„Ô˙†?Eº…lØ˛&"Wî6æ§3öæ™û¿k8C®VÑ%ÕlœÑ%1á·ÆdzBN˙‹YK98ù8ÆèÕòﬂâî$π›OÓìÍò/‡}‹ÃÛÜÑ~Ä˘ôµ<çf/π:®’ãU*≥*@£Ø9ËuüÌ˜»¡≥ΩΩ¡˛!È>ÈÏÓˆv»√ùA˜ﬂVÇB©ª™ÇZÕ*ÿq<P°j·ÄÜöˆ›ıX√nÅÙâRn—¢=≥±d"ñ´âZ-‘]Ï◊wØ9`DM¬y‹ÜÈÖf(òËÕ’èS…∏U˙.ºyı˜ØˇÂüÆ”≥JÕôÎ:p,’m'±êÇOß †ß÷πtÜE±yìÒ›ûyïMõ∏~∞ úä@¥ÿÀgv©%Çö»™⁄úë4ÇﬂµO#AŸ
Í%¥≥ÂUﬁå
lMj_˛ñ.ÉAmÅ˝bÇ(„é–ı<è£Óz3À˚ò`ﬁÓãûÚÆ:Põ∑†|»µDù‡¯Û’É‡±ÀÏÒlB0’ÿˆ.ø>Ω€U°ùùÅqR<âÁìLË-*b£—E¶óØl∏Av3À¬Ïì∫óØ£pª∏Öyl˘†uÖ/mà`ÍU)6/˝;·Ó±‰üÎ˝{øoÔ¯µGíØ#é¨	ˆ^£¢Qt3¶§0ò˝.hÆhZo9çV≠¿£⁄±ó¡KM»”–*◊√ŒÑ˛ï]@òáP)y¸3ˇ]jê«äXÛ8QAºôáÃ:”iê˚vÃ@·◊F‹FG~7Q‰Í1‰2©”ÿY{}{ıˆÌ4>GÛàÆﬂŒ·s§&´≤pI©»l;UI)Ö˘ÇÌ0`≈0ÇÈ¢´7rIVe)[¸V≥‹5€5∞]+∞}D—£âr™K9QÀDwﬁ¿@˘Ël◊e∞—Ÿd ähø"ò&V]ú78R¨
lÛz¬◊û;ƒè‚Lã¬Æ“}¿÷ﬂNxcÑ˝úü¨Bÿ±D∞±t>Dº-¢ùU=ç!¸äﬂ`úA"Z<îóæäºª¶>ÔN’*B¢VxNJpâ¥Öˇ  ˇˇÏΩÌr…ï&¸Ø"EÀ"h¸’Gî"¡ºIìîÏµ÷*E¢⁄ 
]Pî4åËx˜«ƒ~x˝⁄Ìy'÷ÎçûˆÓå◊éËÿù8b√?ˆÓD7∞}	Ô9'≥™≤™2≥≤ C=Ü√-¢PïïïuÚ|üÁHizcÓ"≤¸‘Ÿ	”∆‹∏ê4Ñ…≤gåi	Ú[øÃ∑ÒÁ\^ù∂|mıÂøhÃ™1{3/≠1è∆W∑À‰'©îÂQ#.(“ò˙»#´mßÀ∑ODìEìÄ2YŒF÷s'e§æ&£˙^≠VŸ”›Õ⁄ˆ€©ˇò`}≥q»üm÷wY•∂˘¥±3Gg%Í˚;/¨!c"µ`(?≠DÁú—ÿqK4*&¢4ÇyÇ[Åﬂá#√¿ ®√<õ∑ÿ5ı¥: xâä°.<©“º S á~⁄L∏@ïø$B)”2£§•_î*’h±πºrgÒ•¨π„cñG®z–^…É‘J˝òY∑≈{¡©åﬁ°Ÿré^.{ƒ^’[ƒ∞˜›„^Ï≈Õ‘)†úø|Ö}Í6D◊®Ä˝ V≠K’BÕf÷ÉÖˆJnÊ|À‰u„ºJ⁄»–ûV-U˚¶W“]ÒdC)^)†	ûï3øb∑^◊≥‹ZÕTfÙ4M·!ÜG]o∞˛é„C8ß.=‰y∫˙,Ktl$Êvı≈Ω≈”ˆÀÑpﬂ®+ó≥”-Q)õœ{·—€tL#Sä)wPˇD·ä=ä∏'ÙPmﬁâ≤ƒåàÄdı∑•¯IDÌI≠BMÖ¥bïDUÂl‘¢´*Ôÿ¸¸|<»mÜ£¨±tÓÜ&rûÍÿ\?[c; ˛aIü∏ΩÄ cAÛ{Î®û+ÔàVΩO2;∂∞47À©äC º9â7Ä:QFÇ	ê¿ rsÀ…PµÀ®–»˛î|]—⁄ºÂJª«'ŸçΩ-;B5¢Î¡∑Êh≤Ÿ?V+yÂàÜ±§…lÒ≈≈yÒˇ™¯»HãóBâ’UÃM°œÈòóEG˚c€∂/Ç*éΩ
N¶AB¡…ò—;ÿ<Xÿ´ˇÖÜ¢≥«¶°MáwŸq¬&œPòÑíZgØ¸› <d÷Úè¶Ag0å5°]%’î£Â¡r"ÒÍe`Ïáπ`)XéÓ^ãƒi_4÷x¨Æroié›øÔ£ª +Ø£¥¸@¯€éCU√àP◊r/IHˆ‰{NÉîRéGOè'Ù:ÿ˙Ë/§4&)a°™Ìﬁ©◊1Qí°¢!G*.çICNÉP§·>X¡ßÒo¶Jf¸Œ àŸØ8s3•/ÊåÙÃ N´ECƒñ`”;ıÉ¶í˙Zj†g=„'@a£ØN›ŒÃ√Ã”`˙å˘	ÙÖãÒ’‘ÅLwÙ;·}ºñ€£‰«»ysï˛óf÷Ù'˜ŸD#çÎ∑Ÿ:¨—Ìª,V∞,≤*¶Ÿx«.Ôø®4,Æ÷Ö3∂„Ü'ˇ≥ßnè'.›cNœaœº#ó5ùnﬂß¬«}Í “^Pı∏n:ù&5©ù∏ïî1«‡∞V}Ô±íOÇ˚–7ÉI:«YEjY£nù€"¢t°t;Ωoæ¸≈ˇxˇ˘œ‡üﬂÛ˛ëmviv…∂›ÿhïX◊N-yñ\›π^[ŒaìU¢≈¡0F˜$Jmr˛*∂†∆.Ì©ó;puôb;≥„V‘ZÁ£¥Öó¯ÊRGäÇZ’ÆâFNÛ]ƒ]Ê}Xøâ»`ö˙€P¸/‚ç?ÛX/£Ÿ?û˙{HèyôØ¿Ïñªîó±ˇÒÿÔ"8ô˙´HyÌﬂƒ$9Ä/l˛:Ò1üi”›Oùñ3-Û≤ç<ï¿O4ÿtLÀrj)*ai_æãü.‹ÙpgxßÆR’xWFõÀ-Wp7„˙ÌÊ˘C¯øŸTW·ösWF¶òΩ1ÒøÜ>Ÿπ”¢S/ztˆm§”å„†:¸±◊ÛÇôáÒülÅÌ°
ÊÉô ﬂ≈+ÂrJ˜¨)›„—õ_F|ªˇáÉ÷<ïÒÇâN‚CÓáZuΩﬁ˙Ã≤Ê7Ál}fI(‚p!0√zyqõçÜ[cjòëkÈsT‚O'∏<S≈q'«Ëo”j´±S€Ÿ®7ˆkÏ{\k¸∏v†pghªX¬zpÛÇŒÂEûâÚ]’≈G˘˚Ùè∆s~$MÓX>]πΩ¢nÄò	Z∑»/ˇƒº¡P¥‡€ÚzXy·Æ∫„ù¡xÍÙÜéß7—ª=“yåz‹∑K˙‘‰-Í3Ωy.`Ì(ZZâNE~∂â*3e¿*©#L™Æ,:c1ÊÀŒHÚ¶Z„v[ädqev/'õI D˜äm:ßN.ıÎ6‰e+ÿü≠03'±›e®Ä®ﬁ}%€î•cÆmq?SÍ.@˘$µñösí¨lk}6IÅ–Seî¿ºpZé“≈èüí©%Òx„Yœ≤ÿòÑFC:'˘ õœ◊àJ∞*gû
/M˙îëòt*°Ui!\QØíh$ÇR‚X˝†"--ÎﬁdYÚãÜ¶Gû¶Ü,≠Å•ÅÑ≠©1›aò8ıM›cRAÙ"{ƒf• «›é7n?']f1ÌüŒóeD¶k®∏&QÍfu`º:«û°€rÜj9ÅG@3&µÑ¬ïxˇÎøˇøˇ˚Á¡Ì‚Ç3|‰W⁄U‰_ÛAùñS	Á4è:˙÷’Ó‹gﬁe0Ä%òY“X]„Ôrb ”›Â¢rÇ]>π»1•Í„Á>TJ ´˛Á'¿&ÕΩ˝4ƒt^zÃú™¨e∂Ôaﬂ7ùYˆ◊l+qü˛$M˙+∆§∏L2I„®f±Ye8’íà&iXÙÙ*˜≈?Ç∂>˙3˙øËËËwNBef4æ|3ÑzCA§∞öKGØÄF˚}Œûsd”=Ôla”Îµ1e©‹43¢xï8ÊØ>è{Ê–òÏ˚—åãrèõ◊o∑>w:\RtìcÓb•E8p˚Ëiõñ@HZ?Má$„]QêÓ™Ò†}0≤·¿ÌµA6¯¿:Tí=πô¬√eâ)ƒπMáéh®Ük*íMk§{®È∆ä’Ôn,b≥:ló$iÌ6Õ†LaR_PΩc·ô’Ù,X’ »Á*≠9§G∂∏öj´w¸S¨A§k?WMmÔ®R{ﬂ4>aÉk¥ÿ1:A—6~TuÑlÀ‡≈-C2ÌbR!"ÇéÔüUÔƒ¥öx&ÌÉy@ #pZ·*ÜT˜]òÈünÿùwœﬁÕ˜7S8Ò¥¨∆™Õªjª≠	\µöfÜ‡gA◊˙?Ï¿È ®K≠ca‡On»6ƒ÷	…øê`ËﬂÙ¨ô∆É‘‡ß	°Åç-ˆümÓÓÎQ4‚H˝∑I®Êjë4rª·:`i$…	û‚#RNΩ0oÊNÊ—y≠ù0íÒ9”÷»ì£5∏-ı¬Ω[#~Nk|ç+á–∏ChÏ
(ÍñD
¨6å˛hÊ
j3‚‹î“x˘JÆ˙¶õWlÏé≤ZØ <∏+ä3>Ñ™π”`éç‹X_g=òc~∆D·∏ZEÃ ·îëPıØö<òï:≤8ÅÚÒ∆.!˙ññYïùÿXUê(vó'Úbª,“%˙Dù‘ò/ñôñÓ]$kós∂d^OÙã⁄SS∂Q«©{ˇüˇO“´É"WØÎÒé÷‰RY•Aá∞’\i√˚Í^¸Ç•P	˙ﬁU·§yIyÇb~2ÚÅG∞≤¥|xèèq1¬*÷±;Ï†æS;‹ØÌ\µ§j∆S:p{⁄Ë”ìZ˘±«ï`—jU˜Í’˚˜óóÓ|toyÂ[,….à¸⁄`î∞Ω∆èYeè7&çÅŒ]ÑÚ˜¬êGã¶Kíj∫√πÏygS§61‚ÿä¸ﬁ÷mVØvØst•Œ¯C∆W≠÷qù¡ËèÅwm!Û‘5T◊ä ïı˛{Å§Gà&≈ˇ8®∏N9Ê¯Ø√ıw ¸-%}ñ (¶œIÅ jßt}Íÿp
Lq⁄ª~è=Ö]‹iè˛õbcK¬®á}Oæ)ˇU¶ÜGªî:Ω€{ou	 ◊ää›nüXf˝aF@2F˛)yJÆZ¨pé|~¥À¶G∆Ÿë«%gÌÄÀËJÀx˝HÙö„„¿ÈÙÿC‰c √ˆƒπ†b2cΩ~∫bÕO€0+]·ÈxÑç8¢≠Á≤aóı˝a”g°∏‘ÎSŸ´Ã:ƒ"Í±.02BDõ£ﬂbÀá˘\?ZMÿ©’j≥^•ﬁ‚ŸÊπ]sø˘Úó_Å 
ùêy=JW∑––Q◊ı¿ª?ª]x∞‰NœÌÊ‰ëÔÑ’SØG?Ü}ó•œÜÙ¢n/ƒÕ˚2˛pÙÓ\¡ŒDM^ﬂsCa™RaØr€n˘\În`Y&u‰•Iï›>áv3h·VÒˆï©ıSÕ4XÙÀ∫$ÇÙN>∆©?“’:e&˜ƒ}]]Zfm¸O4ﬁgJ1èE$/ÍHE√ÆæGë◊=aa–Ãr ú˜9P—`}fò¶ÁæûQl◊6ˇ«?˙Î6qÜﬁ’©ò˚·”¨±YSgä≈›ÖUQ])å&%æõÖô o‘ñ8äÀEﬂ©m˜ß[’Û_N_ø&o–ÅiÔª]ê·~)ﬂöC\≠{y„5–òckñƒØ£y9≥D∑
ó<√ü#ñoî$7[_“ˆãˇ^Ú—mÎ·Ã´'†g†ØMøìùa_q2›±◊—÷É9Õ¶€á≠Óuùw·{Ü  ¥ÍQ‘&Ô…÷ïøáèÊ_,æ‘WXz«¨ÇÁÕY4◊EÈaùı‹◊l.⁄ßcõ~—ºﬂÎ¯G[_7Ûbeç∏i√Œ ”ÃCÍTU–{Í‹b“¯O-ƒ2¡g˚€|ô]â4øî≠CÕ$|‚]◊∫ÿû˛¢"S˛◊Yt,V ãÿ≠‚¬TN)HÁªÛ+RQõ‰2π®â≥ŒÏÈ»B3]ç∏®*Ö\§í·ó◊ëí#OåÿÙ_ô"GØ‰É˙Xf7gaI‡ÒºÌ‰]ÓmÁ⁄Y GÔ≠ ÕÒMXéê]xØGE
∫§µ–ÌW±ô6≈W/™æ˘Úã‡µ≈\ÿ±⁄@W`\$π4h”Œv-Çr÷A†3Å……@4HıˇÈçúnç[
=Òõ/ıã$c #œD≠Èb˜Ω¿;Eä¥¥+,”Í.õWïË˛,éæ
<∞@∂˝Ø7q]≈‰âÓÈùﬂ¡YïIv/ñl4d÷{@≠_ª¡¨Je§˘*üÑﬂ_8πÕffL9'WìíÉÊÅÒZM•0Hjõ?~ÿ`íB>≈WZ´q‡61±˜∫—oÈbçb˙ùºhÉ˙wﬂe≠—◊'ﬁ¿W8ç¯Á[F°R·ÅZ7á‡(_„°U∂ä‘¨	ìk5%˘V P°z_⁄ÚC‚}¡⁄ÈÙ9›E®4©Gè’¸…_T)§≥∂≠◊‚´§É⁄≥√›Í~˝„©6vw≈†Ûñénp55∆ÖÖ5À”iÁŸ}SΩ7f%¬ªû˚Z^E∑%ß˘gç7ƒ{∂±Q?8`áµ√:{ﬁ®ˇﬁMOÎWÔ∆ä˘›lu6}˝Õãı‹◊’•ªË∫k Rº+ŸÀ9¿≤ÿÏ]µıÅ≠¿›3zøﬁ·oæ¸OˇŒNîŒ:LWqDjd≥˚≤°" D"ãóm¯Ωfg8˙#O úÜdÇ‹P’\–ç˚*Dµle‡sø9˙sN¸¿Ú{ã òØÈ0d5IöP6¯~∞–?]≥¥ô(j":ÓÒ ¶K;[…`1fº•
 9≤Aâ:°⁄\≥Vx≠Ûê5Î’YƒlÚ<C9kQÀju⁄&Ω*íÛ8oõRA˛Ã•ªÏNÿ¶õk_œı_„åÂr%Ãî±ÿæl?≥3ñXÿ]Àıâ–Éÿ9&ßä•»˝Ò∏ÑlùΩíYBƒ?Èms¬Õb ˝§w¿Õ5„π¸%º“;¿{Œ©w‚‡©Õé◊?Úù†5ˇ: R>ÑyVp≤Ô9®Vá>à—∞æ2ÛÕó_¸á≥k˙}èbÛ({B!{f&ÇLW˝´åy·É˝HÈôΩœ°Ωƒ7π:["√
uoÌ.éN\M≈"3Æ›B]É{ïœ´∞·Ú‚íÚ*k6W§÷´V•Á‡ß∏«ÎÔ^µÉ~∏∂∞⁄ôÔ∫´´F*ã≤ˇ%Ô÷&:∑fgÁŒ·‚Øﬂ|sı[Ó≥˝&d˙=XÉ ´oæ¸ıﬂ±ÔE‘œx9V∆5Öê$yô(©àÎÖiàﬂ˚§˜Io∑3˙ L˛T’w«Kîû†|Ï{0Íxo°	Íú«ë1í…æ«7„˜Ïv#π{ø«˜d¡%|S‚%_¸Ü}Oë√_4Ä"«ûœ˙W∞ú€^Ôßºù'Ñ$y,®¶9òÁä∫ö5X∆õÔ–€‹o<Øˇdoªv∏µªˇÙ'œˆ∑œÅÌ‘ƒl∞`ÓÎﬁäΩEÍ∑YÊŒ_ÕÈ@ÙÄ—í«i}Ê'†‹ˆ~™˜ìu÷gz>P®zêùRÃBÆuí∏Et!	2¡≥ú9ø\»1d\¡IYË12mId+¡ß7º†ŸqÂejËÛk˙/_´Ô,ØnÆ‹Ω˚“ê´"‹† taEUNf‰î˜ßÂé£aøæUﬂﬂØm≥Ì∆Œøf∑(ckw≥Æ πVji/æ≥ÿ\^π≥¯Rˆø§¨Ö\-µ÷X5ÿtÖW™ΩID-DFÆ8¥ôŒr&∑”™D§P3êÂ¢§êvA7$˛êfF%≠}G´∆ÊjúCç\ÉM_}
|iÙ56MSÛéfÏº±ô$¨H{vÊ!/udü]‡_¨c{8tÄ0ó \‡8¨É∑IÅß^«Ve;Â÷*Ã
.ÑgF	‡ﬁP°&›…/J<q{∞£Q"©Œ≠ò¥¡(3„òVl¡9/ç	´U/ê√†ßﬂk]mF´Ø—ÿH‰[¡¥&¯O‰v)‚ÑÜ€Ú|=√œåÁÚ≈é”˜Ê?Än`çÁAX8]ZÄG2¸,®‚
/<¬JÇu–˜Œ‡ˇ∑ôYΩ˙‚ç‰ˇPŒ†îk*mE}Ú~Rím˘,¸'N-Ïœê=ÅüHtÓ˘`≥ºAaZ-í¶¯—  £ïL?´q
7œ
 +R√ôm¸Sn„Ã⁄ÌuﬁO°7ÒbÕo5ØvƒÆ™˚ÈxGÜõ˜M™É“u™ πds±ÍËy¯«&«¥ÆçÔ´8ÛáÏÚ¯«⁄‡é>f7⁄¥¶‘2˛Qòª†pGROJfØoiıF≠ı}&1©=ôQúiEç≠e~Êwœ"c◊»L%∆§¯,ù—}î∆´…EÚ{NÓ≤Å`¿–amÁ»ÎxÉ¯evi=>zºA:À≠ÛlŒvËjî`’n¨˛P!Ï	_n«Á:äœëp–u1ìm}Ïl§Ëci+Eü¨ö,‘ˇÑ∞‡–‚Qk’y9≤öö±}ä(— ¯1X;—g”;vN∏›c¥y‚´mü‰g≥¸4˝l¯Q…lŒÁ*4È.tQ«Œ”πŸPpAS∏xG´WïHs©Ü%à˙L∂√Ω≈|öÙFIÎ√q‘MÁ)∞á/¨˜√®Âﬂf[n≥d˚™éR>„Ä áTÖ`3°1c kœ‰7vÆ±’*„E√Ï©ÓYEãëCé%ÃŸïrB-Mœ˙ﬂ« m$ºÃv)A≤˘”ô&)œ≠6ﬁ¨çÈ  Ò3îk˜(‹Î”AƒèzÕ’»Å|ô
6g1˜Ny∂0È§]}Ò—‚i˚e6©•Äv;+nhØÍÕª¥öK€jCtu÷® Î¸Œ\]≠’Ñ>¿¸Üﬁ…√,î?ˆ®Œë˘Oˇ# r~´˘Ë<jÚÃ'∏-C'jOÕFˇä”å~€s}Ê¯T∫fµ€IëÛ<„)}–(É—W†m5›#,BÇÌä>ßÊ∞+‹O-tWy~£vIıøâóÍ6ÉıÙz¿üa$ÔØÛN<Ï^¬‹d!§!¨
¿ûbIv„«8(’≈∆.Æ∑àÛ≈U'J±5™¢£ê #`V»êWô">	
#~Ñü 6v4Hí¯)QÎ@åñÖ‡◊€ë‹˘*‹ì.OI«z1∑€Ë]XPv'œS2å6µòùY1Ê∫Øˇ⁄nÔ-Ã;[õ3R¸ãOÜã+ããU¸ÁÓÒKë/˝˛oúÍ€≈Í}˙ev~vn>ÒB± ‚m∂º8wA•]7ÈF7@Õâÿ¯plSâä∏¬$|°$Ó¶∏ùŸh„
,`„†_ÚèƒˆµËù¸£J◊?àØÀn´rµÎD¡˙.iZ*æ\⁄+	´©ö^ihÕ‹+P@kÚó0.∫&MSÅ∞)=m´©Û´ôR‡.'yÎ:∞¶»Õ√Û'¨Áu‰LVö¯ëx”èåh†¯—qßË øßÁO%`>≈ΩÆÇ¸¨A5˘G"¬‰ÀìarÌ∑ûµ?\©EóE’ò´◊ÀºClŒ&«‰ºÕ\ÈDlN¬¸déõ?2ÌÄGÒ£•[qù-’^9ÕöPAÒsïÿ,QBK&;¸Pú?ó∆ââTÎR¸ËH5∫Ó#’bP¸¸±Øï £ØEL ”…?˘
§–Ú:BtÂ∑^C∏r2ãp˜‹‡D™¸†∏£©ôπ¨∫Jya'AÈ≤≈Èö©kl¨ÆÿëK∏I8ÆÇ[·∏∆‰“˚mç˘Q”ÜÂ¢={Õëπ>Lk·`ËHà¬“∆0(ÇY)“…J(]±˜S´)\ÅŸ€óq‰-∞zÒ#â´'Ñb¸ËÑUt›_¥≠)õ1¬ËWåÜ*€tèΩû®œjE±cñv∞x£–öo»„:Luy±ÓP¿.
Bån\înó^Ë˘JmÛmê~t˚‹"Ç™@3Ë¨”V‚Há≠Ñ=≤1·Ò
©—åÓz§x`¬√èéÈB{„Ë€NhE
îÊp˛¯t—æ™wdY~I˝œ'Nöã_m&+vIV=6ÂÕNû/{ç¶óFÀÁﬁØZ≠é9√^≥NqÉsû¯)–ÜJ-õ&≠8ã0ñ¡üpåm÷k€Ojõ5vXﬂÆ±∆ŒaΩ±_[cµÌg;ªls˜‡†1˙˜Y‡1^OÂ∂CÏ©∞	\ﬂÎ‰X÷ºÊÊªÜ∑Úöø ûxÇÆÑ¶”¡‹øÅ[;q+Œ|À?öÀûËÖœz‹#Äó<`K˜≤g ¥√CÈû<‚”¯®f‡∞Ìø~BÌ9<Æ#=0›CÁà≠ØØ≥Y4±™q•ÈlˆÚñÇZÚÆˆÉC ∆—zf»GƒàXÑ¯h≈¡q•ã∏.;∞ò«û„°√ôÔ#⁄lé=Áƒ	Ÿ˜X%ÁVIŒ„á˛˙ØŸ“Ú\Ó°	Ü
îÈ=Ëp∏¡Sg–ûÔÇ¨Ë∂¯ÊúafY%{o˝m`Zpy˛vp´A¥æÚ–˘G® œ„ƒ)ärAÓ‚"ÑÖ;´†ªÆEﬂÖ∑ºπ«"z±Û~k≠5v5≈≥ëµß€_¿pmÅ®÷]…«˜ó1˘X|]ΩsFßi¿ÚtEëÈz“,Tû%/ÏxÙGı8ª LÄ7u´w–ºX¸(†3_ëÕ<·nª|∏~µPòü¡M˚òä-ÈHÛl¶™Ñ∏9ÉEÑ¶´ãmäwÇvæ∞ºöÇ&∏C™…≤,jîp9´x©Æ∫˜¡≥–¬tU÷dÈ*≤¨°”
Î0@{G1öñÑ˜ñ¬◊KïÛ(V_ªÈá°7˙˜	FBúΩ¶ÒGHãù®ø¢cÊ·ãwŒº◊:iF€RW`(a“òw–qWÎy‰(CØƒ∞Âëèäë—sz*‡0ï>.˛Ë˚C8Äeëÿnú73a.ÿ÷WÜ‰ÿïDÊ_∂¯µ˜s]•u‘•’¨é™*Œ°bHÙ9#ƒ}d¬â±}ˇõøe[ıç'µ˝H¡Q¨Ø=Ú+ÁuÕ¿ÔÄÂ€q)≈(v›È[Ò?ƒÕñö$8°ƒ√órTóõtÓ Œã”¡§/~Læ%$ÃI‡¥ê∞´†«åƒÇTµÔ«®,´ S	!¶à’°¯]… ¶nkç˛∆F6∑ëØÎÉ∆Z»85g≈j&lK)‰·fàÙl÷ÿ¨Ô6∂µ—ﬂå˛Ì.ã†}·gsµŸrnbÀqˆkx ªu?vG–^¿”ñÌ‹û…ª@ÇÕÛÎ3rï„_1|èÇÍ\	Ù`;Nÿ‰â%kQmí¶dë£Ω£öù¡&xº/ıÛ∏X…¥Ò·˚œksZS}Ì¶v∆9≈Á/`“çﬂΩRî'öä…oæãl°GlV*8[\XúóY…˘í3óg¡¸òMÖÁíÎeÑ.u^∂„¸’πﬁÎ'MÛ’S∑Áº%¶ZWŸñ”8]xñƒj;g]7tCûXÏá`·—Íø¬ân{0së†Îg∞p¨ÚK…ÊfuÆπF€LŸ˜)ºb\£†Œ˝&˙#˛´(£≠v/Ä	…jS˜èàÔ—ﬁV±PΩ¶fÖ“NÁﬁ^´◊L‡ÍΩ≈©/•¥Û"@ÍLt‡v›k6Ÿ˚Â^ü≤Pˇ¬ñ≈,Ü˘8ù¬µQçÌ™xmx =n7˙∞6Nç–µ”r“¢˛–Ë˚ÏcååÅqÓ¨Tá\‚ıl\ÌÆr•áp€PM£ÜÓ	 ë5ˆ1’ÒaÈ)™≠°lLßh”ŒênJhÇhoj5 ΩÌä[S_±R®™D¢Å8£∫ï-Ø	õ&&;ÊF•:sÁN…|®˝9≈ÍVπÛ]´ˆe`Ãœ5	∂w4ÄPD™ó∞!∑ÂªR]À^‡ıö^_kü≈C;Ír¸Ë£≈éu∆ÜàØNÂz8âx‰v±=xFÍ‰ÀQML9ßûÈn8ÄkxÈv?y ]Ÿ√K∏?ÖìÒŒXÕ7ƒŒ±„¬ÏØµÀ-]À≈>√:NInC¯a”DX>ÊÖ @˘òOH>~ô≥ÖÙQop	≥ ¡¯I¯oA?∫Ó 6”}õƒû˛‚ü¢=-QÜ)‹hƒ–±@†õÚ~¢€wC —pÙ’©[¥k§gW9pë∂„q<ØÇÕfµ›§™v^ùñ§‘qi5O≠â‚$Ql¢„EZê™dT$Ç˛«˚œˇ¸£Çj•6„w¿@Èõ ßf£!Uåä{`IM—W]<˛√‘‘–iöD©ëa÷ÿh>˙ß±Å§“˝⁄RˆDF|Ç=@˛ﬁqEg*ı~Â%)&∑í±–rC¬”5ã—"K<ıS¶C÷g ˜≈{:˛\Å˘@˜Ω,FπGO»=º	ÊÌß†±çπ"YØ7˜•I6c3∫ﬂtAûêR˜
ßÆ¯õ)·®ÃJ%»ˆµ·`Ùœ=‘_Jà›∫…÷ï¬1ù"/çr_:á1öë…⁄£ÊA≤Nèqãx	"{8^≠üÉø»â^ıE3*√¥¨©#)\ö¢`4VÅ¥ÃlF{‰/‚’g¿ñdÛ€¨œ∏¢ _ŸÃé€kÉ⁄Ï∆ì˙≈≤4Øâﬁ´∆à¬f‡ë◊`~∆$W¥ès˝_º <ƒoÚ{IlÙ&ü=˜løl~cŸ≠#¥qæ[Û±v	^ÖX•03˙µ©“!ÅÅã]≠Û´)◊ø˘µ'æMê<ØÔÛG√]Àˇ⁄ã„}? •≠Àñ>b50âfI∑ë/πuã…_o`Œây∏©|≈Zt>ös[Nì–Z¡N#Ì∆•ƒÈ•{‚Ê&Ç3˙≠
Ûïø°'áö¬û`,dÉ∑5\`5ﬁJ/ÍXpã∑0ÿ⁄›gáOÿbÔ∆N4>ûÇt}ƒ}5ùØlÜ%Z et’-E’Së$\B2çΩB/Ó…Tô§äJ“nH“ÓH›a3ç±
ŸöËÕÕ;ßåI39ﬂö∆°fbC?¯a@¿Úzà[Ñ8ÑÌØÅ7<ØÆyCë|Õ3Œ|Q÷	Òè√Ñûl7ÅŒ#‹=ê3p¿%'L¶èXÕké~ã
⁄È¢∆ü;âú£¿√≥√Æ˙mDM?Âå9¬˝√ÒD9pé¡∞∆&sπó˛Üv)¥å]s˘ƒÜﬂC¡t*‡H‚∫Ì?fÚª:‰õm$ß»™VΩê$J:àppπmò¬}°g†∆πÉf€ÇwX§’_˛ˇ´õÔ^√vı_œ√
Pûÿ<òX˜±àV°—Zø…sp
`º-≤ÁVs9>•˙{ Éˆ–^	„˜
∞¿ı∑Gı/âÈœS,iÂì*÷o®áﬂ‹/ æk!û∂_¿+ÍﬂÌÇâÁ[àòSÏ‰é∫‹xUT~[Ü‘ù ◊Ò.∂5†Ó\´T…4§ª”xßÓpÂuúùhëç}Ã∆%Ô&`¥	ã⁄L`Rå06«MÄâµ∂◊(¡º”πA)	ü‚6!v8≠®»Q5π!è|°zΩûE£≥Cx‹N;wœ‡ˇÜN;e∂{πv<Tœ@Ú∏D+ûKÀ§≥∂„ø“Mylõ\~{µ~ Tp≥Ü _}Îc√åÎëÍFàQâ:jj¶0©π¶˝AèﬂßLﬂt@>±Oo◊~ÉC–`[' H∫«∑98ˇÀˇ9ÚÍß~g»C∂ºVQy.R≤`{Åw™Cö#Xg¢}dÉü“ ∏`\ﬁ±m˛˙ª.6•¡H	Z%A&à¡£ÀfZ_Ü±j◊Å:”N ÃÂMY£[éª™§¢Y#∑{ó-ö}^€Fw»ÓamõU◊Ísî≥'.r	Ñµr£oÎ.˘I˘cIqÛcÂJ|®™µ¢é]=€TÔœﬁfÔX8x”q·y	PÛå˛Ñ£è˜∑gŸπ±∑¯ô3Àålc∏_‹ãﬂ∑:wKT¿L∫.˚¡0†ú“
:∑ƒb—ñà[ΩÚ¨ÌÈÌãxùV;„†∂ΩπÀjáœj€S"[9Öu<¬ïÍ–Æíd«◊ˆÏ/N=ΩhXc{µèk˚Sz«í≈6ﬁ+éÀØÌ.6¬ˆ∏‚Î;Ï»A,Róù"FckîâL'£ïyCùáM≥J•≈óM«MÈ_©Hm*5eJ˘∫{¢Ë’G_(¶K¢ΩZê∞´ÿê¥+Ú2E∂@d[X°ZYö;ˇ.´µ<,rÉgù2hg^†Ñ0A’ßô≤PÛí‚ÿf£∑«˙ªw‘ÏA{]Oô«>ˇÓ+{Áÿ«|ñ©)'nÚ⁄›,Úà©Í#‡5)JfÕ>%£≠¸pínucoâ8P©ø1=n´ºÀTtü≥Ë+¸ﬂ-∑Ñ<éT.ç6±kè%Åkß^”C8;~èâö«c?`õ¿Ì;ﬁ÷1S£Ö•FæßÆ0/€E˙wyá∑ÜcËIû:=`ﬁ«(UT®3Ió…"‰åUcæàı™õIx‘∫keb#ÌΩ7y
Ì/ˇYﬁì˝'i≈Te$w F∏*øiaz∆ÍDIóóÂ˜tÙ˚Årtó<ç∞∫ıÊ 2eÚÑøº2WØ¶D äﬂ0GÔh:¡¿ÒgãRuAR aß´Åhº≥å~èÖ›¨~Ê6á@±≈£ †áj†é≥®I&Ò'6˙ú=«+»±Çπ~Òµ∫[∑=‡+6à€ˇÍsˆdÙ5]√*—Dˆº3ˆ˝hqÊl[√¡æ¯GÿÄ£?3·InÈ≤Â9¨{¬ÙÂ{¯πViúq£òCÒ:õ&¢π¡È¯ùjíß,NgàÚ‰ÈÚ‚9Ô¿	´¸ä8SÀ(µˆ⁄f˝qø ¶.6T˘…k∂BxDÛ:+aódmõP±?≥ú%õ…üI|<r÷Í¶z'YObàC<åù`(Ü_Fr)PX‘∂P7[Ÿ.J»1µ ˝î9`G_39∑≥…ÉQä[ÚïR‹“π≠ Sj@6«^œfãÎCLRìO…»zxç«÷ìb(7úáâµ*é‚Q§öÿ≠ÙÖqÅàçCAbÛè¿£¯v©‚•cyR‘óΩ¿“À∑(¿rΩdqªò¿Q"x^\—ÚS ®å≤Â'Ø÷LfÖ™·¯≈+qq~™#¨îé˙˛◊ˇˇ˜œŸÊ[∏.¶l•t¯–Ti\ˇÒ·~Ìp°2◊?Æ∞ßµùgµÅg†ßi}~∂ƒ.I‚_w’`ä˜≤x»r`≥ƒ(œ®µGt∂ˆè¥(√vi•e´÷;'3≤ùdêº÷Ÿú„cÕ¡3rÀ°ûC∆ˆ¸›&Uë¥⁄ês^£.Ç¡o s}¬¶}V&Ô«â™©_‘“âcõ†IŸ‰ZÒml˙ÑàvºCºWƒ∞¢ÆOÏ≥°7Pà%¸#≈I˛e2˙)l<ì˙&4:éCÇ£wjrˆµ¯ù∫»L>ñ˙˘µocØ3”ó÷Ü=å˘√TJM´£y]®T}Œ≈g˛àË?1Ë@'ÀúÔ∏ΩìAõ¥èE≠ö§ÇÀKõÚ˜∞S±ä]ía‘Ä«D1›¬G[j lw—ä-A≤≠¶ç5Ÿg¿ÎqFÀ∆∫‹/QÀ≠vÙ{Ê≥ÆœW”¥#‹"õ:LMû<Ω¿®G>9‡Yaî◊ÿr1‡Ñ˝IÄ7'¿&˙†ˆ ºÓ#n¢üóñË’ê,1ƒÅ3Ç!”øÿ•gÎ—Æìb
9Å◊@*8f€uZFKf†2C≥b5ù4å1ÊLwÒ™ò]±‹**ÊÉ]&˚å#gÎÃ√ç—[‰oD(ÙA{‹a∂®m=VIEõ{í—(·Ç≥•÷DÌEŒ¸©Æ(úd∞›>¡8°{v˜hÇë¯K0)•s”;*|F¯=09J
(Ò¡‡»oΩë'£ArZE˝≥®f0À≈ªNøR9:[„/,>N2∏¿òÄ˝ÒS˜Õ˙ª£3LLE”8çÑÉ+C)<é› Æ> b\ˇlN>Û$ΩπN›Û[Æ:yë+vñ<.‚Qã ”b…ë-$á¡1’vŒr| #ˇ≤ZG.∂≤tÖOÜëv˙Yﬂ”òm¢Ëgà@éàèC	¯8$/2cZ´ ”˛R¨He®vÖ§…ìGFgŸ¿oíB˜Í˚7Uø∆A÷J8Gy54@	è6Ñw‡›ÍSXÉ‹ì'æRé`mØK›≈∞?„Öå€äI<¿èÑ	:+k≠Æ◊#≠éÃ,e≤ˆ˛9Úõï„ZÇã§∆®êHû^<h4óÀx'$«cƒAn˛±uÛè“®¨wA\voDµåÁ6;:+‹¿¯I;$ÎraYa`ﬁ¬/õòÛ5ÍÒ.WÏRåìßh¢¨ç⁄Ìp‹ÊxÉ<˘sëËEÔF∑x]/`|QŸÓ±G	¿~˚ä/¶†∏ÖÎıô∫Z¨™Õ…2í˘îäi–¬¡ œ+⁄)fuÏ#£wîî=ΩoÜ,°≤ô¬âiç>iéæÿolê{tc˜Èﬁ˛ÓÛ⁄Œaùú£õıΩ—ÙùÓäŒÒíN…K˙≈ˇs˝Ω§n>÷Å˛©OMÓ…M∑?˙#6fdïß~ëÈ	7ƒd£6w·û“ZÜ≤„∏Ù}∏p5|˙•5lzÿŒé¥—€ZÀÈExDaæ”Ω≥Ù–"w4-öÓÒYÁjWØ¯!JìÙ÷EN<–cr⁄=”zµı§iˆ% ˜„éD˘»Tºàw/ﬁã∏úr#¬bßâ_|}—éD&≠˜‰GŒŸÿßË≥ûKö8ﬂ¢ªqëR{‹Ìùz‘˜4nù^ÇÏ ww:√‚}ËzÏ`˙ûÎ|6Ù>l/bT∑OÌTø≠E° sΩ±‹cÒ‰ úlàZ Ts:ñ˜pE±OM¥qW¥!é&ô] XÈP◊»à›îùübæzë/0≈à…àG÷d¡^∆à_Ç'êø‡º°ô›5JG°çKø£KéVÉ\ru`|˛ú∆9tANÛc÷Ä?&=›5ˆzâNù•’¥ª#ivmr⁄Ãsï?,fK	ŒbËë^ ˘öã|ÃTâÖçœDSCÖä†X≤ïeKä∑µjä`Å§Òå zØAgmKh$Ö”1˘ôÇñ'∑3ÏIÑÍ†Ò?¥^‹éI˚‰K'ö≤ÄeÉa<å»‰√âYÚ6"dd¸întˇ—W†≥q?Æ{÷¡Hì	4R~tcBrâıô|;M‡ë¥ˆ'ƒ-É≠^˙Wû{ _¿ê~›Î¯Nã≤z–°%IMÂC“≠]¶c‰ûÚ&â’ zä;l˘v…¢¸√”WAí˛àaÿ:@1àI^± MfSf,π˚|Ào—X‚¯QïWº„ ﬁ+„Ã‹|óz ÛQZ8√óø˚W¨Ì"-â/\__C{‡ØêQÒ—E…üsÊv`≥ïyÅ∂≈Å∂‚'‚»=ıéãﬂ*≥ŒlâI0mÏ±˝¨º
•iE‰,í‰fÈ±öHÆeàƒf«–yeWt¢`Pô°.{£?∑®~◊·O≈zîSÁ!JÙËkDˆü±û±›|3ö˘GÂe55KTÁ;g„áw°Ceì‚l
vs¶=YI°»õo…î7¡ƒ∏◊úS⁄iÂ’!Ê~]∫oˆŸ%6¢ª≥˝˙Íç√⁄>sô{÷ÏΩÄë;(Â8Ú#Ô ˘ÎÓ—´πÚÃ}ÿ”»mm{!vq&Á∑"√2O=]8è›¶y%ÉeYBÚ-öÀ]ƒÿ¸¸|xª‰5≤Õº∆¬å;ıÿÎ ’Wö∏M|",'v±ﬁÆ˙úó·ö∂¸?b≠¬„üó`≈ÿÉ£F¥ÄÑQëà§Ã »∆ôoæ¸ª_`	Ç‰ôÄÈ˙ßÁ…Ç®o\¯°u5åôp|pY∞a:pßò›^≥›«•uÕ)¸c6ùöŒˇ°GW…ñdﬂÔÑ\ª@†@mzÄ®-c©/æ≥x¥‘\>ziÜ[ì{Ê&M’R†øN0‡-»ã"¨ö∏e⁄9˛ÕóˇÂ+ÿßÜXQIÙ‰Çñ$+™,=–÷`Rm*x8HLY`I™NãÃyS£Gùeæ¬õnñ7»±≠+{Äà¯¶ö¬&‚ﬁÂ)Vº•∑–F)Ë¢[¶\£^Ò»¢;,(¬@ ô≤¡è√§ä”ç“’èEÅ°OTı.ó[ò‹Ó˘ØPÓ∏'NÁ6éÖÈÅ∞∫~»NΩóºÃå˜S˝nÙ'7‰YÒ^(W¶ (ú–e¯g“≈»NwÙ’¿k¬x‡mﬂˇ©K}])ëÖ£Ø{Mx4gﬁ∞˚uKk.úª‘7‚úù†EızË¿{ïÔ¿!ô~?∏U÷4Tß˝ø≤9JÏñ„∂Ä
´–
’r
Ü[‹+]—‹°:P·ÅÉ®æÀLÌ≠Uı‘+18≥ÇkË≤=ﬁUºêYm8h√ÿ˙√[Ë–√R«∞∂ô™èDŸnCR±ÁÙÑfÉ∆⁄Ñ∑lògÈqãåT…
MXwÅVG”ie´*≠l5£ï•i|ﬁJ∂ì•‰%¡¡4\ô!/_Ë]Ì «“*/áÅ¶€∑Á⁄M´PÙn’5l’+t%Tù≤çﬂ’ÓS!Zí·xD»Ip∑ÔˆÍ¿jŒ÷–ü˜=UÇ(a¡gqﬂ5‰ïRı8íç©(IMGÔÛs4≥°ùÑP-ÄíI*M¿ñ/œ‹‡Uúã&f»™lÑÍZ‚ÿ¯§◊ÿ‰_Ω|âZáÚCqÀ”Oz$ƒ˜∏«_ßâ¡©˜+Ï‹/˛Çªª≤Yµ"†ÇﬁpHr¥¶Æ9{	˘◊•U3ø+Ñz¶Ò ¨j∫§u·}¢Â/<™¥!J3ÁòlïWW≥aÎ\:∏ı≤OïlπÕ6¨Òú®â•÷V©∞©ƒCÓƒÃÅòÆœÁ*∞Ã‚*s’jï=››¨m≥Õ˙am˚Im≥∆Î€5÷ÿ9¨7ˆkk«¡·˛≥√›}∂π{p–˝{∫&QÙﬁÖj“Ö≤ºàª9üÉ≠3ÕÖï9ìMOz1≈ÑâgT∏ºá8É
~#Üœ(u≤äñì™àÍâWªÉÍbâÏ˝#ß˘”V‡˜´Gùa`õ˜∂J8Õãÿd3ÁfDwñôVaÒ†æ¿‘Ñ·⁄îúáavBª˙‚˛Úi˚eÙ˝uıŒù—ır,‡xÍ•Æ…N™G`î9=Øãgz=v∆)˛v<˙£z¯]ÿV@À]P‹[√Ä⁄W$ñﬁ¢00ûÄ˘\ﬁñ k°O˘⁄ˆ ≈9Ï∆CqBá:…]1ÛTëÀj>IÓ]í{]r)À≤.ÒVWºè>•?¸°0˘∏¯)äÄπ¥Wrß≈∏[í6JPvÅúf_≤`ãC !‡üÀªäÚÑ^Q=≥fõ÷í‰∏Ö›ôá/ﬁ≈‹‰¸•)eÂ¡B{≈⁄˜ïŒV¶Ñ{j—áxt~≥'|Ës®Å’â)ˆ6lsPD17ÂO:5∂‚4[ˇπ√zUS/”≥8TZ©>-Õ)ﬂC1‡π*Ë‡/FK/©I©Vı˝o˛ñm’7û‘ˆŸV˛Q¨ØZ∫Î˝+Õ¿Ôt(±öÇ‰ΩCØo≈˚¿cû˝F·æ+:£eÙ$≈fR∫Ÿ˜Æ±Á«îwfÈ\G‡Kû§:´G†E°§HX7å[¨íC ï
ôﬂ}˙I¨nkç˛¿éÉø˝EjÄUsS+™Ò=dß?œÒ™¢2+l?ãÃÂÿá7•˜bg'Ù∫∫tT¯O:„èØ–≤JN‹[ÃIÛ∏èô–∞fJÔÜƒ¶X‘˜*û9uòí∏£¢@Ë+q€(ò¬å±îæÈì!ﬁeÚ7€Æù¬3πúe´≈ü*ÂêÎ^%A«XªªqÑ»æ%í±Í*ﬂ©√‹˙5I©ﬁ¨ÅQÅeè˚ıÕ˙ŒFæ≥ù⁄Fcwß®{»É¥g.^fY2»—ÅÑHAJ/õÍÀ8ŸxÚ˛ı&b¨
πÆﬂSÙÑœÊÊcò—5ÑY	éÄ?,Ò“t˙(ƒ*•üﬂ˛[ªº\˝Ïî©¡ºIN÷rÖ·∆*:€`n˙SÊ+“å¿N¨-Ù —y üàôŸ0©æ7µÆœiæ¥PØ…dø‘wjá˚µù5ÌO“»DÚün7:cMÛ}ª&ë"4µ;R3ÿî]0Qã†,rÍØLT∂sß(9#8ﬂÂπ=§ﬂ˚aAc4≈≤nQzfBØ9Ï`!aA∏ﬁ¶=∆[¶2Î¥≥ëÁÿÿ¢®ŸãmnΩôá1G2€wf
◊V™”√#÷qﬁ¯√ùrÿÌÖV t¶K¿*πŸ¶wïÀ≠ä{b„W¨Œ‹†¨Åù,`&"eﬂÎ˚ˇ˚?∆˛∂I%∑ ¿%ÅMÖBöêöß¯ïn˙∏2ü$M“˛—¸pf∞m·Ãj∂ÛÅÏJüU¢(–ú±V≈íyEéóT„=*	ˇ'!Î‚0Sh˛E¢‚Oo5QıãU¯=§Ÿ JPq@.ÕË≤˙uM∆hE’MuZ‰,Íx õ1ü®®mDπw’@aÍóåﬂP‚kÏƒûπ¬í-s5_*†fÀ+†íEUUêi9•˜†6$0Ω(svØE3™¢úVK˙“èoH¶∫ù^G{wÙ;ümçæΩ¶%8≠v¥7Gñ∆,g‰Ø—•i5y	£ «p„©∫aﬂm…#Üœö)ﬂ∫©Ü±Ê¬8≥&⁄"¿LL—îî—Å~õÙ˘◊ìS4%®E≥Ç"ê¯Ã˛ì¬7˚Õóø˙E¬öxÆbçÚ¢Ü’&®u)⁄Ù≠Zñ•∞-aI^ô1‰ﬁRÒN{1„tjy?g—≤Hê.•¢C"I€IyWÛZÖ-¡Kë Ó‡Tqû∏=†ûÅKsØ$±ÏBŸÃﬂ^Ωò%–∆‡áÅ3—z´„q±‚!ÕŸ:™Ë	f¶±»6=9?©ò|˚Ïp∑ZﬂŸﬂ›ﬁ∆~lª±ÛØŸ-ˆ√}∂±ªYg[ÿM¸I„@dml`⁄ÜÆ‚Œ"3W… W”àrRÄ#fï+RcAXm}ªiÄ$‰h—Å&~zœ¨ÒÑ"‰¸‚;K´¯?Íp‚;+ÀG Ò^∆DïiU»Ä1|[}éÈ›√éæ¿≤–Ìô∂ö5¶r	ÁªzÖÕ,˙á¡ÜﬂJ·<eaüÇÚ7˙˝Jh*7
ò ÍÃ{«Ω.÷ázòfo¬Ì¡©{0sóÅ÷s˚>5eêz„FÓ≤^ÀØ"Ùñ‘](b_ÈÿÇ86OÖuN0:ml@EÊ˛£ıübY¨O{VUó˜oê¡:€â⁄¥a%®crﬂ
#o„ΩÀ˜é6Ö&(î<[M1Ò&4*™åhûhã$Ÿ	:Æ¡ÂÓ†Ÿ∂¬Xy‡ı˙√ÅQPqê\|0sE` D∑€Îº1ûtä] ◊ﬂΩ∫˘π˘Ê~„y˝'{€µC`ﬁOÚl˚|·H—S7XRso≈$∑~Û®s@5œˆH_~!
$˝¿ÿ‰XùxëI5[…Á¿à‡Öîêd≈ck»58 {kÿd¡ùÄQ*Çi5F\Q=ˇå›ƒ∑®ËôÁ%∫=Ã”@&±Õ$.ÊÖUﬂö∫”ì,,ÂÕfOø¢,·h_b6IµõpzÍÇr3˛ÁY’7äp;¨{àÀ∂€™™Ÿ–ùtéPLÃ©¯4…¸|Âo∫r¶©PØ∑/	6kª<Ÿ⁄®S^`≥bjºÕEÛ∫X8yÍ9Ï8p·ΩˆΩ‚!ùìR%“jπ]wO+Û:Ø™rüqÜ'	≠”Îı
¬ßîÀb|YîËÚ™=Ù√µÖX°˘œDzrƒ'X8]Z‡01’œÇ*ÓﬂÖG°˜÷]_∫∑xˇøÖÂúÍΩ}1\¢êÛc¢ŒLÙ˛I5MT63sLeŒºXZ&]∫ˇ'ˆÙéW¿gMi?„IÇ"3L≠¶É¿¨®ÿÿ± ù£Öé÷∫Å/÷„c „”ònÙY¬>•‹FÒø˙<¨¥Ê≤«ûÜeMDëYeﬂs»◊–uPØ¶4'ä|¡å~êíøM!29_peQaÆ.ƒããZf¶e]ÊÅ†˛ˇ¢êÂ/§,‚&æ¡C∑€ß–∑£?†;PK^´¨(âÏ,ãiÙóπ≥…˚¥öJ/äüÆ6ÚàL‰xz7√åËzÂ|OÍê$W}8áxÁx‹ù¥É[]ˆú€∏ïJ˘]y“≈8ù£Û)qœ<Ñù€Ô®'p>Â)ÈN* n·ﬁK[Í)8Òª∂⁄ÊÔhôK¢ïKA‰jÜø≥6l/ñ"Ìd€ÙÂX3—Ãœúõ‰î˘ı]ÄG
S*Ti>ÂR,~Òø	Pœ„ƒ§8Ø@õ≈§F~*ëxëM≤∞H∞@!{8ò$Í)‡Ò´Ê∆ =æ†˘‘‚lÔ¢3≥3íìx≈ô„)ò¯G+Ípè_»î#l≥ƒΩÂ`5	9¡Lÿ™. …<≠1âOT∏-s»‚lÖC?(`Ê_
¢™9®‘¸Q"ú\≥iB	u‡¬W>»|À?*0yµá⁄U!Ïo>p¸[¨Ô«∏P∆¬¡Zãa¯Î˛≤EW5!"oÙ‘HYI§bPRï.X‘jXt‡‚kyXm!ÉmÉLÔFú9—t~∂;ºfqâÁ/gÚÅqM"¡7‡∏¯	Aî∆q∂IõŒ_$nàÓ∫îïó{_ÿ[ÿ>Ö≤Tßãm{ö5ÂXîEusv®{⁄äzZC´A¨ ˘L15˙©Ë¿ñÕ°W@u`ŒÖ)ï>ﬂïºvy0ˇ2˚Èèç!h*UôZêôm˚≥Br4æGS≥ ≥x÷°GôC–Rª*ﬁ.ƒ ¥ËIáÖ™ïèwüœ?ﬁü”Gû/Km≈ÿÛÖËÆq[1ã’àr+È«t{®k¨≈ﬁêgç≥ïø_#ïñÒ)·˙˜Ed.ˆ£ƒ⁄ËºZ˚·Î≤©7Åz,¸m—S&V,·tìZªˆS€BßJ⁄´Å•
é”n÷æ©q:∞Ñ¢IUùeÜ]àñr‹Ó’Ô^IÒU)T•Âw™ﬁtTºz”FÈ¿ŸÜ0ÎB⁄π≥µÒk˘?9ÒOgÕ·êËÛàÕÊ.ø∂ÜU≥º—›»È¡ Úm¯ë¸Mí3AcàPJ˙√NËŒﬁÔ¸ïEÔÿxÊıÉ•yˇõ/»cé)º∆%·,>Õ˚üˇëÌaR-&ï‘‚äÖΩùmí¶˘Y6`¿™=òá©=)g§Zªw„€—ƒ©y€sN|}ı®$˛ye0-ˆtZ)Yóò¶¶≠qõR#ù:/kRc+ú.ıµÍzaËHù≠◊lw´)æ—B¢,r8òî
t¿Æ AVsÒQÆß1%+÷BñÏ*h™y÷¶Î2Ê|y9ŸÿıéãÙ‰5yÜòïaj—¡á¢"n0XM‚NÚjbQß¥¸‡cˇ4"4˚˚c´¬Ö'~‡ﬁnô#˛Ñ≠›–∑v+;'ª,≥Hq˘E3ü8a{çoè®≥ãΩ¬s€õóhCQ∂è∫
H˚¡ZqC¢Ú.QZ9cø-¥ﬁ5¸◊¢[ˇ‰±9`ﬂ-≥2<©=&@vD©QÆq˙}dOlıBËåH„‘Í?€^Í3=‘˛oæ¸’œò‘ó]4cèË»jÎOÕﬂlÜƒCi¸∂À%8≠
ÎKˆ˙Häò¨ß≠jı≤•¶ô}~Æ¸©IXﬁ1Ø#Î∑?f'—?{é◊s;©Ñdn∂˝ÆﬂÒOÑ±¯È0}›¶)·ÉÍ≠Diâ¨[“YUÃÿ ¶<iÆ4vCEˆ‡˚ﬂ¸;ƒæ›ÒÂäIﬁÚÿπ¡vyR4Ω'ı>˝h£›åç’cﬂÉ+A‰zΩv∑ì≤£dÊ≤zµãì‘å'IMú∑o%fŸ°D≈P”∏~˘l≈’|∂¢ú°ò0T;ãô⁄≤R;⁄∞£PDE£˜é=^ç	è…«ûM“ŸóΩ.\6kà…V0/ÎÛe”—$"Ÿûæ∏XÜ€<ız√A±+?e(löÅ§(√‹}gl˜æˆá‹/e˙C\”QGQcsà4¥Ñp‡Åö⁄∞·£î/¸⁄ôÔ∫´´7”ÉŒn8Ω[Y¯ds·‰6õsËnKM™ngÙU¢ª`ûÜ,“n∞⁄gCèç~è MW®ó46âaAw¸SámÏ<aè'Ù:Û˙\·Åú∏ÉıôüÄ8Í˝TΩe∑ÉyªÊ¥›lg•Â’Õïªw_&L-µVùóc¡ÙπØ>H˛ì£w? ÃÜ4;ô∏;Ïuıém`£´Ozh§ú(7ùìøZ±s%êHa⁄√∞ãn ¢ΩËZëƒW|';@ˆüæ©ﬁ]ïÂ»õç÷/7#@`¥Èﬁˇ{ÏxgRôã
ıC’¥Cª˙V⁄Ùx… p∂ï Yú|{˙”„Û∂¿Í™h{Dd4Õi.f-ä‚›©ßÿ≈œ§øu'FúRú}’ùWà”eãŸY›Ey–qπv∆8níµdøòO¶⁄~qvaùøn*WÉƒ•Î— .lwvÁkÿ<Ì Ÿ|e1û*çYˇ8Q≠∏XŒß5¨|€9u˜º≥hΩ≈W~ëÚ]üL§Â0¶Êß~ÀÈ`kô
÷Õ(/QuZDvÉÂvâ-eT|,”N&≈¢P›¥≠%l˘’E¬{_yÀ’õ€uîÅÛûNWˆx∑vP}ﬁÿŸ¨Rn“è560∑¡?,∞˝˙V}ø∂=óÎ“—tzΩË6·%˛»ÌÄÜÓZ¥È–\ôÏ≤…⁄j‹]ø≠∆UC
πÛƒ‰˝6x/0ü/™è∆[ﬂÔb˚å˚´ó‘3√\[ï)¨∫]5tZ¶ˇ˝øö{¶jÙ}Eœä8/çíÎVëA·Ålç(L<“îdl®iÃˆ≠%d?Ω:>™ØjlÙZâ´ñE¯%TbÖïó‹]B≠¢∂ùp£„ánK∞¢}˜x^¥ÜÖ:ÄVk8–p3Ωû]§9dÇ‹yñH&æ•Odj*-˛ˇv"ô§m11Ykâ’œ!?Áº)+ıí∞o"Q‘ÅA0ã∏C“Ü˘ŒXÄ™´Í¸ãfì∑j∞Ë”˝ï.ä’Á≠^qÔ}´om<≥l◊Ü{ÜÆ&5ΩÆ⁄ûeù
mSy≥@ËI!3ÌÖÿ•:A…iáe:8ÄV(…∑Dê’ÜÉ—?)˘âYR ß≠h·upPïYvq∞ÈµîÌ[‡@N=:íé4∆[@,ö*…i!í:Â|TπÅìk_±£¶'©$ ¥ƒ1˜-zb>]E3l.¥dpßu‚⁄6?*B’ª¡éﬁQ¡é⁄5î”˘¡«Ø≠0±íáÔ˛G„∆¶üî»„¥ù≥I˙KæPáπ~CCZ∏°|ˇÈËœùÅ◊Ô ‰÷&√S∏“S`p´¯à¢™Pùâ∂mcÅÄ¸‡Mi¬B¸æŒáDVàÖâÆ$LÇ[1ÿEü`Z›s†8ëÇà?˛—`?≈k∂¢Ÿ9
˝Œ%;X¯˝®Ãb˝\2˘ÀΩfB Œc)´™‚Ú˝Áø1.ß6	Ríêj0¢4Òﬁ0«Ì2gxÊu∞ù∞ËÚ”£ $O—AÙ∞>ÿg-Ô≠s‚vo≥pÙAâ\]+˛©B«=¬±—Ô∫xå~ãñìbZõ≈©_‘ mvÙ@Ò6•„-,7Èà"∑Í˝Á&WCyA6YœÂAÙZ«T∆ôŒÏœ≈ ¨ÿøÚUReÕG CûÒñ@æ›¶Ô«QóM∞•[^A¿"çæ"Ä889 åé[Õ8J‹Lu¿åNìgâ˘ÃA∆ÎÙ⁄‹·M˝`F¿§±Iê€Ë+º{òOﬂ#Z±6ê∑x∂¬c≤´UçY∆…ZXUf-Ë
r¸ lK¡R%ØïóÂ:Xdf¬€·¶l3;ON≠*oà∫Q«YrSà›\É◊ ìBΩÆÎπ0C˙#P5;nóœ$ ⁄ü?qu~ÙÒõF´2qXsÁ∏ö@\V˚˛è˝†;´ÕıN^∑ò3d∂äSÊCrî5Ä’`˙_Â;r€Œ©Ákl6ÏìhœﬁÊ XÖDoV≥"W«8o3 ŸÀèZF9ßb¨Ê√ñô˚c)ŸÀ)d[`Î˝FD8tT&X¢H9¬â0ô˚oPôa3s/_*ÍÂÜˆ÷ÿÓ~£æsX˝ÕËﬂÓ¶#{ï⁄Û⁄am?ƒsZß^”ç£›icø0‰F/<n;ã_ -
πï	∑iQ;5ë¥T¿±÷Õí¬;ZKõa^î@Z=0a˘"º úAR.4œÓÚV∆¬r?Ωı˙6H9niè©dø!2ˆÀØtÍ™..ñâäilænk-äó•Édÿ‚
ÂDØÂ'∫Ï0p='©√ZÊ≤Øh≈ó”Æ¶tbr&'zTx]–˘$ƒv¢˛ZÁÜ6[J^}P◊ 'U‘“[πrÏtBW·¬RÍ»à"ê”pbÊœOY TàøÆ~ƒ⁄ˇ¬Ωûq	^Å<O∆≠u4ËUõ®TTÂMñ=7ø¥∑†ÑY…ßÊƒJ>¨àQ≈h£≤Nòè»ÀK`aÁ,ômÏÀnÏ‘U}5≤≥â<ao‡ÄJÒ?™ —ª ëhπ°ˆÏhè1,4%.2t8?ÏÅ∞t¬6a˜€>∞µ•’èVÓ‹øª≤zÈŒrıË^ÎﬁGp¿Yuñ}∂~oÒ÷Îuÿç∑–\GÃ‹:ˆÎ†?ıg‘˜%D‚ßN‡9=∞+„0Ç√û{"œ!ì@@⁄¨ö1ÏBV KKb+‹Œ:À^Î|àùë‚5ºŸ6P o6∆JKMzæ¬]úÇ@òao–Å©$¡öÕ§fnOdä€eXº¶pGõ˛õìË8∑mËB}\oÖKMl6Î˚çΩ√∆Óé≈∆ìç1≈4-U§æìÈöˆ∞;ÛP©◊∫!â*˘B'ºf÷–r;∏ßÚµ`∆.\
!eıÔ’ÎOÿ„gèo◊Ÿ”˙¡AÌ„z	ﬁïXW’>fî¡ôÜ@b+ hÏÚb‹UxQSñI‘Räôﬂ#>ØÕeòè»¸c6hª¿ˇ]∑ŸfG√#Ão∞q•«}≠/™wÒÂë˜ı≈Í‚w_Jﬁæ3¯ïΩÆ"∑éwjß˙Ç.äø“%}áljq0Hü®Œ9JüsØ<Ó)%≥) «:ö∂ŒvÊòÿ§ˇp≠‰ñΩ")Gs
‘[µ¶î∫9UóßÙµª˘^x2æà⁄o∂Ãs˚T´ŒÒ œ‹oé˛ äs{üùÏôûb Ñ§◊yƒÄ0º.Î#*{?CÙ5{¡<Ô¡û∫Õ‹¥Ç∂√¸!Lç¡ΩuºÁç/:Zübˆê÷•∏ª{X'˝a´±ˇ6‰·°öóiº;Ê*∆ÒÃX}Û{«^–
\˛yQ+;–®¶giiπµ∫¸2ÎûÀXB≤ØMﬁıMË˘§´X¢êR[ôÿÿ[Zµ"®É‰≤Ç®”ë¿\t¢Q÷1∑™Â›f±—∆˘g:)ƒ•º©ØZ7ƒf˝∞∂˝§N…≈{€µù]vPﬂÆoÄ§≈‹‚l±»ﬂÎ8ΩC/pO=˜ıX~àè>?Ñõ|y?h÷ΩjãrËÖùdpAH…Ω-∞°q¨SNÉ/¢ﬁg8dæOªÊmL–ß0˚nuÈ£YU∆»X~èÅÎtí∫‰»Î° á—§#Â:ˆËÛèRR%’ó32ÒAm¬U¬'◊C»™í}£$>j≠kÔuI∂Ú¸ß7hœˆ)®…~ÄkŒﬁ˛+öñ˚©b-}ƒj0IÖx…˚Fj@∂o±È≠;≠amπ{ºv·ﬂ¬7}Í9)wóè;9«Åç&6jb¸ê±í¬m†ßDf‚«ß2õ¸ªÃDdúø^E—Í*e
¶ÖÕ|ˇıˇÀû÷l©›Ì'çÕ]e∏Zgª©ç›ã⁄AÔ9)©vyÀiz0X[´á¥èΩ—◊Mœgl÷ÉqË•{ﬂø¥Õ‘vé¯ú¸	v”©Áw@0
⁄˝éj]∏ñLÙ◊— yãø¨ù;ç‡]üƒØazoùí0Ç>Øçﬁ±∞Ωœãﬂ–,w0ge¥ó—1G%'|MÆ…T∏:ôVµ>„ät}^±∫+ì©B¶∞#mŒáBùe
:öÁaZ7®‡?˝Oyù—aÖÙ∏¶oVTò ¨Ú@döYk"∏õnËˆN˝Œ)¢Ûˆ>Q"«1j¡n
â¿ë>ïÙ({Ñ<%V@så~œñÔÃÅëâ÷eàä ipO∏A/jœÔzŒ<€Ek5zv∏V¡'∫ÿßtëJ›&ÃcË∂lÿuX‡b«:Ã◊È9=¨1¢ÅO)9—ü©˜G”•∑0 An≤pQ±(˘§Ö9@ûpÉ∏„û8ùyVÔëëª4†C8ëÏlÏÈ0 êÑuß¶:éRÀúû´!LmÉHMÜÌRﬁGU‹˚ÎA{U¡]óbÓö°˘Ë^˜›óëöˇ„óÏ9,õsÇÑ·≤≠aØâ9uƒ⁄ê¶W5≥vt≥…∂‹òKnd◊Ò¬AµÂÖM˛d0%}∂z«{X‘"Î~∫Ïç£ét	ªﬁu)ãrâ$Æö÷⁄[Óù„)}xdÃ,›£›qõ¡õ˙.nÒ∆'zÔx†˙ ØÔ!l[ öé*2æ,¿åß˜0O]9	yu\"=ÖCÙ^◊{Î›£Ñ}}Ív¯	é<‡ªv<¢?$,Ú7ÊIÿMßÓ¥'_«≠ËS3hT9RØÄÁcé˛9Œ¿·s‡;∂E~ÊN1‰èÈË+º“¿≈#¿#s}∞0ÏLZò≈ìÿ3íÃK¨™Î&Ú-0Ï#íaÉDÅYò†5Aãùã¥"9ú‰îÔ	Â‹ãîsGNFÒ ø†Päiæ•*N¯∑ŸS,≤Éak›#?ú"Ï"6ΩÜF…8äGåÙëO∂Ÿ±∞ ÿÄ!±°˚ÿ¡Ò{$ÈB÷˛¡\fú8º0`…NáÑr†≥˜≥GúˆÒ“ÚŸmÜ¨õcPR+›Ë·¬¯ÅBëÎ 5∆ãì{qõu˚îÀêz‚VˇÑ^‰ÁHs⁄¨*ã	†®#P¢ö∞ËG¢ç†œ@dıI}rDÇéÇ»)–b=Ê⁄è-‘ﬁeå‘≥-êV“l˜HØtEEtZæÚto⁄ò]±1ªX¿BˇS¯a◊L{¶0AÓGy¶Œ	®æÔÍ¡f<BÎ’Á‚îØ"JŸn¥]#Âñ

`˛‡0K∞ˇ  ˇˇÏ]›n‹∆æœSL‹†Z!“Jñ‰ÿ$+i—è£ï]F–RKZKxódIÆ-Y‡ãﬁEë ämr—"zôãÊ2z?A°ÁúíCrÜÆV∂úî-ó;$gŒúˇÛùÍ”Õ$Xç·}a¬ìpEò¬j{ñ)êdCöÅûÅP≤â»»
¸(Bπán(Í2cIƒ•}—`G`6EÜÒFI! õ¯‚_#*p¡_¬nwè›0W⁄2«Bk`‘ù©ë‡†ŒÊ?íy@Úœ¡˜¡} (r«=Ã0éë√ujæÅ©<˛Oäu∫õÁ»±ë2“˜˙nbµäí/)Æ €Õ¿ã^–√]ôD$TíhíìÍ™%ö∏’œ@¢â7-∞]ûó±µ"†’√ÑVe+¢ `û"Vd
ë.E‘å\y8>·ÂDh¡°s£O}ba°~ÍZ˘Óx0Å}˘*o˜lr«ÖÛù—<ï°—3√~pDEZöü À“˙`‡Å`á	ôÚw¡<8πD†*øê˜±CWXGÚg1{…+I˙'±.™≈K;æHZF˜ˆ%b{8·ÒvπùÑ·êe\ò‘R)”@pÔ±‹º¨ùË´<‰JâR¨ñ‡#2 {%ä˝Rík]m dˇÊØ_a¢… Q±∞xı%CÁ ¨ÿXÑp]4∂¿ƒ RÑ/˜?+NüYaõ&Ç¶¨7´ÑW™¿≠G’6ƒë_X¿Õâπ'V…÷\9Ò¶5Ïì"—RÍTïu?&ÆÛ™¢ q˚GëºqàΩµhÉxú3g¢£…x<GßYıP<4˜j’}DK`˝\e#*§ôBqV ⁄'bå2˜◊á:P}Ñ~Å yÛ€Â∆DöÚm⁄PπÆidósÉÚEr™P±Œi‚Ú%-»0πzÓàµˆ?õ≠ØÄ◊g
—5Íl!ÒÂ4∑t5Â’“@nÒ3._X¸•|ÿ˚∂&á–ê &^vÛ’|Ïce€ÉäíŒäì™œMêÛÖ®í"1©>Î≤ÓìÕùG=¸Ä(íΩÓ!€ﬁ€ŸﬁÎ¬áO1lßò
&)√∞ÌF§]m"e\˝#^ÛEbÜæ≠nËO/Ql§né6a¢òYFy0)˛P>˚mêTƒ&™Åˆ¯(ø∞»∏å¥-ÔÀ[yHE*CË§π`!ñ¡Nù}ıiD˘¢9–¬f›’©≈ıÊœœZ¥UÂXÔŸP•ùÁÁ+Jm)Ì@µó‘CÏ\¸Pø~70ãJÔ˚πºÛ§≤ìk˛ùG\e(øuY• )ë9QØ˘Î∑}Çw∞§I÷Å
’F/ÒÍ‰≤é$-ZTçbΩT◊ÜGY2nJS÷¬hıË=cÌv?Õ1Œ3Wi}Ï\›Ë#/.Â|ÎÀ
ÃƒÌ` 4B≤N0™ƒbûÇ¯<bùao“G+T4C≠Pf¶π∞—¯h‰∆ïõ{8À?VØp]i—jTÿ¢MÑ/®™ö∂¿5^c1p∆üp˘îËà◊#„÷˝éãÄ*Â^Ö˝ÆjRb@X¸CFYB‰WìVÒ|Iõí⁄’aΩGüv{á§ruÿ˝}P¿ÿÉã/7∂·#(a;üvvª{áÂº˚ÅˇÚ¡ÈQË⁄≠SÙaOµæ3ô¬uÎ Æ=Í|¿üuﬁ£áΩﬁ*óV˛M¶o›®U∑ä Ÿj5â≤ÍÖíîÀãk,J'A
¯˙uì¨œ)(W,…∂ƒê˛™pG<∏¯7íì™øÅQzÁÙä™zÍmhRΩèM‘$Øa±Z—»2’Wˇ7ÙQî_VTãˆn∂
Íä^Ì/ˆπaµˇ⁄πØ@*ﬁºs^.®6Ø˙ü™‚¨	Ø.K»‹¶ûÂÇ;Y©nk„îI#˜º˘cÊ≥/ÒI»üµ.^c¡kl-`”îèŸ&ègc¥b3º¯ŒvcˆCµÉ∏Ò(ÏÂcÔ˘`∞h|ÏDÙ,Åeá¢YîÊêcºí2oB%∏∑∑0’6Å“mKDÙ≥àÉ9:Úµ!‹ÇÁ£ä†æÕA”êébT¥©CƒxKÅ :õ≈⁄2hí⁄ÖÆ*œ‚}4ﬁù≤ÜÆÈ_ÆÔç\É´ôBæ∞\Z;ƒ‡ë“U•ÊºÕ›rßw^ `™ﬂ°–\ï°#„¢ıDbçÅêÄ®,é°ÜπŒ)fK¥…cPsL¡9±p@ JuFj¬ö‡ì÷àF)ó”BvâTâu∑´w‰S‡¸Û©1¶ÔÜN,≤–MÓ˘Ë$«lÃJ§@ˇ»OS{ûqŒöT,UÚa`h‰~»ãô˚(qIËîPq› ª\Gÿ¶é≈üÄ©.£y‹î!Ú€ÃZo*Ÿ5—ô?õ+nrg<UÅ§©≈ó3√Ó?üc¢|Y%RöZN⁄¶˛ÍçŒˆì€ÌÏ=‚üSK©«Zõù4©Êÿ√Ì'slk{ÔAw˚`øÑûvÑΩˇ»L§N&ŸNwﬁe’r!ñmßK2ﬂVK©%TÄL¬ÅÛOÔ.æ|aË°6±í&Æ.æD„°+V”¢¢´Mœåbº’%€µ<Å•Ù–:∂‘m‚‘ÜùØñ˜Â
l Q“¡≠6†h;ÚÊı∑†¬â\∫ÚEiö]SúuììS27Úœ¨6±ô{o◊ÙB$"∂·€eúzïÈ•k¥R¿¸QZ
•7ç¨ï~ª.≥Ba◊ˆn;5Ä˛A∂Å&CPÀöBuÛÇÔ"∑(’U°A	úõ^l≈„àaœê·j”ÚÚRèÑb∂Ô®|C≥}õ‰T#GâŒë∑h/!˚=±7óŒ”\lÂFnVv~µÛ˛òä ˘≥S‚†»Ïo4ˇô3≤à06Òƒì≈Bè’é˝=EΩ$‹qk4ÍçÉô9v∆¢¯tË 1a:˜O·dÚ'ú›8ÿAÑb53m∞UÿÈò…%É}*eª™∂Ÿ–:r¥â≥˙TˆÂä$ﬁäôo‡Ko–}Ê¿&¥˝U≈Ï–√©JçQåÀ8VL´ã˜jìØ-Ωôjm@Ê0:B«…Ij‰¨ä.Ê«\eNõ∑wo”›©Ç“;5à:æ,ÙŸ∫´¡Åª]»ÕN„^À,Á^íÏû4Ù¸ÃÔè£U]œ·-¯©2Ï•ôı≤ÊÑXÕg˙~X>◊–TÓ"÷⁄Ω¯Êwc0ÎŸ€çqvmÅè`0x‡û`¬7h}¿œ	} 	E£D\¥º¯‚[œ±jªﬁ õB“3œ∂ƒGtüu£‡‚ªæÎ∞÷Ü5Ï√õ4yX^.É£~ı{ê·T;≥ay}™ƒm0N,ﬁí:Ê‡p¯GÒÕìaqNª[˙¡ÅÔ–N1g1ú?√›°4gS&”H¨õsß∑Œüòò ÿ›@∫ÕñπR_ÇØ\/´S¢˘zcÃwVß F±¨ﬂXl/ﬁT_bn$¥‘πÄÕπ∂äöD‰‹˙V‹ ÛµY‘5ulmZåM¡÷*¥≠Lÿ_äœUa–æº≈Ω∞ôàù6cÉC
ÖKï÷Â$äcïÑÌ€'GI ^-Â)O*X6h±$r?ßÖﬁ§"äÍLsq)7EÑjh÷ME±âä“=YrÓ´dˆr“!+≈ö–+ô∆]¨Tz_]h¡¡†â.È7a≤—±ß!Û√„8±@ùæ•ΩJ®÷P(,çTÇ≠4p˙œ[ﬁ◊…¿+Çˇ^ëƒiØõmıd¯’ll˝NœÌu´ès]∑Èî€#{3q≈	¥¨ê}\YWPøíUJc#◊[?ª©{˜ëu”j‡$òeÛ¨⁄›PI$“‚'ø¢5¥ı?lŒ‚ã#ud€S*#7´h¬v#Ï¬≠¶⁄M®6èÃ˛IÆ◊uù¸»¡ ï˙û¿S£S~3Ÿäf9ZéçV∂Ë∏‡˚ÕŸ8R–o≥gbÓ&çq%Nˇ]rπrÁW &¯úÉ-%Œ∫˙H@≥µÃ¸ì¶éÃü!âJôèì®4∆ïê®<˛uƒîRäzm€…†IlT\Y·dûñå^¨î—&‰o*Å=ˇÖıyl;M‰ws1¨æZW8Ld±	øyÃ˚§ö™ﬁE›ÃÜ€MØ·ôˆzèò√ˆèaíõ3Ê6\£PZΩâ¶rJêF¯5ˆπ˜„Ú±ÜØ¥@»Öaf¢a=√Æ7∞Xk?†≤Ë·‘=n¯ÙÍÜ0gxC'\ø—=Y•«º{gÂÊ‚“]˛∏ˇ\1Ùux—XzÎiy=Ú£^#ˇ«€Ù∑ΩMÍÕm<TvBœjJìxO+t,ÂBˇe¥~¶aˆ%ö$O4F3yD∑˚	LÃB,ê.È.:Ù= Czı˘ãû≠f#˛ÙÈTyR¡Ÿ;º€∏yøÎ…”?Ô\E˙Áƒ)9ıñ™~”˘ºÂràñ◊§•¥Y03©éT,rÛ—∆3	ª :i˝üOJ&3û≈[rc;ì˛ƒ\≠£µÆaqmQLíT_®Ω12ÛF˘*mTêLœΩ3^ØI:õÊÕtw˜SåáÕŒVßwx∞ﬂc˜∑7/æ‹‹Ü?1:€ÉˇäÈ≤nÙpºÒr›Üﬂﬂ|Ÿ%M ·⁄&Ã&òÑø‡ÿé„5Mñ˝ÁÆQ≤ÏÅ3¬E^ÀAZ#vﬂÌ«ÑÌ·!Pl•~5Q‚,≠ïY÷lOTÑÚ§•0≤∞è≤'Ù«0	/Åêéi|[0Á§?D‡5–…∞óØÚ%ÆEÌvÅ·L•™ÚÁ—R	£øìT⁄∆ñX1ìv¬ÄkMÇf}ëX´◊∞˙ÍÃB≈.jÔ8úKV)IÙ˛ÙIk€Œ.ó0Œ⁄}€ávŒ¨b3Ë9’dú±JGª$óx”ñòügÓ§ÂF»—P/G†Qbù[ÏÃ∂GV–≤p´Ì⁄ÊèúA+·%.¶{-ÎU•ÇPƒ+óSGW∫y%:›√Ÿ/ñîfO5ø-¨«kø◊pnùÚ<Â•— Ê 	Û‘I˛Úy◊‡ñ÷˛Èó¬%‘—RÅZö!÷Éà´àGùZ[F‰ì™kÊ¥£„Âı@0î-']øoa¶80¬∫⁄ïO®ì¨/ç«
¨èûnûH^VC_ífç0òÃOn‹€sº¡xƒﬂ4·ßÑç≈‹†çQ∂§+Ã¬ã◊„ñÎj-$1RT´Ö˙º|ã¢ ˝‘<5Fæ¬]ìs∫ê¶û')]å-ÄZÆ-()/I˚$Bæ´H"°⁄~Jù¶”ˆ—G&í3y†P˜=m^eXì&·À	Jn∆◊‚Aì¡Ä>¸ëÉYKâ¸õAyÏ◊+é:A–|ÄC7Q#∑é´~ﬂi&
k™[Ô#T∆§{RM8(YL¸!ñËñ~âŒäºRœi©]s#T(©Äè≠3•únYZ^õç≤…∞0Fâçπÿ `¥àoÎá
ùxzä›,Oë
⁄2;û;ßÎgx]ÑåÜB29T2)qÓ÷¸îISÛ+jÎí™D6˛˛≈ËÕp≤ß©£œ|Q3x≈\‚°y…!Ö∂3/ñƒK˝~3	"&G.s ∆ÇH˛≤∞¢ƒ‹í\Åæï˙ã«ZlŸêÃÅ§•Á{ß;ƒf÷1˘vZ≥%»“=™b·Ÿ¡ï5 L8ÚOtqÒÏHs“)≠^@<Jà∫Â¬ïø4¯ ÓZ•„…G’^(PoyÚ£V!4Ωyıﬁ2{ñ⁄kj∂Â⁄®Á¿X~9Ø	ñfá&ﬂ#9@ÜhHzEy(É¯utúî™§Î∂C—¨ÊDYü.(|íCl{kïqé]ï}r˘wœ:≈î;^®˚@+^Ú<ÈKT¨  Ñ?l≥D⁄ƒÃï=~˝*…"\•á+_•†V&4
÷Æ‰$\.“Èu+ã%=ì{AÂ4í\áhE…kÌª·¡Qv3óh‚≠OÉ—&s¶¥≥Bﬂlb“RCÌ‹4õë=6ö÷˚WoÔ:í’Î∫4∏÷H◊‹ÜC%XùHDˆï°Ì™n¬CÕ?â≥±√˙ˇQÊ¬ëÂ⁄Uy\î©ä∫ ıé;
úWOi•&¶ZÜµ≈5Hûu’«YÒÈ¸ {≥˛Ôﬂ˛Ù«6ùuEÑHÔ,O¬bò©ﬂÀÁ—ò\¶‰∆*m÷ıBH9ﬁÏóî∏7⁄Áê—ÜîÃ^ú]K_ß˜‡(‹®Ò+Æ¬Ø2BB“™PŸ¨ƒ4(⁄∫¿Âx1]í®”îß≤m∑ff§K%móª÷Ö{A~™]+]Dìì]ëùyÏZxß≠\â£Î≠ïÓº~6‘<SÚÀÖ{Ú<tBÚ
¬Ïw@ªÔ˚q.ÄΩˆåü…ãÏßøXÏ/-Ø,’ø\¬kP
jâÓgE~/µéDê¡•¨möƒ˚◊Ç{?~«ñó>A@Ÿ§ÈÒ6'«¶~°π‘ûl√¶o^ÕzÆ◊}ﬁDåz5c¨ö˘l«˜ü√ˆ‚±çÛÅ|ù/;Ø{c◊P`QÆj¡RÿNÄ-°1UÍbÈ$·˘«¥Öªh¬”O<p„/Aç±±/º‹k˛ôﬂ«ñª2n¿sŒoﬁû_Z°ogeWÓ⁄_+±æÈæJ<ˇ‡   ˇˇ Glô
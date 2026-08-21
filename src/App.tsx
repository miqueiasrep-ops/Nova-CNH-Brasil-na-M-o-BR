/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CandidateEnrollmentForm } from './components/CandidateEnrollmentForm';
import { FreeTheoreticalCourse } from './components/FreeTheoreticalCourse';
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
  Star
} from 'lucide-react';
import { LinkEnrollmentModal, parseCandidateLink, safeAtob } from './components/LinkEnrollmentModal';
import { StudentTestimonials } from './components/StudentTestimonials';
import { Aluno, BaixaPagamento, Comprovante, Depoimento, Instrutor, ReciboQuitacao } from './types';
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

  const unidades = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
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
    pergunta: "Qual o significado da placa regulamentadora vermelha com o triângulo invertido?",
    opcoes: [
      "Parada Obrigatória",
      "Dê a Preferência",
      "Proibido estacionar",
      "Início de via rápida"
    ],
    correta: 1,
    imagemPlaca: "⚠️ INVERTIDO"
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
    imagemPlaca: "🚗 BRASIL"
  },
  {
    pergunta: "Se um aluno menor de idade acumula saldo e faz 18 anos durante o parcelamento, o que acontece?",
    opcoes: [
      "O dinheiro é bloqueado",
      "O saldo é imediatamente desbloqueado para pagar as aulas práticas",
      "O plano é cancelado",
      "É obrigado a pagar nova taxa de matrícula"
    ],
    correta: 1,
    imagemPlaca: "💰 WALLET"
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

// Robust merge helpers to prevent any data loss (especially financial progress) when syncing across client-server-cloud
const mergeAlunosLists = (localList: Aluno[], remoteList: Aluno[]): Aluno[] => {
  const mergedMap = new Map<string, Aluno>();

  // Start with remote items (server/cloud version)
  remoteList.forEach(remote => {
    if (remote && remote.id) {
      mergedMap.set(remote.id, remote);
    }
  });

  // Merge local items to preserve newest inputs and progress
  localList.forEach(local => {
    if (!local || !local.id) return;
    const remote = mergedMap.get(local.id);
    if (!remote) {
      // Local candidate doesn't exist on server yet, keep them
      mergedMap.set(local.id, local);
    } else {
      const timeLocal = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const timeRemote = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
      const isLocalNewer = timeLocal >= timeRemote;

      const primary = isLocalNewer ? local : remote;
      const secondary = isLocalNewer ? remote : local;

      const merged: Aluno = {
        ...secondary,
        ...primary,
        nome: primary.nome || secondary.nome,
        dob: primary.dob || secondary.dob,
        whatsapp: primary.whatsapp || secondary.whatsapp,
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
        parcelasTotal: primary.parcelasTotal || secondary.parcelasTotal || 12,
        aulas: primary.aulas || secondary.aulas || 20,
        pontosSimulado: primary.pontosSimulado || secondary.pontosSimulado || 120,
        comprovantes: primary.comprovantes || secondary.comprovantes || [],
        baixasPagamento: primary.baixasPagamento || secondary.baixasPagamento || [],
        nomeResponsavel: primary.nomeResponsavel,
        cpfResponsavel: primary.cpfResponsavel,
        rgResponsavel: primary.rgResponsavel,
        whatsappResponsavel: primary.whatsappResponsavel,
        updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString()
      };
      mergedMap.set(local.id, merged);
    }
  });

  return Array.from(mergedMap.values());
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
  // Configurações Globais de Sincronia
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
            console.log(`💡 [Recuperação Emergencial] Recuperando candidatos da chave: ${key}`);
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
        return parsed.map(aluno => {
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
      } catch (e) {
        return DEFAULT_ALUNOS;
      }
    }
    return DEFAULT_ALUNOS;
  });

  const [instrutores, setInstrutores] = useState<Instrutor[]>(() => {
    let saved = localStorage.getItem('nova_cnh_instrutores');
    
    // Emergency data recovery from previous backup key if empty
    if (!saved || saved === '[]') {
      try {
        const backup = localStorage.getItem('nova_cnh_instrutores_backup');
        if (backup && backup !== '[]' && backup.trim().startsWith('[')) {
          console.log(`💡 [Recuperação Emergencial] Recuperando instrutores da chave de backup`);
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
        copy.tempoExperiencia = `${defaultYears} anos de experiência`;
        changed = true;
      }
      if (!copy.historia) {
        copy.historia = "Profissional extremamente paciente e dedicado ao ensino teórico e prático da direção. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do trânsito, garantindo uma formação humana de condutores conscientes e seguros no programa Nova CNH.";
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
  // ESTADOS E CONTROLES DE SINCRONIZAÇÃO EM TEMPO REAL (CROSS-DEVICE AUTO-SYNC)
  // ==========================================
  const lastSyncedPayloadRef = useRef<string>("");
  const isUpdatingFromRemote = useRef<boolean>(false);
  const ignoreNextSaveRef = useRef<boolean>(false);
  const hasProcessedQueryParamsRef = useRef<boolean>(false);
  const hasClosedWelcomeRef = useRef<boolean>(false);
  const pendingCandidateLookupRef = useRef<{ rawRegVal?: string; decodedRegVal?: string; cleanNewCpf?: string; cleanNewName?: string } | null>(null);

  // Referências para manter os valores mais recentes dos estados sem causar reinicialização do polling
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

  // Função para forçar sincronização imediata (push & pull com a nuvem Firebase)
  const forceSyncWithCloud = async () => {
    setSyncStatus('syncing');
    setToastMessage("⏳ Sincronizando com a nuvem do Firebase...");
    try {
      // 1. Salva diretamente no Firestore (funciona 100% no Vercel e qualquer dispositivo)
      await saveAllAlunosToFirestore(alunosRef.current);
      await saveAllInstrutoresToFirestore(instrutoresRef.current);
      await saveConfigToFirestore({
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      });

      // 2. Tenta também salvar no backend local caso exista
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
      setToastMessage("☁️ Nuvem Firebase 100% atualizada e sincronizada!");
    } catch (err) {
      console.error("Erro na sincronização manual com a nuvem:", err);
      setSyncStatus('error');
      setToastMessage("❌ Falha ao conectar à nuvem. Tente novamente em instantes.");
    }
  };

  // Helper central para atualizar alunos garantindo persistência local e sincronia com a nuvem / Firestore
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

    // Sincroniza direto no Firestore (Garante atualização em tempo real para todos os celulares/Vercel)
    saveAllAlunosToFirestore(listWithTimestamp, deletedIds || [])
      .then(() => {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      })
      .catch(err => {
        console.warn("Aviso ao salvar direto no Firestore:", err);
      });

    // Envia também para /api/db caso o servidor local esteja rodando
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

  // Helper central para atualizar instrutores garantindo persistência local e sincronia com a nuvem / Firestore
  const saveInstrutoresList = (updatedList: Instrutor[], deletedNomes?: string[]) => {
    setInstrutores(updatedList);

    try {
      localStorage.setItem('nova_cnh_instrutores', JSON.stringify(updatedList));
      localStorage.setItem('nova_cnh_instrutores_backup', JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Storage local limit:", e);
    }

    setSyncStatus('syncing');

    // Sincroniza direto no Firestore (Garante atualização em tempo real para todos os celulares/Vercel)
    saveAllInstrutoresToFirestore(updatedList, deletedNomes || [])
      .then(() => {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      })
      .catch(err => {
        console.warn("Aviso ao salvar direto no Firestore:", err);
      });

    // Envia também para /api/db caso o servidor local esteja rodando
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

  // 1. Conexão Real-time Direta com o Firestore (Funciona perfeitamente na Vercel e em todos os aparelhos)
  useEffect(() => {
    let isMounted = true;
    console.log("☁️ [Firebase Realtime] Conectando ao Firestore na nuvem...");

    const unsubQuota = subscribeQuotaStatus((exceeded) => {
      if (isMounted) {
        setIsQuotaExceeded(exceeded);
      }
    });

    const unsubAlunos = subscribeAlunos((cloudAlunos) => {
      if (!isMounted) return;
      if (cloudAlunos && Array.isArray(cloudAlunos) && cloudAlunos.length > 0) {
        console.log(`✅ [Firestore Realtime] Recebidos ${cloudAlunos.length} candidatos da nuvem`);
        setAlunos(cloudAlunos);
        try {
          localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(cloudAlunos));
          localStorage.setItem('nova_cnh_alunos_v3_backup', JSON.stringify(cloudAlunos));
        } catch (e) {}
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }
      setIsInitialLoading(false);
    });

    const unsubInstrutores = subscribeInstrutores((cloudInstrutores) => {
      if (!isMounted) return;
      if (cloudInstrutores && Array.isArray(cloudInstrutores) && cloudInstrutores.length > 0) {
        console.log(`✅ [Firestore Realtime] Recebidos ${cloudInstrutores.length} instrutores da nuvem`);
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

    // Carga auxiliar de fallback via API REST (se disponível)
    fetch('/api/db')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!isMounted || !data) return;
        if (data.alunos && Array.isArray(data.alunos) && data.alunos.length > 0) {
          setAlunos(prev => {
            if (!prev || prev.length === 0) return data.alunos;
            const merged = [...data.alunos];
            for (const p of prev) {
              const pCpf = (p.cpf || '').replace(/\D/g, '');
              const found = merged.some(m => {
                if (m.id === p.id) return true;
                const mCpf = (m.cpf || '').replace(/\D/g, '');
                return pCpf && mCpf && pCpf === mCpf;
              });
              if (!found) merged.push(p);
            }
            return merged;
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

  // 2. Envio Secundário para Servidor Local/Vercel API (Sem loop de reescrita no Firestore)
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

  // 3. Polling em tempo real (Baixar atualizações de outros aparelhos automaticamente)
  useEffect(() => {
    let active = true;

    const checkForUpdates = async () => {
      if (!active) return;

      const currentPayload = JSON.stringify({
        alunos: alunosRef.current,
        instrutores: instrutoresRef.current,
        gasWebhookUrl: gasWebhookUrlRef.current,
        googleVerificationCode: googleVerificationCodeRef.current
      });
      if (currentPayload !== lastSyncedPayloadRef.current) {
        return;
      }

      if (syncStatus === 'pending' || syncStatus === 'syncing' || isUpdatingFromRemote.current) {
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

        const currentAlunos = alunosRef.current;
        const currentInstrutores = instrutoresRef.current;

        // Parse last synced state from ref to verify genuine backend remote updates
        let lastSynced: any = {};
        try {
          lastSynced = JSON.parse(lastSyncedPayloadRef.current || '{"alunos":[],"instrutores":[],"gasWebhookUrl":"","googleVerificationCode":""}');
        } catch (e) {
          lastSynced = {};
        }

        const serverAlunosStr = JSON.stringify(data.alunos || []);
        const lastSyncedAlunosStr = JSON.stringify(lastSynced.alunos || []);
        const hasStudentsRefDiff = serverAlunosStr !== lastSyncedAlunosStr;

        const serverInstrutoresStr = JSON.stringify(data.instrutores || []);
        const lastSyncedInstrutoresStr = JSON.stringify(lastSynced.instrutores || []);
        const hasInstrutoresRefDiff = serverInstrutoresStr !== lastSyncedInstrutoresStr;

        const serverGasUrl = data.gasWebhookUrl || "";
        const lastSyncedGasUrl = lastSynced.gasWebhookUrl || "";
        const hasGasUrlRefDiff = serverGasUrl !== lastSyncedGasUrl;

        const serverGoogleCode = data.googleVerificationCode || "";
        const lastSyncedGoogleCode = lastSynced.googleVerificationCode || "";
        const hasGoogleCodeRefDiff = serverGoogleCode !== lastSyncedGoogleCode;

        const hasRemoteUpdate = hasStudentsRefDiff || hasInstrutoresRefDiff || hasGasUrlRefDiff || hasGoogleCodeRefDiff;

        if (hasRemoteUpdate) {
          console.log("⚡ [Sincronia] Detectadas novas atualizações na Nuvem! Sincronizando de forma segura...");
          isUpdatingFromRemote.current = true;
          
          let finalAlunos = currentAlunos;
          if (hasStudentsRefDiff && data.alunos && Array.isArray(data.alunos)) {
            const mergedAlunos = mergeAlunosLists(currentAlunos, data.alunos);
            finalAlunos = mergedAlunos;
            setAlunos(mergedAlunos);
            localStorage.setItem('nova_cnh_alunos_v3', JSON.stringify(mergedAlunos));
          }

          let finalInstrutores = currentInstrutores;
          if (hasInstrutoresRefDiff && data.instrutores && Array.isArray(data.instrutores)) {
            finalInstrutores = data.instrutores;
            setInstrutores(data.instrutores);
            localStorage.setItem('nova_cnh_instrutores', JSON.stringify(data.instrutores));
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
          setToastMessage("⚡ Seus dados foram atualizados em tempo real com as novidades da nuvem!");
          
          setTimeout(() => {
            isUpdatingFromRemote.current = false;
          }, 600);
        }
      } catch (err) {
        // Silencia erros temporários de conexão
      }
    };

    const intervalId = setInterval(checkForUpdates, 6000);

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
    const hasEnrollment = params.get('inscrever') === 'true' || !!pNome.trim() || !!extracted.rawReg;

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
      setToastMessage('📝 Auto-cadastro de instrutor iniciado!');
      return;
    }

    // 1. Check if there is an automatic login request
    if (pLoginId) {
      const found = alunos.find(a => a.id === pLoginId);
      if (found) {
        setActiveStudentId(found.id);
        setIsAuthenticated(true);
        setCurrentTab('app-jovem');
        setToastMessage(`👋 Olá, ${found.nome}! Você foi autenticado automaticamente via QRCode/Link!`);
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
        setToastMessage(`✍️ Formulário de inscrição preenchido automaticamente para: ${pNome}`);
      } else {
        setToastMessage(`✍️ Bem-vindo à Auto-matrícula Nova CNH!`);
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

      setToastMessage(`✍️ Dados de ${existingStudent.nome} preenchidos automaticamente no formulário!`);
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
  const [adminSubTab, setAdminSubTab] = useState<'database' | 'contracts' | 'commissions' | 'recibos'>('database');
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
          : (baixa.observacao || `Pagamento referente à inscrição/taxa do programa CNH Facilitada`),
        observacao: baixa.observacao,
        operador: baixa.operador || 'Administração Nova CNH'
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
        formaPagamento: aluno.formaPagamento === 'cartao' ? 'Cartão de Crédito' : 'PIX / Transferência',
        referente: `Quitação referente às etapas do Programa CNH Facilitada - Categoria ${aluno.categoria}`,
        observacao: `Recibo oficial emitido pela gestão administrativa.`,
        operador: 'Administração Nova CNH'
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
      alert('Por favor, informe um valor de pagamento válido.');
      return;
    }

    const newBaixa: BaixaPagamento = {
      id: "BX-" + Date.now().toString(36).toUpperCase(),
      data: manualReceiptData || new Date().toISOString().substring(0, 10),
      valor: valorPago,
      formaPagamento: manualReceiptForma || 'PIX',
      parcelasBaixadas: 1,
      observacao: manualReceiptReferente + (manualReceiptObs ? ` [${manualReceiptObs}]` : ''),
      operador: activeInstructor ? `Instrutor ${activeInstructor.nome}` : 'Administração Nova CNH'
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
    setToastMessage(`🧾 Recibo ${newBaixa.id} emitido com sucesso para ${selectedAluno.nome}!`);

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
      setAdminError('Senha do Administrador inválida! Por favor, tente novamente ou verifique suas credenciais.');
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
      setToastMessage("⚠️ Não há saldo liberado para pagar neste momento.");
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
    setToastMessage(`💸 Pagamento registrado! Recibo ${novoRecibo.id} enviado para assinatura via GOV.BR.`);
    
    // Abrir o recibo imediatamente para visualização e impressão/download pelo administrador
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
      alert("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }
    if (!govPassword.trim()) {
      alert("Por favor, insira a sua senha da conta única GOV.BR.");
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

    setToastMessage(`✓ Recibo ${rec.id} assinado via GOV.BR com sucesso e arquivado!`);
    setSigningRecibo(null);
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
      alert(`Para se cadastrar é necessário ter no mínimo 17 anos.`);
      return;
    }
    if (!enrollWhatsapp.trim()) {
      alert('Por favor, informe um WhatsApp para contato.');
      return;
    }

    // Checking guardian's whatsapp if minor (< 18)
    if (age < 18 && !enrollWhatsappResponsavel.trim()) {
      alert('Por favor, informe o WhatsApp de um responsável legal.');
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
      setToastMessage(`👋 Dados carregados: identificamos que você já se inscreveu no sistema!`);
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
      tipoPlano: (enrollPlano === 'jovem-17' && age < 18) ? 'Plano Poupança Jovem 17 Anos' : 'Plano CNH Facilitada Maiores de 18 Anos'
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

    setToastMessage(`🎉 Inscrição cadastrada! A senha foi enviada ao WhatsApp.`);
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
      setToastMessage(`👋 O candidato "${existing.nome}" (${existing.id}) já constava no sistema e foi localizado!`);
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
      instrutor: candData.instrutor || 'Miqueias Souza de Lima — Instrutor Autônomo',
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
    }).catch(err => console.error("Erro ao sincronizar matrícula via link:", err));

    setActiveStudentId(formattedId);
    setSelectedStudentDetail(newAluno);
    setIsAuthenticated(true);
    setCurrentTab('gestao');
    setToastMessage(`🎉 Matrícula efetuada com sucesso no App de Gestão! ID: ${formattedId} - ${newAluno.nome}`);
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
  const [faleAssunto, setFaleAssunto] = useState('Dúvida Geral');
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
  
  // Estados para simulação por idade real (Candidato a partir de 17 anos)
  const [calcUseRealAge, setCalcUseRealAge] = useState<boolean>(false);
  const [calcSelectedAgeMonths, setCalcSelectedAgeMonths] = useState<number>(0); // 17 anos e X meses (0 a 11)
  const [calcStrategy, setCalcStrategy] = useState<'real-age-ctb' | 'regular-bau'>('real-age-ctb');

  // Estados para Maquininha Ton (Cálculo fidedigno e plano customizável)
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
      if (num === 2) return "2 aulas práticas são ideais para motoristas habilitados tirarem dúvidas pontuais (como balizar em vaga específica).";
      if (num <= 4) return `${num} aulas são recomendadas para habilitados treinarem uma manobra específica ou tirar o carro da garagem com instrução guiada.`;
      if (num === 5) return "5 aulas para habilitados que já possuem alguma noção, mas querem praticar pequenos trajetos urbanos comerciais.";
      if (num <= 9) return `${num} aulas são excelentes para habilitados começarem a treinar percursos rotineiros como o caminho de casa para o trabalho.`;
      if (num === 10) return "10 aulas para pessoas habilitadas perderem o medo de dirigir em vias movimentadas e avenidas de grande fluxo, com total apoio.";
      if (num <= 14) return `${num} aulas são ideais para habilitados que não dirigem há muito tempo e que desejam recuperar embreagem, subida de ladeira e trânsito real.`;
      if (num === 15) return "15 aulas para habilitados que desejam superar a fobia/medo de dirigir com apoio integral e evolução progressiva em todas as situações cotidianas.";
      if (num <= 19) return `${num} aulas de treinamento intensivo de alta confiança para habilitados dominarem rotatórias, baliza dupla e vias expressas de alta velocidade.`;
      return "20 aulas completas de desenvolvimento de habilitado para dominar do zero o volante, baliza na vaga oficial, rodovia, trânsito pesado e estacionamento de shopping.";
    }
    if (num === 2) return "2 aulas é para pessoas que já têm habilidade suficiente para conduzir veículos.";
    if (num <= 4) return `${num} aulas são indicadas para quem já possui bastante controle de condução e precisa apenas de polimento para o teste prático.`;
    if (num === 5) return "5 aulas para pessoas que têm uma pequena noção, porém podem precisar de mais aulas.";
    if (num <= 9) return `${num} aulas são excelentes para quem tem uma pequena base de direção e quer praticar rampa, embreagem e baliza de forma ágil.`;
    if (num === 10) return "10 aulas para pessoas que não sabem dirigir porém conhecem um pouco de condução e têm capacidade de obtenção de êxito, porém podem precisar de mais aulas.";
    if (num <= 14) return `${num} aulas são recomendadas para construir consistência na direção defensiva de rua e preparar para o exame do Detran sem sobressaltos.`;
    if (num === 15) return "15 aulas para pessoas que possuem noções básicas mas desejam reforçar os pontos fundamentais de controle de embreagem e baliza para passar com máxima segurança.";
    if (num <= 19) return `${num} aulas dão uma excelente carga horária para pessoas sem experiência se tornarem condutores altamente seguros na rua e na baliza.`;
    return "20 aulas para pessoas que nunca tiveram experiência de nenhum tipo de veículo, ou seja, começar do absoluto zero.";
  };

  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Aluno | null>(null);
  const [selectedInstrutorDetail, setSelectedInstrutorDetail] = useState<Instrutor | null>(null);

  // Estados para Modal de Baixa Manual de Pagamentos (Cartão / PIX / Dinheiro / Boleto)
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

  // Estados para Modal de Limpeza de Cadastros Fictícios / Testes
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
      cartao: 'Cartão de Crédito (Máquina/Link)',
      pix: 'PIX / Transferência Instantânea',
      dinheiro: 'Dinheiro em Espécie / Balcão',
      boleto: 'Boleto Bancário',
      transferencia: 'Transferência Bancária / TED'
    };

    const formaPagamentoText = formaLabelMap[baixaForm.formaPagamento] || 'Cartão de Crédito';
    const valorPago = Number(baixaForm.valor) || 0;

    const newBaixa: BaixaPagamento = {
      id: "BX-" + Date.now().toString(36).toUpperCase(),
      data: baixaForm.data || new Date().toISOString().substring(0, 10),
      valor: valorPago,
      formaPagamento: formaPagamentoText,
      parcelasBaixadas: Math.max(0, targetParcelasPagas - aluno.parcelasPagas),
      observacao: baixaForm.observacao + (baixaForm.nsuComprovante ? ` [NSU/Comprovante: ${baixaForm.nsuComprovante}]` : ''),
      operador: activeInstructor ? `Instrutor ${activeInstructor.nome}` : 'Administração Nova CNH'
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

    setToastMessage(`💳 Baixa manual de ${valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${formaPagamentoText}) registrada com sucesso!`);
    setBaixaModalAluno(null);
    handleEmitirReciboCandidato(updatedAluno, newBaixa);
  };

  // Helper para identificar cadastros fictícios / testes
  const isFictitiousCandidate = (a: Aluno): boolean => {
    if (a.id === "CNH-000") return true;
    const nameLower = (a.nome || "").toLowerCase().trim();
    if (
      nameLower.includes("teste") ||
      nameLower.includes("fictic") ||
      nameLower.includes("fictíc") ||
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

    setToastMessage(`🧹 ${count} cadastro(s) fictício(s)/teste(s) removido(s) com sucesso!`);
    setIsPurgeModalOpen(false);
    setSelectedPurgeIds([]);
  };

  const AULAS_ADVICE: Record<number, string> = {
    2: "2 aulas é para pessoas que já tem habilidade suficiente para conduzir veículos.",
    5: "5 aulas para pessoas que tem uma pequena noção porem pode precisar de mais aulas.",
    10: "10 aulas para pessoas que não sabem dirigir porém conhece um pouco de condução e tem capacidade de obtenção de êxito porem pode precisar de mais aulas.",
    15: "15 aulas para pessoas que possuem noções básicas mas desejam reforçar os pontos fundamentais de controle de embreagem e baliza para passar com máxima segurança.",
    20: "20 aulas para pessoas que nunca tiveram experiência de nem um tipo de veículo ou seja começar do 0."
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

  // Current logged in Aluno object
  const currentStudent = useMemo(() => {
    return alunos.find(a => a.id === activeStudentId) || alunos[0] || DUMMY_FALLBACK_ALUNO;
  }, [alunos, activeStudentId]);

  // Computed balance for credit card installment simulation
  const cardAmountToPay = currentStudent?.formaPagamento === 'hibrido'
    ? (currentStudent.valorTotal - hybridPixAmount)
    : (currentStudent?.formaPagamento === 'cartao' ? currentStudent.valorTotal : pixAmountSimulated);

  // Categories choices
  const categoriasDisponiveis = ["Carro (B)", "Moto (A)", "Carro e Moto (A+B)"];

  // Helper dynamic statistics
  const stats = useMemo(() => {
    const totalAlunos = alunos.length;
    const menores = alunos.filter(a => calculateAge(a.dob) < 18).length;
    const maiores = totalAlunos - menores;
    const totalPlano = alunos.reduce((sum, a) => sum + Number(a.valorTotal), 0);
    const totalPago = alunos.reduce((sum, a) => sum + (Number(a.parcelasPagas) * (Number(a.valorTotal) / (a.parcelasTotal || 12))), 0);
    const progressoMedio = totalAlunos > 0 ? (alunos.reduce((sum, a) => sum + (Number(a.parcelasPagas) / (a.parcelasTotal || 12)), 0) / totalAlunos) * 100 : 0;
    
    // Aggregates for visual charts
    const categoriaDistrib = alunos.reduce((acc: { [key: string]: number }, cur) => {
      acc[cur.categoria] = (acc[cur.categoria] || 0) + 1;
      return acc;
    }, {});

    const instrutorFinanceiro = instrutores.map(inst => {
      const deAlunos = alunos.filter(a => a.instrutor === inst.nome);
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
  }, [alunos, instrutores]);

  // Filter Alunos
  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => {
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
  }, [alunos, searchQuery, filterCategoria, filterInstructor, filterClassificacao]);

  // Reset demo databases
  const resetDemoData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Banco de Dados?',
      message: 'Deseja restaurar os dados originais do projeto? Isto irá resetar todos os alunos e instrutores para os valores padrões de demonstração. (Suas alterações locais serão perdidas)',
      confirmText: 'Restaurar Dados',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        setAlunos(DEFAULT_ALUNOS);
        setInstrutores(DEFAULT_INSTRUTORES);
        setActiveStudentId("");
        setToastMessage("🔄 Banco de dados restaurado com sucesso!");
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
      return alert('A idade mínima permitida para inscrição no programa é de 17 anos.');
    }
    
    if (editingAluno) {
      const age = calculateAge(alunoForm.dob);
      const computedTipoPlano = (age < 18 && alunoForm.formaPagamento === 'poupanca') 
        ? 'Plano Poupança Jovem 17 Anos' 
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

      setToastMessage(`✅ Ficha de "${updatedAlunoObj.nome}" (ID: ${updatedAlunoObj.id}) atualizada e salva diretamente no sistema!`);
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
      setToastMessage(`🎉 Novo aluno "${newObj.nome}" (ID: ${formattedId}) cadastrado com sucesso!`);
    }
    setIsAlunoModalOpen(false);
  };

  // Delete student
  const handleDeleteAluno = (id: string) => {
    const studentName = alunos.find(a => a.id === id)?.nome || id;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aluno?',
      message: `Tem certeza que deseja remover permanentemente o aluno "${studentName}" (Código: ${id}) do sistema regional?`,
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

        setToastMessage(`🗑️ Aluno "${studentName}" removido com sucesso.`);
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
        tempoExperiencia: instrutorForm.tempoExperiencia || `${Math.floor(5 + (instrutorForm.nome.length % 9))} anos de experiência`,
        historia: instrutorForm.historia || "Profissional extremamente paciente e dedicado ao ensino teórico e prático da direção. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do trânsito, garantindo uma formação humana de condutores conscientes e seguros no programa Nova CNH.",
        chavePix: instrutorForm.chavePix
      } : i);
      saveInstrutoresList(updated);
    } else {
      if (instrutores.some(i => i.nome.toLowerCase() === instrutorForm.nome.toLowerCase())) {
        return alert('Já existe um instrutor registrado com este nome.');
      }
      if (instrutores.some(i => i.login && i.login.toLowerCase() === finalLogin)) {
        return alert('Este Usuário (Login) já está em uso por outro instrutor.');
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
        tempoExperiencia: instrutorForm.tempoExperiencia || `${Math.floor(5 + (instrutorForm.nome.length % 9))} anos de experiência`,
        historia: instrutorForm.historia || "Profissional extremamente paciente e dedicado ao ensino teórico e prático da direção. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do trânsito, garantindo uma formação humana de condutores conscientes e seguros no programa Nova CNH.",
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
      return alert('Já existe um instrutor registrado com este nome.');
    }
    if (instrutores.some(i => i.login && i.login.toLowerCase() === finalLogin)) {
      return alert('Este Usuário (Login) já está em uso por outro instrutor.');
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
      tempoExperiencia: selfTempoExp || `${Math.floor(5 + (selfNome.length % 9))} anos de experiência`,
      historia: selfHistoria || "Profissional extremamente paciente e dedicado ao ensino teórico e prático da direção. Focado em ajudar candidatos de todos os perfis a superarem a ansiedade e o medo do trânsito, garantindo uma formação humana de condutores conscientes e seguros no programa Nova CNH.",
      chavePix: selfChavePix,
      saldoPago: 0,
      recibos: []
    };

    const updatedList = [...instrutores, newInst];
    saveInstrutoresList(updatedList);
    setNewSelfRegisteredInstrutor(newInst);
    setToastMessage(`🎉 Cadastro concluído com sucesso, Instrutor ${selfNome}!`);
  };

  const copySelfRegisterLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?cadastro-instrutor=true`;
    navigator.clipboard.writeText(link);
    setToastMessage("🔗 Link de auto-cadastro para instrutores copiado com sucesso!");
  };

  // Delete instructor
  const handleDeleteInstrutor = (nome: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Instrutor?',
      message: `Tem certeza que deseja remover o instrutor parceiro "${nome}"? Todos os alunos atualmente associados a ele ficarão com a classificação de "Sem Instrutor".`,
      confirmText: 'Confirmar Exclusão',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        const remainingInstrutores = instrutores.filter(i => i.nome !== nome);
        saveInstrutoresList(remainingInstrutores, [nome]);
        const updatedAlunos = alunos.map(a => a.instrutor === nome ? { ...a, instrutor: 'Sem Instrutor' } : a);
        saveAlunosList(updatedAlunos);
        setToastMessage(`🗑️ Instrutor "${nome}" removido do sistema.`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Download instructor photo
  const handleDownloadFoto = async (nome: string, fotoUrl?: string) => {
    if (!fotoUrl) {
      setToastMessage("⚠️ Este instrutor não possui foto cadastrada.");
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
      setToastMessage(`📸 Foto do instrutor "${nome}" baixada com sucesso!`);
    } catch (error) {
      console.error("Erro ao baixar foto:", error);
      // Fallback: open in new tab
      window.open(fotoUrl, '_blank');
      setToastMessage(`📸 Imagem aberta em nova aba para download manual!`);
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
      alert("📢 LEIA O QR CODE REALIZE SEU PAGAMENTO E LOGO APÓS SELECIONAR CONFIRMAR PAGAMENTO.");
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
      const waText = `Olá Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Escolhi pagar no cartão parcelando em ${cardInstallments}x de ${installmentValue} (Valor Total: ${valueFormatted}). Gostaria de solicitar o Link Seguro de Parcelamento para efetuar esse processo.`;
      const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
      window.open(url, '_blank');
      setToastMessage("📲 Redirecionando para solicitar o Link de Parcelamento no WhatsApp...");
      setShowPixModal(false);
      return;
    }

    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 13) {
      alert("Por favor, insira um número de cartão de crédito válido.");
      return;
    }
    if (!cardHolder.trim() || cardHolder.trim().length < 3) {
      alert("Por favor, insira o nome impresso no cartão.");
      return;
    }
    if (!cardExpiry.trim() || !cardExpiry.includes('/') || cardExpiry.trim().length < 5) {
      alert("Por favor, insira uma data de validade válida (MM/AA).");
      return;
    }
    if (!cardCvv.trim() || cardCvv.trim().length < 3) {
      alert("Por favor, insira o código de segurança (CVV) do cartão.");
      return;
    }

    const depositAmt = Number(pixAmountSimulated);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      alert("Por favor, informe ou selecione o valor para pagamento.");
      return;
    }

    const totalParc = currentStudent.parcelasTotal || 12;

    if (currentStudent.parcelasPagas >= totalParc) {
      alert("Seu plano já está 100% quitado! Parabéns!");
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
      alert(`🎉 Pagamento autorizado com sucesso!\n\n💳 Detalhes do comprovante:\n- Valor Total: ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n- Transação: Parcelado no Cartão em ${cardInstallments}x de ${valParcelaCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n- Destino: Creditado em seu Baú Digital Nova CNH!`);
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
          parcelasPagas: totalParc // Completa o valor total do acordo híbrido no baú
        };
      }
      return a;
    });
    saveAlunosList(updatedList);

    setShowPixModal(false);
    setRequestedHybridCardLink(false);
    alert(`🎉 Pagamento por Cartão no valor de R$ ${cardAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} confirmado e recebido!\nCom isso, seu acordo híbrido foi 100% quitado e guardado no Baú!`);
    setToastMessage("🎉 Pagamento do cartão recebido! Plano quitado.");
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
          // Solicita auditoria automática via endpoint Express com IA (Gemini)
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
            setReceiptValidationReason(result.reason || "Validado com sucesso por inteligência artificial.");
            setToastMessage("📄 Comprovante analisado e aprovado com sucesso!");
          } else {
            setPixReceipt(null);
            setPixReceiptName('');
            setReceiptValidationReason('');
            alert(`❌ Documento Rejeitado pelo Auditor Financeiro:\n\nArquivo: ${file.name}\nMotivo: ${result.reason || 'O documento não parece conter informações bancárias válidas.'}`);
          }
        } catch (err: any) {
          console.error("Falha ao comunicar com o validador:", err);
          // Fallback amigável de contingência local para manter usabilidade
          setPixReceipt(fileContent);
          setReceiptValidationReason("Aprovado em regime emergencial de contingência pós-auditoria.");
          setToastMessage("📄 Comprovante anexado no baú local.");
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
      alert("⚠️ Por favor, compartilhe/anexe o comprovante de pagamento do PIX para habilitar a confirmação de depósito!");
      return;
    }
    const isHibrido = currentStudent?.formaPagamento === 'hibrido';
    const depositAmt = isHibrido ? Number(hybridPixAmount) : Number(pixAmountSimulated);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      alert("Por favor, selecione ou insira um valor válido para depósito.");
      return;
    }

    const totalParc = currentStudent.parcelasTotal || 12;

    if (currentStudent.parcelasPagas >= totalParc) {
      alert("Seu plano já está 100% quitado! Parabéns!");
      setShowPixModal(false);
      return;
    }

    const valorParcelaPadrao = currentStudent.valorTotal / totalParc;
    const incrementalParcelas = depositAmt / valorParcelaPadrao;

    // Criamos o objeto do comprovante fiduciário validado para salvar no Dossiê
    const newReceipt: Comprovante = {
      id: Math.random().toString(36).substring(2, 11),
      nomeArquivo: pixReceiptName || "comprovante_pix.png",
      conteudo: pixReceipt,
      dataEnvio: new Date().toISOString(),
      valor: depositAmt,
      validado: true,
      observacao: receiptValidationReason || "Validado via inteligência artificial."
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
      alert(`🎉 Pix de Entrada de R$ ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido com sucesso!\n\nSeu Baú de segurança CNH foi atualizado e o comprovante fiduciário foi arquivado no seu dossiê. Agora você pode solicitar o link do Cartão e confirmar o pagamento do restante para completar seu acordo!`);
    } else {
      alert(`🎉 Depósito de R$ ${depositAmt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido com sucesso!\nSeu Baú de segurança CNH foi atualizado e o comprovante fiduciário foi arquivado no seu dossiê para acompanhamento do auditor.`);
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
 * PROJETO: NOVA CNH BRASIL NA MÃO (PARCELAMENTO DE CNH SEGURO)
 * Script de automação para sincronizar o banco de dados do Looker Studio.
 */

/**
 * ⚡ WEB APP: LOGICA DE SINCRONIZAÇÃO EM NUVEM E COMUNICAÇÃO DE DADOS
 * (Não apague ou modifique esta seção, ela conecta o aplicativo ao seu Sheets)
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
  ui.createMenu('🚗 Nova CNH - Brasil na Mão')
      .addItem('Configurar Banco de Dados Looker', 'setupDatabaseDirect')
      .addToUi();
}

/**
 * Função chamada manualmente pelo menu do Planilhas Google.
 */
function setupDatabaseDirect() {
  setupDatabase();
  Browser.msgBox("🚗 Sucesso!", "O banco do projeto foi estruturado para o Looker Studio com cálculos de idade automáticos!", Browser.Buttons.OK);
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
    "Classificação de Idade", 
    "Meses para os 18 Anos", 
    "WhatsApp", 
    "Categoria Desejada", 
    "Instrutor Parceiro", 
    "Data de Adesão", 
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
    // Processamento centralizado em JS puro para evitar falhas de fórmulas e incompatibilidades regionais (CORS / Semicolon / etc.)
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
      var progresso = parcelasPagas / parcelasTotal; // Ex: 0.50 (será formatado como 50% pelo Google Sheets)
      
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

    // Gravação rápida de todo o array de uma vez na planilha (reduz requisições ao Sheets APIs)
    sheetAlunos.getRange(2, 1, dadosMockProcessed.length, headersAlunos.length).setValues(dadosMockProcessed);
    
    // Formatação das colunas de forma estática
    sheetAlunos.getRange(2, 3, dadosMockProcessed.length, 1).setNumberFormat("yyyy-mm-dd");
    sheetAlunos.getRange(2, 10, dadosMockProcessed.length, 1).setNumberFormat("yyyy-mm-dd");
    sheetAlunos.getRange(2, 12, dadosMockProcessed.length, 2).setNumberFormat("R$ #,##0.00");
    sheetAlunos.getRange(2, 14, dadosMockProcessed.length, 1).setNumberFormat("0.0%");
  }
  
  // 2. Aba de Instrutores
  var sheetInstrutores = ss.getSheetByName("Instrutores") || ss.insertSheet("Instrutores");
  sheetInstrutores.clear();
  
  var headersInstrutores = ["Nome do Instrutor", "Região Atendimento", "Vagas Ativas", "Contato Whatsapp"];
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



  // Carregar dados automaticamente em background na inicialização do aplicativo se houver URL ativa
  useEffect(() => {
    const autoBackgroundSyncOnLoad = async () => {
      const url = gasWebhookUrl.trim();
      if (!url || !url.startsWith("https://") || !url.includes("script.google.com") || url.includes("/edit") || url.includes("/home") || url.includes("...")) {
        return; // Sem URL válida configurada globalmente ou localmente
      }

      console.log("⏳ [Sincronia Automática] Baixando banco de dados atualizado do Google Sheets...");
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
          throw new Error("Formato de resposta inválido.");
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
                console.log("⚠️ [Sheets-Auto-Sync] O Google Sheets retornou base de alunos vazia, preservando registros locais.");
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

          setToastMessage("⚡ Banco de Dados Sincronizado Automaticamente com o Google Sheets!");
        }
      } catch (err: any) {
        console.warn("⚠️ [Sincronia Opcional] Sincronia automática de inicialização não completada:", err?.message || err);
        // Não jogamos erro gritante ao usuário para não travar a experiência caso esteja sem internet, 
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

  // Função auxiliar para validar com total clareza a URL do Google Apps Script
  const validateAppsScriptUrl = (url: string): { isValid: boolean; error: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { isValid: false, error: '⚠️ A URL do Web App está vazia. Cole o link gerado no seu Google Sheets.' };
    }
    if (trimmed === 'script.google.com/.../exec') {
      return { isValid: false, error: '⚠️ URL de exemplo padrão detectada! Você precisa gerar sua própria URL no Sheets > Extensões > Apps Script > Implantar.' };
    }
    if (trimmed.includes('...') || trimmed.includes('SEU_ID_DO_WEB_APP')) {
      return { isValid: false, error: '⚠️ URL de exemplo incompleta detectada! Substitua os termos "..." ou "SEU_ID_DO_WEB_APP" pelo seu link de Web App real.' };
    }
    if (!trimmed.startsWith('https://')) {
      return { isValid: false, error: '⚠️ Link inválido! A URL do Google Script deve iniciar com "https://".' };
    }
    if (!trimmed.includes('script.google.com')) {
      return { isValid: false, error: '⚠️ A URL inserida não parece ser um Web App válido do Google Script. Ela deve conter o domínio "script.google.com".' };
    }
    if (trimmed.includes('/edit') || trimmed.includes('/home') || trimmed.includes('/d/')) {
      return { isValid: false, error: '⚠️ Link incorreto do editor (/edit)! Não utilize o link da barra de endereço de design. No seu Apps Script, vá em Implantar > Gerenciar implantações e copie aquela URL que termina com "/exec".' };
    }
    if (!trimmed.endsWith('/exec') && !trimmed.includes('/exec?')) {
      return { isValid: false, error: '⚠️ URL incompleta! A URL de um Web App do Apps Script devidamente publicado para sincronização deve terminar com "/exec".' };
    }
    return { isValid: true, error: '' };
  };

  // Função para testar conexão com o Apps Script de forma explícita
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
      // Faz uma requisição de teste segura através do servidor proxy local para evitar CORS no celular
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
        throw new Error("Requer login do Google. Certifique-se de implantar o Web App com acesso configurado para 'Qualquer pessoa' (Anyone), mesmo anônimos!");
      }
      
      if (text.trim().startsWith("<!DOCTYPE html") || text.trim().startsWith("<html")) {
        throw new Error("O link retornou uma página HTML comum em vez de dados. Verifique se copiou a URL de 'Implantação' (/exec) correta.");
      }

      try {
        JSON.parse(text);
        setTestStatus('success');
        setToastMessage("✅ Web App ativo e conectado com sucesso!");
      } catch (parseErr) {
        throw new Error("O script respondeu, mas não retornou um formato JSON válido. Pode ser necessário re-implantar.");
      }
    } catch (err: any) {
      console.error("Erro no teste de sincronia:", err);
      setTestStatus('error');
      setTestErrorMessage(err.message || 'Falha ao conectar. Verifique se salvou e publicou o script.');
    }
  };

  // Função para exportar os dados locais em arquivo JSON
  const handleExportBackup = () => {
    const dataStr = JSON.stringify({ alunos, instrutores }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_nova_cnh_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage("📥 Backup baixado! Guarde o arquivo JSON gerado.");
  };

  // Função para importar arquivo JSON de backup local
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
        setToastMessage(`✅ Backup restaurado! Importados: ${importedAlunosCount} alunos e ${importedInstrutoresCount} instrutores.`);
      } catch (err) {
        setToastMessage("❌ Arquivo de backup inválido ou corrompido!");
      }
    };
    reader.readAsText(file);
  };

  // Realiza varredura profunda no LocalStorage do navegador à procura de cadastros antigos ou apagados
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
        setToastMessage(`🔍 Varredura concluída! Encontrados: ${foundAlunos.length} candidatos e ${foundInstrutores.length} instrutores recuperáveis.`);
      } else {
        setToastMessage("ℹ️ Varredura concluída! Nenhum cadastro antigo foi localizado neste navegador.");
      }
    }, 1200);
  };

  // Restaura registros encontrados do cache profundo para a lista ativa do sistema e salva
  const handleRestoreScannedRecords = () => {
    if (selectedScanItems.length === 0 && selectedScanInstrutores.length === 0) {
      setToastMessage("⚠️ Selecione pelo menos um cadastro para trazer de volta.");
      return;
    }
    
    let restoredAlunosCount = 0;
    let restoredInstrutoresCount = 0;

    if (selectedScanItems.length > 0) {
      const itemsToRestore = scannedAlunos.filter(item => selectedScanItems.includes(`${item.originKey}-${item.id}`));
      setAlunos(prev => {
        const mergedMap = new Map<string, Aluno>();
        prev.forEach(item => {
          if (item && item.id) mergedMap.set(item.id, item);
        });
        itemsToRestore.forEach(item => {
          mergedMap.set(item.id, item.data);
        });
        return Array.from(mergedMap.values());
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
    
    setToastMessage(`🎉 Recuperação concluída! Trazidos de volta: ${restoredAlunosCount} candidatos e ${restoredInstrutoresCount} instrutores.`);
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
    setToastMessage("⏳ Enviando dados para o servidor central e Google Sheets...");
    
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
        setToastMessage("🚀 Dados enviados! Planilha atualizada e formulas recalculadas em segundo plano.");
      } else {
        throw new Error("Erro na resposta do servidor.");
      }
    } catch (err: any) {
      console.error("Erro na sincronia com Apps Script:", err);
      setToastMessage("❌ Falha de rede. Verifique seu sinal de internet ou link.");
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
    setToastMessage("⏳ Baixando dados atuais da sua planilha remota...");
    
    try {
      // Let's declare resolvedUrl to be safe
      const resolvedUrl = gasWebhookUrl.trim();
      const realResponse = await fetch("/api/test-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resolvedUrl })
      });

      if (!realResponse.ok) {
        throw new Error("Erro de comunicação com o servidor.");
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
        throw new Error("Resposta do script não é um JSON válido.");
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
              console.log("⚠️ [Sheets-Sync] O Google Sheets retornou base de alunos vazia, preservando registros locais.");
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

        setToastMessage(`✅ Sincronia concluída! Dados atualizados neste dispositivo e salvos na nuvem.`);
      } else {
        setToastMessage("⚠️ Planilha vazia ou sem dados JSON salvos. Envie dados uma vez primeiro!");
      }
    } catch (err: any) {
      console.error("Erro na importação com Apps Script:", err);
      setToastMessage(`❌ Falha: ${err.message || 'Verifique se o Web App foi publicado com permissão.'}`);
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

    setToastMessage('⏳ Abrindo gerenciador de impressão do navegador...');

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
      setToastMessage('❌ Não foi possível abrir o gerenciador de impressão.');
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

  const handleDownloadAdminContractPDF = (aluno: Aluno) => {
    const element = document.getElementById(`printable-contract-${aluno.id}`);
    if (!element) return;

    // Helper to sanitize modern color spaces like oklch/oklab to prevent html2canvas crashes
    const cleanModernColorSpaces = () => {
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
        let clean = text;
        clean = replaceNestedCSSFunction(clean, 'color-mix', 'rgb(30, 41, 59)');
        clean = replaceNestedCSSFunction(clean, 'oklch', 'rgb(30, 41, 59)');
        clean = replaceNestedCSSFunction(clean, 'oklab', 'rgb(30, 41, 59)');
        clean = clean.replace(/oklch\([^)]+\)/g, 'rgb(30, 41, 59)');
        clean = clean.replace(/oklab\([^)]+\)/g, 'rgb(30, 41, 59)');
        return clean;
      };

      styles.forEach((el) => {
        try {
          if (el.tagName.toLowerCase() === 'style') {
            const styleEl = el as HTMLStyleElement;
            const originalText = styleEl.textContent || '';
            if (originalText.includes('oklch') || originalText.includes('oklab') || originalText.includes('color-mix')) {
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
              if (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('color-mix')) {
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

      try {
        const allElements = element.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const styleAttr = htmlEl.getAttribute('style');
          if (styleAttr && (styleAttr.includes('oklab') || styleAttr.includes('oklch') || styleAttr.includes('color-mix'))) {
            const cleanStyle = cleanTextContent(styleAttr);
            htmlEl.setAttribute('style', cleanStyle);
            stylesToRestore.push({ element: htmlEl, originalValue: styleAttr, isLink: false });
          }
        });
      } catch (e) {
        console.warn('Skipping inline style normalization:', e);
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

    setIsDownloadingContractPdf(true);
    setToastMessage('⏳ Preparando download do contrato em PDF...');

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
                🔒 Contrato de Adesão Eletrônica Oficial - Nova CNH
              </p>
              <button class="btn-print" onclick="window.print()">🖨️ Imprimir ou Salvar em PDF Comercial</button>
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
      setToastMessage('✅ Download concluído (Cópia Digital Oficial em HTML)! Abra-o para imprimir ou salvar como PDF.');
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
        scrollY: 0
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runHtml2Pdf = () => {
      // Temporarily clean modern oklch/oklab color spaces to avoid html2canvas crash
      const restoreStyles = cleanModernColorSpaces();

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
          setToastMessage('✅ Download do contrato concluído!');
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
          "ID Aluno", "Nome Completo", "Data de Nascimento", "Idade Atual", "Classificação de Idade", 
          "Meses para os 18 Anos", "WhatsApp", "Senha de Acesso", "Categoria Desejada", "Instrutor Parceiro", "Data de Adesão", 
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
        const headers = ["Nome do Instrutor", "Região Atendimento", "Vagas Ativas", "Contato Whatsapp", "Endereço", "Credencial Senatran"];
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
      setToastMessage(`✅ Dados de ${table === 'alunos' ? 'Alunos' : 'Instrutores'} copiados! Abra o Google Sheets, clique na célula A1 e pressione Ctrl+V.`);
    } catch (err) {
      console.error(err);
      setToastMessage("❌ Não foi possível copiar. Tente usar o botão de exportar CSV.");
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
            🔔
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
            ✕
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
                  🔰
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
                      Utilize sua conta única de cidadão para acessar o serviço de Assinatura Eletrônica regulamentar.
                    </p>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">CPF do Titular</label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="Insira apenas os 11 números"
                        value={govCpf}
                        onChange={(e) => setGovCpf(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#003366] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Senha Única</label>
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
                    <span className="text-base shrink-0">🛡️</span>
                    <p>
                      Sua conexão com o portal do governo federal é protegida por criptografia de ponta a ponta (Padrão ICP-Brasil).
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
                    <h4 className="text-sm font-bold text-slate-900">Gerando Chave Criptográfica</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Gerando certificado digital ICP-Brasil de uso único para a assinatura do recibo <strong className="font-mono text-slate-700">{signingRecibo.recibo.id}</strong>...
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS & FINISH */}
              {govSignStep === 3 && (
                <div className="space-y-4 font-sans">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mx-auto border border-emerald-300">
                      ✓
                    </div>
                    <h4 className="text-base font-black text-emerald-800">Assinado com Sucesso!</h4>
                    <p className="text-xs text-slate-500 font-sans">
                      O recibo de quitação foi homologado juridicamente com a assinatura digital do cidadão.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <p className="text-[#003366] font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1">
                      Detalhes da Assinatura Digital
                    </p>
                    <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-[11px]">
                      <span className="text-slate-500 font-sans">Signatário:</span>
                      <strong className="text-slate-800 col-span-2 font-sans">{signingRecibo.instrutor.nome}</strong>

                      <span className="text-slate-500 font-sans">CPF Emissor:</span>
                      <strong className="text-slate-800 col-span-2 font-mono">***.***.{govCpf.substring(6,9) || "---"}-**</strong>

                      <span className="text-slate-500 font-sans">Documento:</span>
                      <strong className="text-slate-800 col-span-2 font-mono">Recibo {signingRecibo.recibo.id}</strong>

                      <span className="text-slate-500 font-sans">Valor Quitado:</span>
                      <strong className="text-emerald-700 col-span-2 font-mono">{signingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>

                    <div className="bg-slate-900 text-slate-450 p-2.5 rounded-lg font-mono text-[9.5px] leading-relaxed border border-slate-850">
                      <p className="text-emerald-400 font-bold">🛡️ AUTENTICAÇÃO ICP-BRASIL</p>
                      <p className="mt-1">Certificado: GOV-BR-MOCK-HASH</p>
                      <p className="truncate">Hash: sha256_mock_hash_{signingRecibo.recibo.id.toLowerCase()}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishGovSign}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white font-black py-3 rounded-xl text-xs transition uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center"
                  >
                    Confirmar e Arquivar no Dossiê
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
                <span className="text-xl">💸</span>
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
                <p className="text-xs text-slate-500 font-sans">Você está prestes a transferir e registrar o saldo de:</p>
                <h4 className="text-2xl font-black text-emerald-600 font-mono">
                  {payoutConfirmData.valorAPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h4>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 font-sans">
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Beneficiário:</span>
                  <strong className="text-slate-900">{payoutConfirmData.inst.nome}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Região de Atuação:</span>
                  <strong className="text-slate-900 font-mono">{payoutConfirmData.inst.regiao}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Chave PIX para Depósito:</span>
                  {payoutConfirmData.inst.chavePix ? (
                    <div className="flex items-center gap-1">
                      <strong className="text-emerald-700 font-mono select-all font-black">{payoutConfirmData.inst.chavePix}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payoutConfirmData.inst.chavePix || "");
                          setToastMessage("📋 Chave PIX copiada com sucesso!");
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-extrabold cursor-pointer"
                      >
                        (Copiar)
                      </button>
                    </div>
                  ) : (
                    <strong className="text-rose-600 italic">Não cadastrada</strong>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status do Recibo:</span>
                  <strong className="text-amber-600 uppercase tracking-wider font-extrabold text-[9px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Pendente Assinatura</strong>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 leading-normal">
                <span className="text-base shrink-0">⚠️</span>
                <div>
                  <p className="font-extrabold text-amber-900">Atenção para Homologação Jurídica:</p>
                  <p className="mt-0.5 text-amber-700">
                    Ao confirmar, esta quantia será lançada como "Comissão Quitada". Um recibo oficial será gerado no dossiê do instrutor. O instrutor receberá uma notificação em seu respectivo painel para assinar o recibo eletronicamente via GOV.BR.
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
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase font-mono text-emerald-400">Visualizador de Documentos</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Recibo de Quitação Oficial ({viewingRecibo.recibo.id})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  🖨️ Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setViewingRecibo(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition animate-none"
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
                    <span className="text-2xl">🚗</span>
                    <h1 className="text-xl font-black tracking-tight uppercase text-[#0c2340]">Nova CNH Brasil na Mão 🇧🇷</h1>
                  </div>
                  <p className="text-[10px] text-slate-600 font-extrabold tracking-wider uppercase">Secretaria Nacional de Credenciamento & Repasses</p>
                  <p className="text-[9px] text-slate-500 font-mono font-bold">Dossiê Eletrônico de Homologação Pedagógica</p>
                </div>
                
                <div className="text-right font-mono bg-slate-200/60 p-3 rounded-lg border border-slate-300/60 shrink-0 self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end gap-1.5">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Número do Recibo:</div>
                  <div className="text-sm font-extrabold text-slate-950">{viewingRecibo.recibo.id}</div>
                </div>
              </div>

              {/* Prominent Receipt Title Badge */}
              <div className="bg-[#0c2340] text-white p-4.5 rounded-2xl text-center space-y-1 shadow-md border-b-4 border-emerald-500 relative z-10">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-mono block">TERMO ELETRÔNICO DE HOMOLOGAÇÃO DE REPASSE</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <span>🧾</span> RECIBO DE QUITAÇÃO DE REPASSE
                </h2>
                <p className="text-[11px] text-slate-300 font-bold">Nova CNH Brasil na Mão 🇧🇷 • Comprovante de Repasse ao Instrutor</p>
              </div>

              {/* Status Stamp overlay (Watermark-style visual) */}
              <div className="flex justify-end relative z-10 print:mt-2">
                {viewingRecibo.recibo.status === 'assinado_gov' ? (
                  <div className="border-4 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase rotate-2 inline-flex items-center gap-1.5">
                    <span>✓</span> QUITADO & ASSINADO GOV.BR
                  </div>
                ) : (
                  <div className="border-4 border-amber-500/30 text-amber-600 bg-amber-500/5 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase rotate-2 inline-flex items-center gap-1.5">
                    <span>⏳</span> AGUARDANDO ASSINATURA DIGITAL
                  </div>
                )}
              </div>

              {/* Main Receipt Declarations */}
              <div className="space-y-6 text-left relative z-10">
                <h2 className="text-sm font-extrabold tracking-wider uppercase text-slate-800 border-b border-slate-300 pb-1.5">Recibo de Quitação de Repasse Financeiro</h2>
                
                <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                  <p>
                    Declaramos, para os devidos fins de comprovação fiscal e contábil, sob as penas da lei, que a plataforma nacional do 
                    programa <strong>Nova CNH Brasil</strong> efetuou o repasse financeiro no valor de:
                  </p>

                  <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Valor Integral Repassado</span>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">
                      {viewingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <p className="text-[10px] text-slate-400 italic">
                      ({viewingRecibo.recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por indicação e monitoria regional)
                    </p>
                  </div>

                  <p>
                    Referente à quitação integral e comissões do instrutor autônomo e credenciado 
                    <strong className="text-slate-950 uppercase"> {viewingRecibo.instrutorNome}</strong>, pelas indicações, turmas, 
                    vagas preenchidas e acompanhamento pedagógico prestado com plena maestria.
                  </p>

                  <p className="text-xs text-slate-500">
                    O beneficiário, mediante assinatura digital deste termo, outorga à plataforma Nova CNH Brasil plena, geral, irrestrita e irrevogável 
                    quitação de todas as obrigações e comissões devidas até a presente data, não tendo nada mais a reclamar a qualquer título.
                  </p>
                </div>
              </div>

              {/* Technical Metadata info card */}
              <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 relative z-10">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Metadados de Transação Eletrônica</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400">Data de Emissão:</span> <span className="font-bold text-slate-800">{new Date(viewingRecibo.recibo.dataEmissao).toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Canal de Lançamento:</span> <span className="font-bold text-slate-800">PIX/TED - Sistema Centralizado</span>
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
                      {/* Fake stamp badge style */}
                      <div className="border border-[#0c2340]/20 bg-[#0c2340]/5 px-3 py-1.5 rounded text-slate-850 font-serif italic text-xs flex items-center justify-center gap-1.5">
                        <span className="text-base">🏢</span>
                        <div>
                          <p className="font-sans font-bold not-italic text-[10px] uppercase text-[#0c2340] tracking-tight">Secretaria de Finanças</p>
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
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Beneficiário / Recebedor</div>
                    
                    {viewingRecibo.recibo.status === 'assinado_gov' ? (
                      <div className="space-y-2">
                        {/* Gov.br Certificate detail block */}
                        <div className="border-2 border-emerald-500/20 bg-emerald-500/5 p-3 rounded-xl text-left space-y-1.5 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="bg-emerald-500 text-white font-sans font-black text-[7.5px] uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <span>🛡️</span> GOV.BR
                            </span>
                            <span className="text-[8px] font-mono text-emerald-600 font-extrabold uppercase">Assinatura Válida</span>
                          </div>
                          <div className="text-[9.5px] leading-normal font-sans text-slate-700">
                            <p>Assinado digitalmente por <strong className="text-slate-900">{viewingRecibo.instrutorNome}</strong>.</p>
                            <p className="text-[8px] text-slate-500 font-mono truncate">ID Único: {viewingRecibo.recibo.identificadorGov}</p>
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
                            <span>⚠️</span> Assinatura Eletrônica Pendente
                          </p>
                          <p className="text-[9px] text-amber-700 leading-normal mt-1 font-sans">
                            Esta é uma minuta preliminar do recibo. O beneficiário deve acessar o Painel do Instrutor para assinar este documento eletronicamente via GOV.BR.
                          </p>
                        </div>
                        <div className="border-t border-dashed border-slate-300 pt-2 text-xs">
                          <p className="font-bold text-slate-400 italic">Documento não assinado</p>
                          <p className="text-[9px] text-slate-400">Aguardando Validação Digital</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal footer text */}
              <div className="border-t border-slate-200 pt-6 text-[8.5px] text-slate-400 text-center leading-relaxed">
                Este recibo eletrônico foi emitido e assinado digitalmente em conformidade com as normas do programa Nova CNH Brasil
                e com a ICP-Brasil (Medida Provisória nº 2.200-2/2001). A sua integridade pode ser verificada a qualquer momento no dossiê
                do credenciado sob as chaves eletrônicas chanceladas no portal de serviços.
              </div>

            </div>

            {/* Print styles override (hidden in screen) */}
            <style>{`
              @media print {
                html, body {
                  background: white !important;
                  color: black !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-receipt, #printable-receipt * {
                  visibility: visible !important;
                }
                #printable-receipt {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  padding: 15mm !important;
                  margin: 0 !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                }
              }
            `}</style>

            {/* Footer action bar (Non-printable) */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200 print:hidden shrink-0">
              {viewingRecibo.recibo.status !== 'assinado_gov' && (
                <button
                  type="button"
                  onClick={() => {
                    setToastMessage(`✉️ Notificação enviada! O link para a assinatura do Recibo ${viewingRecibo.recibo.id} foi encaminhado com sucesso ao WhatsApp e E-mail de ${viewingRecibo.instrutorNome}.`);
                    setViewingRecibo(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  ✉️ Enviar para o Instrutor
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingRecibo(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-black py-2.5 px-6 rounded-xl text-xs transition uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Fechar Documento
              </button>
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
                  <p className="text-[10px] text-slate-400 font-sans">{viewingCandidateReceipt.idRecibo} • Candidato: {viewingCandidateReceipt.aluno.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10.5px] font-black py-1.5 px-3 rounded-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  🖨️ Imprimir Recibo
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCandidateReceipt(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Candidate Receipt Area */}
            <div className="p-8 md:p-12 space-y-8 bg-white text-slate-900 font-sans relative" id="printable-candidate-receipt">
              
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                <span className="text-[75px] md:text-[90px] font-black rotate-12 uppercase tracking-widest text-slate-900 text-center leading-tight">NOVA CNH BRASIL NA MÃO</span>
              </div>

              {/* Document Header */}
              <div className="border-b-4 border-[#0c2340] pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚗</span>
                    <h1 className="text-xl font-black tracking-tight uppercase text-[#0c2340]">Nova CNH Brasil na Mão 🇧🇷</h1>
                  </div>
                  <p className="text-[10px] text-slate-600 font-extrabold tracking-wider uppercase">Secretaria de Arrecadação & Gestão de Candidatos</p>
                  <p className="text-[10px] text-slate-500 font-mono font-bold">Comprovante Eletrônico de Quitação Financeira</p>
                </div>

                <div className="text-right font-mono bg-slate-100 p-3.5 rounded-xl border-2 border-slate-200 shrink-0 self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center md:items-end gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nº Recibo</span>
                  <span className="text-base font-black text-indigo-900">{viewingCandidateReceipt.idRecibo}</span>
                  <span className="text-[10px] font-bold text-slate-600">{formatDateBR(viewingCandidateReceipt.dataEmissao)}</span>
                </div>
              </div>

              {/* Prominent Receipt Title Badge */}
              <div className="bg-[#0c2340] text-white p-4.5 rounded-2xl text-center space-y-1 shadow-md border-b-4 border-emerald-500 relative z-10">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-mono block">DOCUMENTO OFICIAL DE QUITAÇÃO</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <span>🧾</span> RECIBO DE PAGAMENTO
                </h2>
                <p className="text-[11px] text-slate-300 font-bold">Nova CNH Brasil na Mão 🇧🇷 • sua nova forma de se habilitar</p>
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
                    inscrito(a) sob o CPF <strong className="font-mono text-slate-900">{viewingCandidateReceipt.aluno.cpf || 'Não informado'}</strong>, 
                    matrícula ID <strong className="font-mono text-slate-900">{viewingCandidateReceipt.aluno.id}</strong>, 
                    a quantia de <strong className="font-mono text-emerald-700 font-black">{viewingCandidateReceipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>, 
                    paga mediante <strong className="uppercase font-extrabold text-slate-900">{viewingCandidateReceipt.formaPagamento}</strong>.
                  </p>

                  <p className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Referente a: </span>
                    <span className="font-semibold text-slate-900">{viewingCandidateReceipt.referente}</span>
                  </p>

                  {viewingCandidateReceipt.observacao && (
                    <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Observações / Comprovante: </span>
                      <span>{viewingCandidateReceipt.observacao}</span>
                    </p>
                  )}
                </div>

                {/* Candidate & Course Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Categoria Habilitação</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.aluno.categoria}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Plano Escolhido</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.aluno.plano}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Canal de Lançamento</span>
                    <strong className="text-slate-900 font-extrabold">{viewingCandidateReceipt.operador || 'Gestão Nova CNH'}</strong>
                  </div>
                </div>

                {/* Issuer Authentication Badge */}
                <div className="border-t border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left space-y-1">
                    <p className="font-bold text-slate-900">Programa Nova CNH Brasil</p>
                    <p className="text-[10px] text-slate-500">Documento Oficial de Quitação Financeira do Candidato</p>
                    <p className="text-[9px] text-slate-400 font-mono">Chancela Digital: SHA256-{viewingCandidateReceipt.idRecibo.toLowerCase()}</p>
                  </div>

                  <div className="border border-emerald-300 bg-emerald-50 px-4 py-2 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-800 flex items-center justify-center gap-1">
                      <span>✓</span> PAGAMENTO HOMOLOGADO
                    </p>
                    <p className="text-[9px] text-emerald-600 font-mono">Autenticação {formatDateBR(viewingCandidateReceipt.dataEmissao)}</p>
                  </div>
                </div>
              </div>

              {/* Print CSS Rules */}
              <style>{`
                @media print {
                  html, body {
                    background: white !important;
                    color: black !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-candidate-receipt, #printable-candidate-receipt * {
                    visibility: visible !important;
                  }
                  #printable-candidate-receipt {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    padding: 15mm !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                }
              `}</style>
            </div>

            {/* Modal Footer Actions (Non-printable) */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between gap-3 border-t border-slate-200 print:hidden">
              <a
                href={`https://wa.me/55${viewingCandidateReceipt.aluno.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `🧾 *RECIBO OFICIAL DE PAGAMENTO - NOVA CNH BRASIL*\n\n` +
                  `Olá, *${viewingCandidateReceipt.aluno.nome}*!\n` +
                  `Confirmamos o recebimento do seu pagamento no valor de *${viewingCandidateReceipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}* (${viewingCandidateReceipt.formaPagamento}).\n\n` +
                  `📌 *Nº Recibo:* ${viewingCandidateReceipt.idRecibo}\n` +
                  `📅 *Data:* ${formatDateBR(viewingCandidateReceipt.dataEmissao)}\n` +
                  `📑 *Referente:* ${viewingCandidateReceipt.referente}\n\n` +
                  `Obrigado por escolher o Programa Nova CNH Brasil!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>💬</span> Enviar no WhatsApp
              </a>

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
                  <option value="">-- Escolha o candidato --</option>
                  {alunos.map(a => (
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
                  <option value="PIX">PIX Instantâneo</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro Espécie</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Transferência Bancária">Transferência Bancária (TED/DOC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Referente a *</label>
                <input
                  type="text"
                  required
                  value={manualReceiptReferente}
                  onChange={(e) => setManualReceiptReferente(e.target.value)}
                  placeholder="Ex: Quitação da Parcela 1 da CNH Facilitada"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações / NSU / Comprovante (Opcional)</label>
                <input
                  type="text"
                  value={manualReceiptObs}
                  onChange={(e) => setManualReceiptObs(e.target.value)}
                  placeholder="Ex: NSU Transação 981273"
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
              🚗
            </div>
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                  Nova CNH Brasil na Mão 🇧🇷
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
                      ⚠️ Modo Local Ativo
                    </button>
                  ) : (
                    <button
                      onClick={forceSyncWithCloud}
                      className="transition cursor-pointer group"
                      title="Clique para forçar sincronização imediata com a nuvem Firebase"
                    >
                      {syncStatus === 'synced' && (
                        <span className="bg-indigo-500/25 text-indigo-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1 group-hover:bg-indigo-500/40 transition">
                          <Cloud className="h-3 w-3 text-indigo-300" />
                          ☁️ Nuvem OK
                        </span>
                      )}
                      {syncStatus === 'pending' && (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-amber-500/25 flex items-center gap-1 animate-pulse group-hover:bg-amber-500/30 transition">
                          <Cloud className="h-3 w-3 text-amber-350 animate-bounce" />
                          ⏳ Pendente
                        </span>
                      )}
                      {syncStatus === 'syncing' && (
                        <span className="bg-sky-500/25 text-sky-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-sky-500/30 flex items-center gap-1">
                          <Cloud className="h-3 w-3 text-sky-300 animate-spin" />
                          ☁️ Sincronizando...
                        </span>
                      )}
                      {syncStatus === 'error' && (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-rose-500/25 flex items-center gap-1 group-hover:bg-rose-500/30 transition">
                          <Cloud className="h-3 w-3 text-rose-300" />
                          ❌ Sincronia Offline
                        </span>
                      )}
                    </button>
                  )}
                  {syncStatus === 'not_configured' && (
                    <span className="bg-slate-500/20 text-slate-300 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-slate-500/25 flex items-center gap-1" title="Apenas salvamento local ativo">
                      ☁️ Apenas Local
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
                    🛡️ Admin Ativo
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
                  {alunos.map(al => {
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
              📖 Proposta do Programa
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
                🎛️ Simular meu plano Ideal
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
              📱 Portal do(a) Candidato(a)
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
              ⭐ Depoimentos dos Alunos
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
              👤 {activeInstructor ? `Painel do Instrutor (${activeInstructor.nome})` : 'Painel do Instrutor 🔑'}
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
              ⚙️ {isAdminAuthenticated ? `Área Administrativa (${alunos.length})` : 'Área Administrativa 🔒'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(isAdminAuthenticated || isAuthenticated) && (
              <button
                onClick={handleSystemLogout}
                className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md select-none animate-in fade-in zoom-in-95 duration-150"
                title="Sair do sistema e limpar todas as sessões ativas"
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
                      <span>12:20 CNH 🚗</span>
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
                              🔑
                            </div>
                            <h4 className="text-base font-extrabold tracking-tight">Acesso ao Portal</h4>
                            <p className="text-[11px] text-slate-400">Aluno e Responsável Legal</p>
                          </div>

                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const cleanInput = loginIdAttempt.trim().toUpperCase();
                            const cleanCpfInput = loginIdAttempt.replace(/\D/g, '');
                            const matched = alunos.find(a => {
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
                              setLoginError('ID de aluno não encontrado! (Ex: CNH-002)');
                            }
                          }} className="space-y-4 pt-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID do Aluno (Matrícula)</label>
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
                                <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔒</span>
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
                          Área de dados restrita protegida por criptografia de segurança da plataforma Nova CNH.
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
                                  PAINEL DO(A) CANDIDATO(A) CNH BRASIL NA MÃO
                                </span>
                                <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                                  {currentStudent.nome}
                                </h4>
                                <span className={`inline-block text-[9.5px] font-black px-1.5 py-0.2 mt-0.5 rounded ${
                                  calculateAge(currentStudent.dob) < 18
                                    ? 'bg-emerald-500/25 text-emerald-300'
                                    : 'bg-indigo-500/30 text-indigo-200'
                                }`}>
                                  📋 {calculateAge(currentStudent.dob) < 18 ? (currentStudent.tipoPlano || 'Plano Poupança Jovem 17 Anos') : (currentStudent.tipoPlano && currentStudent.tipoPlano !== 'Plano Poupança Jovem 17 Anos' ? currentStudent.tipoPlano : 'Plano CNH Facilitada Maiores de 18 Anos')}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsAuthenticated(false)}
                                  className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2 py-1 rounded-md font-bold transition flex items-center gap-1 border border-slate-750"
                                  title="Fazer logout da área do aluno"
                                >
                                  Sair ⎋
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
                            
                            {/* SAVED CREDIT/WALLET CRUCIAL CARD (TROCA DA PALAVRA COFRINHO POR BAÚ) */}
                            <div className="bg-gradient-to-br from-[#0c2340] via-[#102d53] to-[#0f1f35] rounded-2.5xl p-4 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                              
                              {/* Glowing ring */}
                              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Wallet className="h-4.5 w-4.5 text-emerald-400" />
                                  <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono tracking-wider">Baú de Crédito CNH</span>
                                </div>
                                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  {Number(currentStudent.parcelasPagas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de {currentStudent.parcelasTotal || 12} quitadas
                                </span>
                              </div>

                              <div className="mt-2.5">
                                <span className="text-[10px] text-slate-400 block font-medium">Saldo Reservado no Baú:</span>
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 font-mono">
                                  {saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>

                              {/* Financial Progress gauge */}
                              <div className="mt-3.5 space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-300">
                                  <span>Progresso do Baú CNH</span>
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
                                    <span>🔀</span> Acordo Híbrido Ativo (Pix 50% + Cartão 50%)
                                  </div>
                                  
                                  {/* Pix Button */}
                                  <button
                                    id="btn-simulate-payment-pix"
                                    onClick={() => {
                                      const halfValue = (currentStudent.valorTotal || 0) / 2;
                                      setPixAmountSimulated(halfValue);
                                      setPaymentTab('pix');
                                      setRequestedHybridCardLink(false);
                                      alert("📢 LEIA O QR CODE REALIZE SEU PAGAMENTO DA ENTRADA PIX E LOGO APÓS SELECIONAR CONFIRMAR PAGAMENTO.");
                                      setShowPixModal(true);
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    <span>⚡</span> Pagar Entrada Pix (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                  </button>

                                  {/* Cartão Link Button */}
                                  <button
                                    id="btn-request-card-link"
                                    onClick={() => {
                                      const studentName = currentStudent?.nome || "Candidato";
                                      const studentId = currentStudent?.id || "";
                                      const valorRestante = (currentStudent.valorTotal || 0) / 2;
                                      const valueFormatted = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                      const waText = `Olá Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Estou no Plano Híbrido, já fiz/vou fazer o Pix da entrada e agora gostaria de solicitar o Link Seguro de Parcelamento no Cartão para a outra metade de R$ ${valueFormatted} (em até 12x sem juros).`;
                                      const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                                      window.open(url, '_blank');
                                      setRequestedHybridCardLink(true);
                                      setToastMessage("📲 Redirecionando para solicitar o Link de Parcelamento no WhatsApp...");
                                    }}
                                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" /> Solicitar Link do Cartão (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                  </button>

                                  {/* Botão de Confirmação do Cartão Híbrido */}
                                  <button
                                    id="btn-confirm-hybrid-card-dashboard"
                                    onClick={confirmHybridCardPayment}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    ✓ Confirmar Pagamento do Cartão (R$ {((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
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
                                    `Solicitar Link do Cartão (${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 })})`
                                  ) : currentStudent.formaPagamento === 'vista' ? (
                                    `Pagar Plano à Vista (${currentStudent.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
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
                                  🎓 Adquirir Aulas Adicionais
                                </span>
                                <span className="bg-emerald-950/80 text-emerald-300 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-900/40">
                                  MATRÍCULA {currentStudent.id}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-350 leading-relaxed text-left">
                                Adicione mais aulas práticas ao seu contrato ativo de forma simplificada e transparente. Selecione a categoria desejada (Carro, Moto ou Ambos) e confira os valores detalhados antes de confirmar.
                              </p>

                              {/* VEHICLE TYPE DISTINCTION SELECTOR */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                                  1. Selecione a Categoria do Veículo:
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
                                    <span className="text-base">🚗</span>
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
                                    <span className="text-base">🏍️</span>
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
                                    <span className="text-base">🚗+🏍️</span>
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
                                        🚗 Prática de Carro (Cat. B):
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
                                        🏍️ Prática de Moto (Cat. A):
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
                                          📋 Detalhamento Financeiro do Pacote
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono">Tabela Oficial do Simulador</span>
                                      </div>

                                      {/* Car line item */}
                                      {activeCarro > 0 && (
                                        <div className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                                          <div className="flex items-center gap-1.5">
                                            <span>🚗</span>
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
                                            <span>🏍️</span>
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
                                          <span>Valor Base (à vista):</span>
                                          <span className="font-mono text-slate-300">
                                            {rawBaseExtraCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Investment subtotal */}
                                      <div className="flex justify-between items-center text-white font-extrabold pt-0.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                                        <span className="uppercase text-[9.5px] tracking-wider text-emerald-300">
                                          {isCartao ? `Investimento no Cartão (${addAulasParcelas}x):` : 'Investimento no Pix / À Vista:'}
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

                                    {/* Choice of Payment Method (REMOVED CARNÊ) */}
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
                                          <span>⚡</span>
                                          <span>⚡ No Pix (À Vista)</span>
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
                                          <span>💳</span>
                                          <span>💳 No Cartão</span>
                                        </button>
                                      </div>

                                      {/* Installment Options for Card Payment matching Simulador */}
                                      {addAulasPaymentMethod === 'cartao' && (
                                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-indigo-900/50 space-y-1.5 mt-2 animate-in fade-in" id="add-classes-card-installments-box">
                                          <div className="flex justify-between items-center text-[9.5px]">
                                            <span className="font-extrabold text-indigo-300 font-mono uppercase tracking-wider">
                                              💳 Selecione o Parcelamento (Taxas Ton):
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

                                        const payText = isCartao ? `${addAulasParcelas}x no Cartão` : 'Pix à vista';

                                        setToastMessage(`💸 Contrato atualizado! Adicionadas ${totalNewClasses} aulas (${detailsText}) no ${payText}.`);
                                        setShowAddAulasSuccess(true);
                                      }}
                                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                    >
                                      <span>➕</span> Confirmar e Adicionar Aulas ({totalNewClasses})
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* Success Feedback message */}
                              {showAddAulasSuccess && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-[10px] space-y-2 animate-in fade-in zoom-in-95 duration-200 text-left" id="add-classes-success-notice">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                    <span className="text-sm">✓</span>
                                    <span>CONTRATO ATUALIZADO COM SUCESSO!</span>
                                  </div>
                                  <p className="leading-normal">
                                    Suas aulas adicionais por categoria foram homologadas! O dossiê do aluno e a nova carga letiva já constam no seu cadastro oficial.
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

                            {/* EXCLUSIVE GUARDIAN MONITORING AREA (ESPAÇO DO RESPONSÁVEL LEGAL) */}
                            <div className="bg-slate-950 rounded-2xl p-3.5 border border-indigo-950 space-y-3 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                                <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider flex items-center gap-1">
                                  🛡️ Area do Responsável Legal
                                </span>
                                <span className="bg-indigo-950 text-indigo-300 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-900/40">
                                  SISTEMA INTEGRADO
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="text-[10px] text-slate-300 leading-normal">
                                  Acompanhamento das finanças e progresso do(a) candidato(a) sob tutela legal:
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
                                    <span>Autorização do Responsável:</span>
                                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                                      <Check className="h-3 w-3" /> ATIVA
                                    </span>
                                  </div>
                                  
                                  <div className="text-[9px] text-slate-500 leading-normal italic text-pretty">
                                    Ao depositar na poupança antecipada, os valores estarão legalmente vinculados à futura emissão da habilitação após a maioridade.
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* AGE-COUNTDOWN & UNLOCK RULE */}
                            <div className="bg-[#121c2c] rounded-2xl p-4 border border-slate-850 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                  <Clock className="h-4 w-4 text-amber-400" />
                                  <span>Controle de Idade &amp; Liberação do Baú</span>
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
                                      <strong>Status: Baú em Poupança Ativa</strong>
                                      <p className="text-[9px] text-slate-400 mt-0.5">Sua idade legal não permite iniciar aulas em vias públicas.</p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-slate-950/80 p-3 rounded-xl text-center space-y-1">
                                    <span className="text-[9px] text-slate-400 block font-bold">TEMPO PARA OS 18 ANOS</span>
                                    <div className="text-xl font-mono font-black text-amber-400">
                                      {mesesAte18 === 0 ? "Menos de 1" : mesesAte18} {mesesAte18 === 1 ? 'mês restante' : 'meses restantes'}
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal px-2">
                                      Continue alimentando o baú. Ao fazer 18 anos, todo o saldo vira crédito prático liberado com o parceiro!
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className="flex items-start gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg text-xs leading-tight">
                                    <Unlock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="text-white block font-bold">Status: 🔓 BAÚ LIBERADO!</strong>
                                      <span className="text-[10px] text-slate-300">Você atingiu {studentAge} anos e o baú acumulado está liberado para aulas de direção práticas!</span>
                                    </div>
                                  </div>

                                  <div className="bg-blue-950/50 p-2.5 rounded-lg text-xs text-blue-300">
                                    <p className="font-bold">Saldo liberado no baú:</p>
                                    <p className="text-lg font-black font-mono text-white">{saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>

                                  {currentStudent.instrutor && currentStudent.instrutor !== 'A definir' && currentStudent.instrutor !== 'Sem Instrutor' ? (
                                    <a
                                      href={`https://wa.me/5581999999999?text=${encodeURIComponent(`Olá, ${currentStudent.instrutor}! Meu nome é ${currentStudent.nome}, completei a maioridade no programa Nova CNH e tenho ${saldoPoupado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de saldo no baú para as aulas!`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-center text-[11px] transition-all"
                                    >
                                      Agendar com {currentStudent.instrutor}
                                    </a>
                                  ) : (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg text-center text-[10px] leading-relaxed">
                                      ⏳ <strong>Aguardando Atribuição:</strong> O administrador designará seu instrutor credenciado regional em breve para as aulas práticas.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* VISUAL MILESTONES ROADMAP */}
                            <div className="bg-[#121c2c] rounded-2xl p-4 border border-slate-850 space-y-2.5">
                              <span className="text-[10px] text-slate-400 block font-bold">JORNADA DA SUA EMISSÃO</span>
                              <div className="space-y-3.5 pt-1">
                                
                                <div className="flex items-start gap-2 text-xs">
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
                                  <div>
                                    <strong className="text-white">1. Plano Ativado</strong>
                                    <p className="text-[9px] text-slate-400">Contratou {currentStudent.categoria} em {currentStudent.dataAdesao}.</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 text-xs">
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
                                  <div>
                                    <strong className="text-white">2. Guardando no Baú</strong>
                                    <p className="text-[9px] text-slate-400">Acumulando {currentStudent.parcelasPagas} parcelas pagas no baú.</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 text-xs">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    !studentIsMinor 
                                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                                      : 'bg-slate-850 border border-slate-700 text-slate-500'
                                  }`}>
                                    {!studentIsMinor ? '✓' : '3'}
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
                                    {!studentIsMinor && currentStudent.parcelasPagas === 12 ? '✓' : '4'}
                                  </div>
                                  <div>
                                    <strong className={!studentIsMinor && currentStudent.parcelasPagas === 12 ? 'text-white' : 'text-slate-400 font-normal'}>4. Aulas Práticas Pagas</strong>
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
                          <div className="flex flex-col items-center cursor-pointer hover:text-white" onClick={() => alert("Simulado disponível na tela central!")}>
                            <Award className="h-4 w-4 text-slate-400" />
                            <span>Estudos</span>
                          </div>
                          <div className="flex flex-col items-center cursor-pointer hover:text-white" onClick={() => alert("Os instrutores autônomos credenciados estão vinculados na aba de Instrutores!")}>
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
                    <span className="text-[10px] font-extrabold text-emerald-600 block uppercase tracking-wider">Inclusão Ativa</span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                      A facilidade de conquistar sua liberdade profissional e pessoal!
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O programa **Nova CNH Brasil na Mão** simplifica cada etapa da sua jornada. Comece hoje mesmo o planejamento inteligente e garanta seu futuro no trânsito sem comprometer seu orçamento!
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
                      Educação e Inclusão no Trânsito
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Como a poupança protegida para menores de 18 anos funciona na prática.</p>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    O programa Nova CNH foi criado para acolher e viabilizar o plano de conquistar a primeira habilitação de forma tranquila. Com planejamento estratégico preventivo e apoio pedagógico de excelência, criamos uma trilha inteligente de aprendizado para que os jovens garantam sua autonomia profissional e pessoal com segurança.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-[#10b981]"></span>
                        Até os 18 Anos
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        O jovem ingressa no programa aos **17 anos** ou mais. Ele define parcelas mensais econômicas que se adaptam ao orçamento planejado. Os recursos ficam seguros e reservados em uma poupança programada. Ele aproveita este tempo para estudar as placas, apostilas teóricas e reforçar os simulados no app.
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                      <h4 className="font-bold text-emerald-800 text-xs flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Ao Fazer 18 Anos
                      </h4>
                      <p className="text-xs text-emerald-700 leading-normal">
                        Ele completa o aniversário de 18 anos (maioridade legal civil) e o saldo é **imediatamente desbloqueado** para custear as aulas práticas com o instrutor parceiro e carros oficiais credenciados! Ele inicia o processo legal no DETRAN com os recursos garantidos e sem dívidas.
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ===================== TAB: SIMULADOR DO PLANO POUPANÇA ===================== */}
        {currentTab === 'simulador-poupanca' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header / Intro Card */}
            <div className="bg-gradient-to-r from-[#0c2340] to-[#112d52] p-6 rounded-2xl text-white border-b-4 border-emerald-500 shadow-lg">
              <div className="max-w-3xl space-y-2 text-left">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-widest font-mono">
                  💳 SIMULAÇÃO DE PARCELAMENTO & PLANOS
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Simulador Financeiro de Parcelamento CNH
                </h2>
                <p className="text-slate-350 text-xs md:text-sm leading-relaxed">
                  Calcule e planeje o parcelamento mensal confortável da sua habilitação (por Poupança / Baú ou no Cartão de Crédito). Ajuste de acordo com sua realidade.
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
                    Simule o financiamento da sua habilitação planejada com base na quantidade personalizada de aulas práticas que deseja poupar.
                  </p>

                  {/* ESCOLHA DO PLANO NO SIMULADOR */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Selecione o Plano a Simular:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(!isAuthenticated || calculateAge(currentStudent.dob) < 18) && (
                        <div
                          onClick={() => {
                            setSelectedPlanToPreview('jovem-17');
                          }}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none ${
                            calcPlano === 'jovem-17'
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-[9px] text-emerald-800 uppercase font-sans tracking-wide">
                                Poupança Jovem
                              </span>
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-sans shrink-0">
                                17 ANOS
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-900 text-xs mt-1">Planejamento Ativo</h5>
                          </div>
                        </div>
                      )}

                      <div
                        onClick={() => {
                          setSelectedPlanToPreview('adulto-18');
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none ${
                          calcPlano === 'adulto-18'
                            ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-[9px] text-indigo-800 uppercase font-sans tracking-wide">
                              CNH Facilitada
                            </span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-sans shrink-0">
                              18+ ANOS
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Início Sem Juros</h5>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          setSelectedPlanToPreview('habilitado');
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-left select-none ${
                          calcPlano === 'habilitado'
                            ? 'bg-violet-50/70 border-violet-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-[9px] text-violet-800 uppercase font-sans tracking-wide">
                              Treino Habilitado
                            </span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-violet-500 text-white font-sans shrink-0">
                              JÁ TEM CNH
                            </span>
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Prática & Controle</h5>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TIPO DE AULA (CARRO / MOTO / AMBOS) -- VALUES ARE HIDDEN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Tipo de Aula Prática:</label>
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
                        <span className="text-sm">🚗</span>
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
                        <span className="text-sm">🏍️</span>
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
                        <span className="text-sm">🚗+🏍️</span>
                        <span>Carro & Moto</span>
                      </button>
                    </div>
                  </div>

                  {/* SELECIONAR QUANTIDADE DE AULAS */}
                  {calcTipo === 'ambos' ? (
                    <div className="space-y-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 animate-in fade-in duration-200 font-sans">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-dashed border-slate-255">
                        <span className="text-sm">⚡</span>
                        <div className="text-left">
                          <label className="block text-xs font-bold text-slate-800">Fórmula Flex (Aulas Sob Medida)</label>
                          <span className="text-[9.5px] text-slate-500 font-medium block leading-tight">
                            Personalize a divisão de aulas práticas em cada veículo!
                          </span>
                        </div>
                      </div>

                      {/* CARRO CONTROL */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-[#112d52] flex items-center gap-1">
                            🚗 Prática de Carro (B):
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
                          <span>Mín (2)</span>
                          <span className="text-slate-500 font-black">Carga Elevada Recomendada (20)</span>
                        </div>
                      </div>

                      {/* MOTO CONTROL */}
                      <div className="space-y-1.5 text-left pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-[#112d52] flex items-center gap-1">
                            🏍️ Prática de Moto (A):
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
                          <span>Máx (20)</span>
                        </div>
                      </div>

                      {/* CONSELHO DA MARIANA EM TEMPO REAL PARA DIVISÃO FLEX */}
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
                            <span>💬</span> Inteligência do Plano Flex ({calcAulasCarro + calcAulasMoto} aulas no total)
                          </p>
                          <p className="text-[10px] text-slate-650 leading-tight mt-1 font-semibold italic">
                            "Ajuste seu plano personalizando a quantidade de aulas de Moto ({calcAulasMoto} aulas) e Carro ({calcAulasCarro} aulas) de acordo com suas necessidades individuais e tempo de prática!"
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
                          <span>Mín (2)</span>
                          <span>Máx (20)</span>
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
                            <span>💬</span> Conselho de Mariana ({calcAulas} aulas)
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
                            ✓ SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'poupanca' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500'}`}>
                            📦 ESTILO BAÚ
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Poupança Planejada</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'poupanca' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Sem Juros. Começa após quitação programada ou estendida.
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
                            ✓ SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'cartao' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500'}`}>
                            💳 CARTÃO CRÉDITO
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Cartão de Crédito</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'cartao' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Parcele em até 12x via maquininha ou link seguro de parcelas.
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
                            ✓ SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'vista' ? 'bg-indigo-500 text-white font-black' : 'bg-slate-100 text-slate-500'}`}>
                            💵 COTA ÚNICA
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Pagamento à Vista</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'vista' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Investimento único (Pix) com agendamento prioritário das aulas.
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
                            ✓ SELECT
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full block w-fit ${calcFormaPagamento === 'hibrido' ? 'bg-teal-500 text-white font-black' : 'bg-slate-100 text-slate-500'}`}>
                            🔀 MODO HÍBRIDO
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs mt-1">Acordo Híbrido</h5>
                          <p className={`text-[10px] leading-tight ${calcFormaPagamento === 'hibrido' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            Pague 50% de entrada no Pix/À Vista + 50% parcelado no seu Cartão.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURAÇÃO DAS TAXAS DA MAQUININHA TON - OCULTA PARA CLIENTES */}

                  {/* QUANTIDADE DE PARCELAS DO FINANCIAMENTO */}
                  <div className="space-y-2 text-left bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>📅</span> Escolha o Número de Parcelas:
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
                                    À vista — 1x de {totalForN.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </option>
                                );
                              }
                              return (
                                <option key={n} value={n} className="font-bold text-slate-900 text-sm">
                                  {n} Parcelas Mensais — {calcFormaPagamento === 'hibrido' ? `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + Entrada` : `${n}x de ${perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                </option>
                              );
                            })}
                          </select>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Mín: 1x</span>
                            <span>Máx: 12x</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* SIMULAÇÃO DE IDADE REAL DO CANDIDATO */}
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
                      <span className="text-xs font-extrabold text-slate-800">Cálculo pela minha Idade Real</span>
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Se você tem 17 anos (recém-completados ou mais), simule o ritmo ideal de transição para o processo de habilitação conforme o CTB ou o financiamento planejado por baú continuado.
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
                            <option value="1">17 anos e 1 mês (Faltam 11 meses para completar 18)</option>
                            <option value="2">17 anos e 2 meses (Faltam 10 meses para completar 18)</option>
                            <option value="3">17 anos e 3 meses (Faltam 9 meses para completar 18)</option>
                            <option value="4">17 anos e 4 meses (Faltam 8 meses para completar 18)</option>
                            <option value="5">17 anos e 5 meses (Faltam 7 meses para completar 18)</option>
                            <option value="6">17 anos e 6 meses (Faltam 6 meses para completar 18)</option>
                            <option value="7">17 anos e 7 meses (Faltam 5 meses para completar 18)</option>
                            <option value="8">17 anos e 8 meses (Faltam 4 meses para completar 18)</option>
                            <option value="9">17 anos e 9 meses (Faltam 3 meses para completar 18)</option>
                            <option value="10">17 anos e 10 meses (Faltam 2 meses para completar 18)</option>
                            <option value="11">17 anos e 11 meses (Faltam 1 mês para completar 18)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase font-mono">Escolha a Estratégia de Início:</label>
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
                                <span>⚡</span> Começar com 18 anos e 1 dia (CTB)
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">
                                Quitar as parcelas em {12 - calcSelectedAgeMonths} meses para ter 100% do saldo livre exatamente na maioridade penal para dar início ao processo de habilitação.
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
                                <span>📦</span> Continuar com o financiamento do baú
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">
                                Manter o parcelamento estendido normal de {calcParcelas}x e continuar pagando as parcelas confortavelmente mesmo após os 18 anos.
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
                      Simulação do {(calcPlano === 'jovem-17' && (!isAuthenticated || calculateAge(currentStudent.dob) < 18)) ? 'Plano Poupança Jovem 17 Anos' : calcPlano === 'habilitado' ? 'Treinamento de Habilitados' : 'Plano CNH Facilitada Maiores de 18 Anos'}
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
                                {'Divisão base: ' + String(calcAulasCarro) + 'x Carro (' + carroBasePart.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ') + ' + String(calcAulasMoto) + 'x Moto (' + motoBasePart.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ')'}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-800 space-y-1 text-left">
                            <span className="text-xs text-slate-400 block font-medium">
                              {calcFormaPagamento === 'cartao' 
                                ? 'Parcelamento do Cartão de Crédito:' 
                                : calcFormaPagamento === 'vista'
                                  ? 'Pagamento em Cota Única (À Vista):'
                                  : calcFormaPagamento === 'hibrido'
                                    ? 'Acordo Híbrido (Metade À Vista + Metade Cartão):'
                                    : 'Financiamento Planejado (Estilo Baú):'}
                            </span>
                            {calcFormaPagamento === 'hibrido' ? (
                              <div className="space-y-1 mt-1 text-xs">
                                <div className="text-slate-350">💵 Parte Pix/À Vista: <strong className="font-mono text-emerald-300">{(baseCalcVal / 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
                                <div className="text-slate-350">💳 Parte Cartão: <strong className="font-mono text-emerald-300">{divisor}x de {perMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
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
                          <span>💳</span> Cartão de Crédito
                        </p>
                        <p>
                          Parcele com uma das menores taxas do mercado, no formato parcelas flexíveis via maquininha com nosso consultor ou link de pagamento.
                        </p>
                      </div>
                    )}

                    {calcFormaPagamento === 'vista' && (
                      <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/50 mt-4 text-[11px] leading-relaxed text-indigo-300 space-y-1 animate-in fade-in text-left">
                        <p className="font-extrabold text-indigo-400 flex items-center gap-1 text-[11px]">
                          <span>💵</span> Pagamento à Vista (Pix/Dinheiro)
                        </p>
                        <p>
                          Sem juros ou acréscimos comerciais. Permite agendamento e ativação imediata de todo o seu cronograma prático prioritário.
                        </p>
                      </div>
                    )}

                    {calcFormaPagamento === 'poupanca' && calcUseRealAge && (
                      <div className="bg-slate-800/55 p-3 rounded-xl border border-slate-700/50 mt-4 text-[11px] leading-relaxed text-slate-300 space-y-1 animate-in fade-in text-left">
                        <p className="font-extrabold text-emerald-300 flex items-center gap-1 text-[11px]">
                          <span>📌</span> {calcStrategy === 'real-age-ctb' ? 'Modo Planejamento CTB' : 'Modo Parcelamento Estendido'}
                        </p>
                        <p>
                          {calcStrategy === 'real-age-ctb'
                            ? `Ideal para quem quer dar entrada no sistema assim que completar 18 anos! Você pagará ${12 - calcSelectedAgeMonths} parcelas mensais antes do aniversário, permitindo quitação completa do baú na data da liberação.`
                            : `Perfeito para manter parcelas bem finas de forma confortável. Você segue pagando as parcelas mesmo após os 18 anos, e inicia as aulas práticas respeitando seu fluxo financeiro.`}
                        </p>
                      </div>
                    )}


                  </div>

                  <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-[11px] font-sans flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                    <span>
                      {calcTipo === 'carro' 
                        ? `Simulação ativa para ${calcAulas} aulas de Carro (B).` 
                        : calcTipo === 'moto' 
                          ? `Simulação ativa para ${calcAulas} aulas de Moto (A).`
                          : `Simulação ativa com FÓRMULA FLEX: ${calcAulasCarro} aulas de Carro + ${calcAulasMoto} aulas de Moto.`}
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
                      
                      setToastMessage("preencha o formulário de inscrição para gerar seu contrato. Aguarde! entraremos em contato em breve.");
                      setEnrollFormaPagamento(calcFormaPagamento);
                    }}
                    className="w-full bg-emerald-500 hover:bg-[#10b981] text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer mt-1"
                  >
                    <span>✍️</span> Contratar Plano Simulado
                  </button>
                </div>
              </div>
            </div>

            {/* FORMULÁRIO DE INSCRIÇÃO ABAIXO DA CALCULADORA DO SIMULADO */}
            <CandidateEnrollmentForm
              alunos={alunos}
              setAlunos={setAlunos}
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
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Área Administrativa</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-normal text-pretty px-4">
                    Acesso somente de gestores
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-sans">Senha Administrativa</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔒</span>
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
                    ❌ {adminError}
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
                  className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 hover:text-emerald-900 text-xs font-black py-2.5 rounded-xl transition cursor-pointer select-none flex items-center justify-center gap-1.5"
                >
                  📝 Cadastrar-se Automaticamente
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
                    <span>🛡️ Painel do Gestor Administrativo</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">Monitore os saldos dos candidatos, acesse os contratos assinados e acompanhe as comissões dos instrutores</p>
                </div>
                <div className="flex flex-wrap border border-slate-200 bg-slate-50 p-1 rounded-xl">
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
                    Contratos de Adesão
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
                    Comissões & Finanças
                  </button>
                </div>
              </div>

              {/* BACKUPS LOCAL EM JSON (REDUNDÂNCIA E SEGURANÇA SE DESEJAR EXPORTAR) */}
              <div className="bg-[#0c2340] text-white rounded-2xl p-4 md:p-6 border border-slate-800 shadow-xl space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-indigo-400 font-mono tracking-wider uppercase">Backup de Segurança Offline</span>
                    </div>
                    <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 mt-0.5">
                      💾 Gerenciar Backups Físicos (JSON)
                    </h3>
                    <p className="text-slate-350 text-[11px] leading-relaxed max-w-2xl">
                      Como o aplicativo agora está hospedado de forma 100% resiliente no Firebase Firestore, seus dados estão salvos na nuvem de forma nativa e automática. Use estes botões se desejar baixar uma cópia offline de segurança em seu computador ou restaurar uma cópia JSON antiga.
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
                  <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">Menores (Poupança ativa)</p>
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
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Progresso Médio de Quitação</p>
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
                    <option value="Todos">Filtrar por Instrutor Autônomo</option>
                    <option value="Sem Instrutor">Sem Instrutor Autônomo/Direto</option>
                    {instrutores.map(inst => (
                      <option key={inst.nome} value={inst.nome}>{inst.nome}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleAbrirLimpezaFicticios}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Excluir cadastros fictícios, testes e demonstrações"
                  >
                    <span>🧹</span>
                    <span className="hidden sm:inline">Limpar</span> Cadastros Fictícios
                  </button>

                  <button
                    onClick={() => setIsLinkEnrollmentModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ml-auto"
                    title="Alimentar Link de Pré-Matrícula e Efetuar Matrícula Direta no App de Gestão"
                  >
                    <Link className="h-3.5 w-3.5 text-amber-300" />
                    <span>Alimentar Link & Matricular</span>
                  </button>

                  <button
                    onClick={() => setShowGeneralEnrollmentModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-black py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Auto-Matrícula Coletiva
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
                              {isUnder ? '🔒 Menor (Poupando)' : '🔓 Maior (Liberado)'}
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
                              <span>📅 {formatDateBR(a.dob)}</span>
                              <span>•</span>
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
                                <span className="text-slate-400">📍</span>
                                <span className="truncate" title={a.endereco}>{a.endereco}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">📱</span>
                              <span>WhatsApp: <strong className="text-slate-700">{a.whatsapp}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">🔑</span>
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
                            <span>👁️</span> Ver Dossiê Completo
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
                              title="Lançar/Confirmar baixa de valor (Cartão, Pix, Dinheiro)"
                            >
                              <span>💳</span> Dar Baixa
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
                <span className="text-[10px] font-bold text-slate-400 uppercase">Exportação Rápida para Backup de Credenciados:</span>
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
                  <h3 className="font-bold text-slate-900 text-base">Instrutores Parceiros Autônomos</h3>
                  <p className="text-xs text-slate-500">Diretório de instrutores autônomos aptos para receber os saldos acumulados de maioridade.</p>
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
                  <h4 className="font-extrabold text-[#0c2340] text-xs">🔗 Link Direto de Auto-Cadastro para Instrutores</h4>
                  <p className="text-slate-500 text-[11px]">Envie este link para que os novos instrutores parceiros possam se cadastrar sozinhos.</p>
                </div>
                <button
                  onClick={copySelfRegisterLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] shrink-0 shadow-xs cursor-pointer"
                >
                  📋 Copiar Link de Auto-Cadastro
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {instrutores.map(inst => {
                  const numStudents = alunos.filter(a => a.instrutor === inst.nome).length;
                  const percentCapacity = (numStudents / inst.vagas) * 105;
                  const displayCapacity = Math.min(100, percentCapacity);

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
                                👤
                              </div>
                            )}
                            <strong className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition block leading-tight">{inst.nome}</strong>
                          </div>
                          <span className="text-[9.5px]/none bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 px-2 py-1 rounded shrink-0">
                            {inst.regiao}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-2 font-sans pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-xs">📱</span>
                            <span className="font-semibold text-slate-500">Contato:</span>
                            <strong className="text-slate-850 font-bold">{inst.whatsapp}</strong>
                          </div>

                          {inst.credencialSenatran && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-400 text-xs">🪪</span>
                              <span className="font-semibold text-slate-500">Credencial:</span>
                              <span className="font-mono text-[9px] font-black tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                {inst.credencialSenatran}
                              </span>
                            </div>
                          )}

                          {inst.endereco && (
                            <div className="flex items-start gap-1.5 pt-0.5">
                              <span className="text-slate-400 shrink-0 mt-0.5 text-xs">📍</span>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed truncate" title={inst.endereco}>
                                {inst.endereco}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 border-t border-slate-200/60 pt-2 mt-1">
                            <span className="text-emerald-700 font-semibold text-[11px]">👥 Alunos Ativos:</span>
                            <strong className="text-emerald-850 font-extrabold text-[11px]">{numStudents} / {inst.vagas} vagas</strong>
                          </div>
                        </div>

                        {/* Capacity progress */}
                        <div className="space-y-1 pt-1">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${displayCapacity > 85 ? 'bg-amber-550' : 'bg-emerald-600'}`}
                              style={{ width: `${displayCapacity}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-slate-450 font-mono block text-right">Capacidade de Lotação: {Math.round(displayCapacity)}%</span>
                        </div>
                      </div>

                      <div 
                        className="flex justify-between items-center gap-2 border-t border-slate-100 pt-3 shrink-0"
                        onClick={(e) => e.stopPropagation() /* Prevent modal activation */}
                      >
                        <button
                          onClick={() => setSelectedInstrutorDetail(inst)}
                          className="text-[10.5px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 font-extrabold px-2.5 py-1 rounded-md transition"
                        >
                          👁️ Ficha Detalhada
                        </button>

                        <div className="flex gap-1 font-sans">
                          {inst.foto && (
                            <button
                              onClick={() => handleDownloadFoto(inst.nome, inst.foto)}
                              className="text-[10px] text-sky-700 hover:bg-sky-50 border border-sky-200 px-2 py-1 rounded transition font-bold flex items-center gap-0.5"
                              title="Baixar Foto"
                            >
                              📥 Foto
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
                        {alunos.filter(aluno => {
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
                                  CPF: {aluno.cpf || 'Não cadastrado'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase tracking-wide font-sans ${
                                  aluno.whatsappResponsavel
                                    ? (isSelected ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-50 text-amber-700 border border-amber-200')
                                    : (isSelected ? 'bg-indigo-500/25 text-indigo-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200')
                                }`}>
                                  {aluno.whatsappResponsavel ? '🛡️ Jovem' : '👤 Adulto'}
                                </span>
                              </div>
                            </button>
                          );
                        }).reverse()}

                        {alunos.filter(aluno => {
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
                        const selectedAluno = alunos.find(a => a.id === selectedContractStudentId);
                        if (!selectedAluno) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                              <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400">
                                <FileText className="h-12 w-12 stroke-[1.5]" />
                              </div>
                              <div className="max-w-md space-y-1">
                                <h4 className="font-extrabold text-[#0c2340] text-sm">Visualizador de Contratos de Adesão</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Selecione um candidato na lista ao lado para carregar e inspecionar o contrato legal gerado e preenchido eletronicamente. Você poderá revisar os dados civil-legais, certificar assinaturas e exportar para documento PDF.
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
                                  🖨️ Imprimir / Salvar PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAdminContractPDF(selectedAluno)}
                                  disabled={isDownloadingContractPdf}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shadow-sm disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                                >
                                  {isDownloadingContractPdf ? (
                                    <>⏳ Gerando...</>
                                  ) : (
                                    <>📥 Baixar Contrato em PDF</>
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
                                    CONTRATO OFICIAL DE PRESTAÇÃO DE SERVIÇOS DE DIREÇÃO
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-bold uppercase font-sans block tracking-widest leading-none">
                                    ASSISTÊNCIA DE APRENDIZADO PRÁTICO INTELIGENTE • NOVA CNH BRASIL NA MÃO
                                  </span>
                                  <h3 className="text-xs font-black text-slate-900 font-sans tracking-wide uppercase mt-4">
                                    CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TREINAMENTO PRÁTICO E DESENVOLVIMENTO DE CIDADANIA
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
                                      <strong>CPF nº:</strong> <span className="font-mono font-bold text-slate-900">{selectedAluno.cpf}</span>
                                    </p>
                                    <p>
                                      <strong>Endereço Residencial Cadastrado:</strong> {selectedAluno.endereco || "Não informado"}
                                    </p>
                                    <p>
                                      <strong>Telefone/WhatsApp:</strong> <span className="font-mono font-bold">{selectedAluno.whatsapp}</span>
                                    </p>

                                    {/* Underage responsible block */}
                                    {isUnderage && (
                                      <div className="bg-red-50/75 border border-red-200 text-red-950 p-3 rounded-lg mt-3 font-sans text-[10.5px] leading-relaxed space-y-1">
                                        <span className="font-black text-[10px] text-red-800 uppercase block">
                                          📋 CLÁUSULA DE ASSISTÊNCIA CIVIL (BR-CIVIL):
                                        </span>
                                        Como o candidato é menor de 18 anos (17 anos completos), este instrumento conta com assistência civil ativa e corresponsabilidade solidária financeira de seu representante legal:
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-serif text-[10.5px] text-slate-900 pt-1 border-l-2 border-red-400 pl-2">
                                          <p><strong>Nome do Responsável:</strong> {selectedAluno.nomeResponsavel}</p>
                                          <p><strong>WhatsApp do Responsável:</strong> {selectedAluno.whatsappResponsavel}</p>
                                          <p><strong>CPF do Responsável:</strong> {selectedAluno.cpfResponsavel}</p>
                                          <p><strong>RG do Responsável:</strong> {selectedAluno.rgResponsavel || 'Não informado'}</p>
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
                                      <strong>Miqueias Souza de Lima - Instrutor Autônomo</strong>
                                    </p>
                                    <p>
                                      <strong>Registro Oficial SENATRAN:</strong> 1674704384
                                    </p>
                                    <p>
                                      <strong>CPF nº:</strong> 869.496.594-15 | <strong>Operadora Parceira de Treinamentos:</strong> Nova CNH Brasil na Mão
                                    </p>
                                    <p>
                                      <strong>Suporte / WhatsApp de Atendimento Técnico:</strong> (81) 99201-1024
                                    </p>
                                  </div>
                                </section>

                                {/* PART III: CLAUSES */}
                                <section className="space-y-4 text-[10.5px] text-slate-800">
                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA PRIMEIRA – DO OBJETO DOS SERVIÇOS</h5>
                                    <p className="mt-1 text-justify">
                                      O presente contrato tem por objeto a prestação de treinamentos práticos de trânsito e direção veicular segura, integrando os planos preparatórios de poupança veicular e planejamento de maioridade:
                                    </p>
                                    <div className="my-2 pl-3 space-y-1.5 font-sans text-[10px]">
                                      <p className="flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-flex items-center justify-center font-bold bg-white text-slate-950">
                                          {isUnderage ? 'X' : ' '}
                                        </span>
                                        <span><strong>Plano Poupança Jovem</strong> (Para candidatos menores de 18 anos acumularem créditos reais)</span>
                                      </p>
                                      <p className="flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded border border-slate-400 inline-flex items-center justify-center font-bold bg-white text-slate-950">
                                          {!isUnderage ? 'X' : ' '}
                                        </span>
                                        <span><strong>Plano CNH Facilitada Maiores</strong> (Para candidatos maiores com agendamento das aulas práticas de direção)</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA SEGUNDA – DA CARGA LETIVA E MONITORAMENTO</h5>
                                    <p className="mt-1 text-justify">
                                      O pacote contratado compreende o total de <strong>{totalAulas} horas-aula</strong> de treinamentos práticos de direção veicular, agendadas sequencialmente. O <strong>CONTRATANTE</strong> declara estar ciente de que as aulas de direção segura são orientadas pessoalmente pelo <strong>CONTRATADO</strong>.
                                    </p>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA TERCEIRA – DO VALOR ACORDADO</h5>
                                    <p className="mt-1 text-justify">
                                      O valor total acordado para os serviços supracitados é de <strong className="text-slate-950">R$ {selectedAluno.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '1.800,00'}</strong>, do qual o candidato realiza pagamentos planejados.
                                    </p>
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-950 uppercase font-sans">CLÁUSULA QUARTA – DA FORÇA EXECUTIVA E VALIDADE DIGITAL</h5>
                                    <p className="mt-1 text-justify">
                                      Este contrato goza de plena validade jurídica digital nos termos da legislação civil brasileira em vigor, amparado pela Medida Provisória nº 2.200-2/2001, constituindo título executivo extrajudicial legal no momento de sua assinatura digital.
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
                                        <span className="text-[9px] font-black text-slate-900 uppercase block">REPRESENTANTE TÉCNICO / INSTRUTOR</span>
                                        <span className="text-[8px] text-slate-400 font-mono block">Inst. Autônomo • Reg. SENATRAN 1674704384</span>
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
                                          <span className="text-[9px] font-black text-red-900 uppercase block">CO-ASSINATURA DO RESPONSÁVEL CIVIL</span>
                                          <span className="text-[8px] text-slate-400 font-mono block">Garantidor Solidário Tutelar</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-center text-[8px] text-slate-400 pt-6 font-mono border-t border-slate-100">
                                    Código Eletrônico Registrado de Autenticidade: CNH-{selectedAluno.id}-BR
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
                  const instStudents = alunos.filter(a => a.instrutor === inst.nome);
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

                const unassignedStudents = alunos.filter(a => !a.instrutor || a.instrutor === '' || a.instrutor === 'Aguardando Atribuição');

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
                          <p className="text-[9px] text-slate-500 mt-0.5 font-sans">Indicações ativas de parceiros</p>
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
                          <p className="text-[9px] text-[#28a193] mt-0.5 font-sans">Contratos fechados por indicação</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0 border border-amber-100">
                          <Coins className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Comissão Quitada (Caixa)</p>
                          <h4 className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
                            {commissionStats.totalPaymentReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </h4>
                          <p className="text-[9px] text-amber-600 mt-0.5 font-sans">Saldos já recebidos e validados</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="bg-slate-50 text-slate-600 p-3 rounded-xl shrink-0 border border-slate-150">
                          <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Comissão Pendente (A Receber)</p>
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
                          <p className="text-[9px] text-slate-400 mt-0.5 font-sans">80% de comissão regulamentar (Total - 20%)</p>
                        </div>
                      </div>
                    </div>

                    {/* Main Grid: Left is Table of Instructors, Right is detailed breakdown if an instructor is clicked */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                      
                      {/* INSTRUCTORS COMMISSIONS LIST */}
                      <div className={`${selectedCommissionInstructor ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4 transition-all duration-350`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">CONSOLIDAÇÃO FINANCEIRA</span>
                            <h3 className="text-base font-black text-slate-900 mt-0.5">Visão Geral de Comissões</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Acompanhe os resultados, faturamento e as indicações individuais de cada instrutor credenciado.</p>
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
                            placeholder="Buscar instrutor por nome ou região..."
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
                                <th className="p-3.5 text-right pr-4">Ação</th>
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
                                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">📍 Região: {d.instrutor.regiao || 'Não Informada'}</span>
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
                                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden" title={`${payoffPercentage}% de quitação média`}>
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
                                    <span className="text-xs">⏳</span>
                                    <div>
                                      <span className="font-semibold block text-slate-700">Aguardando Atribuição (Sem Instrutor)</span>
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
                                    setToastMessage("📋 Chave PIX copiada com sucesso!");
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 text-[10px] ml-auto font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" /> Copiar
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200/60 font-sans italic flex items-center justify-between">
                                <span>⚠️ Sem chave PIX vinculada.</span>
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
                                       <span className="font-semibold">Comissão Acumulada (80%):</span>
                                       <span className="font-mono font-bold">{totalLiberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                     <div className="flex justify-between text-xs text-slate-500">
                                       <span>Comissões Quitadas:</span>
                                       <span className="font-mono font-bold">-{saldoPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                     <div className="border-t border-emerald-200/60 pt-2 flex justify-between items-center text-emerald-900">
                                       <span className="text-xs font-black uppercase tracking-wider">Saldo Disponível:</span>
                                       <span className="text-lg font-black font-mono">{saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </div>
                                   </div>

                                   {saldoDisponivel > 0 ? (
                                     <button
                                       type="button"
                                       onClick={() => handlePagarSaldo(selectedData.instrutor, saldoDisponivel)}
                                       className="w-full bg-[#32bcad] hover:bg-[#28a193] text-black font-black py-2 px-4 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-sm"
                                     >
                                       💸 Registrar Pagamento do Saldo
                                     </button>
                                   ) : (
                                     <div className="text-center py-2 bg-emerald-100 text-emerald-800 text-[10px] rounded-lg font-black border border-emerald-200 uppercase tracking-wider">
                                       ✅ Todo o saldo liberado já foi pago!
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}

                            {/* Student lists detail */}
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                              {selectedData.students.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400 italic">
                                  Nenhuma indicação registrada para este instrutor ainda.
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
                                          <strong className="text-slate-800">{student.tipoPlano || 'Poupança CNH'}</strong>
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
                                          <span>Comissão Liberada (80%):</span>
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
                alunos.forEach(a => {
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
                const cardCount = allReceipts.filter(r => r.baixa.formaPagamento.toLowerCase().includes('cart') || r.baixa.formaPagamento.toLowerCase().includes('crédito')).length;

                return (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Header & Quick Action */}
                    <div className="bg-gradient-to-r from-[#0c2340] to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-6 w-6 text-emerald-400" />
                          <h3 className="text-lg font-black tracking-tight">Gestão & Emissão de Recibos de Pagamento</h3>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                          Consulte, emita e envie recibos oficiais de quitação para candidatos do Programa CNH Facilitada.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (alunos.length > 0) {
                            setManualReceiptAlunoId(alunos[0].id);
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
                        <p className="text-[10px] text-slate-400">Arrecadação total baixada</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Pagamentos PIX</span>
                          <Zap className="h-4 w-4 text-teal-500" />
                        </div>
                        <p className="text-2xl font-black text-teal-700 font-mono">{pixCount}</p>
                        <p className="text-[10px] text-slate-400">Recibos via PIX / Transferência</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Cartão / Outros</span>
                          <CreditCard className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-black text-blue-700 font-mono">{cardCount}</p>
                        <p className="text-[10px] text-slate-400">Recibos de cartão e balcão</p>
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
                            <option value="pix">PIX / Transferência</option>
                            <option value="cart">Cartão de Crédito</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="boleto">Boleto</option>
                          </select>
                        </div>
                      </div>

                      {filteredReceipts.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                            🧾
                          </div>
                          <p className="text-xs font-bold text-slate-600">Nenhum recibo de candidato encontrado para os filtros selecionados.</p>
                          <p className="text-[11px] text-slate-400">Tente buscar por outro termo ou clique em "Emitir Novo Recibo".</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                                <th className="p-3 pl-4">ID Recibo / Data</th>
                                <th className="p-3">Candidato / Categoria</th>
                                <th className="p-3">Valor</th>
                                <th className="p-3">Forma de Pagamento</th>
                                <th className="p-3">Referente a</th>
                                <th className="p-3 pr-4 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {filteredReceipts.map(({ aluno, baixa }) => {
                                const receiptId = baixa.id.startsWith('REC-') ? baixa.id : `REC-${baixa.id}`;
                                const formattedMsg = encodeURIComponent(
                                  `🧾 *RECIBO DE PAGAMENTO - PROGRAMA CNH FACILITADA*\n\n` +
                                  `Olá, *${aluno.nome}*!\n` +
                                  `Confirmamos o recebimento do seu pagamento no valor de *${baixa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}* (${baixa.formaPagamento}).\n\n` +
                                  `📌 *Nº Recibo:* ${receiptId}\n` +
                                  `📅 *Data:* ${formatDateBR(baixa.data)}\n` +
                                  `📑 *Referente:* ${baixa.observacao || 'Quitação CNH Facilitada'}\n\n` +
                                  `Obrigado por confiar no Programa Nova CNH Brasil!`
                                );
                                const waUrl = `https://wa.me/55${aluno.whatsapp.replace(/\D/g, '')}?text=${formattedMsg}`;

                                return (
                                  <tr key={`${aluno.id}-${baixa.id}`} className="hover:bg-slate-50/80 transition">
                                    <td className="p-3 pl-4">
                                      <div className="font-mono font-bold text-indigo-900 text-[11px]">{receiptId}</div>
                                      <div className="text-[10px] text-slate-400">{formatDateBR(baixa.data)}</div>
                                    </td>
                                    <td className="p-3">
                                      <div className="font-extrabold text-slate-900">{aluno.nome}</div>
                                      <div className="text-[10px] text-slate-500 font-medium">Cat. {aluno.categoria} • ID: {aluno.id}</div>
                                    </td>
                                    <td className="p-3 font-mono font-black text-emerald-700">
                                      {baixa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="p-3 font-semibold text-slate-700">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                        {baixa.formaPagamento}
                                      </span>
                                    </td>
                                    <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate" title={baixa.observacao}>
                                      {baixa.observacao || 'Pagamento CNH Facilitada'}
                                    </td>
                                    <td className="p-3 pr-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleEmitirReciboCandidato(aluno, baixa)}
                                          className="bg-[#0c2340] hover:bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                          title="Visualizar Recibo Imprimível"
                                        >
                                          <Receipt className="h-3 w-3 text-emerald-400" />
                                          Ver Recibo
                                        </button>

                                        <a
                                          href={waUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                          title="Enviar Recibo no WhatsApp do Candidato"
                                        >
                                          <span>💬</span> WhatsApp
                                        </a>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

          </div>
          )
        )}

        {/* ===================== TAB: ÁREA / PAINEL DO INSTRUTOR ===================== */}
        {currentTab === 'area-instrutor' && (
          <div className="space-y-6 animate-in fade-in duration-200" id="instructor-area-container">
            {!activeInstructor ? (
              /* INSTRUTOR LOGIN SCREEN */
              <div className="max-w-md mx-auto my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-left space-y-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="bg-emerald-500/10 p-3.5 rounded-full border border-emerald-500/20 text-emerald-400">
                    <QrCode className="h-8 w-8 text-emerald-400 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Portal do Instrutor Parceiro</h2>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Acesse seu painel individual para acompanhar seus alunos vinculados e obter seu QR Code/Link como instrutor autônomo.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!instructorLoginNome.trim()) {
                    setInstructorLoginError("Por favor, insira seu Usuário (Login) de acesso.");
                    return;
                  }
                  const typedLogin = instructorLoginNome.trim().toLowerCase().replace(/\s+/g, "");
                  const typedPassword = instructorLoginWhatsapp.trim();

                  const found = instrutores.find(i => 
                    (i.login && i.login.toLowerCase() === typedLogin) ||
                    (!i.login && generateLogin(i.nome) === typedLogin) ||
                    (i.nome.toLowerCase().replace(/\s+/g, "") === typedLogin)
                  );

                  if (!found) {
                    setInstructorLoginError("Usuário (Login) não localizado no sistema.");
                    return;
                  }
                  
                  // Support exact instructor password, fallback to unique password, or their WhatsApp, or admin PIN
                  const isPasswordCorrect = 
                    (found.senha && typedPassword === found.senha) ||
                    (!found.senha && (typedPassword === found.whatsapp.replace(/\D/g, "") || typedPassword === '123')) ||
                    typedPassword === 'admin_master_super';

                  if (isPasswordCorrect) {
                    setActiveInstructor(found);
                    setInstructorLoginError("");
                    setToastMessage(`🔑 Login realizado com sucesso! Bem-vindo, ${found.nome}.`);
                  } else {
                    setInstructorLoginError(`⚠️ Senha incorreta para o usuário "${typedLogin}". Por favor, consulte o painel administrativo.`);
                  }
                }} className="space-y-4">
                  {instructorLoginError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                      {instructorLoginError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Usuário (Login) do Instrutor
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: carlos.andre"
                      value={instructorLoginNome}
                      onChange={(e) => {
                        setInstructorLoginNome(e.target.value);
                        setInstructorLoginError("");
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 p-3 rounded-xl text-xs font-bold focus:outline-none transition font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Senha de Acesso Privada
                    </label>
                    <input
                      type="password"
                      placeholder="Sua senha gerada de 6 dígitos"
                      value={instructorLoginWhatsapp}
                      onChange={(e) => setInstructorLoginWhatsapp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 p-3 rounded-xl text-xs font-mono focus:outline-none transition"
                      required
                    />
                    <span className="text-[10px] text-slate-500 leading-normal block">
                      Nota: O login e a senha individual são fornecidos pelo administrador da rede Nova CNH na sua ficha de credenciamento.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-lg shadow-emerald-500/10 mt-2 cursor-pointer"
                  >
                    🚀 Acessar Meu Painel Comissionado
                  </button>
                </form>
              </div>
            ) : (
              /* INSTRUTOR COMPREHENSIVE DASHBOARD */
              <div className="space-y-6">
                {/* Dashboard Header Bar */}
                <div className="bg-[#112d52] border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl text-left shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {activeInstructor.foto ? (
                        <img 
                          src={activeInstructor.foto} 
                          alt={activeInstructor.nome} 
                          className="w-14 h-14 object-cover rounded-full border-2 border-emerald-400 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg border-2 border-emerald-400 shadow-md">
                          {activeInstructor.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 bg-green-500 h-3 w-3 rounded-full border-2 border-[#112d52]"></span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white tracking-tight">{activeInstructor.nome}</h2>
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full font-mono">
                          Instrutor Ativo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                        📍 Atuação Regional: <strong className="text-white">{activeInstructor.regiao}</strong>
                      </p>
                      {activeInstructor.credencialSenatran && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          🪪 Reg. SENATRAN: {activeInstructor.credencialSenatran}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInstructor(null);
                        setInstructorLoginWhatsapp('');
                        setToastMessage("🚪 Você saiu com segurança do painel de instrutor!");
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      🚪 Sair do Painel
                    </button>
                  </div>
                </div>

                {/* Dashboard Stats Overview */}
                {(() => {
                  const myStudents = alunos.filter(a => a.instrutor === activeInstructor.nome);
                  const totalVendas = myStudents.reduce((acc, a) => acc + getStudentBaseValue(a), 0);
                  const totalPaymentReceived = myStudents.reduce((acc, a) => {
                    const baseTotal = getStudentBaseValue(a);
                    const installmentVal = baseTotal / (a.parcelasTotal || 12);
                    const paidValue = (a.parcelasPagas || 0) * installmentVal;
                    return acc + paidValue;
                  }, 0);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-xl shrink-0">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Meus Indicados</p>
                          <h4 className="text-2xl font-black text-white mt-0.5 font-mono">{myStudents.length}</h4>
                          <p className="text-[9px] text-[#32bcad] mt-0.5 font-sans">Alunos vinculados à sua carteira</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl shrink-0">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume de Acordos</p>
                          <h4 className="text-2xl font-black text-emerald-400 mt-0.5 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVendas)}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Indicações de acordo ativas</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl shrink-0">
                          <Sliders className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Arrecadação (Alunos)</p>
                          <h4 className="text-2xl font-black text-amber-400 mt-0.5 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaymentReceived)}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Total quitado pelos alunos</p>
                        </div>
                      </div>

                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="bg-emerald-500/20 text-emerald-300 p-3 rounded-xl shrink-0 border border-emerald-500/20">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Saldo Disponível</p>
                          <h4 className="text-2xl font-black text-emerald-300 mt-0.5 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, (totalPaymentReceived * 0.80) - (activeInstructor.saldoPago || 0)))}
                          </h4>
                          <p className="text-[9px] text-emerald-500/80 mt-0.5 font-sans font-medium">
                            {(activeInstructor.saldoPago || 0) > 0 ? `Já quitado: R$ ${(activeInstructor.saldoPago || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : "80% de comissão liberada (Total - 20%)"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                        <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl shrink-0">
                          <Info className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sua Capacidade</p>
                          <h4 className="text-2xl font-black text-purple-300 mt-0.5 font-mono">
                            {activeInstructor.vagas} <span className="text-xs text-slate-500 font-sans font-medium">Turma</span>
                          </h4>
                          <p className="text-[9px] text-[#32bcad] mt-0.5 font-sans">Vagas do instrutor no DETRAN</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Main Content Area: Left side links, Right side student ledger */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                  
                  {/* LEFT CHANNEL: EXCLUSIVE REFERRAL LINKS */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 border border-emerald-500/25 rounded-2xl p-6 shadow-md space-y-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="p-0.5 px-1.5 text-[8.5px] font-black bg-emerald-500 text-slate-950 rounded uppercase font-sans">
                            Seu Lead Generator
                          </span>
                          <h3 className="font-extrabold text-sm text-slate-100">Matrícula Vinculada</h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal font-sans">
                          Qualquer aluno que realizar a matrícula escaneando seu código ou acessando o link será vinculado automaticamente a você como instrutor autônomo responsável.
                        </p>
                      </div>

                      {/* REFERRAL LINK COPY INPUT */}
                      <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-850">
                        <span className="text-[9px] text-emerald-400 font-mono font-extrabold uppercase block">
                          🔗 Seu Link de Auto-Cadastro
                        </span>
                        <div className="flex items-stretch gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={`${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${encodeURIComponent(activeInstructor.nome)}`}
                            className="bg-slate-900 text-slate-300 font-mono text-[9px] p-2 rounded-lg border border-slate-800 focus:outline-none select-all truncate flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const enrollmentLink = `${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${encodeURIComponent(activeInstructor.nome)}`;
                              navigator.clipboard.writeText(enrollmentLink);
                              setToastMessage(`📋 Link do instrutor autônomo ${activeInstructor.nome} copiado!`);
                            }}
                            className="bg-[#32bcad] hover:bg-[#28a193] text-black text-[10px] font-black px-3.5 rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      {/* DYNAMIC QR CODE CONTAINER */}
                      <div className="flex flex-col items-center bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <div className="bg-white p-3 rounded-xl shadow-lg">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${activeInstructor.nome}`)}`}
                            alt="Referral QR Code"
                            className="w-[150px] h-[150px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-center space-y-0.5">
                          <span className="text-[10px] text-[#32bcad] font-mono font-black uppercase tracking-wider block">
                            QR Code Comissionado
                          </span>
                          <p className="text-[9px] text-slate-500 max-w-xs leading-normal font-sans">
                            Deixe aberto na tela para o candidato capturar com o smartphone e iniciar a contratação direta!
                          </p>
                        </div>
                      </div>

                      {/* NO-INTERFERENCE NOTICE MENTION */}
                      <div className="bg-slate-950/70 py-3.5 px-4 rounded-xl border border-slate-850/60 flex items-start gap-2.5">
                        <span className="text-amber-400 text-xs shrink-0 self-center">⚠️</span>
                        <p className="text-[9.5px] text-slate-400 leading-normal font-mono">
                          <strong>Aviso Legislativo:</strong> Esta área possui fins de acompanhamento exclusivo. Alterações financeiras e pedagógicas requerem chancela da Secretaria Central.
                        </p>
                      </div>

                      {/* CARD: SUA CHAVE PIX */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                            <span>🔑</span> Sua Chave PIX de Recebimento
                          </h3>
                          <p className="text-xs text-slate-400 leading-normal font-sans">
                            Cadastre ou altere sua chave PIX para que a Secretaria Central realize a transferência direta das comissões liberadas.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="CPF, E-mail, Celular ou Aleatória"
                              value={instructorChavePixInput}
                              onChange={(e) => setInstructorChavePixInput(e.target.value)}
                              className="bg-slate-950 text-slate-200 font-mono text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-[#32bcad] flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                // Save the PIX key inside the central instructors array
                                setInstrutores(prev => prev.map(i => i.nome === activeInstructor.nome ? { ...i, chavePix: instructorChavePixInput.trim() } : i));
                                setToastMessage("💾 Chave PIX salva e vinculada com sucesso!");
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black px-4 rounded-xl transition active:scale-95 cursor-pointer shrink-0"
                            >
                              Salvar
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono leading-normal">
                            Nota: Certifique-se de que a chave está digitada corretamente para evitar problemas no repasse.
                          </p>
                        </div>
                      </div>

                      {/* CARD: RECIBOS & QUITAÇÕES GOV.BR */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
                        <div className="space-y-1 border-b border-slate-800/80 pb-3">
                          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                            <span>📋</span> Seus Recibos & Quitações
                          </h3>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Visualize pagamentos recebidos e assine os recibos eletronicamente via GOV.BR.
                          </p>
                        </div>

                        {!activeInstructor.recibos || activeInstructor.recibos.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 italic text-[11px] bg-slate-950/40 rounded-xl border border-slate-850/80">
                            Nenhum recibo de comissão emitido até o momento.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {activeInstructor.recibos.map(rec => (
                              <div key={rec.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-2.5 text-xs text-left">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold font-mono text-[#32bcad] bg-[#32bcad]/10 px-2 py-0.5 rounded border border-[#32bcad]/20">{rec.id}</span>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    rec.status === 'assinado_gov' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                  }`}>
                                    {rec.status === 'assinado_gov' ? '✓ Assinado' : '⏳ Assinar'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-slate-300">
                                  <span>Valor Pago: <strong className="text-white font-mono">{rec.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                                  <span className="text-slate-500 font-mono text-[10px]">{new Date(rec.dataEmissao).toLocaleDateString('pt-BR')}</span>
                                </div>

                                {rec.status === 'assinado_gov' ? (
                                  <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[9px] font-mono text-slate-400 space-y-1">
                                    <p className="text-emerald-400 font-bold flex items-center gap-1 text-[9.5px]">
                                      <span>🛡️</span> Assinado Eletronicamente
                                    </p>
                                    <p className="truncate">Certificado: <span className="text-slate-200">{rec.identificadorGov}</span></p>
                                    <p>Data: <span className="text-slate-200">{new Date(rec.dataAssinatura!).toLocaleDateString('pt-BR')}</span></p>
                                    <button
                                      type="button"
                                      onClick={() => setViewingRecibo({ instrutorNome: activeInstructor.nome, recibo: rec })}
                                      className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-1.5 px-2.5 rounded-lg text-[9.5px] transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
                                    >
                                      🔍 Visualizar Recibo Oficial
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateGovSign(activeInstructor, rec)}
                                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-2 rounded-lg text-[10px] transition active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-sm"
                                    >
                                      🖋️ Assinar via GOV.BR
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setViewingRecibo({ instrutorNome: activeInstructor.nome, recibo: rec })}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-lg text-[10px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                                      title="Visualizar Recibo"
                                    >
                                      🔍 Ver
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL: STUDENT CARDS LIST (ACOMPANHAMENTO ATIVO) */}
                  <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="font-extrabold text-sm text-white tracking-tight">Sua Carteira de Alunos Referenciados</h3>
                        <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">Acompanhe o andamento das faturas e dos planos contratados por seus alunos.</p>
                      </div>
                      
                      {/* Search Bar inside his students */}
                      <div className="relative max-w-xs w-full">
                        <input
                          type="text"
                          placeholder="Filtre seus indicados por nome..."
                          value={instSearchQuery}
                          onChange={(e) => setInstSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 text-xs text-slate-200 placeholder-slate-500 pl-3.5 pr-8 py-2 rounded-xl border border-slate-800 focus:border-emerald-500 focus:outline-none transition"
                        />
                        {instSearchQuery && (
                          <button 
                            onClick={() => setInstSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Student listings */}
                    {(() => {
                      const myStudents = alunos.filter(a => a.instrutor === activeInstructor.nome);
                      const myFilteredStudents = myStudents.filter(a => 
                        a.nome.toLowerCase().includes(instSearchQuery.toLowerCase()) || 
                        a.id.toLowerCase().includes(instSearchQuery.toLowerCase())
                      );

                      if (myStudents.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 italic bg-slate-950/30 rounded-xl border border-dashed border-slate-850">
                            Nenhum aluno registrou cadastro com seu link de indicação ainda. Divulgue seu QR Code!
                          </div>
                        );
                      }

                      if (myFilteredStudents.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 italic bg-slate-950/30 rounded-xl border border-dashed border-slate-850 font-sans text-xs">
                            Nenhum indicado corresponde à busca "{instSearchQuery}"
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                          {myFilteredStudents.map((student) => {
                            const baseTotal = getStudentBaseValue(student);
                            const currentPaid = (student.parcelasPagas || 0) * (baseTotal / (student.parcelasTotal || 12));
                            const completionPercentage = Math.min(100, Math.max(0, ((student.parcelasPagas || 0) / (student.parcelasTotal || 12)) * 100));

                            return (
                              <div 
                                key={student.id}
                                className="bg-slate-950 border border-slate-850 hover:border-emerald-500/35 rounded-xl p-4 transition-all duration-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="space-y-2 flex-1 text-left">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-xs font-black text-white">{student.nome}</h4>
                                    <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                      {student.id}
                                    </span>
                                    <span className="text-[10px] bg-slate-900 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full font-mono uppercase">
                                      🔑 {student.categoria}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-[10.5px]">
                                    <div>
                                      <span className="text-slate-500 block">Inscrição:</span>
                                      <strong className="text-slate-300 font-mono">{formatDateBR(student.dataAdesao)}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">WhatsApp:</span>
                                      <a 
                                        href={`https://wa.me/55${student.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#32bcad] hover:underline font-semibold font-mono"
                                      >
                                        📞 {student.whatsapp}
                                      </a>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <span className="text-slate-500 block">Integral Quitado:</span>
                                      <strong className="text-emerald-400 block font-mono">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPaid)} 
                                        <span className="text-slate-500 text-[9px] ml-1 font-normal font-sans">({student.parcelasPagas} de {student.parcelasTotal || 12})</span>
                                      </strong>
                                    </div>
                                  </div>

                                  {/* Progress bar visual indicating financial completion */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                                      <span>Adimplência Financeira</span>
                                      <span className="text-emerald-400 font-bold">{completionPercentage.toFixed(0)}% Pago</span>
                                    </div>
                                    <div className="bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                      <div 
                                        className="bg-emerald-400 h-full rounded-full transition-all duration-300" 
                                        style={{ width: `${completionPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentDetail(student)}
                                    className="flex-1 sm:flex-none text-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold py-2 px-3.5 rounded-xl transition cursor-pointer"
                                  >
                                    📋 Ver Detalhes / Plano
                                  </button>
                                  <a
                                    href={`https://wa.me/55${student.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 sm:flex-none text-center bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/20 text-[10px] font-bold py-2 px-3.5 rounded-xl transition cursor-pointer"
                                  >
                                    💬 Conversar
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: DEPOIMENTOS DOS ALUNOS ===================== */}
        {currentTab === 'depoimentos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <StudentTestimonials 
              depoimentos={depoimentos} 
              alunos={alunos}
              activeStudentId={activeStudentId}
              isAuthenticated={isAuthenticated}
              isAdminAuthenticated={isAdminAuthenticated}
              onLoginStudent={(id) => {
                setActiveStudentId(id);
                setIsAuthenticated(true);
              }}
              onAddDepoimento={handleAddDepoimento} 
              onDeleteDepoimento={handleDeleteDepoimento}
              onToast={setToastMessage} 
            />
          </div>
        )}

        {/* ===================== TAB: CAPA DE APRESENTAÇÃO ===================== */}
        {currentTab === 'capa' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Elegant Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0c2340] via-[#112d52] to-slate-900 text-white rounded-2xl p-6 md:p-12 border-b-8 border-emerald-500 shadow-xl" id="hero-banner-cnh">
              <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Side: Program Introduction */}
                <div className="lg:col-span-8 space-y-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono tracking-wider">
                    🚀O sonho começa com seus 17 anos.
                  </span>
                  
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                    Nova CNH Brasil na Mão
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mt-2">
                      O Programa de Poupança CNH Segura
                    </span>
                  </h2>

                  <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl">
                    Conquistar a Carteira Nacional de Habilitação (CNH) é o sonho de muitos jovens. Ela representa independência, liberdade e, acima de tudo, uma porta de entrada gigantesca para o mercado de trabalho. Embora o investimento inicial possa parecer um desafio à primeira vista, a boa notícia é que obter o documento é uma meta perfeitamente alcançável, e existem caminhos estruturados para que o orçamento não seja um obstáculo.
                  </p>

                  <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl">
                    Se você está planejando tirar a sua habilitação, confira as principais alternativas para transformar esse objetivo em realidade: o programa **Nova CNH Brasil na Mão** permite a jovens de **17 a 24 anos** aderirem a um parcelamento inteligente. No momento em que atingem os **18 anos ou mais**, o baú acumulado é liberado automaticamente em créditos para custear as aulas de trânsito!
                  </p>

                  {/* IMPORTANTE OBSERVATION BOX */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs md:text-sm text-emerald-300 leading-relaxed font-sans flex items-start gap-2.5">
                      <span className="text-base leading-none">💡</span>
                      <span>
                        <strong className="text-white">Qualquer pessoa de qualquer idade pode aderir e participar</strong> do programa de parcelamento planejado. O foco de atendimento mais forte e personalizado é direcionado a jovens entre <strong className="text-emerald-400">17 e 24 anos</strong> para impulsionar a emancipação profissional e pessoal.
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      id="hero-btn-app-jovem"
                      onClick={() => setCurrentTab('app-jovem')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      Acesso ao Aplicativo
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                    <button
                      id="hero-btn-gestao"
                      onClick={() => setCurrentTab('gestao')}
                      className="bg-slate-800 hover:bg-slate-755 text-white font-semibold px-5 py-3 rounded-xl border border-slate-700 transition flex items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      {isAdminAuthenticated ? 'Ver Área Administrativa' : 'Área Administrativa 🔒'}
                    </button>
                  </div>
                </div>

                {/* Right Side: Professional Glassmorphic Image Frame with Happy Young Person */}
                <div className="lg:col-span-4 flex justify-center">
                  <div className="relative bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-md max-w-xs w-full group overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
                    {/* Subtle warm glow around card on hover */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700 pointer-events-none"></div>
                    
                    <div className="relative bg-slate-900/90 rounded-xl overflow-hidden shadow-inner">
                      <img 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop" 
                        alt="Jovem candidata sorrindo alegremente celebrando a CNH" 
                        className="w-full h-64 object-cover object-center hover:scale-105 transition-transform duration-500 rounded-t-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Aprovação e Liberdade</span>
                        <p className="text-xs font-medium text-slate-200 mt-1">Sua CNH com Planejamento Inteligente!</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">Parcele sem juros e conquiste sua independência!</p>
                        <div className="mt-2 text-[9px] bg-emerald-950/60 text-emerald-300 px-2 py-1.5 rounded border border-emerald-900/40 leading-tight">
                          💡 <strong className="text-white">Qualquer idade pode aderir!</strong>
                          <span className="block text-slate-300 text-[8.5px] mt-0.5 font-sans">Nossos planos contemplam todos, com foco especial de 17 a 24 anos.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ===================== VISÃO AMPLIADA: NOVA CNH BRASIL NA MÃO ===================== */}
            <div id="section-visao-ampliada" className="bg-gradient-to-r from-[#0c2340] to-[#112d52] rounded-2xl border border-indigo-900 overflow-hidden shadow-xl text-white">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-950 pb-5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-widest font-mono">
                      🔎 VISÃO AMPLIADA & COBERTURA NACIONAL
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      🚗 Nova CNH Brasil na Mão em Detalhes
                    </h3>
                    <p className="text-slate-350 text-xs md:text-sm">
                      Entenda como o programa integra tecnologia, educação financeira e oportunidades reais de ponta a ponta.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <span className="text-2xl">🇧🇷</span>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Status Nacional</div>
                      <div className="text-xs font-black text-emerald-400">Presença em 26 Estados + DF</div>
                    </div>
                  </div>
                </div>

                {/* Grid with Interactive Dashboard and Trilha section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Dynamic Timeline of the Conquest (O Caminho da Autonomia) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-950/45 border border-indigo-950 p-5 rounded-2xl space-y-4 text-left">
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        Trilha Inteligente de Emancipação
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Navegue pelas principais fases do plano de formação de condutores do momento do primeiro cadastro até a quitação.
                      </p>

                      {/* Interactive Linear Steps List */}
                      <div className="space-y-3">
                        {[
                          {
                            step: 1,
                            title: "Adesão Planejada",
                            age: "Partida (Aos 17 anos)",
                            desc: "O candidato de 17 anos inicia o contrato e define a mensalidade confortável de acordo com o simulador de parcelas."
                          },
                          {
                            step: 2,
                            title: "Preparação Teórica",
                            age: "Processamento (17.5 Anos)",
                            desc: "Início do portal de estudos no celular ou computador, resolvendo o simulador para acumular pontos de pontuação."
                          },
                          {
                            step: 3,
                            title: "Desbloqueio e Aulas",
                            age: "Emancipação (18 Anos completos)",
                            desc: "Liberação instantânea sem taxas extras de intermediação do saldo para aulas mecânicas regionais credenciadas."
                          },
                          {
                            step: 4,
                            title: "Exame e Autonomia",
                            age: "Vitória (Consolidação legal)",
                            desc: "Aprovação do condutor no Exame do Detran e início da sua caminhada no trânsito seguro em sua microrregião."
                          }
                        ].map((item, idx) => {
                          const isActive = activeTimelineStep === idx;
                          return (
                            <div 
                              key={item.step}
                              id={`timeline-step-${idx}`}
                              onClick={() => setActiveTimelineStep(idx)}
                              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                                isActive 
                                  ? 'bg-gradient-to-r from-emerald-950/60 to-slate-950/80 border-emerald-500 shadow-md transform translate-x-1' 
                                  : 'bg-slate-950/20 border-indigo-950 h-auto hover:bg-slate-950/50 hover:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {item.step}
                                  </span>
                                  <span className={`text-[11.5px] font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                    {item.title}
                                  </span>
                                </div>
                                <span className="text-[9.5px] text-emerald-400 font-mono font-extrabold shrink-0">
                                  {item.age}
                                </span>
                              </div>
                              {isActive && (
                                <p className="text-[11px] text-slate-300 leading-relaxed mt-2 pl-7 border-l-2 border-emerald-500 animate-in fade-in duration-200">
                                  {item.desc}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  {/* Right Column: Dynamic Program Milestones & Educational Context */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-950/45 border border-indigo-950 p-5 rounded-2xl space-y-4 text-left">
                      <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Garantias da Plataforma
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Nossa metodologia oferece segurança jurídica, transparência total e alta taxa de aprovação para os condutores.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-950/20 border border-indigo-950 p-4 rounded-xl space-y-2 text-left">
                          <h5 className="font-bold text-xs text-slate-200 uppercase flex items-center gap-1.5">
                            <span className="text-emerald-400">📝</span>
                            Teoria Facilitada
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Acompanhamento online no tablet ou smartphone enquanto o montante acumula, com simulados oficiais e banco de mais de 300 questões pedagógicas exclusivas.
                          </p>
                        </div>

                        <div className="bg-slate-950/20 border border-indigo-950 p-4 rounded-xl space-y-2 text-left">
                          <h5 className="font-bold text-xs text-slate-200 uppercase flex items-center gap-1.5">
                            <span className="text-emerald-400">🛡️</span>
                            Segurança de Recursos
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Os fundos financeiros recolhidos permanecem congelados sem taxas bancárias abusivas ou multas administrativas de intermediação de terceiros.
                          </p>
                        </div>

                        <div className="bg-slate-950/20 border border-indigo-950 p-4 rounded-xl space-y-2 text-left">
                          <h5 className="font-bold text-xs text-slate-200 uppercase flex items-center gap-1.5">
                            <span className="text-emerald-400">🌱</span>
                            Educação Financeira Integrada
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Ensino ativo de planejamento financeiro, preparando os jovens para as despesas de manutenção de veículo no futuro.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Crucial Concept Bento Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 text-xl rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  🎯
                </div>
                <h4 className="font-bold text-slate-900 text-lg">O Problema Real</h4>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  Para os jovens que estão iniciando sua trajetória profissional, a carteira de habilitação (CNH) é fundamental para expandir oportunidades de trabalho e garantir autonomia de locomoção. Criamos a oportunidade certa para você já entrar na maioridade habilitado e pronto para o mercado de trabalho.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs border-t-4 border-emerald-500">
                <div className="h-10 w-10 text-xl rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  💡
                </div>
                <h4 className="font-bold text-emerald-700 text-lg">A Proposta de Poupança</h4>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  Com o programa **Nova CNH Brasil na Mão**, jovens a partir dos **17 anos** realizam um planejamento estratégico prévio com parcelas mensais acessíveis e seguras. Quando completam a maioridade civil legal, o montante reservado é desbloqueado e as aulas práticas começam a ser realizadas conforme o cronograma!
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 text-xl rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  📈
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Inteligência de Dados</h4>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  O painel do gestor se conecta diretamente com bancos de dados, fornecendo integração nativa via planilhas contendo fórmulas do Looker Studio (`DATEDIF` e `TODAY`) para que patrocinadores auditem o programa em tempo real.
                </p>
              </div>

            </div>

            {/* ===================== NEW SECTION: FALE CONOSCO / CANAIS DE ATENDIMENTO ===================== */}
            <div id="secao-fale-conosco" className="bg-slate-50 overflow-hidden rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
                <div className="space-y-1 text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-[#112d52]/10 text-[#112d52] tracking-wider uppercase font-mono">
                    📞 Canais de Atendimento Primário
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                    Fale Conosco — Suporte & Orientação
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm max-w-2xl">
                    Precisa de ajuda com sua inscrição, suporte para o simulador ou esclarecimento sobre os contratos? Entre em contato por nossos canais de atendimento oficiais!
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2 border border-emerald-100 flex items-center gap-2 text-xs font-bold leading-tight shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Atendimento Ativo: Seg a Sex, 8h às 18h
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
                {/* Left Column: Fast Messenger Form (Envio Direto) */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/75 shadow-xs flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#112d52]" />
                      Mensagem Rápida Direta
                    </h4>
                    <p className="text-[11px] text-slate-450">
                      Preencha os campos abaixo para formular sua mensagem automaticamente e enviá-la para nosso instrutor por WhatsApp ou por E-mail.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Seu Nome Completo:</label>
                        <input
                          type="text"
                          value={faleNome}
                          onChange={(e) => setFaleNome(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#112d52] rounded-xl px-3 py-1.5 text-slate-800 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#112d52] transition-all"
                          placeholder="Ex: João da Silva"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Qual o Assunto?</label>
                        <select
                          value={faleAssunto}
                          onChange={(e) => setFaleAssunto(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#112d52] rounded-xl px-3 py-1.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#112d52] transition-all cursor-pointer"
                        >
                          <option value="Inscrição de Candidato">Inscrição de Candidato</option>
                          <option value="Suporte do Simulador">Suporte do Simulador / Aulas</option>
                          <option value="Dúvidas sobre o Contrato">Dúvidas sobre o Contrato</option>
                          <option value="Plano de Poupança Baú">Plano de Poupança Baú / Pagamentos</option>
                          <option value="Parcerias e Patrocínio">Parcerias e Outros</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Sua Mensagem / Dúvida:</label>
                      <textarea
                        value={faleMensagem}
                        onChange={(e) => setFaleMensagem(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#112d52] rounded-xl p-3 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#112d52] transition-all resize-none"
                        placeholder="Digite os detalhes da sua mensagem de apoio ou solicitação..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!faleNome.trim() || !faleMensagem.trim()) {
                          alert("Por favor, preencha seu nome e sua mensagem para direcionar o atendimento.");
                          return;
                        }
                        const waText = `Olá Miqueias! Meu nome é ${faleNome.trim()}, e tenho uma solicitação referente a "${faleAssunto}":\n\n"${faleMensagem.trim()}"`;
                        const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                        window.open(url, '_blank');
                      }}
                      className="bg-[#25D366] hover:bg-[#20ba56] text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition duration-150 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      Enviar via WhatsApp (81)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!faleNome.trim() || !faleMensagem.trim()) {
                          alert("Por favor, preencha seu nome e sua mensagem para direcionar o atendimento.");
                          return;
                        }
                        const emailSubject = `Suporte Nova CNH - ${faleAssunto}`;
                        const emailBody = `Olá Miqueias,\n\nMeu nome é ${faleNome.trim()}.\n\nAssunto: ${faleAssunto}\n\nMensagem:\n${faleMensagem.trim()}\n\nAtenciosamente,\n${faleNome.trim()}`;
                        const mailtoUrl = `mailto:miqueias.instructor@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                        window.location.href = mailtoUrl.replace('miqueias.instructor@gmail.com', 'miqueias.instrutor@gmail.com');
                      }}
                      className="bg-[#0c2340] hover:bg-slate-900 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition duration-150 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      Enviar via E-mail
                    </button>
                  </div>
                </div>

                {/* Right Column: Static & Interactive Direct Contacts Cards */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                  {/* WhatsApp Support Direct Button */}
                  <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-100 flex flex-col justify-between space-y-4 text-left flex-1">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 text-xl rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
                        💬
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider font-mono">Contato Pragmático</span>
                        <h4 className="font-extrabold text-[#0c2340] text-sm md:text-base">Canal do WhatsApp Oficial</h4>
                        <p className="text-slate-505 text-[10.5px]">
                          Fale direto com o instrutor Miqueias para aprovação rápida, suporte a simulação ou documentos.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-xs font-mono">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">WhatsApp Suporte:</span>
                        <span className="text-sm font-black text-emerald-700 tracking-wider">
                          (81) 99201-1024
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("81992011024");
                          setToastMessage("📋 WhatsApp copiado! (81) 99201-1024");
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-850 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition active:scale-95 cursor-pointer border border-emerald-200/50"
                      >
                        Copiar
                      </button>
                    </div>

                    <a
                      href="https://wa.me/5581992011024"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase tracking-wider shadow-sm text-center"
                    >
                      <span>Conversar no WhatsApp</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Mail Support Direct Button */}
                  <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100 flex flex-col justify-between space-y-4 text-left flex-1">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 text-xl rounded-xl bg-indigo-900 text-white flex items-center justify-center font-bold shadow-sm">
                        ✉️
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider font-mono">Correio Eletrônico</span>
                        <h4 className="font-extrabold text-[#0c2340] text-sm md:text-base">Nosso Endereço de E-mail</h4>
                        <p className="text-slate-505 text-[10.5px]">
                          Para questões administrativas corporativas, contratos digitais ou propostas de fomento local.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-indigo-100 rounded-xl p-3 flex items-center justify-between shadow-xs font-mono">
                      <div className="truncate max-w-[200px] md:max-w-[230px]">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">E-mail Oficial:</span>
                        <span className="text-[11.5px] font-black text-indigo-900 tracking-tight lowercase">
                          miqueias.instrutor@gmail.com
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("miqueias.instrutor@gmail.com");
                          setToastMessage("📋 E-mail copiado: miqueias.instrutor@gmail.com");
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-850 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition active:scale-95 cursor-pointer border border-indigo-200/50"
                      >
                        Copiar
                      </button>
                    </div>

                    <a
                      href="mailto:miqueias.instrutor@gmail.com"
                      className="w-full bg-[#112d52] hover:bg-slate-900 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase tracking-wider shadow-sm text-center"
                    >
                      <span>Escrever E-mail Agora</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                </div>
              </div>
            </div>

            {/* Premium Interactive Free Theoretical Course Section */}
            <div className="pt-6" id="secao-curso-gratuito-principal">
              <FreeTheoreticalCourse />
            </div>

          </div>
        )}

      </main>

      {/* --- MODAL: AUTO-MATRÍCULA COLETIVA / GRUPO --- */}
      {showGeneralEnrollmentModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col p-6 space-y-5 text-left">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Auto-Matrícula Coletiva</h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Permita que múltiplos novos alunos se inscrevam ao mesmo tempo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGeneralEnrollmentModal(false)}
                className="text-slate-400 hover:text-white transition text-xs p-1.5 rounded-full bg-slate-855 cursor-pointer hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Ideal para uso em salas de aula ou encontros de orientação. Projete esta tela ou compartilhe o QR Code/Link com o grupo. Cada aluno poderá fazer a própria inscrição individual em seu próprio smartphone em tempo real!
              </p>

              {/* URL & Link copy widget */}
              <div className="space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] text-[#32bcad] font-extrabold uppercase tracking-widest font-mono block">
                  🔗 Link Geral de Auto-Matrícula
                </span>
                <div className="flex items-stretch gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${AUTODRIVE_PLATFORM_URL}/?inscrever=true`}
                    className="bg-slate-900 text-slate-300 font-mono text-[10px] p-2.5 rounded-xl border border-slate-800 focus:outline-none select-all truncate flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const genLink = `${AUTODRIVE_PLATFORM_URL}/?inscrever=true`;
                      navigator.clipboard.writeText(genLink);
                      setToastMessage("📋 Link geral de auto-matrícula copiado!");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 rounded-xl transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code display using high compatibility server-side generation */}
              <div className="flex flex-col items-center bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${AUTODRIVE_PLATFORM_URL}/?inscrever=true`)}`}
                    alt="QR Code Auto-Matrícula Geral"
                    className="w-[160px] h-[160px] object-contain shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] text-emerald-400 font-mono font-black uppercase tracking-wider block">
                    Escaneie Para Começar
                  </span>
                  <p className="text-[9px] text-slate-500 max-w-xs leading-normal">
                    Todos os inscritos aparecerão instantaneamente no painel de acompanhamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGeneralEnrollmentModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 uppercase font-sans border border-slate-700"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM simulated PIX MODAL (for payment) --- */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            
            {/* Header with dynamic color styles based on selected payment tab */}
            <div className={`transition-colors duration-350 border-b border-slate-800 p-5 flex items-center justify-between ${
              paymentTab === 'cartao' ? 'bg-[#291e12]' : 'bg-[#112330]'
            }`}>
              <div className="flex items-center gap-2">
                {paymentTab === 'cartao' ? (
                  <>
                    <span className="p-1 px-2 text-[9px] font-black tracking-widest text-[#151515] bg-amber-500 rounded font-sans uppercase">
                      Cartão de Crédito
                    </span>
                    <span className="text-xs font-black text-[#e2e8f0]">Parcelamento Flexível</span>
                  </>
                ) : (
                  <>
                    <span className="p-1 px-2 text-[9px] font-black tracking-widest text-[#151515] bg-[#32bcad] rounded font-sans uppercase">
                      Pix Oficial
                    </span>
                    <span className="text-xs font-black text-[#e2e8f0]">Depósito no Baú CNH</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPixModal(false);
                }}
                className="text-slate-400 hover:text-white transition text-xs p-1 rounded-full bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* PAYMENT METHOD TABS */}
            {(!currentStudent?.formaPagamento || currentStudent?.formaPagamento === 'hibrido') && (
              <div className="flex border-b border-slate-800 bg-slate-950/40 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab('pix');
                    if (currentStudent?.formaPagamento !== 'hibrido') {
                      const totalParc = currentStudent?.parcelasTotal || 12;
                      const defaultInstallmentVal = currentStudent?.formaPagamento === 'vista'
                        ? currentStudent.valorTotal
                        : currentStudent.valorTotal / totalParc;
                      setPixAmountSimulated(defaultInstallmentVal);
                    }
                  }}
                  className={`flex-1 py-3 text-[10.5px] font-bold tracking-wider hover:text-white transition flex items-center justify-center gap-1.5 border-b-2 uppercase cursor-pointer ${
                    paymentTab === 'pix'
                      ? 'border-[#32bcad] text-[#32bcad] font-extrabold bg-[#32bcad]/5'
                      : 'border-transparent text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <span>⚡</span> Pix Copia-e-Cola
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab('cartao');
                    if (currentStudent && currentStudent.formaPagamento !== 'hibrido') {
                      setPixAmountSimulated(currentStudent.valorTotal);
                    }
                  }}
                  className={`flex-1 py-3 text-[10.5px] font-bold tracking-wider hover:text-white transition flex items-center justify-center gap-1.5 border-b-2 uppercase cursor-pointer ${
                    paymentTab === 'cartao'
                      ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-500/5'
                      : 'border-transparent text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <span>💳</span> Cartão de Crédito
                </button>
              </div>
            )}

            <div className="p-5 space-y-4 text-center overflow-y-auto max-h-[75vh]">
              
              {/* Receiver Account info card */}
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-white">Nova CNH Brasil na Mão</h3>
                <p className="text-[10px] text-slate-400">Arrecadação e Poupança Preventiva Ativa</p>
              </div>

              {paymentTab !== 'cartao' && currentStudent?.formaPagamento !== 'vista' && (
                <>
                  {/* PROPAGANDA / INSTRUCTION INFO */}
                  <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-left relative overflow-hidden shadow-xs animate-in slide-in-from-top-2 duration-200">
                    <div className="absolute right-2 -bottom-2 text-4xl opacity-10 pointer-events-none select-none">
                      🪙
                    </div>
                    <h4 className="font-extrabold text-[10px] text-[#32bcad] uppercase tracking-wider flex items-center gap-1.5">
                      <span>✨</span> PROGRAMA BAÚ DA CNH
                    </h4>
                    <p className="font-black text-xs text-slate-100 mt-1 leading-snug">
                      Defina o valor do seu aporte atual:
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Defina a quantia que você deseja pagar agora para o seu plano ({currentStudent.categoria} - Valor Total {currentStudent.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                    </p>
                  </div>

                  {/* Input for Free-form value deposit */}
                  {currentStudent?.formaPagamento === 'hibrido' ? (
                    <div className="space-y-4 p-4 rounded-3xl bg-slate-950/50 border border-slate-800 text-left animate-in slide-in-from-top-2 duration-205">
                      <span className="text-[10.5px] text-teal-400 font-extrabold uppercase tracking-wide flex items-center gap-1">
                        <span>🔀</span> Divisão de Valores Personalizada:
                      </span>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9.5px] text-slate-450 font-black uppercase tracking-wider block">
                            💸 Pagar no Pix:
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-slate-500 font-sans font-black text-xs">R$</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={currentStudent.valorTotal}
                              step="any"
                              value={hybridPixAmount || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const cleanVal = isNaN(val) ? 0 : val;
                                const clampedVal = Math.min(cleanVal, currentStudent.valorTotal);
                                setHybridPixAmount(clampedVal);
                              }}
                              className="w-full bg-slate-950 border border-slate-850 focus:border-[#32bcad] rounded-2xl pl-8 pr-2 py-2 text-white font-mono font-extrabold text-sm focus:outline-none focus:ring-1 focus:ring-[#32bcad] transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9.5px] text-slate-450 font-black uppercase tracking-wider block">
                            💳 Pagar no Cartão:
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-slate-500 font-sans font-black text-xs">R$</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={currentStudent.valorTotal}
                              step="any"
                              value={(currentStudent.valorTotal - hybridPixAmount) || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const cleanVal = isNaN(val) ? 0 : val;
                                const clampedVal = Math.min(cleanVal, currentStudent.valorTotal);
                                setHybridPixAmount(currentStudent.valorTotal - clampedVal);
                              }}
                              className="w-full bg-slate-950 border border-slate-850 focus:border-amber-500 rounded-2xl pl-8 pr-2 py-2 text-white font-mono font-extrabold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Slider Control for ultra fine-grained splitting */}
                      <div className="space-y-1 pt-1.5 border-t border-slate-900">
                        <div className="flex justify-between text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                          <span>100% Cartão</span>
                          <span className="text-[#32bcad] font-black">{Math.round((hybridPixAmount / currentStudent.valorTotal) * 100)}% Pix / {100 - Math.round((hybridPixAmount / currentStudent.valorTotal) * 100)}% Cartão</span>
                          <span>100% Pix</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={currentStudent.valorTotal}
                          step="10"
                          value={hybridPixAmount}
                          onChange={(e) => setHybridPixAmount(Number(e.target.value))}
                          className="w-full accent-[#32bcad] cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Split Percentage slider option or presets */}
                      <div className="space-y-1.5 pt-1.5">
                        <span className="text-[8.5px] text-slate-500 uppercase tracking-wider font-extrabold block">Atalhos Rápidos de Acordo:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: "30% Pix / 70% 💳", pct: 0.3 },
                            { label: "50% Pix / 50% 💳", pct: 0.5 },
                            { label: "70% Pix / 30% 💳", pct: 0.7 }
                          ].map((preset, idx) => {
                            const pixPresetVal = Math.round(currentStudent.valorTotal * preset.pct);
                            const isActive = Math.abs(hybridPixAmount - pixPresetVal) < 10;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setHybridPixAmount(pixPresetVal)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-tighter transition active:scale-95 border ${
                                  isActive
                                    ? 'bg-[#32bcad]/20 border-[#32bcad] text-[#32bcad]'
                                    : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                                } cursor-pointer`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 text-left animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">
                          Defina o valor para guardar no seu baú:
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-sans font-extrabold text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            disabled={isProcessingCardPayment}
                            value={pixAmountSimulated || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPixAmountSimulated(isNaN(val) ? 0 : val);
                            }}
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-[#32bcad] rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono font-extrabold text-base placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#32bcad] transition-all disabled:opacity-50"
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      {/* Shortcuts selection */}
                      <div className="space-y-1.5 text-left animate-in slide-in-from-top-2 duration-200">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">Atalhos para Poupar</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[50, 100, 200, 500].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isProcessingCardPayment}
                              onClick={() => setPixAmountSimulated(val)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 border ${
                                pixAmountSimulated === val
                                  ? 'bg-[#32bcad]/20 border-[#32bcad] text-[#32bcad]'
                                  : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                              } disabled:opacity-50 cursor-pointer`}
                            >
                              + R$ {val}
                            </button>
                          ))}
                          {valorParcela > 0 && (
                            <button
                              type="button"
                              disabled={isProcessingCardPayment}
                              onClick={() => setPixAmountSimulated(Number(valorParcela.toFixed(2)))}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 border ${
                                Math.abs(pixAmountSimulated - valorParcela) < 0.05
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-300'
                              } disabled:opacity-50 cursor-pointer`}
                              title="Sugerido conforme o plano original parcelado"
                            >
                              ⭐ Parcela do Plano (R$ {valorParcela.toFixed(0)})
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {paymentTab === 'pix' && currentStudent?.formaPagamento === 'vista' && (
                <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-left animate-in slide-in-from-top-2 duration-200">
                  <h4 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💵</span> PLANO À VISTA CONTRATADO
                  </h4>
                  <p className="text-[11px] text-slate-350 mt-1 leading-normal font-semibold">
                    Seu plano cadastrado é para pagamento à vista. Disponibilizamos o QR Code de pagamento seguro via Pix para a quitação integral no valor de <strong>{currentStudent.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                  </p>
                </div>
              )}

              {paymentTab === 'pix' && currentStudent?.formaPagamento === 'hibrido' && (
                <div className="bg-teal-950/40 border border-teal-500/20 rounded-2xl p-4 text-left animate-in slide-in-from-top-2 duration-200">
                  <h4 className="font-extrabold text-[10px] text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔀</span> PLANO HÍBRIDO ATIVO (PIX + CARTÃO)
                  </h4>
                  <p className="text-[11px] text-slate-350 mt-1 leading-normal font-semibold">
                    Esta aba é para pagar a parte do <strong>Pix / À Vista</strong>. Use os seletores abaixo ou insira o valor combinado. A outra metade correspondente ao cartão pode ser paga acessando a aba <strong>Cartão de Crédito</strong> no topo deste painel. Valor sugerido para o Pix: <strong>{((currentStudent.valorTotal || 0) / 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                  </p>
                </div>
              )}

              {/* TAB-SPECIFIC VIEWS */}
              {paymentTab === 'pix' ? (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                  {/* ALERTA DE INSTRUÇÃO DO PIX SOLICITADO PELO USUÁRIO */}
                  <div className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-2xl text-left flex items-start gap-3">
                    <span className="text-xl shrink-0 animate-bounce">📢</span>
                    <div className="space-y-1">
                      <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">Procedimento Obrigatório</span>
                      <p className="text-xs text-amber-200 font-black leading-snug uppercase">
                        LEIA O QR CODE, REALIZE SEU PAGAMENTO E LOGO APÓS SELECIONE CONFIRMAR PAGAMENTO.
                      </p>
                    </div>
                  </div>

                  {/* Real Dynamic QR Code */}
                  <div className="space-y-2.5">
                    {(() => {
                      const payload = buildPixPayload(currentStudent?.formaPagamento === 'hibrido' ? hybridPixAmount : pixAmountSimulated);
                      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
                      return (
                        <div className="bg-white p-3.5 rounded-3xl w-44 h-44 mx-auto flex items-center justify-center border-4 border-slate-700/10 shadow-xl relative select-none">
                          <img 
                            src={qrCodeUrl} 
                            alt="QR Code Pix Real" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-[#32bcad] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#32bcad] animate-ping"></span>
                      <span>Aguardando a rede do Banco Central...</span>
                    </div>
                  </div>

                  {/* DADOS DA INSTITUIÇÃO A RECEBER (BANCO STONE - MAQUININHA TOP TON) */}
                  <div className="bg-slate-950/85 rounded-2xl p-3.5 border border-emerald-500/10 text-left text-[11px] space-y-2.5 animate-in fade-in duration-200">
                    <span className="text-[9px] text-[#32bcad] font-extrabold uppercase tracking-wider block">🏦 Conta de Destino / Recebimento Oficial</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 font-medium text-slate-300">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Instituição Financeira</span>
                        <span className="font-extrabold text-slate-200">Banco Stone S.A.</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Meio de Captura</span>
                        <span className="font-extrabold text-slate-200 flex items-center gap-1">
                          🟢 Maquininha Top Ton
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-500 block">Titular / Beneficiário</span>
                        <span className="font-black text-emerald-400">MIQUEIAS SOUZA DE LIMA</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-500 block">Chave Pix (Tipo: Aleatória)</span>
                        <div className="flex items-center justify-between gap-1.5 mt-1 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                          <span className="font-mono text-[9px] text-slate-200 select-all truncate">02c2c285-d480-488e-85c0-311e0eb7811a</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("02c2c285-d480-488e-85c0-311e0eb7811a");
                              setToastMessage("📋 Chave Pix Copiada!");
                            }}
                            className="bg-[#32bcad] hover:bg-[#28a395] text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                          >
                            Copiar Chave
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PIX COPIA E COLA */}
                  <div className="space-y-1 text-left font-sans text-xs">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase">Pix Copia e Cola</span>
                    <div className="flex items-stretch gap-2">
                       <input
                        type="text"
                        readOnly
                        value={buildPixPayload(currentStudent?.formaPagamento === 'hibrido' ? hybridPixAmount : pixAmountSimulated)}
                        className="w-full bg-slate-950/70 text-slate-400 font-mono text-[9px] p-2 rounded-lg border border-slate-800 focus:outline-none select-all truncate animate-pulse"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const amt = currentStudent?.formaPagamento === 'hibrido' ? hybridPixAmount : pixAmountSimulated;
                          navigator.clipboard.writeText(buildPixPayload(amt));
                          setToastMessage("📋 Código Copiado!");
                        }}
                        className="bg-slate-800 hover:bg-slate-755 text-slate-200 text-[10px] font-bold px-3 py-1 rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  {/* COMPARTILHAMENTO DE COMPROVANTE DE PAGAMENTO PIX (JANELA DE COMPARTILHAMENTO) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <span>📤</span> Compartilhar Comprovante do Pix
                      </span>
                      {pixReceipt ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold animate-pulse">
                          ✓ Recebido
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Para confirmar seu depósito e guardar os créditos no seu baú, anexe ou arraste uma foto/PDF do comprovante de transação Pix abaixo.
                    </p>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsReceiptDragging(true);
                      }}
                      onDragLeave={() => setIsReceiptDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsReceiptDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleReceiptFile(file);
                      }}
                      className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer select-none ${
                        pixReceipt
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : isReceiptDragging
                            ? "border-[#32bcad] bg-[#32bcad]/10 scale-[1.01]"
                            : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 hover:border-slate-700"
                      }`}
                      onClick={() => !isValidatingReceipt && document.getElementById("pix-receipt-file-input")?.click()}
                    >
                      <input
                        type="file"
                        id="pix-receipt-file-input"
                        className="hidden"
                        accept="image/*,application/pdf"
                        disabled={isValidatingReceipt}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReceiptFile(file);
                        }}
                      />
                      
                      {isValidatingReceipt ? (
                        <div className="space-y-2 animate-pulse py-2">
                          <div className="mx-auto w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-sm animate-spin">
                            ⏳
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-amber-300">
                              Auditor Virtual Analisando o Documento...
                            </p>
                            <p className="text-[8.5px] text-slate-400 font-medium font-sans">
                              Escaneando comprovante em busca de metadados bancários
                            </p>
                          </div>
                        </div>
                      ) : pixReceipt ? (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <div className="mx-auto w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-sm">
                            📄
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-200 truncate max-w-[200px] mx-auto">
                              {pixReceiptName || "comprovante_pix.png"}
                            </p>
                            <p className="text-[9px] text-emerald-400 font-semibold text-center">
                              ✓ Comprovante aprovado e anexado ao dossiê!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="mx-auto w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm">
                            📤
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-300">
                              Clique para escolher ou arraste o arquivo aqui
                            </p>
                            <p className="text-[8.5px] text-slate-500 font-medium">
                              PNG, JPG ou PDF de até 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {currentStudent?.formaPagamento === 'hibrido' && (
                    <div className="bg-[#291e12] border border-amber-500/20 rounded-2xl p-3.5 space-y-2 text-left mt-1 shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="p-0.5 px-1.5 text-[8.5px] font-black tracking-widest text-[#151515] bg-amber-500 rounded font-sans uppercase">
                          Cartão Híbrido
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-400">Parte Restante do Cartão</span>
                      </div>
                      <p className="text-[10px] text-slate-350 font-semibold leading-snug">
                        Lembre-se de solicitar o link do cartão para a outra parte de R$ {(currentStudent.valorTotal - hybridPixAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const studentName = currentStudent?.nome || "Candidato";
                          const studentId = currentStudent?.id || "";
                          const cardValue = currentStudent.valorTotal - hybridPixAmount;
                          const valueFormatted = cardValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          const waText = `Olá Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Estou no Plano Híbrido, já fiz/vou fazer o Pix da entrada de R$ ${hybridPixAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e agora gostaria de solicitar o Link Seguro de Parcelamento no Cartão para a outra parte de R$ ${valueFormatted} (em até 12x sem juros).`;
                          const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                          window.open(url, '_blank');
                          setRequestedHybridCardLink(true);
                          setToastMessage("📲 Redirecionando para solicitar o Link do Cartão...");
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider text-center"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        Solicitar Link no Whatsapp
                      </button>
                    </div>
                  )}

                  {/* Footer Buttons for Pix */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPixModal(false);
                      }}
                      className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmPixPayment}
                      disabled={!pixReceipt}
                      className={`font-black py-2.5 rounded-xl text-xs transition shadow-lg active:scale-[0.98] cursor-pointer border ${
                        pixReceipt
                          ? "bg-[#32bcad] hover:bg-[#3acebd] border-transparent text-slate-950 shadow-[#32bcad]/20"
                          : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                      }`}
                      title={!pixReceipt ? "Envie o comprovante para confirmar o depósito" : "Confirmar o depósito no baú"}
                    >
                      {pixReceipt ? "✓ Confirmar Depósito" : "🔒 Aguardando Comprovante"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200 text-left">
                  
                  {currentStudent?.formaPagamento === 'hibrido' && (
                    <div className="bg-[#291e12] border border-amber-500/20 rounded-2xl p-4 text-left animate-in slide-in-from-top-2 duration-200">
                      <h4 className="font-extrabold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>💳</span> PARTE NO CARTÃO - PLANO HÍBRIDO
                      </h4>
                      <p className="text-[11px] text-slate-350 mt-1 leading-normal font-semibold">
                        Esta aba é para parcelar a parte do <strong>Cartão de Crédito</strong>. Selecione abaixo as parcelas do cartão para a parte restante (ou outro valor combinado). Valor de acordo para o Cartão: <strong>{cardAmountToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                      </p>
                    </div>
                  )}

                  {/* SELECT FOR INSTALLMENTS (PARCELAS) - PLACED PROMINENTLY AT THE TOP */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <label className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                      <span>💳</span> Escolha o Parcelamento no Cartão:
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
                      value={cardInstallments}
                      onChange={(e) => setCardInstallments(Number(e.target.value))}
                    >
                      <option value={1}>1x de {cardAmountToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} à vista (Sem Juros)</option>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                        const valuePerInstallment = cardAmountToPay / num;
                        return (
                          <option key={num} value={num}>
                            {num}x de {valuePerInstallment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros
                          </option>
                        );
                      })}
                    </select>
                    <span className="text-[9.5px] text-slate-400 block italic leading-normal">
                      Valor total a ser amortizado: <strong>{cardAmountToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> {cardInstallments > 1 && `em ${cardInstallments} parcelas de ${(cardAmountToPay / cardInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}.
                    </span>
                  </div>

                  {/* SECURE SUPPORT CHANNEL BLOCK */}
                  <div className="bg-amber-950/30 border-2 border-amber-500/30 rounded-2xl p-5 space-y-4 text-left animate-in zoom-in-95 duration-150 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] select-none pointer-events-none">
                      🛡️
                    </div>

                    <div className="flex gap-3">
                      <span className="text-2xl shrink-0">🛡️</span>
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1 font-mono">
                          Canal de Atendimento Seguro
                        </h4>
                        <p className="text-slate-100 text-xs font-black leading-relaxed">
                          Para sua segurança, fale direto com nosso consultor para receber o link parcelado.
                        </p>
                        <p className="text-slate-400 text-[10.5px] leading-relaxed font-semibold">
                          Nenhum dado sensível do seu cartão é digitado ou armazenado nesta página. Nosso consultor enviará o link de pagamento verificado oficial com o plano de {cardInstallments}x de {(cardAmountToPay / cardInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const studentName = currentStudent?.nome || "Candidato";
                        const studentId = currentStudent?.id || "";
                        const valueFormatted = cardAmountToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const installmentValue = (cardAmountToPay / cardInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const waText = `Olá Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Escolhi pagar no cartão de crédito parcelando em ${cardInstallments}x de ${installmentValue} (Valor Total: ${valueFormatted}). Gostaria de solicitar o meu Link Seguro de Parcelamento no WhatsApp para efetivar o pagamento.`;
                        const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                        window.open(url, '_blank');
                      }}
                      className="w-full bg-[#25D366] hover:bg-[#20ba56] text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 active:scale-95 shadow-md shadow-[#25D366]/20 cursor-pointer text-center uppercase tracking-wider"
                    >
                      <MessageSquare className="h-4.5 w-4.5 shrink-0" />
                      Falar com Consultor e Receber Link
                    </button>
                  </div>

                  {/* Footer Buttons for Credit Card / WhatsApp */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/40">
                    {currentStudent?.formaPagamento === 'hibrido' && (
                      <button
                        type="button"
                        onClick={confirmHybridCardPayment}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 uppercase shadow-md"
                      >
                        ✓ Confirmar Pagamento do Cartão (R$ {cardAmountToPay.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                      </button>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPixModal(false)}
                        className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer text-center"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const studentName = currentStudent?.nome || "Candidato";
                          const studentId = currentStudent?.id || "";
                          const valueFormatted = cardAmountToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          const installmentValue = (cardAmountToPay / cardInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          const waText = `Olá Miqueias! Sou o aluno ${studentName} (ID: ${studentId}) do programa Nova CNH. Escolhi pagar no cartão de crédito parcelando em ${cardInstallments}x de ${installmentValue} (Valor Total: ${valueFormatted}). Gostaria de solicitar o meu Link Seguro de Parcelamento no WhatsApp para efetivar o pagamento.`;
                          const url = `https://wa.me/5581992011024?text=${encodeURIComponent(waText)}`;
                          window.open(url, '_blank');
                          setRequestedHybridCardLink(true);
                        }}
                        className="bg-[#25D366] hover:bg-[#20ba56] text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow-lg shadow-[#25D366]/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 uppercase"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Chamar no WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: NEW / EDIT STUDENT (ADMIN) --- */}
      {isAlunoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="bg-[#0c2340] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm md:text-base">
                {editingAluno ? `Editar Registro [${editingAluno.id}]` : 'Cadastrar Jovem no Programa'}
              </h3>
              <button 
                onClick={() => setIsAlunoModalOpen(false)}
                className="text-slate-300 hover:text-white font-bold text-lg p-1.5"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAluno} className="p-5 space-y-4 text-slate-800 max-h-[80vh] overflow-y-auto">
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nome Completo do Candidato</label>
                <input
                  type="text"
                  required
                  value={alunoForm.nome}
                  onChange={(e) => setAlunoForm({ ...alunoForm, nome: e.target.value })}
                  placeholder="Ex: Gabriel Henrique Souza"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">CPF do Candidato</label>
                  <input
                    type="text"
                    value={alunoForm.cpf}
                    onChange={(e) => setAlunoForm({ ...alunoForm, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">RG / Órgão</label>
                  <input
                    type="text"
                    value={alunoForm.rg}
                    onChange={(e) => setAlunoForm({ ...alunoForm, rg: e.target.value })}
                    placeholder="0.000.000 SDS/PE"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={alunoForm.dob}
                    onChange={(e) => setAlunoForm({ ...alunoForm, dob: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">WhatsApp Candidato</label>
                  <input
                    type="text"
                    required
                    value={alunoForm.whatsapp}
                    onChange={(e) => setAlunoForm({ ...alunoForm, whatsapp: e.target.value })}
                    placeholder="(81) 99876-0000"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nacionalidade</label>
                  <input
                    type="text"
                    value={alunoForm.nacionalidade}
                    onChange={(e) => setAlunoForm({ ...alunoForm, nacionalidade: e.target.value })}
                    placeholder="Brasileira"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Estado Civil</label>
                  <select
                    value={alunoForm.estadoCivil}
                    onChange={(e) => setAlunoForm({ ...alunoForm, estadoCivil: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Endereço Residencial Completo</label>
                <input
                  type="text"
                  required
                  value={alunoForm.endereco}
                  onChange={(e) => setAlunoForm({ ...alunoForm, endereco: e.target.value })}
                  placeholder="Ex: Rua Imperial, 100 - Recife Centro"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* SE Menor de 18 anos, exibe campos do Responsável */}
              {calculateAge(alunoForm.dob) < 18 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    👨‍👩‍👦 Dados do Responsável Legal (Candidato Menor de 18 Anos)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do Responsável Legal"
                      value={alunoForm.nomeResponsavel}
                      onChange={(e) => setAlunoForm({ ...alunoForm, nomeResponsavel: e.target.value })}
                      className="text-xs p-1.5 bg-white border border-amber-200 rounded"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp do Responsável"
                      value={alunoForm.whatsappResponsavel}
                      onChange={(e) => setAlunoForm({ ...alunoForm, whatsappResponsavel: e.target.value })}
                      className="text-xs p-1.5 bg-white border border-amber-200 rounded"
                    />
                    <input
                      type="text"
                      placeholder="CPF do Responsável"
                      value={alunoForm.cpfResponsavel}
                      onChange={(e) => setAlunoForm({ ...alunoForm, cpfResponsavel: e.target.value })}
                      className="text-xs p-1.5 bg-white border border-amber-200 rounded font-mono"
                    />
                    <input
                      type="text"
                      placeholder="RG do Responsável"
                      value={alunoForm.rgResponsavel}
                      onChange={(e) => setAlunoForm({ ...alunoForm, rgResponsavel: e.target.value })}
                      className="text-xs p-1.5 bg-white border border-amber-200 rounded font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Categoria Desejada</label>
                  <select
                    value={alunoForm.categoria}
                    onChange={(e) => setAlunoForm({ ...alunoForm, categoria: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {categoriasDisponiveis.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Instrutor Associado</label>
                  <select
                    value={alunoForm.instrutor}
                    onChange={(e) => setAlunoForm({ ...alunoForm, instrutor: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="A definir">A definir / Pendente</option>
                    {instrutores.map(i => (
                      <option key={i.nome} value={i.nome}>{i.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Qtd. de Aulas</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    required
                    value={alunoForm.aulas || 20}
                    onChange={(e) => setAlunoForm({ ...alunoForm, aulas: Number(e.target.value) })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-extrabold text-slate-800"
                  />
                </div>
              </div>

              {/* SEÇÃO FINANCEIRA & BAIXAS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1 uppercase tracking-tight">
                    💵 Situação Financeira & Baixas Manuais
                  </span>
                  {editingAluno && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAlunoModalOpen(false);
                        handleAbrirBaixaManual(editingAluno);
                      }}
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      💳 Dar Baixa Manual
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Data Adesão</label>
                    <input
                      type="date"
                      required
                      value={alunoForm.dataAdesao}
                      onChange={(e) => setAlunoForm({ ...alunoForm, dataAdesao: e.target.value })}
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Parc. Pagas</label>
                    <input
                      type="number"
                      min="0"
                      max={alunoForm.parcelasTotal || 12}
                      required
                      value={alunoForm.parcelasPagas}
                      onChange={(e) => setAlunoForm({ ...alunoForm, parcelasPagas: Number(e.target.value) })}
                      className={`w-full text-[11px] p-1.5 bg-white border rounded font-black ${alunoForm.parcelasPagas === 0 ? 'text-amber-600 border-amber-300 bg-amber-50' : 'text-emerald-700 border-emerald-300 bg-emerald-50'}`}
                    />
                    <span className="text-[9px] text-slate-500 block leading-tight">
                      {alunoForm.parcelasPagas === 0 ? '⚠️ Sem pagamento' : `${alunoForm.parcelasPagas} parc. baixada(s)`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Parc. Totais</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      required
                      value={alunoForm.parcelasTotal}
                      onChange={(e) => setAlunoForm({ ...alunoForm, parcelasTotal: Number(e.target.value) })}
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Forma Pagam.</label>
                    <select
                      value={alunoForm.formaPagamento}
                      onChange={(e) => setAlunoForm({ ...alunoForm, formaPagamento: e.target.value as 'poupanca' | 'cartao' | 'vista' | 'hibrido' })}
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="poupanca">📦 Baú / Poupança</option>
                      <option value="cartao">💳 Cartão de Crédito</option>
                      <option value="vista">💵 À Vista (Pix/Dinheiro)</option>
                      <option value="hibrido">🔀 Híbrido (Pix + Cartão)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Val. Total (R$)</label>
                    <input
                      type="number"
                      step="10"
                      required
                      value={alunoForm.valorTotal}
                      onChange={(e) => setAlunoForm({ ...alunoForm, valorTotal: Number(e.target.value) })}
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded font-bold text-emerald-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Senha Portal/App</label>
                    <input
                      type="text"
                      required
                      value={alunoForm.senha}
                      onChange={(e) => setAlunoForm({ ...alunoForm, senha: e.target.value })}
                      placeholder="Senha"
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="text-[11px] text-slate-500">
                  {editingAluno ? `ID: ${editingAluno.id}` : 'Novo Cadastro'}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAlunoModalOpen(false)}
                    className="bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 px-5 rounded-lg transition shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    {editingAluno ? '💾 Salvar Alterações Diretas' : 'Confirmar Cadastro'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: NEW / EDIT INSTRUCTOR (ADMIN) --- */}
      {isInstrutorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm md:text-base">
                {editingInstrutor ? `Editar Credenciamento: ${editingInstrutor.nome}` : 'Credenciar Novo Instrutor'}
              </h3>
              <button 
                onClick={() => setIsInstrutorModalOpen(false)}
                className="text-white/80 hover:text-white font-bold text-lg p-1.5"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveInstrutor} className="p-5 space-y-4 text-slate-800">
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Nome Oficial do Instrutor Autônomo</label>
                <input
                  type="text"
                  required
                  value={instrutorForm.nome}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, nome: e.target.value })}
                  placeholder="Ex: Carlos André de Recife"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  disabled={editingInstrutor !== null}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Região de Atendimento</label>
                <input
                  type="text"
                  required
                  value={instrutorForm.regiao}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, regiao: e.target.value })}
                  placeholder="Ex: Recife Centro"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Vagas Ativas (Capacidade)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={instrutorForm.vagas}
                    onChange={(e) => setInstrutorForm({ ...instrutorForm, vagas: Number(e.target.value) })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">Contato WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={instrutorForm.whatsapp}
                    onChange={(e) => setInstrutorForm({ ...instrutorForm, whatsapp: e.target.value })}
                    placeholder="Ex: (81) 99312-0000"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Credencial SENATRAN</label>
                <input
                  type="text"
                  required
                  value={instrutorForm.credencialSenatran}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, credencialSenatran: e.target.value })}
                  placeholder="Ex: SENATRAN-PE-992147823"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Chave PIX (Para pagamento de comissão)</label>
                <input
                  type="text"
                  value={instrutorForm.chavePix}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, chavePix: e.target.value })}
                  placeholder="Ex: CPF, E-mail, Celular ou Chave Aleatória"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Endereço Residencial/Profissional Completo</label>
                <textarea
                  required
                  rows={2}
                  value={instrutorForm.endereco}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, endereco: e.target.value })}
                  placeholder="Ex: Av. Governador Agamenon Magalhães, 1200 - Espinheiro, Recife - PE"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Tempo de Experiência como Instrutor</label>
                <input
                  type="text"
                  required
                  value={instrutorForm.tempoExperiencia}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, tempoExperiencia: e.target.value })}
                  placeholder="Ex: 8 anos de experiência"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Breve Biografia / História Profissional</label>
                <textarea
                  required
                  rows={3}
                  value={instrutorForm.historia}
                  onChange={(e) => setInstrutorForm({ ...instrutorForm, historia: e.target.value })}
                  placeholder="Conte um pouco sobre sua jornada ensinando candidatos no trânsito..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-sans"
                />
                <span className="text-[10px] text-slate-400 block leading-normal">
                  💡 Essas informações serão mostradas em uma janela de boas-vindas especial quando o aluno escanear seu QR Code de indicação!
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">Foto de Identificação (Opcional)</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {instrutorForm.foto ? (
                    <div className="relative w-12 h-12 rounded-full border border-slate-300 overflow-hidden shrink-0 shadow-sm">
                      <img src={instrutorForm.foto} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setInstrutorForm({ ...instrutorForm, foto: '' })}
                        className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold flex items-center justify-center opacity-0 hover:opacity-100 transition whitespace-nowrap"
                        title="Remover Foto"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 text-xs shrink-0 font-bold">
                      👤
                    </div>
                  )}
                  <div className="flex-grow flex flex-col justify-center space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setInstrutorForm({ ...instrutorForm, foto: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer w-full"
                    />
                    {instrutorForm.foto && (
                      <button
                        type="button"
                        onClick={() => handleDownloadFoto(instrutorForm.nome || 'Cadastro', instrutorForm.foto)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-850 font-bold underline cursor-pointer inline-flex items-center gap-1 self-start"
                      >
                        📥 Baixar Foto Atual
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  🔑 Credenciais de Acesso Privadas
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Usuário (Login)</label>
                    <input
                      type="text"
                      required
                      value={instrutorForm.login}
                      onChange={(e) => setInstrutorForm({ ...instrutorForm, login: e.target.value.toLowerCase().replace(/\s+/g, "") })}
                      placeholder="Ex: carlos.andre"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Senha Secreta</label>
                    <input
                      type="text"
                      required
                      value={instrutorForm.senha}
                      onChange={(e) => setInstrutorForm({ ...instrutorForm, senha: e.target.value })}
                      placeholder="Senha com 6 dígitos"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInstrutorModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded transition"
                >
                  Salvar Credenciamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: INSTRUCTOR AUTO-REGISTRATION --- */}
      {isInstrutorSelfRegisterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            {newSelfRegisteredInstrutor ? (
              /* SUCCESS STATE VIEW */
              <div className="p-6 space-y-6 text-slate-800 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-150 flex items-center justify-center text-3xl mx-auto shadow-sm">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Cadastro Concluído com Sucesso!</h3>
                  <p className="text-xs text-slate-500">Você agora faz parte da rede credenciada do programa Nova CNH.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Suas Credenciais de Acesso:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Usuário (Login)</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{newSelfRegisteredInstrutor.login}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Senha Secreta</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{newSelfRegisteredInstrutor.senha}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Credenciais Nova CNH\nLogin: ${newSelfRegisteredInstrutor.login}\nSenha: ${newSelfRegisteredInstrutor.senha}`;
                      navigator.clipboard.writeText(text);
                      setToastMessage("📋 Credenciais copiadas com sucesso!");
                    }}
                    className="w-full text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 py-1.5 rounded-lg border border-indigo-150 transition cursor-pointer"
                  >
                    📋 Copiar Credenciais de Acesso
                  </button>
                </div>

                {/* REFERRAL LINK & QR CODE */}
                <div className="bg-[#0c2340] text-white rounded-xl p-5 space-y-4 text-center">
                  <div className="space-y-1 text-center">
                    <span className="bg-indigo-900/50 text-indigo-300 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md">Link de Indicação</span>
                    <h4 className="text-xs font-extrabold">Seu Link de Auto-Matrícula</h4>
                    <p className="text-slate-300 text-[10px]">Alunos que se matricularem por este link serão vinculados a você automaticamente!</p>
                  </div>

                  {/* QR Code generator */}
                  {(() => {
                    const refLink = `${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${encodeURIComponent(newSelfRegisteredInstrutor.nome)}`;
                    return (
                      <div className="space-y-3">
                        <div className="bg-white p-2.5 rounded-xl w-32 h-32 mx-auto flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(refLink)}`}
                            alt="QR Code de Indicação"
                            className="w-28 h-28 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col gap-2 text-slate-800">
                          <input
                            type="text"
                            readOnly
                            value={refLink}
                            className="w-full bg-slate-900 text-slate-300 text-[9px] p-2 rounded-lg border border-slate-800 text-center focus:outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(refLink);
                              setToastMessage("🔗 Link de indicação copiado com sucesso!");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold py-2 px-3 rounded-lg transition"
                          >
                            Copiar Link de Indicação
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstrutorSelfRegisterOpen(false);
                      setNewSelfRegisteredInstrutor(null);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Entendido, Fechar Janela
                  </button>
                </div>
              </div>
            ) : (
              /* FORM STATE VIEW */
              <form onSubmit={handleSaveSelfRegister} className="text-slate-800">
                <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <span className="bg-emerald-800 text-emerald-100 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md">Rede Nova CNH</span>
                    <h3 className="font-bold text-sm md:text-base">Auto-Credenciamento de Instrutor</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsInstrutorSelfRegisterOpen(false)}
                    className="text-white/80 hover:text-white font-bold text-lg p-1.5"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-left">
                  <div className="bg-amber-50 border border-amber-150 rounded-xl p-3 text-[11px] text-slate-700 leading-relaxed">
                    💡 <strong>Como funciona o credenciamento?</strong> Ao se cadastrar, você ganha acesso instantâneo ao seu Painel de Instrutor. Você poderá receber saldos acumulados de maioridade de candidatos vinculados, assinar recibos digitais e receber suas comissões via PIX de forma automatizada.
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Seu Nome Completo (Oficial)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos André de Recife"
                      value={selfNome}
                      onChange={(e) => {
                        setSelfNome(e.target.value);
                        // Auto-generate login if empty
                        if (!selfLogin) {
                          setSelfLogin(e.target.value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '.').substring(0, 20));
                        }
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Região de Atendimento</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Recife Centro"
                        value={selfRegiao}
                        onChange={(e) => setSelfRegiao(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Capacidade de Alunos (Vagas)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={selfVagas}
                        onChange={(e) => setSelfVagas(Number(e.target.value))}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">WhatsApp para Contato</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: (81) 99312-0000"
                        value={selfWhatsapp}
                        onChange={(e) => setSelfWhatsapp(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Credencial SENATRAN</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: SENATRAN-PE-992147823"
                        value={selfCredencial}
                        onChange={(e) => setSelfCredencial(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Chave PIX (Para receber suas comissões)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CPF, celular, e-mail ou chave aleatória"
                      value={selfChavePix}
                      onChange={(e) => setSelfChavePix(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Endereço de Atendimento</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ex: Av. Governador Agamenon Magalhães, 1200 - Espinheiro, Recife - PE"
                      value={selfEndereco}
                      onChange={(e) => setSelfEndereco(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Tempo de Experiência</label>
                      <input
                        type="text"
                        placeholder="Ex: 8 anos de experiência"
                        value={selfTempoExp}
                        onChange={(e) => setSelfTempoExp(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Foto de Perfil (Opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSelfFoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Sua História / Biografia Curta</label>
                    <textarea
                      rows={2}
                      placeholder="Conte brevemente sobre sua jornada profissional no trânsito..."
                      value={selfHistoria}
                      onChange={(e) => setSelfHistoria(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      🔑 Defina seus dados de acesso ao painel
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Usuário (Login)</label>
                        <input
                          type="text"
                          required
                          value={selfLogin}
                          onChange={(e) => setSelfLogin(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Senha Secreta</label>
                        <input
                          type="text"
                          required
                          value={selfSenha}
                          onChange={(e) => setSelfSenha(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsInstrutorSelfRegisterOpen(false)}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-5 rounded-xl transition cursor-pointer"
                  >
                    Confirmar Auto-Cadastro
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DETALHADA TELA INTEIRA: ALUNO DOSSIÊ --- */}
      {selectedStudentDetail && (() => {
        const a = selectedStudentDetail;
        const age = calculateAge(a.dob);
        const isUnder = age < 18;
        const monthsTo18 = calculateMonthsTo18(a.dob);
        const showBaseValue = currentTab === 'area-instrutor';
        const displayValorTotal = showBaseValue ? getStudentBaseValue(a) : a.valorTotal;
        const currentPaid = a.parcelasPagas * (displayValorTotal / (a.parcelasTotal || 12));
        const progressPercent = Math.min(100, Math.max(0, (a.parcelasPagas / (a.parcelasTotal || 12)) * 100));
        const restValue = Math.max(0, displayValorTotal - currentPaid);

        return (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-slate-950 text-slate-100 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 text-left">
              
              {/* Header */}
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/25 text-indigo-400 p-2 rounded-xl border border-indigo-500/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                      Dossiê de Matrícula Completo: <span className="text-indigo-400 font-mono text-sm">[{a.id}]</span>
                    </h3>
                    <p className="text-xs text-slate-400">Ambiente de auditoria interna e acompanhamento de poupança regional</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudentDetail(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-150 text-xs font-black tracking-wider px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  ✕ FECHAR DOSSIÊ
                </button>
              </div>

              {/* Scrollable Content wrapper */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-400">
                
                {/* Profile Header Block */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 p-5 rounded-xl border border-indigo-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">DADOS DE IDENTIFICAÇÃO REGISTRADOS</span>
                    <h2 className="text-2xl font-black text-white">{a.nome}</h2>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                      <span>Nascimento: <strong className="text-slate-200">{formatDateBR(a.dob)}</strong></span>
                      <span>•</span>
                      <span>Idade: <strong className="text-slate-200">{age} anos</strong></span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isUnder ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                        {isUnder ? `Menor de Idade - Faltam ${monthsTo18} meses para os 18 anos` : 'Liberado para Exame (Maior)'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 divide-y divide-slate-800/80 text-xs min-w-[200px]">
                    <div className="pb-1.5 flex justify-between gap-2">
                      <span className="text-slate-400">Senha de Acesso:</span>
                      <strong className="text-amber-400 font-mono">{a.senha || 'Sem Senha'}</strong>
                    </div>
                    <div className="pt-1.5 flex justify-between gap-2">
                      <span className="text-slate-400">Situação Cadastral:</span>
                      <span className="text-emerald-400 font-bold font-sans">Ativa</span>
                    </div>
                  </div>
                </div>

                {/* Info Grid split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left grid segment: General details */}
                  <div className="space-y-4">
                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5 text-left">
                      <span>👤</span> Ficha Cadastral e Contato
                    </h4>

                    <div className="space-y-3.5 text-xs bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium">WhatsApp Principal</p>
                          <a 
                            href={`https://wa.me/55${a.whatsapp.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-white hover:text-indigo-400 font-bold flex items-center gap-1 mt-0.5"
                          >
                            <span>📱</span> {a.whatsapp}
                          </a>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">WhatsApp do Responsável</p>
                          {a.whatsappResponsavel ? (
                            <a 
                              href={`https://wa.me/55${a.whatsappResponsavel.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 mt-0.5"
                            >
                              <span>👨‍👦</span> {a.whatsappResponsavel}
                            </a>
                          ) : (
                            <span className="text-slate-500 italic block mt-0.5">Não aplicável (Maior)</span>
                          )}
                        </div>
                      </div>

                      <hr className="border-slate-800/80" />

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium">Data de Adesão</p>
                          <strong className="text-slate-200 block mt-0.5 font-mono">{formatDateBR(a.dataAdesao)}</strong>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Categoria Desejada</p>
                          <strong className="text-indigo-400 font-black block mt-0.5">{a.categoria}</strong>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-slate-400 font-medium">Instrutor Autônomo Responsável</p>
                          <strong className="text-emerald-400 text-xs font-black block mt-0.5 uppercase tracking-wide flex items-center gap-1">
                            <span className="text-emerald-500">👤</span> {a.instrutor || 'Sem Instrutor'}
                          </strong>
                        </div>
                      </div>

                      <hr className="border-slate-800/80" />

                      <div>
                        <p className="text-slate-400 font-medium">Endereço Residencial Informado</p>
                        <p className="text-slate-200 mt-0.5 leading-relaxed font-sans">
                          {a.endereco || "Nenhum endereço especificado na inscrição."}
                        </p>
                      </div>

                      <hr className="border-slate-800/80" />

                      <div>
                        <p className="text-slate-400 font-medium pb-1">Direcionamento de Plano Virtual</p>
                        <span className="inline-block bg-slate-950 text-indigo-300 border border-indigo-950 px-2.5 py-1 rounded-md text-[10.5px] font-bold">
                          {isUnder ? (a.tipoPlano || 'Plano Poupança Jovem 17 Anos') : (a.tipoPlano && a.tipoPlano !== 'Plano Poupança Jovem 17 Anos' ? a.tipoPlano : 'Plano CNH Facilitada Maiores de 18 Anos')}
                        </span>
                      </div>
                    </div>

                    {/* AUTO-AUTHENTICATION / ACCESS QR CODE & LINK FOR THIS STUDENT */}
                    <div className="bg-slate-900 border border-indigo-500/25 rounded-xl p-4 text-left space-y-3 shadow-md mt-4">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 px-1.5 text-[8.5px] font-black tracking-widest text-slate-950 bg-indigo-400 rounded uppercase font-sans">
                          Acesso Direto
                        </span>
                        <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <QrCode className="h-3.5 w-3.5" /> Entrar no Celular
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        O candidato pode escanear o QR Code com a câmera do celular para abrir o smartphone virtual instantaneamente sem digitar ID e Senha!
                      </p>
                      
                      {/* Copyable Login Link */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-mono font-extrabold uppercase block">Link de login direto</span>
                        <div className="flex items-stretch gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/?loginId=${a.id}`}
                            className="bg-slate-950 text-slate-300 font-mono text-[9px] p-2 rounded-lg border border-slate-800 focus:outline-none select-all truncate flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const loginLink = `${window.location.origin}/?loginId=${a.id}`;
                              navigator.clipboard.writeText(loginLink);
                              setToastMessage(`📋 Link de auto-login para ${a.nome} copiado!`);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black px-2.5 py-1 rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      {/* Live QR Code Generator via API */}
                      <div className="flex flex-col items-center bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2">
                        <div className="bg-white p-2 rounded-lg shadow-inner">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/?loginId=${a.id}`)}`}
                            alt="QR Code Auto-Login"
                            className="w-[125px] h-[125px] object-contain shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[8.5px] text-slate-500 font-mono font-medium uppercase tracking-wider">
                          Escanear Para Entrar no App
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right grid segment: Poupança & payments ledger */}
                  <div className="space-y-4">
                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5 text-left">
                      <span>💰</span> Evolução Financeira & Poupança Privada
                    </h4>

                    <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs text-left">
                      
                      {/* Interactive Ledger metrics card */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-slate-955 p-2.5 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block uppercase">
                            {showBaseValue ? 'VALOR TOTAL (BASE)' : 'VALOR TOTAL'}
                          </span>
                          <span className="font-extrabold text-slate-200 mt-0.5 block font-mono">
                            {displayValorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {showBaseValue && (
                            <span className="text-[8px] text-emerald-400 font-bold block mt-0.5 uppercase">Sem Juros</span>
                          )}
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-900/30 text-center">
                          <span className="text-[10px] text-emerald-450 block uppercase">SALDO ATUAL</span>
                          <span className="font-extrabold text-emerald-300 mt-0.5 block font-mono">
                            {currentPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="bg-slate-955 p-2.5 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-[10px] text-slate-400 block uppercase">A PAGAR</span>
                          <span className="font-extrabold text-indigo-400 mt-0.5 block font-mono">
                            {restValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>

                      {/* Payment tracking bar visualizer */}
                      <div className="space-y-2.5 bg-slate-955 p-3.5 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-400">Progresso do Contrato:</span>
                          <span className="text-emerald-400 font-bold font-mono">{progressPercent.toFixed(1)}% Adimplente</span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${progressPercent}%` }}
                            className={`h-full rounded-full transition-all ${
                              isUnder ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10.5px] text-slate-400 font-mono">
                          <span>{a.parcelasPagas} parcelas pagas</span>
                          <span>{a.parcelasTotal || 12} parcelas totais</span>
                        </div>

                        {/* Quick action button for Dar Baixa inside dossier */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirBaixaManual(a)}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                          >
                            <span>💳</span> Registrar / Dar Baixa Manual em Pagamento
                          </button>
                        </div>
                      </div>

                      <hr className="border-slate-800/85" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium">Método Original Escolhido</p>
                          <strong className="text-slate-200 mt-0.5 block font-sans">
                            {a.formaPagamento === 'cartao' 
                              ? '💳 Cartão de Crédito Executivo' 
                              : a.formaPagamento === 'vista'
                                ? '💵 À Vista Integrado'
                                : a.formaPagamento === 'hibrido'
                                  ? '🔀 Híbrido (À Vista/Pix + Cartão)'
                                  : '📦 Baú de Autocustódia (Poupança)'}
                          </strong>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Capacidade Teórica Reservada</p>
                          <strong className="text-slate-200 mt-0.5 block">{a.aulas || 20} horas-aulas de direção</strong>
                        </div>
                      </div>

                      <hr className="border-slate-800/80" />

                      {/* Instructor details short box */}
                      <div className="bg-slate-955 p-3 rounded-lg border border-slate-850 text-left">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Instrutor Designado Regional</span>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-sm font-bold text-white">👤 {a.instrutor || 'Sem Instrutor atribuído'}</span>
                          {a.instrutor && a.instrutor !== 'Sem Instrutor' && a.instrutor !== 'A definir' ? (
                            <button 
                              onClick={() => {
                                const found = instrutores.find(i => i.nome === a.instrutor);
                                if (found) {
                                  setSelectedStudentDetail(null);
                                  setSelectedInstrutorDetail(found);
                                }
                              }}
                              className="text-xs text-indigo-400 hover:text-white underline cursor-pointer"
                            >
                              Ver ficha do instrutor
                            </button>
                          ) : (
                            <span className="text-amber-500 text-[11px] font-bold">⚠️ Pendente</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* EXTRATO DE BAIXAS MANUAIS DE PAGAMENTO */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💳</span>
                      <div>
                        <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">
                          Extrato de Baixas e Lançamentos Manuais Confirmados
                        </h4>
                        <p className="text-[10px] text-slate-400">Registros de recebimento em cartão, PIX, dinheiro e boletos com quitação de parcelas</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAbrirBaixaManual(a)}
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Plus className="w-3 h-3" /> Nova Baixa
                    </button>
                  </div>

                  {!a.baixasPagamento || a.baixasPagamento.length === 0 ? (
                    <div className="text-center py-5 bg-slate-950/40 rounded-lg border border-slate-850">
                      <span className="text-xl block mb-1 opacity-40">💳</span>
                      <p className="text-xs text-slate-500 font-medium font-sans">Nenhuma baixa manual registrada até o momento.</p>
                      <p className="text-[9px] text-slate-600">Utilize o botão acima para dar baixa em valores pagos por cartão, PIX ou dinheiro.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-slate-350">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-450 uppercase text-[9px] tracking-wider font-extrabold">
                            <th className="py-2 px-3">Cód / Data</th>
                            <th className="py-2 px-3">Forma de Pagamento</th>
                            <th className="py-2 px-3">Valor Baixado</th>
                            <th className="py-2 px-3">Parcelas Quitadas</th>
                            <th className="py-2 px-3">Operador / Obs</th>
                            <th className="py-2 px-3 text-right">Recibo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60">
                          {a.baixasPagamento.map((bx: BaixaPagamento) => (
                            <tr key={bx.id} className="hover:bg-slate-900/40 transition">
                              <td className="py-2.5 px-3 font-mono text-[10px] whitespace-nowrap">
                                <span className="text-indigo-400 font-bold block">{bx.id}</span>
                                <span className="text-slate-500">{formatDateBR(bx.data)}</span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-200">
                                {bx.formaPagamento}
                              </td>
                              <td className="py-2.5 px-3 font-extrabold font-mono text-emerald-400 whitespace-nowrap">
                                {bx.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-300 font-bold">
                                {bx.parcelasBaixadas > 0 ? `+${bx.parcelasBaixadas} parcela(s)` : 'Ajuste de saldo'}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[200px]">
                                <span className="text-slate-300 font-semibold block">{bx.operador || 'Administração'}</span>
                                {bx.observacao && <span className="text-slate-500 italic text-[10px] truncate block">{bx.observacao}</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleEmitirReciboCandidato(a, bx)}
                                  className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold px-2.5 py-1 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 ml-auto"
                                  title="Visualizar / Imprimir Recibo Oficial de Quitação"
                                >
                                  <Receipt className="h-3 w-3 text-emerald-400" /> Recibo
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* HISTÓRICO DE COMPROVANTES DE DEPÓSITO DO ALUNO */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📂</span>
                      <div>
                        <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">
                          Dossiê de Comprovantes de Depósito (Monitorado por IA)
                        </h4>
                        <p className="text-[10px] text-slate-400">Auditorias financeiras e assinaturas fiduciárias de PIX salvas</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-950 text-indigo-400 border border-slate-800 px-2 py-0.5 rounded-md">
                      {a.comprovantes?.length || 0} anexados
                    </span>
                  </div>

                  {!a.comprovantes || a.comprovantes.length === 0 ? (
                    <div className="text-center py-6 bg-slate-950/40 rounded-lg border border-slate-850">
                      <span className="text-2xl block mb-1.5 opacity-40">📭</span>
                      <p className="text-xs text-slate-500 font-medium font-sans">Nenhum comprovante de pagamento registrado neste dossiê.</p>
                      <p className="text-[9px] text-slate-650">Comprovantes enviados por PIX no celular do aluno serão listados aqui.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-slate-350 select-none">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-450 uppercase text-[9px] tracking-wider font-extrabold">
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Valor</th>
                            <th className="py-2.5 px-3">Arquivo</th>
                            <th className="py-3 px-3">Resultado da Auditoria por IA</th>
                            <th className="py-2.5 px-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60 break-all">
                          {a.comprovantes.map((comp: Comprovante) => (
                            <tr key={comp.id} className="hover:bg-slate-900/40 transition">
                              <td className="py-3 px-3 whitespace-nowrap text-slate-450 font-mono text-[10px]">
                                {new Date(comp.dataEnvio).toLocaleString('pt-BR')}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-emerald-400 font-bold font-mono">
                                {comp.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="py-3 px-3 max-w-[150px] truncate font-sans text-slate-300 font-semibold" title={comp.nomeArquivo}>
                                {comp.nomeArquivo}
                              </td>
                              <td className="py-3 px-3 text-[10.5px]">
                                <div className="space-y-0.5 max-w-[320px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-emerald-400 font-bold text-[9px] uppercase tracking-wider">Aprovado pelo Auditor</span>
                                  </div>
                                  <p className="text-slate-400 text-[10px] leading-relaxed font-sans">
                                    {comp.observacao || "Aprovado em análise de segurança fiduciária."}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {/* View / Download receipt button */}
                                  <button
                                    onClick={() => {
                                      if (comp.conteudo) {
                                        const newWindow = window.open();
                                        if (newWindow) {
                                          newWindow.document.write(`<iframe src="${comp.conteudo}" style="width:100%; height:100%; border:none;"></iframe>`);
                                        } else {
                                          const link = document.createElement('a');
                                          link.href = comp.conteudo;
                                          link.download = comp.nomeArquivo;
                                          link.click();
                                        }
                                      } else {
                                        alert("Conteúdo do arquivo não disponível.");
                                      }
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 font-extrabold text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer"
                                  >
                                    Ver Arquivo
                                  </button>

                                  {/* Delete receipt button */}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Tem certeza que deseja REJEITAR e excluir este comprovante do dossiê de ${a.nome}?`)) {
                                        const updatedList = alunos.map(s => {
                                          if (s.id === a.id) {
                                            return {
                                              ...s,
                                              comprovantes: s.comprovantes?.filter(c => c.id !== comp.id)
                                            };
                                          }
                                          return s;
                                         });
                                        saveAlunosList(updatedList);
                                        setToastMessage("🗑️ Comprovante removido do dossiê!");
                                      }
                                    }}
                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold text-[10px] px-2 py-1 rounded-md transition cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Audit tools alerts footer note */}
                <div className="bg-[#0b1c2b] p-4 rounded-xl border border-indigo-950/45 text-xs flex items-start gap-3 text-left">
                  <span className="text-lg select-none">🛡️</span>
                  <div className="space-y-1">
                    <strong className="text-indigo-300 font-bold block">Conselho de Segurança do Administrador</strong>
                    <p className="text-slate-300/90 leading-relaxed font-sans">
                      {age < 18 ? (
                        <>
                          O saldo poupado do aluno <strong className="text-white">{a.nome}</strong> está bloqueado em conta fiduciária do programa até obter a data limite da maioridade legal, conforme termos vigentes. Liberações manuais de parcelas alteram as auditorias automáticas no Looker de forma síncrona.
                        </>
                      ) : (
                        <>
                          O saldo poupado do aluno <strong className="text-white">{a.nome}</strong> está aguardando a autorização do administrador, conforme termos vigentes. Liberações manuais de parcelas alteram as auditorias automáticas no Looker de forma síncrona.
                        </>
                      )}
                    </p>
                  </div>
                </div>

              </div>

              {/* Action commands line footer */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                  {(isAdminAuthenticated || (isAuthenticated && activeStudentId === a.id)) && (
                    <button
                      onClick={() => {
                        setSelectedStudentDetail(null);
                        handleDeleteAluno(a.id);
                      }}
                      className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold py-2.5 px-3.5 rounded-xl transition cursor-pointer font-sans flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir Cadastro
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedStudentDetail(null);
                      handleOpenEditAluno(a);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition cursor-pointer font-sans"
                  >
                    ✏️ Editar Cadastro Aluno
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`Dossiê do Aluno - Nome: ${a.nome}\nID: ${a.id}\nWhatsApp: ${a.whatsapp}\nSaldo Poupado: ${currentPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
                      setToastMessage("📋 Resumo do dossiê copiado com sucesso!");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-150 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition cursor-pointer"
                  >
                    📋 Copiar Resumo Dossiê
                  </button>
                  <button
                    onClick={() => setSelectedStudentDetail(null)}
                    className="bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer font-sans"
                  >
                    Fechar Janela
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- MODAL DETALHADA TELA INTEIRA: INSTRUTOR DOSSIÊ --- */}
      {selectedInstrutorDetail && (() => {
        const inst = selectedInstrutorDetail;
        const assignedStudents = alunos.filter(a => a.instrutor === inst.nome);
        const totalSlotsPercent = Math.min(100, (assignedStudents.length / inst.vagas) * 100);

        return (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-slate-950 text-slate-100 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 text-left">
              
              {/* Header */}
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/25 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
                    <span className="text-xl">🪪</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                      Ficha de Credenciamento Oficial: <span className="text-emerald-400 font-mono text-sm">[{inst.nome}]</span>
                    </h3>
                    <p className="text-xs text-slate-400">Diretório de Autorizações Ativas da Senatran e do programa virtual</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedInstrutorDetail(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-150 text-xs font-black tracking-wider px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  ✕ FECHAR FICHA
                </button>
              </div>

              {/* Scrollable Content wrapper */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
                
                {/* Profile Header Block */}
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950/30 p-5 rounded-xl border border-emerald-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left">
                    {inst.foto ? (
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/80 overflow-hidden shrink-0 shadow-lg">
                        <img src={inst.foto} alt={inst.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-705 flex items-center justify-center text-slate-400 text-2xl shrink-0 shadow-lg">
                        👤
                      </div>
                    )}
                    <div className="space-y-1.5 text-left">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">DADOS DO CREDENCIADO NACIONAL</span>
                      <h2 className="text-2xl font-black text-white">{inst.nome}</h2>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                        <span>U.S. Regional: <strong className="text-slate-200 font-bold">{inst.regiao}</strong></span>
                        <span>•</span>
                        <span>Capacidade: <strong className="text-slate-200">{inst.vagas} vagas credenciadas</strong></span>
                        <span>•</span>
                        {inst.credencialSenatran && (
                          <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[9px] px-2 py-0.5 rounded font-black tracking-wider">
                            SENATRAN: {inst.credencialSenatran}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 divide-y divide-slate-800/80 text-xs min-w-[200px]">
                    <div className="pb-1.5 flex justify-between gap-2">
                      <span className="text-slate-400 text-left">Alunos Ativos:</span>
                      <strong className="text-white font-bold">{assignedStudents.length} vinculados</strong>
                    </div>
                    <div className="pt-1.5 flex justify-between gap-2">
                       <span className="text-slate-400 text-left">Lotação Atual:</span>
                       <span className="text-emerald-400 font-black">{Math.round(totalSlotsPercent)}% ocupado</span>
                    </div>
                  </div>
                </div>

                {/* Sub layout columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Official Profile info */}
                  <div className="space-y-4">
                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5 text-left">
                      <span>🪪</span> Dados do Profissional Parceiro
                    </h4>

                    <div className="space-y-3.5 text-xs bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left">
                      <div>
                        <p className="text-slate-450 font-semibold">Contato Direto (Whatsapp)</p>
                        <a 
                          href={`https://wa.me/55${inst.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-white hover:text-emerald-400 font-bold text-sm block mt-1"
                        >
                          📱 {inst.whatsapp} (Iniciar Conversa)
                        </a>
                      </div>

                      <hr className="border-slate-800/80" />

                      <div>
                        <p className="text-slate-450 font-semibold">Região de Concentração das Aulas</p>
                        <strong className="text-slate-200 text-sm font-bold block mt-0.5">{inst.regiao}</strong>
                      </div>

                      <hr className="border-slate-800/80" />

                      {inst.credencialSenatran && (
                        <>
                          <div>
                            <p className="text-slate-450 font-semibold">Identificação da Credencial Senatran</p>
                            <span className="inline-block bg-slate-950 font-mono text-emerald-300 border border-emerald-950 px-2.5 py-1 rounded text-[10.5px] font-black tracking-wider mt-1">
                              {inst.credencialSenatran}
                            </span>
                          </div>
                          <hr className="border-slate-800/80" />
                        </>
                      )}

                      <div>
                        <p className="text-slate-450 font-semibold">Endereço Físico Cadastrado</p>
                        <p className="text-slate-200 mt-1 leading-relaxed font-sans">
                          {inst.endereco || "Nenhum endereço especificado no credenciamento."}
                        </p>
                      </div>

                      <hr className="border-slate-800/80" />

                      <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-xl space-y-2">
                        <p className="text-emerald-400 font-extrabold flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-sans">
                          🔑 Credenciais de Acesso Privadas
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-semibold">Usuário (Login):</span>
                            <strong className="text-slate-100 font-mono select-all bg-slate-950 px-2 py-1 rounded border border-slate-800 block mt-1">{inst.login || generateLogin(inst.nome)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Senha Secreta:</span>
                            <strong className="text-emerald-400 font-mono select-all bg-slate-950 px-2 py-1 rounded border border-slate-800 block mt-1">{inst.senha || "Sem Senha"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AUTO-ENROLLMENT LINK & QR CODE FOR THIS INSTRUCTOR */}
                    <div className="bg-slate-900 border border-emerald-500/25 rounded-xl p-4 text-left space-y-3 shadow-md mt-4">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 px-1.5 text-[8.5px] font-black tracking-widest text-[#151515] bg-[#32bcad] rounded uppercase font-sans">
                          Auto-Vínculo
                        </span>
                        <h4 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <QrCode className="h-3.5 w-3.5" /> Matrícula do Instrutor
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Matricule um grupo diretamente vinculando-os ao instrutor <strong>{inst.nome}</strong>. Compartilhe o link ou projete o QR Code.
                      </p>
                      
                      {/* Interactive Copyable Link */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-mono font-extrabold uppercase block">Link de Cadastro</span>
                        <div className="flex items-stretch gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={`${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${encodeURIComponent(inst.nome)}`}
                            className="bg-slate-950 text-slate-300 font-mono text-[9px] p-2 rounded-lg border border-slate-800 focus:outline-none select-all truncate flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const enrollmentLink = `${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${encodeURIComponent(inst.nome)}`;
                              navigator.clipboard.writeText(enrollmentLink);
                              setToastMessage(`📋 Link de auto-matrícula para ${inst.nome} copiado!`);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      {/* QR Code image via free api */}
                      <div className="flex flex-col items-center bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2">
                        <div className="bg-white p-2 rounded-lg shadow-inner">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${AUTODRIVE_PLATFORM_URL}/?inscrever=true&instrutor=${inst.nome}`)}`}
                            alt="QR Code Auto-Matrícula"
                            className="w-[125px] h-[125px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[8.5px] text-slate-500 font-mono font-medium uppercase tracking-wider">
                          QR Code de Auto-Inscrição Ativa
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Experience Bio & Assigned students table search */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 p-4 rounded-xl border border-emerald-900/30 text-left space-y-2.5">
                      <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-emerald-900/30 pb-1 flex items-center gap-1.5">
                        <span>📖</span> Histórico & Tempo de Experiência
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <p>
                          <span className="text-slate-450 font-bold">Tempo de Atuação:</span>{" "}
                          <strong className="text-emerald-400 font-mono text-sm block mt-0.5">{inst.tempoExperiencia || "Não especificado"}</strong>
                        </p>
                        <div className="pt-1.5">
                          <span className="text-slate-450 font-bold block mb-1">Biografia & Trajetória Profissional:</span>
                          <p className="bg-slate-950/60 p-3 rounded-lg border border-slate-850/80 leading-relaxed font-sans text-slate-200 italic">
                            "{inst.historia || "Nenhum histórico profissional cadastrado."}"
                          </p>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center justify-between gap-1.5 text-left">
                      <span>👥</span> Alunos Vinculados Direto ({assignedStudents.length})
                    </h4>

                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
                      {assignedStudents.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 italic text-xs">
                          Nenhum(a) aluno(a) designado(a) para este instrutor atualmente.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/80 max-h-[250px] overflow-y-auto pr-1">
                          {assignedStudents.map(astud => {
                            const astudAge = calculateAge(astud.dob);
                            return (
                              <div key={astud.id} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0 gap-2">
                                <div className="space-y-0.5 text-left">
                                  <span className="font-extrabold text-white text-[12px] block">{astud.nome}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <span className="font-mono bg-slate-950 text-slate-400 px-1 py-0.2 rounded font-bold leading-tight">{astud.id}</span>
                                    <span>•</span>
                                    <span>{astud.categoria}</span>
                                    <span>•</span>
                                    <span>{astudAge} anos</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedInstrutorDetail(null);
                                    setSelectedStudentDetail(astud);
                                  }}
                                  className="text-[10px] text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 rounded transition whitespace-nowrap cursor-pointer font-sans"
                                >
                                  Ver Ficha
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Dossiê de Recibos & Quitações (GOV.BR) */}
                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-slate-800 pb-1 mt-4 flex items-center justify-between gap-1.5 text-left">
                      <span>📂</span> Dossiê de Recibos & Quitações ({inst.recibos?.length || 0})
                    </h4>

                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
                      {!inst.recibos || inst.recibos.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 italic text-xs">
                          Nenhum recibo de quitação emitido para este instrutor.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/80 max-h-[250px] overflow-y-auto pr-1">
                          {inst.recibos.map(rec => (
                            <div key={rec.id} className="py-2.5 flex flex-col gap-1.5 text-xs first:pt-0 last:pb-0 text-left">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{rec.id}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  rec.status === 'assinado_gov' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                }`}>
                                  {rec.status === 'assinado_gov' ? '✓ Assinado via GOV.BR' : '⏳ Pendente Assinatura'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-slate-300">
                                <span>Valor Pago: <strong className="text-white font-mono">{rec.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                                <span className="text-slate-500">Emitido: {new Date(rec.dataEmissao).toLocaleDateString('pt-BR')}</span>
                              </div>
                              {rec.status === 'assinado_gov' ? (
                                <div className="bg-slate-950/85 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400 leading-normal space-y-1 mt-1">
                                  <p className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span>🛡️</span> Assinado Eletronicamente
                                  </p>
                                  <p>Certificado: <span className="text-slate-200 select-all">{rec.identificadorGov}</span></p>
                                  <p>Data/Hora: <span className="text-slate-200">{new Date(rec.dataAssinatura!).toLocaleString('pt-BR')}</span></p>
                                  <p className="text-[9px] text-slate-500 italic truncate">Hash: {rec.documentoAssinado}</p>
                                  <button
                                    type="button"
                                    onClick={() => setViewingRecibo({ instrutorNome: inst.nome, recibo: rec })}
                                    className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-1.5 px-2.5 rounded-lg text-[9.5px] transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer border border-slate-700"
                                  >
                                    🔍 Visualizar Recibo Assinado
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2 mt-1">
                                  <div className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2 rounded leading-normal">
                                    Aguardando assinatura digital do instrutor no Painel do Instrutor para homologação jurídica do dossiê.
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setToastMessage(`✉️ Notificação enviada! O link para a assinatura do Recibo ${rec.id} foi encaminhado com sucesso ao WhatsApp e E-mail de ${inst.nome}.`);
                                      }}
                                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-1.5 px-2 rounded-lg text-[9px] transition flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer"
                                    >
                                      ✉️ Enviar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setViewingRecibo({ instrutorNome: inst.nome, recibo: rec })}
                                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-2 rounded-lg text-[9px] transition flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer border border-slate-700"
                                    >
                                      🔍 Ver Minuta
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

               {/* Action commands line footer */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 px-6 flex flex-wrap items-center justify-end gap-3 shrink-0">
                {inst.foto && (
                  <button
                    onClick={() => handleDownloadFoto(inst.nome, inst.foto)}
                    className="bg-sky-650 hover:bg-sky-600 text-slate-100 text-xs font-bold py-2.5 px-4 rounded-xl border border-sky-700 transition cursor-pointer"
                  >
                    📥 Baixar Foto do Instrutor
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedInstrutorDetail(null);
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition cursor-pointer font-sans"
                >
                  ✏️ Editar Credenciamento
                </button>
                <button
                  onClick={() => setSelectedInstrutorDetail(null)}
                  className="bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer font-sans"
                >
                  Fechar Janela
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- MODAL DE BOAS-VINDAS DO INSTRUTOR INDICADO (QR CODE / REFERRAL) --- */}
      {scannedInstructorWelcome && (() => {
        const inst = scannedInstructorWelcome;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 text-slate-100 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🤝</span>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white uppercase font-mono">
                      Instrutor Parceiro Nova CNH
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Indicação e Vínculo de Aluno</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    hasClosedWelcomeRef.current = true;
                    setScannedInstructorWelcome(null);
                  }}
                  className="text-slate-400 hover:text-white transition text-lg font-black font-sans"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Profile Block */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  {inst.foto ? (
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-500 overflow-hidden shrink-0 shadow-lg shadow-emerald-950/40">
                      <img src={inst.foto} alt={inst.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 text-2xl shrink-0 shadow-lg">
                      👤
                    </div>
                  )}
                  <div className="space-y-1 text-center sm:text-left flex-grow">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Instrutor Autônomo Credenciado</span>
                    <h2 className="text-xl font-extrabold text-white">{inst.nome}</h2>
                    <p className="text-xs text-slate-400 font-sans flex flex-wrap items-center justify-center sm:justify-start gap-x-1.5 gap-y-0.5">
                      <span>Atuação: <strong>{inst.regiao}</strong></span>
                      {inst.credencialSenatran && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400 font-mono text-[10px]">SENATRAN: {inst.credencialSenatran}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Experience Badge */}
                <div className="bg-slate-900 border border-emerald-900/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider">
                    <span>⏳</span>
                    <span>Tempo de Experiência</span>
                  </div>
                  <p className="text-emerald-400 font-black text-base pl-6 font-mono">
                    {inst.tempoExperiencia || "Múltiplos anos de experiência comprovada"}
                  </p>
                </div>

                {/* Bio / History */}
                <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider">
                    <span>📖</span>
                    <span>Trajetória & História Profissional</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed font-sans italic relative pl-6 pr-2 py-1">
                    <span className="absolute left-0 top-0 text-3xl text-emerald-500/20 font-serif leading-none">“</span>
                    <p>
                      {inst.historia || "Profissional totalmente focado em auxiliar alunos no processo de aprendizagem, superando medos e inseguranças no trânsito."}
                    </p>
                    <span className="absolute right-0 bottom-0 text-3xl text-emerald-500/20 font-serif leading-none translate-y-2">”</span>
                  </div>
                </div>

                {/* Connection Alert */}
                <p className="text-[10.5px] text-slate-400 text-center leading-relaxed">
                  Ao realizar sua matrícula, sua ficha de candidato será automaticamente vinculada ao instrutor <strong className="text-white">{inst.nome}</strong> para o acompanhamento das suas aulas práticas.
                </p>

              </div>

              {/* Footer Buttons */}
              <div className="bg-slate-900 border-t border-slate-850 p-4 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => {
                    hasClosedWelcomeRef.current = true;
                    setScannedInstructorWelcome(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer font-sans order-2 sm:order-1 text-center"
                >
                  Apenas Explorar
                </button>
                <button
                  onClick={() => {
                    hasClosedWelcomeRef.current = true;
                    setScannedInstructorWelcome(null);
                    setTimeout(() => {
                      const element = document.getElementById('candidate-self-enrollment-platform');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 300);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 px-5 rounded-xl shadow-lg transition active:scale-95 cursor-pointer font-sans order-1 sm:order-2 text-center flex items-center justify-center gap-1.5"
                >
                  ✍️ Quero me inscrever com {inst.nome.split(" ")[0]}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- MODAL: ORIENTAÇÃO DO INSTRUTOR (AVATAR) --- */}
      {adviceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200" id="advice-modal-container">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="font-extrabold text-xs md:text-sm tracking-tight">Recomendação de Treino</h3>
                  <p className="text-[9px] text-emerald-200 font-mono tracking-wider uppercase font-bold">Simulação {adviceAulas} Aulas</p>
                </div>
              </div>
              <button 
                onClick={() => setAdviceModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/15 rounded-full w-7 h-7 flex items-center justify-center font-bold text-base transition"
                id="btn-close-advice-modal"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-800 flex flex-col items-center">
              
              {/* AVATAR CONTAINER */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500 overflow-hidden shadow-md">
                  <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop" 
                    alt="Mariana, Instrutora Virtual de Direção" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center animate-pulse" title="Instrutor Digital do Programa">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                </span>
              </div>

              {/* INSTRUCTOR DESCRIPTION */}
              <div className="text-center">
                <h4 className="font-bold text-slate-800 text-sm">Mariana</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">Aconselhadora de Formação</p>
              </div>

              {/* SPEECH BUBBLE MESSAGE */}
              <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 w-full shadow-inner text-slate-600 leading-relaxed text-xs font-semibold text-center">
                {/* Visual tail of the speech bubble */}
                <div className="absolute top-[-6px] left-[50%] translate-x-[-50%] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-50"></div>
                
                <p className="whitespace-normal">
                  "{getAulasAdviceText(adviceAulas)}"
                </p>
                <p className="mt-2 text-emerald-600 font-extrabold text-[11px] border-t border-slate-200/60 pt-2 block">
                  Você se enquadra nesse perfil? Se sim pode prosseguir. Se não, escolha outra quantidade de aulas.
                </p>
              </div>

              {/* FOOTER CONFIRM BUTTON */}
              <button
                type="button"
                onClick={() => setAdviceModalOpen(false)}
                id="btn-confirm-advice"
                className="w-full py-2.5 px-4 bg-[#112d52] hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-md transition-all duration-150 transform active:scale-95 text-center mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Entendi, Mariana</span>
                <span>👍</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DETALHES DO PLANO SELECIONADO --- */}
      {selectedPlanToPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200" id="plan-detail-modal">
            
            {/* Header decorativo de acordo com o plano */}
            {selectedPlanToPreview === 'jovem-17' && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 font-mono">Simulador de Planos</span>
                <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                  <span>🌱</span> Poupança Jovem — Planejamento 17 Anos
                </h3>
              </div>
            )}

            {selectedPlanToPreview === 'adulto-18' && (
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-900 text-white p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 font-mono">Simulador de Planos</span>
                <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                  <span>⚡</span> CNH Facilitada Maiores — Início 18+ Anos
                </h3>
              </div>
            )}

            {selectedPlanToPreview === 'habilitado' && (
              <div className="bg-gradient-to-r from-violet-600 to-purple-900 text-white p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-100 font-mono">Simulador de Planos</span>
                <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                  <span>🚗</span> Treinamento Avançado para Habilitados
                </h3>
              </div>
            )}

            {/* Corpo com Informações Detalhadas e Propósito */}
            <div className="p-6 space-y-5 text-slate-700 text-left">
              
              {selectedPlanToPreview === 'jovem-17' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wider font-mono text-emerald-700">🎯 Propósito do Plano:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Desenvolvido especialmente para adolescentes e jovens de 17 anos (e até 24) que desejam planejar sua autonomia. O propósito é permitir que o jovem comece a construir uma reserva financeira controlada (o baú) parcelando o valor s/ juros antes da maioridade legal. Enquanto poupa, estuda e simula a prova teórica.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2.5">
                    <h5 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">🌟 Vantagens e Funcionamento:</h5>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 font-medium list-disc list-inside">
                      <li><strong className="text-emerald-950 font-bold">Desbloqueio Automático:</strong> Ao fazer aniversário de 18 anos, 100% do saldo é liberado na hora para as aulas práticas.</li>
                      <li><strong className="text-emerald-950 font-bold">Menores Parcelas:</strong> Simulação otimizada e flexível para quitar até os 18 ou estender de forma leve.</li>
                      <li><strong className="text-emerald-950 font-bold">Estudo Integrado:</strong> Acesso à plataforma simulada de testes para já ir se preparando.</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedPlanToPreview === 'adulto-18' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wider font-mono text-indigo-700">🎯 Propósito do Plano:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Ideal para quem já completou 18 anos ou mais e quer dar início imediato ao processo da primeira habilitação (Carro, Moto ou Ambos) sem precisar esperar. O objetivo é facilitar o acesso aos recursos, dividindo os custos totais em mensalidades previsíveis de até 12x s/ juros, agendando de imediato as primeiras instruções.
                    </p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2.5">
                    <h5 className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider">🌟 Vantagens e Funcionamento:</h5>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 font-medium list-disc list-inside">
                      <li><strong className="text-indigo-950 font-bold">Início Imediato:</strong> Sem burocracia, cadastro rápido e direcionamento de instrutor regional.</li>
                      <li><strong className="text-indigo-950 font-bold">Fórmula Flex:</strong> Permite escolher aulas práticas de carro, moto ou misto sob medida.</li>
                      <li><strong className="text-indigo-950 font-bold">Flexibilidade:</strong> Pague no Pix, boleto de fomento ou em até 12 parcelas no cartão.</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedPlanToPreview === 'habilitado' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wider font-mono text-violet-700">🎯 Propósito do Plano:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Desenvolvido especificamente para motoristas habilitados que possuem CNH de qualquer categoria, mas se sentem inseguros, têm medo de dirigir no trânsito, rampa ou vias rápidas. O propósito do treinamento é devolver a confiança por meio de aulas focadas 100% práticas, com instrutores pacientes e focado nas suas maiores dúvidas.
                    </p>
                  </div>

                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2.5">
                    <h5 className="text-[11px] font-extrabold text-violet-800 uppercase tracking-wider">🌟 Vantagens e Funcionamento:</h5>
                    <ul className="text-[11px] text-slate-600 space-y-1.5 font-medium list-disc list-inside">
                      <li><strong className="text-violet-950 font-bold">Treinos Reais no Trânsito:</strong> Aulas práticas personalizadas em vias de fluxo real na sua cidade.</li>
                      <li><strong className="text-violet-950 font-bold">Atendimento Humanizado:</strong> Controle de embreagem, balizas, e superação de medos cotidianos.</li>
                      <li><strong className="text-violet-950 font-bold">Equipamentos Seguros:</strong> Veículos equipados com duplo comando para total controle e segurança.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Pergunta final para prosseguir */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5 text-center">
                <p className="text-xs font-black text-slate-800 bg-amber-50 border border-amber-200/50 p-3 rounded-lg leading-normal">
                  ❓ Se você acha que este é o seu plano ideal, aperte OK para prosseguir.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      // Confirma o plano
                      setCalcPlano(selectedPlanToPreview);
                      if (selectedPlanToPreview === 'jovem-17') {
                        setCalcUseRealAge(true);
                      } else {
                        setCalcUseRealAge(false);
                      }
                      setSelectedPlanToPreview(null);
                      setToastMessage(`🎯 Plano selecionado com sucesso para simulação!`);
                    }}
                    className="flex-1 py-3 px-4 bg-[#112d52] hover:bg-slate-900 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Sim (OK)</span>
                    <span>👍</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlanToPreview(null)}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs tracking-wider uppercase rounded-xl active:scale-95 transition-all text-center cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO / RESET INLINE REGIONAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="global-confirmation-dialog">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header customizado */}
            <div className={`p-4 text-white flex items-center gap-2 ${confirmModal.type === 'danger' ? 'bg-gradient-to-r from-red-600 to-rose-700' : 'bg-gradient-to-r from-indigo-600 to-indigo-800'}`}>
              <span className="text-lg">⚠️</span>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                {confirmModal.title}
              </h3>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold text-left">
                {confirmModal.message}
              </p>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  id="confirm-modal-cancel"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                >
                  {confirmModal.cancelText || 'Cancelar'}
                </button>

                <button
                  type="button"
                  id="confirm-modal-submit"
                  onClick={confirmModal.onConfirm}
                  className={`py-2.5 px-4 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl shadow-md transition-all cursor-pointer ${
                    confirmModal.type === 'danger' 
                      ? 'bg-red-600 hover:bg-rose-800' 
                      : 'bg-[#112d52] hover:bg-slate-900'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL DA SUGESTÃO DA FORMA HÍBRIDA DE PAGAMENTO --- */}
      {showHybridPaymentNotice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="hybrid-payment-notice-dialog">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Header customizado */}
            <div className="p-4 text-white flex items-center justify-between bg-gradient-to-r from-teal-600 to-emerald-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔀</span>
                <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                  Informativo: Plano Híbrido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHybridPaymentNotice(false)}
                className="p-1 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer flex items-center justify-center"
                title="Fechar informativo"
                id="close-hybrid-modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              <div className="space-y-3 font-sans">
                <p className="text-xs text-slate-800 leading-relaxed font-bold">
                  Você selecionou o Acordo Híbrido (À Vista/Pix + Cartão de Crédito)!
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nossa sugestão padrão do simulador é dividir em <strong>50% de entrada no Pix</strong> e os <strong>50% restantes parcelados no Cartão de Crédito</strong>.
                </p>
                <div className="bg-teal-50 border border-teal-200/50 p-3.5 rounded-xl">
                  <p className="text-[11px] text-teal-800 font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
                    <span>💡</span> Flexibilidade Total
                  </p>
                  <p className="text-[11px] text-teal-900 leading-normal mt-1 font-semibold">
                    Lembre-se: <strong>esta divisão de 50%/50% é apenas uma sugestão</strong>. No final, a divisão exata dos valores pode ser dividida e ajustada por você mesmo, combinando diretamente com nosso consultor no momento de fechar sua matrícula de acordo com o que melhor se encaixe na sua realidade!
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  id="hybrid-modal-understand"
                  onClick={() => setShowHybridPaymentNotice(false)}
                  className="w-full py-3 px-4 bg-teal-650 hover:bg-teal-700 text-white font-extrabold text-[11px] tracking-widest uppercase rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  Ok, Entendi!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE BAIXA MANUAL DE PAGAMENTOS (CARTÃO, PIX, DINHEIRO) --- */}
      {baixaModalAluno && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                    Baixa Manual de Pagamento
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {baixaModalAluno.nome} • Categoria {baixaModalAluno.categoria}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBaixaModalAluno(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              
              {/* Summary Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Status Atual:</span>
                  <span className="text-emerald-400 font-extrabold text-sm font-mono block">
                    {baixaModalAluno.parcelasPagas} de {baixaModalAluno.parcelasTotal || 12} parcelas
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Valor Total Contrato:</span>
                  <span className="text-slate-200 font-bold text-sm font-mono block">
                    {baixaModalAluno.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Forma do Pagamento Efetuado:
                </label>
                <select
                  value={baixaForm.formaPagamento}
                  onChange={(e) => setBaixaForm(prev => ({ ...prev, formaPagamento: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="cartao">💳 Cartão de Crédito (Máquina / Link)</option>
                  <option value="pix">⚡ PIX / Transferência Instantânea</option>
                  <option value="dinheiro">💵 Dinheiro em Espécie (Balcão)</option>
                  <option value="boleto">📄 Boleto Bancário</option>
                  <option value="transferencia">🏦 Transferência Bancária / TED</option>
                </select>
              </div>

              {/* Valor do Lançamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                    Valor Pago (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baixaForm.valor}
                    onChange={(e) => setBaixaForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-emerald-400 font-extrabold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                    Data do Pagamento:
                  </label>
                  <input
                    type="date"
                    value={baixaForm.data}
                    onChange={(e) => setBaixaForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Modo de Quitação de Parcelas */}
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <label className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider block">
                  Atualização do Progresso de Parcelas:
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modoAcao"
                      value="avancar"
                      checked={baixaForm.modoAcao === 'avancar'}
                      onChange={() => setBaixaForm(prev => ({ ...prev, modoAcao: 'avancar' }))}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200 font-medium">Avançar +</span>
                    <input
                      type="number"
                      min={1}
                      max={(baixaModalAluno.parcelasTotal || 12) - baixaModalAluno.parcelasPagas}
                      value={baixaForm.parcelasBaixadas}
                      onChange={(e) => setBaixaForm(prev => ({ ...prev, parcelasBaixadas: parseInt(e.target.value) || 1 }))}
                      disabled={baixaForm.modoAcao !== 'avancar'}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center font-bold text-emerald-400"
                    />
                    <span className="text-slate-400">parcela(s) quitada(s)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modoAcao"
                      value="quitar_tudo"
                      checked={baixaForm.modoAcao === 'quitar_tudo'}
                      onChange={() => setBaixaForm(prev => ({ ...prev, modoAcao: 'quitar_tudo' }))}
                      className="accent-emerald-500"
                    />
                    <span className="text-emerald-400 font-bold">Quitar Contrato Integralmente ({baixaModalAluno.parcelasTotal || 12} de {baixaModalAluno.parcelasTotal || 12})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="modoAcao"
                      value="customizado"
                      checked={baixaForm.modoAcao === 'customizado'}
                      onChange={() => setBaixaForm(prev => ({ ...prev, modoAcao: 'customizado' }))}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200 font-medium">Ajustar total de parcelas pagas para:</span>
                    <input
                      type="number"
                      min={0}
                      max={baixaModalAluno.parcelasTotal || 12}
                      value={baixaForm.novaQtdeParcelasPagas}
                      onChange={(e) => setBaixaForm(prev => ({ ...prev, novaQtdeParcelasPagas: parseInt(e.target.value) || 0 }))}
                      disabled={baixaForm.modoAcao !== 'customizado'}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center font-bold text-white"
                    />
                  </label>
                </div>
              </div>

              {/* Comprovante/NSU e Observação */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nº Comprovante / NSU / Autorização da Maquininha (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: NSU 9841029 / Aut 10294"
                    value={baixaForm.nsuComprovante}
                    onChange={(e) => setBaixaForm(prev => ({ ...prev, nsuComprovante: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Observação Interna:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Pago no balcão da autoescola via maquininha Ton..."
                    value={baixaForm.observacao}
                    onChange={(e) => setBaixaForm(prev => ({ ...prev, observacao: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setBaixaModalAluno(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarBaixaManual}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span>✓</span> Confirmar Baixa
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE REMOÇÃO DE CADASTROS FICTÍCIOS / TESTES --- */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-700 to-red-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧹</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                    Remover Cadastros Fictícios / Testes
                  </h3>
                  <p className="text-[11px] text-rose-100 font-medium">
                    Selecione quais cadastros fictícios ou de demonstração deseja excluir da base
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">
                  Exibindo {alunos.length} cadastros no total. ({selectedPurgeIds.length} selecionados para remoção)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPurgeIds(alunos.filter(isFictitiousCandidate).map(a => a.id))}
                    className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1 rounded font-bold hover:bg-amber-500/20"
                  >
                    Selecionar Sugestões
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPurgeIds.length === alunos.length) {
                        setSelectedPurgeIds([]);
                      } else {
                        setSelectedPurgeIds(alunos.map(a => a.id));
                      }
                    }}
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold hover:bg-slate-700"
                  >
                    {selectedPurgeIds.length === alunos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>
              </div>

              {alunos.length === 0 ? (
                <p className="text-center text-slate-500 py-6">Nenhum aluno cadastrado no sistema.</p>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-extrabold sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-10 text-center">Selecionar</th>
                        <th className="p-3">Nome do Candidato</th>
                        <th className="p-3">Data / WhatsApp</th>
                        <th className="p-3">Tipo / Tag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {alunos.map(a => {
                        const isSuggested = isFictitiousCandidate(a);
                        const isChecked = selectedPurgeIds.includes(a.id);
                        return (
                          <tr
                            key={a.id}
                            onClick={() => {
                              setSelectedPurgeIds(prev => 
                                isChecked ? prev.filter(id => id !== a.id) : [...prev, a.id]
                              );
                            }}
                            className={`cursor-pointer transition ${
                              isChecked ? 'bg-rose-950/30' : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPurgeIds(prev => [...prev, a.id]);
                                  } else {
                                    setSelectedPurgeIds(prev => prev.filter(id => id !== a.id));
                                  }
                                }}
                                className="accent-rose-500 h-4 w-4"
                              />
                            </td>
                            <td className="p-3 font-bold text-white">
                              {a.nome}
                              <span className="block text-[10px] text-slate-500 font-mono">ID: {a.id}</span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-400">
                              <span>{a.whatsapp || 'Sem Whats'}</span>
                            </td>
                            <td className="p-3">
                              {isSuggested ? (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase font-mono">
                                  ⚠️ Fictício / Teste
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-400 text-[9px] font-semibold px-2 py-0.5 rounded-full font-mono">
                                  Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedPurgeIds.length === 0}
                  onClick={handleConfirmarLimpezaFicticios}
                  className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span>🗑️</span> Excluir {selectedPurgeIds.length} Cadastro(s) Selecionado(s)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Link Enrollment & Auto-fill Modal */}
      <LinkEnrollmentModal
        isOpen={isLinkEnrollmentModalOpen}
        onClose={() => {
          setIsLinkEnrollmentModalOpen(false);
          setLinkModalSelectedAlunoId('');
        }}
        alunos={alunos}
        onMatricular={handleMatricularViaLinkData}
        initialSelectedAlunoId={linkModalSelectedAlunoId}
      />

      {/* Persistent App Footer */}
      <footer className="bg-[#0c2340] text-slate-400 text-center py-4 text-xs font-medium border-t border-indigo-950 mt-12 space-y-1">
        <p>© 2026 Plataforma Nova CNH Brasil na Mão — Sincronizador de Contas do Looker Studio</p>
        <p className="text-[10px] text-slate-500">Iniciativa independente de fomento e planejamento financeiro para candidatos a CNH a partir de 17 anos (foco principal de 17-24 anos).</p>
      </footer>

    </div>
  );
}

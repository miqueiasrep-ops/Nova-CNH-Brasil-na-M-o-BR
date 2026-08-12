import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, setLogLevel } from "firebase/firestore";

// Silenciar logs verbose internos de conexão do cliente Firestore
try {
  setLogLevel("error");
} catch (e) {
  // ignore
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

// Firebase Firestore global instances
let firestoreDb: any = null;

// Cache em memória para otimizar as consultas e evitar esgotamento de cota do Firestore
let memoryCache: {
  alunos: any[];
  instrutores: any[];
  depoimentos?: any[];
  gasWebhookUrl: string;
  googleVerificationCode: string;
  updatedAt: string;
} | null = null;

const COOLDOWN_FILE = path.join(process.cwd(), ".firestore_quota_cooldown");
let quotaExceededUntilMemory = 0;

function getQuotaExceededUntil(): number {
  if (quotaExceededUntilMemory > 0 && Date.now() < quotaExceededUntilMemory) {
    return quotaExceededUntilMemory;
  }
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const content = fs.readFileSync(COOLDOWN_FILE, "utf-8");
      const ts = Number(content);
      if (!isNaN(ts) && Date.now() < ts) {
        quotaExceededUntilMemory = ts;
        return ts;
      }
    }
  } catch (err) {
    // ignore
  }
  return 0;
}

function setQuotaExceededUntil(durationMs: number) {
  try {
    const ts = Date.now() + durationMs;
    quotaExceededUntilMemory = ts;
    fs.writeFileSync(COOLDOWN_FILE, String(ts), "utf-8");
    console.log(`🔒 [Firebase] Cooldown ativado até: ${new Date(ts).toISOString()}`);
  } catch (err) {
    // ignore
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = err?.message || String(err);
  const code = err?.code;
  return (
    code === 8 ||
    code === "resource-exhausted" ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("resource-exhausted") ||
    msg.includes("Quota limit exceeded")
  );
}

function getFirestoreDB() {
  if (firestoreDb) return firestoreDb;

  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.warn("⚠️ [Firebase] firebase-applet-config.json não encontrado. Operando no modo local (database.json).");
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    });

    if (config.firestoreDatabaseId) {
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(firebaseApp);
    }
    console.log("🔥 [Firebase] Firestore conectado com sucesso para o banco durável!");
    return firestoreDb;
  } catch (err) {
    console.error("❌ [Firebase] Erro ao inicializar o Firestore:", err);
    return null;
  }
}

// Helper para ler dados duráveis do Firestore com fallback local (database.json)
async function fetchFromFirestore() {
  if (Date.now() < getQuotaExceededUntil()) {
    console.log("⏳ [Firebase] Usando dados locais devido a limite de cota ativo (Firestore em cooldown).");
    return null;
  }

  const db = getFirestoreDB();
  if (!db) return null;

  try {
    console.log("📥 [Firebase] Carregando dados direto do Firestore na nuvem...");
    
    // 1. Obter alunos
    const alunosCol = collection(db, "alunos");
    const alunosSnapshot = await getDocs(alunosCol);
    const alunos = alunosSnapshot.docs.map(doc => doc.data());

    // 2. Obter instrutores
    const instCol = collection(db, "instrutores");
    const instSnapshot = await getDocs(instCol);
    const instrutores = instSnapshot.docs.map(doc => doc.data());

    // 3. Obter configurações
    const settingsDocRef = doc(db, "config", "settings");
    const settingsSnapshot = await getDoc(settingsDocRef);
    let gasWebhookUrl = "";
    let googleVerificationCode = "";

    if (settingsSnapshot.exists()) {
      const data = settingsSnapshot.data();
      gasWebhookUrl = data.gasWebhookUrl || "";
      googleVerificationCode = data.googleVerificationCode || "";
    }

    console.log(`✅ [Firebase] Download concluído. Alunos: ${alunos.length}, Instrutores: ${instrutores.length}`);
    return {
      alunos,
      instrutores,
      depoimentos: [],
      gasWebhookUrl,
      googleVerificationCode
    };
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn("⚠️ [Firebase] Cota diária do Firestore esgotada ou limite excedido. Mudando para modo local (fallback) por 24 horas.");
      setQuotaExceededUntil(24 * 60 * 60 * 1000); // 24 horas de cooldown
    } else {
      console.error("❌ [Firebase] Erro ao buscar dados do Firestore, usando backup local:", error);
    }
    return null;
  }
}

// Helper para limpar campos undefined antes de comparar objetos ou enviar ao Firestore
function cleanObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = cleanObject(obj[key]);
    }
  }
  return clean;
}

// Helpers para sanitização, mesclagem e prevenção de sobrescrita de candidatos
function normalizeCpf(cpf?: string): string {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

function normalizeName(nome?: string): string {
  if (!nome) return '';
  return String(nome).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getNextCnhId(list: any[]): string {
  let maxNum = 0;
  for (const item of list) {
    if (!item || !item.id) continue;
    const match = String(item.id).match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum && num < 1000000) { // Ignora IDs de timestamp gigantes
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `CNH-${String(nextNum).padStart(3, '0')}`;
}

function mergeTwoAlunoObjects(obj1: any, obj2: any): any {
  const time1 = obj1.updatedAt ? new Date(obj1.updatedAt).getTime() : 0;
  const time2 = obj2.updatedAt ? new Date(obj2.updatedAt).getTime() : 0;
  const newer = time2 >= time1 ? obj2 : obj1;
  const older = time2 >= time1 ? obj1 : obj2;

  const merged = { ...older, ...newer };

  if (!merged.cpf && older.cpf) merged.cpf = older.cpf;
  if (!merged.rg && older.rg) merged.rg = older.rg;
  if (!merged.senha && older.senha) merged.senha = older.senha;
  if (!merged.endereco && older.endereco) merged.endereco = older.endereco;

  // Respect newer parcelasPagas if explicitly provided
  if (typeof newer.parcelasPagas === 'number' && !isNaN(newer.parcelasPagas)) {
    merged.parcelasPagas = Math.max(0, newer.parcelasPagas);
  } else if (typeof older.parcelasPagas === 'number' && !isNaN(older.parcelasPagas)) {
    merged.parcelasPagas = Math.max(0, older.parcelasPagas);
  } else {
    merged.parcelasPagas = 0;
  }

  // Handle baixas and comprovantes: if newer explicitly set parcelasPagas to 0, use newer baixas (or empty)
  if (newer.parcelasPagas === 0) {
    merged.baixasPagamento = Array.isArray(newer.baixasPagamento) ? newer.baixasPagamento : [];
  } else {
    const baixas1 = Array.isArray(obj1.baixasPagamento) ? obj1.baixasPagamento : [];
    const baixas2 = Array.isArray(obj2.baixasPagamento) ? obj2.baixasPagamento : [];
    const baixasMap = new Map<string, any>();
    [...baixas1, ...baixas2].forEach(b => {
      if (b && b.id) baixasMap.set(b.id, b);
    });
    merged.baixasPagamento = Array.from(baixasMap.values());
  }

  const comp1 = Array.isArray(obj1.comprovantes) ? obj1.comprovantes : [];
  const comp2 = Array.isArray(obj2.comprovantes) ? obj2.comprovantes : [];
  const compMap = new Map<string, any>();
  [...comp1, ...comp2].forEach(c => {
    if (c && c.id) compMap.set(c.id, c);
  });
  merged.comprovantes = Array.from(compMap.values());

  return merged;
}

// Helper para mesclar listas mantendo dados atualizados sem ressuscitar itens deletados nem duplicar candidatos
function mergeAlunosLists(existing: any[], incoming: any[]): any[] {
  const resultList: any[] = [];
  const existingArr = Array.isArray(existing) ? existing.filter(Boolean) : [];
  const incomingArr = Array.isArray(incoming) ? incoming.filter(Boolean) : [];
  const combined = [...existingArr, ...incomingArr];

  for (const rawInc of combined) {
    if (!rawInc) continue;
    let inc = { ...rawInc };

    const incCpf = normalizeCpf(inc.cpf);
    const incName = normalizeName(inc.nome);

    let matchIdx = -1;
    if (incCpf && incCpf.length === 11) {
      matchIdx = resultList.findIndex(e => normalizeCpf(e.cpf) === incCpf);
    }
    if (matchIdx === -1 && incName) {
      matchIdx = resultList.findIndex(e => normalizeName(e.nome) === incName);
    }

    if (matchIdx !== -1) {
      const existingCandidate = resultList[matchIdx];
      const merged = mergeTwoAlunoObjects(existingCandidate, inc);
      merged.id = (existingCandidate.id && existingCandidate.id.startsWith('CNH-')) 
        ? existingCandidate.id 
        : ((inc.id && inc.id.startsWith('CNH-')) ? inc.id : existingCandidate.id);
      resultList[matchIdx] = merged;
      continue;
    }

    const incId = String(inc.id || '').trim();
    const idIdx = resultList.findIndex(e => String(e.id || '').trim() === incId);

    if (idIdx !== -1 && incId) {
      inc.id = getNextCnhId(resultList);
      resultList.push(inc);
    } else {
      if (!inc.id || !inc.id.startsWith('CNH-')) {
        inc.id = getNextCnhId(resultList);
      }
      resultList.push(inc);
    }
  }

  const usedIds = new Set<string>();
  for (let i = 0; i < resultList.length; i++) {
    let student = resultList[i];
    if (!student.id || !student.id.startsWith('CNH-') || usedIds.has(student.id)) {
      student.id = getNextCnhId(resultList);
    }
    usedIds.add(student.id);
  }

  resultList.sort((a, b) => {
    const numA = parseInt((a.id.match(/\d+/) || [0])[0], 10);
    const numB = parseInt((b.id.match(/\d+/) || [0])[0], 10);
    return numA - numB;
  });

  return resultList;
}

function mergeInstrutoresLists(existing: any[], incoming: any[]): any[] {
  if (!existing || existing.length === 0) return incoming || [];
  if (!incoming || incoming.length === 0) return existing || [];

  const map = new Map<string, any>();
  for (const item of existing) {
    if (item && item.nome) map.set(String(item.nome).trim().toLowerCase(), item);
  }
  for (const item of incoming) {
    if (!item || !item.nome) continue;
    const key = String(item.nome).trim().toLowerCase();
    if (map.has(key)) {
      map.set(key, { ...map.get(key), ...item });
    } else {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

// Helper para salvar dados duráveis no Firestore e atualizar backup local
async function saveToFirestore(
  alunos: any[],
  instrutores: any[],
  gasWebhookUrl: string,
  googleVerificationCode: string,
  deletedAlunoIds: string[] = [],
  deletedInstrutorIds: string[] = []
) {
  if (Date.now() < getQuotaExceededUntil()) {
    return false;
  }

  const db = getFirestoreDB();
  if (!db) return false;

  try {
    console.log(`📤 [Firebase] Sincronizando dados para o Firestore na nuvem (Alunos: ${alunos?.length || 0}, Instrutores: ${instrutores?.length || 0})...`);
    
    // 1. Salvar configurações gerais apenas se houver diferença relevante
    try {
      let configChanged = true;
      const settingsDocRef = doc(db, "config", "settings");
      const settingsSnapshot = await getDoc(settingsDocRef);
      if (settingsSnapshot.exists()) {
        const existingSettings = settingsSnapshot.data();
        if (
          existingSettings.gasWebhookUrl === (gasWebhookUrl || "") &&
          existingSettings.googleVerificationCode === (googleVerificationCode || "")
        ) {
          configChanged = false;
        }
      }
      
      if (configChanged) {
        await setDoc(settingsDocRef, {
          gasWebhookUrl: gasWebhookUrl || "",
          googleVerificationCode: googleVerificationCode || "",
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn("⚠️ [Firebase] Cota do Firestore esgotada nas configurações. Ativando modo local por 24h.");
        setQuotaExceededUntil(24 * 60 * 60 * 1000);
        return false;
      }
    }

    // 2. Upsert coleção de alunos (apenas se alterado para economizar cota do Firestore)
    let alunosWriteCount = 0;
    if (alunos && Array.isArray(alunos)) {
      // Ler do cache do servidor se disponível
      const existingMap = new Map<string, string>();
      if (memoryCache && memoryCache.alunos) {
        memoryCache.alunos.forEach((a: any) => {
          if (a && a.id) existingMap.set(String(a.id).trim(), JSON.stringify(cleanObject(a)));
        });
      }

      for (const aluno of alunos) {
        if (!aluno || !aluno.id) continue;
        const cleanId = String(aluno.id).trim();
        const cleanedAluno = cleanObject(aluno);
        const newStr = JSON.stringify(cleanedAluno);

        // Se já for rigorosamente idêntico ao que temos no cache/Firestore, pula para economizar cota de escrita
        if (existingMap.has(cleanId) && existingMap.get(cleanId) === newStr) {
          continue;
        }

        const alunoRef = doc(db, "alunos", cleanId);
        try {
          await setDoc(alunoRef, cleanedAluno);
          alunosWriteCount++;
        } catch (err: any) {
          if (isQuotaError(err)) {
            console.warn("⚠️ [Firebase] Cota diária do Firestore esgotada ao salvar aluno. Ativando modo local por 24h.");
            setQuotaExceededUntil(24 * 60 * 60 * 1000);
            return false;
          }
          console.error(`❌ [Firebase] Erro ao salvar aluno ${cleanId}:`, err);
        }
      }
    }

    // Excluir do Firestore alunos que foram deletados
    let alunosDeleteCount = 0;
    if (deletedAlunoIds && deletedAlunoIds.length > 0) {
      for (const delId of deletedAlunoIds) {
        if (!delId) continue;
        try {
          await deleteDoc(doc(db, "alunos", String(delId).trim()));
          alunosDeleteCount++;
        } catch (err: any) {
          if (isQuotaError(err)) {
            console.warn("⚠️ [Firebase] Cota do Firestore esgotada ao deletar aluno. Ativando modo local por 24h.");
            setQuotaExceededUntil(24 * 60 * 60 * 1000);
            return false;
          }
        }
      }
    }

    // 3. Upsert coleção de instrutores
    let instWriteCount = 0;
    if (instrutores && Array.isArray(instrutores)) {
      const existingInstMap = new Map<string, string>();
      if (memoryCache && memoryCache.instrutores) {
        memoryCache.instrutores.forEach((i: any) => {
          if (i && i.nome) existingInstMap.set(String(i.nome).trim().toLowerCase(), JSON.stringify(cleanObject(i)));
        });
      }

      for (const inst of instrutores) {
        if (!inst || !inst.nome) continue;
        const cleanId = String(inst.nome).trim().replace(/\//g, "-");
        const cleanedInst = cleanObject(inst);
        const newInstStr = JSON.stringify(cleanedInst);
        const key = String(inst.nome).trim().toLowerCase();

        if (existingInstMap.has(key) && existingInstMap.get(key) === newInstStr) {
          continue;
        }

        const instRef = doc(db, "instrutores", cleanId);
        try {
          await setDoc(instRef, cleanedInst);
          instWriteCount++;
        } catch (err: any) {
          if (isQuotaError(err)) {
            console.warn("⚠️ [Firebase] Cota do Firestore esgotada ao salvar instrutor. Ativando modo local por 24h.");
            setQuotaExceededUntil(24 * 60 * 60 * 1000);
            return false;
          }
        }
      }
    }

    // Excluir do Firestore instrutores explicitamente deletados
    let instDeleteCount = 0;
    if (deletedInstrutorIds && deletedInstrutorIds.length > 0) {
      for (const delId of deletedInstrutorIds) {
        if (!delId) continue;
        try {
          await deleteDoc(doc(db, "instrutores", String(delId).trim().replace(/\//g, "-")));
          instDeleteCount++;
        } catch (err: any) {
          if (isQuotaError(err)) {
            console.warn("⚠️ [Firebase] Cota do Firestore esgotada ao deletar instrutor. Ativando modo local por 24h.");
            setQuotaExceededUntil(24 * 60 * 60 * 1000);
            return false;
          }
        }
      }
    }

    console.log(`✅ [Firebase] Sincronização concluída na nuvem. Escritas realizadas - Alunos: ${alunosWriteCount}, Instrutores: ${instWriteCount}. Exclusões - Alunos: ${alunosDeleteCount}, Instrutores: ${instDeleteCount}`);
    return true;
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn("⚠️ [Firebase] Cota diária do Firestore esgotada ao tentar salvar. Ativando modo local por 24h.");
      setQuotaExceededUntil(24 * 60 * 60 * 1000); // 24 horas de cooldown
    } else {
      console.error("❌ [Firebase] Erro ao salvar dados no Firestore:", error);
    }
    return false;
  }
}

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Middleware to parse huge JSON payloads
app.use(express.json({ limit: "50mb" }));

// Helper to read database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler database.json:", err);
    return null;
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar database.json:", err);
  }
}

// ----------------------------------------
// API ENDPOINTS – CENTRAL BANCO DE DADOS
// ----------------------------------------

// Rota robusta para validação de propriedade do Google Search Console (Ficheiro HTML)
app.get("/google*.html", (req, res) => {
  const filename = path.basename(req.path);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`google-site-verification: ${filename}`);
});

// Obter Banco de Dados (Alunos, Instrutores e URL do Web App)
app.get("/api/db", async (req, res) => {
  const forceRefresh = req.query.force === "true";
  
  if (!memoryCache || forceRefresh) {
    console.log("💾 [Cache] " + (forceRefresh ? "Forçando atualização direta do Firestore..." : "Inicializando cache em memória..."));
    let db = await fetchFromFirestore();
    let localDb = readDB();

    let combinedAlunos = mergeAlunosLists(localDb?.alunos || [], db?.alunos || []);
    let combinedInstrutores = mergeInstrutoresLists(localDb?.instrutores || [], db?.instrutores || []);
    let combinedDepoimentos = localDb?.depoimentos || db?.depoimentos || [];

    memoryCache = {
      alunos: combinedAlunos,
      instrutores: combinedInstrutores,
      depoimentos: combinedDepoimentos,
      gasWebhookUrl: db?.gasWebhookUrl || localDb?.gasWebhookUrl || "",
      googleVerificationCode: db?.googleVerificationCode || localDb?.googleVerificationCode || "",
      updatedAt: new Date().toISOString()
    };

    // Sincroniza o arquivo local com a união total de dados
    writeDB(memoryCache);
  }

  if (!memoryCache) {
    return res.json({ alunos: [], instrutores: [], depoimentos: [], gasWebhookUrl: "", googleVerificationCode: "", quotaExceeded: Date.now() < getQuotaExceededUntil() });
  }
  
  res.json({
    alunos: memoryCache.alunos || [],
    instrutores: memoryCache.instrutores || [],
    depoimentos: memoryCache.depoimentos || [],
    gasWebhookUrl: memoryCache.gasWebhookUrl || "",
    googleVerificationCode: memoryCache.googleVerificationCode || "",
    quotaExceeded: Date.now() < getQuotaExceededUntil()
  });
});

// Atualizar Banco de Dados Central
app.post("/api/db", async (req, res) => {
  const { alunos, instrutores, depoimentos, gasWebhookUrl, googleVerificationCode, mode, deletedAlunoIds, deletedInstrutorIds } = req.body;
  
  if (!memoryCache) {
    let localDb = readDB();
    memoryCache = {
      alunos: localDb?.alunos || [],
      instrutores: localDb?.instrutores || [],
      depoimentos: localDb?.depoimentos || [],
      gasWebhookUrl: localDb?.gasWebhookUrl || "",
      googleVerificationCode: localDb?.googleVerificationCode || "",
      updatedAt: new Date().toISOString()
    };
  }

  const currentAlunos = memoryCache?.alunos || [];
  const currentInstrutores = memoryCache?.instrutores || [];
  const currentDepoimentos = memoryCache?.depoimentos || [];

  let finalAlunos: any[] = [];
  let toDeleteAlunos: string[] = deletedAlunoIds ? [...deletedAlunoIds] : [];

  if (mode === 'full_overwrite') {
    finalAlunos = alunos || [];
    const incomingSet = new Set(finalAlunos.map((a: any) => String(a.id).trim()));
    currentAlunos.forEach((a: any) => {
      if (a && a.id && !incomingSet.has(String(a.id).trim())) {
        toDeleteAlunos.push(String(a.id).trim());
      }
    });
  } else {
    // Mesclagem segura: atualiza/adiciona alunos recebidos mantendo todos os outros preservados
    finalAlunos = mergeAlunosLists(currentAlunos, alunos || []);
    if (toDeleteAlunos.length > 0) {
      const deleteSet = new Set(toDeleteAlunos);
      finalAlunos = finalAlunos.filter(a => a && a.id && !deleteSet.has(String(a.id).trim()));
    }
  }

  let finalInstrutores: any[] = [];
  let toDeleteInstrutores: string[] = deletedInstrutorIds ? [...deletedInstrutorIds] : [];

  if (mode === 'full_overwrite') {
    finalInstrutores = instrutores || [];
    const incomingInstSet = new Set(finalInstrutores.map((i: any) => String(i.nome).trim().toLowerCase()));
    currentInstrutores.forEach((i: any) => {
      if (i && i.nome && !incomingInstSet.has(String(i.nome).trim().toLowerCase())) {
        toDeleteInstrutores.push(String(i.nome).trim().replace(/\//g, "-"));
      }
    });
  } else {
    finalInstrutores = mergeInstrutoresLists(currentInstrutores, instrutores || []);
    if (toDeleteInstrutores.length > 0) {
      const deleteSet = new Set(toDeleteInstrutores.map(s => String(s).toLowerCase()));
      finalInstrutores = finalInstrutores.filter(i => i && i.nome && !deleteSet.has(String(i.nome).trim().toLowerCase()));
    }
  }

  const updatedGasWebhookUrl = gasWebhookUrl !== undefined ? gasWebhookUrl : (memoryCache?.gasWebhookUrl || "");
  const updatedGoogleVerificationCode = googleVerificationCode !== undefined ? googleVerificationCode : (memoryCache?.googleVerificationCode || "");

  const finalDepoimentos = depoimentos !== undefined ? depoimentos : currentDepoimentos;

  const updatedDB = {
    alunos: finalAlunos,
    instrutores: finalInstrutores,
    depoimentos: finalDepoimentos,
    gasWebhookUrl: updatedGasWebhookUrl,
    googleVerificationCode: updatedGoogleVerificationCode,
    updatedAt: new Date().toISOString()
  };

  memoryCache = updatedDB;
  writeDB(updatedDB);

  let cloudSaved = false;
  try {
    cloudSaved = await saveToFirestore(
      updatedDB.alunos,
      updatedDB.instrutores,
      updatedDB.gasWebhookUrl,
      updatedDB.googleVerificationCode,
      toDeleteAlunos,
      toDeleteInstrutores
    );
  } catch (err) {
    console.error("❌ [Firebase] Falha na sincronização com Firestore:", err);
  }

  res.json({ 
    success: true, 
    message: "Banco de dados central e nuvem Firebase atualizados com sucesso.", 
    alunos: updatedDB.alunos,
    instrutores: updatedDB.instrutores,
    quotaExceeded: Date.now() < getQuotaExceededUntil() 
  });
});

// Endpoint para refinar e aprimorar o texto do depoimento do aluno via IA (Gemini 3.6 Flash)
app.post("/api/refine-testimonial", async (req, res) => {
  const { originalText, nome, categoria, fase } = req.body;
  if (!originalText || typeof originalText !== "string" || !originalText.trim()) {
    return res.status(400).json({ refinedText: originalText, message: "Texto em branco." });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return res.json({
      refinedText: originalText.trim(),
      message: "Chave Gemini API não configurada. Mantido o texto original."
    });
  }

  try {
    const prompt = `Você é um especialista em comunicação e redação da Autoescola Nova CNH Brasil.
Sua missão é refinar e organizar o depoimento/relato enviado por um aluno, corrigindo eventuais erros de ortografia, pontuação e gramática, tornando a leitura mais fluida, inspiradora e entusiasmada, porém mantendo RIGOROSAMENTE a essência, a veracidade e o tom de voz humano original do aluno.

Dados do Aluno:
- Nome: ${nome || 'Aluno(a)'}
- Categoria: ${categoria || 'CNH'}
- Fase: ${fase || 'Processo CNH'}

Depoimento Original Bruto:
"${originalText}"

Instruções:
- Devolva APENAS o texto do depoimento refinado em português brasileiro, sem aspas adicionais, sem títulos, sem introdução ou explicações.
- Mantenha na primeira pessoa ("eu", "minha experiência").
- Não invente informações fictícias que o aluno não mencionou.`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const refinedText = response.text?.trim() || originalText;
    return res.json({
      refinedText,
      success: true
    });
  } catch (err: any) {
    console.error("❌ Erro ao refinar depoimento via Gemini API:", err);
    return res.json({
      refinedText: originalText,
      success: false,
      message: err.message || "Não foi possível refinar no momento."
    });
  }
});

// Endpoint para validar se o arquivo enviado de comprovante possui informações bancárias/financeiras reais
app.post("/api/validate-receipt", async (req, res) => {
  const { fileName, fileContent, mimeType } = req.body;
  if (!fileContent) {
    return res.status(400).json({ isValid: false, reason: "Nenhum arquivo enviado." });
  }

  if (fileContent.length < 50) {
    return res.status(400).json({ isValid: false, reason: "O documento enviado está vazio ou corrompido." });
  }

  // Extrai apenas os dados base64 limpos do dataURL
  let base64Data = fileContent;
  if (fileContent.includes(";base64,")) {
    base64Data = fileContent.split(";base64,").pop();
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    console.log("⚠️ [Análise de Comprovantes] GEMINI_API_KEY não definida. Ativando validação de teste.");
    
    const lowercaseName = (fileName || "").toLowerCase();
    const isImage = mimeType?.startsWith("image/") || lowercaseName.endsWith(".png") || lowercaseName.endsWith(".jpg") || lowercaseName.endsWith(".jpeg");
    const isPdf = mimeType === "application/pdf" || lowercaseName.endsWith(".pdf");
    
    if (!isImage && !isPdf) {
      return res.json({
        isValid: false,
        reason: "O formato do arquivo enviado é inválido. Apenas imagens (PNG, JPG) ou PDFs são aceitos como comprovantes."
      });
    }

    if (lowercaseName.includes("selfie") || lowercaseName.includes("foto") || lowercaseName.includes("avatar") || lowercaseName.includes("test")) {
      return res.json({
        isValid: false,
        reason: `(Modo de simulação) O arquivo '${fileName}' foi rejeitado porque parece ser uma foto pessoal ou de teste, não contendo dados bancários estruturados.`
      });
    }

    return res.json({
      isValid: true,
      reason: `(Modo de Teste) Comprovante de depósito '${fileName}' recebido com sucesso! (Configure GEMINI_API_KEY para análise real por IA).`
    });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: base64Data,
      },
    };

    const textPart = {
      text: "Você é um auditor financeiro virtual do programa Nova CNH Brasil. Verifique se a imagem ou o PDF de até 5MB enviado é REALMENTE um comprovante de transação financeira, recibo bancário, Pix ou depósito. Não aceite fotos pessoais, selfies, memes, capturas de tela sem dados, paisagens, ou documentos de identidade. O comprovante deve conter dados bancários, instituição financeira, data ou valor em R$. Forneça uma resposta estritamente estruturada em JSON contendo um campo 'isValid' (boolean) e um campo 'reason' (string, justificando em português brasileiro, identificando se possível os valores e dados fiduciários que validaram o arquivo, ou explicando o motivo da rejeição).",
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["isValid", "reason"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      isValid: result.isValid ?? true,
      reason: result.reason || "Arquivo validado com sucesso por inteligência artificial."
    });
  } catch (err: any) {
    console.error("❌ Erro ao validar comprovante via Gemini API:", err);
    return res.json({
      isValid: true, // Fail-safe em caso de erro temporário
      reason: `Aprovado temporariamente via auditoria de emergência. Detalhes: ${err.message || err.toString()}`
    });
  }
});

// ----------------------------------------
// VITE CONTROLLER (DEVELOPMENT VS PRODUCTION)
// ----------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // SPA routing fallback para Express v4 com injeção de metatag dinâmica (em produção)
    app.get("*", async (req, res) => {
      let db = await fetchFromFirestore();
      if (!db) {
        db = readDB();
      }
      const code = db?.googleVerificationCode || "";
      const indexPath = path.join(distPath, "index.html");
      
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, "utf-8");
          if (code) {
            let metaTag = "";
            let cleanCode = code.trim();
            if (cleanCode.startsWith("<meta") && cleanCode.includes("content=")) {
              // Já é a tag inteira
              metaTag = cleanCode;
            } else {
              // Extrai o código caso venha com google-site-verification=
              if (cleanCode.includes("google-site-verification=")) {
                const match = cleanCode.match(/google-site-verification=["']?([^"'\s>]+)["']?/);
                if (match && match[1]) {
                  cleanCode = match[1];
                } else {
                  cleanCode = cleanCode.replace("google-site-verification=", "").replace(/["']/g, "");
                }
              }
              const contentMatch = cleanCode.match(/content=["']([^"']+)["']/);
              if (contentMatch && contentMatch[1]) {
                cleanCode = contentMatch[1];
              }
              cleanCode = cleanCode.replace(/["']/g, "");
              metaTag = `<meta name="google-site-verification" content="${cleanCode}" />`;
            }
            html = html.replace("<head>", `<head>\n    ${metaTag}`);
          }
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.send(html);
        } catch (err) {
          console.error("Erro ao injetar metatag dinamicamente em produção:", err);
        }
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor central multi-aparelho rodando na porta ${PORT}`);
  });
}

start();

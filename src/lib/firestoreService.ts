import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Aluno, Instrutor, Depoimento } from '../types';
import { DEFAULT_ALUNOS, DEFAULT_INSTRUTORES, DEFAULT_DEPOIMENTOS } from './defaultData';

// Helper to remove undefined fields recursively because Firestore doesn't accept undefined
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj as any)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

let isQuotaExceededState = false;
let quotaResetTimeout: any = null;
type QuotaListener = (exceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export function isQuotaExceeded(): boolean {
  return isQuotaExceededState;
}

export function subscribeQuotaStatus(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(isQuotaExceededState);
  return () => quotaListeners.delete(listener);
}

function handleQuotaError(err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('quota exceeded') ||
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('write units') ||
    errMsg.includes('read units') ||
    errMsg.includes('free tier database')
  ) {
    if (!isQuotaExceededState) {
      isQuotaExceededState = true;
      console.warn("ℹ️ [Firestore] Cota diária do banco gratuito atingida. O aplicativo continua funcionando normalmente com persistência local e no servidor.");
      quotaListeners.forEach(l => l(true));
      
      if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
      quotaResetTimeout = setTimeout(() => {
        isQuotaExceededState = false;
        quotaListeners.forEach(l => l(false));
      }, 5 * 60 * 1000);
    }
  }
}

// 1. Subscribe to Alunos in real-time
export function subscribeAlunos(
  onUpdate: (alunos: Aluno[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'alunos');
  
  try {
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const alunosList: Aluno[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Aluno;
            alunosList.push({
              ...data,
              id: data.id || docSnap.id
            });
          });
          onUpdate(alunosList);
        }
      },
      (err) => {
        handleQuotaError(err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleQuotaError(err);
    return () => {};
  }
}

// 2. Subscribe to Instrutores in real-time
export function subscribeInstrutores(
  onUpdate: (instrutores: Instrutor[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'instrutores');

  try {
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Instrutor[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Instrutor);
          });
          onUpdate(list);
        }
      },
      (err) => {
        handleQuotaError(err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleQuotaError(err);
    return () => {};
  }
}

// 3. Subscribe to Depoimentos in real-time
export function subscribeDepoimentos(
  onUpdate: (depoimentos: Depoimento[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'depoimentos');

  try {
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Depoimento[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data() as Depoimento;
            list.push({ ...d, id: d.id || docSnap.id });
          });
          onUpdate(list);
        }
      },
      (err) => {
        handleQuotaError(err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleQuotaError(err);
    return () => {};
  }
}

// 4. Subscribe to Config (Webhooks, verification codes, etc.)
export function subscribeConfig(
  onUpdate: (config: { gasWebhookUrl?: string; googleVerificationCode?: string }) => void
): Unsubscribe {
  const docRef = doc(db, 'config', 'general');

  try {
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as any);
        }
      },
      (err) => {
        handleQuotaError(err);
      }
    );
  } catch (err: any) {
    handleQuotaError(err);
    return () => {};
  }
}

// Track last written hashes to prevent redundant Firestore writes
const lastWrittenHashes = new Map<string, string>();

// 5. Save a single Aluno (Single doc write = 1 unit)
export async function saveAlunoToFirestore(aluno: Aluno): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docId = (aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`).trim();
    const payload = sanitizeForFirestore({
      ...aluno,
      id: docId,
      updatedAt: aluno.updatedAt || new Date().toISOString()
    });
    
    const hash = JSON.stringify(payload);
    if (lastWrittenHashes.get(docId) === hash) {
      return; // Skip identical write
    }

    const docRef = doc(db, 'alunos', docId);
    await setDoc(docRef, payload, { merge: true });
    lastWrittenHashes.set(docId, hash);
    console.log(`✅ [Firestore] Candidato ${docId} (${aluno.nome}) salvo com sucesso na nuvem!`);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 6. Save a batch/list of Alunos (Only writes changed/new docs)
export async function saveAllAlunosToFirestore(
  alunos: Aluno[],
  deletedIds: string[] = []
): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    let writeCount = 0;
    const batch = writeBatch(db);

    for (const aluno of alunos) {
      if (!aluno) continue;
      const docId = (aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`).trim();
      const sanitized = sanitizeForFirestore({
        ...aluno,
        id: docId,
        updatedAt: aluno.updatedAt || new Date().toISOString()
      });
      const hash = JSON.stringify(sanitized);

      if (lastWrittenHashes.get(docId) !== hash) {
        const docRef = doc(db, 'alunos', docId);
        batch.set(docRef, sanitized, { merge: true });
        lastWrittenHashes.set(docId, hash);
        writeCount++;
      }
    }

    for (const id of deletedIds) {
      if (id) {
        const docRef = doc(db, 'alunos', id.trim());
        batch.delete(docRef);
        lastWrittenHashes.delete(id.trim());
        writeCount++;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
      console.log(`✅ [Firestore] ${writeCount} candidato(s) sincronizados na nuvem.`);
    }
  } catch (error) {
    handleQuotaError(error);
  }
}

// 7. Delete Aluno
export async function deleteAlunoFromFirestore(alunoId: string): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docId = alunoId.trim();
    const docRef = doc(db, 'alunos', docId);
    await deleteDoc(docRef);
    lastWrittenHashes.delete(docId);
    console.log(`🗑️ [Firestore] Aluno ${docId} removido da nuvem.`);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 8. Save single Instrutor
export async function saveInstrutorToFirestore(instrutor: Instrutor): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    if (!instrutor || !instrutor.nome) return;
    const docId = instrutor.nome.trim().replace(/\//g, '_');
    const payload = sanitizeForFirestore(instrutor);
    const hash = JSON.stringify(payload);
    if (lastWrittenHashes.get(`inst_${docId}`) === hash) return;

    const docRef = doc(db, 'instrutores', docId);
    await setDoc(docRef, payload, { merge: true });
    lastWrittenHashes.set(`inst_${docId}`, hash);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 9. Save all Instrutores (Only writes changed/new docs)
export async function saveAllInstrutoresToFirestore(
  instrutores: Instrutor[],
  deletedNomes: string[] = []
): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    let writeCount = 0;
    const batch = writeBatch(db);
    for (const inst of instrutores) {
      if (inst && inst.nome) {
        const docId = inst.nome.trim().replace(/\//g, '_');
        const sanitized = sanitizeForFirestore(inst);
        const hash = JSON.stringify(sanitized);
        if (lastWrittenHashes.get(`inst_${docId}`) !== hash) {
          const docRef = doc(db, 'instrutores', docId);
          batch.set(docRef, sanitized, { merge: true });
          lastWrittenHashes.set(`inst_${docId}`, hash);
          writeCount++;
        }
      }
    }
    for (const nome of deletedNomes) {
      if (nome) {
        const docId = nome.trim().replace(/\//g, '_');
        const docRef = doc(db, 'instrutores', docId);
        batch.delete(docRef);
        lastWrittenHashes.delete(`inst_${docId}`);
        writeCount++;
      }
    }
    if (writeCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleQuotaError(error);
  }
}

// 10. Delete Instrutor
export async function deleteInstrutorFromFirestore(nome: string): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docId = nome.trim().replace(/\//g, '_');
    const docRef = doc(db, 'instrutores', docId);
    await deleteDoc(docRef);
    lastWrittenHashes.delete(`inst_${docId}`);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 11. Save Depoimento
export async function saveDepoimentoToFirestore(depoimento: Depoimento): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docId = depoimento.id || `DEP-${Date.now()}`;
    const docRef = doc(db, 'depoimentos', docId);
    await setDoc(docRef, sanitizeForFirestore({ ...depoimento, id: docId }), { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// 12. Delete Depoimento
export async function deleteDepoimentoFromFirestore(depoimentoId: string): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docRef = doc(db, 'depoimentos', depoimentoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 13. Save Config
export async function saveConfigToFirestore(configData: {
  gasWebhookUrl?: string;
  googleVerificationCode?: string;
}): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const docRef = doc(db, 'config', 'general');
    await setDoc(docRef, sanitizeForFirestore(configData), { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// 14. Seed default database if empty
export async function seedDefaultData(): Promise<void> {
  if (isQuotaExceededState) return;
  try {
    const alunosSnap = await getDocs(collection(db, 'alunos'));
    if (alunosSnap.empty) {
      console.log('🌱 [Firestore Seeding] Semeando alunos...');
      await saveAllAlunosToFirestore(DEFAULT_ALUNOS);
    }

    const instSnap = await getDocs(collection(db, 'instrutores'));
    if (instSnap.empty) {
      console.log('🌱 [Firestore Seeding] Semeando instrutores...');
      await saveAllInstrutoresToFirestore(DEFAULT_INSTRUTORES);
    }
  } catch (err) {
    handleQuotaError(err);
  }
}

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
  if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded') || errMsg.includes('quota exceeded') || errMsg.includes('Quota exceeded')) {
    if (!isQuotaExceededState) {
      isQuotaExceededState = true;
      console.warn("⚠️ [Firestore] Cota diária gratuita do Firestore atingida (Resource Exhausted). Operando em modo offline / localStorage.");
      quotaListeners.forEach(l => l(true));
    }
  }
}

// 1. Subscribe to Alunos in real-time
export function subscribeAlunos(
  onUpdate: (alunos: Aluno[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'alunos');
  
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
      console.warn('⚠️ [Firestore] Listener de alunos:', err.message);
      handleQuotaError(err);
      if (onError) onError(err);
    }
  );
}

// 2. Subscribe to Instrutores in real-time
export function subscribeInstrutores(
  onUpdate: (instrutores: Instrutor[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'instrutores');

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
      console.warn('⚠️ [Firestore] Listener de instrutores:', err.message);
      handleQuotaError(err);
      if (onError) onError(err);
    }
  );
}

// 3. Subscribe to Depoimentos in real-time
export function subscribeDepoimentos(
  onUpdate: (depoimentos: Depoimento[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'depoimentos');

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
      console.warn('⚠️ [Firestore] Listener de depoimentos:', err.message);
      handleQuotaError(err);
      if (onError) onError(err);
    }
  );
}

// 4. Subscribe to Config (Webhooks, verification codes, etc.)
export function subscribeConfig(
  onUpdate: (config: { gasWebhookUrl?: string; googleVerificationCode?: string }) => void
): Unsubscribe {
  const docRef = doc(db, 'config', 'general');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as any);
      }
    },
    (err) => {
      console.warn('⚠️ [Firestore] Listener de configurações:', err.message);
      handleQuotaError(err);
    }
  );
}

// 5. Save a single Aluno
export async function saveAlunoToFirestore(aluno: Aluno): Promise<void> {
  try {
    const docId = (aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`).trim();
    const docRef = doc(db, 'alunos', docId);
    const sanitized = sanitizeForFirestore({
      ...aluno,
      id: docId,
      updatedAt: aluno.updatedAt || new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`✅ [Firestore] Aluno ${docId} salvo com sucesso na nuvem!`);
  } catch (error) {
    handleQuotaError(error);
    console.warn(`⚠️ [Firestore] Erro ao salvar aluno ${aluno.id}:`, error);
  }
}

// 6. Save a batch/list of Alunos
export async function saveAllAlunosToFirestore(
  alunos: Aluno[],
  deletedIds: string[] = []
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Grava/atualiza cada aluno
    for (const aluno of alunos) {
      if (!aluno) continue;
      const docId = (aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`).trim();
      const docRef = doc(db, 'alunos', docId);
      const sanitized = sanitizeForFirestore({
        ...aluno,
        id: docId,
        updatedAt: aluno.updatedAt || new Date().toISOString()
      });
      batch.set(docRef, sanitized, { merge: true });
    }

    // Deleta os removidos
    for (const id of deletedIds) {
      if (id) {
        const docRef = doc(db, 'alunos', id.trim());
        batch.delete(docRef);
      }
    }

    await batch.commit();
    console.log('✅ [Firestore] Alunos sincronizados com sucesso na nuvem!');
  } catch (error) {
    handleQuotaError(error);
    console.warn('⚠️ [Firestore] Aviso ao salvar lista de alunos:', error);
  }
}

// 7. Delete Aluno
export async function deleteAlunoFromFirestore(alunoId: string): Promise<void> {
  try {
    const docRef = doc(db, 'alunos', alunoId.trim());
    await deleteDoc(docRef);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 8. Save Instrutor
export async function saveInstrutorToFirestore(instrutor: Instrutor): Promise<void> {
  try {
    const docId = (instrutor.nome || `INST-${Date.now()}`).trim().replace(/\//g, '_');
    const docRef = doc(db, 'instrutores', docId);
    await setDoc(docRef, sanitizeForFirestore(instrutor), { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// 9. Save all Instrutores
export async function saveAllInstrutoresToFirestore(
  instrutores: Instrutor[],
  deletedNomes: string[] = []
): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const inst of instrutores) {
      if (inst && inst.nome) {
        const docId = inst.nome.trim().replace(/\//g, '_');
        const docRef = doc(db, 'instrutores', docId);
        batch.set(docRef, sanitizeForFirestore(inst), { merge: true });
      }
    }
    for (const nome of deletedNomes) {
      if (nome) {
        const docId = nome.trim().replace(/\//g, '_');
        const docRef = doc(db, 'instrutores', docId);
        batch.delete(docRef);
      }
    }
    await batch.commit();
    console.log('✅ [Firestore] Instrutores sincronizados com sucesso na nuvem!');
  } catch (error) {
    handleQuotaError(error);
    console.warn('⚠️ [Firestore] Aviso ao salvar lista de instrutores:', error);
  }
}

// Delete single Instrutor
export async function deleteInstrutorFromFirestore(nome: string): Promise<void> {
  try {
    const docId = nome.trim().replace(/\//g, '_');
    const docRef = doc(db, 'instrutores', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 10. Save Depoimento
export async function saveDepoimentoToFirestore(depoimento: Depoimento): Promise<void> {
  try {
    const docId = depoimento.id || `DEP-${Date.now()}`;
    const docRef = doc(db, 'depoimentos', docId);
    await setDoc(docRef, sanitizeForFirestore({ ...depoimento, id: docId }), { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// 11. Delete Depoimento
export async function deleteDepoimentoFromFirestore(depoimentoId: string): Promise<void> {
  try {
    const docRef = doc(db, 'depoimentos', depoimentoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleQuotaError(error);
  }
}

// 12. Save Config
export async function saveConfigToFirestore(configData: {
  gasWebhookUrl?: string;
  googleVerificationCode?: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'config', 'general');
    await setDoc(docRef, sanitizeForFirestore(configData), { merge: true });
  } catch (error) {
    handleQuotaError(error);
  }
}

// 13. Seed default database if empty
export async function seedDefaultData(): Promise<void> {
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

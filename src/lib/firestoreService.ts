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
      } else {
        // Se a coleção estiver vazia no Firestore, tenta semear com os dados padrão
        console.log('🌱 [Firestore] Coleção alunos vazia. Semeando dados padrão...');
        seedDefaultData().catch(console.error);
        onUpdate(DEFAULT_ALUNOS);
      }
    },
    (err) => {
      console.warn('⚠️ [Firestore] Erro no listener de alunos:', err);
      if (onError) onError(err);
      // Fallback inicial com getDocs se snapshot falhar
      getDocs(colRef)
        .then((snap) => {
          if (!snap.empty) {
            const list: Aluno[] = [];
            snap.forEach((d) => list.push({ ...(d.data() as Aluno), id: d.id }));
            onUpdate(list);
          }
        })
        .catch(console.error);
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
      } else {
        console.log('🌱 [Firestore] Coleção instrutores vazia. Semeando instrutores padrão...');
        saveAllInstrutoresToFirestore(DEFAULT_INSTRUTORES).catch(console.error);
        onUpdate(DEFAULT_INSTRUTORES);
      }
    },
    (err) => {
      console.warn('⚠️ [Firestore] Erro no listener de instrutores:', err);
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
      } else {
        onUpdate(DEFAULT_DEPOIMENTOS);
      }
    },
    (err) => {
      console.warn('⚠️ [Firestore] Erro no listener de depoimentos:', err);
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
      console.warn('⚠️ [Firestore] Erro no listener de configurações:', err);
    }
  );
}

// 5. Save a single Aluno
export async function saveAlunoToFirestore(aluno: Aluno): Promise<void> {
  const docId = aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`;
  const docRef = doc(db, 'alunos', docId);
  const sanitized = sanitizeForFirestore({
    ...aluno,
    id: docId,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, sanitized, { merge: true });
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
      const docId = aluno.id || aluno.cpf?.replace(/[^0-9]/g, '') || `ALUNO-${Date.now()}`;
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
        const docRef = doc(db, 'alunos', id);
        batch.delete(docRef);
      }
    }

    await batch.commit();
    console.log('✅ [Firestore] Alunos sincronizados com sucesso na nuvem!');
  } catch (error) {
    console.error('❌ [Firestore] Erro ao salvar lista de alunos:', error);
    throw error;
  }
}

// 7. Delete Aluno
export async function deleteAlunoFromFirestore(alunoId: string): Promise<void> {
  const docRef = doc(db, 'alunos', alunoId);
  await deleteDoc(docRef);
}

// 8. Save Instrutor
export async function saveInstrutorToFirestore(instrutor: Instrutor): Promise<void> {
  const docId = (instrutor.nome || `INST-${Date.now()}`).trim().replace(/\//g, '_');
  const docRef = doc(db, 'instrutores', docId);
  await setDoc(docRef, sanitizeForFirestore(instrutor), { merge: true });
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
    console.error('❌ [Firestore] Erro ao salvar lista de instrutores:', error);
    throw error;
  }
}

// Delete single Instrutor
export async function deleteInstrutorFromFirestore(nome: string): Promise<void> {
  const docId = nome.trim().replace(/\//g, '_');
  const docRef = doc(db, 'instrutores', docId);
  await deleteDoc(docRef);
}

// 10. Save Depoimento
export async function saveDepoimentoToFirestore(depoimento: Depoimento): Promise<void> {
  const docId = depoimento.id || `DEP-${Date.now()}`;
  const docRef = doc(db, 'depoimentos', docId);
  await setDoc(docRef, sanitizeForFirestore({ ...depoimento, id: docId }), { merge: true });
}

// 11. Delete Depoimento
export async function deleteDepoimentoFromFirestore(depoimentoId: string): Promise<void> {
  const docRef = doc(db, 'depoimentos', depoimentoId);
  await deleteDoc(docRef);
}

// 12. Save Config
export async function saveConfigToFirestore(configData: {
  gasWebhookUrl?: string;
  googleVerificationCode?: string;
}): Promise<void> {
  const docRef = doc(db, 'config', 'general');
  await setDoc(docRef, sanitizeForFirestore(configData), { merge: true });
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

    const depSnap = await getDocs(collection(db, 'depoimentos'));
    if (depSnap.empty && DEFAULT_DEPOIMENTOS.length > 0) {
      console.log('🌱 [Firestore Seeding] Semeando depoimentos...');
      const batch = writeBatch(db);
      for (const d of DEFAULT_DEPOIMENTOS) {
        const docRef = doc(db, 'depoimentos', d.id);
        batch.set(docRef, sanitizeForFirestore(d));
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('❌ [Firestore Seeding Error]:', err);
  }
}

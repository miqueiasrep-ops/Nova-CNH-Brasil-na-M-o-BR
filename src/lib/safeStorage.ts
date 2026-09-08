// Safe Storage Utility to prevent QuotaExceededError, SecurityError or JSON parse errors

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (err: any) {
      // If quota exceeded, clean up stale/backup keys and try one more time
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('nova_cnh_alunos_v3_backup');
          window.localStorage.removeItem('nova_cnh_alunos_v2');
          window.localStorage.removeItem('nova_cnh_alunos_backup');
          window.localStorage.removeItem('nova_cnh_instrutores_backup');
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        // Fallback to memory store silently without throwing
      }
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  },

  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {}
  }
};

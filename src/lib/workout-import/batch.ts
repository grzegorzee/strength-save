// Idempotencja importu (Z110): batchId = hash zawartości pliku. Ten sam plik =
// te same doc id = nadpisanie samego siebie, zero duplikatów.

export interface ImportHistoryEntry {
  batchId: string;
  fileName: string;
  importedAt: string; // ISO
  workoutCount: number;
  format: 'strong' | 'hevy';
}

// Legacy v1 nie miało właściciela: nie wolno przypisać tych nazw plików osobie,
// która zaloguje się następna. Stary klucz zostaje nietknięty; nowe wpisy są per UID.
const importHistoryKey = (userId: string): string => `fittracker_import_history_v2_${userId}`;

// FNV-1a 32-bit, dwa przebiegi (offset zwykły + solony) => 16 hex znaków.
const fnv1a = (text: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const computeImportBatchId = (text: string): string => {
  const a = fnv1a(text, 0x811c9dc5);
  const b = fnv1a(text, 0x811c9dc5 ^ 0x5bd1e995);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
};

export const loadImportHistory = (userId: string): ImportHistoryEntry[] => {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(importHistoryKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry): entry is ImportHistoryEntry => (
      !!entry && typeof entry === 'object'
      && typeof entry.batchId === 'string' && typeof entry.fileName === 'string'
      && typeof entry.importedAt === 'string' && Number.isFinite(entry.workoutCount)
      && (entry.format === 'strong' || entry.format === 'hevy')
    )) : [];
  } catch {
    return [];
  }
};

export const addImportHistoryEntry = (entry: ImportHistoryEntry, userId: string): void => {
  if (!userId) return;
  try {
    const history = loadImportHistory(userId).filter((e) => e.batchId !== entry.batchId);
    history.unshift(entry);
    window.localStorage.setItem(importHistoryKey(userId), JSON.stringify(history.slice(0, 20)));
  } catch { /* localStorage niedostępne — historia importów jest tylko wygodą */ }
};

export const removeImportHistoryEntry = (batchId: string, userId: string): void => {
  if (!userId) return;
  try {
    const history = loadImportHistory(userId).filter((e) => e.batchId !== batchId);
    window.localStorage.setItem(importHistoryKey(userId), JSON.stringify(history));
  } catch { /* ignoruj */ }
};

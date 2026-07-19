// Idempotencja importu (Z110): batchId = hash zawartości pliku. Ten sam plik =
// te same doc id = nadpisanie samego siebie, zero duplikatów.

export interface ImportHistoryEntry {
  batchId: string;
  fileName: string;
  importedAt: string; // ISO
  workoutCount: number;
  format: 'strong' | 'hevy';
}

const IMPORT_HISTORY_KEY = 'fittracker_import_history_v1';

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

export const loadImportHistory = (): ImportHistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ImportHistoryEntry[]) : [];
  } catch {
    return [];
  }
};

export const addImportHistoryEntry = (entry: ImportHistoryEntry): void => {
  try {
    const history = loadImportHistory().filter((e) => e.batchId !== entry.batchId);
    history.unshift(entry);
    window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch { /* localStorage niedostępne — historia importów jest tylko wygodą */ }
};

export const removeImportHistoryEntry = (batchId: string): void => {
  try {
    const history = loadImportHistory().filter((e) => e.batchId !== batchId);
    window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignoruj */ }
};

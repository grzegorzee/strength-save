import {
  PALETTE_THEMES,
  normalizePaletteThemeV2,
  type PaletteThemeV2,
} from '@/lib/palette-theme';

const STORAGE_KEY = 'ss-palette-preference-outbox-v1';

export interface PalettePreferenceOutboxEntry {
  version: 1;
  uid: string;
  clientMutationId: string;
  queuedAt: number;
  palette: PaletteThemeV2;
}

// Type alias (nie interface): alias ma niejawną sygnaturę indeksu, więc patch
// przechodzi do updateDoc (UpdateData wymaga indeksu `${string}.${string}`).
export type PalettePreferencePatch = {
  'preferences.accentColor': string;
  'preferences.paletteTheme': PaletteThemeV2;
};

type PalettePreferenceWriter = (patch: PalettePreferencePatch) => Promise<unknown>;
type FlushResult = 'none' | 'pending' | 'synced';

const inFlight = new Map<string, Promise<FlushResult>>();

const canonicalPreset = (value: unknown): PaletteThemeV2 | null => {
  const normalized = normalizePaletteThemeV2(value);
  if (!normalized || normalized.source !== 'preset') return null;
  return PALETTE_THEMES.some((preset) => preset.id === normalized.id) ? normalized : null;
};

const mutationId = (): string => {
  try {
    if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* testowy/stary WebView bez randomUUID */ }
  return `palette-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const parseStoredEntry = (): PalettePreferenceOutboxEntry | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PalettePreferenceOutboxEntry>;
    const palette = canonicalPreset(parsed.palette);
    if (parsed.version !== 1
      || typeof parsed.uid !== 'string'
      || !parsed.uid.trim()
      || typeof parsed.clientMutationId !== 'string'
      || !parsed.clientMutationId
      || typeof parsed.queuedAt !== 'number'
      || !Number.isFinite(parsed.queuedAt)
      || !palette) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { ...parsed, uid: parsed.uid.trim(), palette } as PalettePreferenceOutboxEntry;
  } catch {
    return null;
  }
};

export const readPalettePreferenceOutbox = (uid: string): PalettePreferenceOutboxEntry | null => {
  const entry = parseStoredEntry();
  return entry?.uid === uid.trim() ? entry : null;
};

export const enqueuePresetPalettePreference = (
  uid: string,
  value: PaletteThemeV2,
): PalettePreferenceOutboxEntry | null => {
  const normalizedUid = uid.trim();
  const palette = canonicalPreset(value);
  if (!normalizedUid || !palette) return null;
  const entry: PalettePreferenceOutboxEntry = {
    version: 1,
    uid: normalizedUid,
    clientMutationId: mutationId(),
    queuedAt: Date.now(),
    palette,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    return entry;
  } catch {
    return null;
  }
};

export const discardPalettePreferenceOutbox = (uid: string): void => {
  const current = readPalettePreferenceOutbox(uid);
  if (!current) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* cache niedostępny — nie blokuj świadomego wyboru legacy */ }
};

const clearIfCurrent = (entry: PalettePreferenceOutboxEntry): void => {
  try {
    const current = parseStoredEntry();
    if (current?.uid === entry.uid && current.clientMutationId === entry.clientMutationId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* udany mirror pozostaje idempotentny nawet bez dostępu do cache */ }
};

export const flushPalettePreferenceOutbox = (
  uid: string,
  writer: PalettePreferenceWriter,
): Promise<FlushResult> => {
  const normalizedUid = uid.trim();
  const existing = inFlight.get(normalizedUid);
  if (existing) return existing;
  const entry = readPalettePreferenceOutbox(normalizedUid);
  if (!entry) return Promise.resolve('none');

  const operation = (async (): Promise<FlushResult> => {
    let result: FlushResult = 'pending';
    try {
      await writer({
        'preferences.accentColor': entry.palette.primary,
        'preferences.paletteTheme': entry.palette,
      });
      clearIfCurrent(entry);
      result = 'synced';
    } catch {
      result = 'pending';
    } finally {
      inFlight.delete(normalizedUid);
    }
    // Jeżeli user wybrał kolejny preset podczas trwającego zapisu, pierwszy
    // request nie może pozostawić nowszego wyboru bez retry. Ten sam writer i
    // kanoniczny payload sprawiają, że operacja pozostaje idempotentna.
    if (result === 'synced' && readPalettePreferenceOutbox(normalizedUid)) {
      return flushPalettePreferenceOutbox(normalizedUid, writer);
    }
    return result;
  })();
  inFlight.set(normalizedUid, operation);
  return operation;
};

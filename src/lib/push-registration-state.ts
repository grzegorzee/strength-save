// Z212: deduplikacja rejestracji push. Lokalnie trzymamy hash tokenu (nigdy surowy
// token), uid i czas potwierdzenia przez backend. registerPushToken wołamy tylko
// gdy token/uid się zmienił albo potwierdzenie ma ponad 30 dni — wcześniej każdy
// start apki robił zbędny callable. Refresh z NOWYM tokenem ma inny hash, więc
// rejestruje się natychmiast; logout czyści stan poprzedniego uid.

const STORAGE_KEY = 'strength-save:push-registration-v1';
const MAX_CONFIRMATION_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface PushRegistrationState {
  tokenHash: string;
  uid: string;
  confirmedAt: number;
}

interface StateStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const defaultStore = (): StateStore => localStorage;

/** SHA-256 hex; fallback FNV-1a gdy WebCrypto niedostępne (stare WebView). */
export const hashPushToken = async (token: string): Promise<string> => {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0x811c9dc5;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv-${hash.toString(16)}-${token.length}`;
  }
};

export const shouldRegisterPushToken = (
  state: PushRegistrationState | null,
  tokenHash: string,
  uid: string,
  now: number,
  maxAgeMs: number = MAX_CONFIRMATION_AGE_MS,
): boolean => {
  if (!state) return true;
  if (state.tokenHash !== tokenHash || state.uid !== uid) return true;
  return now - state.confirmedAt >= maxAgeMs;
};

export const readPushRegistrationState = (store: StateStore = defaultStore()): PushRegistrationState | null => {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PushRegistrationState> | null;
    if (
      typeof parsed?.tokenHash === 'string'
      && typeof parsed.uid === 'string'
      && typeof parsed.confirmedAt === 'number'
    ) {
      return { tokenHash: parsed.tokenHash, uid: parsed.uid, confirmedAt: parsed.confirmedAt };
    }
    return null;
  } catch {
    return null;
  }
};

export const markPushTokenConfirmed = (
  tokenHash: string,
  uid: string,
  now: number,
  store: StateStore = defaultStore(),
): void => {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ tokenHash, uid, confirmedAt: now }));
  } catch {
    // brak miejsca/przywatny tryb — najwyżej zarejestrujemy ponownie
  }
};

export const clearPushRegistrationState = (store: StateStore = defaultStore()): void => {
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // jak wyżej
  }
};

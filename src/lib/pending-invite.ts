const PENDING_INVITE_KEY = "strength-save:pending-invite-code";

export const getPendingInviteCode = (): string | null => {
  try {
    const value = localStorage.getItem(PENDING_INVITE_KEY);
    return value || null;
  } catch {
    return null;
  }
};

export const readInviteCodeFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const directSearch = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
    const hashSearch = new URLSearchParams(hashQuery);
    const code = directSearch.get('invite') || hashSearch.get('invite');
    return code ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
};

export const setPendingInviteCode = (code: string | null): void => {
  try {
    if (code) {
      localStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
    } else {
      localStorage.removeItem(PENDING_INVITE_KEY);
    }
  } catch {
    // ignore
  }
};

export const consumePendingInviteCode = (): string | null => {
  const code = getPendingInviteCode();
  setPendingInviteCode(null);
  return code;
};

// Bug 33 (X30): klasyfikacja porażki redeemInvite. Kody permanentne (zły,
// nieaktywny lub przypisany do innego maila kod) czyszczą pending code —
// retry nic nie da. Reszta (timeout, brak sieci, internal) zostawia kod
// w localStorage, żeby ponowny sync (event 'online', następny start, ponowne
// kliknięcie linka) dokończył przypisanie. Wygasłe zaproszenie przychodzi
// jako deadline-exceeded (tu: przejściowe), ale serwer oznacza je wtedy
// status='expired', więc kolejna próba dostaje failed-precondition i kod
// czyści się przy następnym syncu.
const PERMANENT_INVITE_REDEEM_CODES = new Set([
  'not-found',
  'failed-precondition',
  'permission-denied',
  'invalid-argument',
  'already-exists',
]);

export const isPermanentInviteRedeemError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== 'string') return false;
  // Web SDK: 'functions/not-found'; natywny CallableProtocolError: 'not-found'.
  return PERMANENT_INVITE_REDEEM_CODES.has(code.replace(/^functions\//, ''));
};

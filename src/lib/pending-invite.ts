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

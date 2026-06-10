const PWA_UPDATE_BLOCK_KEY = 'strength-save:pwa-update-blocked';
const PWA_UPDATE_BLOCK_EVENT = 'strength-save:pwa-update-blocked';
const PWA_RELOAD_PENDING_KEY = 'strength-save:pwa-reload-pending';
const PWA_RELOAD_PENDING_EVENT = 'strength-save:pwa-reload-pending';

export type GuardedReloadReason = 'chunk' | 'service-worker';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const isPwaUpdateBlocked = (): boolean => {
  if (!canUseStorage()) return false;

  try {
    return window.localStorage.getItem(PWA_UPDATE_BLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

export const setPwaUpdateBlocked = (blocked: boolean): void => {
  if (!canUseStorage()) return;

  try {
    if (blocked) {
      window.localStorage.setItem(PWA_UPDATE_BLOCK_KEY, '1');
    } else {
      window.localStorage.removeItem(PWA_UPDATE_BLOCK_KEY);
    }
  } catch {
    // Best effort only.
  }

  window.dispatchEvent(new CustomEvent<boolean>(PWA_UPDATE_BLOCK_EVENT, { detail: blocked }));
};

export const hasPendingGuardedReload = (): boolean => {
  if (!canUseStorage()) return false;

  try {
    return window.localStorage.getItem(PWA_RELOAD_PENDING_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearPendingGuardedReload = (): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(PWA_RELOAD_PENDING_KEY);
  } catch {
    // Best effort only.
  }

  window.dispatchEvent(new CustomEvent<boolean>(PWA_RELOAD_PENDING_EVENT, { detail: false }));
};

export const requestGuardedReload = (reason: GuardedReloadReason): boolean => {
  if (typeof window === 'undefined') return false;

  if (isPwaUpdateBlocked()) {
    try {
      window.localStorage.setItem(PWA_RELOAD_PENDING_KEY, reason);
    } catch {
      // Best effort only. The active workout guard still prevents the reload.
    }
    window.dispatchEvent(new CustomEvent<boolean>(PWA_RELOAD_PENDING_EVENT, { detail: true }));
    return false;
  }

  clearPendingGuardedReload();
  window.location.reload();
  return true;
};

export const subscribeToPwaUpdateBlock = (listener: (blocked: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PWA_UPDATE_BLOCK_KEY) {
      listener(event.newValue === '1');
    }
  };

  const handleCustom = (event: Event) => {
    listener(Boolean((event as CustomEvent<boolean>).detail));
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(PWA_UPDATE_BLOCK_EVENT, handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PWA_UPDATE_BLOCK_EVENT, handleCustom);
  };
};

export const subscribeToPendingGuardedReload = (listener: (pending: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PWA_RELOAD_PENDING_KEY) {
      listener(event.newValue !== null);
    }
  };

  const handleCustom = (event: Event) => {
    listener(Boolean((event as CustomEvent<boolean>).detail));
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(PWA_RELOAD_PENDING_EVENT, handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PWA_RELOAD_PENDING_EVENT, handleCustom);
  };
};

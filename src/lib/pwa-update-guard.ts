const PWA_UPDATE_BLOCK_KEY = 'strength-save:pwa-update-blocked';
const PWA_UPDATE_BLOCK_EVENT = 'strength-save:pwa-update-blocked';

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

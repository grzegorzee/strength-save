const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Pozwala bramce offline uruchomić dokładny produkcyjny dist na lokalnych
 * emulatorach. Parametr URL nigdy nie przełącza backendu poza loopbackiem.
 */
export const shouldUseFirebaseEmulators = (
  compileTimeEnabled: boolean,
  hostname: string,
  search: string,
  isNativePlatform = false,
): boolean => {
  if (compileTimeEnabled) return true;
  if (isNativePlatform) return false;
  if (!LOOPBACK_HOSTS.has(hostname.toLowerCase())) return false;
  return new URLSearchParams(search).get('firebaseEmulator') === '1';
};

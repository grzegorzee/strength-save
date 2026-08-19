import { describe, expect, it } from 'vitest';
import { shouldUseFirebaseEmulators } from '@/lib/firebase-emulator-runtime';

describe('runtime Firebase emulator gate', () => {
  it('pozwala testować dokładny produkcyjny dist wyłącznie na loopback z jawną flagą', () => {
    expect(shouldUseFirebaseEmulators(false, '127.0.0.1', '?firebaseEmulator=1')).toBe(true);
    expect(shouldUseFirebaseEmulators(false, 'localhost', '?firebaseEmulator=1')).toBe(true);
    expect(shouldUseFirebaseEmulators(false, 'localhost', '?firebaseEmulator=1', true)).toBe(false);
    expect(shouldUseFirebaseEmulators(false, 'strength-save.app', '?firebaseEmulator=1')).toBe(false);
    expect(shouldUseFirebaseEmulators(false, '127.0.0.1', '')).toBe(false);
  });

  it('zachowuje dotychczasową flagę kompilacji dla e2e:emulator', () => {
    expect(shouldUseFirebaseEmulators(true, 'strength-save.app', '')).toBe(true);
  });
});

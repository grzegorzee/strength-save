import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('logout revokes paired watch access (X25/Z226-Z227, Z237)', () => {
  it('runs revoke, Watch disable and push cleanup in parallel with a timeout, all before Firebase sign-out', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAuth.ts'), 'utf8');
    const cleanup = source.indexOf('Promise.allSettled');
    const revoke = source.indexOf('revokeAllGarminDevices()');
    const watch = source.indexOf('disableAppleWatchAccess()');
    const push = source.indexOf('unregisterPushForUser()');
    const race = source.indexOf('Promise.race');
    const auth = source.indexOf('await signOut(auth)');
    // Cleanup musi być równoległy (allSettled), ograniczony czasowo (race z timeoutem)
    // i w całości PRZED signOut — po zniknięciu auth callable revoke już nie przejdzie.
    expect(cleanup).toBeGreaterThan(0);
    expect(revoke).toBeGreaterThan(cleanup);
    expect(watch).toBeGreaterThan(cleanup);
    expect(push).toBeGreaterThan(cleanup);
    expect(race).toBeGreaterThan(cleanup);
    expect(auth).toBeGreaterThan(race);
  });

  it('delete-account flow does not call a revoked-auth callable a second time', () => {
    // B1 (2026-09-29): dialog wydzielony do DeleteAccountDialog; Profil podaje
    // logoutAfterAccountDeletion jako onDeleted, a dialog woła go po callable.
    const profile = readFileSync(resolve(process.cwd(), 'src/pages/Profile.tsx'), 'utf8');
    expect(profile).toContain('onDeleted={logoutAfterAccountDeletion}');
    const dialog = readFileSync(resolve(process.cwd(), 'src/components/DeleteAccountDialog.tsx'), 'utf8');
    expect(dialog.indexOf('await onDeleted()')).toBeGreaterThan(dialog.indexOf('await deleteOwnAccount()'));
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(app).toContain('onAccountDeleted={logoutAfterAccountDeletion}');
  });
});

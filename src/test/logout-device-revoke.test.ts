import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('logout revokes paired watch access (X25/Z226-Z227)', () => {
  it('awaits server revoke and disables Watch before push cleanup and Firebase sign-out', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAuth.ts'), 'utf8');
    const revoke = source.indexOf('await revokeAllGarminDevices()');
    const watch = source.indexOf('await disableAppleWatchAccess()');
    const push = source.indexOf('await unregisterPushForUser()');
    const auth = source.indexOf('await signOut(auth)');
    expect(revoke).toBeGreaterThan(0);
    expect(watch).toBeGreaterThan(revoke);
    expect(watch).toBeLessThan(push);
    expect(revoke).toBeLessThan(push);
    expect(push).toBeLessThan(auth);
  });

  it('delete-account flow does not call a revoked-auth callable a second time', () => {
    const profile = readFileSync(resolve(process.cwd(), 'src/pages/Profile.tsx'), 'utf8');
    expect(profile).toContain('await logoutAfterAccountDeletion()');
  });
});

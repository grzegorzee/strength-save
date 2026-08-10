import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('logout revokes paired Garmin access (X25/Z226)', () => {
  it('awaits server revoke before push cleanup and Firebase sign-out', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAuth.ts'), 'utf8');
    const revoke = source.indexOf('await revokeAllGarminDevices()');
    const push = source.indexOf('await unregisterPushForUser()');
    const auth = source.indexOf('await signOut(auth)');
    expect(revoke).toBeGreaterThan(0);
    expect(revoke).toBeLessThan(push);
    expect(push).toBeLessThan(auth);
  });
});

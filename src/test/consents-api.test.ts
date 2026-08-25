import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bug 34 (X30): zapis zgód (flow pierwszego uruchomienia, dowód rozliczalności
// RODO) musi iść tą samą chronioną ścieżką co syncUserProfile: 10 s timeout na
// webie + atestacja best-effort na natywie, zamiast gołego httpsCallable.

const mocks = vi.hoisted(() => ({
  callProtectedFunction: vi.fn(async () => ({ ok: true, recorded: 1 })),
}));

vi.mock('@/lib/protected-callable', () => ({
  callProtectedFunction: (...args: unknown[]) => mocks.callProtectedFunction(...args as []),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

import { recordConsents } from '@/lib/consents-api';
import { CONSENT_DOC_VERSION } from '@/lib/legal-versions';

describe('recordConsents', () => {
  beforeEach(() => {
    mocks.callProtectedFunction.mockClear();
  });

  it('idzie przez callProtectedFunction z docVersion z legal-versions i kanałem web', async () => {
    await recordConsents([
      { type: 'health', action: 'withdrawn', statementText: 'Wycofuję zgodę.' },
    ], 'pl');

    expect(mocks.callProtectedFunction).toHaveBeenCalledTimes(1);
    const [functionName, payload] = mocks.callProtectedFunction.mock.calls[0] as unknown as [string, {
      entries: Array<Record<string, unknown>>;
      channel: string;
    }];
    expect(functionName).toBe('recordConsent');
    expect(payload.channel).toBe('web');
    expect(payload.entries).toEqual([
      expect.objectContaining({
        type: 'health',
        action: 'withdrawn',
        docVersion: CONSENT_DOC_VERSION.health,
        lang: 'pl',
        statementText: 'Wycofuję zgodę.',
      }),
    ]);
  });

  it('puste entries nie wywołują callable', async () => {
    await recordConsents([], 'pl');
    expect(mocks.callProtectedFunction).not.toHaveBeenCalled();
  });
});

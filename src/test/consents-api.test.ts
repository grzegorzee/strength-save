import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bug 34 (X30): zapis zgód (flow pierwszego uruchomienia, dowód rozliczalności
// RODO) musi iść tą samą chronioną ścieżką co syncUserProfile: 10 s timeout na
// webie + atestacja best-effort na natywie, zamiast gołego httpsCallable.

const mocks = vi.hoisted(() => ({
  callProtectedFunction: vi.fn(),
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
    mocks.callProtectedFunction.mockReset();
    mocks.callProtectedFunction.mockResolvedValue({
      ok: true,
      recorded: 1,
      mirror: {
        healthGranted: false,
        healthVersion: CONSENT_DOC_VERSION.health,
        healthEpoch: 4,
        healthGrantId: null,
      },
    });
  });

  it('idzie przez callProtectedFunction z docVersion z legal-versions i kanałem web', async () => {
    const mirror = await recordConsents([
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
    expect(mirror).toEqual({
      healthGranted: false,
      healthVersion: CONSENT_DOC_VERSION.health,
      healthEpoch: 4,
      healthGrantId: null,
    });
  });

  it('odrzuca health mirror bez monotonicznej epoki i fence grantu', async () => {
    mocks.callProtectedFunction.mockResolvedValueOnce({
      ok: true,
      recorded: 1,
      mirror: { healthGranted: true, healthVersion: CONSENT_DOC_VERSION.health },
    });

    await expect(recordConsents([
      { type: 'health', action: 'granted', statementText: 'Wyrażam zgodę.' },
    ], 'pl')).rejects.toThrow(/mirror/i);
  });

  it('odrzuca health mirror z epoką poza bezpiecznym zakresem liczb', async () => {
    mocks.callProtectedFunction.mockResolvedValueOnce({
      ok: true,
      recorded: 1,
      mirror: {
        healthGranted: true,
        healthVersion: CONSENT_DOC_VERSION.health,
        healthEpoch: Number.MAX_SAFE_INTEGER + 1,
        healthGrantId: 'grant-too-large',
      },
    });

    await expect(recordConsents([
      { type: 'health', action: 'granted', statementText: 'Wyrażam zgodę.' },
    ], 'pl')).rejects.toThrow(/mirror/i);
  });

  it('odrzuca odpowiedź bez mirrora zamiast uznać niepotwierdzony zapis za sukces', async () => {
    mocks.callProtectedFunction.mockResolvedValueOnce({ ok: true, recorded: 1 });

    await expect(recordConsents([
      { type: 'health', action: 'granted', statementText: 'Wyrażam zgodę.' },
    ], 'pl')).rejects.toThrow(/consent confirmation/i);
  });

  it('odrzuca mirror niezgodny z wysłaną decyzją (fail-closed)', async () => {
    mocks.callProtectedFunction.mockResolvedValueOnce({
      ok: true,
      recorded: 1,
      mirror: {
        healthGranted: false,
        healthVersion: CONSENT_DOC_VERSION.health,
        healthEpoch: 4,
        healthGrantId: null,
      },
    });

    await expect(recordConsents([
      { type: 'health', action: 'granted', statementText: 'Wyrażam zgodę.' },
    ], 'pl')).rejects.toThrow(/mirror/i);
  });

  it('puste entries nie wywołują callable', async () => {
    await recordConsents([], 'pl');
    expect(mocks.callProtectedFunction).not.toHaveBeenCalled();
  });
});

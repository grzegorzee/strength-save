import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'account-a' } },
  ready: Promise.resolve(),
  send: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@/lib/firebase', () => ({
  auth: state.auth, functions: {}, get appCheckReady() { return state.ready; },
}));
vi.mock('firebase/functions', () => ({ httpsCallable: () => state.send }));

import { recordConsents } from '@/lib/consents-api';
import { CONSENT_DOC_VERSION } from '@/lib/legal-versions';

const entries = [{ type: 'terms' as const, action: 'granted' as const, statementText: 'Accepted terms.' }];
const response = () => ({ data: { ok: true, recorded: 1, mirror: { termsVersion: CONSENT_DOC_VERSION.terms } } });

beforeEach(() => {
  state.auth.currentUser = { uid: 'account-a' };
  state.ready = Promise.resolve();
  state.send.mockReset().mockResolvedValue(response());
});

it('cannot dispatch account A consent after App Check finishes under account B', async () => {
  let release: () => void = () => undefined;
  state.ready = new Promise<void>(resolve => { release = resolve; });
  const operation = recordConsents(entries, 'en');
  state.auth.currentUser = { uid: 'account-b' };
  release();
  await expect(operation).rejects.toThrow('CALLABLE_ACCOUNT_CHANGED');
  expect(state.send).not.toHaveBeenCalled();
});

it('does not deliver account A confirmation to a caller after auth has changed', async () => {
  let release: (value: ReturnType<typeof response>) => void = () => undefined;
  state.send.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  const operation = recordConsents(entries, 'en');
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledOnce());
  state.auth.currentUser = { uid: 'account-b' };
  release(response());
  await expect(operation).rejects.toThrow('CALLABLE_ACCOUNT_CHANGED');
});

it('includes the account that made the choice when auth remains stable', async () => {
  await expect(recordConsents(entries, 'en')).resolves.toMatchObject({ termsVersion: CONSENT_DOC_VERSION.terms });
  expect(state.send).toHaveBeenCalledWith(expect.objectContaining({ expectedOwnerUid: 'account-a' }));
});

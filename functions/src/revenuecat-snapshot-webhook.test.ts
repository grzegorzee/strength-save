import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ user: {} as Record<string, unknown>, read: vi.fn(), writes: vi.fn() }));
vi.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: unknown, callback: unknown) => callback }));
vi.mock('firebase-functions/params', () => ({ defineSecret: (name: string) => ({ value: () => name === 'REVENUECAT_WEBHOOK_AUTH' ? 'test-auth' : 'sk_mock' }) }));
vi.mock('./revenuecat-transfer', async importOriginal => ({ ...await importOriginal<typeof import('./revenuecat-transfer')>(), readRevenueCatSubscription: fixture.read }));
vi.mock('firebase-admin', () => ({ firestore: () => ({
  collection: () => ({ doc: () => ({ id: 'synthetic-user' }) }),
  runTransaction: async (callback: (tx: unknown) => unknown) => callback({
    get: async () => ({ exists: true, data: () => fixture.user }),
    set: (_ref: unknown, write: Record<string, unknown>) => { fixture.writes(write); Object.assign(fixture.user, write); },
  }),
}) }));
import { revenuecatWebhook } from './revenuecat';

const apple = { tier: 'yearly', status: 'active', expiresAt: '2099-01-01T00:00:00.000Z', startedAt: null, productId: 'apple_yearly', store: 'APP_STORE', eventId: 'apple-renewal', eventTimestamp: 1_000 };
const expired = { tier: 'none', status: 'expired', expiresAt: null, startedAt: null, productId: null, willRenew: false };
async function deliver(type: string, overrides: Record<string, unknown> = {}) {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
  await revenuecatWebhook({ method: 'POST', headers: { authorization: 'test-auth' }, body: { event: {
    id: 'google-event', type, app_user_id: 'synthetic-user', store: 'PLAY_STORE', product_id: 'google_monthly',
    entitlement_ids: ['pro'], event_timestamp_ms: 2_000, expiration_at_ms: 3_000, ...overrides,
  } } } as never, response as never);
  return response;
}

describe('webhook reconciles account entitlement instead of a single store event', () => {
  beforeEach(() => {
    fixture.user = { subscription: { ...apple } };
    fixture.writes.mockReset();
    fixture.read.mockReset().mockImplementation(async (_uid, _key, event) => ({ ...apple, eventId: event.id, eventTimestamp: event.event_timestamp_ms }));
  });

  it('an Android expiration cannot revoke an active Apple PRO subscription', async () => {
    const response = await deliver('EXPIRATION');
    expect(fixture.read).toHaveBeenCalledWith('synthetic-user', 'sk_mock', expect.objectContaining({ type: 'EXPIRATION' }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(fixture.user.subscription).toMatchObject({ tier: 'yearly', status: 'active', productId: 'apple_yearly' });
  });

  it('a purchased unrelated product cannot grant PRO when the authoritative snapshot has no PRO', async () => {
    fixture.read.mockResolvedValue({ ...expired, eventId: 'google-event', eventTimestamp: 2_000 });
    await deliver('INITIAL_PURCHASE', { entitlement_ids: ['other'], product_id: 'other_yearly', expiration_at_ms: Date.parse('2099-01-01') });
    expect(fixture.user.subscription).toMatchObject({ tier: 'none', status: 'expired' });
  });

  it('API failure retains the last entitlement and responds 503 for retry', async () => {
    fixture.read.mockRejectedValue(new Error('REVENUECAT_HTTP_503'));
    const response = await deliver('EXPIRATION');
    expect(response.status).toHaveBeenCalledWith(503);
    expect(fixture.writes).not.toHaveBeenCalled();
    expect(fixture.user.subscription).toEqual(apple);
  });

  it('cancellation retains confirmed paid time and renewal preference', async () => {
    fixture.read.mockResolvedValue({ ...apple, willRenew: false, eventId: 'google-event', eventTimestamp: 2_000 });
    await deliver('CANCELLATION');
    expect(fixture.user.subscription).toMatchObject({ status: 'active', expiresAt: apple.expiresAt, willRenew: false });
  });

  it.each(['SUBSCRIPTION_PAUSED', 'BILLING_ISSUE'])('%s trusts access from RC, including hold without entitlement', async type => {
    fixture.read.mockResolvedValue({ ...expired, eventId: 'google-event', eventTimestamp: 2_000 });
    await deliver(type);
    expect(fixture.user.subscription).toMatchObject({ tier: 'none', status: 'expired' });
  });

  it('preserves comp and writes the reconciled store state under the grant', async () => {
    fixture.user = { subscription: { tier: 'comp', status: 'active' } };
    await deliver('EXPIRATION');
    expect(fixture.user.subscription).toEqual({ tier: 'comp', status: 'active' });
    expect(fixture.user.storeSubscription).toMatchObject({ tier: 'yearly', status: 'active', productId: 'apple_yearly' });
  });

  it('a late old snapshot cannot overwrite a newer committed event and duplicate delivery is harmless', async () => {
    fixture.user = { subscription: { ...apple, eventTimestamp: 3_000 } };
    fixture.read.mockResolvedValue({ ...expired, eventId: 'google-event', eventTimestamp: 2_000 });
    await deliver('EXPIRATION');
    expect(fixture.writes).not.toHaveBeenCalled();
    fixture.user = { subscription: { ...apple, eventId: 'google-event' } };
    await deliver('EXPIRATION');
    expect(fixture.writes).not.toHaveBeenCalled();
  });
  it('an older API read resolving after a newer webhook cannot resurrect expired access', async () => {
    let finishOld!: (value: unknown) => void;
    fixture.read.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const old = deliver('RENEWAL', { id: 'old', event_timestamp_ms: 2_000 });
    await vi.waitFor(() => expect(fixture.read).toHaveBeenCalledOnce());
    fixture.read.mockResolvedValueOnce({ ...expired, eventId: 'new', eventTimestamp: 3_000 });
    await deliver('EXPIRATION', { id: 'new', event_timestamp_ms: 3_000 });
    finishOld({ ...apple, eventId: 'old', eventTimestamp: 2_000 });
    await old;
    expect(fixture.user.subscription).toMatchObject({ tier: 'none', status: 'expired', eventId: 'new' });
    expect(fixture.writes).toHaveBeenCalledOnce();
  });
});

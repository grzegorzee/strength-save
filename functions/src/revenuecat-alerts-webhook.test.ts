import { beforeEach, describe, expect, it, vi } from 'vitest';

// Powiadomienia właściciela z webhooka (2026-09-30): wysyłka PO udanym zapisie
// subskrypcji, błąd powiadomienia nigdy nie zmienia odpowiedzi dla RevenueCat
// (200 + zapis), a ścieżki 5xx (RC ponowi) nie powiadamiają.

const fixture = vi.hoisted(() => ({
  user: {} as Record<string, unknown> | null,
  read: vi.fn(),
  writes: vi.fn(),
  notify: vi.fn(),
  order: [] as string[],
}));
vi.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: unknown, callback: unknown) => callback }));
vi.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ value: () => name === 'REVENUECAT_WEBHOOK_AUTH' ? 'test-auth' : 'sk_mock' }),
  defineString: () => ({ value: () => '' }),
}));
vi.mock('./revenuecat-transfer', async importOriginal => ({ ...await importOriginal<typeof import('./revenuecat-transfer')>(), readRevenueCatSubscription: fixture.read }));
vi.mock('./subscription-alerts', async importOriginal => ({ ...await importOriginal<typeof import('./subscription-alerts')>(), notifySubscriptionEvent: fixture.notify }));
vi.mock('firebase-admin', () => ({ firestore: () => ({
  collection: () => ({ doc: () => ({ id: 'synthetic-user' }) }),
  runTransaction: async (callback: (tx: unknown) => unknown) => callback({
    get: async () => ({ exists: fixture.user !== null, data: () => fixture.user ?? undefined }),
    set: (_ref: unknown, write: Record<string, unknown>) => { fixture.order.push('write'); fixture.writes(write); Object.assign(fixture.user!, write); },
  }),
}) }));
import { revenuecatWebhook } from './revenuecat';

const active = { tier: 'yearly', status: 'active', expiresAt: '2099-01-01T00:00:00.000Z', startedAt: null, productId: 'strengthsave_pro_yearly', store: 'APP_STORE', environment: 'PRODUCTION', willRenew: true };
async function deliver(overrides: Record<string, unknown> = {}) {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
  await revenuecatWebhook({ method: 'POST', headers: { authorization: 'test-auth' }, body: { event: {
    id: 'evt-alert', type: 'INITIAL_PURCHASE', period_type: 'NORMAL', environment: 'PRODUCTION', app_user_id: 'synthetic-user',
    store: 'APP_STORE', product_id: 'strengthsave_pro_yearly', event_timestamp_ms: 2_000, ...overrides,
  } } } as never, response as never);
  return response;
}

describe('webhook -> powiadomienie właściciela', () => {
  beforeEach(() => {
    fixture.user = {};
    fixture.order = [];
    fixture.writes.mockReset();
    fixture.notify.mockReset().mockImplementation(async () => { fixture.order.push('notify'); });
    fixture.read.mockReset().mockImplementation(async (_uid, _key, event) => ({ ...active, eventId: event.id, eventTimestamp: event.event_timestamp_ms }));
  });

  it('powiadamia po udanym zapisie subskrypcji, przed odpowiedzią 200', async () => {
    const response = await deliver();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(fixture.order).toEqual(['write', 'notify']);
    expect(fixture.notify).toHaveBeenCalledWith(expect.objectContaining({ id: 'evt-alert', type: 'INITIAL_PURCHASE' }), 'synthetic-user');
  });

  it('błąd powiadomienia (SES/FCM) nie psuje odpowiedzi: 200 i zapis zostaje', async () => {
    fixture.notify.mockRejectedValue(new Error('SES down'));
    const response = await deliver();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
    expect(fixture.user).toMatchObject({ subscription: expect.objectContaining({ tier: 'yearly', status: 'active' }) });
  });

  it('retry RC tego samego eventu (duplikat w users/{uid}) trafia do dedupu per event id', async () => {
    fixture.user = { subscription: { ...active, eventId: 'evt-alert', eventTimestamp: 2_000 } };
    const response = await deliver();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(fixture.writes).not.toHaveBeenCalled();
    expect(fixture.notify).toHaveBeenCalledTimes(1);
  });

  it('awaria API RC (503, RC ponowi) nie powiadamia', async () => {
    fixture.read.mockRejectedValue(new Error('REVENUECAT_HTTP_503'));
    const response = await deliver();
    expect(response.status).toHaveBeenCalledWith(503);
    expect(fixture.notify).not.toHaveBeenCalled();
  });

  it('brak dokumentu usera przy aktywnym zakupie (503, RC ponowi) nie powiadamia', async () => {
    fixture.user = null;
    const response = await deliver();
    expect(response.status).toHaveBeenCalledWith(503);
    expect(fixture.notify).not.toHaveBeenCalled();
  });

  it('zdarzenia techniczne nie powiadamiają', async () => {
    await deliver({ type: 'TEST' });
    expect(fixture.notify).not.toHaveBeenCalled();
  });
});

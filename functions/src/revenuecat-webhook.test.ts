import { describe, expect, it, vi } from 'vitest';

const read = vi.hoisted(() => vi.fn().mockRejectedValue(new Error('REVENUECAT_HTTP_503')));
vi.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: unknown, callback: unknown) => callback }));
vi.mock('firebase-functions/params', () => ({ defineSecret: (name: string) => ({ value: () => name === 'REVENUECAT_WEBHOOK_AUTH' ? 'test-auth' : 'sk_mock' }) }));
vi.mock('./revenuecat-transfer', async importOriginal => ({ ...await importOriginal<typeof import('./revenuecat-transfer')>(), readRevenueCatSubscription: read }));
import { revenuecatWebhook } from './revenuecat';

describe('transfer webhook delivery semantics', () => {
  it('real transfer API failure gets 503 for retry, never no-uid 200', async () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    await revenuecatWebhook({ method: 'POST', headers: { authorization: 'test-auth' }, body: { event: {
      type: 'TRANSFER', id: 'transfer-1', transferred_from: ['user-a'], transferred_to: ['user-b'],
    } } } as never, response as never);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ ok: false, retry: 'transfer-reconciliation' });
  });
});

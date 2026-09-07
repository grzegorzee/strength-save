import { describe, expect, it, vi } from 'vitest';
import { readRevenueCatSubscription, reconcileRevenueCatTransfer, resolveTransferUids } from './revenuecat-transfer';

describe('authoritative RevenueCat transfer', () => {
  const event = { transferred_from: ['user-a', '$RCAnonymousID:a'], transferred_to: ['user-b'] };
  it('handles the real transfer payload for both Firebase owners', () => {
    expect(resolveTransferUids(event)).toEqual(['user-a', 'user-b']);
  });
  it('fails for retry without writing a guessed entitlement when an API read fails', async () => {
    const write = vi.fn();
    await expect(reconcileRevenueCatTransfer(event, { read: vi.fn().mockRejectedValue(new Error('HTTP_503')), write })).rejects.toThrow('HTTP_503');
    expect(write).not.toHaveBeenCalled();
  });
  it('reads current PRO and product through the v2 schema, never transfers stale A fields to B', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ items: [{ id: 'pro-id', lookup_key: 'pro' }] }))
      .mockResolvedValueOnce(Response.json({ items: [{ entitlement_id: 'pro-id', expires_at: Date.parse('2099-01-01') }] }))
      .mockResolvedValueOnce(Response.json({ items: [{ gives_access: true, product_id: 'product-id', entitlements: { items: [{ id: 'pro-id' }] }, status: 'active', auto_renewal_status: 'will_not_renew' }] }))
      .mockResolvedValueOnce(Response.json({ store_identifier: 'strengthsave_pro_yearly' }));
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', { id: 'transfer', event_timestamp_ms: 100 }, fetcher)).toMatchObject({
      tier: 'yearly', status: 'active', expiresAt: '2099-01-01T00:00:00.000Z', willRenew: false, eventId: 'transfer',
    });
    expect(fetcher.mock.calls[1][0]).toContain('/customers/user-b/active_entitlements');
  });
  it('non-success API response cannot be interpreted as lost PRO', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    await expect(readRevenueCatSubscription('user-b', 'sk_mock', {}, fetcher)).rejects.toThrow('REVENUECAT_HTTP_429');
  });
  it('never sends its secret to an external pagination origin', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [], next_page: 'https://attacker.example/steal' }));
    await expect(readRevenueCatSubscription('user-b', 'sk_mock', {}, fetcher)).rejects.toThrow('INVALID_RC_PAGINATION');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { readRevenueCatSubscription, reconcileRevenueCatTransfer, resolveTransferUids } from './revenuecat-transfer';

function snapshotFetcher(pro: boolean, subscriptions: Array<Record<string, unknown>>, expiry = Date.parse('2099-01-01')) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/active_entitlements')) return Response.json({ items: pro ? [{ entitlement_id: 'pro-id', expires_at: expiry }] : [] });
    if (url.pathname.endsWith('/subscriptions')) return Response.json({ items: subscriptions.filter(sub => sub.environment === url.searchParams.get('environment')) });
    if (url.pathname.includes('/products/')) return Response.json({ store_identifier: url.pathname.endsWith('apple') ? 'apple_yearly' : 'google_monthly:monthly' });
    return Response.json({ items: [{ id: 'pro-id', lookup_key: 'pro' }] });
  });
}
const proSubscription = { gives_access: true, product_id: 'apple', status: 'active', environment: 'production', store: 'app_store', current_period_ends_at: Date.parse('2099-01-01'), entitlements: { items: [{ id: 'pro-id' }] } };

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
      .mockResolvedValueOnce(Response.json({ items: [] }))
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
  it('a TRANSFER without environment still resolves a sandbox-only trial', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/active_entitlements')) return Response.json({ items: [{ entitlement_id: 'pro-id', expires_at: Date.parse('2099-01-01') }] });
      if (url.includes('/subscriptions?')) return Response.json({ items: url.includes('environment=sandbox') ? [{
        gives_access: true, product_id: 'google-product', status: 'trialing', environment: 'sandbox', store: 'play_store',
        current_period_ends_at: Date.parse('2099-01-01'), entitlements: { items: [{ id: 'pro-id' }] }, auto_renewal_status: 'will_renew',
      }] : [] });
      if (url.includes('/products/')) return Response.json({ store_identifier: 'strengthsave_pro_monthly:monthly' });
      return Response.json({ items: [{ id: 'pro-id', lookup_key: 'pro' }] });
    });
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', {}, fetcher)).toMatchObject({
      tier: 'trial', status: 'active', store: 'PLAY_STORE', environment: 'SANDBOX',
    });
  });
  it('a sandbox Android expiration still resolves paid Apple access in production', async () => {
    const fetcher = snapshotFetcher(true, [proSubscription, { ...proSubscription, product_id: 'google', gives_access: false, environment: 'sandbox', store: 'play_store', status: 'expired' }]);
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', { environment: 'SANDBOX' }, fetcher)).toMatchObject({
      status: 'active', productId: 'apple_yearly', environment: 'PRODUCTION', store: 'APP_STORE',
    });
  });
  it('inconsistent new-purchase snapshots fail for retry instead of revoking PRO', async () => {
    await expect(readRevenueCatSubscription('user-b', 'sk_mock', {}, snapshotFetcher(false, [proSubscription]))).rejects.toThrow('RC_SUBSCRIPTION_NOT_READY');
    await expect(readRevenueCatSubscription('user-b', 'sk_mock', {}, snapshotFetcher(true, []))).rejects.toThrow('RC_SUBSCRIPTION_NOT_READY');
  });
  it('an unrelated active product does not grant the configured PRO entitlement', async () => {
    const unrelated = { ...proSubscription, entitlements: { items: [{ id: 'other-id' }] } };
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', {}, snapshotFetcher(false, [unrelated]))).toMatchObject({ tier: 'none', status: 'expired' });
  });
  it('grace uses the authoritative entitlement expiry, while account hold has no access', async () => {
    const grace = { ...proSubscription, status: 'in_grace_period', current_period_ends_at: 1_000 };
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', {}, snapshotFetcher(true, [grace]))).toMatchObject({ status: 'billing_issue', expiresAt: '2099-01-01T00:00:00.000Z' });
    const hold = { ...proSubscription, status: 'in_billing_retry', gives_access: false };
    expect(await readRevenueCatSubscription('user-b', 'sk_mock', {}, snapshotFetcher(false, [hold]))).toMatchObject({ status: 'expired', tier: 'none' });
  });
});

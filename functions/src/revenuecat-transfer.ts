import type { SubscriptionWrite } from './revenuecat';

export const REVENUECAT_PROJECT_ID = 'proj67cb081f';
const API_ORIGIN = 'https://api.revenuecat.com';
type ObjectData = Record<string, unknown>;
const object = (value: unknown): ObjectData => value && typeof value === 'object' && !Array.isArray(value) ? value as ObjectData : {};

export function resolveTransferUids(event: { transferred_from?: unknown; transferred_to?: unknown }): string[] {
  if (!Array.isArray(event.transferred_from) || !Array.isArray(event.transferred_to)) throw new Error('INVALID_TRANSFER');
  const ids = [...event.transferred_from, ...event.transferred_to];
  if (ids.some(id => typeof id !== 'string')) throw new Error('INVALID_TRANSFER');
  const users = [...new Set(ids.filter((id): id is string => typeof id === 'string'
    && !id.startsWith('$RCAnonymousID:') && id.length > 0 && id.length <= 128 && !id.includes('/')))];
  if (users.length > 50) throw new Error('TRANSFER_TOO_LARGE');
  return users;
}

/** Read only API v2; response bodies and customer attributes are never logged. */
export async function readRevenueCatSubscription(
  uid: string,
  key: string,
  event: { id?: string; event_timestamp_ms?: number; environment?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SubscriptionWrite> {
  if (!key.startsWith('sk_')) throw new Error('REVENUECAT_SERVER_KEY_NOT_CONFIGURED');
  const root = `/v2/projects/${REVENUECAT_PROJECT_ID}`;
  const get = async (path: string): Promise<ObjectData> => {
    const url = new URL(path, API_ORIGIN);
    if (url.origin !== API_ORIGIN || !url.pathname.startsWith(`${root}/`)) throw new Error('INVALID_RC_PAGINATION');
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`REVENUECAT_HTTP_${response.status}`);
    return object(await response.json());
  };
  const list = async (path: string): Promise<ObjectData[]> => {
    const items: ObjectData[] = [];
    let next: string | null = path;
    const visited = new Set<string>();
    while (next) {
      if (visited.has(next) || visited.size >= 50) throw new Error('INVALID_RC_PAGINATION');
      visited.add(next);
      const page = await get(next);
      if (!Array.isArray(page.items)) throw new Error('INVALID_RC_RESPONSE');
      items.push(...page.items.map(object));
      if (page.next_page != null && typeof page.next_page !== 'string') throw new Error('INVALID_RC_PAGINATION');
      next = typeof page.next_page === 'string' && page.next_page ? page.next_page : null;
    }
    return items;
  };
  const entitlements = await list(`${root}/entitlements?limit=100`);
  const proId = entitlements.find(entitlement => entitlement.lookup_key === 'pro')?.id;
  if (typeof proId !== 'string') throw new Error('REVENUECAT_PRO_NOT_CONFIGURED');
  const customerRoot = `${root}/customers/${encodeURIComponent(uid)}`;
  const active = await list(`${customerRoot}/active_entitlements?limit=100`);
  const pro = active.find(entitlement => entitlement.entitlement_id === proId);
  const now = Date.now();
  const base = {
    eventId: event.id ?? null,
    eventTimestamp: Number.isFinite(event.event_timestamp_ms) ? event.event_timestamp_ms! : now,
    updatedAt: new Date(now).toISOString(),
  };
  // TRANSFER may omit environment; a lifecycle event covers only one purchase.
  // Read both environments so sandbox/Play expiration cannot erase App Store PRO.
  const subscriptions = (await Promise.all(['production', 'sandbox'].map(async environment =>
    (await list(`${customerRoot}/subscriptions?limit=100&environment=${environment}`))
      .map((subscription): ObjectData & { environment: string } => ({ ...subscription, environment })),
  ))).flat();
  const subscription = subscriptions.filter(sub => sub.gives_access === true
    && (object(sub.entitlements).items as unknown[] | undefined)?.some(ent => object(ent).id === proId))
    .sort((a, b) => Number(b.current_period_ends_at ?? 0) - Number(a.current_period_ends_at ?? 0))[0];
  if (!pro && !subscription) return { ...base, tier: 'none', status: 'expired', expiresAt: null, startedAt: null, productId: null, willRenew: false };
  // Both API views must agree before changing access. An incomplete read must
  // retry, including a new purchase whose active entitlement is still catching up.
  if (!pro || !subscription || typeof subscription.product_id !== 'string') throw new Error('RC_SUBSCRIPTION_NOT_READY');
  if (typeof pro.expires_at !== 'number' || !Number.isFinite(pro.expires_at)) throw new Error('INVALID_RC_PRO_EXPIRY');
  const product = await get(`${root}/products/${encodeURIComponent(subscription.product_id)}`);
  if (typeof product.store_identifier !== 'string') throw new Error('INVALID_RC_PRODUCT');
  return {
    ...base,
    tier: subscription.status === 'trialing' ? 'trial' : product.store_identifier.includes('yearly') ? 'yearly' : 'monthly',
    status: subscription.status === 'in_grace_period' ? 'billing_issue' : 'active',
    startedAt: typeof subscription.current_period_starts_at === 'number' ? new Date(subscription.current_period_starts_at).toISOString() : null,
    expiresAt: new Date(pro.expires_at).toISOString(),
    productId: product.store_identifier,
    willRenew: ['will_renew', 'will_change_product', 'has_already_renewed'].includes(String(subscription.auto_renewal_status)),
    environment: subscription.environment.toUpperCase(),
    ...(typeof subscription.store === 'string' ? { store: subscription.store.toUpperCase() } : {}),
  };
}

export async function reconcileRevenueCatTransfer(
  event: { transferred_from?: unknown; transferred_to?: unknown },
  deps: { read: (uid: string) => Promise<SubscriptionWrite>; write: (uid: string, state: SubscriptionWrite) => Promise<void> },
): Promise<number> {
  const users = resolveTransferUids(event);
  // Resolve every owner before writing; HTTP/API failure is retryable, never a 200 skip.
  const states: Array<{ uid: string; state: SubscriptionWrite }> = [];
  for (const uid of users) states.push({ uid, state: await deps.read(uid) });
  for (const { uid, state } of states) await deps.write(uid, state);
  return states.length;
}

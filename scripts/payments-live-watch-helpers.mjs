// Czyste helpery scripts/payments-live-watch.mjs (testy: src/test/payments-live-watch.test.ts).
// Podgląd płatności na żywo TYLKO DO ODCZYTU: Firestore i Logging przez białą listę
// prod-read (konto agent-readonly), RevenueCat wyłącznie GET API v2 jednego klienta.

export const RC_PROJECT_ID = 'proj67cb081f';
export const MAX_RUNTIME_MS = 30 * 60_000;
export const DEFAULT_INTERVAL_MS = 10_000;
/** Budżet odczytów Firestore na całe uruchomienie (zasada 21: limit 5000). */
export const WATCH_MAX_DOCS = 5000;
/** client_errors czytamy rzadziej i z limitem, żeby 30 min zmieściło się w budżecie. */
export const ERRORS_EVERY_TICKS = 3;
export const ERRORS_LIMIT = 25;

const RC_ALLOWED = new RegExp(
  `^https://api\\.revenuecat\\.com/v2/projects/${RC_PROJECT_ID}/(products|customers/[^/?#]+(/(subscriptions|active_entitlements))?)(\\?[^#]*)?$`,
);

/** RevenueCat: wyłącznie GET na kliencie (i katalogu produktów do nazw). */
export const assertRevenueCatRead = (method, url) => {
  if (method !== 'GET' || !RC_ALLOWED.test(url)) {
    throw new Error(`payments-live-watch: żądanie RC spoza białej listy: ${method} ${url}`);
  }
};

/** Szacunek najgorszego przypadku odczytów Firestore dla danego czasu i interwału. */
export const worstCaseReads = (runtimeMs = MAX_RUNTIME_MS, intervalMs = DEFAULT_INTERVAL_MS) => {
  const ticks = Math.ceil(runtimeMs / intervalMs);
  return ticks + Math.ceil(ticks / ERRORS_EVERY_TICKS) * ERRORS_LIMIT;
};

export const parseWatchArgs = (argv) => {
  const opts = { target: null, intervalMs: DEFAULT_INTERVAL_MS, minutes: 30 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--interval') opts.intervalMs = Number(argv[++i]) * 1000;
    else if (arg === '--minutes') opts.minutes = Number(argv[++i]);
    else if (arg.startsWith('--')) throw new Error(`payments-live-watch: nieznana opcja ${arg}`);
    else opts.target = arg;
  }
  if (!opts.target) throw new Error('Użycie: node scripts/payments-live-watch.mjs <email|uid> [--interval 10] [--minutes 30]');
  if (!Number.isFinite(opts.intervalMs) || opts.intervalMs < 5000) throw new Error('payments-live-watch: --interval minimum 5 s');
  if (!Number.isFinite(opts.minutes) || opts.minutes <= 0 || opts.minutes > 30) throw new Error('payments-live-watch: --minutes w zakresie (0, 30]');
  return opts;
};

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : ms ?? null);

/** Skrót users/{uid}: to, co widzi apka (subscription) + cień sklepu pod grantem comp. */
export const summarizeUser = (doc) => {
  const pick = (sub) => (sub && typeof sub === 'object'
    ? {
      tier: sub.tier ?? null, status: sub.status ?? null, expiresAt: sub.expiresAt ?? null,
      store: sub.store ?? null, environment: sub.environment ?? null, willRenew: sub.willRenew ?? null,
      productId: sub.productId ?? null, eventId: sub.eventId ?? null,
    }
    : null);
  return { subscription: pick(doc?.subscription), storeSubscription: pick(doc?.storeSubscription) };
};

/** Skrót stanu RC: aktywne entitlementy i subskrypcje z obu środowisk. */
export const summarizeRevenueCat = ({ customer, entitlements, subscriptions, products }) => ({
  customerExists: !!customer,
  lastSeenAt: iso(customer?.last_seen_at),
  activeEntitlements: (entitlements ?? []).map((e) => ({ entitlement: e.entitlement_id, expiresAt: iso(e.expires_at) })),
  subscriptions: (subscriptions ?? []).map((s) => ({
    product: products?.[s.product_id] ?? s.product_id,
    store: s.store ?? null,
    environment: s.environment ?? null,
    status: s.status ?? null,
    givesAccess: s.gives_access ?? null,
    autoRenewal: s.auto_renewal_status ?? null,
    periodEndsAt: iso(s.current_period_ends_at),
  })),
});

/** Płaska lista zmian "ścieżka: stare → nowe" między dwoma skrótami. */
export const diffState = (before, after, prefix = '') => {
  const changes = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    const a = before?.[key];
    const b = after?.[key];
    const path = prefix ? `${prefix}.${key}` : key;
    const bothObjects = a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b);
    if (bothObjects) changes.push(...diffState(a, b, path));
    else if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ path, from: a ?? null, to: b ?? null });
  }
  return changes;
};

export const formatChange = (at, source, change) =>
  `${at}  [${source}] ${change.path}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`;

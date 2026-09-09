import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage, type SubscriptionOption } from '@revenuecat/purchases-capacitor';
import { withTimeout } from '@/lib/promise-timeout';

// RevenueCat: warstwa zakupów (iOS + Android). Web (invite-only) nie sprzedaje — wszystkie
// funkcje są no-op poza platformą natywną, więc kod wywołujący nie musi sprawdzać platformy.
// appUserID = uid Firebase, dzięki czemu webhook RC może pisać entitlement do users/{uid}.

export const PRO_ENTITLEMENT = 'pro';

const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';
const GOOGLE_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';

function storeManagementUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.origin === 'https://apps.apple.com' && url.pathname === '/account/subscriptions') return APPLE_SUBSCRIPTIONS;
    if (url.origin !== 'https://play.google.com' || url.pathname !== '/store/account/subscriptions') return null;
    const safe = new URL(GOOGLE_SUBSCRIPTIONS);
    for (const key of ['sku', 'package']) {
      const parameter = url.searchParams.get(key);
      if (parameter) safe.searchParams.set(key, parameter);
    }
    return safe.toString();
  } catch { return null; }
}

/** Store management never changes billing; RevenueCat identifies the purchased store. */
export async function getSubscriptionManagementUrl(uid: string, knownStore?: string): Promise<string> {
  const generation = identityGeneration;
  let store = knownStore;
  let managementUrl: string | null = null;
  try {
    const { customerInfo } = await withTimeout(
      readPurchasesForUser(uid, () => Purchases.getCustomerInfo()), 1500, 'Subscription management',
    );
    managementUrl = storeManagementUrl(customerInfo.managementURL);
    store = customerInfo.entitlements.active[PRO_ENTITLEMENT]?.store ?? store;
  } catch { /* Offline SDK: the current owner's server mirror still identifies the store. */ }
  if (requestedUserId !== uid || generation !== identityGeneration) throw new Error('PURCHASES_IDENTITY_CHANGED');
  if (managementUrl) return managementUrl;
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return APPLE_SUBSCRIPTIONS;
  if (store === 'PLAY_STORE') return GOOGLE_SUBSCRIPTIONS;
  return Capacitor.getPlatform() === 'android' ? GOOGLE_SUBSCRIPTIONS : APPLE_SUBSCRIPTIONS;
}

/**
 * Publiczny klucz RC per platforma sklepu. Web nigdy nie dostaje klucza (checkout tylko
 * w aplikacjach mobilnych) i nie ma fallbacku między sklepami — Android bez klucza Google
 * ma zakupy wyłączone, a nie skonfigurowane kluczem Apple (Z208).
 */
export const revenueCatApiKeyForPlatform = (
  platform: string,
  env: { VITE_REVENUECAT_APPLE_API_KEY?: string; VITE_REVENUECAT_GOOGLE_API_KEY?: string },
): string | null => {
  if (platform === 'ios') return env.VITE_REVENUECAT_APPLE_API_KEY ?? null;
  if (platform === 'android') return env.VITE_REVENUECAT_GOOGLE_API_KEY ?? null;
  return null;
};

let configured = false;
let configureInFlight: Promise<void> | null = null;
let requestedUserId: string | null | undefined;
let confirmedUserId: string | null = null;
let identityGeneration = 0;
let sdkQueue: Promise<unknown> = Promise.resolve();
const identityListeners = new Set<() => void>();
const notifyIdentity = () => identityListeners.forEach(listener => listener());

export const subscribePurchasesIdentity = (listener: () => void): (() => void) => {
  identityListeners.add(listener);
  return () => { identityListeners.delete(listener); };
};
export const purchasesIdentityVersion = (): number => identityGeneration * 2 + (confirmedUserId ? 1 : 0);
export const isPurchasesUserCurrent = (uid: string): boolean =>
  requestedUserId === uid && confirmedUserId === uid;

const enqueueSdk = <T>(operation: () => Promise<T>, waitTimeoutMs?: number): Promise<T> => {
  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const result = sdkQueue.then(() => {
    clearTimeout(timeout);
    if (expired) throw new Error('PURCHASES_BUSY_RETRY');
    return operation();
  });
  sdkQueue = result.catch(() => undefined);
  if (!waitTimeoutMs) return result;
  // Bound waiting for a previous SDK operation, never an open store sheet.
  return Promise.race([result, new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => { expired = true; reject(new Error('PURCHASES_BUSY_RETRY')); }, waitTimeoutMs);
  })]);
};

export const configurePurchases = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || configured) return;
  if (configureInFlight) return configureInFlight;
  const apiKey = revenueCatApiKeyForPlatform(Capacitor.getPlatform(), import.meta.env);
  if (!apiKey) return;
  configureInFlight = (async () => {
    try {
      await Purchases.configure({ apiKey });
      configured = true;
    } catch (error) {
      console.error('[purchases] configure failed', error);
    }
  })();
  try { await configureInFlight; } finally { configureInFlight = null; }
};

export const isPurchasesConfigured = (): boolean => configured;

const requestIdentity = (uid: string | null): void => {
  if (requestedUserId === uid) return;
  requestedUserId = uid;
  confirmedUserId = null;
  identityGeneration++;
  notifyIdentity();
};

/** Auth publishes intent synchronously; SDK mutations follow in order. */
export const logInPurchases = async (uid: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  requestIdentity(uid);
  const generation = identityGeneration;
  await enqueueSdk(async () => {
    if (generation !== identityGeneration || requestedUserId !== uid) return;
    await configurePurchases();
    if (!configured || isPurchasesUserCurrent(uid)) return;
    try {
      await Purchases.logIn({ appUserID: uid });
      if (generation === identityGeneration && requestedUserId === uid) {
        confirmedUserId = uid;
        notifyIdentity();
      }
    } catch (error) {
      console.error('[purchases] logIn failed', error);
    }
  });
};

export const logOutPurchases = async (): Promise<void> => {
  requestIdentity(null);
  await enqueueSdk(async () => {
    if (!configured) return;
    try { await Purchases.logOut(); } catch { /* Already anonymous. */ }
  });
};

/** Every read, purchase and restore is serialized with the authenticated owner. */
export const runPurchasesForUser = async <T>(uid: string, operation: () => Promise<T>): Promise<T> => {
  const generation = identityGeneration;
  if (requestedUserId === uid && !confirmedUserId) void logInPurchases(uid);
  return enqueueSdk(async () => {
    if (!isPurchasesUserCurrent(uid) || generation !== identityGeneration) {
      throw new Error('PURCHASES_IDENTITY_NOT_READY');
    }
    const result = await operation();
    if (!isPurchasesUserCurrent(uid) || generation !== identityGeneration) {
      throw new Error('PURCHASES_IDENTITY_CHANGED');
    }
    return result;
  }, 5000);
};

/** CustomerInfo is read-only and must not hold the mutation queue while offline. */
export const readPurchasesForUser = async <T>(uid: string, operation: () => Promise<T>): Promise<T> => {
  await runPurchasesForUser(uid, async () => undefined);
  const generation = identityGeneration;
  const result = await operation();
  if (!isPurchasesUserCurrent(uid) || generation !== identityGeneration) throw new Error('PURCHASES_IDENTITY_CHANGED');
  return result;
};

// === Z208: eligibility-aware paywall ===
// Trial copy pokazujemy WYŁĄCZNIE przy potwierdzonej kwalifikacji:
// iOS — checkTrialOrIntroductoryPriceEligibility (status ELIGIBLE),
// Android — faktycznie zwrócona opcja zakupu z bezpłatną fazą (freePhase).
// `unknown` i `ineligible` dostają standardowe copy bez obietnicy dni za darmo.

export type TrialStatus = 'eligible' | 'ineligible' | 'unknown';

export interface TrialInfo {
  status: TrialStatus;
  days: number | null;
}

export interface ResolvedPurchaseOption {
  pkg: PurchasesPackage;
  trial: TrialInfo;
  /** Android: konkretna opcja zakupu (free trial albo base plan). iOS/web: null. */
  subscriptionOption: SubscriptionOption | null;
}

/** RC INTRO_ELIGIBILITY_STATUS: 0 unknown, 1 ineligible, 2 eligible, 3 brak intro offer. */
type EligibilityChecker = (
  productIdentifiers: string[],
) => Promise<Record<string, { status: number }>>;

const defaultEligibilityChecker: EligibilityChecker = async (productIdentifiers) =>
  Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers });

const periodDays = (unit: string | undefined, value: number | undefined): number | null => {
  if (typeof value !== 'number' || value <= 0) return null;
  switch (unit) {
    case 'DAY': return value;
    case 'WEEK': return value * 7;
    case 'MONTH': return value * 30;
    case 'YEAR': return value * 365;
    default: return null;
  }
};

const resolveIosTrials = async (
  packages: PurchasesPackage[],
  checkEligibility: EligibilityChecker,
): Promise<ResolvedPurchaseOption[]> => {
  // Trialem jest wyłącznie darmowy intro price; płatne intro nie dostaje trial copy.
  const withTrial = packages.filter(p => p.product.introPrice && p.product.introPrice.price === 0);
  let eligibility: Record<string, { status: number }> = {};
  let checkFailed = false;
  if (withTrial.length > 0) {
    try {
      eligibility = await checkEligibility(withTrial.map(p => p.product.identifier));
    } catch {
      checkFailed = true; // offline / błąd SDK → unknown, bez trial copy
    }
  }
  return packages.map(pkg => {
    const intro = pkg.product.introPrice;
    if (!intro || intro.price !== 0) {
      return { pkg, trial: { status: 'ineligible', days: null }, subscriptionOption: null };
    }
    if (checkFailed) {
      return { pkg, trial: { status: 'unknown', days: null }, subscriptionOption: null };
    }
    const status = eligibility[pkg.product.identifier]?.status;
    if (status === 2) {
      return {
        pkg,
        trial: { status: 'eligible', days: periodDays(intro.periodUnit, intro.periodNumberOfUnits) },
        subscriptionOption: null,
      };
    }
    if (status === 1 || status === 3) {
      return { pkg, trial: { status: 'ineligible', days: null }, subscriptionOption: null };
    }
    return { pkg, trial: { status: 'unknown', days: null }, subscriptionOption: null };
  });
};

const resolveAndroidTrial = (pkg: PurchasesPackage): ResolvedPurchaseOption => {
  const options = pkg.product.subscriptionOptions;
  if (!Array.isArray(options) || options.length === 0) {
    // Play nie zwrócił opcji zakupu — nie zgadujemy eligibility z samego produktu.
    return { pkg, trial: { status: 'unknown', days: null }, subscriptionOption: null };
  }
  const free = options.find(o => o.freePhase != null);
  if (free) {
    const bp = free.freePhase?.billingPeriod;
    return {
      pkg,
      trial: { status: 'eligible', days: periodDays(bp?.unit, bp?.value) },
      subscriptionOption: free,
    };
  }
  const base = pkg.product.defaultOption ?? options.find(o => o.isBasePlan) ?? options[0] ?? null;
  return { pkg, trial: { status: 'ineligible', days: null }, subscriptionOption: base };
};

/**
 * Wzbogaca pakiety RC o potwierdzony status trialu i (na Androidzie) konkretną opcję zakupu.
 * `checkEligibility` jest wstrzykiwalne dla testów; produkcyjnie iOS pyta StoreKit przez RC.
 */
export const resolvePurchaseOptions = async (
  packages: PurchasesPackage[],
  platform: string,
  checkEligibility: EligibilityChecker = defaultEligibilityChecker,
): Promise<ResolvedPurchaseOption[]> => {
  if (platform === 'ios') return resolveIosTrials(packages, checkEligibility);
  if (platform === 'android') return packages.map(resolveAndroidTrial);
  // Web/nieznana platforma: checkout nie istnieje, żadnego trial copy.
  return packages.map(pkg => ({
    pkg,
    trial: { status: 'unknown' as const, days: null },
    subscriptionOption: null,
  }));
};

// === Z209: dynamiczna prezentacja ceny ===
// Oszczędność i cena efektywna/miesiąc zawsze z realnych cen sklepu, nigdy hardkodowane.

export interface YearlyValueSummary {
  /** Lokalizowana cena efektywna/miesiąc pakietu rocznego (albo null, gdy nie da się policzyć). */
  perMonth: string | null;
  /** Pełne procenty oszczędności względem 12x monthly; null gdy brak porównania albo brak zysku. */
  savingsPercent: number | null;
}

export const yearlyValueSummary = (
  yearly: { price: number; currencyCode: string; pricePerMonthString?: string | null } | null | undefined,
  monthly: { price: number; currencyCode: string } | null | undefined,
  locale: string,
): YearlyValueSummary => {
  if (!yearly || !(yearly.price > 0)) return { perMonth: null, savingsPercent: null };

  // Sklep zna swoje formatowanie najlepiej — preferuj pricePerMonthString z RC/StoreKit/Play.
  let perMonth: string | null = yearly.pricePerMonthString ?? null;
  if (!perMonth) {
    try {
      perMonth = new Intl.NumberFormat(locale, { style: 'currency', currency: yearly.currencyCode })
        .format(yearly.price / 12);
    } catch {
      perMonth = null; // nieznana waluta/locale — lepiej nic niż zła kwota
    }
  }

  let savingsPercent: number | null = null;
  if (monthly && monthly.price > 0 && monthly.currencyCode === yearly.currencyCode) {
    const pct = Math.round((1 - yearly.price / (12 * monthly.price)) * 100);
    if (pct > 0) savingsPercent = pct;
  }
  return { perMonth, savingsPercent };
};

/** Mapowanie statusu trialu na wariant copy: tylko `eligible` dostaje obietnicę dni za darmo. */
export const trialPresentation = (
  trial: TrialInfo,
): { line: 'trial' | 'standard'; cta: 'trial' | 'standard'; renewal: 'trial' | 'standard' } => {
  const variant = trial.status === 'eligible' && trial.days != null ? 'trial' as const : 'standard' as const;
  return { line: variant, cta: variant, renewal: variant };
};

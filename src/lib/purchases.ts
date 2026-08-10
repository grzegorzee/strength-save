import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage, type SubscriptionOption } from '@revenuecat/purchases-capacitor';

// RevenueCat: warstwa zakupów (iOS + Android). Web (invite-only) nie sprzedaje — wszystkie
// funkcje są no-op poza platformą natywną, więc kod wywołujący nie musi sprawdzać platformy.
// appUserID = uid Firebase, dzięki czemu webhook RC może pisać entitlement do users/{uid}.

export const PRO_ENTITLEMENT = 'pro';

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

export const configurePurchases = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || configured) return;
  const platform = Capacitor.getPlatform();
  const apiKey = revenueCatApiKeyForPlatform(platform, import.meta.env);
  if (!apiKey) {
    console.warn(`[purchases] Brak klucza RevenueCat dla platformy ${platform} — zakupy wyłączone.`);
    return;
  }
  try {
    await Purchases.configure({ apiKey });
    configured = true;
  } catch (error) {
    console.error('[purchases] configure failed', error);
  }
};

export const isPurchasesConfigured = (): boolean => configured;

/** Po zalogowaniu Firebase: zwiąż zakupy z uid (webhook RC → users/{uid}.subscription). */
export const logInPurchases = async (uid: string): Promise<void> => {
  if (!configured) await configurePurchases();
  if (!configured) return;
  try {
    await Purchases.logIn({ appUserID: uid });
  } catch (error) {
    console.error('[purchases] logIn failed', error);
  }
};

/** Po wylogowaniu Firebase: wróć do anonimowego appUserID. */
export const logOutPurchases = async (): Promise<void> => {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut rzuca gdy user już anonimowy — ignorujemy.
  }
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

/** Mapowanie statusu trialu na wariant copy: tylko `eligible` dostaje obietnicę dni za darmo. */
export const trialPresentation = (
  trial: TrialInfo,
): { line: 'trial' | 'standard'; cta: 'trial' | 'standard'; renewal: 'trial' | 'standard' } => {
  const variant = trial.status === 'eligible' && trial.days != null ? 'trial' as const : 'standard' as const;
  return { line: variant, cta: variant, renewal: variant };
};

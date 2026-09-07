import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { useCurrentUser } from '@/contexts/UserContext';
import { PRO_ENTITLEMENT, readPurchasesForUser, subscribePurchasesIdentity, purchasesIdentityVersion } from '@/lib/purchases';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { isSubscriptionActive, type SubscriptionState, type SubscriptionTier } from '@/lib/user-profile';
import { withTimeout } from '@/lib/promise-timeout';

const REVENUECAT_BOOT_TIMEOUT_MS = 1500;

// Źródła prawdy o PRO (w kolejności):
// 1. admin — pełny dostęp zawsze,
// 2. Firestore users/{uid}.subscription — pisane przez webhook RevenueCat i admina (tier 'comp'),
// 3. RevenueCat CustomerInfo (tylko natywny iOS) — natychmiastowy stan po zakupie,
//    zanim webhook dotrze do Firestore.
// Web (invite-only) nie sprzedaje: opiera się na Firestore (comp/admin) i jest poza paywallem.

export interface SubscriptionInfo {
  /** Czy user ma aktywny dostęp PRO (admin/comp/subskrypcja/trial). */
  isPro: boolean;
  /** Aktywny tier (none gdy brak). */
  tier: SubscriptionTier;
  /** Początek bieżącego okresu (ISO) — Firestore startedAt, fallback RC latestPurchaseDate. */
  startedAt: string | null;
  /** Koniec bieżącego okresu (ISO) — null dla comp/admin. */
  expiresAt: string | null;
  /** Stan z Firestore (do ekranów zarządzania). */
  subscription: SubscriptionState | null;
  /** Czy stan jest już ustalony (profil wczytany + pierwszy odczyt RC na native). */
  loading: boolean;
  /** Wymuś ponowny odczyt CustomerInfo z RevenueCat (po restore/zakupie). */
  refresh: () => Promise<void>;
}

interface RcState {
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  productId: string | null;
}

const readRcState = (info: { entitlements: { active: Record<string, { expirationDate?: string | null; latestPurchaseDate?: string; productIdentifier?: string }> } }): RcState => {
  const ent = info.entitlements.active[PRO_ENTITLEMENT];
  return ent
    ? { active: true, startedAt: ent.latestPurchaseDate ?? null, expiresAt: ent.expirationDate ?? null, productId: ent.productIdentifier ?? null }
    : { active: false, startedAt: null, expiresAt: null, productId: null };
};

export const useSubscription = (): SubscriptionInfo => {
  const { uid, profile, isAdmin, profileLoaded } = useCurrentUser();
  const identityVersion = useSyncExternalStore(subscribePurchasesIdentity, purchasesIdentityVersion, purchasesIdentityVersion);
  const isNative = Capacitor.isNativePlatform();
  const [rcResult, setRc] = useState<{ uid: string; version: number; state: RcState } | null>(null);
  const [loadedFor, setLoadedFor] = useState<{ uid: string; version: number } | null>(null);
  const rc = rcResult?.uid === uid && rcResult.version === identityVersion ? rcResult.state : null;
  const rcLoaded = !isNative || (loadedFor?.uid === uid && loadedFor.version === identityVersion);

  const refresh = useCallback(async () => {
    if (!isNative) return;
    try {
      const { customerInfo } = await withTimeout(
        readPurchasesForUser(uid, () => Purchases.getCustomerInfo()),
        REVENUECAT_BOOT_TIMEOUT_MS,
        'RevenueCat customer info',
      );
      setRc({ uid, version: identityVersion, state: readRcState(customerInfo) });
    } catch {
      // RC nieskonfigurowany / offline — zostajemy przy Firestore.
    } finally {
      setLoadedFor({ uid, version: identityVersion });
    }
  }, [isNative, uid, identityVersion]);

  useEffect(() => {
    if (!isNative) return;
    void refresh();
    // Listener payload may have been queued for a previous account. Read the
    // current customer through the identity barrier instead of trusting it.
    const listenerId = Purchases.addCustomerInfoUpdateListener(() => { void refresh(); });
    return () => {
      void listenerId
        .then(id => Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: id }))
        .catch(() => {});
    };
  }, [isNative, refresh]);

  const fsSub = profile?.subscription ?? null;
  const fsActive = isSubscriptionActive(fsSub);
  const isPro = isAdmin || fsActive || rc?.active === true;

  const tier: SubscriptionTier = isAdmin
    ? 'comp'
    : fsActive
      ? fsSub!.tier
      : rc?.active
        ? (rc.productId?.includes('yearly') ? 'yearly' : 'monthly')
        : 'none';

  const expiresAt = isAdmin || tier === 'comp'
    ? null
    : (fsActive ? fsSub!.expiresAt : rc?.expiresAt ?? null);

  // Dokumenty sprzed 2026-08-11 nie mają startedAt (webhook zapisuje je od tej daty),
  // więc na native dziura łatana jest datą ostatniego zakupu z CustomerInfo.
  const startedAt = isAdmin || tier === 'comp'
    ? null
    : (fsActive ? fsSub!.startedAt ?? rc?.startedAt ?? null : rc?.startedAt ?? null);

  return {
    isPro,
    tier,
    startedAt,
    expiresAt,
    subscription: fsSub,
    loading: !profileLoaded || (!isAdmin && !fsActive && !rcLoaded),
    refresh,
  };
};

/**
 * Platforma objęta paywallem: natywny iOS. W trybie E2E (przeglądarka) testy mogą
 * symulować native przez `simulateNative` w stanie e2e-auth — RC i tak nie jest
 * wołany (efekty RC sprawdzają Capacitor bezpośrednio), PRO pochodzi z profilu.
 */
export const isPaywallPlatform = (): boolean => {
  if (Capacitor.isNativePlatform()) return true;
  if (import.meta.env.VITE_E2E_MODE === 'true') return readE2EAuthState().simulateNative === true;
  return false;
};

/**
 * Hard paywall obowiązuje TYLKO na natywnym iOS (web jest invite-only, bez sprzedaży).
 * true = zablokuj akcję i wyślij na /paywall. Podczas ładowania stanu zwraca false,
 * żeby nie migać paywallem userom z aktywnym PRO.
 */
export const useRequiresPaywall = (): boolean => {
  const { isPro, loading } = useSubscription();
  return isPaywallPlatform() && !loading && !isPro;
};

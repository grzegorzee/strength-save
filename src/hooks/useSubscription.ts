import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { useCurrentUser } from '@/contexts/UserContext';
import { PRO_ENTITLEMENT } from '@/lib/purchases';
import { isSubscriptionActive, type SubscriptionState, type SubscriptionTier } from '@/lib/user-profile';

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
  expiresAt: string | null;
  productId: string | null;
}

const readRcState = (info: { entitlements: { active: Record<string, { expirationDate?: string | null; productIdentifier?: string }> } }): RcState => {
  const ent = info.entitlements.active[PRO_ENTITLEMENT];
  return ent
    ? { active: true, expiresAt: ent.expirationDate ?? null, productId: ent.productIdentifier ?? null }
    : { active: false, expiresAt: null, productId: null };
};

export const useSubscription = (): SubscriptionInfo => {
  const { profile, isAdmin, profileLoaded } = useCurrentUser();
  const isNative = Capacitor.isNativePlatform();
  const [rc, setRc] = useState<RcState | null>(null);
  const [rcLoaded, setRcLoaded] = useState(!isNative);

  const refresh = useCallback(async () => {
    if (!isNative) return;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      setRc(readRcState(customerInfo));
    } catch {
      // RC nieskonfigurowany / offline — zostajemy przy Firestore.
    } finally {
      setRcLoaded(true);
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;
    void refresh();
    const listenerId = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      setRc(readRcState(customerInfo));
      setRcLoaded(true);
    });
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

  return {
    isPro,
    tier,
    expiresAt,
    subscription: fsSub,
    loading: !profileLoaded || !rcLoaded,
    refresh,
  };
};

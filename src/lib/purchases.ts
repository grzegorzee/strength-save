import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

// RevenueCat: warstwa zakupów (iOS). Web (invite-only) nie sprzedaje — wszystkie
// funkcje są no-op poza platformą natywną, więc kod wywołujący nie musi sprawdzać platformy.
// appUserID = uid Firebase, dzięki czemu webhook RC może pisać entitlement do users/{uid}.

export const PRO_ENTITLEMENT = 'pro';

let configured = false;

export const configurePurchases = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || configured) return;
  const apiKey = import.meta.env.VITE_REVENUECAT_APPLE_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('[purchases] Brak VITE_REVENUECAT_APPLE_API_KEY — zakupy wyłączone.');
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

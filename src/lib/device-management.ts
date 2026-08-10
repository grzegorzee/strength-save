import type { SubscriptionTier } from '@/lib/user-profile';

export const APP_STORE_URL = 'https://apps.apple.com/app/id6777446137';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.grzegorzjasionowicz.strengthsave';

export interface WatchCapabilitySnapshot {
  v: 1;
  active: boolean;
  tier: SubscriptionTier;
  expiresAt?: string;
}

const WATCH_LINKED_KEY = 'strength-save:apple-watch-linked-v1';

export function saveAppleWatchLinkedState(linked: boolean): void {
  try { localStorage.setItem(WATCH_LINKED_KEY, linked ? '1' : '0'); } catch { /* ignore */ }
}

export function applyLastKnownWatchLink(
  capability: WatchCapabilitySnapshot | undefined,
): WatchCapabilitySnapshot | undefined {
  if (!capability) return undefined;
  try {
    return localStorage.getItem(WATCH_LINKED_KEY) === '0'
      ? { ...capability, active: false }
      : capability;
  } catch {
    return capability;
  }
}

export function buildWatchCapabilitySnapshot(input: {
  isPro: boolean;
  tier: SubscriptionTier;
  expiresAt: string | null;
}): WatchCapabilitySnapshot {
  return {
    v: 1,
    active: input.isPro,
    tier: input.tier,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };
}

export type MobileStorePlatform = 'ios' | 'android';

export function mobileStoreDestinations(platform: 'web' | MobileStorePlatform): Array<{
  platform: MobileStorePlatform;
  url: string;
}> {
  if (platform === 'ios') return [{ platform, url: APP_STORE_URL }];
  if (platform === 'android') return [{ platform, url: PLAY_STORE_URL }];
  return [
    { platform: 'ios', url: APP_STORE_URL },
    { platform: 'android', url: PLAY_STORE_URL },
  ];
}

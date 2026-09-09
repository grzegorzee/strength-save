import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ configure: vi.fn(), logIn: vi.fn(), logOut: vi.fn(), getCustomerInfo: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: sdk }));
const apple = 'https://apps.apple.com/account/subscriptions';
const google = 'https://play.google.com/store/account/subscriptions';

describe('subscription management follows the purchased store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_REVENUECAT_GOOGLE_API_KEY', 'goog_mock');
    Object.values(sdk).forEach(mock => mock.mockReset().mockResolvedValue({}));
  });

  it.each([apple, `${google}?sku=pro_monthly&package=com.strengthsave.app`])('uses the actual CustomerInfo URL %s on Android', async url => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('a');
    sdk.getCustomerInfo.mockResolvedValue({ customerInfo: { managementURL: url, entitlements: { active: {} } } });
    expect(await api.getSubscriptionManagementUrl('a')).toBe(url);
  });

  it.each(['https://apps.apple.com.evil.example/account/subscriptions', 'javascript:alert(1)', 'https://play.google.com/redirect?url=https://evil.example'])('rejects arbitrary URL %s and uses the active entitlement store', async url => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('a');
    sdk.getCustomerInfo.mockResolvedValue({ customerInfo: { managementURL: url, entitlements: { active: { pro: { store: 'APP_STORE' } } } } });
    expect(await api.getSubscriptionManagementUrl('a')).toBe(apple);
  });

  it('offline management preserves an Apple purchase on Android, unknown store falls back to Google', async () => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('a');
    sdk.getCustomerInfo.mockRejectedValue(new Error('OFFLINE'));
    expect(await api.getSubscriptionManagementUrl('a', 'APP_STORE')).toBe(apple);
    expect(await api.getSubscriptionManagementUrl('a')).toBe(google);
  });

  it('never returns the previous account management URL after logout/login', async () => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('a');
    let finish!: (value: unknown) => void;
    sdk.getCustomerInfo.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const request = api.getSubscriptionManagementUrl('a', 'APP_STORE');
    const rejected = expect(request).rejects.toThrow('IDENTITY_CHANGED');
    await vi.waitFor(() => expect(sdk.getCustomerInfo).toHaveBeenCalled());
    await api.logOutPurchases();
    await api.logInPurchases('b');
    finish({ customerInfo: { managementURL: apple } });
    await rejected;
  });
});

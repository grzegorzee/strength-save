import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ configure: vi.fn(), logIn: vi.fn(), logOut: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } }));
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: sdk }));

describe('purchase identity sequencing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_REVENUECAT_APPLE_API_KEY', 'appl_mock');
    Object.values(sdk).forEach(mock => mock.mockReset().mockResolvedValue({}));
  });

  it('cold start calls configure once even when two auth listeners log in', async () => {
    let configured!: () => void;
    sdk.configure.mockReturnValue(new Promise<void>(resolve => { configured = resolve; }));
    const api = await import('@/lib/purchases');
    const first = api.configurePurchases();
    const second = api.logInPurchases('user-a');
    configured();
    await Promise.all([first, second]);
    expect(sdk.configure).toHaveBeenCalledTimes(1);
  });

  it('serializes old login, logout and new login across an account switch', async () => {
    const api = await import('@/lib/purchases');
    await api.configurePurchases();
    let finishA!: () => void;
    sdk.logIn.mockImplementationOnce(() => new Promise<void>(resolve => { finishA = resolve; }));
    const a = api.logInPurchases('user-a');
    await vi.waitFor(() => expect(sdk.logIn).toHaveBeenCalledTimes(1));
    const logout = api.logOutPurchases();
    const b = api.logInPurchases('user-b');
    expect(sdk.logIn).toHaveBeenCalledTimes(1);
    finishA();
    await Promise.all([a, logout, b]);
    expect(sdk.logIn).toHaveBeenLastCalledWith({ appUserID: 'user-b' });
  });

  it('cannot spend or restore under another uid or after an identity change during the operation', async () => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('user-a');
    const purchase = vi.fn(async () => 'receipt');
    await expect(api.runPurchasesForUser('user-b', purchase)).rejects.toThrow('IDENTITY_NOT_READY');
    expect(purchase).not.toHaveBeenCalled();
    let finish!: (value: string) => void;
    const operation = api.runPurchasesForUser('user-a', () => new Promise<string>(resolve => { finish = resolve; }));
    const failedOperation = expect(operation).rejects.toThrow('IDENTITY_CHANGED');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const login = api.logInPurchases('user-b');
    finish('receipt');
    await failedOperation;
    await login;
    expect(api.isPurchasesUserCurrent('user-b')).toBe(true);
  });

  it('a hanging CustomerInfo read cannot block the next purchase or account switch', async () => {
    const api = await import('@/lib/purchases');
    await api.logInPurchases('user-a');
    const read = vi.fn(() => new Promise<never>(() => undefined));
    void api.readPurchasesForUser('user-a', read);
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    const purchase = vi.fn(async () => 'receipt');
    await expect(api.runPurchasesForUser('user-a', purchase)).resolves.toBe('receipt');
    await api.logInPurchases('user-b');
    expect(api.isPurchasesUserCurrent('user-b')).toBe(true);
  });

  it('a waiting purchase times out with retry feedback and never executes later', async () => {
    vi.useFakeTimers();
    try {
      const api = await import('@/lib/purchases');
      await api.configurePurchases();
      let finish!: () => void;
      sdk.logIn.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
      const login = api.logInPurchases('user-a');
      await vi.advanceTimersByTimeAsync(0);
      const purchase = vi.fn(async () => 'receipt');
      const attempt = expect(api.runPurchasesForUser('user-a', purchase)).rejects.toThrow('PURCHASES_BUSY_RETRY');
      await vi.advanceTimersByTimeAsync(5000);
      await attempt;
      finish();
      await login;
      await vi.advanceTimersByTimeAsync(0);
      expect(purchase).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});

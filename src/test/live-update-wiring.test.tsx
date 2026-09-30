import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const markLiveUpdateReady = vi.fn();
const setLiveUpdateUser = vi.fn();
vi.mock('@/lib/live-update', () => ({
  markLiveUpdateReady: () => markLiveUpdateReady(),
  setLiveUpdateUser: (user: unknown) => setLiveUpdateUser(user),
  getLiveUpdateController: () => null,
}));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: {} }));

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LiveUpdateBridge, LiveUpdateReadySignal } from '@/components/live-update/LiveUpdateBridge';

const Crash = (): never => {
  throw new Error('broken OTA bundle');
};

describe('OTA: sygnał gotowości powłoki', () => {
  afterEach(() => {
    markLiveUpdateReady.mockClear();
    setLiveUpdateUser.mockClear();
  });

  it('powłoka wyrenderowana → ready (zatrzymuje natywny rollback)', () => {
    render(<ErrorBoundary><div>ok</div><LiveUpdateReadySignal /></ErrorBoundary>);
    expect(markLiveUpdateReady).toHaveBeenCalledTimes(1);
  });

  it('crash renderu pod ErrorBoundary → brak ready, więc plugin cofnie pakiet po readyTimeout', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ErrorBoundary><Crash /><LiveUpdateReadySignal /></ErrorBoundary>);
    expect(markLiveUpdateReady).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('most usera: profil w trakcie ładowania nie ustawia kanału; wylogowany = null', () => {
    const { rerender } = render(<LiveUpdateBridge user={undefined} />);
    expect(setLiveUpdateUser).not.toHaveBeenCalled();
    rerender(<LiveUpdateBridge user={{ uid: 'u1', isAdmin: true }} />);
    expect(setLiveUpdateUser).toHaveBeenLastCalledWith({ uid: 'u1', isAdmin: true, channel: 'production' });
    rerender(<LiveUpdateBridge user={{ uid: 'u2', isAdmin: false, channel: 'internal' }} />);
    expect(setLiveUpdateUser).toHaveBeenLastCalledWith({ uid: 'u2', isAdmin: false, channel: 'internal' });
    render(<LiveUpdateBridge user={null} />);
    expect(setLiveUpdateUser).toHaveBeenLastCalledWith(null);
  });
});

describe('OTA: brak ukrytych funkcji (Apple 2.3.1(a))', () => {
  it('wersja w „O aplikacji” nie jest przyciskiem ani ukrytym gestem', () => {
    const source = readFileSync('src/components/live-update/AboutVersionLine.tsx', 'utf8');
    expect(source).not.toMatch(/onClick|TAPS_TO_TOGGLE|setTesterChannel|<button/);
  });
});

describe('OTA: kontrakt konfiguracji natywnej', () => {
  const config = readFileSync('capacitor.config.ts', 'utf8');

  it('plugin w trybie self-host: bez appId chmury, bez auto-update, z rollbackiem i podpisem', () => {
    expect(config).toMatch(/LiveUpdate: \{/);
    expect(config).toMatch(/autoUpdateStrategy: 'none'/);
    expect(config).toMatch(/readyTimeout: 20000/);
    expect(config).toMatch(/autoBlockRolledBackBundles: true/);
    expect(config).toMatch(/publicKey: liveUpdatePublicKey/);
    expect(config).not.toMatch(/\bappId: '[0-9a-f-]{36}'/);
    expect(config).not.toMatch(/serverDomain/);
  });

  it('w repo jest wyłącznie klucz PUBLICZNY', () => {
    const pem = readFileSync('release/live-updates/public-key.txt', 'utf8');
    expect(pem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(pem).not.toMatch(/PRIVATE KEY/);
  });

  it('plugin OTA zależnością dokładnie przypiętą (zweryfikowane źródło 8.4.4)', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['@capawesome/capacitor-live-update']).toBe('8.4.4');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  markStartup,
  readStartupReport,
  resetStartupMarksForTest,
} from '@/lib/startup-performance';

describe('startup performance markers', () => {
  beforeEach(() => {
    resetStartupMarksForTest();
    vi.spyOn(performance, 'now').mockReturnValue(250);
  });

  it('zapisuje wymagane etapy tylko raz i buduje raport cold-online', () => {
    markStartup('root-painted');
    markStartup('root-painted');
    markStartup('auth-restored');
    markStartup('profile-cache-ready', 'cache');
    markStartup('dashboard-interactive');

    expect(readStartupReport()).toEqual({
      mode: 'cold-online',
      durationMs: 250,
      marks: {
        'root-painted': 250,
        'auth-restored': 250,
        'profile-cache-ready': 250,
        'dashboard-interactive': 250,
      },
      profileSource: 'cache',
    });
  });

  it('klasyfikuje offline i weak-network bez fabrykowania brakujących markerów', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    markStartup('root-painted');
    expect(readStartupReport()).toMatchObject({ mode: 'cold-offline' });
    expect(readStartupReport()?.marks).not.toHaveProperty('dashboard-interactive');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '2g' },
    });
    expect(readStartupReport()).toMatchObject({ mode: 'weak-network' });
  });

  it('nie oznacza Dashboardu jako interactive przed wczytaniem treningów i planu', () => {
    const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8');
    expect(dashboard).toContain("if (isLoaded && planIsLoaded) markStartup('dashboard-interactive')");
    expect(dashboard).toContain('}, [isLoaded, planIsLoaded]);');
  });
});

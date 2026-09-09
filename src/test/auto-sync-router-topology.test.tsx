import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

vi.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: ReactNode }) => children,
  useCurrentUser: () => ({ uid: 'owner', profileLoaded: true, hasAppAccess: true, isNewUser: false, profile: {} }),
}));
vi.mock('@/contexts/UnitContext', () => ({ UnitProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/consent-selection', () => ({ needsConsentRefresh: () => false }));
vi.mock('@/lib/global-error-telemetry', () => ({ initGlobalErrorTelemetry: vi.fn(), setGlobalErrorTelemetryUid: vi.fn() }));
vi.mock('@/lib/bug-report-camera-restore', () => ({ addBugReportCameraRestoreListener: () => () => {} }));
vi.mock('@/lib/lazy-with-retry', () => ({ lazyWithRetry: () => () => null }));
vi.mock('@/components/AutoSyncOnReconnect', async () => {
  const { useLocation } = await import('react-router-dom');
  return { AutoSyncOnReconnect: () => <output data-testid="sync-route">{useLocation().pathname}</output> };
});
vi.mock('@/components/Layout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { Layout: Outlet };
});
vi.mock('@/components/PaywallRouteGuard', async () => {
  const { Outlet } = await import('react-router-dom');
  return { PaywallRouteGuard: Outlet };
});
vi.mock('@/components/WatchEventRouter', () => ({ WatchEventRouter: () => null }));
vi.mock('@/components/ActiveWorkoutResume', () => ({ ActiveWorkoutResume: () => null }));
vi.mock('@/components/TelemetryHeartbeat', () => ({ TelemetryHeartbeat: () => null }));
vi.mock('@/components/ProductTelemetry', () => ({ ProductTelemetry: () => null }));
vi.mock('@/components/PreferenceSync', () => ({ PreferenceSync: () => null }));
vi.mock('@/components/TimeZoneSync', () => ({ TimeZoneSync: () => null }));
vi.mock('@/components/PushRegistrar', () => ({ PushRegistrar: () => null }));
vi.mock('@/components/IosSwipeBack', () => ({ IosSwipeBack: () => null }));
vi.mock('@/components/AndroidBackHandler', () => ({ AndroidBackHandler: () => null }));

import AuthenticatedApp from '@/components/AuthenticatedApp';

beforeEach(() => { window.history.replaceState(null, '', '/#/day'); });

it('mounts sync inside the real authenticated HashRouter while retaining the user provider', () => {
  render(<AuthenticatedApp onLogout={async () => {}} />);
  expect(screen.getByTestId('sync-route')).toHaveTextContent('/day');
});

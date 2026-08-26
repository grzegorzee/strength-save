import { beforeEach, describe, expect, it, vi } from 'vitest';

// WP-C (X38): po ODROCZONYM zapisie w chmurze user dostaje dokładnie jeden
// sygnał per sesja: toast + dzwonek (apka widoczna), systemowe powiadomienie
// bez dźwięku (apka w tle, >= 2 min od zakończenia), sam dzwonek (w tle, szybciej).

const schedule = vi.fn(async (_options: unknown) => undefined);
const checkPermissions = vi.fn(async () => ({ display: 'granted' }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: () => checkPermissions(),
    schedule: (options: unknown) => schedule(options),
  },
}));
vi.mock('@/lib/user-events', () => ({
  emitUserEvent: vi.fn(async () => undefined),
  syncEventKey: (dayId: string, date: string) => `sync-${dayId}-${date}`,
}));

import {
  SYNC_DEFERRED_THRESHOLD_MS,
  SYNC_NOTIFIED_STORAGE_KEY,
  decideSyncNotification,
  notifyDeferredSyncSuccess,
} from '@/lib/sync-notification';
import { emitUserEvent } from '@/lib/user-events';

const NOW = 1_756_200_000_000;

const info = (over: Record<string, unknown> = {}) => ({
  sessionId: 's1',
  dayId: 'day-1',
  date: '2026-08-26',
  dayName: 'Szybki trening',
  finalizedAt: NOW - SYNC_DEFERRED_THRESHOLD_MS - 1000,
  ...over,
});

const t = (key: string, params?: Record<string, string | number>) => (
  key === 'sync.cloudSavedTitle' ? 'Trening zapisany w chmurze' : `${params?.day ?? ''}. Wszystko jest już bezpieczne.`
);

beforeEach(() => {
  localStorage.clear();
  schedule.mockClear();
  vi.mocked(emitUserEvent).mockClear();
});

describe('decideSyncNotification', () => {
  it('apka widoczna -> in-app (toast + dzwonek), niezależnie od progu 2 min', () => {
    expect(decideSyncNotification({ sessionId: 's1', finalizedAt: NOW - 10_000, now: NOW, appVisible: true, native: true, alreadyNotified: false })).toBe('in-app');
  });

  it('apka w tle, >= 2 min od zakończenia, native -> system (bez dźwięku)', () => {
    expect(decideSyncNotification({ sessionId: 's1', finalizedAt: NOW - SYNC_DEFERRED_THRESHOLD_MS, now: NOW, appVisible: false, native: true, alreadyNotified: false })).toBe('system');
  });

  it('apka w tle, < 2 min -> tylko dzwonek', () => {
    expect(decideSyncNotification({ sessionId: 's1', finalizedAt: NOW - 30_000, now: NOW, appVisible: false, native: true, alreadyNotified: false })).toBe('inbox-only');
  });

  it('web w tle (brak local notifications) -> tylko dzwonek', () => {
    expect(decideSyncNotification({ sessionId: 's1', finalizedAt: NOW - 10 * 60_000, now: NOW, appVisible: false, native: false, alreadyNotified: false })).toBe('inbox-only');
  });

  it('już powiadomiona sesja -> none', () => {
    expect(decideSyncNotification({ sessionId: 's1', finalizedAt: NOW - 10 * 60_000, now: NOW, appVisible: false, native: true, alreadyNotified: true })).toBe('none');
  });
});

describe('notifyDeferredSyncSuccess', () => {
  it('widoczna: toast + wpis do dzwonka typu sync z deepLink /history; drugi raz dla tej samej sesji nic', async () => {
    const showToast = vi.fn();
    const deps = { now: () => NOW, isAppVisible: () => true, showToast, t };

    expect(await notifyDeferredSyncSuccess('u1', info(), deps)).toBe('in-app');
    expect(showToast).toHaveBeenCalledWith('Trening zapisany w chmurze', 'Szybki trening. Wszystko jest już bezpieczne.');
    expect(emitUserEvent).toHaveBeenCalledWith('u1', expect.objectContaining({
      type: 'sync',
      key: 'sync-day-1-2026-08-26',
      deepLink: '/history',
      payload: expect.objectContaining({ dayName: 'Szybki trening', date: '2026-08-26' }),
    }));
    expect(JSON.parse(localStorage.getItem(SYNC_NOTIFIED_STORAGE_KEY) ?? '[]')).toEqual(['s1']);

    expect(await notifyDeferredSyncSuccess('u1', info(), deps)).toBe('none');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(emitUserEvent).toHaveBeenCalledTimes(1);
  });

  it('w tle >= 2 min: systemowe powiadomienie BEZ pola sound (cisza), bez toastu, wpis do dzwonka', async () => {
    const showToast = vi.fn();
    const deps = { now: () => NOW, isAppVisible: () => false, showToast, t };

    expect(await notifyDeferredSyncSuccess('u1', info(), deps)).toBe('system');
    expect(showToast).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
    const scheduled = (schedule.mock.calls[0][0] as { notifications: Array<Record<string, unknown>> }).notifications[0];
    expect(scheduled.title).toBe('Trening zapisany w chmurze');
    expect(scheduled).not.toHaveProperty('sound');
    expect(emitUserEvent).toHaveBeenCalledTimes(1);
  });

  it('w tle < 2 min: sam dzwonek, bez systemowego powiadomienia', async () => {
    const showToast = vi.fn();
    const deps = { now: () => NOW, isAppVisible: () => false, showToast, t };

    expect(await notifyDeferredSyncSuccess('u1', info({ finalizedAt: NOW - 20_000 }), deps)).toBe('inbox-only');
    expect(schedule).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(emitUserEvent).toHaveBeenCalledTimes(1);
  });

  it('brak uprawnień do powiadomień: cicha degradacja (dzwonek zostaje)', async () => {
    checkPermissions.mockImplementationOnce(async () => ({ display: 'denied' }));
    const deps = { now: () => NOW, isAppVisible: () => false, showToast: vi.fn(), t };

    expect(await notifyDeferredSyncSuccess('u1', info(), deps)).toBe('system');
    expect(schedule).not.toHaveBeenCalled();
    expect(emitUserEvent).toHaveBeenCalledTimes(1);
  });
});

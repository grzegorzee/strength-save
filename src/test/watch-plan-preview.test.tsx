// Z164: podgląd planu wysyłany na zegarek niesie język UI (zegarek lokalizuje etykiety).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { TrainingDay } from '@/data/trainingPlan';

const sendWorkoutToWatch = vi.fn(async (_payload: Record<string, unknown>) => undefined);
const getWatchAvailability = vi.fn(async (): Promise<Record<string, unknown> | null> => null);
const reportAppleWatchStatus = vi.fn(async () => ({ linked: true }));

vi.mock('@/lib/watch-bridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/watch-bridge')>();
  return {
    ...original,
    isWatchBridgeSupported: () => true,
    sendWorkoutToWatch: (payload: unknown) => sendWorkoutToWatch(payload as Record<string, unknown>),
    getWatchAvailability: () => getWatchAvailability(),
  };
});

vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), loadDraftForDay: vi.fn(async () => null) },
}));

vi.mock('@/lib/garmin-api', () => ({
  reportAppleWatchStatus: () => reportAppleWatchStatus(),
}));

import { useWatchPlanPreview } from '@/hooks/useWatchPlanPreview';
import { resolvePlannedDay } from '@/lib/plan-schedule';

const day: TrainingDay = {
  id: 'day-1',
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Klatka',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie sztangi', sets: '3 x 8', instructions: [] }],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('useWatchPlanPreview — język w payloadzie (Z164)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    getWatchAvailability.mockResolvedValue(null);
    reportAppleWatchStatus.mockResolvedValue({ linked: true });
  });

  const runPreview = async (lang: 'pl' | 'en') => {
    localStorage.setItem('app-language', lang);
    renderHook(
      () => useWatchPlanPreview({ uid: 'u1', type: 'training', day, dateStr: '2026-07-28', workouts: [] }),
      { wrapper },
    );
    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();
    await waitFor(() => expect(sendWorkoutToWatch).toHaveBeenCalled());
    return sendWorkoutToWatch.mock.calls.at(-1)?.[0] ?? {};
  };

  it('EN: payload podglądu ma lang="en"', async () => {
    const payload = await runPreview('en');
    expect(payload.type).toBe('todayWorkout');
    expect(payload.lang).toBe('en');
    expect(payload).toMatchObject({
      v: 1,
      protocolVersion: 1,
      uid: 'u1',
      restSeconds: 90,
      restBetweenSetsSeconds: 90,
      restBetweenExercisesSeconds: 150,
    });
    expect(payload.deviceId).toMatch(/^phone-/);
    // Nazwy ćwiczeń zostają kanoniczne (zasada 5 planu X21).
    expect(JSON.stringify(payload)).toContain('Wyciskanie sztangi');
  });

  it('PL: payload podglądu ma lang="pl"', async () => {
    const payload = await runPreview('pl');
    expect(payload.lang).toBe('pl');
  });

  it('przełożony dzień (scheduleOverrides) jedzie w preview pod NOWĄ datą', async () => {
    // Dashboard liczy dzień przez resolver z overrides i przekazuje go tutaj —
    // preview na dacie normalnie wolnej (wtorek 2026-07-28) niesie przełożony dzień.
    const overrides = { '2026-07-27': null, '2026-07-28': 'day-1' };
    const resolved = resolvePlannedDay('2026-07-28', [day], overrides);
    expect(resolved?.id).toBe('day-1');

    localStorage.setItem('app-language', 'pl');
    renderHook(
      () => useWatchPlanPreview({ uid: 'u1', type: 'training', day: resolved!, dateStr: '2026-07-28', workouts: [] }),
      { wrapper },
    );
    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();
    await waitFor(() => expect(sendWorkoutToWatch).toHaveBeenCalled());
    const payload = sendWorkoutToWatch.mock.calls.at(-1)?.[0] ?? {};
    expect(payload).toMatchObject({ type: 'todayWorkout', dayId: 'day-1', date: '2026-07-28' });
    // Dzień źródłowy (poniedziałek) zwolniony: resolver nie daje treningu.
    expect(resolvePlannedDay('2026-07-27', [day], overrides)).toBeNull();
  });

  it('server revoke overrides inherited PRO without deleting Watch data', async () => {
    getWatchAvailability.mockResolvedValue({
      supported: true, paired: true, watchAppInstalled: true, reachable: false,
      deviceId: 'watch-12345678', pendingEvents: 3, healthStatus: 'ready',
    });
    reportAppleWatchStatus.mockResolvedValue({ linked: false });
    localStorage.setItem('app-language', 'pl');
    renderHook(
      () => useWatchPlanPreview({
        uid: 'u1', type: 'training', day, dateStr: '2026-07-28', workouts: [],
        capability: { v: 1, active: true, tier: 'yearly' },
      }),
      { wrapper },
    );
    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();
    await waitFor(() => expect(sendWorkoutToWatch).toHaveBeenCalled());
    expect(sendWorkoutToWatch.mock.calls.at(-1)?.[0]).toMatchObject({
      capability: { v: 1, active: false, tier: 'yearly' },
    });
    expect(localStorage.getItem('strength-save:apple-watch-linked-v1')).toBe('0');
  });
});

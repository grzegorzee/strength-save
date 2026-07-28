// Z164: podgląd planu wysyłany na zegarek niesie język UI (zegarek lokalizuje etykiety).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { TrainingDay } from '@/data/trainingPlan';

const sendWorkoutToWatch = vi.fn(async (_payload: Record<string, unknown>) => undefined);

vi.mock('@/lib/watch-bridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/watch-bridge')>();
  return {
    ...original,
    isWatchBridgeSupported: () => true,
    sendWorkoutToWatch: (payload: unknown) => sendWorkoutToWatch(payload as Record<string, unknown>),
  };
});

vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null) },
}));

import { useWatchPlanPreview } from '@/hooks/useWatchPlanPreview';

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
    // Nazwy ćwiczeń zostają kanoniczne (zasada 5 planu X21).
    expect(JSON.stringify(payload)).toContain('Wyciskanie sztangi');
  });

  it('PL: payload podglądu ma lang="pl"', async () => {
    const payload = await runPreview('pl');
    expect(payload.lang).toBe('pl');
  });
});

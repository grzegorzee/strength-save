import type { SetData, WorkoutSession } from '@/types';
import { buildWorkoutSessionId } from '@/lib/workout-session';

// WP-C (X38): mock ZAPISU do chmury dla testów e2e w trybie mock (VITE_E2E_MODE
// bez emulatorów). Domyślnie e2e blokuje Firestore (route abort) i finalny zapis
// wisi w SDK bez końca, więc scenariusz "zakończ offline -> wróć online -> sync
// SAM domyka trening" nie dał się przetestować. Mock żyje w localStorage
// (fittracker_e2e_workouts, ten sam hak co odczyt historii) i jest WŁĄCZANY
// jawnie przez test (flaga), żeby nie zmieniać zachowania pozostałych speców.
// Offline (navigator.onLine === false) rzuca jak SDK: sieć jest warunkiem zapisu.

export const E2E_CLOUD_MOCK_FLAG_KEY = 'fittracker_e2e_cloud_writes';
const E2E_WORKOUTS_KEY = 'fittracker_e2e_workouts';

export const isE2ECloudMockEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_E2E_MODE === 'true'
      && import.meta.env.VITE_USE_EMULATORS !== 'true'
      && window.localStorage.getItem(E2E_CLOUD_MOCK_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
};

const readAll = (): WorkoutSession[] => {
  try {
    const raw = window.localStorage.getItem(E2E_WORKOUTS_KEY);
    return raw ? (JSON.parse(raw) as WorkoutSession[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (workouts: WorkoutSession[]): void => {
  window.localStorage.setItem(E2E_WORKOUTS_KEY, JSON.stringify(workouts));
};

const assertOnline = (): void => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Failed to get document because the client is offline.');
  }
};

export const e2eCloudMock = {
  createSession(userId: string, dayId: string, date: string, cycleId?: string): { session: WorkoutSession; existing: boolean } {
    assertOnline();
    const id = buildWorkoutSessionId(userId, dayId, date);
    const all = readAll();
    const existing = all.find((w) => w.id === id);
    if (existing) return { session: existing, existing: true };
    const createdAt = Date.now();
    const session: WorkoutSession = {
      id,
      userId,
      dayId,
      date,
      exercises: [],
      completed: false,
      startedAt: createdAt,
      updatedAt: createdAt,
      revision: 0,
      ...(cycleId && { cycleId }),
    };
    writeAll([session, ...all]);
    return { session, existing: false };
  },

  getFromServer(userId: string, sessionId: string): WorkoutSession | null {
    assertOnline();
    const found = readAll().find((w) => w.id === sessionId);
    return found && found.userId === userId ? found : null;
  },

  save(
    sessionId: string,
    exercises: { exerciseId: string; sets: SetData[]; notes?: string; name?: string; rpe?: number; pain?: number; quality?: number }[],
    options: { cycleId?: string; notes?: string; skippedExercises?: string[]; completed?: boolean; dayName?: string; dayFocus?: string; durationSec?: number; startedAt?: number; completedAt?: number; expectedRevision: number | null; writeId: string },
  ): { updatedAt: number; revision: number; alreadyApplied?: true } {
    assertOnline();
    const all = readAll();
    const index = all.findIndex((w) => w.id === sessionId);
    if (index < 0) throw new Error('WORKOUT_NOT_FOUND');
    const current = all[index] as WorkoutSession & { lastWriteId?: string };
    const currentRevision = typeof current.revision === 'number' ? current.revision : 0;
    if (current.lastWriteId === options.writeId) {
      return { updatedAt: current.updatedAt ?? Date.now(), revision: currentRevision, alreadyApplied: true };
    }
    if (options.expectedRevision !== null && options.expectedRevision !== currentRevision) {
      throw new Error('WORKOUT_CONFLICT');
    }
    const updatedAt = Date.now();
    const revision = currentRevision + 1;
    const next: WorkoutSession & { lastWriteId?: string } = {
      ...current,
      exercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        ...(ex.notes ? { notes: ex.notes } : {}),
        ...(ex.name ? { name: ex.name } : {}),
        ...(ex.rpe !== undefined ? { rpe: ex.rpe } : {}),
        ...(ex.pain !== undefined ? { pain: ex.pain } : {}),
        ...(ex.quality !== undefined ? { quality: ex.quality } : {}),
      })),
      updatedAt,
      revision,
      lastWriteId: options.writeId,
      ...(options.cycleId && { cycleId: options.cycleId }),
      ...(options.notes !== undefined && { notes: options.notes }),
      ...(options.skippedExercises && { skippedExercises: options.skippedExercises }),
      ...(options.completed && { completed: true, completedAt: options.completedAt ?? updatedAt }),
      ...(options.dayName && { dayName: options.dayName }),
      ...(options.dayFocus && { dayFocus: options.dayFocus }),
      ...(typeof options.durationSec === 'number' && options.durationSec > 0 && { durationSec: Math.floor(options.durationSec) }),
      ...(typeof options.startedAt === 'number' && options.startedAt > 0 && { startedAt: options.startedAt }),
    };
    all[index] = next;
    writeAll(all);
    return { updatedAt, revision };
  },
};

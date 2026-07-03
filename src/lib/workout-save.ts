import { doc, runTransaction, type Firestore, type UpdateData } from 'firebase/firestore';
import type { SetData, WorkoutSession } from '@/types';
import { clampSet } from '@/lib/workout-sanitizers';
import { resolveWriteAttempt } from '@/lib/workout-write-attempt';

// Transakcja zapisu treningu z preconditionem rewizji i kluczem idempotencji —
// wyekstrahowana z useFirebaseWorkouts (wzorzec: training-plan-save.ts), żeby
// testy E2E na emulatorze wykonywały DOKŁADNIE ten sam kod co produkcja.

const WORKOUTS_COLLECTION = 'workouts';

export interface WorkoutSaveExercisePayload {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
  name?: string;
  rpe?: number;
  pain?: number;
  quality?: number;
}

export interface WorkoutBatchSaveOptions {
  cycleId?: string;
  notes?: string;
  skippedExercises?: string[];
  completed?: boolean;
  dayName?: string;
  dayFocus?: string;
  durationSec?: number;
  startedAt?: number;
  completedAt?: number;
  // null = świadome pominięcie preconditionu (tylko migracje/naprawy danych).
  expectedRevision: number | null;
  // Klucz idempotencji: ten sam przy retry tej samej treści, nowy przy nowej treści.
  writeId: string;
}

const cleanMetrics = (ex: { rpe?: number; pain?: number; quality?: number }): Record<string, number> => {
  const out: Record<string, number> = {};
  const clamp = (v: unknown, lo: number, hi: number, step: number): number | null => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(lo, Math.min(hi, Math.round(n / step) * step));
  };
  const rpe = clamp(ex.rpe, 0, 10, 0.5);
  const pain = clamp(ex.pain, 0, 10, 1);
  const quality = clamp(ex.quality, 0, 5, 1);
  if (ex.rpe !== undefined && rpe !== null) out.rpe = rpe;
  if (ex.pain !== undefined && pain !== null) out.pain = pain;
  if (ex.quality !== undefined && quality !== null) out.quality = quality;
  return out;
};

// Rzuca WORKOUT_NOT_FOUND / WORKOUT_CONFLICT; zwraca stan zapisu przy sukcesie.
export const saveWorkoutBatchWithRevision = async (
  db: Firestore,
  sessionId: string,
  exercises: WorkoutSaveExercisePayload[],
  options: WorkoutBatchSaveOptions,
): Promise<{ updatedAt: number; revision: number; alreadyApplied?: true }> => {
  const workoutRef = doc(db, WORKOUTS_COLLECTION, sessionId);

  const cleanExercises = exercises.map(ex => ({
    exerciseId: ex.exerciseId,
    sets: ex.sets.map(clampSet),
    ...(ex.notes !== undefined && ex.notes !== '' && { notes: String(ex.notes).slice(0, 2000) }),
    // Snapshot nazwy — odporność historii na zmianę planu.
    ...(ex.name && { name: String(ex.name).slice(0, 200) }),
    // Metryki autoregulacji (RPE/ból/jakość) — tylko zdefiniowane.
    ...cleanMetrics(ex),
  }));

  const updateTime = Date.now();
  const updateData: Record<string, unknown> = { exercises: cleanExercises, updatedAt: updateTime };
  if (options.cycleId) updateData.cycleId = options.cycleId;
  if (options.notes !== undefined) updateData.notes = String(options.notes).slice(0, 5000);
  if (options.skippedExercises) updateData.skippedExercises = options.skippedExercises;
  if (options.completed) {
    updateData.completed = true;
    updateData.completedAt = options.completedAt ?? Date.now(); // stabilny przy retry finalnego syncu
  }
  if (options.dayName) updateData.dayName = String(options.dayName).slice(0, 200);
  if (options.dayFocus) updateData.dayFocus = String(options.dayFocus).slice(0, 200);
  if (typeof options.durationSec === 'number' && options.durationSec > 0) updateData.durationSec = Math.floor(options.durationSec);
  if (typeof options.startedAt === 'number' && options.startedAt > 0) updateData.startedAt = options.startedAt;

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(workoutRef);
    if (!snapshot.exists()) {
      throw new Error('WORKOUT_NOT_FOUND');
    }

    const current = snapshot.data() as WorkoutSession;
    const attempt = resolveWriteAttempt(current, options.expectedRevision, options.writeId);
    if (attempt === 'conflict') {
      throw new Error('WORKOUT_CONFLICT');
    }
    if (attempt === 'already-applied') {
      // Mój poprzedni zapis doszedł, odpowiedź zginęła — sukces no-op bez update.
      return {
        updatedAt: current.updatedAt ?? updateTime,
        revision: typeof current.revision === 'number' ? current.revision : 0,
        alreadyApplied: true as const,
      };
    }

    const revision = (typeof current.revision === 'number' ? current.revision : 0) + 1;
    transaction.update(workoutRef, { ...updateData, revision, lastWriteId: options.writeId } as UpdateData<Record<string, unknown>>);
    return { updatedAt: updateTime, revision };
  });
};

import { useCallback, useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  writeBatch,
  type UpdateData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SetData, ExerciseProgress, WorkoutSession, BodyMeasurement } from '@/types';
import { MEASUREMENT_LIMITS, validateMeasurement } from '@/lib/measurement-validation';
import type { PlanCycle } from '@/types/cycles';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import {
  buildWorkoutSessionId,
  createProvisionalWorkoutSession,
  isProvisionalWorkoutSessionId,
} from '@/lib/workout-session';
import { useTranslation } from '@/contexts/LanguageContext';
import { hasWorkoutWriteConflict } from '@/lib/workout-final-sync';
import { clampSet } from '@/lib/workout-sanitizers';
import { getWorkoutReadSnapshot, subscribeWorkoutReads } from '@/lib/workout-read-store';

export type { SetData, ExerciseProgress, WorkoutSession, BodyMeasurement };

const WORKOUTS_COLLECTION = 'workouts';
const MEASUREMENTS_COLLECTION = 'measurements';

// Metryki autoregulacji (RPE/ból/jakość) — opcjonalne. Zwraca tylko zdefiniowane,
// poprawne liczby w zakresie (Firebase nie przyjmuje undefined, więc pomijamy puste).
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

export const useFirebaseWorkoutReads = (userId: string) => {
  const subscribe = useCallback((listener: () => void) => subscribeWorkoutReads(userId, listener), [userId]);
  const getSnapshot = useCallback(() => getWorkoutReadSnapshot(userId), [userId]);
  const getServerSnapshot = useCallback(() => getWorkoutReadSnapshot(''), []);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
};

type FirebaseWorkoutReads = ReturnType<typeof useFirebaseWorkoutReads>;

export const useFirebaseWorkoutActions = (
  userId: string,
  { workouts, measurements }: Pick<FirebaseWorkoutReads, 'workouts' | 'measurements'>,
) => {
  const { t } = useTranslation();

  const createWorkoutSession = useCallback(async (dayId: string, date?: string, cycleId?: string): Promise<{ session: WorkoutSession | null; error?: string; existing?: boolean; provisional?: boolean }> => {
    const workoutDate = date || formatLocalDate(new Date());
    const sessionId = buildWorkoutSessionId(userId, dayId, workoutDate);

    // Check if workout for this date already exists (prevent duplicates)
    const existingWorkout = workouts.find(w => w.id === sessionId || (w.dayId === dayId && w.date === workoutDate));
    if (existingWorkout) {
      if (cycleId && !existingWorkout.cycleId) {
        try {
          const workoutRef = doc(db, WORKOUTS_COLLECTION, existingWorkout.id);
          const repaired = await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(workoutRef);
            if (!snapshot.exists()) throw new Error('WORKOUT_NOT_FOUND');
            const current = { id: snapshot.id, ...snapshot.data() } as WorkoutSession;
            if (current.userId !== userId || current.dayId !== dayId || current.date !== workoutDate) {
              throw new Error('WORKOUT_IDENTITY_MISMATCH');
            }
            if (current.cycleId && current.cycleId !== cycleId) {
              throw new Error('WORKOUT_CYCLE_CONFLICT');
            }
            if (current.cycleId === cycleId) return current;

            const revision = Math.max(0, Math.floor(current.revision ?? 0)) + 1;
            transaction.update(workoutRef, { cycleId, revision });
            return { ...current, cycleId, revision };
          });
          return {
            session: repaired,
            existing: true,
          };
        } catch (err) {
          console.error('Error attaching cycleId to existing workout:', err);
        }
      }
      return { session: existingWorkout, existing: true };
    }

    const createdAt = Date.now();
    const session: WorkoutSession = {
      id: sessionId,
      userId,
      dayId,
      date: workoutDate,
      exercises: [],
      completed: false,
      updatedAt: createdAt,
      revision: 0,
      ...(cycleId && { cycleId }),
    };

    try {
      const workoutRef = doc(db, WORKOUTS_COLLECTION, session.id);
      const transactionResult = await runTransaction(db, async (transaction) => {
        const existingSnapshot = await transaction.get(workoutRef);
        if (existingSnapshot.exists()) {
          return { session: { id: existingSnapshot.id, ...existingSnapshot.data() } as WorkoutSession, existing: true };
        }

        transaction.set(workoutRef, session);
        return { session, existing: false };
      });
      return transactionResult;
    } catch (err) {
      console.error('Error creating workout:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { session: null, error: errorMessage };
    }
  }, [workouts, userId, t]);

  const createOfflineWorkoutSession = useCallback((dayId: string, date?: string, cycleId?: string): WorkoutSession => {
    const workoutDate = date || formatLocalDate(new Date());
    return createProvisionalWorkoutSession(userId, dayId, workoutDate, cycleId);
  }, [userId]);

  const updateExerciseProgress = useCallback(async (
    sessionId: string,
    exerciseId: string,
    sets: SetData[],
    notes?: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) {
      return { success: false, error: t('err.noSession') };
    }

    try {
      // Pobierz aktualny dokument z Firebase (nie z lokalnego state!)
      const workoutRef = doc(db, WORKOUTS_COLLECTION, sessionId);
      const workoutSnap = await getDoc(workoutRef);

      if (!workoutSnap.exists()) {
        console.error('Workout not found in Firebase:', sessionId);
        return { success: false, error: t('err.workoutNotFound') };
      }

      const workout = workoutSnap.data() as WorkoutSession;

      // Sanitize and clamp sets
      const sanitizedSets = sets.map(clampSet);

      // Firebase doesn't accept undefined values - only include notes if defined
      const newExercise: ExerciseProgress = {
        exerciseId,
        sets: sanitizedSets,
        ...(notes !== undefined && { notes }),
        ...(name && { name }),
      };

      const existingIndex = workout.exercises.findIndex(e => e.exerciseId === exerciseId);
      const newExercises = existingIndex >= 0
        ? workout.exercises.map((e, i) => i === existingIndex ? newExercise : e)
        : [...workout.exercises, newExercise];

      // Sanitize and clamp entire exercises array (zachowaj snapshot nazwy każdego ćwiczenia)
      const cleanExercises = newExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(clampSet),
        ...(ex.notes !== undefined && { notes: String(ex.notes).slice(0, 2000) }),
        ...(ex.name && { name: String(ex.name).slice(0, 200) }),
        ...cleanMetrics(ex),
      }));

      await updateDoc(workoutRef, { exercises: cleanExercises });
      return { success: true };
    } catch (err) {
      console.error('Error updating exercise:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownSaveError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  const completeWorkout = useCallback(async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), {
        completed: true
      });
      return { success: true };
    } catch (err) {
      console.error('Error completing workout:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  const updateSkippedExercises = useCallback(async (sessionId: string, skippedExercises: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) return { success: false, error: t('err.noSessionId') };
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), { skippedExercises });
      return { success: true };
    } catch (err) {
      console.error('Error updating skipped exercises:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  const updateWorkoutNotes = useCallback(async (sessionId: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) return { success: false, error: t('err.noSessionId') };
    try {
      await updateDoc(doc(db, WORKOUTS_COLLECTION, sessionId), { notes });
      return { success: true };
    } catch (err) {
      console.error('Error updating workout notes:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  const getWorkoutsByDay = useCallback((dayId: string) => {
    return workouts.filter(w => w.dayId === dayId).sort((a, b) =>
      parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    );
  }, [workouts]);

  const getTodaysWorkout = useCallback((dayId: string) => {
    const today = formatLocalDate(new Date());
    const todaysWorkouts = workouts.filter(w => w.dayId === dayId && w.date === today);

    if (todaysWorkouts.length === 0) return undefined;
    if (todaysWorkouts.length === 1) return todaysWorkouts[0];

    return todaysWorkouts.sort((a, b) => {
      const aHasExercises = a.exercises.length > 0;
      const bHasExercises = b.exercises.length > 0;
      if (aHasExercises && !bHasExercises) return -1;
      if (!aHasExercises && bHasExercises) return 1;
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return b.id.localeCompare(a.id);
    })[0];
  }, [workouts]);

  const getLatestWorkout = useCallback((dayId: string) => {
    const dayWorkouts = getWorkoutsByDay(dayId);
    return dayWorkouts[0];
  }, [getWorkoutsByDay]);

  const addMeasurement = useCallback(async (measurement: Omit<BodyMeasurement, 'id' | 'userId'>): Promise<{ measurement: BodyMeasurement | null; error?: string }> => {
    const id = `measurement-${Date.now()}`;
    if (!validateMeasurement(measurement).valid) return { measurement: null, error: 'INVALID_MEASUREMENT' };

    // Sanitize: remove undefined values (Firebase doesn't accept them)
    const sanitized: Record<string, string | number> = { id, userId, date: measurement.date };
    for (const [key, value] of Object.entries(measurement)) {
      if (value !== undefined && key !== 'id' && key !== 'userId') {
        sanitized[key] = value;
      }
    }

    try {
      await setDoc(doc(db, MEASUREMENTS_COLLECTION, id), sanitized);
      return { measurement: { ...sanitized } as unknown as BodyMeasurement };
    } catch (err) {
      console.error('Error adding measurement:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { measurement: null, error: errorMessage };
    }
  }, [userId, t]);

  const getLatestMeasurement = useCallback(() => {
    // Najnowszy pomiar z faktycznymi danymi (measurements jest desc po dacie). Pomijamy
    // puste/częściowe rekordy, by formularz prefillował się sensownymi wartościami,
    // a nie pustkami (gdy najnowszy wpis nie ma jeszcze wypełnionych pól).
    const hasValue = (m: BodyMeasurement) =>
      m.weight != null || m.armLeft != null || m.armRight != null || m.chest != null ||
      m.waist != null || m.hips != null || m.thighLeft != null || m.thighRight != null ||
      m.calfLeft != null || m.calfRight != null;
    return measurements.find(hasValue) ?? measurements[0];
  }, [measurements]);

  const getTotalWeight = useCallback(() => {
    return workouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal, exercise) => {
        return exTotal + exercise.sets.reduce((setTotal, set) => {
          return setTotal + (set.completed ? set.reps * set.weight : 0);
        }, 0);
      }, 0);
    }, 0);
  }, [workouts]);

  const getCompletedWorkoutsCount = useCallback(() => {
    return workouts.filter(w => w.completed).length;
  }, [workouts]);

  // Export data to JSON (pełna kopia: treningi + pomiary + opcjonalnie plan i cykle)
  const exportData = useCallback((extras?: { trainingPlan?: unknown; planCycles?: unknown[] }) => {
    const data = {
      schemaVersion: 2,
      workouts,
      measurements,
      ...(extras?.trainingPlan ? { trainingPlan: extras.trainingPlan } : {}),
      ...(extras?.planCycles && extras.planCycles.length > 0 ? { planCycles: extras.planCycles } : {}),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }, [workouts, measurements]);

  // Import data from JSON (with schema validation)
  const importData = useCallback(async (jsonString: string) => {
    let data: {
      workouts?: unknown[];
      measurements?: unknown[];
      trainingPlan?: { days?: unknown; durationWeeks?: unknown; startDate?: unknown };
      planCycles?: unknown[];
    };
    try {
      data = JSON.parse(jsonString);
    } catch (err) {
      console.error('Error parsing import file:', err);
      return { success: false, message: t('data.importError') };
    }

    let imported = 0;
    try {
      const ops: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];

      if (data.workouts && Array.isArray(data.workouts)) {
        for (const workout of data.workouts as Array<Record<string, unknown>>) {
          if (!workout.id || typeof workout.id !== 'string') continue;
          if (!workout.date || typeof workout.date !== 'string') continue;
          // Whitelist only known fields
          const safe: Record<string, unknown> = {
            id: String(workout.id).slice(0, 100),
            userId,
            dayId: String(workout.dayId || '').slice(0, 50),
            date: String(workout.date).slice(0, 10),
            completed: !!workout.completed,
            ...(workout.notes ? { notes: String(workout.notes).slice(0, 5000) } : {}),
            ...(workout.cycleId ? { cycleId: String(workout.cycleId).slice(0, 100) } : {}),
            ...(workout.dayName ? { dayName: String(workout.dayName).slice(0, 200) } : {}),
            ...(workout.dayFocus ? { dayFocus: String(workout.dayFocus).slice(0, 200) } : {}),
            ...(typeof workout.durationSec === 'number' && workout.durationSec > 0 && { durationSec: Math.floor(workout.durationSec) }),
            ...(typeof workout.startedAt === 'number' && workout.startedAt > 0 && { startedAt: Math.floor(workout.startedAt) }),
            ...(typeof workout.completedAt === 'number' && workout.completedAt > 0 && { completedAt: Math.floor(workout.completedAt) }),
            // updatedAt/revision zachowane — bez nich detekcja konfliktów zapisu nie działa po imporcie.
            ...(typeof workout.updatedAt === 'number' && workout.updatedAt > 0 && { updatedAt: Math.floor(workout.updatedAt) }),
            ...(typeof workout.revision === 'number' && workout.revision > 0 && { revision: Math.floor(workout.revision) }),
            ...(Array.isArray(workout.skippedExercises) && { skippedExercises: workout.skippedExercises.filter((s: unknown) => typeof s === 'string').slice(0, 50) }),
          };
          if (Array.isArray(workout.exercises)) {
            safe.exercises = workout.exercises.slice(0, 50).map((ex: { exerciseId?: string; sets?: unknown[]; notes?: string; name?: string; rpe?: number; pain?: number; quality?: number }) => ({
              exerciseId: String(ex.exerciseId || '').slice(0, 100),
              sets: Array.isArray(ex.sets) ? ex.sets.slice(0, 20).map((s) => clampSet(s as Partial<SetData>)) : [],
              ...(ex.notes && { notes: String(ex.notes).slice(0, 2000) }),
              ...(ex.name && { name: String(ex.name).slice(0, 200) }),
              ...cleanMetrics(ex),
            }));
          } else {
            safe.exercises = [];
          }
          ops.push({ collection: WORKOUTS_COLLECTION, id: safe.id as string, data: safe });
        }
      }

      if (data.measurements && Array.isArray(data.measurements)) {
        for (const m of data.measurements as Array<Record<string, unknown>>) {
          if (!m.id || typeof m.id !== 'string') continue;
          if (!m.date || typeof m.date !== 'string') continue;
          const safe: Record<string, string | number> = {
            id: String(m.id).slice(0, 100),
            userId,
            date: String(m.date).slice(0, 10),
          };
          for (const field of Object.keys(MEASUREMENT_LIMITS)) {
            if (m[field] !== undefined) safe[field] = m[field] as number;
          }
          if (!validateMeasurement({ ...safe, date: String(safe.date) }).valid) continue;
          ops.push({ collection: MEASUREMENTS_COLLECTION, id: safe.id as string, data: safe });
        }
      }

      if (data.planCycles && Array.isArray(data.planCycles)) {
        for (const cycle of data.planCycles as Array<Record<string, unknown>>) {
          if (!cycle || typeof cycle.id !== 'string' || !cycle.id) continue;
          ops.push({ collection: 'plan_cycles', id: cycle.id.slice(0, 100), data: { ...cycle, userId } });
        }
      }

      // Batch po 400 (limit Firestore: 500 operacji) — bez twardego limitu liczby rekordów.
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = ops.slice(i, i + 400);
        chunk.forEach((op) => batch.set(doc(db, op.collection, op.id), op.data));
        await batch.commit();
        imported += chunk.length;
      }

      const tp = data.trainingPlan;
      if (tp && typeof tp === 'object' && Array.isArray(tp.days) && tp.days.length > 0) {
        await setDoc(doc(db, 'training_plans', userId), {
          days: tp.days,
          durationWeeks: typeof tp.durationWeeks === 'number' ? tp.durationWeeks : 12,
          ...(typeof tp.startDate === 'string' ? { startDate: tp.startDate.slice(0, 10) } : {}),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        imported++;
      }

      return { success: true, message: t('data.imported', { n: imported }) };
    } catch (err) {
      console.error('Error importing data:', err);
      return { success: false, message: t('data.importWriteError', { n: imported }) };
    }
  }, [userId, t]);

  // Delete a specific workout (for cleanup)
  const deleteWorkout = useCallback(async (workoutId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting workout:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  // Cleanup empty/duplicate workouts
  const cleanupEmptyWorkouts = useCallback(async (): Promise<{ deleted: number; error?: string }> => {
    try {
      const grouped = new Map<string, WorkoutSession[]>();
      workouts.forEach(w => {
        const key = `${w.date}-${w.dayId}`;
        const existing = grouped.get(key) || [];
        existing.push(w);
        grouped.set(key, existing);
      });

      let deleted = 0;

      for (const [key, group] of grouped) {
        if (group.length <= 1) continue;

        const sorted = [...group].sort((a, b) => {
          const aHasExercises = a.exercises.length > 0;
          const bHasExercises = b.exercises.length > 0;
          if (aHasExercises && !bHasExercises) return -1;
          if (!aHasExercises && bHasExercises) return 1;
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return b.id.localeCompare(a.id);
        });

        const toDelete = sorted.slice(1);
        for (const workout of toDelete) {
          await deleteDoc(doc(db, WORKOUTS_COLLECTION, workout.id));
          deleted++;
        }
      }

      return { deleted };
    } catch (err) {
      console.error('Error cleaning up workouts:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { deleted: 0, error: errorMessage };
    }
  }, [workouts, t]);

  // Jednorazowa naprawa historycznych treningów: dopisuje cycleId + snapshot nazw (ćwiczeń i dnia)
  // ze zarchiwizowanych cykli. Idempotentna — pomija treningi, które już mają komplet danych.
  const backfillHistoricalWorkouts = useCallback(async (
    allCycles: PlanCycle[],
  ): Promise<{ updated: number; scanned: number; error?: string }> => {
    if (!userId) return { updated: 0, scanned: 0, error: t('err.noUserId') };

    try {
      const cyclesForRepair = allCycles.length > 0
        ? allCycles
        : await (async () => {
          const snap = await getDocs(query(
            collection(db, 'plan_cycles'),
            where('userId', '==', userId),
          ));
          return snap.docs.map(cycleDoc => ({ id: cycleDoc.id, ...cycleDoc.data() } as PlanCycle));
        })();
      const resolver = buildWorkoutResolver([], cyclesForRepair);
      let updated = 0;
      for (const w of workouts) {
        const matchedCycle = w.cycleId
          ? cyclesForRepair.find(c => c.id === w.cycleId)
          : cyclesForRepair.find(c => w.date >= c.startDate && (!c.endDate || w.date <= c.endDate));

        const update: Record<string, unknown> = {};

        // 1. Brakujący cycleId — przypisz pasujący cykl (po zakresie dat).
        if (!w.cycleId && matchedCycle) update.cycleId = matchedCycle.id;

        // 2. Brakująca etykieta dnia — uzupełnij ze snapshotu cyklu (jeśli resolver coś realnego zwróci).
        if (!w.dayName) {
          const label = resolver.resolveDayLabel(w);
          if (label.dayName && label.dayName !== w.dayId) {
            update.dayName = label.dayName;
            update.dayFocus = label.focus;
          }
        }

        // 3. Brakujące nazwy ćwiczeń — dopisz snapshot, ale tylko gdy resolver zna realną nazwę.
        if (w.exercises.some(ex => !ex.name)) {
          let changedAny = false;
          const nextExercises = w.exercises.map(ex => {
            if (ex.name) return ex;
            const resolved = resolver.resolveExerciseName(w, ex.exerciseId);
            if (resolved && resolved !== ex.exerciseId) {
              changedAny = true;
              return { ...ex, name: resolved };
            }
            return ex;
          }).map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets.map(clampSet),
            ...(ex.notes !== undefined && { notes: String(ex.notes).slice(0, 2000) }),
            ...(ex.name && { name: String(ex.name).slice(0, 200) }),
            ...cleanMetrics(ex),
          }));
          if (changedAny) update.exercises = nextExercises;
        }

        if (Object.keys(update).length === 0) continue;
        await updateDoc(doc(db, WORKOUTS_COLLECTION, w.id), update as UpdateData<Record<string, unknown>>);
        updated += 1;
      }
      return { updated, scanned: workouts.length };
    } catch (err) {
      console.error('Error backfilling workouts:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { updated: 0, scanned: workouts.length, error: errorMessage };
    }
  }, [userId, workouts, t]);

  const batchSaveWorkout = useCallback(async (
    sessionId: string,
    exercises: { exerciseId: string; sets: SetData[]; notes?: string; name?: string; rpe?: number; pain?: number; quality?: number }[],
    // expectedRevision wymagane: null = świadome pominięcie preconditionu (tylko migracje/naprawy danych)
    options: { cycleId?: string; notes?: string; skippedExercises?: string[]; completed?: boolean; dayName?: string; dayFocus?: string; durationSec?: number; startedAt?: number; completedAt?: number; expectedRevision: number | null }
  ): Promise<{ success: boolean; error?: string; updatedAt?: number; revision?: number }> => {
    if (!sessionId) return { success: false, error: t('err.noSessionId') };

    try {
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
      if (options?.cycleId) updateData.cycleId = options.cycleId;
      if (options?.notes !== undefined) updateData.notes = String(options.notes).slice(0, 5000);
      if (options?.skippedExercises) updateData.skippedExercises = options.skippedExercises;
      if (options?.completed) {
        updateData.completed = true;
        updateData.completedAt = options.completedAt ?? Date.now(); // stabilny przy retry finalnego syncu
      }
      if (options?.dayName) updateData.dayName = String(options.dayName).slice(0, 200);
      if (options?.dayFocus) updateData.dayFocus = String(options.dayFocus).slice(0, 200);
      if (typeof options?.durationSec === 'number' && options.durationSec > 0) updateData.durationSec = Math.floor(options.durationSec);
      if (typeof options?.startedAt === 'number' && options.startedAt > 0) updateData.startedAt = options.startedAt;

      const syncState = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(workoutRef);
        if (!snapshot.exists()) {
          throw new Error('WORKOUT_NOT_FOUND');
        }

        const current = snapshot.data() as WorkoutSession;
        if (hasWorkoutWriteConflict(current, options?.expectedRevision)) {
          throw new Error('WORKOUT_CONFLICT');
        }

        const revision = (typeof current.revision === 'number' ? current.revision : 0) + 1;
        transaction.update(workoutRef, { ...updateData, revision } as UpdateData<Record<string, unknown>>);
        return { updatedAt: updateTime, revision };
      });
      return { success: true, ...syncState };
    } catch (err) {
      console.error('Error batch saving workout:', err);
      const errorMessage = err instanceof Error ? err.message : t('common.unknownSaveError');
      return { success: false, error: errorMessage };
    }
  }, [t]);

  const getWorkoutSessionFromServer = useCallback(async (sessionId: string): Promise<WorkoutSession | null> => {
    if (!sessionId) return null;

    const snapshot = await getDocFromServer(doc(db, WORKOUTS_COLLECTION, sessionId));
    if (!snapshot.exists()) return null;

    const workout = { id: snapshot.id, ...snapshot.data() } as WorkoutSession;
    if (workout.userId !== userId) return null;
    return workout;
  }, [userId]);

  return {
    createWorkoutSession,
    createOfflineWorkoutSession,
    updateExerciseProgress,
    completeWorkout,
    batchSaveWorkout,
    getWorkoutSessionFromServer,
    getWorkoutsByDay,
    getTodaysWorkout,
    getLatestWorkout,
    addMeasurement,
    getLatestMeasurement,
    getTotalWeight,
    getCompletedWorkoutsCount,
    updateWorkoutNotes,
    updateSkippedExercises,
    exportData,
    importData,
    deleteWorkout,
    cleanupEmptyWorkouts,
    backfillHistoricalWorkouts,
    isProvisionalWorkoutSessionId,
  };
};

export const useFirebaseWorkouts = (userId: string) => {
  const reads = useFirebaseWorkoutReads(userId);
  const actions = useFirebaseWorkoutActions(userId, reads);

  return {
    ...reads,
    ...actions,
  };
};

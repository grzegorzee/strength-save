// Wysyła na Apple Watch PODGLĄD dzisiejszego treningu zanim sesja wystartuje
// (zegarek pokazuje plan + przycisk "Rozpocznij trening"). Gdy jest aktywny
// draft, nie wysyłamy nic — właścicielem stanu jest wtedy WorkoutDay
// (useWatchWorkoutSync, payload active:true). Dzień wolny/ukończony → noWorkout.
import { useEffect } from 'react';
import type { TrainingDay } from '@/data/trainingPlan';
import type { SetData, WorkoutSession } from '@/types';
import { createPrefilledSets, parseSetCount, isBodyweightExercise } from '@/lib/exercise-utils';
import { formatLocalDate } from '@/lib/utils';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { isWatchBridgeSupported, sendWorkoutToWatch } from '@/lib/watch-bridge';

interface UseWatchPlanPreviewOptions {
  uid: string | null;
  /** 'training' = jest trening do zrobienia; inne typy → noWorkout. */
  type: 'training' | 'completed' | 'rest';
  day?: TrainingDay | null;
  dateStr?: string;
  workouts: WorkoutSession[];
}

const SEND_DEBOUNCE_MS = 1200;

export function useWatchPlanPreview({ uid, type, day, dateStr, workouts }: UseWatchPlanPreviewOptions) {
  useEffect(() => {
    if (!isWatchBridgeSupported() || !uid) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const today = dateStr ?? formatLocalDate(new Date());

        if (type !== 'training' || !day) {
          await sendWorkoutToWatch({ type: 'noWorkout', date: today, sentAt: Date.now() });
          return;
        }

        // Aktywny draft dzisiejszego treningu → wyślij STAN Z DRAFTU (active:true),
        // żeby zegarek był aktualny nawet gdy WorkoutDay nie jest otwarty.
        const draft = await workoutDraftDb.loadActiveDraft(uid).catch(() => null);
        if (draft && draft.dayId === day.id && draft.date === today && !draft.completedLocally) {
          await sendWorkoutToWatch({
            type: 'todayWorkout',
            date: today,
            dayId: day.id,
            dayName: day.dayName,
            focus: day.focus,
            sentAt: Date.now(),
            active: true,
            exercises: day.exercises.map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
              setsLabel: exercise.sets,
              sets: draft.exerciseSets[exercise.id] ?? [],
            })),
          });
          return;
        }

        // Prefill jak w WorkoutDay: ostatni ukończony trening tego dnia,
        // fallback po nazwie ćwiczenia z całej historii.
        const previousWorkout = workouts.find(w =>
          w.dayId === day.id && w.date < today && w.completed && w.exercises.length > 0
        );
        const byName = new Map<string, SetData[]>();
        const sorted = workouts
          .filter(w => w.completed && w.date < today && w.exercises.length > 0)
          .sort((a, b) => b.date.localeCompare(a.date));
        for (const w of sorted) {
          for (const ex of w.exercises) {
            if (!ex.name || byName.has(ex.name) || !ex.sets?.length) continue;
            byName.set(ex.name, ex.sets);
          }
        }
        const getPreviousSets = (exerciseId: string, exerciseName?: string): SetData[] | undefined => {
          const ex = previousWorkout?.exercises.find(e => e.exerciseId === exerciseId);
          if (ex?.sets && ex.sets.length > 0) return ex.sets;
          return exerciseName ? byName.get(exerciseName) : undefined;
        };

        await sendWorkoutToWatch({
          type: 'todayWorkout',
          date: today,
          dayId: day.id,
          dayName: day.dayName,
          focus: day.focus,
          sentAt: Date.now(),
          active: false,
          exercises: day.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            setsLabel: exercise.sets,
            sets: createPrefilledSets(
              parseSetCount(exercise.sets),
              getPreviousSets(exercise.id, exercise.name),
              isBodyweightExercise(exercise.name)
            ),
          })),
        });
      })();
    }, SEND_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [uid, type, day, dateStr, workouts]);
}

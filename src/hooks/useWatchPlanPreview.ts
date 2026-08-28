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
import {
  getOrCreateWatchPhoneDeviceId,
  getRestDefaultSeconds,
  getRestSettingsForWatch,
  getUnitSystemForWatch,
  getWatchAvailability,
  isWatchBridgeSupported,
  sendWorkoutToWatch,
} from '@/lib/watch-bridge';
import { buildRecentWatchExercises } from '@/lib/watch-recent';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { useTranslation } from '@/contexts/LanguageContext';
import { WORKOUT_PROTOCOL_VERSION } from '@/lib/workout-protocol';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { getTrackingType } from '@/lib/set-tracking';
import type { WatchCapabilitySnapshot } from '@/lib/device-management';
import { applyLastKnownWatchLink, saveAppleWatchLinkedState } from '@/lib/device-management';
import { reportAppleWatchStatus } from '@/lib/garmin-api';

interface UseWatchPlanPreviewOptions {
  uid: string | null;
  /** 'training' = jest trening do zrobienia; inne typy → noWorkout. */
  type: 'training' | 'completed' | 'rest' | 'preStart';
  day?: TrainingDay | null;
  dateStr?: string;
  workouts: WorkoutSession[];
  capability?: WatchCapabilitySnapshot;
  /** Brak/false zachowuje trening Watch, ale wyłącza odczyt i zapis HealthKit. */
  healthFeaturesEnabled?: boolean;
}

const SEND_DEBOUNCE_MS = 1200;

const watchTrackingForName = (name: string) => {
  const library = exerciseLibrary.find((exercise) => exercise.name === name);
  return getTrackingType(library ?? { isBodyweight: isBodyweightExercise(name) });
};

export function useWatchPlanPreview({ uid, type, day, dateStr, workouts, capability, healthFeaturesEnabled }: UseWatchPlanPreviewOptions) {
  // Z164: zegarek dostaje język UI (kontrakt jak w useWatchWorkoutSync).
  const { lang } = useTranslation();

  useEffect(() => {
    if (!isWatchBridgeSupported() || !uid) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const today = dateStr ?? formatLocalDate(new Date());
        const protocol = {
          v: WORKOUT_PROTOCOL_VERSION,
          protocolVersion: WORKOUT_PROTOCOL_VERSION,
          uid,
          deviceId: getOrCreateWatchPhoneDeviceId(),
          healthFeaturesEnabled: healthFeaturesEnabled === true,
        } as const;
        let inheritedCapability = applyLastKnownWatchLink(capability);
        const watchStatus = await getWatchAvailability();
        if (watchStatus?.paired && watchStatus.watchAppInstalled && watchStatus.deviceId) {
          try {
            const server = await reportAppleWatchStatus({
              deviceId: watchStatus.deviceId,
              label: watchStatus.label || 'Apple Watch',
              paired: true,
              watchAppInstalled: true,
              reachable: watchStatus.reachable,
              pendingEvents: Math.max(0, Math.floor(watchStatus.pendingEvents ?? 0)),
              healthStatus: watchStatus.healthStatus ?? 'unknown',
              lastSyncAt: watchStatus.lastSyncAt ?? null,
            });
            saveAppleWatchLinkedState(server.linked);
            if (inheritedCapability) {
              inheritedCapability = { ...inheritedCapability, active: inheritedCapability.active && server.linked };
            }
          } catch {
            // Offline: last server-confirmed link state remains authoritative locally.
          }
        }
        const rest = getRestSettingsForWatch();
        const recentExercises = buildRecentWatchExercises(workouts);
        const timerSettings = FEATURE_FLAGS.workoutTimers ? {
          restSeconds: getRestDefaultSeconds(),
          restBetweenSetsSeconds: rest.betweenSetsSeconds,
          restBetweenExercisesSeconds: rest.betweenExercisesSeconds,
        } : {};

        if (type !== 'training' || !day) {
          await sendWorkoutToWatch({
            ...protocol, type: 'noWorkout', date: today, sentAt: Date.now(),
            timersEnabled: FEATURE_FLAGS.workoutTimers,
            ...timerSettings,
            unit: getUnitSystemForWatch(),
            lang,
            capability: inheritedCapability,
            recentExercises,
          });
          return;
        }

        // Aktywny draft dzisiejszego treningu → wyślij STAN Z DRAFTU (active:true),
        // żeby zegarek był aktualny nawet gdy WorkoutDay nie jest otwarty.
        const draft = await workoutDraftDb.loadActiveDraft(uid).catch(() => null);
        if (draft && draft.dayId === day.id && draft.date === today && !draft.completedLocally) {
          await sendWorkoutToWatch({
            ...protocol,
            type: 'todayWorkout',
            date: today,
            sessionId: draft.sessionId,
            dayId: day.id,
            dayName: day.dayName,
            focus: day.focus,
            sentAt: Date.now(),
            active: true,
            timersEnabled: FEATURE_FLAGS.workoutTimers,
            ...timerSettings,
            unit: getUnitSystemForWatch(),
            lang,
            capability: inheritedCapability,
            recentExercises,
            exercises: day.exercises.map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
              setsLabel: exercise.sets,
              trackingType: watchTrackingForName(exercise.name),
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
          ...protocol,
          type: 'todayWorkout',
          date: today,
          dayId: day.id,
          dayName: day.dayName,
          focus: day.focus,
          sentAt: Date.now(),
          active: false,
          timersEnabled: FEATURE_FLAGS.workoutTimers,
          ...timerSettings,
          unit: getUnitSystemForWatch(),
          lang,
          capability: inheritedCapability,
          recentExercises,
          exercises: day.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            setsLabel: exercise.sets,
            trackingType: watchTrackingForName(exercise.name),
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
  }, [uid, type, day, dateStr, workouts, lang, capability, healthFeaturesEnabled]);
}

import { createContext, useContext, type ReactNode } from 'react';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import {
  armRestEndNotification,
  armSetCountdownNotification,
  cancelRestEndNotification,
  cancelSetCountdownNotification,
} from '@/lib/rest-notification';

// Trening próbny (przewodnik nowego konta, 2026-09-30): wspólne komponenty
// sesji (ExerciseCard, RestBar, SetCountdown) wykonują efekty uboczne na
// ZEWNĄTRZ apki (telemetria treningowa, powiadomienia systemowe przerwy)
// wyłącznie przez ten adapter. Prawdziwy trening dostaje domyślną implementację,
// trening próbny owija drzewo w PracticeWorkoutEffects (no-op). Jedno miejsce
// zamiast flag rozsianych po komponentach; test izolacji spy'uje moduły pod
// spodem i wymaga zera wywołań.
export interface WorkoutEffects {
  /** Tryb próbny: komponenty mogą pokazać opis zamiast realnej akcji. */
  practice: boolean;
  trackSetChecked: (uid: string) => void;
  armRestEndNotification: (deadlineAt: number, title: string, body: string) => void;
  cancelRestEndNotification: () => Promise<void>;
  armSetCountdownNotification: (deadlineAt: number, title: string, body: string) => void;
  cancelSetCountdownNotification: () => Promise<void>;
}

const realEffects: WorkoutEffects = {
  practice: false,
  trackSetChecked: (uid) => trackTelemetryEvent(uid, 'action_set_checked'),
  armRestEndNotification,
  cancelRestEndNotification,
  armSetCountdownNotification,
  cancelSetCountdownNotification,
};

export const practiceEffects: WorkoutEffects = {
  practice: true,
  trackSetChecked: () => undefined,
  armRestEndNotification: () => undefined,
  cancelRestEndNotification: () => Promise.resolve(),
  armSetCountdownNotification: () => undefined,
  cancelSetCountdownNotification: () => Promise.resolve(),
};

const WorkoutEffectsContext = createContext<WorkoutEffects>(realEffects);

export const PracticeWorkoutEffects = ({ children }: { children: ReactNode }) => (
  <WorkoutEffectsContext.Provider value={practiceEffects}>{children}</WorkoutEffectsContext.Provider>
);

export const useWorkoutEffects = (): WorkoutEffects => useContext(WorkoutEffectsContext);

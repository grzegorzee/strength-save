import { createContext, useContext, type ReactNode } from 'react';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import {
  armRestEndNotification,
  armSetCountdownNotification,
  cancelRestEndNotification,
  cancelSetCountdownNotification,
} from '@/lib/rest-notification';
import type { HistoryEmailRange } from '@/lib/email-workout';

// Trening próbny (przewodnik nowego konta, 2026-09-30): wspólne komponenty
// sesji (ExerciseCard, RestBar, SetCountdown, EmailWorkoutDialog) wykonują
// efekty uboczne na ZEWNĄTRZ apki (telemetria treningowa, powiadomienia
// systemowe przerwy, wysyłka maila, zapis adresu trenera) wyłącznie przez ten
// adapter. Prawdziwy trening dostaje domyślną implementację, trening próbny
// owija drzewo w PracticeWorkoutEffects (no-op / symulacja). Jedno miejsce
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
  sendWorkoutEmail: (workoutId: string, to: string, lang: string, trainerName?: string) => Promise<void>;
  sendHistoryEmail: (to: string, lang: string, range: HistoryEmailRange, trainerName?: string) => Promise<void>;
  saveTrainer: (uid: string, email: string, name: string) => Promise<void>;
}

// Moduły z Firebase ładowane leniwie: adapter siedzi pod ExerciseCard/RestBar,
// więc statyczny import SDK ciągnąłby go do każdego drzewa i testu.
const realEffects: WorkoutEffects = {
  practice: false,
  trackSetChecked: (uid) => trackTelemetryEvent(uid, 'action_set_checked'),
  armRestEndNotification,
  cancelRestEndNotification,
  armSetCountdownNotification,
  cancelSetCountdownNotification,
  sendWorkoutEmail: async (...args) => (await import('@/lib/email-workout')).sendWorkoutEmail(...args),
  sendHistoryEmail: async (...args) => (await import('@/lib/email-workout')).sendHistoryEmail(...args),
  saveTrainer: async (uid, email, name) => {
    const [{ deleteField, doc, updateDoc }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('@/lib/firebase'),
    ]);
    await updateDoc(doc(db, 'users', uid), {
      'preferences.trainerEmail': email,
      'preferences.trainerName': name || deleteField(),
    });
  },
};

/** Symulacja wysyłki w próbie: chwila „Wysyłanie…” jak w produkcji, zero sieci. */
const simulatedSend = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 600); });

export const practiceEffects: WorkoutEffects = {
  practice: true,
  trackSetChecked: () => undefined,
  armRestEndNotification: () => undefined,
  cancelRestEndNotification: () => Promise.resolve(),
  armSetCountdownNotification: () => undefined,
  cancelSetCountdownNotification: () => Promise.resolve(),
  // Ochrona niezmiennika „nic się nie zapisze” oraz reputacji domeny SES
  // (próba nie może wysyłać maili na dowolne adresy wpisane w przewodniku).
  sendWorkoutEmail: () => simulatedSend(),
  sendHistoryEmail: () => simulatedSend(),
  saveTrainer: () => Promise.resolve(),
};

const WorkoutEffectsContext = createContext<WorkoutEffects>(realEffects);

export const PracticeWorkoutEffects = ({ children }: { children: ReactNode }) => (
  <WorkoutEffectsContext.Provider value={practiceEffects}>{children}</WorkoutEffectsContext.Provider>
);

export const useWorkoutEffects = (): WorkoutEffects => useContext(WorkoutEffectsContext);

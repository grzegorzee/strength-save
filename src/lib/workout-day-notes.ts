/**
 * Notatka przypięta do DNIA treningu (T10, feedback 2026-08-20): user planuje
 * coś do przyszłego treningu z Planu ("wziąć pas", "spróbować 80 kg") i widzi
 * to przed startem oraz w trakcie sesji. OSOBNY byt od dayNotes draftu sesji
 * (notatka PO treningu) i od notatek per ćwiczenie (exercise-notes).
 * Klucz = data ISO: przełożenie treningu zostawia notatkę na starej dacie
 * (zaakceptowane w v1).
 */
export interface WorkoutDayNote {
  userId: string;
  /** Data treningu YYYY-MM-DD. */
  date: string;
  note: string;
  updatedAt: number;
}

export const WORKOUT_DAY_NOTE_MAX_LENGTH = 500;

/** Deterministyczny doc id: `${userId}_${dateISO}` — idempotentne zapisy, brak duplikatów. */
export const workoutDayNoteDocId = (userId: string, dateISO: string): string =>
  `${userId}_${dateISO}`;

/** Sanityzacja przed zapisem do Firestore: trim + limit długości, zero undefined. */
export const sanitizeWorkoutDayNote = (input: { note?: string }): { note: string } => ({
  note: (input.note ?? '').trim().slice(0, WORKOUT_DAY_NOTE_MAX_LENGTH),
});

/**
 * T10: karta "Brak zapisanego treningu dla tej daty" tylko dla dat PRZESZŁYCH —
 * dla PRZYSZŁEGO treningu z planu była myląca (to zaplanowany dzień, nie brak).
 */
export const shouldShowNoWorkoutCard = (params: {
  isWorkoutStarted: boolean;
  targetDateISO: string;
  todayISO: string;
}): boolean => !params.isWorkoutStarted && params.targetDateISO < params.todayISO;

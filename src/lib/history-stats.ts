import type { WorkoutSession } from '@/types';
import { detectNewPRs } from '@/lib/pr-utils';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { workoutExercises } from '@/lib/summary-utils';

// Metadane wierszy historii (Z80): czas trwania + liczba PR per sesja,
// liczone RAZ dla całej listy (nie per wiersz w renderze).

/** "1h 12m" / "43m" — kompaktowy czas dla wiersza listy (min. 1m). */
export const formatDurationCompact = (durationSec: number): string => {
  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export interface HistoryRowMeta {
  durationLabel: string | null;
  prCount: number;
}

export const buildHistoryRowMeta = (workouts: WorkoutSession[]): Map<string, HistoryRowMeta> => {
  const meta = new Map<string, HistoryRowMeta>();
  // Chronologicznie: PR sesji liczony względem WCZEŚNIEJSZYCH ukończonych sesji.
  const chronological = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const seen: WorkoutSession[] = [];

  chronological.forEach((w) => {
    let prCount = 0;
    if (w.completed) {
      const names = new Map<string, string>();
      const bodyweightIds = new Set<string>();
      workoutExercises(w).forEach((ex) => {
        if (ex.name) names.set(ex.exerciseId, ex.name);
        if (isBodyweightExercise(ex.name ?? '')) bodyweightIds.add(ex.exerciseId);
      });
      prCount = detectNewPRs(w, seen, names, bodyweightIds).length;
      seen.push(w);
    }
    meta.set(w.id, {
      durationLabel: typeof w.durationSec === 'number' && w.durationSec > 0
        ? formatDurationCompact(w.durationSec)
        : null,
      prCount,
    });
  });

  return meta;
};

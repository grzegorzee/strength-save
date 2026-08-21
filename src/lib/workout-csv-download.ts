// WP-H (X28): logika eksportu CSV wydzielona z ExportWorkoutsDialog, żeby
// Export sheet Historii i dialog Ustawień szły JEDNĄ ścieżką (fetch stron dla
// zakresu + buildWorkoutsCsv + Blob flow działający też w natywnym WKWebView).

import { buildWorkoutsCsv } from '@/lib/workout-csv';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { exportFileName, type ExportRangeBounds } from '@/lib/workout-export-range';
import { fetchWorkoutHistoryPage, type WorkoutHistoryCursor } from '@/lib/workout-read-store';
import type { WorkoutSession } from '@/types';

/** Zakres dat: dociągamy strony aż do końca (limit bezpieczeństwa). */
const MAX_RANGE_PAGES = 20;

export const fetchWorkoutsForBounds = async (
  uid: string,
  bounds: ExportRangeBounds,
): Promise<WorkoutSession[]> => {
  if (bounds.mode === 'lastN') {
    const page = await fetchWorkoutHistoryPage(uid, { completed: true, pageSize: bounds.limit });
    return page.workouts.slice(0, bounds.limit);
  }
  const all: WorkoutSession[] = [];
  let cursor: WorkoutHistoryCursor | null = null;
  for (let i = 0; i < MAX_RANGE_PAGES; i += 1) {
    const page = await fetchWorkoutHistoryPage(uid, {
      fromDate: bounds.fromDate,
      toDate: bounds.toDate,
      completed: true,
      cursor,
    });
    all.push(...page.workouts);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
};

/** Zbudowanie CSV (PR-y z tej samej logiki co wiersze Historii) + pobranie pliku. */
export const downloadWorkoutsCsvFile = (workouts: WorkoutSession[]): void => {
  const meta = buildHistoryRowMeta(workouts);
  const prCounts = Object.fromEntries([...meta].map(([id, m]) => [id, m.prCount]));
  const csv = buildWorkoutsCsv(workouts, prCounts);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(workouts);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

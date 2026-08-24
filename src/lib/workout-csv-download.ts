// WP-H (X28): logika eksportu CSV wydzielona z ExportWorkoutsDialog, żeby
// Export sheet Historii i dialog Ustawień szły JEDNĄ ścieżką (fetch stron dla
// zakresu + buildWorkoutsCsv + Blob flow działający też w natywnym WKWebView).

import { buildWorkoutsCsv } from '@/lib/workout-csv';
import { shareOrDownloadFile } from '@/lib/share-export';
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

/** Zbudowanie CSV (PR-y z tej samej logiki co wiersze Historii) + pobranie pliku.
 * WP-L (X29): przez shareOrDownloadFile — na native <a download> jest martwe
 * (Z179), plik idzie w systemowy share sheet; web pobiera jak dotąd. */
export const downloadWorkoutsCsvFile = async (workouts: WorkoutSession[]): Promise<void> => {
  const meta = buildHistoryRowMeta(workouts);
  const prCounts = Object.fromEntries([...meta].map(([id, m]) => [id, m.prCount]));
  const csv = buildWorkoutsCsv(workouts, prCounts);
  const file = new File([csv], exportFileName(workouts), { type: 'text/csv;charset=utf-8' });
  await shareOrDownloadFile(file);
};

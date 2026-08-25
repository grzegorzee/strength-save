// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport CSV z wyborem zakresu.
// Czysta logika: przekłada wybór usera (chip/cykl/od-do) na granice zapytania.
// Fetch i UI żyją w ExportWorkoutsDialog; tu zero zależności od Firestore.

export type ExportRangeKind = 'week' | 'month' | 'last10' | 'last30' | 'cycle' | 'custom';

export interface ExportRangeInput {
  kind: ExportRangeKind;
  /** kind='cycle': wybrany cykl (plan_cycles) — id do filtra + zakres dat zapytania. */
  cycle?: { id: string; startDate: string; endDate: string };
  /** kind='custom': od–do (puste pole = bez ograniczenia z tej strony). */
  from?: string;
  to?: string;
}

export type ExportRangeBounds =
  | { mode: 'dates'; fromDate: string; toDate: string }
  | { mode: 'lastN'; limit: number }
  /** WP-D (X35a): zapytanie po datach cyklu, wynik przefiltrowany po cycleId
   *  (workoutBelongsToExportCycle) — sesje ad hoc z innego cyklu w tych samych
   *  datach nie wchodzą do eksportu. */
  | { mode: 'cycle'; cycleId: string; fromDate: string; toDate: string };

/**
 * WP-D (X35a): przynależność sesji do eksportowanego cyklu. Ta sama semantyka
 * co assignWorkoutsToCycles (history-cycles): cycleId wygrywa; sesja BEZ
 * cycleId (legacy: import CSV, stare buildy) wchodzi po zakresie dat, który
 * zapewnia już zapytanie. Sesja z cycleId innego cyklu = poza eksportem.
 */
export const workoutBelongsToExportCycle = (
  workout: { cycleId?: string },
  cycleId: string,
): boolean => !workout.cycleId || workout.cycleId === cycleId;

/** date - days dni w formacie YYYY-MM-DD (rachunek w UTC na stringu daty). */
const dateMinusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - days * 86400000).toISOString().slice(0, 10);

/**
 * Granice eksportu dla wyboru usera. `null` = wybór niekompletny albo pusty
 * logicznie (cykl niewybrany, od > do) — przycisk Eksportuj ma być disabled.
 */
export const exportRangeBounds = (range: ExportRangeInput, today: string): ExportRangeBounds | null => {
  switch (range.kind) {
    case 'week':
      return { mode: 'dates', fromDate: dateMinusDays(today, 6), toDate: today };
    case 'month':
      return { mode: 'dates', fromDate: dateMinusDays(today, 29), toDate: today };
    case 'last10':
      return { mode: 'lastN', limit: 10 };
    case 'last30':
      return { mode: 'lastN', limit: 30 };
    case 'cycle':
      if (!range.cycle) return null;
      // Bug 45: aktywny cykl ma endDate '' aż do archiwizacji — bez fallbacku
      // zapytanie szło bez górnej granicy (spójność z WorkoutHistory: endDate || dziś).
      return {
        mode: 'cycle',
        cycleId: range.cycle.id,
        fromDate: range.cycle.startDate,
        toDate: range.cycle.endDate || today,
      };
    case 'custom': {
      const fromDate = range.from || '1970-01-01';
      const toDate = range.to || today;
      if (fromDate > toDate) return null;
      return { mode: 'dates', fromDate, toDate };
    }
  }
};

/** Nazwa pliku wg specyfikacji: strengthsave-treningi-<od>-<do>.csv. */
export const exportFileName = (workouts: Array<{ date: string }>): string => {
  const dates = workouts.map((w) => w.date).sort();
  return `strengthsave-treningi-${dates[0]}-${dates[dates.length - 1]}.csv`;
};

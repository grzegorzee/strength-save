// WP-D (X35a): jedna lista cykli do eksportu dla sheeta Historii i dialogu
// Ustawień/Analityki. Czysta logika: filtr widoczności (isCycleVisibleWithData),
// numeracja "Cykl N" od najstarszego (jak WorkoutHistory.cycleNumberById),
// etykieta "Cykl N · nazwa planu · 1.06 → 24.08 · 47 treningów", domyślny
// wybór = cykl aktywny. Liczba treningów: completed ze stats.totalWorkouts,
// aktywny z listy sesji (ta sama przynależność co eksport).

import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';
import { isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { localizePlanName } from '@/lib/plan-i18n';
import { formatLocalDateLabel } from '@/lib/utils';
import { workoutBelongsToExportCycle } from '@/lib/workout-export-range';
import { dateLocale, type LanguageCode, type TParams, type TranslationKey } from '@/i18n';
import { selectCompletedWorkouts } from '@/lib/completed-workouts';

export interface ExportCycleOption {
  id: string;
  cycle: PlanCycle;
  number: number;
  isActive: boolean;
  workoutCount: number;
  /** "Cykl 2 · Mój plan" (bez nazwy planu: samo "Cykl 2"). */
  title: string;
  /** "1.06 → w toku · 3 treningi". */
  detail: string;
  /** title · detail — jedna linia (Select w dialogu). */
  label: string;
}

export interface ExportCycleOptionsInput {
  cycles: PlanCycle[];
  /** Sesje do policzenia treningów cyklu AKTYWNEGO (stats liczy się dopiero przy archiwizacji). */
  workouts: WorkoutSession[];
  todayISO: string;
  lang: LanguageCode;
  t: (key: TranslationKey, params?: TParams) => string;
}

const workoutsWord = (n: number): TranslationKey => {
  if (n === 1) return 'exportCsv.workoutsOne';
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20);
  return few ? 'exportCsv.workoutsFew' : 'exportCsv.workoutsMany';
};

/** Nazwa planu z odpowiedzi kreatora: własna nazwa, inaczej nazwa szablonu w języku UI, inaczej brak. */
const planNameOf = (cycle: PlanCycle, lang: LanguageCode): string | null => {
  const choice = cycle.choice;
  if (!choice) return null;
  if (choice.planName) return choice.planName;
  if (choice.templateId) return localizePlanName(choice.templateId, '', lang) || null;
  return null;
};

const shortDate = (iso: string, lang: LanguageCode, withYear: boolean): string =>
  formatLocalDateLabel(iso, dateLocale(lang), withYear
    ? { day: 'numeric', month: 'numeric', year: 'numeric' }
    : { day: 'numeric', month: 'numeric' });

/** Sesje należące do cyklu (ukończone, w zakresie dat cyklu, przynależność jak eksport). */
export const countCycleWorkouts = (cycle: PlanCycle, workouts: WorkoutSession[], todayISO: string): number => {
  const toDate = cycle.endDate || todayISO;
  return selectCompletedWorkouts(workouts).filter((workout) =>
    workout.date >= cycle.startDate
    && workout.date <= toDate
    && workoutBelongsToExportCycle(workout, cycle.id)).length;
};

export const buildExportCycleOptions = ({ cycles, workouts, todayISO, lang, t }: ExportCycleOptionsInput): ExportCycleOption[] => {
  const visible = cycles.filter(isCycleVisibleWithData);
  const numberById = new Map(
    [...visible].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((cycle, index) => [cycle.id, index + 1]),
  );
  const currentYear = todayISO.slice(0, 4);
  return [...visible]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((cycle) => {
      const number = numberById.get(cycle.id) ?? 1;
      const isActive = cycle.status === 'active';
      const workoutCount = isActive ? countCycleWorkouts(cycle, workouts, todayISO) : cycle.stats.totalWorkouts;
      const planName = planNameOf(cycle, lang);
      const title = planName ? `${t('history.cycleN', { n: number })} · ${planName}` : t('history.cycleN', { n: number });
      const withYear = cycle.startDate.slice(0, 4) !== currentYear;
      const end = cycle.endDate ? shortDate(cycle.endDate, lang, withYear) : t('exportCsv.cycleOngoing');
      const detail = `${shortDate(cycle.startDate, lang, withYear)} → ${end} · ${t(workoutsWord(workoutCount), { n: workoutCount })}`;
      return { id: cycle.id, cycle, number, isActive, workoutCount, title, detail, label: `${title} · ${detail}` };
    });
};

/** Domyślny wybór: cykl aktywny, inaczej najnowszy; brak cykli = null. */
export const defaultExportCycleId = (options: ExportCycleOption[]): string | null =>
  options.find((option) => option.isActive)?.id ?? options[0]?.id ?? null;

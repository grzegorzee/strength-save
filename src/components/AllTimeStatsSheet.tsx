import { useEffect, useMemo, useState } from 'react';
import { dateLocale } from '@/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { buildAllTimeStats } from '@/lib/all-time-stats';
import { fetchWorkoutRange } from '@/lib/workout-read-store';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { cn } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

interface AllTimeStatsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Baza z listenera (okno recent) — natychmiastowy render bez czekania na sieć. */
  workouts: WorkoutSession[];
  /** Z216: po otwarciu dociągamy PEŁNĄ historię kursorem (okno 120 by zaniżało liczby). */
  uid?: string;
}

const formatDuration = (totalSec: number): string => {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.round((totalSec % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

/**
 * X17D Z139: ekran „Twoje liczby". Prośba usera: po tapnięciu w licznik treningów
 * zobaczyć, ile czasu spędził na siłowni i ile ton podniósł.
 *
 * GRYWALIZACJA TYLKO TUTAJ (twarda zasada 2 planu): ekwiwalenty i zabawa nie mają
 * prawa wejść do ekranu treningu. Brak grywalizacji w logowaniu serii jest
 * wymieniany jako ZALETA Stronga, a odznaki „często tylko rozpraszają".
 */
export const AllTimeStatsSheet = ({ open, onOpenChange, workouts, uid }: AllTimeStatsSheetProps) => {
  const { t, lang } = useTranslation();
  const { fmt } = useUnit();
  // Z216: pełna historia na żądanie — jedno pobranie per otwarcie arkusza.
  // Błąd sieci = zostajemy przy oknie listenera (baza), bez blokowania UI.
  const [fullHistory, setFullHistory] = useState<WorkoutSession[] | null>(null);
  useEffect(() => {
    if (!open || !uid) return;
    let cancelled = false;
    fetchWorkoutRange(uid, { fromDate: '2000-01-01', toDate: '2100-12-31' })
      .then((all) => {
        if (!cancelled && all.length > 0) setFullHistory(all);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, uid]);

  // Liczymy DOPIERO po otwarciu arkusza. Wcześniej `useMemo` biegł przy każdym
  // renderze nagłówka, czyli na każdym ekranie apki — niepotrzebna praca, a przy
  // uszkodzonym rekordzie treningu wywracało to całą stronę (crash 2026-07-20).
  const source = fullHistory ?? workouts;
  const stats = useMemo(() => (open ? buildAllTimeStats(source) : null), [open, source]);
  if (!open || !stats) return null;

  // Z158: kafle tekstowe (ulubione ćwiczenie, data) — pełna szerokość i zawijanie
  // zamiast "..."; liczbowe zostają zwarte z truncate + tabular-nums.
  const tiles: Array<{ label: string; value: string; wide?: boolean; text?: boolean }> = [
    { label: t('stats.sets'), value: String(stats.totalSets) },
    { label: t('stats.reps'), value: String(stats.totalReps) },
    { label: t('stats.currentStreak'), value: String(stats.currentStreak) },
    { label: t('stats.longestStreak'), value: String(stats.longestStreak) },
    { label: t('stats.prs'), value: String(stats.totalPRs) },
    ...(stats.favoriteExercise
      ? [{ label: t('stats.favorite'), value: localizeExerciseName(stats.favoriteExercise.name, lang), wide: true, text: true }]
      : []),
    ...(stats.firstWorkoutDate
      ? [{
        label: t('stats.since'),
        value: new Date(stats.firstWorkoutDate).toLocaleDateString(dateLocale(lang), {
          day: 'numeric', month: 'long', year: 'numeric',
        }),
        wide: true,
        text: true,
      }]
      : []),
  ];

  // Masy referencyjne w kg — orientacyjne, jawnie oznaczone jako zabawa.
  const fun = [
    { key: 'stats.funElephants' as const, unitKg: 6000 },
    { key: 'stats.funCars' as const, unitKg: 1400 },
    { key: 'stats.funBuses' as const, unitKg: 12000 },
  ]
    .map(({ key, unitKg }) => ({ key, n: Math.floor(stats.totalTonnageKg / unitKg) }))
    .filter((e) => e.n >= 1)
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading uppercase tracking-tight">{t('stats.title')}</SheetTitle>
          <SheetDescription>{t('stats.subtitle')}</SheetDescription>
        </SheetHeader>

        {stats.workoutCount === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground" data-testid="stats-empty">{t('stats.empty')}</p>
        ) : (
          <div className="mt-6 space-y-6" data-testid="all-time-stats">
            {/* Trzy główne metryki w skali edytorialnej (docs/DESIGN.md, „extreme scale"). */}
            <div className="space-y-4">
              {[
                { label: t('stats.workouts'), value: String(stats.workoutCount), testid: 'stat-workouts' },
                { label: t('stats.timeInGym'), value: formatDuration(stats.totalDurationSec), testid: 'stat-time' },
                { label: t('stats.tonnage'), value: fmt(stats.totalTonnageKg), testid: 'stat-tonnage' },
              ].map(({ label, value, testid }) => (
                <div key={label} data-testid={testid}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="font-heading text-5xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                {t('stats.timeNote', { measured: String(stats.workoutsWithDuration), total: String(stats.workoutCount) })}
              </p>
            </div>

            {/* Reszta metryk — granice przez tło, zero ramek (No-Line Rule). */}
            <div className="grid grid-cols-2 gap-2">
              {tiles.map(({ label, value, wide, text }) => (
                <div key={label} className={cn('rounded-xl bg-muted/40 px-3 py-2.5', wide && 'col-span-2')}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <p className={cn('text-lg font-bold', text ? 'break-words leading-tight' : 'truncate tabular-nums')}>{value}</p>
                </div>
              ))}
            </div>

            {fun.length > 0 && (
              <div className="rounded-xl bg-primary/10 px-3 py-3" data-testid="stats-fun">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('stats.funTitle')}</p>
                <ul className="mt-1.5 space-y-1">
                  {fun.map(({ key, n }) => (
                    <li key={key} className="text-sm">{t(key, { n: String(n) })}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">{t('stats.funNote')}</p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { dateLocale } from '@/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { buildAllTimeActivityStats } from '@/lib/all-time-stats';
import { fetchAllTimeActivityHistory, type AllTimeActivityHistory } from '@/lib/activity-read-store';
import { Button } from '@/components/ui/button';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { cn } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

interface AllTimeStatsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing callers supply recent workouts; all-time numbers require the full read. */
  workouts: WorkoutSession[];
  /** Z216: po otwarciu dociągamy PEŁNĄ historię kursorem (okno 120 by zaniżało liczby). */
  uid?: string;
}

const formatDuration = (totalSec: number): string => {
  const totalMinutes = Math.round(totalSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
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
export const AllTimeStatsSheet = ({ open, onOpenChange, uid }: AllTimeStatsSheetProps) => {
  const { t, lang } = useTranslation();
  const { fmt } = useUnit();
  const currentUser = useCurrentUser();
  const ownerUid = uid && currentUser.uid === uid ? uid : null;
  const includeStrava = Boolean(ownerUid && currentUser.canUseStrava
    && currentUser.profile?.uid === ownerUid && currentUser.profile.stravaConnected);
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<{
    uid: string;
    includeStrava: boolean;
    status: 'loading' | 'ready' | 'error';
    data?: AllTimeActivityHistory;
  } | null>(null);
  useEffect(() => {
    if (!open || !ownerUid) {
      setHistory(null);
      return;
    }
    const controller = new AbortController();
    setHistory({ uid: ownerUid, includeStrava, status: 'loading' });
    fetchAllTimeActivityHistory(ownerUid, { includeStrava, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setHistory({ uid: ownerUid, includeStrava, status: 'ready', data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistory({ uid: ownerUid, includeStrava, status: 'error' });
      });
    return () => controller.abort();
  }, [open, ownerUid, includeStrava, attempt]);

  // Fence at render time as well as in cleanup: an auth/permission change must
  // never display the preceding account's data for even one frame.
  const ownedHistory = open && history?.uid === ownerUid && history.includeStrava === includeStrava ? history : null;
  const summary = useMemo(() => buildAllTimeActivityStats(
    ownedHistory?.data?.workouts.filter((workout) => workout.userId === ownerUid) ?? [],
    ownedHistory?.data?.activities.filter((activity) => activity.userId === ownerUid
      && (activity.source === 'manual' || includeStrava)) ?? [],
  ), [ownedHistory, ownerUid, includeStrava]);
  const stats = summary.strength;
  if (!open || !ownerUid) return null;

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

        {ownedHistory?.status === 'error' ? (
          <div className="mt-6 space-y-3" role="alert">
            <p className="text-sm text-muted-foreground">{t('stats.historyError')}</p>
            <Button variant="outline" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>{t('history.retryLoad')}</Button>
          </div>
        ) : ownedHistory?.status !== 'ready' ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">{t('stats.historyLoading')}</p>
        ) : summary.activityCount === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground" data-testid="stats-empty">{t('stats.empty')}</p>
        ) : (
          <div className="mt-6 space-y-6" data-testid="all-time-stats">
            <div data-testid="stat-activities">
              <p className="text-xs font-medium text-muted-foreground">{t('stats.activities')}</p>
              <p className="font-heading text-4xl font-bold leading-tight tabular-nums">{summary.activityCount}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t('stats.strength'), value: String(stats.workoutCount), testid: 'stat-workouts' },
                { label: t('stats.cardio'), value: String(summary.cardioCount), testid: 'stat-cardio' },
                { label: t('stats.cardioTime'), value: formatDuration(summary.cardioDurationSec), testid: 'stat-cardio-time' },
              ].map(({ label, value, testid }) => (
                <div key={testid} data-testid={testid} className={cn('rounded-xl bg-muted/40 px-3 py-2.5', testid === 'stat-cardio-time' && 'col-span-2')}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            {stats.workoutCount > 0 && <>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t('stats.strengthDetails')}</h3>
              {[
                { label: t('stats.timeInGym'), value: formatDuration(stats.totalDurationSec), testid: 'stat-time' },
                { label: t('stats.tonnage'), value: fmt(stats.totalTonnageKg), testid: 'stat-tonnage' },
              ].map(({ label, value, testid }) => (
                <div key={label} data-testid={testid}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="font-heading text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
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
            </>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

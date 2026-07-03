import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, AlertTriangle } from 'lucide-react';
import type { WorkoutSession } from '@/types';
import { getWeeklyMetrics, getPainWatchlist, getAvgQuality } from '@/lib/rza-metrics';
import { ExerciseProgressionDialog } from '@/components/ExerciseProgressionDialog';
import { isBodyweightExercise } from '@/lib/exercise-utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

// Karta "MASZYNA" — agregaty tygodniowe (objętość, śr. RPE, śr. ból, liczba OK).
// Renderuje się TYLKO gdy zapisano jakiekolwiek RPE, więc plany bez autoregulacji jej nie widzą.
export const RzaMetricsCard = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const { t } = useTranslation();
  const weeks = useMemo(() => getWeeklyMetrics(workouts).filter(w => w.hasRpe), [workouts]);
  // Z75: watchlist bólu i średnia techniki z ostatnich 4 tygodni.
  const painWatchlist = useMemo(() => getPainWatchlist(workouts, new Date()), [workouts]);
  const avgQuality = useMemo(() => getAvgQuality(workouts, new Date()), [workouts]);
  const [progressionTarget, setProgressionTarget] = useState<{ id: string; name: string } | null>(null);

  if (weeks.length === 0) return null;

  // Ostatnie 12 tygodni, najnowsze na górze.
  const rows = weeks.slice(-12).reverse();
  const recent = weeks.slice(-4);
  const recentVolume = recent.reduce((sum, w) => sum + w.totalVolume, 0);
  const recentRpe = (() => {
    const withRpe = recent.filter((w) => w.avgRpe != null);
    if (withRpe.length === 0) return null;
    return Math.round((withRpe.reduce((sum, w) => sum + (w.avgRpe ?? 0), 0) / withRpe.length) * 10) / 10;
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          {t('analytics.rza.title')}
        </CardTitle>
        <CardDescription>{t('analytics.rza.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Podsumowanie 4 tygodni (Z75): objętość, śr. RPE, śr. technika — quality przestaje być zbierane na darmo */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile label={t('analytics.rza.volume4w')} value={<VolumeValue volume={recentVolume} />} />
          <SummaryTile label={t('analytics.rza.rpe4w')} value={recentRpe ?? '—'} />
          <SummaryTile label={t('analytics.rza.quality4w')} value={avgQuality ?? '—'} />
        </div>

        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 gap-y-1.5 text-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('analytics.rza.week')}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-right">{t('analytics.rza.volume')}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-right">{t('analytics.rza.avgRpe')}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-right">{t('analytics.rza.avgPain')}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-right">{t('analytics.rza.ok')}</span>
          {rows.map(w => (
            <FragmentRow key={w.weekStart} weekStart={w.weekStart} volume={w.totalVolume} rpe={w.avgRpe} pain={w.avgPain} ok={w.okCount} />
          ))}
        </div>

        {/* Watchlist bólu (Z75): ćwiczenia z bólem >= 3 w ostatnich 4 tygodniach */}
        {painWatchlist.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-fitness-warning flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('analytics.rza.painWatchlist')}
            </p>
            {painWatchlist.map((entry) => (
              <button
                key={entry.exerciseId}
                onClick={() => setProgressionTarget({ id: entry.exerciseId, name: entry.exerciseName })}
                className="w-full flex items-center justify-between gap-2 rounded-lg bg-fitness-warning/5 border border-fitness-warning/20 px-3 py-2 text-left hover:bg-fitness-warning/10 transition-colors"
              >
                <span className="text-sm font-medium truncate">{entry.exerciseName}</span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {t('analytics.rza.painEntry', { max: entry.maxPain, n: entry.sessionsWithPain })}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {progressionTarget && (
        <ExerciseProgressionDialog
          exerciseId={progressionTarget.id}
          exerciseName={progressionTarget.name}
          open
          onOpenChange={(open) => { if (!open) setProgressionTarget(null); }}
          isBodyweight={isBodyweightExercise(progressionTarget.name)}
        />
      )}
    </Card>
  );
};

const SummaryTile = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="text-center p-3 bg-muted/30 rounded-xl">
    <p className="text-lg font-heading font-bold tracking-tight tabular-nums">{value}</p>
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const VolumeValue = ({ volume }: { volume: number }) => {
  const { unit, toDisplay } = useUnit();
  const { lang } = useTranslation();
  return <>{Math.round(toDisplay(volume)).toLocaleString(dateLocale(lang))} {unit}</>;
};

const FragmentRow = ({ weekStart, volume, rpe, pain, ok }: {
  weekStart: string; volume: number; rpe: number | null; pain: number | null; ok: number;
}) => {
  const { unit, toDisplay } = useUnit();
  const { lang } = useTranslation();
  // Ból na żółto/czerwono gdy podwyższony (sygnał odciążenia).
  const painClass = pain == null ? 'text-muted-foreground/40'
    : pain >= 4 ? 'text-destructive font-bold'
    : pain >= 3 ? 'text-fitness-warning font-bold'
    : 'text-foreground';
  return (
    <>
      <span className="tabular-nums text-muted-foreground">{weekStart.slice(5)}</span>
      <span className="tabular-nums text-right font-medium">{Math.round(toDisplay(volume)).toLocaleString(dateLocale(lang))} {unit}</span>
      <span className="tabular-nums text-right font-bold">{rpe ?? '—'}</span>
      <span className={`tabular-nums text-right ${painClass}`}>{pain ?? '—'}</span>
      <span className="tabular-nums text-right text-fitness-success font-bold">{ok}</span>
    </>
  );
};

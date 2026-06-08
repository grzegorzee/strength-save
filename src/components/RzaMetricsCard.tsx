import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { WorkoutSession } from '@/types';
import { getWeeklyMetrics } from '@/lib/rza-metrics';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';

// Karta "MASZYNA" — agregaty tygodniowe (objętość, śr. RPE, śr. ból, liczba OK).
// Renderuje się TYLKO gdy zapisano jakiekolwiek RPE, więc plany bez autoregulacji jej nie widzą.
export const RzaMetricsCard = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const { t } = useTranslation();
  const weeks = useMemo(() => getWeeklyMetrics(workouts).filter(w => w.hasRpe), [workouts]);

  if (weeks.length === 0) return null;

  // Ostatnie 12 tygodni, najnowsze na górze.
  const rows = weeks.slice(-12).reverse();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          {t('analytics.rza.title')}
        </CardTitle>
        <CardDescription>{t('analytics.rza.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

const FragmentRow = ({ weekStart, volume, rpe, pain, ok }: {
  weekStart: string; volume: number; rpe: number | null; pain: number | null; ok: number;
}) => {
  const { unit, toDisplay } = useUnit();
  // Ból na żółto/czerwono gdy podwyższony (sygnał odciążenia).
  const painClass = pain == null ? 'text-muted-foreground/40'
    : pain >= 4 ? 'text-destructive font-bold'
    : pain >= 3 ? 'text-fitness-warning font-bold'
    : 'text-foreground';
  return (
    <>
      <span className="tabular-nums text-muted-foreground">{weekStart.slice(5)}</span>
      <span className="tabular-nums text-right font-medium">{Math.round(toDisplay(volume)).toLocaleString('pl-PL')} {unit}</span>
      <span className="tabular-nums text-right font-bold">{rpe ?? '—'}</span>
      <span className={`tabular-nums text-right ${painClass}`}>{pain ?? '—'}</span>
      <span className="tabular-nums text-right text-fitness-success font-bold">{ok}</span>
    </>
  );
};

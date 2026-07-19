import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatLocalDate, parseLocalDate, cn } from '@/lib/utils';
import { computeDailyLoads, detectInterference, type InterferenceHit } from '@/lib/hybrid-load';
import type { WorkoutSession } from '@/types';
import type { UnifiedActivity } from '@/types/strava';
import { dateLocale } from '@/i18n';

const DISMISS_KEY = 'fittracker_interference_dismissed_v1';

const hitKey = (hit: InterferenceHit): string => `${hit.strengthDate}|${hit.cardioDate}|${hit.cardioType}`;

const readDismissed = (): string[] => {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

interface HybridWeekStripProps {
  workouts: WorkoutSession[];
  activities: UnifiedActivity[];
  weekStart: Date;
  maxHR?: number;
}

/**
 * Pasek łącznego obciążenia dnia (Z115): 7 mini słupków pon-nd (siła lime + cardio cyan)
 * + dyskretna, dismissowalna wskazówka interferencji (informacja, nigdy blokada).
 */
export const HybridWeekStrip = ({ workouts, activities, weekStart, maxHR }: HybridWeekStripProps) => {
  const { t, lang } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return formatLocalDate(d);
  }), [weekStart]);

  const daily = useMemo(
    () => computeDailyLoads(workouts, activities, 60, maxHR || 190),
    [workouts, activities, maxHR],
  );
  const byDate = useMemo(() => new Map(daily.map((d) => [d.date, d])), [daily]);
  const weekLoads = weekDays.map((date) => byDate.get(date) ?? { date, strengthLoad: 0, cardioLoad: 0, totalLoad: 0 });
  const maxLoad = Math.max(...weekLoads.map((d) => d.totalLoad), 1);
  const hasAny = weekLoads.some((d) => d.totalLoad > 0);

  const hits = useMemo(() => {
    const weekSet = new Set(weekDays);
    return detectInterference(
      workouts.filter((w) => weekSet.has(w.date)),
      activities.filter((a) => weekSet.has(a.date)),
    ).filter((h) => !dismissed.includes(hitKey(h)));
  }, [workouts, activities, weekDays, dismissed]);

  const dismissHit = (hit: InterferenceHit) => {
    const next = [...dismissed, hitKey(hit)].slice(-50);
    setDismissed(next);
    try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (!hasAny && hits.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="hybrid-week-strip">
      {hasAny && (
        <div className="flex items-end gap-1.5 rounded-xl bg-surface-low p-3">
          {weekLoads.map((d) => {
            const strengthH = Math.round((d.strengthLoad / maxLoad) * 40);
            const cardioH = Math.round((d.cardioLoad / maxLoad) * 40);
            const label = parseLocalDate(d.date).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
            return (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${label}: ${t('hybrid.strength')} ${Math.round(d.strengthLoad)} + ${t('hybrid.cardio')} ${Math.round(d.cardioLoad)}`}
              >
                <div className="flex h-11 w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-sm">
                  <div className="w-full bg-[#00e3fd]/85" style={{ height: cardioH }} />
                  <div className="w-full bg-primary" style={{ height: strengthH }} />
                </div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {hits.map((hit) => (
        <div
          key={hitKey(hit)}
          className={cn('flex items-start justify-between gap-2 rounded-lg bg-fitness-warning/10 px-3 py-2 text-xs text-fitness-warning')}
          data-testid="interference-banner"
        >
          <span>
            {t('hybrid.interferenceBanner', {
              date: parseLocalDate(hit.cardioDate).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
            })}
          </span>
          <button
            type="button"
            onClick={() => dismissHit(hit)}
            aria-label={t('common.cancel')}
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            data-testid="interference-dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

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
  /** Z148: weekday'e dni aktywnego planu — kropka pod etykietą dnia planowego. */
  plannedWeekdays?: string[];
}

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Z148: słupek z obciążeniem nie może zniknąć — minimum 3 px na stack. */
const MIN_STACK_PX = 3;

/**
 * Pasek łącznego obciążenia dnia (Z115): 7 mini słupków pon-nd (siła lime + cardio cyan)
 * + dyskretna, dismissowalna wskazówka interferencji (informacja, nigdy blokada).
 */
export const HybridWeekStrip = ({ workouts, activities, weekStart, maxHR, plannedWeekdays }: HybridWeekStripProps) => {
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
        <div className="rounded-xl bg-surface-low p-3">
          {/* Z148: pasek dostaje WŁASNY mikronagłówek — "Plan tygodnia" nad sekcją
              zostaje nagłówkiem listy kart dni (to ona jest planem), a ten pasek
              mówi wprost, że pokazuje WYKONANE obciążenie. */}
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('hybrid.stripTitle')}
            </span>
            <span className="text-[9px] text-muted-foreground/60">{t('hybrid.stripHint')}</span>
          </div>
          <div className="flex items-end gap-1.5">
            {weekLoads.map((d) => {
              let strengthH = Math.round((d.strengthLoad / maxLoad) * 40);
              let cardioH = Math.round((d.cardioLoad / maxLoad) * 40);
              // Z148: dzień z obciążeniem nie może wyglądać jak pusty — poniżej
              // ~1/80 maksimum słupek zaokrąglał się do zera i "znikał".
              if (d.totalLoad > 0 && strengthH + cardioH < MIN_STACK_PX) {
                if (d.strengthLoad >= d.cardioLoad) strengthH = MIN_STACK_PX - cardioH;
                else cardioH = MIN_STACK_PX - strengthH;
              }
              const label = parseLocalDate(d.date).toLocaleDateString(dateLocale(lang), { weekday: 'short' });
              const isPlanned = plannedWeekdays?.includes(WEEKDAY_NAMES[parseLocalDate(d.date).getDay()]) ?? false;
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${label}: ${t('hybrid.strength')} ${Math.round(d.strengthLoad)} + ${t('hybrid.cardio')} ${Math.round(d.cardioLoad)}`}
                >
                  <div
                    className="flex h-11 w-full max-w-[26px] flex-col justify-end overflow-hidden rounded-sm"
                    data-testid={`strip-bar-${d.date}`}
                  >
                    <div className="w-full bg-[#00e3fd]/85" style={{ height: cardioH }} />
                    <div className="w-full bg-primary" style={{ height: strengthH }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{label}</span>
                  {/* Z148: kropka dnia planowego — niezależna od obciążenia. */}
                  {isPlanned
                    ? <span className="h-1 w-1 rounded-full bg-primary/70" data-testid="plan-day-dot" />
                    : <span className="h-1 w-1" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
          {/* Z148: legenda zamiast opisu ukrytego w title (martwy na dotyku). */}
          <div className="mt-2 flex items-center gap-3" data-testid="strip-legend">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-muted-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t('hybrid.strength')}
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-muted-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e3fd]/85" />
              {t('hybrid.cardio')}
            </span>
          </div>
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

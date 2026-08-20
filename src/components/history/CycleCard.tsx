import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTonnage } from '@/lib/units';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { calculateTonnage } from '@/lib/summary-utils';
import type { CycleWeekGroup } from '@/lib/history-cycles';
import type { WorkoutSession } from '@/types';

// Fala 2 (2026-08-20): karta cyklu w Historii (artboard 1a).
// Wariant active: bg-surface-container, rozwinięta, staty + sparkline + tygodnie.
// Wariant past: bg-surface-low, zwinięta (nagłówek + staty), rozwinięcie lazy.

export interface CycleCardStats {
  sessions: number;
  tonnageKg: number;
  prs: number;
  attendance: number;
}

interface CycleCardProps {
  title: string;
  rangeLabel: string;
  variant: 'active' | 'past';
  stats: CycleCardStats;
  /** Tonaż kg per tydzień (indeks 0 = tydzień 1); null = ukryta (dane niepełne). */
  sparkline: number[] | null;
  currentWeekNo: number | null;
  weeks: CycleWeekGroup[];
  /** Liczba załadowanych sesji cyklu (stopka "Wszystkie sesje (N)"). */
  totalSessions: number;
  renderRow: (workout: WorkoutSession) => ReactNode;
  /** Aktywny cykl: okno nie sięga startu — stopka dodatkowo dociąga starsze strony. */
  canLoadOlder?: boolean;
  onLoadOlder?: () => void;
  /** Przeszły cykl: stan lazy fetchu sesji spoza okna. */
  lazyStatus?: 'idle' | 'loading' | 'loaded' | 'error';
  onExpand?: () => void;
  onRetryLazy?: () => void;
}

const sessionWordKey = (n: number) =>
  n === 1
    ? 'history.sessionOne'
    : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
      ? 'history.sessionFew'
      : 'history.sessionMany';

export const CycleCard = ({
  title, rangeLabel, variant, stats, sparkline, currentWeekNo, weeks, totalSessions,
  renderRow, canLoadOlder, onLoadOlder, lazyStatus, onExpand, onRetryLazy,
}: CycleCardProps) => {
  const { t } = useTranslation();
  const { unit } = useUnit();
  const isActive = variant === 'active';
  const [expanded, setExpanded] = useState(isActive);
  const [showAll, setShowAll] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next && !isActive) onExpand?.();
      return next;
    });
  };

  const visibleWeeks = isActive && !showAll ? weeks.slice(0, 2) : weeks;
  const hasHiddenWeeks = isActive && !showAll && weeks.length > 2;
  const showFooter = isActive && (hasHiddenWeeks || canLoadOlder);
  const sparkMax = sparkline ? Math.max(...sparkline) : 0;

  const statItems = [
    { value: String(stats.sessions), label: t('history.sessionsLabel'), hot: false },
    { value: formatTonnage(stats.tonnageKg, unit), label: t('history.tonnage'), hot: false },
    { value: String(stats.prs), label: 'PR', hot: true },
    { value: `${stats.attendance}%`, label: t('history.attendance'), hot: false },
  ];

  return (
    <section className={cn(
      'space-y-3 rounded-xl p-4',
      isActive ? 'bg-surface-container' : 'bg-surface-low',
    )}
    >
      <button type="button" onClick={toggleExpanded} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-lg font-bold">{title}</span>
            {isActive && (
              <span className="chip-mono shrink-0 bg-primary/15 px-2 py-1 text-primary">
                {t('history.activeBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        <span className="mt-1 shrink-0 text-muted-foreground/50">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div className="flex gap-2">
        {statItems.map((item) => (
          <div key={item.label} className="min-w-0 flex-1">
            <p className={cn(
              'truncate font-heading font-bold tabular-nums',
              isActive ? 'text-base' : 'text-sm',
              item.hot && 'text-primary',
            )}
            >
              {item.value}
            </p>
            <p className="eyebrow-mono truncate text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <>
          {sparkline && sparkMax > 0 && (
            <div className="flex h-8 items-end gap-[3px]">
              {sparkline.map((value, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex-1 rounded-sm',
                    index + 1 === currentWeekNo ? 'bg-primary' : 'bg-primary/40',
                  )}
                  style={{ height: `${Math.max(6, Math.round((value / sparkMax) * 100))}%` }}
                />
              ))}
            </div>
          )}

          {(visibleWeeks.length > 0 || lazyStatus === 'loading' || lazyStatus === 'error') && (
            <div className="h-px bg-surface-high" />
          )}

          {lazyStatus === 'loading' && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('history.loadingCycle')}
            </p>
          )}
          {lazyStatus === 'error' && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {t('history.loadCycleFailed')}
              <button type="button" onClick={onRetryLazy} className="font-semibold text-primary">
                {t('history.retryLoad')}
              </button>
            </p>
          )}

          {visibleWeeks.map((week) => {
            const weekTonnage = calculateTonnage(week.workouts);
            return (
              <div key={week.weekNo} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn(
                    'eyebrow-mono',
                    week.isCurrent ? 'text-primary' : 'text-muted-foreground',
                  )}
                  >
                    {t(week.isCurrent ? 'history.weekCurrent' : 'history.weekN', { n: week.weekNo })}
                  </span>
                  <span className="eyebrow-mono text-muted-foreground">
                    {week.workouts.length} {t(sessionWordKey(week.workouts.length))} · {formatTonnage(weekTonnage, unit)}
                  </span>
                </div>
                <div className="space-y-2">
                  {week.workouts.map((workout) => renderRow(workout))}
                </div>
              </div>
            );
          })}

          {showFooter && (
            <button
              type="button"
              onClick={() => {
                setShowAll(true);
                if (canLoadOlder) onLoadOlder?.();
              }}
              className="w-full py-1 text-center text-sm font-semibold text-primary"
            >
              {t('history.allSessions', { n: totalSessions })}
            </button>
          )}
        </>
      )}
    </section>
  );
};

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRightLeft, Loader2, Mail, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { formatTonnage } from '@/lib/units';
import { calculateTonnage } from '@/lib/summary-utils';
import { groupCycleWorkoutsByWeek } from '@/lib/history-cycles';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import type { CycleSessionsStatus } from '@/hooks/useCycleSessions';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

// WP-H (X28), design 2b: poziom 2 Historii (?cycle=<id>|outside). Top bar
// back + ⋯ (Porównaj / Wyślij do trenera), nagłówek z pill ACTIVE i 4 statami,
// chipsy filtrów (ALL / PRS ONLY / DRAFTS / LONGEST FIRST), sesje grupowane
// tygodniami (cykl) albo miesiącami (poza cyklami). Wiersze renderuje rodzic
// (HistorySessionRow — kontrakt menu ⋯ bez zmian).

export interface CycleDetailStats {
  sessions: number;
  tonnageKg: number;
  prs: number;
  /** null = brak frekwencji (sesje poza cyklami). */
  attendance: number | null;
}

type DetailChip = 'all' | 'prs' | 'drafts';

interface CycleDetailViewProps {
  title: string;
  isActive: boolean;
  /** Zakres dat + tygodnie; aktywny cykl z "teraz" (guard E-8UE4S). */
  rangeLabel: string;
  stats: CycleDetailStats;
  /** null = widok "Poza cyklami" (grupowanie miesiącami). */
  cycle: PlanCycle | null;
  /** Sesje widoku (posortowane malejąco po dacie). */
  sessions: WorkoutSession[];
  todayStr: string;
  prCountOf: (workoutId: string) => number;
  compareMode: boolean;
  lazyStatus?: CycleSessionsStatus;
  canLoadOlder?: boolean;
  isLoadingMore?: boolean;
  onLoadOlder?: () => void;
  onRetryLazy?: () => void;
  onBack: () => void;
  onToggleCompareMode: () => void;
  onEmailHistory: () => void;
  onAllSessions: () => void;
  renderRow: (workout: WorkoutSession, options?: { highlight?: boolean }) => ReactNode;
}

const sessionWordKey = (n: number) =>
  n === 1
    ? 'history.sessionOne'
    : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
      ? 'history.sessionFew'
      : 'history.sessionMany';

export const CycleDetailView = ({
  title, isActive, rangeLabel, stats, cycle, sessions, todayStr, prCountOf,
  compareMode, lazyStatus, canLoadOlder, isLoadingMore, onLoadOlder, onRetryLazy,
  onBack, onToggleCompareMode, onEmailHistory, onAllSessions, renderRow,
}: CycleDetailViewProps) => {
  const { t, lang } = useTranslation();
  const { unit } = useUnit();
  const [chip, setChip] = useState<DetailChip>('all');
  const [longestFirst, setLongestFirst] = useState(false);

  const draftsCount = useMemo(() => sessions.filter((w) => !w.completed).length, [sessions]);

  const filtered = useMemo(() => sessions.filter((workout) => {
    if (chip === 'prs') return prCountOf(workout.id) > 0;
    if (chip === 'drafts') return !workout.completed;
    return true;
  }), [sessions, chip, prCountOf]);

  // Edge 5: sort po durationSec malejąco; sesje bez czasu na końcu.
  const longestSorted = useMemo(
    () => [...filtered].sort((a, b) => (b.durationSec ?? -1) - (a.durationSec ?? -1)),
    [filtered],
  );

  const weeks = useMemo(
    () => (cycle ? groupCycleWorkoutsByWeek(cycle, filtered, todayStr) : null),
    [cycle, filtered, todayStr],
  );

  // Poza cyklami: grupowanie miesięczne (dotychczasowy wzorzec listy).
  const monthGroups = useMemo(() => {
    if (cycle) return null;
    const groups: { key: string; label: string; workouts: WorkoutSession[]; tonnage: number }[] = [];
    const indexByKey = new Map<string, number>();
    filtered.forEach((workout) => {
      const key = workout.date.slice(0, 7);
      let gi = indexByKey.get(key);
      if (gi === undefined) {
        const label = formatLocalDateLabel(workout.date, dateLocale(lang), { month: 'long', year: 'numeric' });
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), workouts: [], tonnage: 0 });
        gi = groups.length - 1;
        indexByKey.set(key, gi);
      }
      groups[gi].workouts.push(workout);
      groups[gi].tonnage += calculateTonnage([workout]);
    });
    return groups;
  }, [cycle, filtered, lang]);

  const statItems = [
    { value: String(stats.sessions), label: t('history.sessionsLabel'), hot: false },
    { value: formatTonnage(stats.tonnageKg, unit), label: t('history.tonnage'), hot: false },
    { value: String(stats.prs), label: 'PR', hot: true },
    ...(stats.attendance !== null
      ? [{ value: `${stats.attendance}%`, label: t('history.attendance'), hot: false }]
      : []),
  ];

  const weekMeta = (weekWorkouts: WorkoutSession[]) => (
    <span className="eyebrow-mono text-muted-foreground">
      {weekWorkouts.length} {t(sessionWordKey(weekWorkouts.length))} ·{' '}
      <span className="normal-case">{formatTonnage(calculateTonnage(weekWorkouts), unit)}</span>
    </span>
  );

  return (
    <div className="space-y-4" data-testid="cycle-detail">
      {/* Top bar: back + ⋯ (design 2b) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('history.backToHistory')}
          data-testid="cycle-back"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-[11px] bg-surface-high text-foreground/80"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('history.cycleMenu')}
              data-testid="cycle-menu"
              className="grid h-9 w-9 place-items-center rounded-[11px] bg-surface-high text-foreground/80"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onToggleCompareMode}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {t(compareMode ? 'history.compareExit' : 'history.compare')}
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="cycle-menu-email" onSelect={onEmailHistory}>
              <Mail className="mr-2 h-4 w-4" />
              {t('email.sendToCoach')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nagłówek cyklu */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="truncate font-heading text-[27px] font-bold uppercase tracking-tight">{title}</h2>
            {isActive && (
              <span className="chip-mono shrink-0 bg-primary/15 px-2 py-1 text-primary">
                {t('history.activeBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex gap-2">
          {statItems.map((item) => (
            <div key={item.label} className="min-w-0 flex-1">
              <p className={cn('truncate font-heading text-base font-bold tabular-nums', item.hot && 'text-primary')}>
                {item.value}
              </p>
              <p className="eyebrow-mono truncate text-[9px] tracking-[0.06em] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chipsy statusu (design 2b); styl jak kinetic Chip (DESIGN.md §5). */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: 'all' as const, label: t('history.chipAll', { n: sessions.length }), active: chip === 'all', onClick: () => setChip('all') },
          { id: 'prs' as const, label: t('history.onlyPRs'), active: chip === 'prs', onClick: () => setChip('prs') },
          { id: 'drafts' as const, label: t('history.chipDrafts', { n: draftsCount }), active: chip === 'drafts', onClick: () => setChip('drafts') },
          { id: 'longest' as const, label: t('history.chipLongest'), active: longestFirst, onClick: () => setLongestFirst((prev) => !prev) },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`cycle-chip-${item.id}`}
            onClick={item.onClick}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
              item.active ? 'bg-accent text-accent-foreground' : 'bg-surface-highest text-muted-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

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

      {/* Sesje: LONGEST FIRST = płaska lista; cykl = tygodnie; outside = miesiące */}
      {longestFirst ? (
        <div className="space-y-2">
          {longestSorted.map((workout) => renderRow(workout))}
        </div>
      ) : weeks ? (
        weeks.map((week) => (
          <div key={week.weekNo} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn('eyebrow-mono', week.isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                {t(week.isCurrent ? 'history.weekCurrent' : 'history.weekN', { n: week.weekNo })}
              </span>
              {weekMeta(week.workouts)}
            </div>
            <div className="space-y-2">
              {/* Najnowsza sesja bieżącego tygodnia z tintem akcentu (design 2b). */}
              {week.workouts.map((workout, index) => renderRow(workout, { highlight: week.isCurrent && index === 0 }))}
            </div>
          </div>
        ))
      ) : (
        monthGroups?.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="eyebrow-mono text-muted-foreground">{group.label}</span>
              {weekMeta(group.workouts)}
            </div>
            <div className="space-y-2">
              {group.workouts.map((workout) => renderRow(workout))}
            </div>
          </div>
        ))
      )}

      {canLoadOlder && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full" onClick={onLoadOlder} disabled={isLoadingMore}>
            {isLoadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}

      {/* Koniec listy: link do pełnej płaskiej listy (design 2b). */}
      <button
        type="button"
        data-testid="cycle-all-sessions"
        onClick={onAllSessions}
        className="w-full py-1 text-center text-sm font-semibold text-primary"
      >
        {t('history.allSessions', { n: filtered.length })}
      </button>
    </div>
  );
};

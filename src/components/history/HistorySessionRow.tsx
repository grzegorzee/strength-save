import type { KeyboardEvent, MouseEvent } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, ExternalLink, Mail, MoreHorizontal, StickyNote, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatHistorySetLabel } from '@/lib/set-tracking';
import { cn, parseLocalDate } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import type { HistoryRowMeta } from '@/lib/history-stats';
import type { WorkoutSession } from '@/types';

// Fala 2 (2026-08-20): jednoliniowy wiersz sesji Historii (artboard 1a).
// Tap w wiersz = otwórz trening (w trybie porównania: zaznacz/odznacz);
// chevron = Szczegóły (aria-label utrzymuje kontrakt e2e full-app);
// menu ⋯ = komplet akcji (Otwórz / Porównaj / Wyślij do trenera / Usuń).

interface HistorySessionRowProps {
  workout: WorkoutSession;
  /** Zlokalizowana etykieta wiersza: "Nazwa dnia · focus". */
  title: string;
  meta: HistoryRowMeta | undefined;
  /** Tonaż sesji w kg (konwersja jednostek wewnątrz). */
  tonnage: number;
  totalSets: number;
  isSelected: boolean;
  isExpanded: boolean;
  compareMode: boolean;
  /** Poziom powierzchni wiersza: zawsze o jeden wyżej niż jego karta. */
  surface: 'low' | 'container';
  resolveExerciseName: (workout: WorkoutSession, exerciseId: string) => string;
  onOpen: () => void;
  onToggleCompare: () => void;
  onToggleExpanded: () => void;
  onEmail: () => void;
  onDelete: () => void;
}

const setWordKey = (n: number) =>
  n === 1
    ? 'history.setOne'
    : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20))
      ? 'history.setFew'
      : 'history.setMany';

export const HistorySessionRow = ({
  workout, title, meta, tonnage, totalSets, isSelected, isExpanded, compareMode,
  surface, resolveExerciseName, onOpen, onToggleCompare, onToggleExpanded, onEmail, onDelete,
}: HistorySessionRowProps) => {
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();

  const dateShort = parseLocalDate(workout.date)
    .toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })
    .replace('.', '');

  const handleRowActivate = () => {
    if (compareMode) onToggleCompare();
    else onOpen();
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowActivate();
    }
  };

  const stop = (event: MouseEvent) => event.stopPropagation();

  const metaSegments = [
    `${totalSets} ${t(setWordKey(totalSets))}`,
    ...(meta?.durationLabel ? [meta.durationLabel] : []),
  ];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        data-testid="history-session-row"
        // Własny aria-label: bez niego accessible name wiersza sklejałby się
        // z aria-labeli przycisków w środku ("Szczegóły", "Akcje treningu") i
        // getByRole('button', { name: 'Szczegóły' }) trafiałby w CAŁY wiersz.
        aria-label={`${t('history.openWorkout')}: ${title}`}
        onClick={handleRowActivate}
        onKeyDown={handleRowKeyDown}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left',
          surface === 'container' ? 'bg-surface-container' : 'bg-surface-low',
          isSelected && 'ring-2 ring-inset ring-primary/50',
        )}
      >
        <span className="w-11 shrink-0 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground tabular-nums">
          {dateShort}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{title}</span>
            {!workout.completed && (
              <span className="chip-mono shrink-0 px-2 py-0.5">{t('history.badgeDraft')}</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {metaSegments.join(' · ')}
          </p>
        </div>
        {(meta?.prCount ?? 0) > 0 && (
          <span className="chip-mono shrink-0 bg-primary/15 px-2 py-1 text-primary">
            {meta?.prCount} PR
          </span>
        )}
        <span className="w-14 shrink-0 text-right font-mono text-xs font-semibold tabular-nums">
          {Math.round(toDisplay(tonnage)).toLocaleString(dateLocale(lang))}
        </span>
        <button
          type="button"
          aria-label={t('history.details')}
          onClick={(event) => { stop(event); onToggleExpanded(); }}
          className="grid h-11 w-8 shrink-0 place-items-center text-muted-foreground/50"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('history.rowActions')}
              data-testid="history-row-menu"
              onClick={stop}
              className="grid h-11 w-8 shrink-0 place-items-center text-muted-foreground/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stop}>
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('history.openWorkout')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleCompare}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {isSelected ? t('history.removeFromCompare') : t('history.compare')}
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="history-row-email" onSelect={onEmail}>
              <Mail className="mr-2 h-4 w-4" />
              {t('email.sendToCoach')}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="history-delete"
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('history.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rozwinięcie (Z74+Z80): serie per ćwiczenie, metryki RPE/ból/technika, notatki — 1:1 jak przed redesignem. */}
      {isExpanded && (
        <div className="mt-2 space-y-3 rounded-xl bg-surface-lowest p-3">
          {workout.exercises.map((e) => {
            const workingSets = e.sets.filter((s) => !s.isWarmup);
            const hasMetrics = e.rpe !== undefined || e.pain !== undefined || e.quality !== undefined;
            return (
              <div key={e.exerciseId} className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {resolveExerciseName(workout, e.exerciseId)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {workingSets.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs tabular-nums',
                        s.completed ? 'bg-muted/60 text-foreground' : 'bg-muted/30 text-muted-foreground line-through',
                      )}
                    >
                      {formatHistorySetLabel(
                        s,
                        (kg) => `${Math.round(toDisplay(kg) * 10) / 10} ${unit}`,
                        t('history.bodyweightSet'),
                      )}
                    </span>
                  ))}
                </div>
                {hasMetrics && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {e.rpe !== undefined && <>{t('card.rpe')}: <strong>{e.rpe}</strong>{'  '}</>}
                    {e.pain !== undefined && <>{t('card.pain')}: <strong>{e.pain}</strong>{'  '}</>}
                    {e.quality !== undefined && <>{t('card.quality')}: <strong>{e.quality}</strong></>}
                  </p>
                )}
                {e.notes?.trim() && (
                  <p className="flex items-start gap-1 text-sm">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {e.notes}
                  </p>
                )}
              </div>
            );
          })}
          {workout.notes?.trim() && (
            <div>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <StickyNote className="h-3 w-3" />
                {t('notes.dayNote')}
              </p>
              <p className="mt-0.5 text-sm">{workout.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

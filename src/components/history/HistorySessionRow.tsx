import type { MouseEvent } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, ExternalLink, Mail, MoreHorizontal, StickyNote, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatHistorySetLabel } from '@/lib/set-tracking';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { CloudPendingIndicator } from '@/components/CloudPendingIndicator';
import type { HistoryRowMeta } from '@/lib/history-stats';
import type { WorkoutSession } from '@/types';

// Fala 2 (2026-08-20): jednoliniowy wiersz sesji Historii (artboard 1a).
// Tap w wiersz = otwórz trening (w trybie porównania: zaznacz/odznacz);
// menu ⋯ = komplet akcji (Otwórz / Szczegóły / Porównaj / Wyślij do trenera / Usuń).
// Naprawa r3 (2026-08-21, sędziowie struktury i funkcji): osobny chevron Szczegóły
// zabierał środkowi ~36 px i tytuł/meta ucinały się na 390 px — akcja przenosi się
// do menu ⋯ (plan history-tab poz. 25), data w formacie numerycznym "17.08" (w-9),
// a czas trwania w mecie ma shrink-0, więc jest widoczny bez rozwijania (Z80)
// nawet gdy truncate zjada segmenty ćwiczeń/serii.

interface HistorySessionRowProps {
  workout: WorkoutSession;
  /** Zlokalizowana etykieta wiersza: "Nazwa dnia · focus". */
  title: string;
  /** Naprawa r2 (2026-08-21, plan §6.7): focus dnia powtórzony w rozwinięciu —
      przy 390px tytuł bywa ucięty i focus byłby nieosiągalny. */
  focusLabel?: string;
  meta: HistoryRowMeta | undefined;
  /** Tonaż sesji w kg (konwersja jednostek wewnątrz). */
  tonnage: number;
  totalSets: number;
  isSelected: boolean;
  isExpanded: boolean;
  compareMode: boolean;
  /** Poziom powierzchni wiersza: zawsze o jeden wyżej niż jego karta. */
  surface: 'low' | 'container';
  /** Wyróżnienie tintem akcentu (pierwsza sesja bieżącego tygodnia w karcie cyklu). */
  highlight?: boolean;
  /** WP-C (X38): sesja zakończona lokalnie, czeka na zapis w chmurze (finalSyncPending). */
  pendingCloud?: boolean;
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
  workout, title, focusLabel, meta, tonnage, totalSets, isSelected, isExpanded, compareMode,
  surface, highlight, pendingCloud, resolveExerciseName, onOpen, onToggleCompare, onToggleExpanded, onEmail, onDelete,
}: HistorySessionRowProps) => {
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();

  const dateShort = formatLocalDateLabel(workout.date, dateLocale(lang), { day: '2-digit', month: '2-digit' });
  const weekdayShort = formatLocalDateLabel(workout.date, dateLocale(lang), { weekday: 'short' });

  const handleRowActivate = () => {
    if (compareMode) onToggleCompare();
    else onOpen();
  };

  const stop = (event: MouseEvent) => event.stopPropagation();

  // Naprawa r2 (2026-08-21, plan history-tab poz. 19/22): meta wiersza to
  // "{ćw} ćw. · {serie} serii · {czas}" — liczba ćwiczeń była jawną statystyką
  // wiersza sprzed redesignu i nie może zniknąć. Czas trwania renderuje się
  // OSOBNYM spanem z shrink-0 (naprawa r3): kontrakt Z80 wymaga go widocznego
  // bez rozwijania, więc truncate może zjadać tylko segmenty po lewej.
  const metaLead = [
    `${workout.exercises.length} ${t('history.exercisesUnit')}`,
    `${totalSets} ${t(setWordKey(totalSets))}`,
  ].join(' · ');

  return (
    <div>
      <div
        data-testid="history-session-row"
        className={cn(
          'flex items-stretch rounded-lg text-left',
          highlight
            ? 'bg-primary/10'
            : surface === 'container' ? 'bg-surface-container' : 'bg-surface-low',
          isSelected && 'ring-2 ring-inset ring-primary/50',
        )}
      >
        <button
          type="button"
          data-testid="history-session-open"
          aria-label={`${t('history.openWorkout')}: ${title}`}
          onClick={handleRowActivate}
          className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex w-10 shrink-0 flex-col font-mono text-[11px] tracking-[0.04em] text-muted-foreground tabular-nums">
            <span className="capitalize">{weekdayShort}</span>
            <span>{dateShort}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-1.5">
              <span data-testid="history-session-title" className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">
                {focusLabel || title}
              </span>
              {pendingCloud && <CloudPendingIndicator compact className="shrink-0" />}
              {!workout.completed && (
                <span className="chip-mono shrink-0 px-2 py-0.5">{t('history.badgeDraft')}</span>
              )}
            </span>
            <span data-testid="history-session-meta" className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
              <span className="shrink-0 whitespace-nowrap">
                {metaLead}{meta?.durationLabel ? ` · ${meta.durationLabel}` : ''}
              </span>
              <span className="whitespace-nowrap font-semibold text-foreground">
                {Math.round(toDisplay(tonnage)).toLocaleString(dateLocale(lang))} {unit}
              </span>
              {(meta?.prCount ?? 0) > 0 && (
                <span className="chip-mono bg-primary/15 px-1.5 py-0.5 text-primary">
                  {meta?.prCount} PR
                </span>
              )}
            </span>
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('history.rowActions')}
              data-testid="history-row-menu"
              onClick={stop}
              className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-lg text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stop}>
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('history.openWorkout')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleExpanded}>
              {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
              {t('history.details')}
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
          {/* Focus sesji jako eyebrow — czytelny nawet gdy tytuł wiersza ucięty. */}
          {focusLabel && (
            <p className="eyebrow-mono text-primary">{focusLabel}</p>
          )}
          {workout.exercises.map((e) => {
            const workingSets = e.sets.filter((s) => !s.isWarmup);
            const hasMetrics = e.rpe !== undefined || e.pain !== undefined || e.quality !== undefined;
            return (
              <div key={e.exerciseId} className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
              <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
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

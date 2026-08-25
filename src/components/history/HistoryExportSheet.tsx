import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Loader2, Mail, Table2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { buildTrainingReportModel, generateTrainingReportPdf } from '@/lib/pdf-report';
import { downloadWorkoutsCsvFile, fetchWorkoutsForBounds } from '@/lib/workout-csv-download';
import { exportRangeBounds, type ExportRangeBounds } from '@/lib/workout-export-range';
import { buildExportCycleOptions, defaultExportCycleId } from '@/lib/export-cycle-options';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { toast } from '@/hooks/use-toast';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

// WP-H (X28), design 2c: jeden Export Historii jako bottom sheet. Chipsy
// zakresu (Ten okres / Cykl / Cała historia) + formaty delegujące do
// ISTNIEJĄCYCH mechanizmów: pdf-report, wspólna ścieżka CSV
// (workout-csv-download), EmailWorkoutDialog history (otwiera rodzic).
// WP-D (X35a): chip Cykl rozwija listę cykli (widoczne z danymi, domyślnie
// aktywny); zakres cyklu liczony po cycleId, nie po samych datach.
// Radix: zamykanie wyłącznie przez open=false; sheet zamyka się PRZED
// otwarciem dialogu maila.

export type ExportScope = 'period' | 'cycle' | 'all';

interface HistoryExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  displayName: string;
  /** Zakres PERIOD z poziomu 1 (null = nieustawiony => chip disabled). */
  period: { from: string; to: string } | null;
  periodLabel: string | null;
  /** WP-D: cykle usera (filtr widoczności robi sheet) + sesje do licznika aktywnego cyklu. */
  cycles: PlanCycle[];
  workouts: WorkoutSession[];
  trainerEmail?: string;
  /** WP-I: imię trenera — w opisie wiersza zamiast surowego adresu. */
  trainerName?: string;
  onSendToCoach: () => void;
}

export const HistoryExportSheet = ({
  open, onOpenChange, uid, displayName, period, periodLabel,
  cycles, workouts, trainerEmail, trainerName, onSendToCoach,
}: HistoryExportSheetProps) => {
  const { t, lang } = useTranslation();
  const { unit } = useUnit();
  const [scope, setScope] = useState<ExportScope>('all');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  const todayStr = formatLocalDate(new Date());
  const cycleOptions = useMemo(
    () => buildExportCycleOptions({ cycles, workouts, todayISO: todayStr, lang, t }),
    [cycles, workouts, todayStr, lang, t],
  );
  const hasCycles = cycleOptions.length > 0;
  const defaultCycleId = defaultExportCycleId(cycleOptions);

  // Edge 6: domyślny zakres = okres gdy ustawiony, inaczej cykl (aktywny), inaczej wszystko.
  // Deps prymitywne: reset wyboru tylko przy otwarciu / zmianie danych, nie przy każdym renderze.
  useEffect(() => {
    if (!open) return;
    setScope(period ? 'period' : hasCycles ? 'cycle' : 'all');
    setSelectedCycleId(defaultCycleId);
    setBusy(null);
  }, [open, period, hasCycles, defaultCycleId]);

  const selectedCycle = cycleOptions.find((option) => option.id === selectedCycleId) ?? null;

  const boundsFor = (target: ExportScope): ExportRangeBounds => {
    if (target === 'period' && period) {
      return { mode: 'dates', fromDate: period.from || '1970-01-01', toDate: period.to || todayStr };
    }
    if (target === 'cycle' && selectedCycle) {
      const { id, startDate, endDate } = selectedCycle.cycle;
      return exportRangeBounds({ kind: 'cycle', cycle: { id, startDate, endDate } }, todayStr)
        ?? { mode: 'dates', fromDate: '1970-01-01', toDate: todayStr };
    }
    return { mode: 'dates', fromDate: '1970-01-01', toDate: todayStr };
  };

  const scopeTitle = scope === 'period' && periodLabel
    ? periodLabel
    : scope === 'cycle' && selectedCycle
      ? t('history.cycleN', { n: selectedCycle.number })
      : t('history.scopeAll');

  const runExport = async (format: 'pdf' | 'csv') => {
    if (busy) return;
    setBusy(format);
    try {
      const workouts = await fetchWorkoutsForBounds(uid, boundsFor(scope));
      if (workouts.length === 0) {
        toast({ title: t('history.exportEmpty') });
        return;
      }
      if (format === 'csv') {
        // Bug 26 (X30): toast sukcesu bramkowany wynikiem (Z198) — zamkniecie
        // share sheeta ('aborted') milczy, 'failed' dostaje komunikat, sheet
        // zostaje otwarty w obu przypadkach.
        const result = await downloadWorkoutsCsvFile(workouts, {
          onShareError: (err) => reportClientErrorWithCurrentUid({
            code: 'csv-export-share',
            phase: 'other',
            detail: err instanceof Error ? err.message : String(err),
          }),
        });
        if (result === 'aborted') return;
        if (result === 'failed') {
          toast({ title: t('history.exportFailed'), variant: 'destructive' });
          return;
        }
        toast({ title: t('data.export.done'), description: t('data.exportCsv.doneDesc') });
      } else {
        const now = new Date();
        const model = buildTrainingReportModel(workouts, now);
        const blob = await generateTrainingReportPdf(model, lang, unit, displayName, now);
        const file = new File([blob], `strength-save-raport-${formatLocalDate(now)}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: t('report.title'), files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
      onOpenChange(false);
    } catch (err) {
      // Anulowanie systemowego share to nie błąd (wzorzec Analytics).
      if (!(err instanceof Error && err.name === 'AbortError')) {
        toast({ title: t('history.exportFailed'), variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCoach = () => {
    // Rodzic otwiera EmailWorkoutDialog (history) — sheet zamykamy NAJPIERW.
    onOpenChange(false);
    onSendToCoach();
  };

  const scopeChips: Array<{ id: ExportScope; label: string; disabled: boolean }> = [
    { id: 'period', label: t('history.scopePeriod'), disabled: period === null },
    { id: 'cycle', label: t('history.scopeCycle'), disabled: !hasCycles },
    { id: 'all', label: t('history.scopeAll'), disabled: false },
  ];

  const formatRows: Array<{
    id: string;
    testId: string;
    icon: JSX.Element;
    label: string;
    desc: string;
    onClick: () => void;
    busy: boolean;
  }> = [
    {
      id: 'pdf',
      testId: 'export-format-pdf',
      icon: <FileText className="h-4 w-4 text-primary" />,
      label: t('history.formatPdf'),
      desc: t('history.formatPdfDesc'),
      onClick: () => { void runExport('pdf'); },
      busy: busy === 'pdf',
    },
    {
      id: 'csv',
      testId: 'export-format-csv',
      icon: <Table2 className="h-4 w-4 text-primary" />,
      label: t('history.formatCsv'),
      desc: t('history.formatCsvDesc'),
      onClick: () => { void runExport('csv'); },
      busy: busy === 'csv',
    },
    {
      id: 'coach',
      testId: 'history-email',
      icon: <Mail className="h-4 w-4 text-primary" />,
      label: t('email.sendToCoach'),
      // WP-I: imię przed adresem (surowy email w opisie tylko gdy brak imienia).
      desc: trainerName || trainerEmail || t('history.formatCoachDesc'),
      onClick: handleCoach,
      busy: false,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        data-testid="history-export-sheet"
      >
        <SheetHeader className="text-left">
          <p className="eyebrow-mono text-muted-foreground">{t('history.export')}</p>
          <SheetTitle className="font-heading text-2xl font-bold uppercase">{scopeTitle}</SheetTitle>
          <SheetDescription className="sr-only">{t('history.exportSheetDesc')}</SheetDescription>
        </SheetHeader>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
          role="radiogroup"
          aria-label={t('history.exportRangeLabel')}
        >
          {scopeChips.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={scope === item.id}
              disabled={item.disabled}
              data-testid={`export-scope-${item.id}`}
              onClick={() => setScope(item.id)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                scope === item.id ? 'bg-accent text-accent-foreground' : 'bg-surface-highest text-muted-foreground',
                item.disabled && 'opacity-40',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* WP-D (X35a): lista cykli (wiersze radio, zawijane, bez scrolla poziomego). */}
        {scope === 'cycle' && hasCycles && (
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={t('exportCsv.cyclePlaceholder')}
            data-testid="export-cycle-list"
          >
            {cycleOptions.map((option) => {
              const checked = option.id === selectedCycleId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  data-testid={`export-cycle-${option.id}`}
                  onClick={() => setSelectedCycleId(option.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-[15px] px-4 py-3 text-left transition-colors',
                    checked ? 'bg-accent/10 ring-1 ring-accent' : 'bg-surface-highest',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                      checked ? 'border-accent' : 'border-muted-foreground/50',
                    )}
                  >
                    {checked && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-[20px] bg-surface-lowest">
          {formatRows.map((row) => (
            <button
              key={row.id}
              type="button"
              data-testid={row.testId}
              onClick={row.onClick}
              disabled={busy !== null}
              className="flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                {row.busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{row.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="export-cancel"
          onClick={() => onOpenChange(false)}
          className="mt-4 h-[50px] w-full rounded-[15px] bg-surface-high text-sm font-semibold"
        >
          {t('common.cancel')}
        </button>
      </SheetContent>
    </Sheet>
  );
};

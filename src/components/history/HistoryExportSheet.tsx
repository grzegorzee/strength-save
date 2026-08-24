import { useEffect, useState } from 'react';
import { ChevronRight, FileText, Loader2, Mail, Table2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { buildTrainingReportModel, generateTrainingReportPdf } from '@/lib/pdf-report';
import { downloadWorkoutsCsvFile, fetchWorkoutsForBounds } from '@/lib/workout-csv-download';
import type { ExportRangeBounds } from '@/lib/workout-export-range';
import { cn, formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { toast } from '@/hooks/use-toast';

// WP-H (X28), design 2c: jeden Export Historii jako bottom sheet. Chipsy
// zakresu (Ten okres / Aktywny cykl / Cała historia) + formaty delegujące do
// ISTNIEJĄCYCH mechanizmów: pdf-report, wspólna ścieżka CSV
// (workout-csv-download), EmailWorkoutDialog history (otwiera rodzic).
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
  /** Aktywny cykl: zakres dat (endDate '' => dziś) + etykieta; null = brak. */
  activeCycleRange: { fromDate: string; toDate: string } | null;
  activeCycleLabel: string | null;
  trainerEmail?: string;
  onSendToCoach: () => void;
}

export const HistoryExportSheet = ({
  open, onOpenChange, uid, displayName, period, periodLabel,
  activeCycleRange, activeCycleLabel, trainerEmail, onSendToCoach,
}: HistoryExportSheetProps) => {
  const { t, lang } = useTranslation();
  const { unit } = useUnit();
  const [scope, setScope] = useState<ExportScope>('all');
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  // Edge 6: domyślny zakres = okres gdy ustawiony, inaczej aktywny cykl, inaczej wszystko.
  useEffect(() => {
    if (!open) return;
    setScope(period ? 'period' : activeCycleRange ? 'cycle' : 'all');
    setBusy(null);
  }, [open, period, activeCycleRange]);

  const todayStr = formatLocalDate(new Date());
  const boundsFor = (target: ExportScope): ExportRangeBounds => {
    if (target === 'period' && period) {
      return { mode: 'dates', fromDate: period.from || '1970-01-01', toDate: period.to || todayStr };
    }
    if (target === 'cycle' && activeCycleRange) {
      return { mode: 'dates', fromDate: activeCycleRange.fromDate, toDate: activeCycleRange.toDate };
    }
    return { mode: 'dates', fromDate: '1970-01-01', toDate: todayStr };
  };

  const scopeTitle = scope === 'period' && periodLabel
    ? periodLabel
    : scope === 'cycle' && activeCycleLabel
      ? activeCycleLabel
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
        await downloadWorkoutsCsvFile(workouts);
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
    { id: 'cycle', label: t('history.scopeActiveCycle'), disabled: activeCycleRange === null },
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
      desc: trainerEmail || t('history.formatCoachDesc'),
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

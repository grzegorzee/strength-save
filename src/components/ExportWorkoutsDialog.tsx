// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport treningów do CSV
// z wyborem zakresu. W całości klientsko: fetchWorkoutHistoryPage (completed)
// + format z lib/workout-csv + Blob flow (ten sam wzorzec pobierania pliku co
// eksport JSON w DataManagement, działa też w natywnym WKWebView).
// Dwa punkty wejścia (Historia, Ustawienia → Dane) otwierają TEN SAM dialog.
import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RangeCalendar } from '@/components/ui/range-calendar';
import {
  exportRangeBounds,
  type ExportRangeKind,
} from '@/lib/workout-export-range';
// WP-H (X28): fetch stron zakresu + budowa/pobranie CSV wydzielone do lib —
// ta sama ścieżka co Export sheet Historii.
import { downloadWorkoutsCsvFile, fetchWorkoutsForBounds } from '@/lib/workout-csv-download';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import { cn } from '@/lib/utils';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';

interface ExportWorkoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  cycles: PlanCycle[];
}

export const ExportWorkoutsDialog = ({ open, onOpenChange, uid, cycles }: ExportWorkoutsDialogProps) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ExportRangeKind>('week');
  const [cycleId, setCycleId] = useState<string>('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedCycle = cycles.find((c) => c.id === cycleId);
  const today = formatLocalDate(new Date());
  const bounds = exportRangeBounds({
    kind,
    ...(selectedCycle ? { cycle: { startDate: selectedCycle.startDate, endDate: selectedCycle.endDate } } : {}),
    from: customFrom,
    to: customTo,
  }, today);

  // Podgląd liczby treningów: świeży fetch po każdej zmianie zakresu.
  const boundsKey = JSON.stringify(bounds);
  useEffect(() => {
    if (!open) return;
    if (!bounds) {
      setWorkouts([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchWorkoutsForBounds(uid, bounds)
      .then((items) => {
        if (cancelled) return;
        setWorkouts(items);
      })
      .catch(() => {
        if (cancelled) return;
        setWorkouts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boundsKey reprezentuje bounds
  }, [open, uid, boundsKey]);

  // Bug 26 (X30): toast sukcesu TYLKO gdy plik realnie wyszedl (Z198) — na
  // native user zamykajacy share sheet dostawal falszywe 'Wyeksportowano'.
  const handleExport = async () => {
    if (workouts.length === 0) return;
    const result = await downloadWorkoutsCsvFile(workouts, {
      onShareError: (err) => reportClientErrorWithCurrentUid({
        code: 'csv-export-share',
        phase: 'other',
        detail: err instanceof Error ? err.message : String(err),
      }),
    });
    if (result === 'aborted') return;
    if (result === 'failed') {
      toast({ title: t('data.export.failed'), description: t('data.export.failedDesc'), variant: 'destructive' });
      return;
    }
    toast({ title: t('data.export.done'), description: t('data.exportCsv.doneDesc') });
    onOpenChange(false);
  };

  const chips: Array<{ value: ExportRangeKind; label: string; testId: string }> = [
    { value: 'week', label: t('exportCsv.rangeWeek'), testId: 'export-range-week' },
    { value: 'month', label: t('exportCsv.rangeMonth'), testId: 'export-range-month' },
    { value: 'last10', label: t('exportCsv.rangeLast10'), testId: 'export-range-last10' },
    { value: 'last30', label: t('exportCsv.rangeLast30'), testId: 'export-range-last30' },
    { value: 'cycle', label: t('exportCsv.rangeCycle'), testId: 'export-range-cycle' },
    { value: 'custom', label: t('exportCsv.rangeCustom'), testId: 'export-range-custom' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* T20.4: kalendarz wydłuża treść — lokalny scroll zamiast wyjścia poza ekran. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl border-0 bg-surface-low" data-testid="export-workouts-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{t('exportCsv.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('exportCsv.dialogDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-label-md font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t('exportCsv.rangeLabel')}
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('exportCsv.rangeLabel')}>
            {chips.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={kind === option.value}
                data-testid={option.testId}
                onClick={() => setKind(option.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm transition-colors',
                  kind === option.value
                    ? 'border-primary bg-primary/10 font-semibold text-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {kind === 'cycle' && (
          cycles.length > 0 ? (
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger data-testid="export-cycle-select">
                <SelectValue placeholder={t('exportCsv.cyclePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.startDate} → {cycle.endDate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">{t('exportCsv.noCycles')}</p>
          )
        )}
        {kind === 'custom' && (
          // T20.4: kalendarz zakresu inline (booking-style); stan i logika
          // exportRangeBounds bez zmian (from bez to = od from do dziś).
          <RangeCalendar
            value={{ from: customFrom || null, to: customTo || null }}
            onChange={(next) => {
              setCustomFrom(next.from ?? '');
              setCustomTo(next.to ?? '');
            }}
            maxDate={today}
            testId="export-custom-range"
          />
        )}
        <p className="text-sm text-muted-foreground" data-testid="export-preview">
          {isLoading ? t('exportCsv.loading') : t('exportCsv.preview', { count: workouts.length })}
        </p>
        <DialogFooter>
          <Button
            onClick={handleExport}
            disabled={isLoading || workouts.length === 0}
            className="kinetic-primary-button"
            data-testid="export-submit"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t('exportCsv.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

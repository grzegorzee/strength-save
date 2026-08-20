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
import { Input } from '@/components/ui/input';
import { buildWorkoutsCsv } from '@/lib/workout-csv';
import {
  exportFileName,
  exportRangeBounds,
  type ExportRangeKind,
} from '@/lib/workout-export-range';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { fetchWorkoutHistoryPage, type WorkoutHistoryCursor } from '@/lib/workout-read-store';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';

interface ExportWorkoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  cycles: PlanCycle[];
}

/** Zakres dat: dociągamy strony aż do końca (limit bezpieczeństwa). */
const MAX_RANGE_PAGES = 20;

const fetchForBounds = async (
  uid: string,
  bounds: NonNullable<ReturnType<typeof exportRangeBounds>>,
): Promise<WorkoutSession[]> => {
  if (bounds.mode === 'lastN') {
    const page = await fetchWorkoutHistoryPage(uid, { completed: true, pageSize: bounds.limit });
    return page.workouts.slice(0, bounds.limit);
  }
  const all: WorkoutSession[] = [];
  let cursor: WorkoutHistoryCursor | null = null;
  for (let i = 0; i < MAX_RANGE_PAGES; i += 1) {
    const page = await fetchWorkoutHistoryPage(uid, {
      fromDate: bounds.fromDate,
      toDate: bounds.toDate,
      completed: true,
      cursor,
    });
    all.push(...page.workouts);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
};

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
    fetchForBounds(uid, bounds)
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

  const handleExport = () => {
    if (workouts.length === 0) return;
    // Liczba PR per sesja z tej samej logiki co wiersze Historii.
    const meta = buildHistoryRowMeta(workouts);
    const prCounts = Object.fromEntries([...meta].map(([id, m]) => [id, m.prCount]));
    const csv = buildWorkoutsCsv(workouts, prCounts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(workouts);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <DialogContent className="rounded-xl border-0 bg-surface-low" data-testid="export-workouts-dialog">
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
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label={t('exportCsv.rangeCustom')}
              data-testid="export-custom-from"
            />
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label={t('exportCsv.rangeCustom')}
              data-testid="export-custom-to"
            />
          </div>
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

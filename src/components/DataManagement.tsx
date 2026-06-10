import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Upload, Trash2, Loader2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface DataManagementProps {
  onExport: () => string;
  onImport: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  onCleanup?: () => Promise<{ deleted: number; error?: string }>;
  onRepair?: () => Promise<{ updated: number; scanned: number; error?: string }>;
  /** ID istniejących treningów — do policzenia, ile rekordów import nadpisze. */
  existingWorkoutIds?: string[];
  /** Blokuje operacje, dopóki dane się nie załadują (eksport przed snapshotem = pusty backup). */
  disabled?: boolean;
  title?: string;
  description?: string;
  exportLabel?: string;
  importLabel?: string;
  cleanupLabel?: string;
  repairLabel?: string;
}

interface PendingImport {
  content: string;
  date: string | null;
  workouts: number;
  measurements: number;
  cycles: number;
  hasPlan: boolean;
  overwrites: number;
}

export const DataManagement = ({
  onExport,
  onImport,
  onCleanup,
  onRepair,
  existingWorkoutIds,
  disabled,
  title,
  description,
  exportLabel,
  importLabel,
  cleanupLabel,
  repairLabel,
}: DataManagementProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairConfirmOpen, setRepairConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittracker-backup-${formatLocalDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('data.export.done'),
      description: t('data.export.doneDesc'),
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Wybór pliku NIE importuje od razu — najpierw dialog z podsumowaniem (co i ile nadpisze).
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const data = JSON.parse(content) as {
          workouts?: Array<{ id?: string }>;
          measurements?: unknown[];
          planCycles?: unknown[];
          trainingPlan?: { days?: unknown[] };
          exportedAt?: string;
        };
        const workoutIds = Array.isArray(data.workouts)
          ? data.workouts.map((w) => w?.id).filter((id): id is string => typeof id === 'string')
          : [];
        const existing = new Set(existingWorkoutIds ?? []);
        setPendingImport({
          content,
          date: typeof data.exportedAt === 'string' ? data.exportedAt.slice(0, 10) : null,
          workouts: workoutIds.length,
          measurements: Array.isArray(data.measurements) ? data.measurements.length : 0,
          cycles: Array.isArray(data.planCycles) ? data.planCycles.length : 0,
          hasPlan: Array.isArray(data.trainingPlan?.days) && data.trainingPlan.days.length > 0,
          overwrites: workoutIds.filter((id) => existing.has(id)).length,
        });
      } catch {
        toast({ title: t('data.import.error'), description: t('data.importError'), variant: 'destructive' });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setIsImporting(true);
    const result = await onImport(pendingImport.content);
    setIsImporting(false);
    setPendingImport(null);

    toast({
      title: result.success ? t('data.import.done') : t('data.import.error'),
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleCleanup = async () => {
    if (!onCleanup) return;

    setIsCleaningUp(true);
    const result = await onCleanup();
    setIsCleaningUp(false);

    if (result.error) {
      toast({
        title: t('data.error'),
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    if (result.deleted === 0) {
      toast({
        title: t('data.cleanup.none'),
        description: t('data.cleanup.noneDesc'),
      });
    } else {
      toast({
        title: t('data.cleanup.done'),
        description: t('data.cleanup.doneDesc', { count: result.deleted }),
      });
    }
  };

  const handleRepair = async () => {
    if (!onRepair) return;

    setIsRepairing(true);
    const result = await onRepair();
    setIsRepairing(false);

    if (result.error) {
      toast({ title: t('data.repair.error'), description: result.error, variant: 'destructive' });
      return;
    }
    toast({
      title: result.updated === 0 ? t('data.repair.none') : t('data.repair.done'),
      description: result.updated === 0
        ? t('data.repair.noneDesc', { scanned: result.scanned })
        : t('data.repair.doneDesc', { updated: result.updated, scanned: result.scanned }),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title ?? t('data.title')}</CardTitle>
          <CardDescription>{description ?? t('data.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleExport} variant="outline" className="w-full text-xs sm:text-sm" disabled={disabled}>
              <Download className="h-4 w-4 mr-1.5 shrink-0" />
              {exportLabel ?? t('data.exportLabel')}
            </Button>
            <Button onClick={handleImportClick} variant="outline" className="w-full text-xs sm:text-sm" disabled={disabled}>
              <Upload className="h-4 w-4 mr-1.5 shrink-0" />
              {importLabel ?? t('data.importLabel')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {onRepair && (
            <Button
              onClick={() => setRepairConfirmOpen(true)}
              variant="outline"
              className="w-full text-fitness-cyan border-fitness-cyan/40 hover:bg-fitness-cyan/10"
              disabled={isRepairing || disabled}
            >
              {isRepairing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              {repairLabel ?? t('data.repairLabel')}
            </Button>
          )}

          {onCleanup && (
            <Button
              onClick={handleCleanup}
              variant="outline"
              className="w-full text-fitness-warning border-fitness-warning/40 hover:bg-fitness-warning/10"
              disabled={isCleaningUp || disabled}
            >
              {isCleaningUp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {cleanupLabel ?? t('data.cleanupLabel')}
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingImport} onOpenChange={(open) => { if (!open && !isImporting) setPendingImport(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('data.import.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport && t('data.import.confirmDesc', {
                date: pendingImport.date ?? t('data.import.unknownDate'),
                workouts: pendingImport.workouts,
                measurements: pendingImport.measurements,
                cycles: pendingImport.cycles,
                plan: pendingImport.hasPlan ? '✓' : '—',
                overwrites: pendingImport.overwrites,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleConfirmImport(); }} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {importLabel ?? t('data.importLabel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={repairConfirmOpen} onOpenChange={setRepairConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{repairLabel ?? t('data.repairLabel')}</AlertDialogTitle>
            <AlertDialogDescription>{t('data.repair.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRepairing}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); setRepairConfirmOpen(false); void handleRepair(); }} disabled={isRepairing}>
              {repairLabel ?? t('data.repairLabel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

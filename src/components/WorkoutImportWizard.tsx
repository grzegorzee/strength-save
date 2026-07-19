import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUp, Loader2, Undo2, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { parseWorkoutCsv, type ParseResult } from '@/lib/workout-import/parser';
import { autoMapExercises, buildImportedSessions } from '@/lib/workout-import/mapper';
import {
  addImportHistoryEntry,
  computeImportBatchId,
  loadImportHistory,
  removeImportHistoryEntry,
  type ImportHistoryEntry,
} from '@/lib/workout-import/batch';

type WizardStep = 'file' | 'mapping' | 'confirm' | 'writing' | 'done';

/**
 * Kreator importu historii ze Strong/Hevy (Z110). Parser w 100% kliencki; zapis
 * WYŁĄCZNIE nowych dokumentów imported-<hash>-<n> po jawnym zatwierdzeniu podglądu.
 */
export const WorkoutImportWizard = () => {
  const { t } = useTranslation();
  const { uid } = useCurrentUser();
  const { importCsvSessions, deleteImportBatch } = useFirebaseWorkouts(uid);
  const { customExercises, addCustomExercise } = useCustomExercises(uid);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('file');
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [strongUnit, setStrongUnit] = useState<'kg' | 'lbs'>('kg');
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({});
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [writtenCount, setWrittenCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>(() => loadImportHistory());
  const [undoingBatch, setUndoingBatch] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed: ParseResult = useMemo(
    () => (fileText ? parseWorkoutCsv(fileText, { strongWeightUnit: strongUnit }) : { workouts: [], skippedRows: 0, format: null }),
    [fileText, strongUnit],
  );

  const importedNames = useMemo(
    () => Array.from(new Set(parsed.workouts.flatMap((w) => w.exercises.map((e) => e.name)))),
    [parsed],
  );
  const autoMap = useMemo(
    () => autoMapExercises(importedNames, exerciseLibrary, customExercises),
    [importedNames, customExercises],
  );

  const stats = useMemo(() => {
    const dates = parsed.workouts.map((w) => w.date).sort();
    const setCount = parsed.workouts.reduce(
      (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0), 0);
    return {
      workouts: parsed.workouts.length,
      sets: setCount,
      dateFrom: dates[0] ?? '',
      dateTo: dates[dates.length - 1] ?? '',
    };
  }, [parsed]);

  const batchId = useMemo(() => (fileText ? computeImportBatchId(fileText) : ''), [fileText]);

  const finalMapping = useMemo(() => {
    const merged = new Map(autoMap.mapped);
    for (const [original, target] of Object.entries(manualMapping)) {
      if (target) merged.set(original, target);
    }
    return merged;
  }, [autoMap.mapped, manualMapping]);

  const stillUnmapped = autoMap.unmapped.filter((name) => !manualMapping[name]);

  const reset = () => {
    setStep('file');
    setFileName('');
    setFileText('');
    setManualMapping({});
    setConfirmChecked(false);
    setProgressPct(0);
    setWrittenCount(0);
    setError(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
    const result = parseWorkoutCsv(text, { strongWeightUnit: strongUnit });
    if (!result.format || result.workouts.length === 0) {
      setError(t('import.errUnknownFormat'));
      setFileText('');
      return;
    }
    setStep('mapping');
  };

  const handleImportUnmappedAsCustom = async (name: string) => {
    const created = await addCustomExercise({
      name: name.slice(0, 80),
      category: 'core',
      isBodyweight: false,
      type: 'compound',
    });
    setManualMapping((prev) => ({ ...prev, [name]: created.name }));
  };

  const handleWrite = async () => {
    if (!confirmChecked || !uid) return;
    setStep('writing');
    setError(null);
    const sessions = buildImportedSessions(parsed.workouts, finalMapping, uid, batchId);
    const result = await importCsvSessions(sessions, (written, total) => {
      setProgressPct(Math.round((written / total) * 100));
    });
    if (!result.success) {
      setError(result.error ?? t('import.errWrite'));
      setStep('confirm');
      return;
    }
    setWrittenCount(result.written);
    addImportHistoryEntry({
      batchId,
      fileName,
      importedAt: new Date().toISOString(),
      workoutCount: result.written,
      format: parsed.format!,
    });
    setHistory(loadImportHistory());
    setStep('done');
  };

  const handleUndo = async (entry: ImportHistoryEntry) => {
    setUndoingBatch(entry.batchId);
    const result = await deleteImportBatch(entry.batchId);
    setUndoingBatch(null);
    if (result.success) {
      removeImportHistoryEntry(entry.batchId);
      setHistory(loadImportHistory());
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => { reset(); setOpen(true); }}
        data-testid="import-wizard-open"
      >
        <FileUp className="h-4 w-4" />
        {t('import.openButton')}
      </Button>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-tight">{t('import.title')}</DialogTitle>
            <DialogDescription>{t('import.subtitle')}</DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive" data-testid="import-error">{error}</p>}

          {step === 'file' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                data-testid="import-file-input"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <Button className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="h-4 w-4" />
                {t('import.pickFile')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('import.privacyNote')}</p>

              {history.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('import.historyTitle')}</p>
                  {history.map((entry) => (
                    <div key={entry.batchId} className="flex items-center justify-between gap-2 rounded-lg bg-surface-lowest p-2.5" data-testid="import-history-entry">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('import.historyMeta', { n: entry.workoutCount, date: entry.importedAt.slice(0, 10) })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={undoingBatch === entry.batchId}
                        onClick={() => void handleUndo(entry)}
                        data-testid="import-undo"
                      >
                        {undoingBatch === entry.batchId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        {t('import.undo')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-lowest p-3 text-sm" data-testid="import-summary">
                <p><strong>{stats.workouts}</strong> {t('import.summaryWorkouts')} · <strong>{stats.sets}</strong> {t('import.summarySets')}</p>
                <p className="text-muted-foreground">{stats.dateFrom} — {stats.dateTo} · {parsed.format === 'strong' ? 'Strong' : 'Hevy'}</p>
                {parsed.skippedRows > 0 && (
                  <p className="text-fitness-warning">{t('import.skippedRows', { n: parsed.skippedRows })}</p>
                )}
              </div>

              {parsed.format === 'strong' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('import.strongUnit')}</span>
                  {(['kg', 'lbs'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setStrongUnit(unit)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${strongUnit === unit ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground'}`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-sm" data-testid="import-mapping-stats">
                {t('import.autoMapped', { mapped: autoMap.mapped.size, total: importedNames.length })}
              </p>

              {autoMap.unmapped.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('import.unmappedTitle')}</p>
                  {autoMap.unmapped.map((name) => (
                    <div key={name} className="space-y-1 rounded-lg bg-surface-lowest p-2.5">
                      <p className="text-sm font-medium">{name}</p>
                      <div className="flex gap-2">
                        <select
                          className="h-9 flex-1 rounded-md bg-surface-highest px-2 text-sm"
                          value={manualMapping[name] ?? ''}
                          data-testid="import-map-select"
                          onChange={(e) => setManualMapping((prev) => ({ ...prev, [name]: e.target.value }))}
                        >
                          <option value="">{t('import.pickExercise')}</option>
                          {exerciseLibrary.map((ex) => (
                            <option key={ex.name} value={ex.name}>{localizeExerciseName(ex.name, 'pl')}</option>
                          ))}
                          {customExercises.map((ex) => (
                            <option key={ex.id} value={ex.name}>{ex.name}</option>
                          ))}
                        </select>
                        <Button variant="outline" size="sm" onClick={() => void handleImportUnmappedAsCustom(name)}>
                          {t('import.asCustom')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" onClick={() => setStep('confirm')} data-testid="import-to-confirm">
                {t('common.next')}
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-lowest p-3 text-sm" data-testid="import-confirm-summary">
                <p>{t('import.confirmLine', { workouts: stats.workouts, sets: stats.sets, from: stats.dateFrom, to: stats.dateTo })}</p>
                {stillUnmapped.length > 0 && (
                  <p className="mt-1 text-fitness-warning">{t('import.unmappedWarning', { n: stillUnmapped.length })}</p>
                )}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                  data-testid="import-confirm-checkbox"
                />
                <span>{t('import.confirmCheckbox')}</span>
              </label>
              <Button className="w-full" disabled={!confirmChecked} onClick={() => void handleWrite()} data-testid="import-write">
                {t('import.writeButton', { n: stats.workouts })}
              </Button>
            </div>
          )}

          {step === 'writing' && (
            <div className="space-y-3 py-4">
              <Progress value={progressPct} />
              <p className="text-center text-sm text-muted-foreground">{t('import.writing', { pct: progressPct })}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-fitness-success" />
              <p className="text-sm" data-testid="import-done">{t('import.done', { n: writtenCount })}</p>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toggleButtonClasses } from '@/components/ui/chip-button';
import { Input } from '@/components/ui/input';
import { LocalizedDateInput } from '@/components/LocalizedDateInput';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn, formatLocalDate } from '@/lib/utils';
import { parseDecimalInput } from '@/lib/decimal-input';
import { getActivityIcon } from '@/lib/activity-icons';
import {
  MANUAL_ACTIVITY_TYPES,
  type ManualActivity,
  type ManualActivityInput,
  type ManualActivityType,
  type PerceivedIntensity,
} from '@/lib/manual-activity';
import { useHealthConsent } from '@/hooks/useHealthConsent';

interface AddCardioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data domyślna nowego wpisu (kalendarz podaje wybrany dzień). */
  defaultDate?: string;
  /** Tryb edycji istniejącego wpisu manualnego. */
  editActivity?: ManualActivity | null;
  onAdd: (input: ManualActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (id: string, input: ManualActivityInput) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Szybki wpis cardio (Z112): typ + czas obowiązkowe, reszta pod "więcej".
 * 15 sekund od tapnięcia do zapisu.
 */
export const AddCardioDialog = ({ open, onOpenChange, defaultDate, editActivity, onAdd, onUpdate, onDelete }: AddCardioDialogProps) => {
  const { t } = useTranslation();
  const healthConsent = useHealthConsent();
  const [type, setType] = useState<ManualActivityType>('Treadmill');
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(defaultDate ?? formatLocalDate(new Date()));
  const [distanceKm, setDistanceKm] = useState('');
  const [avgHR, setAvgHR] = useState('');
  const [calories, setCalories] = useState('');
  const [intensity, setIntensity] = useState<PerceivedIntensity | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Hydracja formularza przy otwarciu (nowy wpis albo edycja).
  useEffect(() => {
    if (!open) return;
    if (editActivity) {
      setType(editActivity.type);
      setMinutes(String(Math.round(editActivity.movingTime / 60)));
      setDate(editActivity.date);
      setDistanceKm(editActivity.distance ? String(editActivity.distance / 1000) : '');
      setAvgHR(editActivity.averageHeartrate ? String(editActivity.averageHeartrate) : '');
      setCalories(editActivity.calories ? String(editActivity.calories) : '');
      setIntensity(editActivity.perceivedIntensity ?? null);
      setNote(editActivity.description ?? '');
    } else {
      setType('Treadmill');
      setMinutes('');
      setDate(defaultDate ?? formatLocalDate(new Date()));
      setDistanceKm('');
      setAvgHR('');
      setCalories('');
      setIntensity(null);
      setNote('');
    }
    setError(null);
  }, [open, editActivity, defaultDate]);

  // Z178: parseDecimalInput zamiast martwego replace — type="number" sanitował
  // przecinek do "" zanim JS go zobaczył.
  const buildInput = (): ManualActivityInput => ({
    type,
    date,
    movingTime: Math.round((parseDecimalInput(minutes) ?? 0) * 60),
    ...(distanceKm && { distance: Math.round((parseDecimalInput(distanceKm) ?? 0) * 1000) }),
    ...(healthConsent && avgHR && { averageHeartrate: parseDecimalInput(avgHR) ?? 0 }),
    ...(healthConsent && calories && { calories: parseDecimalInput(calories) ?? 0 }),
    ...(healthConsent && intensity && { perceivedIntensity: intensity }),
    ...(note.trim() && { description: note.trim() }),
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const input = buildInput();
    try {
      const result = editActivity ? await onUpdate(editActivity.id, input) : await onAdd(input);
      if (!result.ok) {
        setError(result.error === 'invalid' ? t('cardio.errInvalid') : t('cardio.errSave'));
        return;
      }
      onOpenChange(false);
    } catch {
      setError(t('cardio.errSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editActivity) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onDelete(editActivity.id);
      if (!result.ok) {
        setError(t('cardio.errSave'));
        return;
      }
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch {
      setError(t('cardio.errSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bottom-[var(--keyboard-inset,0px)] !top-auto !translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-t-[2rem] border-x-0 border-b-0 p-0 sm:!bottom-auto sm:!top-[calc((100dvh-var(--keyboard-inset,0px))/2)] sm:!-translate-y-1/2 sm:rounded-2xl sm:border sm:max-w-md">
        <DialogHeader className="border-b border-outline-variant/40 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="font-heading text-xl font-semibold leading-tight tracking-tight">
            {editActivity ? t('cardio.editTitle') : t('cardio.addTitle')}
          </DialogTitle>
          <DialogDescription className="max-w-sm leading-relaxed">{t('cardio.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <section aria-labelledby="cardio-activity-type" className="space-y-2.5">
            <h3 id="cardio-activity-type" className="text-sm font-semibold text-foreground">
              {t('cardio.activityType')}
            </h3>
            <div className="grid grid-cols-2 gap-2" data-testid="cardio-type-grid">
              {MANUAL_ACTIVITY_TYPES.map((option) => {
                const Icon = getActivityIcon(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    aria-pressed={type === option}
                    className={cn(
                      toggleButtonClasses(type === option),
                      'flex min-h-12 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2 text-left text-xs font-medium leading-tight transition-colors phone:gap-2.5 phone:px-3 phone:text-sm',
                      type === option
                        ? 'border-fitness-cyan bg-fitness-cyan/10 text-fitness-cyan'
                        : 'border-outline-variant/60 bg-surface-high text-foreground',
                    )}
                  >
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg phone:h-8 phone:w-8',
                      type === option ? 'bg-fitness-cyan/10' : 'bg-surface-lowest text-muted-foreground',
                    )}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 whitespace-normal break-normal [overflow-wrap:normal]">
                      {t(`cardio.type.${option}` as Parameters<typeof t>[0])}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Najczęstsze pola są zawsze razem i widoczne bez otwierania kolejnego kroku. */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-low p-3">
            <label className="min-w-0 text-sm font-medium text-foreground">
              <span className="mb-1.5 block text-xs text-muted-foreground">{t('cardio.minutes')}</span>
              <Input
                type="text"
                inputMode="decimal"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="30"
                className="min-h-12 bg-surface-lowest text-lg tabular-nums"
                data-testid="cardio-minutes"
              />
            </label>
            <label className="min-w-0 text-sm font-medium text-foreground">
              <span className="mb-1.5 block text-xs text-muted-foreground">{t('cardio.date')}</span>
              <LocalizedDateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="[&_input]:min-h-12 [&_span]:min-h-12 [&_span]:bg-surface-lowest"
                data-testid="cardio-date"
              />
            </label>
          </div>

          {/* Więcej: opcjonalne pola, bez zmiany kontraktu danych. */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex min-h-12 w-full items-center justify-between rounded-xl bg-surface-low px-3 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t(healthConsent ? 'cardio.more' : 'cardio.moreBasic')}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className={cn('grid gap-3', healthConsent ? 'grid-cols-2' : 'grid-cols-1')}>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('cardio.distanceKm')}</p>
                <Input className="min-h-11" type="text" inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="5.0" data-testid="cardio-distance" />
              </div>
              {healthConsent && (
                <>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('cardio.avgHR')}</p>
                    <Input className="min-h-11" type="number" inputMode="numeric" min={30} max={250} value={avgHR} onChange={(e) => setAvgHR(e.target.value)} placeholder="140" data-testid="cardio-hr" />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('cardio.calories')}</p>
                    <Input className="min-h-11" type="number" inputMode="numeric" min={1} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="300" data-testid="cardio-calories" />
                  </div>
                </>
              )}
            </div>
            {healthConsent && <div>
              <p className="mb-1.5 text-xs font-medium leading-relaxed text-muted-foreground">{t('cardio.intensity')}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'moderate', 'hard'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIntensity((prev) => (prev === option ? null : option))}
                    aria-pressed={intensity === option}
                    className={cn(
                      'min-h-11 rounded-xl px-2 text-xs font-semibold transition-colors',
                      toggleButtonClasses(intensity === option),
                      intensity === option ? 'bg-primary/15 text-primary' : 'bg-surface-highest text-muted-foreground',
                    )}
                    data-testid={`cardio-intensity-${option}`}
                  >
                    {t(`cardio.intensity.${option}` as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('cardio.notePlaceholder')}
              maxLength={2000}
              className="min-h-20 text-sm"
            />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div data-testid="cardio-footer" className="sticky bottom-0 space-y-3 border-t border-outline-variant/40 bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            {editActivity && (
              <Button
                variant="outline"
                className="min-h-12 gap-1.5 rounded-xl text-destructive"
                disabled={saving}
                onClick={() => setDeleteConfirmOpen(true)}
                data-testid="cardio-delete"
              >
                <Trash2 className="h-4 w-4" />
                {t('cardio.delete')}
              </Button>
            )}
            <Button
              className="min-h-12 flex-1 rounded-xl font-heading text-base font-semibold"
              disabled={saving || !minutes || Math.round((parseDecimalInput(minutes) ?? 0) * 60) <= 0}
              onClick={() => void handleSave()}
              data-testid="cardio-save"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editActivity ? t('common.save') : t('cardio.add')}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t('cardio.deleteConfirmTitle')}
          description={t('cardio.deleteConfirmDesc')}
          confirmLabel={t('cardio.delete')}
          onConfirm={() => void handleDelete()}
        />
      </DialogContent>
    </Dialog>
  );
};

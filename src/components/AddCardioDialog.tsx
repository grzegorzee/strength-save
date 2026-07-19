import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn, formatLocalDate } from '@/lib/utils';
import {
  MANUAL_ACTIVITY_TYPES,
  type ManualActivity,
  type ManualActivityInput,
  type ManualActivityType,
  type PerceivedIntensity,
} from '@/lib/manual-activity';

const TYPE_ICONS: Record<ManualActivityType, string> = {
  Run: '🏃', Ride: '🚴', Walk: '🚶', Hike: '🥾', Swim: '🏊',
  Treadmill: '🏃', IndoorRide: '🚴', JumpRope: '🪢', HIIT: '🔥', Other: '🏅',
};

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

  const buildInput = (): ManualActivityInput => ({
    type,
    date,
    movingTime: Math.round((parseFloat(minutes.replace(',', '.')) || 0) * 60),
    ...(distanceKm && { distance: Math.round((parseFloat(distanceKm.replace(',', '.')) || 0) * 1000) }),
    ...(avgHR && { averageHeartrate: parseFloat(avgHR) }),
    ...(calories && { calories: parseFloat(calories) }),
    ...(intensity && { perceivedIntensity: intensity }),
    ...(note.trim() && { description: note.trim() }),
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const input = buildInput();
    const result = editActivity ? await onUpdate(editActivity.id, input) : await onAdd(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error === 'invalid' ? t('cardio.errInvalid') : t('cardio.errSave'));
      return;
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editActivity) return;
    setSaving(true);
    await onDelete(editActivity.id);
    setSaving(false);
    setDeleteConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">
            {editActivity ? t('cardio.editTitle') : t('cardio.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('cardio.subtitle')}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Typ: grid jedna warstwa */}
        <div className="grid grid-cols-5 gap-1.5" data-testid="cardio-type-grid">
          {MANUAL_ACTIVITY_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors',
                type === option ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground',
              )}
            >
              <span className="text-base">{TYPE_ICONS[option]}</span>
              {t(`cardio.type.${option}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {/* Czas + data */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.minutes')}</p>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="30"
              data-testid="cardio-minutes"
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.date')}</p>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="cardio-date" />
          </div>
        </div>

        {/* Więcej: opcjonalne pola */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('cardio.more')}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.distanceKm')}</p>
                <Input type="number" inputMode="decimal" min={0} step={0.1} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="5.0" data-testid="cardio-distance" />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.avgHR')}</p>
                <Input type="number" inputMode="numeric" min={30} max={250} value={avgHR} onChange={(e) => setAvgHR(e.target.value)} placeholder="140" data-testid="cardio-hr" />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.calories')}</p>
                <Input type="number" inputMode="numeric" min={1} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="300" data-testid="cardio-calories" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cardio.intensity')}</p>
              <div className="flex gap-1.5">
                {(['easy', 'moderate', 'hard'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIntensity((prev) => (prev === option ? null : option))}
                    aria-pressed={intensity === option}
                    className={cn(
                      'flex-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                      intensity === option ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground',
                    )}
                    data-testid={`cardio-intensity-${option}`}
                  >
                    {t(`cardio.intensity.${option}` as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('cardio.notePlaceholder')}
              maxLength={2000}
              className="min-h-[60px] text-sm"
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          {editActivity && (
            <Button
              variant="outline"
              className="gap-1.5 text-destructive"
              disabled={saving}
              onClick={() => setDeleteConfirmOpen(true)}
              data-testid="cardio-delete"
            >
              <Trash2 className="h-4 w-4" />
              {t('cardio.delete')}
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={saving || !minutes || Math.round((parseFloat(minutes.replace(',', '.')) || 0) * 60) <= 0}
            onClick={() => void handleSave()}
            data-testid="cardio-save"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editActivity ? t('common.save') : t('cardio.add')}
          </Button>
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

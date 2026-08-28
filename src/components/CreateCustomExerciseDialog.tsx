import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import type { CustomExerciseInput } from '@/hooks/useCustomExercises';
import type { TrackingType } from '@/lib/set-tracking';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeCategory } from '@/data/exercise-i18n';
import { useToast } from '@/hooks/use-toast';

export interface CreateCustomExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Zapis nowego ćwiczenia (useCustomExercises.addCustomExercise). */
  onCreate: (input: CustomExerciseInput) => Promise<unknown>;
  defaultName?: string;
}

// 'standard' = brak pola tracking w zapisie (weight_reps / bodyweight_reps z isBodyweight).
type TrackingChoice = 'standard' | Extract<TrackingType, 'duration' | 'weight_distance_duration' | 'assisted_bodyweight'>;

// X28 WP-A: kompaktowy formularz nowego własnego ćwiczenia dla /exercises —
// bez listy biblioteki i bez suwaka kategorii (to nie picker). Walidacja jak
// w ExercisePicker: nazwa trim 2..80, reszta pól ma defaulty (zapis jednym tapem).
export const CreateCustomExerciseDialog = ({
  open,
  onOpenChange,
  onCreate,
  defaultName,
}: CreateCustomExerciseDialogProps) => {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(defaultName ?? '');
  const [category, setCategory] = useState<LibraryExercise['category']>('chest');
  const [type, setType] = useState<'compound' | 'isolation'>('compound');
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [tracking, setTracking] = useState<TrackingChoice>('standard');
  const [isSaving, setIsSaving] = useState(false);

  // Świeży formularz przy każdym otwarciu (defaultName może się różnić między otwarciami).
  useEffect(() => {
    if (!open) return;
    setName(defaultName ?? '');
    setCategory('chest');
    setType('compound');
    setIsBodyweight(false);
    setTracking('standard');
    setIsSaving(false);
  }, [open, defaultName]);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 80;

  const trackingOptions: Array<[TrackingChoice, string]> = [
    ['standard', t('tracking.standard')],
    ['duration', t('tracking.duration')],
    ['weight_distance_duration', t('tracking.weightDistanceDuration')],
    ['assisted_bodyweight', t('tracking.assistedBodyweight')],
  ];

  const handleSave = async () => {
    if (!nameValid || isSaving) return;
    setIsSaving(true);
    try {
      await onCreate({
        name: trimmed,
        category,
        isBodyweight,
        type,
        ...(tracking !== 'standard' ? { tracking } : {}),
      });
      toast({ title: t('custom.toastCreatedTitle') });
      onOpenChange(false);
    } catch {
      // Zapis nie przeszedł (offline/rules) — dialog zostaje otwarty z danymi.
      toast({
        title: t('custom.toastSaveFailTitle'),
        description: t('custom.toastSaveFailDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* BEZ max-h w className — dziedziczy keyboard-aware max-h z ui/dialog (X28 WP-A). */}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold uppercase tracking-tight">
            {t('exercises.newCustom')}
          </DialogTitle>
          <DialogDescription>{t('custom.dialogDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('custom.namePlaceholder')}
            maxLength={80}
            autoFocus
          />

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('custom.categoryLabel')}</p>
            <Select value={category} onValueChange={(value) => setCategory(value as LibraryExercise['category'])}>
              <SelectTrigger data-testid="custom-exercise-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as LibraryExercise['category'][]).map((key) => (
                  <SelectItem key={key} value={key}>{localizeCategory(key, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('custom.typeLabel')}</p>
            <Select value={type} onValueChange={(value) => setType(value as 'compound' | 'isolation')}>
              <SelectTrigger data-testid="custom-exercise-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compound">{t('planbuilder.compound')}</SelectItem>
                <SelectItem value="isolation">{t('planbuilder.isolation')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{t('picker.bodyweight')}</p>
            <Switch
              checked={isBodyweight}
              onCheckedChange={setIsBodyweight}
              aria-label={t('picker.bodyweight')}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('custom.trackingLabel')}</p>
            <Select value={tracking} onValueChange={(value) => setTracking(value as TrackingChoice)}>
              <SelectTrigger data-testid="custom-exercise-tracking">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trackingOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" disabled={!nameValid || isSaving} onClick={handleSave}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChipButton } from '@/components/ui/chip-button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { ChevronLeft, Plus, Trash2, Search, Check, Pencil, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeCategory, localizeExerciseName } from '@/data/exercise-i18n';
import { localizeWeekdayShort } from '@/lib/plan-i18n';
import { matchesQuery } from '@/lib/search-utils';

const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 'monday', short: 'Pn', long: 'Poniedziałek' },
  { value: 'tuesday', short: 'Wt', long: 'Wtorek' },
  { value: 'wednesday', short: 'Śr', long: 'Środa' },
  { value: 'thursday', short: 'Cz', long: 'Czwartek' },
  { value: 'friday', short: 'Pt', long: 'Piątek' },
  { value: 'saturday', short: 'So', long: 'Sobota' },
  { value: 'sunday', short: 'Nd', long: 'Niedziela' },
];

const weekdayLong = (value: Weekday) => WEEKDAYS.find(w => w.value === value)?.long ?? value;

const DURATIONS = [8, 10, 12, 16];

let scratchCounter = 0;
const nextId = (prefix: string) => `${prefix}-${(scratchCounter += 1)}`;

interface PlanBuilderProps {
  initialDays?: TrainingDay[];
  initialDurationWeeks?: number;
  /** Klucz localStorage do autozapisu szkicu — refresh/crash nie kasuje ułożonego planu. */
  draftStorageKey?: string;
  onSubmit: (days: TrainingDay[], durationWeeks: number) => void;
  onCancel: () => void;
}

const readBuilderDraft = (key: string | undefined): { days: TrainingDay[]; durationWeeks: number } | null => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { days?: TrainingDay[]; durationWeeks?: number };
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    return { days: parsed.days, durationWeeks: typeof parsed.durationWeeks === 'number' ? parsed.durationWeeks : 12 };
  } catch {
    return null;
  }
};

// Ręczny kreator planu treningowego od zera (bez AI). Użytkownik definiuje dni
// (dzień tygodnia + focus), dodaje ćwiczenia z biblioteki i ustawia serie.
export const PlanBuilder = ({ initialDays, initialDurationWeeks = 12, draftStorageKey, onSubmit, onCancel }: PlanBuilderProps) => {
  const { t, lang } = useTranslation();
  // initialDays (powrót z preview) ma pierwszeństwo przed szkicem z localStorage.
  const [restoredDraft] = useState(() =>
    initialDays && initialDays.length > 0 ? null : readBuilderDraft(draftStorageKey));
  const [days, setDays] = useState<TrainingDay[]>(() =>
    initialDays && initialDays.length > 0
      ? initialDays.map(d => ({ ...d, id: nextId('scratch-d') }))
      : restoredDraft?.days ?? [],
  );
  const [durationWeeks, setDurationWeeks] = useState(restoredDraft?.durationWeeks ?? initialDurationWeeks);

  // Autozapis szkicu przy każdej zmianie; pusty plan czyści wpis.
  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      if (days.length === 0) localStorage.removeItem(draftStorageKey);
      else localStorage.setItem(draftStorageKey, JSON.stringify({ days, durationWeeks }));
    } catch {
      // Brak miejsca w localStorage — szkic to bonus, nie blokujemy buildera.
    }
  }, [draftStorageKey, days, durationWeeks]);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LibraryExercise['category'] | 'all'>('all');
  const [editingSets, setEditingSets] = useState<{ dayId: string; exerciseId: string; value: string } | null>(null);

  const usedWeekdays = new Set(days.map(d => d.weekday));

  const firstFreeWeekday = (): Weekday =>
    WEEKDAYS.find(w => !usedWeekdays.has(w.value))?.value ?? 'monday';

  const addDay = () => {
    if (days.length >= 6) return;
    const weekday = firstFreeWeekday();
    setDays(prev => [...prev, {
      id: nextId('scratch-d'),
      dayName: weekdayLong(weekday),
      weekday,
      focus: '',
      exercises: [],
    }]);
  };

  const removeDay = (dayId: string) => setDays(prev => prev.filter(d => d.id !== dayId));

  const setWeekday = (dayId: string, weekday: Weekday) => {
    setDays(prev => {
      const clash = prev.find(d => d.id !== dayId && d.weekday === weekday);
      return prev.map(d => {
        if (d.id === dayId) return { ...d, weekday, dayName: weekdayLong(weekday) };
        // Zamiana, żeby nie było dwóch dni w tym samym dniu tygodnia.
        if (clash && d.id === clash.id) {
          const old = prev.find(x => x.id === dayId)!.weekday;
          return { ...d, weekday: old, dayName: weekdayLong(old) };
        }
        return d;
      });
    });
  };

  const setFocus = (dayId: string, focus: string) =>
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, focus } : d));

  const addExercise = (dayId: string, ex: LibraryExercise) => {
    setDays(prev => prev.map(d => d.id === dayId ? {
      ...d,
      exercises: [...d.exercises, {
        id: nextId('scratch-ex'),
        name: ex.name,
        sets: ex.type === 'compound' ? '3 x 6-8' : '3 x 10-12',
        instructions: ex.instructions ?? [],
        ...(ex.videoUrl ? { videoUrl: ex.videoUrl } : {}),
      }],
    } : d));
    setPickerDayId(null);
    setSearch('');
    setCategory('all');
  };

  const removeExercise = (dayId: string, exerciseId: string) =>
    setDays(prev => prev.map(d => d.id === dayId
      ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
      : d));

  const saveSets = () => {
    if (!editingSets) return;
    setDays(prev => prev.map(d => d.id === editingSets.dayId ? {
      ...d,
      exercises: d.exercises.map(e => e.id === editingSets.exerciseId ? { ...e, sets: editingSets.value } : e),
    } : d));
    setEditingSets(null);
  };

  const filteredExercises = exerciseLibrary.filter(ex => {
    const matchesCategory = category === 'all' || ex.category === category;
    // Szukamy bez polskich znaków po nazwie PL, EN oraz kategorii.
    const matchesSearch = matchesQuery(search, [ex.name, localizeExerciseName(ex.name, 'en'), localizeCategory(ex.category, lang)]);
    return matchesSearch && matchesCategory;
  });

  // Walidacja: min 1 dzień, każdy dzień ma min 1 ćwiczenie. Cel dnia jest opcjonalny
  // (uzupełniany domyślną nazwą przy zapisie) — wcześniej blokował przycisk przy pustym polu.
  const isValid = days.length > 0 && days.every(d => d.exercises.length > 0);

  const handleSubmit = () => {
    const finalized = days.map((d, i) => ({
      ...d,
      focus: d.focus.trim() || t('planbuilder.defaultFocus', { n: i + 1 }),
    }));
    if (draftStorageKey) {
      try { localStorage.removeItem(draftStorageKey); } catch { /* nieistotne */ }
    }
    onSubmit(finalized, durationWeeks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('planbuilder.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('planbuilder.subtitle')}</p>
        </div>
      </div>

      {days.map((day, i) => {
        const taken = new Set(days.filter(d => d.id !== day.id).map(d => d.weekday));
        return (
          <Card key={day.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t('planbuilder.day', { n: i + 1 })}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDay(day.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(w => {
                  const selected = day.weekday === w.value;
                  return (
                    <ChipButton
                      key={w.value}
                      variant={selected ? 'default' : 'outline'}
                      pressed={selected}
                      className={cn(!selected && taken.has(w.value) && 'opacity-40')}
                      onClick={() => setWeekday(day.id, w.value)}
                    >
                      {localizeWeekdayShort(w.short, lang)}
                    </ChipButton>
                  );
                })}
              </div>

              <Input
                placeholder={t('planbuilder.focusPlaceholderOptional')}
                value={day.focus}
                onChange={e => setFocus(day.id, e.target.value)}
                className="text-sm"
              />

              <div className="space-y-1">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{localizeExerciseName(ex.name, lang)}</p>
                      {editingSets?.dayId === day.id && editingSets?.exerciseId === ex.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={editingSets.value}
                            onChange={e => setEditingSets({ ...editingSets, value: e.target.value })}
                            className="h-7 text-xs w-28"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveSets}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                          onClick={() => setEditingSets({ dayId: day.id, exerciseId: ex.id, value: ex.sets })}
                        >
                          {ex.sets}
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeExercise(day.id, ex.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setPickerDayId(day.id); setSearch(''); setCategory('all'); }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('planbuilder.addExercise')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full" onClick={addDay} disabled={days.length >= 6}>
        <Plus className="h-4 w-4 mr-2" />
        {t('planbuilder.addDay')} {days.length >= 6 && t('planbuilder.maxDays')}
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('planbuilder.planDuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {DURATIONS.map(n => (
              <ChipButton
                key={n}
                variant={durationWeeks === n ? 'default' : 'outline'}
                pressed={durationWeeks === n}
                onClick={() => setDurationWeeks(n)}
              >
                {t('planbuilder.weeksShort', { n })}
              </ChipButton>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />{t('planbuilder.back')}
        </Button>
        <Button className="flex-1" disabled={!isValid} onClick={handleSubmit}>
          <Check className="h-4 w-4 mr-1" />{t('planbuilder.nextToPreview')}
        </Button>
      </div>
      {!isValid && (
        <p className="text-xs text-muted-foreground text-center">
          {t('planbuilder.validationExercises')}
        </p>
      )}

      {/* Exercise picker */}
      <Dialog open={!!pickerDayId} onOpenChange={(open) => { if (!open) { setPickerDayId(null); setSearch(''); setCategory('all'); } }}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="font-heading font-bold uppercase tracking-tight">{t('planbuilder.addExercise')}</DialogTitle>
            <DialogDescription>{t('planbuilder.pickFromLibrary')}</DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('exercises.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-surface-lowest border-0"
                autoFocus
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setCategory('all')}
                className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                  category === 'all' ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}
              >
                {t('exercises.all')}
              </button>
              {(Object.keys(categoryLabels) as LibraryExercise['category'][]).map((key) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                    category === key ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}
                >
                  {localizeCategory(key, lang)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t('planbuilder.resultsCount', { n: filteredExercises.length })}
            </p>
            {filteredExercises.map((ex, i) => (
              <button
                key={i}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface-low hover:bg-surface-high transition-colors"
                onClick={() => pickerDayId && addExercise(pickerDayId, ex)}
              >
                <span className="h-9 w-9 shrink-0 rounded-lg bg-surface-highest flex items-center justify-center text-fitness-cyan">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm truncate">{localizeExerciseName(ex.name, lang)}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {localizeCategory(ex.category, lang)} · {ex.type === 'compound' ? t('planbuilder.compound') : t('planbuilder.isolation')}
                  </span>
                </span>
                <Plus className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
            {filteredExercises.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">{t('planbuilder.noExercisesFound')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ChevronLeft, Plus, Trash2, Search, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

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
  onSubmit: (days: TrainingDay[], durationWeeks: number) => void;
  onCancel: () => void;
}

// Ręczny kreator planu treningowego od zera (bez AI). Użytkownik definiuje dni
// (dzień tygodnia + focus), dodaje ćwiczenia z biblioteki i ustawia serie.
export const PlanBuilder = ({ initialDays, initialDurationWeeks = 12, onSubmit, onCancel }: PlanBuilderProps) => {
  const { t } = useTranslation();
  const [days, setDays] = useState<TrainingDay[]>(() =>
    initialDays && initialDays.length > 0
      ? initialDays.map(d => ({ ...d, id: nextId('scratch-d') }))
      : [],
  );
  const [durationWeeks, setDurationWeeks] = useState(initialDurationWeeks);
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
    const matchesSearch = search === '' || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || ex.category === category;
    return matchesSearch && matchesCategory;
  });

  // Walidacja: min 1 dzień, każdy dzień ma focus i min 1 ćwiczenie.
  const isValid = days.length > 0
    && days.every(d => d.focus.trim() !== '' && d.exercises.length > 0);

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
                    <Badge
                      key={w.value}
                      variant={selected ? 'default' : 'outline'}
                      className={cn('cursor-pointer', !selected && taken.has(w.value) && 'opacity-40')}
                      onClick={() => setWeekday(day.id, w.value)}
                    >
                      {w.short}
                    </Badge>
                  );
                })}
              </div>

              <Input
                placeholder={t('planbuilder.focusPlaceholder')}
                value={day.focus}
                onChange={e => setFocus(day.id, e.target.value)}
                className="text-sm"
              />

              <div className="space-y-1">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
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
              <Badge
                key={n}
                variant={durationWeeks === n ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setDurationWeeks(n)}
              >
                {t('planbuilder.weeksShort', { n })}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />{t('planbuilder.back')}
        </Button>
        <Button className="flex-1" disabled={!isValid} onClick={() => onSubmit(days, durationWeeks)}>
          <Check className="h-4 w-4 mr-1" />{t('planbuilder.nextToPreview')}
        </Button>
      </div>
      {!isValid && (
        <p className="text-xs text-muted-foreground text-center">
          {t('planbuilder.validation')}
        </p>
      )}

      {/* Exercise picker */}
      <Dialog open={!!pickerDayId} onOpenChange={(open) => { if (!open) { setPickerDayId(null); setSearch(''); setCategory('all'); } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('planbuilder.addExercise')}</DialogTitle>
            <DialogDescription>{t('planbuilder.pickFromLibrary')}</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('exercises.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant={category === 'all' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setCategory('all')}>
              {t('exercises.all')}
            </Badge>
            {(Object.entries(categoryLabels) as [LibraryExercise['category'], string][]).map(([key, label]) => (
              <Badge key={key} variant={category === key ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setCategory(key)}>
                {label}
              </Badge>
            ))}
          </div>

          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {filteredExercises.map((ex, i) => (
              <button
                key={i}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => pickerDayId && addExercise(pickerDayId, ex)}
              >
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[ex.category]} · {ex.type === 'compound' ? t('planbuilder.compound') : t('planbuilder.isolation')}
                </p>
              </button>
            ))}
            {filteredExercises.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('planbuilder.noExercisesFound')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

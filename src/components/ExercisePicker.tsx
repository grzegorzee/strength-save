import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import type { CustomExercise, CustomExerciseInput } from '@/hooks/useCustomExercises';
import { Search, Dumbbell, Plus, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeCategory, localizeExerciseName } from '@/data/exercise-i18n';
import { matchesQuery } from '@/lib/search-utils';

export interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wybór pozycji (tap = wybór i zamknięcie). Przy renderFooter tap tylko zaznacza — wybór domyka footer. */
  onPick?: (exercise: LibraryExercise) => void;
  excludeNames?: string[];
  title?: string;
  description?: string;
  /** Kategoria aktywna na starcie (np. swap w podglądzie planu proponuje tę samą partię). */
  initialCategory?: LibraryExercise['category'];
  /** Slot na własny footer po zaznaczeniu (np. zakres swapu "tylko dziś"/"na stałe" w WorkoutDay). */
  renderFooter?: (picked: LibraryExercise) => ReactNode;
  /** Własne ćwiczenia usera (Z71) — sekcja "Twoje ćwiczenia" nad biblioteką. */
  customExercises?: CustomExercise[];
  /** Zapis nowego własnego ćwiczenia; po zapisie picker od razu je wybiera. */
  onCreateCustomExercise?: (input: CustomExerciseInput) => Promise<CustomExercise>;
}

// Jeden wspólny picker ćwiczeń dla buildera, edytorów planu i swapu w treningu (Z69).
export const ExercisePicker = ({
  open,
  onOpenChange,
  onPick,
  excludeNames,
  title,
  description,
  initialCategory,
  renderFooter,
  customExercises,
  onCreateCustomExercise,
}: ExercisePickerProps) => {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LibraryExercise['category'] | 'all'>(initialCategory ?? 'all');
  const [picked, setPicked] = useState<LibraryExercise | null>(null);
  const [customForm, setCustomForm] = useState<CustomExerciseInput | null>(null);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  // Świeży stan przy każdym otwarciu (initialCategory może się różnić między otwarciami).
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCategory(initialCategory ?? 'all');
    setPicked(null);
    setCustomForm(null);
    setIsSavingCustom(false);
  }, [open, initialCategory]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const excluded = new Set(excludeNames ?? []);
  const matchesFilters = (ex: LibraryExercise) => {
    if (excluded.has(ex.name)) return false;
    const matchesCategory = category === 'all' || ex.category === category;
    // Szukamy bez polskich znaków po nazwie PL, EN oraz kategorii.
    const matchesSearch = matchesQuery(search, [ex.name, localizeExerciseName(ex.name, 'en'), localizeCategory(ex.category, lang)]);
    return matchesCategory && matchesSearch;
  };
  const filteredCustom = (customExercises ?? []).filter(matchesFilters);
  const filtered = exerciseLibrary.filter(matchesFilters);

  const handleItemTap = (ex: LibraryExercise) => {
    if (renderFooter) {
      setPicked(ex);
      return;
    }
    onPick?.(ex);
    handleOpenChange(false);
  };

  const customNameValid = (customForm?.name.trim().length ?? 0) >= 2 && (customForm?.name.trim().length ?? 0) <= 80;

  const handleSaveCustom = async () => {
    if (!onCreateCustomExercise || !customForm || !customNameValid || isSavingCustom) return;
    setIsSavingCustom(true);
    try {
      const created = await onCreateCustomExercise(customForm);
      setCustomForm(null);
      handleItemTap(created);
    } catch {
      // Zapis nie przeszedł (offline/rules) — formularz zostaje, user może ponowić.
    } finally {
      setIsSavingCustom(false);
    }
  };

  const renderItem = (ex: LibraryExercise, key: string) => (
    <button
      key={key}
      className={cn(
        'w-full text-left flex items-center gap-3 p-3 rounded-xl bg-surface-low hover:bg-surface-high transition-colors',
        picked?.name === ex.name && 'ring-1 ring-primary bg-surface-high',
      )}
      onClick={() => handleItemTap(ex)}
    >
      <span className="h-9 w-9 shrink-0 rounded-lg bg-surface-highest flex items-center justify-center text-fitness-cyan">
        <Dumbbell className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm truncate">{localizeExerciseName(ex.name, lang)}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {localizeCategory(ex.category, lang)}
          {' · '}
          {ex.isBodyweight
            ? t('picker.bodyweight')
            : ex.type === 'compound' ? t('planbuilder.compound') : t('planbuilder.isolation')}
        </span>
      </span>
      <Plus className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-heading font-bold uppercase tracking-tight">
            {title ?? t('picker.title')}
          </DialogTitle>
          <DialogDescription>{description ?? t('picker.description')}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('exercises.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          {onCreateCustomExercise && !customForm && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setCustomForm({
                name: search.trim(),
                category: category === 'all' ? 'chest' : category,
                isBodyweight: false,
                type: 'compound',
              })}
            >
              <UserPlus className="h-4 w-4" />
              {t('custom.addButton')}
            </Button>
          )}

          {customForm && (
            <div className="rounded-xl border border-border p-3 space-y-3">
              <Input
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder={t('custom.namePlaceholder')}
                maxLength={80}
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(categoryLabels) as LibraryExercise['category'][]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCustomForm({ ...customForm, category: key })}
                    className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                      customForm.category === key ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}
                  >
                    {localizeCategory(key, lang)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCustomForm({ ...customForm, type: 'compound' })}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                    customForm.type === 'compound' ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground')}
                >
                  {t('planbuilder.compound')}
                </button>
                <button
                  onClick={() => setCustomForm({ ...customForm, type: 'isolation' })}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                    customForm.type === 'isolation' ? 'bg-primary text-primary-foreground' : 'bg-surface-highest text-muted-foreground')}
                >
                  {t('planbuilder.isolation')}
                </button>
                <button
                  onClick={() => setCustomForm({ ...customForm, isBodyweight: !customForm.isBodyweight })}
                  aria-pressed={customForm.isBodyweight}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                    customForm.isBodyweight ? 'bg-fitness-success text-background' : 'bg-surface-highest text-muted-foreground')}
                >
                  {t('picker.bodyweight')}
                </button>
              </div>
              {/* Typ śledzenia serii (Z105): brak wyboru = standard (ciężar x powt. / masa ciała) */}
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('custom.trackingLabel')}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    [undefined, t('tracking.standard')],
                    ['duration', t('tracking.duration')],
                    ['weight_distance_duration', t('tracking.weightDistanceDuration')],
                    ['assisted_bodyweight', t('tracking.assistedBodyweight')],
                  ] as Array<[CustomExerciseInput['tracking'], string]>).map(([value, label]) => (
                    <button
                      key={label}
                      onClick={() => setCustomForm({ ...customForm, tracking: value })}
                      className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                        customForm.tracking === value ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setCustomForm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" className="flex-1" disabled={!customNameValid || isSavingCustom} onClick={handleSaveCustom}>
                  {isSavingCustom && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  {t('custom.save')}
                </Button>
              </div>
            </div>
          )}

          {filteredCustom.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('custom.section')}</p>
              {filteredCustom.map((ex) => renderItem(ex, ex.id))}
            </>
          )}

          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {t('planbuilder.resultsCount', { n: filtered.length })}
          </p>
          {filtered.map((ex) => renderItem(ex, ex.name))}
          {filtered.length === 0 && filteredCustom.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">{t('planbuilder.noExercisesFound')}</p>
          )}
        </div>

        {renderFooter && picked && (
          <div className="border-t border-border px-5 py-4 space-y-2 bg-background">
            <p className="text-sm font-medium truncate">{localizeExerciseName(picked.name, lang)}</p>
            {renderFooter(picked)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

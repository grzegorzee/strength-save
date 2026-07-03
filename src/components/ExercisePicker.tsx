import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { Search, Dumbbell, Plus } from 'lucide-react';
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
}: ExercisePickerProps) => {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LibraryExercise['category'] | 'all'>(initialCategory ?? 'all');
  const [picked, setPicked] = useState<LibraryExercise | null>(null);

  // Świeży stan przy każdym otwarciu (initialCategory może się różnić między otwarciami).
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCategory(initialCategory ?? 'all');
    setPicked(null);
  }, [open, initialCategory]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const excluded = new Set(excludeNames ?? []);
  const filtered = exerciseLibrary.filter((ex) => {
    if (excluded.has(ex.name)) return false;
    const matchesCategory = category === 'all' || ex.category === category;
    // Szukamy bez polskich znaków po nazwie PL, EN oraz kategorii.
    const matchesSearch = matchesQuery(search, [ex.name, localizeExerciseName(ex.name, 'en'), localizeCategory(ex.category, lang)]);
    return matchesCategory && matchesSearch;
  });

  const handleItemTap = (ex: LibraryExercise) => {
    if (renderFooter) {
      setPicked(ex);
      return;
    }
    onPick?.(ex);
    handleOpenChange(false);
  };

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
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {t('planbuilder.resultsCount', { n: filtered.length })}
          </p>
          {filtered.map((ex) => (
            <button
              key={ex.name}
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
          ))}
          {filtered.length === 0 && (
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

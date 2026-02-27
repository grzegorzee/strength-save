import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import type { ExerciseReplacement } from '@/types';
import { Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: LibraryExercise['category'] | null;
  currentExerciseName: string;
  usedExerciseNames: string[];
  originalSets: string;
  onSwap: (replacement: ExerciseReplacement) => void;
}

export const ExerciseSwapDialog = ({
  open,
  onOpenChange,
  category,
  currentExerciseName,
  usedExerciseNames,
  originalSets,
  onSwap,
}: ExerciseSwapDialogProps) => {
  const alternatives = category
    ? exerciseLibrary.filter(
        e =>
          e.category === category &&
          e.name !== currentExerciseName &&
          !usedExerciseNames.includes(e.name)
      )
    : [];

  const handleSelect = (exercise: LibraryExercise) => {
    onSwap({
      name: exercise.name,
      sets: originalSets,
      videoUrl: exercise.videoUrl,
      category: exercise.category,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-md p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Zamień ćwiczenie</DialogTitle>
          {category && (
            <p className="text-sm text-muted-foreground">
              Kategoria: {categoryLabels[category]}
            </p>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
          {alternatives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Brak dostępnych alternatyw w tej kategorii
            </p>
          ) : (
            <div className="space-y-1">
              {alternatives.map(exercise => (
                <button
                  key={exercise.name}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left",
                    "hover:bg-muted/60 active:bg-muted transition-colors"
                  )}
                  onClick={() => handleSelect(exercise)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exercise.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {exercise.type === 'compound' ? 'Złożone' : 'Izolacja'}
                      </Badge>
                      {exercise.videoUrl && (
                        <Play className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

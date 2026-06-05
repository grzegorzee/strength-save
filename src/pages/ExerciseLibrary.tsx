import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Dumbbell, ArrowRightLeft } from 'lucide-react';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';
import { cn } from '@/lib/utils';
import { getExerciseAnimationUrl } from '@/lib/exercise-media';
import { Chip } from '@/components/kinetic/Chip';

const categoryOrder: LibraryExercise['category'][] = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves',
];

interface EnrichedExercise extends LibraryExercise {
  sets?: string;
  instructions?: { title: string; content: string }[];
  dayName?: string;
}

const typeLabel = (ex: EnrichedExercise) =>
  ex.isBodyweight ? 'Masa ciała' : ex.type === 'compound' ? 'Wielostawowe' : 'Izolacja';

// Wiersz listy wg mockupu: miniatura + nazwa uppercase + chip kategorii + typ + swap-ikona.
const ExerciseRow = ({ ex, onOpen }: { ex: EnrichedExercise; onOpen: (ex: EnrichedExercise) => void }) => {
  const animationUrl = getExerciseAnimationUrl(ex.name);
  return (
    <button
      type="button"
      onClick={() => onOpen(ex)}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-low p-3 text-left transition-colors hover:bg-surface-high"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-lowest">
        {animationUrl ? (
          <video src={animationUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline />
        ) : (
          <Dumbbell className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-base font-bold uppercase leading-tight tracking-tight">{ex.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
            {categoryLabels[ex.category]}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{typeLabel(ex)}</span>
        </div>
      </div>
      <ArrowRightLeft className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );
};

const ExerciseLibrary = () => {
  const [activeCategory, setActiveCategory] = useState<LibraryExercise['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailExercise, setDetailExercise] = useState<EnrichedExercise | null>(null);

  const enrichedExercises = useMemo<EnrichedExercise[]>(() => {
    const planExercises = trainingPlan.flatMap((day) => day.exercises.map((ex) => ({ ...ex, dayName: day.dayName })));
    return exerciseLibrary.map((libEx) => {
      const planEx = planExercises.find((p) => p.name === libEx.name);
      return {
        ...libEx,
        sets: planEx?.sets,
        instructions: planEx?.instructions,
        dayName: planEx?.dayName,
      } as EnrichedExercise;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = enrichedExercises;
    if (activeCategory !== 'all') list = list.filter((e) => e.category === activeCategory);
    const q = searchQuery.toLowerCase().trim();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [enrichedExercises, activeCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj ćwiczenia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-full border-0 bg-surface-lowest pl-11"
        />
      </div>

      {/* Muscle groups — poziome chipy */}
      <div className="space-y-3">
        <p className="text-label-md font-bold uppercase tracking-[0.12em] text-primary">Grupy mięśniowe</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>Wszystkie</Chip>
          {categoryOrder.map((cat) => (
            <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
              {categoryLabels[cat]}
            </Chip>
          ))}
        </div>
      </div>

      {/* Tytuł + licznik */}
      <div className="flex items-end justify-between">
        <h2 className="font-heading text-headline-lg font-bold uppercase italic tracking-tight">Ćwiczenia</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{filtered.length} wyników</span>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map((ex) => (
          <ExerciseRow key={ex.name} ex={ex} onOpen={setDetailExercise} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Brak wyników dla „{searchQuery}”</p>
        )}
      </div>

      {/* Szczegóły ćwiczenia (Dialog — zastąpi go osobna strona w Etapie D) */}
      <Dialog open={!!detailExercise} onOpenChange={(open) => !open && setDetailExercise(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-surface-low p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-surface-highest">
            {(() => {
              const animationUrl = getExerciseAnimationUrl(detailExercise?.name);
              return animationUrl ? (
                <video src={animationUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <Dumbbell className="h-14 w-14" />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em]">Animacja wkrótce</span>
                </div>
              );
            })()}
          </div>
          <div className="space-y-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <DialogHeader>
              <DialogTitle className="pr-6 text-left font-heading text-3xl leading-tight">{detailExercise?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {detailExercise && (
                <>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase text-accent-foreground">{categoryLabels[detailExercise.category]}</span>
                  <span className="rounded-full bg-surface-highest px-3 py-1 text-xs font-bold uppercase text-muted-foreground">{typeLabel(detailExercise)}</span>
                </>
              )}
            </div>
            {detailExercise?.instructions && detailExercise.instructions.length > 0 && (
              <section className="space-y-4">
                <h3 className="font-heading text-xl font-bold">Instrukcje</h3>
                {detailExercise.instructions.map((inst, index) => (
                  <div key={`${inst.title}-${index}`} className="rounded-2xl bg-surface-highest p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{inst.title.replace('💡 ', '')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{inst.content}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExerciseLibrary;

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Dumbbell, ArrowRightLeft } from 'lucide-react';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';
import { getExerciseAnimationUrl, slugifyExercise } from '@/lib/exercise-media';
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
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<LibraryExercise['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
          <ExerciseRow key={ex.name} ex={ex} onOpen={(e) => navigate(`/exercise/${slugifyExercise(e.name)}`)} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Brak wyników dla „{searchQuery}”</p>
        )}
      </div>
    </div>
  );
};

export default ExerciseLibrary;

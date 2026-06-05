import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, Dumbbell, Target, Grip, Footprints, Zap, CircleDot, Heart, Info } from 'lucide-react';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';
import { cn } from '@/lib/utils';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '@/lib/exercise-media';

const categoryIcons: Record<LibraryExercise['category'], React.ElementType> = {
  chest: Heart,
  back: Grip,
  shoulders: Dumbbell,
  legs: Footprints,
  arms: Zap,
  core: Target,
  glutes: CircleDot,
  calves: Footprints,
};

const categoryOrder: LibraryExercise['category'][] = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves',
];

interface EnrichedExercise extends LibraryExercise {
  videoUrl?: string;
  sets?: string;
  instructions?: { title: string; content: string }[];
  dayName?: string;
}

// ExerciseRow extracted to module level to prevent remount on parent re-render
const ExerciseRow = ({
  ex,
  onDetailsOpen,
  showCategoryBadge,
}: {
  ex: EnrichedExercise;
  onDetailsOpen: (ex: EnrichedExercise) => void;
  showCategoryBadge: boolean;
}) => {
  const thumbnailUrl = getYouTubeThumbnailUrl(ex.videoUrl);

  return (
    <Card key={ex.name} className="overflow-hidden border-0 bg-card transition-colors duration-200 hover:bg-muted/80">
      <CardContent className="p-2">
        <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onDetailsOpen(ex)}>
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-background">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80" loading="lazy" />
            ) : (
              <Dumbbell className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold leading-tight">{ex.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                {ex.type === 'compound' ? 'Wielostawowe' : 'Izolacja'}
              </span>
              {showCategoryBadge && (
                <Badge className="border-0 bg-muted text-[10px] text-muted-foreground">
                  {categoryLabels[ex.category]}
                </Badge>
              )}
              {ex.sets && (
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {ex.sets}
                </span>
              )}
            </div>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Info className="h-5 w-5" />
          </span>
        </button>
      </CardContent>
    </Card>
  );
};

const ExerciseLibrary = () => {
  const [selectedCategory, setSelectedCategory] = useState<LibraryExercise['category'] | null>(null);
  const [videoExercise, setVideoExercise] = useState<EnrichedExercise | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allPlanExercises = useMemo(() => {
    return trainingPlan.flatMap(day =>
      day.exercises.map(ex => ({ ...ex, dayName: day.dayName }))
    );
  }, []);

  const enrichedExercises = useMemo(() => {
    return exerciseLibrary.map(libEx => {
      const planEx = allPlanExercises.find(p => p.name === libEx.name);
      return {
        ...libEx,
        videoUrl: planEx?.videoUrl || libEx.videoUrl,
        sets: planEx?.sets,
        instructions: planEx?.instructions,
        dayName: planEx?.dayName,
      } as EnrichedExercise;
    });
  }, [allPlanExercises]);

  const categories = useMemo(() => {
    const grouped: Record<string, EnrichedExercise[]> = {};
    for (const ex of enrichedExercises) {
      if (!grouped[ex.category]) grouped[ex.category] = [];
      grouped[ex.category].push(ex);
    }
    return grouped;
  }, [enrichedExercises]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return enrichedExercises.filter(ex =>
      ex.name.toLowerCase().includes(q)
    );
  }, [searchQuery, enrichedExercises]);

  // Determine content to show
  const isSearching = searchResults !== null;
  const showCategoryList = !isSearching && selectedCategory !== null;
  const currentExercises = showCategoryList ? (categories[selectedCategory!] || []) : [];
  const CatIcon = selectedCategory ? categoryIcons[selectedCategory] : null;

  return (
    <div className="space-y-6">
      {/* Header — always mounted */}
      <div>
        {showCategoryList ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {CatIcon && <CatIcon className="h-4 w-4" />}
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold tracking-tight">
                  {categoryLabels[selectedCategory!]}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {currentExercises.length} ćwiczeń
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Biblioteka ćwiczeń</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {exerciseLibrary.length} ćwiczeń w {categoryOrder.length} kategoriach
            </p>
          </div>
        )}
      </div>

      {/* Search input — always mounted, never unmounts */}
      {!showCategoryList && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-2xl border-0 bg-card pl-10 focus-visible:ring-primary/30"
          />
        </div>
      )}

      {/* Content — conditional */}
      {isSearching ? (
        // Search results
        searchResults.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak wyników dla "{searchQuery}"
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{searchResults.length} wyników</p>
            {searchResults.map(ex => (
              <ExerciseRow
                key={ex.name}
                ex={ex}
                onDetailsOpen={setVideoExercise}
                showCategoryBadge
              />
            ))}
          </div>
        )
      ) : showCategoryList ? (
        // Exercise list for selected category
        <div className="space-y-3">
          {currentExercises.map(ex => (
            <ExerciseRow
              key={ex.name}
              ex={ex}
              onDetailsOpen={setVideoExercise}
              showCategoryBadge={false}
            />
          ))}
        </div>
      ) : (
        // Category grid
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryOrder.map(cat => {
            const CatIconItem = categoryIcons[cat];
            return (
              <Card
                key={cat}
                className="cursor-pointer border-0 bg-card transition-colors duration-200 hover:bg-muted/80"
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    "mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-2",
                    "bg-primary/10 text-primary"
                  )}>
                    <CatIconItem className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading font-semibold text-sm">{categoryLabels[cat]}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {categories[cat]?.length || 0} ćwiczeń
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Exercise details dialog — always mounted */}
      <Dialog open={!!videoExercise} onOpenChange={(open) => !open && setVideoExercise(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-background p-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-card">
            {videoExercise?.videoUrl && (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={getYouTubeEmbedUrl(videoExercise.videoUrl) || ''}
                title={videoExercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {!videoExercise?.videoUrl && <Dumbbell className="absolute inset-0 m-auto h-16 w-16 text-muted-foreground/30" />}
          </div>
          <div className="space-y-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <DialogHeader>
              <DialogTitle className="pr-6 text-left font-heading text-3xl leading-tight">{videoExercise?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {videoExercise && (
                <>
                  <Badge className="border-0 bg-accent text-accent-foreground">{categoryLabels[videoExercise.category]}</Badge>
                  <Badge className="border-0 bg-card text-muted-foreground">
                    {videoExercise.type === 'compound' ? 'Wielostawowe' : 'Izolacja'}
                  </Badge>
                </>
              )}
            </div>
            {videoExercise?.instructions && videoExercise.instructions.length > 0 && (
              <section className="space-y-4">
                <h3 className="font-heading text-xl font-bold">Instrukcje</h3>
                {videoExercise.instructions.map((inst, index) => (
                  <div key={`${inst.title}-${index}`} className="rounded-2xl bg-card p-4">
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

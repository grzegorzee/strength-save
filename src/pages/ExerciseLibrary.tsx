import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Play, ChevronDown, ChevronUp, Search, Dumbbell, Target, Grip, Footprints, Zap, CircleDot, Heart } from 'lucide-react';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';
import { cn } from '@/lib/utils';

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

const getYouTubeEmbedUrl = (url: string): string | null => {
  const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
};

const ExerciseLibrary = () => {
  const [selectedCategory, setSelectedCategory] = useState<LibraryExercise['category'] | null>(null);
  const [videoExercise, setVideoExercise] = useState<EnrichedExercise | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
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

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return enrichedExercises.filter(ex =>
      ex.name.toLowerCase().includes(q)
    );
  }, [searchQuery, enrichedExercises]);

  const ExerciseRow = ({ ex }: { ex: EnrichedExercise }) => (
    <Card key={ex.name} className="hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{ex.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {ex.type === 'compound' ? 'Wielostawowe' : 'Izolacja'}
              </Badge>
              {searchResults && (
                <Badge className="text-xs bg-muted text-muted-foreground">
                  {categoryLabels[ex.category]}
                </Badge>
              )}
              {ex.dayName && (
                <Badge variant="secondary" className="text-xs">
                  {ex.dayName}
                </Badge>
              )}
              {ex.sets && (
                <Badge variant="outline" className="text-xs font-heading">
                  {ex.sets}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {ex.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-primary border-primary/30"
                onClick={() => setVideoExercise(ex)}
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Obejrzyj</span>
              </Button>
            )}
            {ex.instructions && ex.instructions.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedExercise(expandedExercise === ex.name ? null : ex.name)}
              >
                {expandedExercise === ex.name
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {expandedExercise === ex.name && ex.instructions && (
          <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-2">
            {ex.instructions.map((inst, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-primary">{inst.title}</p>
                <p className="text-sm text-muted-foreground">{inst.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Search bar (always visible)
  const SearchBar = () => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Szukaj ćwiczenia..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  );

  // If searching — show flat results
  if (searchResults) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Biblioteka ćwiczeń</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exerciseLibrary.length} ćwiczeń w {categoryOrder.length} kategoriach
          </p>
        </div>

        <SearchBar />

        {searchResults.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak wyników dla "{searchQuery}"
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{searchResults.length} wyników</p>
            {searchResults.map(ex => (
              <ExerciseRow key={ex.name} ex={ex} />
            ))}
          </div>
        )}

        <Dialog open={!!videoExercise} onOpenChange={(open) => !open && setVideoExercise(null)}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm pr-6">{videoExercise?.name}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {videoExercise?.videoUrl && (
                <iframe
                  className="absolute inset-0 w-full h-full rounded-lg"
                  src={getYouTubeEmbedUrl(videoExercise.videoUrl) || ''}
                  title={videoExercise.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Category view or exercise list
  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Biblioteka ćwiczeń</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exerciseLibrary.length} ćwiczeń w {categoryOrder.length} kategoriach
          </p>
        </div>

        <SearchBar />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryOrder.map(cat => {
            const CatIcon = categoryIcons[cat];
            return (
              <Card
                key={cat}
                className="cursor-pointer hover:border-primary/30 transition-all duration-200"
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    "mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-2",
                    "bg-primary/10 text-primary"
                  )}>
                    <CatIcon className="h-6 w-6" />
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
      </div>
    );
  }

  const currentExercises = categories[selectedCategory] || [];
  const CatIcon = categoryIcons[selectedCategory];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CatIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold tracking-tight">
              {categoryLabels[selectedCategory]}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentExercises.length} ćwiczeń
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {currentExercises.map(ex => (
          <ExerciseRow key={ex.name} ex={ex} />
        ))}
      </div>

      <Dialog open={!!videoExercise} onOpenChange={(open) => !open && setVideoExercise(null)}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm pr-6">{videoExercise?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {videoExercise?.videoUrl && (
              <iframe
                className="absolute inset-0 w-full h-full rounded-lg"
                src={getYouTubeEmbedUrl(videoExercise.videoUrl) || ''}
                title={videoExercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExerciseLibrary;

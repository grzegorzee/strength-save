import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { trainingPlan } from '@/data/trainingPlan';

const categoryIcons: Record<LibraryExercise['category'], string> = {
  chest: '🫁',
  back: '🔙',
  shoulders: '🏋️',
  legs: '🦵',
  arms: '💪',
  core: '🎯',
  glutes: '🍑',
  calves: '🦶',
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

  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Biblioteka ćwiczeń</h1>
          <p className="text-muted-foreground mt-1">
            {exerciseLibrary.length} ćwiczeń w {categoryOrder.length} kategoriach
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryOrder.map(cat => (
            <Card
              key={cat}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedCategory(cat)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{categoryIcons[cat]}</div>
                <h3 className="font-semibold">{categoryLabels[cat]}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {categories[cat]?.length || 0} ćwiczeń
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentExercises = categories[selectedCategory] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>{categoryIcons[selectedCategory]}</span>
            {categoryLabels[selectedCategory]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentExercises.length} ćwiczeń
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {currentExercises.map(ex => (
          <Card key={ex.name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{ex.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {ex.type === 'compound' ? 'Wielostawowe' : 'Izolacja'}
                    </Badge>
                    {ex.dayName && (
                      <Badge variant="secondary" className="text-xs">
                        {ex.dayName}
                      </Badge>
                    )}
                    {ex.sets && (
                      <Badge variant="outline" className="text-xs font-mono">
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

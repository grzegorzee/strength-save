import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Check, Info, Flame, StickyNote, Play } from 'lucide-react';
import { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { cn } from '@/lib/utils';
import { parseSetCount, sanitizeSets, parseRepRange, getProgressionAdvice } from '@/lib/exercise-utils';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  previousSets?: SetData[];
  onSetsChange?: (sets: SetData[], notes?: string) => void;
  onSetCompleted?: (lastWeight?: number) => void;
  isEditable?: boolean;
}

const ExerciseCardInner = ({
  exercise,
  index,
  savedSets,
  savedNotes,
  previousSets,
  onSetsChange,
  onSetCompleted,
  isEditable = true,
}: ExerciseCardProps) => {
  const setCount = useMemo(() => parseSetCount(exercise.sets), [exercise.sets]);
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [sets, setSets] = useState<SetData[]>(() => sanitizeSets(savedSets, setCount));
  const [notes, setNotes] = useState(savedNotes || '');
  const [showNotes, setShowNotes] = useState(!!savedNotes);

  const hasLocalChanges = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (savedSets && savedSets.length > 0) {
      if (!isInitialized.current || !hasLocalChanges.current) {
        setSets(sanitizeSets(savedSets, setCount));
        isInitialized.current = true;
      }
    }
    if (savedNotes !== undefined && !hasLocalChanges.current) {
      setNotes(savedNotes);
      if (savedNotes) setShowNotes(true);
    }
  }, [savedSets, savedNotes, setCount]);

  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    hasLocalChanges.current = true;
    const newSets = sets.map((set, i) =>
      i === setIndex ? { ...set, [field]: value } : set
    );
    setSets(newSets);
    onSetsChange?.(newSets, notes);
  };

  const handleSetComplete = (setIndex: number) => {
    hasLocalChanges.current = true;
    const wasCompleted = sets[setIndex]?.completed;
    const newSets = sets.map((set, i) =>
      i === setIndex ? { ...set, completed: !set.completed } : set
    );
    setSets(newSets);
    onSetsChange?.(newSets, notes);
    // Trigger smart timer callback when marking as completed (not uncompleting)
    if (!wasCompleted) {
      onSetCompleted?.(newSets[setIndex]?.weight);
    }
  };

  const handleNotesChange = (value: string) => {
    hasLocalChanges.current = true;
    setNotes(value);
    onSetsChange?.(sets, value);
  };

  const workingSets = sets.filter(s => !s.isWarmup);
  const completedSets = workingSets.filter(s => s.completed).length;
  const allCompleted = workingSets.length > 0 && completedSets === workingSets.length;
  const exerciseLabel = exercise.isSuperset
    ? `${index}${exercise.id.endsWith('a') ? 'a' : 'b'}`
    : `${index}`;

  // Progression advice based on previous workout
  const progressionAdvice = useMemo(() => {
    if (!previousSets) return null;
    const repRange = parseRepRange(exercise.sets);
    const prevWorking = previousSets.filter(s => !s.isWarmup);
    return getProgressionAdvice(repRange, prevWorking, index - 1, exercise.isSuperset);
  }, [previousSets, exercise.sets, index, exercise.isSuperset]);

  // Extract YouTube video ID for embed
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
  };

  // Previous workout hint for each set
  const getPreviousHint = (setIndex: number): string | null => {
    if (!previousSets || previousSets.length === 0) return null;
    const prevSet = previousSets[setIndex];
    if (!prevSet || (prevSet.weight === 0 && prevSet.reps === 0)) return null;
    return `${prevSet.reps}×${prevSet.weight}kg`;
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      exercise.isSuperset && "border-l-4 border-l-primary",
      allCompleted && "bg-muted/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Badge
              variant="secondary"
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                allCompleted ? "bg-fitness-success text-white" : "bg-secondary text-secondary-foreground"
              )}
            >
              {exerciseLabel}
            </Badge>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg leading-tight">{exercise.name}</h3>
                {progressionAdvice && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium shrink-0",
                      progressionAdvice.type === 'increase' && "border-green-500 text-green-600 bg-green-500/10",
                      progressionAdvice.type === 'repeat' && "border-yellow-500 text-yellow-600 bg-yellow-500/10",
                      progressionAdvice.type === 'maintain' && "border-red-500 text-red-600 bg-red-500/10",
                    )}
                  >
                    {progressionAdvice.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">
                  {exercise.sets}
                </Badge>
                {completedSets > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {completedSets}/{workingSets.length} serii
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {exercise.videoUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVideo(true)}
                className="text-primary"
              >
                <Play className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {expanded && (
          <div className="space-y-3">
            {exercise.instructions.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                {exercise.instructions.map((inst, i) => (
                  <div key={i} className="flex gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">{inst.title}</p>
                      <p className="text-sm text-muted-foreground">{inst.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {exercise.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-primary border-primary/30"
                onClick={() => setShowVideo(true)}
              >
                <Play className="h-4 w-4" />
                Obejrzyj wideo
              </Button>
            )}
          </div>
        )}

        {/* Video Dialog */}
        {exercise.videoUrl && (
          <Dialog open={showVideo} onOpenChange={setShowVideo}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-3 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-sm pr-6">{exercise.name}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {showVideo && (
                  <iframe
                    className="absolute inset-0 w-full h-full rounded-lg"
                    src={getYouTubeEmbedUrl(exercise.videoUrl) || ''}
                    title={exercise.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isEditable && (
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-sm font-medium text-muted-foreground px-2">
              <span className="w-12">Seria</span>
              <span>Powtórzenia</span>
              <span>Ciężar (kg)</span>
              <span className="w-10"></span>
            </div>
            {sets.map((set, i) => {
              const isWarmup = set.isWarmup;
              const workingSetIndex = isWarmup ? 0 : sets.slice(0, i).filter(s => !s.isWarmup).length + 1;
              const prevHint = getPreviousHint(i);

              return (
                <div key={i}>
                  <div
                    className={cn(
                      "grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center p-2 rounded-lg transition-colors",
                      isWarmup
                        ? "bg-orange-500/10 border border-orange-500/30"
                        : set.completed
                          ? "bg-fitness-success/10"
                          : "bg-muted/30"
                    )}
                  >
                    <span className={cn(
                      "w-12 text-sm font-medium text-center flex items-center justify-center gap-1",
                      isWarmup && "text-orange-500"
                    )}>
                      {isWarmup ? <Flame className="h-4 w-4" /> : workingSetIndex}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={set.reps || ''}
                      onChange={(e) => handleSetChange(i, 'reps', parseInt(e.target.value) || 0)}
                      placeholder={isWarmup ? "rozgrzewka" : "0"}
                      className={cn("h-9", isWarmup && "border-orange-500/30")}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={set.weight || ''}
                      onChange={(e) => handleSetChange(i, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder={isWarmup ? "kg" : "0"}
                      className={cn("h-9", isWarmup && "border-orange-500/30")}
                    />
                    <Button
                      variant={set.completed ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-9 w-10",
                        isWarmup && set.completed && "bg-orange-500 hover:bg-orange-500/90",
                        !isWarmup && set.completed && "bg-fitness-success hover:bg-fitness-success/90"
                      )}
                      onClick={() => handleSetComplete(i)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                  {prevHint && !isWarmup && set.reps === 0 && set.weight === 0 && (
                    <p className="text-xs text-muted-foreground pl-14 pt-0.5">
                      Poprzednio: {prevHint}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Notes toggle and input */}
            <div className="pt-2">
              {!showNotes ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowNotes(true)}
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  Dodaj notatkę
                </Button>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Notatki do ćwiczenia (np. odczucia, uwagi techniczne)..."
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ExerciseCard = memo(ExerciseCardInner);

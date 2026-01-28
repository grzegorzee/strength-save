import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, Info, Flame, StickyNote } from 'lucide-react';
import { Exercise } from '@/data/trainingPlan';
import { SetData } from '@/hooks/useFirebaseWorkouts';
import { cn } from '@/lib/utils';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  onSetsChange?: (sets: SetData[], notes?: string) => void;
  isEditable?: boolean;
}

const parseSetCount = (setsStr: string): number => {
  const match = setsStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
};

// Helper to create clean set data with warmup (no undefined values)
const createEmptySets = (count: number): SetData[] => {
  const sets: SetData[] = [
    { reps: 0, weight: 0, completed: false, isWarmup: true }, // Warmup set
  ];
  for (let i = 0; i < count; i++) {
    sets.push({ reps: 0, weight: 0, completed: false });
  }
  return sets;
};

// Helper to sanitize sets from Firebase (may contain undefined)
const sanitizeSets = (sets: SetData[] | undefined, expectedCount: number): SetData[] => {
  if (!sets || sets.length === 0) {
    return createEmptySets(expectedCount);
  }
  // Check if warmup exists, if not add it
  const hasWarmup = sets.some(s => s.isWarmup);
  const sanitized = sets.map(set => ({
    reps: set?.reps ?? 0,
    weight: set?.weight ?? 0,
    completed: set?.completed ?? false,
    ...(set?.isWarmup && { isWarmup: true }),
  }));

  if (!hasWarmup) {
    return [{ reps: 0, weight: 0, completed: false, isWarmup: true }, ...sanitized];
  }
  return sanitized;
};

export const ExerciseCard = ({
  exercise,
  index,
  savedSets,
  savedNotes,
  onSetsChange,
  isEditable = true,
}: ExerciseCardProps) => {
  const setCount = parseSetCount(exercise.sets);
  const [expanded, setExpanded] = useState(false);
  const [sets, setSets] = useState<SetData[]>(() => sanitizeSets(savedSets, setCount));
  const [notes, setNotes] = useState(savedNotes || '');
  const [showNotes, setShowNotes] = useState(!!savedNotes);

  // Track if user has made any local changes to prevent overwriting
  const hasLocalChanges = useRef(false);
  const isInitialized = useRef(false);

  // Sync savedSets ONLY on initial load, not when user is editing
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
    const newSets = sets.map((set, i) =>
      i === setIndex ? { ...set, completed: !set.completed } : set
    );
    setSets(newSets);
    onSetsChange?.(newSets, notes);
  };

  const handleNotesChange = (value: string) => {
    hasLocalChanges.current = true;
    setNotes(value);
    onSetsChange?.(sets, value);
  };

  // Count only non-warmup sets
  const workingSets = sets.filter(s => !s.isWarmup);
  const completedSets = workingSets.filter(s => s.completed).length;
  const allCompleted = workingSets.length > 0 && completedSets === workingSets.length;
  const exerciseLabel = exercise.isSuperset
    ? `${index}${exercise.id.endsWith('a') ? 'a' : 'b'}`
    : `${index}`;

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
              <h3 className="font-semibold text-lg leading-tight">{exercise.name}</h3>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {expanded && exercise.instructions.length > 0 && (
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

              return (
                <div
                  key={i}
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

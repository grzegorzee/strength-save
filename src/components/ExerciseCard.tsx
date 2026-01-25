import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, Info } from 'lucide-react';
import { Exercise } from '@/data/trainingPlan';
import { SetData } from '@/hooks/useWorkoutProgress';
import { cn } from '@/lib/utils';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  onSetsChange?: (sets: SetData[]) => void;
  isEditable?: boolean;
}

const parseSetCount = (setsStr: string): number => {
  const match = setsStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
};

export const ExerciseCard = ({
  exercise,
  index,
  savedSets,
  onSetsChange,
  isEditable = true,
}: ExerciseCardProps) => {
  const setCount = parseSetCount(exercise.sets);
  const [expanded, setExpanded] = useState(false);
  const [sets, setSets] = useState<SetData[]>(
    savedSets || Array(setCount).fill(null).map(() => ({ reps: 0, weight: 0, completed: false }))
  );

  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    const newSets = sets.map((set, i) =>
      i === setIndex ? { ...set, [field]: value } : set
    );
    setSets(newSets);
    onSetsChange?.(newSets);
  };

  const handleSetComplete = (setIndex: number) => {
    const newSets = sets.map((set, i) =>
      i === setIndex ? { ...set, completed: !set.completed } : set
    );
    setSets(newSets);
    onSetsChange?.(newSets);
  };

  const completedSets = sets.filter(s => s.completed).length;
  const allCompleted = completedSets === sets.length;
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
                    {completedSets}/{sets.length} serii
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
            {sets.map((set, i) => (
              <div 
                key={i} 
                className={cn(
                  "grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center p-2 rounded-lg transition-colors",
                  set.completed ? "bg-fitness-success/10" : "bg-muted/30"
                )}
              >
                <span className="w-12 text-sm font-medium text-center">{i + 1}</span>
                <Input
                  type="number"
                  min={0}
                  value={set.reps || ''}
                  onChange={(e) => handleSetChange(i, 'reps', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={set.weight || ''}
                  onChange={(e) => handleSetChange(i, 'weight', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-9"
                />
                <Button
                  variant={set.completed ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-9 w-10",
                    set.completed && "bg-fitness-success hover:bg-fitness-success/90"
                  )}
                  onClick={() => handleSetComplete(i)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

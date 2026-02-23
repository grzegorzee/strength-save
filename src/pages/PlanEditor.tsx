import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCcw,
  Replace,
  Plus,
  Pencil,
  Check,
  X,
  Search,
} from 'lucide-react';

const PlanEditor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    plan,
    isLoaded,
    isCustom,
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  } = useTrainingPlan();

  const [swapDialog, setSwapDialog] = useState<{
    dayId: string;
    exerciseId: string;
    exerciseName: string;
  } | null>(null);

  const [addDialog, setAddDialog] = useState<string | null>(null); // dayId

  const [editingSets, setEditingSets] = useState<{
    dayId: string;
    exerciseId: string;
    value: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LibraryExercise['category'] | 'all'>('all');

  const filteredExercises = exerciseLibrary.filter(ex => {
    const matchesSearch = searchQuery === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSwap = async (newName: string) => {
    if (!swapDialog) return;
    const result = await swapExercise(swapDialog.dayId, swapDialog.exerciseId, newName);
    if (result.success) {
      toast({ title: 'Zamieniono!', description: `Nowe ćwiczenie: ${newName}` });
      setSwapDialog(null);
    } else {
      toast({ title: 'Błąd', description: result.error, variant: 'destructive' });
    }
  };

  const handleAdd = async (dayId: string, ex: LibraryExercise) => {
    const day = plan.find(d => d.id === dayId);
    if (!day) return;

    const newId = `ex-${dayId.replace('day-', '')}-${day.exercises.length + 1}`;
    const result = await addExercise(dayId, {
      id: newId,
      name: ex.name,
      sets: ex.type === 'compound' ? '3 x 6-8' : '3 x 10-12',
      instructions: [],
    });

    if (result.success) {
      toast({ title: 'Dodano!', description: ex.name });
      setAddDialog(null);
    } else {
      toast({ title: 'Błąd', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemove = async (dayId: string, exerciseId: string, name: string) => {
    const result = await removeExercise(dayId, exerciseId);
    if (result.success) {
      toast({ title: 'Usunięto', description: name });
    } else {
      toast({ title: 'Błąd', description: result.error, variant: 'destructive' });
    }
  };

  const handleMove = async (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    await moveExercise(dayId, exerciseId, direction);
  };

  const handleSaveSets = async () => {
    if (!editingSets) return;
    const result = await updateExerciseSets(editingSets.dayId, editingSets.exerciseId, editingSets.value);
    if (result.success) {
      setEditingSets(null);
    } else {
      toast({ title: 'Błąd', description: result.error, variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    const result = await resetToDefault();
    if (result.success) {
      toast({ title: 'Zresetowano!', description: 'Plan przywrócony do domyślnego.' });
    } else {
      toast({ title: 'Błąd', description: result.error, variant: 'destructive' });
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  const ExerciseSwapDialog = () => (
    <Dialog open={!!swapDialog || !!addDialog} onOpenChange={() => { setSwapDialog(null); setAddDialog(null); setSearchQuery(''); setSelectedCategory('all'); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{swapDialog ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenie'}</DialogTitle>
          <DialogDescription>
            {swapDialog
              ? `Zamieniasz: ${swapDialog.exerciseName}`
              : 'Wybierz ćwiczenie z biblioteki'}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedCategory('all')}
          >
            Wszystkie
          </Badge>
          {(Object.entries(categoryLabels) as [LibraryExercise['category'], string][]).map(([key, label]) => (
            <Badge
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </Badge>
          ))}
        </div>

        {/* Exercise list */}
        <div className="space-y-1 max-h-[40vh] overflow-y-auto">
          {filteredExercises.map((ex, i) => (
            <button
              key={i}
              className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
              onClick={() => {
                if (swapDialog) {
                  handleSwap(ex.name);
                } else if (addDialog) {
                  handleAdd(addDialog, ex);
                }
              }}
            >
              <div>
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[ex.category]} · {ex.type === 'compound' ? 'Złożone' : 'Izolacja'}
                </p>
              </div>
            </button>
          ))}
          {filteredExercises.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nie znaleziono ćwiczeń
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plan')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edytuj plan</h1>
            {isCustom && (
              <p className="text-xs text-muted-foreground">Plan zmodyfikowany</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {plan.map(day => (
        <Card key={day.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{day.dayName} - {day.focus}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAddDialog(day.id); setSearchQuery(''); setSelectedCategory('all'); }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {day.exercises.map((exercise, idx) => (
              <div
                key={exercise.id}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/30"
              >
                <Badge variant="secondary" className="h-7 w-7 rounded flex items-center justify-center text-xs shrink-0">
                  {idx + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{exercise.name}</p>
                  {editingSets?.dayId === day.id && editingSets?.exerciseId === exercise.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        value={editingSets.value}
                        onChange={e => setEditingSets({ ...editingSets, value: e.target.value })}
                        className="h-7 text-xs w-24"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveSets}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSets(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                      onClick={() => setEditingSets({ dayId: day.id, exerciseId: exercise.id, value: exercise.sets })}
                    >
                      {exercise.sets}
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() => handleMove(day.id, exercise.id, 'up')}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === day.exercises.length - 1}
                    onClick={() => handleMove(day.id, exercise.id, 'down')}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setSwapDialog({ dayId: day.id, exerciseId: exercise.id, exerciseName: exercise.name }); setSearchQuery(''); setSelectedCategory('all'); }}
                  >
                    <Replace className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(day.id, exercise.id, exercise.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <ExerciseSwapDialog />
    </div>
  );
};

export default PlanEditor;

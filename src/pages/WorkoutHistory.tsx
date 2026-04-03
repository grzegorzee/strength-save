import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, CalendarRange, History, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { parseLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';

const WorkoutHistory = () => {
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  const { workouts, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'draft'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const dayMap = useMemo(
    () => new Map(trainingPlan.map(day => [day.id, day])),
    [trainingPlan],
  );

  const exerciseNameMap = useMemo(
    () => new Map(trainingPlan.flatMap(day => day.exercises.map(exercise => [exercise.id, exercise.name]))),
    [trainingPlan],
  );

  const filteredWorkouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return workouts
      .filter((workout) => {
        if (selectedDay !== 'all' && workout.dayId !== selectedDay) return false;
        if (selectedStatus === 'completed' && !workout.completed) return false;
        if (selectedStatus === 'draft' && workout.completed) return false;
        if (fromDate && workout.date < fromDate) return false;
        if (toDate && workout.date > toDate) return false;
        if (!query) return true;

        const day = dayMap.get(workout.dayId);
        const haystack = [
          workout.date,
          workout.dayId,
          day?.dayName || '',
          day?.focus || '',
          ...(workout.exercises.map(exercise => exerciseNameMap.get(exercise.exerciseId) || exercise.exerciseId)),
        ].join(' ').toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  }, [dayMap, exerciseNameMap, fromDate, searchQuery, selectedDay, selectedStatus, toDate, workouts]);

  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const selected = compareIds
      .map(id => workouts.find(workout => workout.id === id))
      .filter((workout): workout is WorkoutSession => !!workout);
    if (selected.length !== 2) return null;

    const [first, second] = selected;
    const tonnage = (workout: typeof first) => workout.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0),
      0,
    );
    const completedSets = (workout: typeof first) => workout.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter(set => set.completed).length,
      0,
    );

    return {
      first,
      second,
      tonnageDelta: tonnage(second) - tonnage(first),
      setDelta: completedSets(second) - completedSets(first),
      exerciseDelta: second.exercises.length - first.exercises.length,
    };
  }, [compareIds, workouts]);

  const toggleCompare = (workoutId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(workoutId)) {
        return prev.filter(id => id !== workoutId);
      }
      if (prev.length === 2) {
        return [prev[1], workoutId];
      }
      return [...prev, workoutId];
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historia treningów
          </h1>
          <p className="text-sm text-muted-foreground">Filtruj, przeglądaj i porównuj wcześniejsze sesje.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtry</CardTitle>
          <CardDescription>Zawężaj historię po dniu planu, statusie, dacie i ćwiczeniach.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Szukaj po dacie, dniu, focusie lub ćwiczeniu"
                className="pl-9"
              />
            </div>
          </div>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger>
              <SelectValue placeholder="Dzień planu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie dni</SelectItem>
              {trainingPlan.map(day => (
                <SelectItem key={day.id} value={day.id}>{day.dayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              <SelectItem value="completed">Ukończone</SelectItem>
              <SelectItem value="draft">Drafty</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2 xl:col-span-1">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Porównanie dwóch sesji
            </CardTitle>
            <CardDescription>
              {comparison.first.date} vs {comparison.second.date}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tonaż</p>
              <p className="mt-1 text-xl font-semibold">{comparison.tonnageDelta >= 0 ? '+' : ''}{comparison.tonnageDelta} kg</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ukończone serie</p>
              <p className="mt-1 text-xl font-semibold">{comparison.setDelta >= 0 ? '+' : ''}{comparison.setDelta}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ćwiczenia</p>
              <p className="mt-1 text-xl font-semibold">{comparison.exerciseDelta >= 0 ? '+' : ''}{comparison.exerciseDelta}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4" />
          {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'sesja' : 'sesji'}
        </div>
        <div>W porównaniu możesz zaznaczyć maksymalnie 2 treningi.</div>
      </div>

      <div className="space-y-3">
        {filteredWorkouts.map((workout) => {
          const day = dayMap.get(workout.dayId);
          const tonnage = workout.exercises.reduce(
            (sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0),
            0,
          );
          const isSelected = compareIds.includes(workout.id);
          return (
            <Card key={workout.id} className={isSelected ? 'border-primary/40 bg-primary/5' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workout.date}</p>
                      <Badge variant={workout.completed ? 'default' : 'secondary'}>
                        {workout.completed ? 'ukończony' : 'draft'}
                      </Badge>
                      {workout.cycleId && <Badge variant="outline">cycle {workout.cycleId}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {day?.dayName || workout.dayId} · {day?.focus || 'Bez focusu'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right text-sm">
                    <div>
                      <p className="font-semibold">{workout.exercises.length}</p>
                      <p className="text-xs text-muted-foreground">Ćwiczeń</p>
                    </div>
                    <div>
                      <p className="font-semibold">{tonnage}</p>
                      <p className="text-xs text-muted-foreground">kg</p>
                    </div>
                    <div>
                      <p className="font-semibold">{workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)}</p>
                      <p className="text-xs text-muted-foreground">Serii</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/workout/${workout.dayId}?date=${workout.date}`)}>
                    Otwórz trening
                  </Button>
                  <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleCompare(workout.id)}>
                    {isSelected ? 'Usuń z porównania' : 'Porównaj'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredWorkouts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Brak sesji pasujących do aktualnych filtrów.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WorkoutHistory;

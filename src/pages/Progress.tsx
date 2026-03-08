import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useCurrentUser } from '@/contexts/UserContext';
import { TrendingUp, Dumbbell, Scale } from 'lucide-react';
import { calculate1RM } from '@/lib/pr-utils';

type ChartTab = 'weights' | 'body';
type WeightMode = 'max' | '1rm';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
];

const Progress = () => {
  const { uid } = useCurrentUser();
  const { workouts, measurements } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const [tab, setTab] = useState<ChartTab>('weights');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [weightMode, setWeightMode] = useState<WeightMode>('max');

  // Build exercise weight progression data
  const weightData = useMemo(() => {
    const completedWorkouts = workouts
      .filter(w => w.completed && w.exercises.length > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (completedWorkouts.length === 0) return { chartData: [], exercises: [] };

    // Collect all exercise IDs
    const exerciseIds = new Set<string>();
    completedWorkouts.forEach(w => {
      if (selectedDay !== 'all' && w.dayId !== selectedDay) return;
      w.exercises.forEach(ex => exerciseIds.add(ex.exerciseId));
    });

    // Get exercise names from training plan
    const allExercises = trainingPlan.flatMap(d => d.exercises);
    const exerciseNames = new Map<string, string>();
    allExercises.forEach(ex => {
      exerciseNames.set(ex.id, ex.name.length > 20 ? ex.name.substring(0, 20) + '…' : ex.name);
    });

    // Build chart data: each workout date as a data point
    const chartData = completedWorkouts
      .filter(w => selectedDay === 'all' || w.dayId === selectedDay)
      .map(w => {
        const point: Record<string, string | number> = {
          date: new Date(w.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          fullDate: w.date,
        };

        w.exercises.forEach(ex => {
          // Max weight or estimated 1RM for working sets (non-warmup)
          const workingSets = ex.sets.filter(s => !s.isWarmup && s.completed && s.weight > 0);
          if (workingSets.length > 0) {
            if (weightMode === '1rm') {
              const max1RM = Math.max(...workingSets.map(s => calculate1RM(s.weight, s.reps)));
              point[ex.exerciseId] = max1RM;
            } else {
              const maxWeight = Math.max(...workingSets.map(s => s.weight));
              point[ex.exerciseId] = maxWeight;
            }
          }
        });

        return point;
      });

    const exercises = Array.from(exerciseIds).map(id => ({
      id,
      name: exerciseNames.get(id) || id,
    }));

    return { chartData, exercises };
  }, [workouts, selectedDay, weightMode]);

  // Build body measurements chart data
  const bodyData = useMemo(() => {
    if (measurements.length === 0) return [];

    return [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date: new Date(m.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        fullDate: m.date,
        ...(m.weight && { weight: m.weight }),
        ...(m.chest && { chest: m.chest }),
        ...(m.waist && { waist: m.waist }),
        ...(m.hips && { hips: m.hips }),
        ...(m.armLeft && { armLeft: m.armLeft }),
        ...(m.armRight && { armRight: m.armRight }),
        ...(m.thighLeft && { thighLeft: m.thighLeft }),
        ...(m.thighRight && { thighRight: m.thighRight }),
      }));
  }, [measurements]);

  const bodyFields = [
    { key: 'weight', label: 'Waga (kg)', color: CHART_COLORS[0] },
    { key: 'chest', label: 'Klatka', color: CHART_COLORS[1] },
    { key: 'waist', label: 'Talia', color: CHART_COLORS[2] },
    { key: 'hips', label: 'Biodra', color: CHART_COLORS[3] },
    { key: 'armLeft', label: 'Ramię L', color: CHART_COLORS[4] },
    { key: 'armRight', label: 'Ramię P', color: CHART_COLORS[5] },
    { key: 'thighLeft', label: 'Udo L', color: CHART_COLORS[6] },
    { key: 'thighRight', label: 'Udo P', color: CHART_COLORS[7] },
  ];

  // Determine which body fields have data
  const activeBodyFields = bodyFields.filter(f =>
    bodyData.some(d => d[f.key as keyof typeof d] !== undefined)
  );

  const completedCount = workouts.filter(w => w.completed).length;

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Ukończonych treningów</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{measurements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pomiarów ciała</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'weights' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('weights')}
        >
          <Dumbbell className="h-4 w-4 mr-2" />
          Ciężary
        </Button>
        <Button
          variant={tab === 'body' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('body')}
        >
          <Scale className="h-4 w-4 mr-2" />
          Pomiary ciała
        </Button>
      </div>

      {/* Weight progression chart */}
      {tab === 'weights' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progresja ciężarów
            </CardTitle>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              <div className="flex gap-1.5 flex-wrap">
                <Badge
                  variant={selectedDay === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedDay('all')}
                >
                  Wszystkie
                </Badge>
                {trainingPlan.map(day => (
                  <Badge
                    key={day.id}
                    variant={selectedDay === day.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedDay(day.id)}
                  >
                    {day.dayName}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Badge
                  variant={weightMode === 'max' ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setWeightMode('max')}
                >
                  Max ciężar
                </Badge>
                <Badge
                  variant={weightMode === '1rm' ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setWeightMode('1rm')}
                >
                  Est. 1RM
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {weightData.chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Brak ukończonych treningów do wyświetlenia
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {weightData.exercises.map((ex, i) => (
                    <Line
                      key={ex.id}
                      type="monotone"
                      dataKey={ex.id}
                      name={ex.name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Body measurements chart */}
      {tab === 'body' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Pomiary ciała
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bodyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Brak pomiarów do wyświetlenia
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bodyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {activeBodyFields.map(f => (
                    <Line
                      key={f.key}
                      type="monotone"
                      dataKey={f.key}
                      name={f.label}
                      stroke={f.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Progress;

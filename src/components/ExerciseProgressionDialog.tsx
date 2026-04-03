import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { getExerciseHistory, detectPlateau, getProgressionSummary } from '@/lib/exercise-progression';
import { tooltipStyle } from '@/lib/chart-config';
import { parseLocalDate } from '@/lib/utils';

interface Props {
  exerciseId: string;
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBodyweight?: boolean;
}

export const ExerciseProgressionDialog = ({ exerciseId, exerciseName, open, onOpenChange, isBodyweight = false }: Props) => {
  const { uid } = useCurrentUser();
  const { workouts } = useFirebaseWorkouts(uid);

  const history = useMemo(() => getExerciseHistory(workouts, exerciseId, isBodyweight), [workouts, exerciseId, isBodyweight]);
  const plateau = useMemo(() => detectPlateau(history, 4, isBodyweight), [history, isBodyweight]);
  const summary = useMemo(() => getProgressionSummary(history, isBodyweight), [history, isBodyweight]);

  const chartData = useMemo(() =>
    isBodyweight
      ? history.map(h => ({
          date: parseLocalDate(h.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          'Max powt.': h.bestReps,
          'Łączne powt.': h.totalVolume,
        }))
      : history.map(h => ({
          date: parseLocalDate(h.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
          '1RM': h.estimated1RM,
          'Max kg': h.maxWeight,
        })),
  [history, isBodyweight]);

  const recentSessions = useMemo(() => history.slice(-5).reverse(), [history]);

  if (history.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{exerciseName}</DialogTitle>
            <DialogDescription>Brak historii dla tego ćwiczenia</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {exerciseName}
          </DialogTitle>
          <DialogDescription>{isBodyweight ? 'Progresja powtórzeń' : 'Progresja ciężarów i est. 1RM'}</DialogDescription>
        </DialogHeader>

        {/* Chart */}
        {chartData.length >= 2 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" unit={isBodyweight ? " powt." : " kg"} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {isBodyweight ? (
                <>
                  <Line type="monotone" dataKey="Max powt." stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Łączne powt." stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="1RM" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Max kg" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">{summary.startValue}</p>
            <p className="text-[10px] text-muted-foreground">Start ({isBodyweight ? 'powt.' : 'kg'})</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">{summary.currentValue}</p>
            <p className="text-[10px] text-muted-foreground">Teraz ({isBodyweight ? 'powt.' : 'kg'})</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">
              {summary.change >= 0 ? '+' : ''}{summary.change} {isBodyweight ? 'powt.' : 'kg'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {summary.changePercent >= 0 ? '+' : ''}{summary.changePercent}% / {summary.totalSessions} sesji
            </p>
          </div>
        </div>

        {/* Plateau alert */}
        {plateau.isPlateau && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Brak progresu od {plateau.sessionsSinceProgress} sesji</p>
                <p className="text-xs text-muted-foreground">Rozważ deload lub zmianę schematu powtórzeń</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent sessions table */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Ostatnie sesje</h4>
          {recentSessions.map(s => (
            <div key={s.date} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-sm">
                {parseLocalDate(s.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
              </span>
              <div className="flex items-center gap-2">
                {isBodyweight ? (
                  <>
                    <Badge variant="secondary" className="text-xs">{s.bestReps} powt.</Badge>
                    <Badge variant="outline" className="text-xs">{s.totalVolume} łącznie</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-xs">{s.maxWeight} kg</Badge>
                    <Badge variant="outline" className="text-xs">{s.bestReps} rep</Badge>
                    <span className="text-xs text-muted-foreground">{s.estimated1RM} 1RM</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

interface Props {
  exerciseId: string;
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBodyweight?: boolean;
}

export const ExerciseProgressionDialog = ({ exerciseId, exerciseName, open, onOpenChange, isBodyweight = false }: Props) => {
  const { t, lang } = useTranslation();
  const { unit, fmt, toDisplay } = useUnit();
  const { uid } = useCurrentUser();
  const { workouts } = useFirebaseWorkouts(uid);
  // Ciężar wagowy → jednostka usera; bodyweight pokazuje powtórzenia (bez konwersji).
  const dispVal = (v: number): number => (isBodyweight ? v : Math.round(toDisplay(v)));

  const labelMaxReps = t('comp.progression.maxReps');
  const labelTotalReps = t('comp.progression.totalReps');
  const labelMaxKg = t('comp.progression.maxKg', { unit });

  const history = useMemo(() => getExerciseHistory(workouts, exerciseId, isBodyweight), [workouts, exerciseId, isBodyweight]);
  const plateau = useMemo(() => detectPlateau(history, 4, isBodyweight), [history, isBodyweight]);
  const summary = useMemo(() => getProgressionSummary(history, isBodyweight), [history, isBodyweight]);

  const chartData = useMemo(() =>
    isBodyweight
      ? history.map(h => ({
          date: parseLocalDate(h.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
          [labelMaxReps]: h.bestReps,
          [labelTotalReps]: h.totalVolume,
        }))
      : history.map(h => ({
          date: parseLocalDate(h.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
          '1RM': Math.round(toDisplay(h.estimated1RM)),
          [labelMaxKg]: Math.round(toDisplay(h.maxWeight)),
        })),
  [history, isBodyweight, labelMaxReps, labelTotalReps, labelMaxKg, toDisplay, lang]);

  const recentSessions = useMemo(() => history.slice(-5).reverse(), [history]);

  if (history.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{exerciseName}</DialogTitle>
            <DialogDescription>{t('comp.progression.noHistory')}</DialogDescription>
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
          <DialogDescription>{isBodyweight ? t('comp.progression.subtitleReps') : t('comp.progression.subtitleWeight')}</DialogDescription>
        </DialogHeader>

        {/* Chart */}
        {chartData.length >= 2 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" unit={isBodyweight ? ` ${t('comp.progression.repsShort')}` : ` ${unit}`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {isBodyweight ? (
                <>
                  <Line type="monotone" dataKey={labelMaxReps} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={labelTotalReps} stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="1RM" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={labelMaxKg} stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">{dispVal(summary.startValue)}</p>
            <p className="text-[10px] text-muted-foreground">{t('comp.progression.start')} ({isBodyweight ? t('comp.progression.repsShort') : unit})</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">{dispVal(summary.currentValue)}</p>
            <p className="text-[10px] text-muted-foreground">{t('comp.progression.now')} ({isBodyweight ? t('comp.progression.repsShort') : unit})</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-lg font-bold">
              {summary.change >= 0 ? '+' : ''}{dispVal(summary.change)} {isBodyweight ? t('comp.progression.repsShort') : unit}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {summary.changePercent >= 0 ? '+' : ''}{summary.changePercent}% / {t('comp.progression.sessionsCount', { count: summary.totalSessions })}
            </p>
          </div>
        </div>

        {/* Plateau alert */}
        {plateau.isPlateau && (
          <Card className="border-fitness-warning/50 bg-fitness-warning/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-fitness-warning shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('comp.progression.plateauTitle', { count: plateau.sessionsSinceProgress })}</p>
                <p className="text-xs text-muted-foreground">{t('comp.progression.plateauHint')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent sessions table */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{t('comp.progression.recentSessions')}</h4>
          {recentSessions.map(s => (
            <div key={s.date} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-sm">
                {parseLocalDate(s.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}
              </span>
              <div className="flex items-center gap-2">
                {isBodyweight ? (
                  <>
                    <Badge variant="secondary" className="text-xs">{s.bestReps} {t('comp.progression.repsShort')}</Badge>
                    <Badge variant="outline" className="text-xs">{s.totalVolume} {t('comp.progression.totalShort')}</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-xs">{fmt(s.maxWeight)}</Badge>
                    <Badge variant="outline" className="text-xs">{s.bestReps} {t('comp.progression.repShort')}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(toDisplay(s.estimated1RM))} 1RM</span>
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

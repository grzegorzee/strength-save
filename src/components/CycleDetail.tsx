import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Dumbbell, Trophy, TrendingUp, RefreshCw, CalendarX2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlanCycle } from '@/types/cycles';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface Props {
  cycle: PlanCycle;
  onBack: () => void;
}

export const CycleDetail = ({ cycle, onBack }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isActive = cycle.status === 'active';
  const tonnageT = (cycle.stats.totalTonnage / 1000).toFixed(1);

  const plannedEndDate = (start: string, weeks: number): string => {
    const date = parseLocalDate(start);
    date.setDate(date.getDate() + (weeks * 7) - 1);
    return formatLocalDate(date);
  };
  const formatDate = (d: string) =>
    d ? parseLocalDate(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : t('cycles.now');
  const displayedEndDate = cycle.endDate || plannedEndDate(cycle.startDate, cycle.durationWeeks);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('cycles.detailTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(cycle.startDate)} — {formatDate(displayedEndDate)}
          </p>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'} className="ml-auto">
          {isActive ? t('cycles.active') : t('cycles.completed')}
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{cycle.stats.totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">{t('cycles.workoutsLabel')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{tonnageT}t</p>
            <p className="text-xs text-muted-foreground">{t('cycles.tonnage')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{cycle.stats.prs.length}</p>
            <p className="text-xs text-muted-foreground">{t('cycles.recordsLabel')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-lg font-bold text-primary">%</span>
            <p className="text-2xl font-bold">{cycle.stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">{t('cycles.attendance')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarX2 className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{cycle.stats.missedWorkouts || 0}</p>
            <p className="text-xs text-muted-foreground">{t('cycles.missedSessions')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{cycle.stats.averageTonnagePerWorkout || 0}</p>
            <p className="text-xs text-muted-foreground">{t('cycles.kgPerWorkout')}</p>
          </CardContent>
        </Card>
      </div>

      {/* PRs */}
      {cycle.stats.prs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t('cycles.personalRecords')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {cycle.stats.prs.map((pr, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{pr.exerciseName}</span>
                <div className="text-right">
                  <span className="text-sm font-bold">{pr.weight} kg</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t('cycles.est1RM', { value: pr.estimated1RM })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('cycles.trainingPlan')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cycle.days.map(day => (
            <div key={day.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{day.dayName}</span>
                <Badge variant="outline" className="text-xs">{day.focus}</Badge>
              </div>
              <div className="space-y-0.5 pl-3 border-l-2 border-muted">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{ex.name}</span>
                    <span className="text-muted-foreground">{ex.sets}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Generate new plan from this cycle */}
      {!isActive && (
        <Button
          className="w-full"
          onClick={() => navigate(`/new-plan?fromCycle=${cycle.id}`)}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('cycles.generateFromCycle')}
        </Button>
      )}
    </div>
  );
};

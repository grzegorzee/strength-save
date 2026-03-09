import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Flame, ChevronRight, BarChart3, Brain, ChevronDown, ChevronUp, Sun, Moon, Calendar, Pencil, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { useAICoach } from '@/hooks/useAICoach';
import { useCurrentUser } from '@/contexts/UserContext';
import { calculateStreak } from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import type { CoachInsight } from '@/lib/ai-coach';
import { cn } from '@/lib/utils';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getThisWeekDates = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return [
    { dayId: 'day-1', date: monday },
    { dayId: 'day-2', date: wednesday },
    { dayId: 'day-3', date: friday },
  ];
};

// Trend component
const TrendIndicator = ({ value, suffix = '' }: { value: number | null; suffix?: string }) => {
  if (value === null || value === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> stabilnie
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-emerald-500">
        <TrendingUp className="h-3 w-3" /> +{value}{suffix}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-red-400">
      <TrendingDown className="h-3 w-3" /> {value}{suffix}
    </span>
  );
};

// AI Insight card (dark-first)
const insightConfig: Record<CoachInsight['type'], { icon: string; borderColor: string }> = {
  plateau: { icon: '🔴', borderColor: 'border-red-500/30' },
  warning: { icon: '🔴', borderColor: 'border-red-500/30' },
  progress: { icon: '🟢', borderColor: 'border-emerald-500/30' },
  suggestion: { icon: '🟡', borderColor: 'border-amber-500/30' },
  consistency: { icon: '🟡', borderColor: 'border-amber-500/30' },
};

const CompactInsightCard = ({ insight }: { insight: CoachInsight }) => {
  const config = insightConfig[insight.type];
  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border bg-card text-sm', config.borderColor)}>
      <span className="mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.message}</p>
      </div>
    </div>
  );
};

// Stats Card (inline, premium)
const DashboardStatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendSuffix = '',
  iconColor,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: number | null;
  trendSuffix?: string;
  iconColor: string;
  onClick?: () => void;
}) => (
  <Card
    className={cn(
      "hover:border-primary/30 transition-all duration-200",
      onClick && 'cursor-pointer'
    )}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-heading font-bold tracking-tight">{value}</p>
      <TrendIndicator value={trend} suffix={trendSuffix} />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { uid, profile } = useCurrentUser();
  const {
    workouts,
    getTotalWeight,
    getCompletedWorkoutsCount,
    getLatestMeasurement,
    isLoaded,
    error
  } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, isPlanExpired, currentWeek, planDurationWeeks } = useTrainingPlan(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid);

  // AI Coach
  const completedCount = useMemo(() => workouts.filter(w => w.completed).length, [workouts]);
  const showAIInsights = completedCount >= 3;
  const { insights, analyze, isReady: aiReady, hasCache } = useAICoach(uid);
  const [aiExpanded, setAIExpanded] = useState(true);

  // Auto-analyze on mount if cache valid
  useMemo(() => {
    if (showAIInsights && aiReady && hasCache) {
      analyze(false);
    }
  }, [showAIInsights, aiReady, hasCache]);

  const latestMeasurement = getLatestMeasurement();
  const totalWeight = getTotalWeight();

  const thisWeek = useMemo(() => getThisWeekDates(), []);

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  // Calculate trends (last 4 weeks vs previous 4 weeks)
  const trends = useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentWorkouts = workouts.filter(w => w.completed && new Date(w.date) >= fourWeeksAgo);
    const olderWorkouts = workouts.filter(w => w.completed && new Date(w.date) >= eightWeeksAgo && new Date(w.date) < fourWeeksAgo);

    const recentCount = recentWorkouts.length;
    const olderCount = olderWorkouts.length;

    const recentTonnage = recentWorkouts.reduce((sum, w) => {
      return sum + Object.values(w.exercises || {}).reduce((exSum, ex) => {
        return exSum + (ex.sets || []).reduce((setSum, s) => setSum + ((s.weight || 0) * (s.reps || 0)), 0);
      }, 0);
    }, 0);
    const olderTonnage = olderWorkouts.reduce((sum, w) => {
      return sum + Object.values(w.exercises || {}).reduce((exSum, ex) => {
        return exSum + (ex.sets || []).reduce((setSum, s) => setSum + ((s.weight || 0) * (s.reps || 0)), 0);
      }, 0);
    }, 0);

    return {
      workouts: olderCount > 0 ? recentCount - olderCount : null,
      tonnage: olderTonnage > 0 ? Math.round((recentTonnage - olderTonnage) / 1000 * 10) / 10 : null,
      weight: null as number | null,
      streak: streak > 0 ? streak : null,
    };
  }, [workouts, streak]);

  // Find most recent PR
  const latestPR = useMemo(() => {
    const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
    const completedSorted = workouts
      .filter(w => w.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const workout of completedSorted) {
      const olderWorkouts = completedSorted.filter(w => w.id !== workout.id && new Date(w.date) < new Date(workout.date));
      if (olderWorkouts.length === 0) continue;
      const prs = detectNewPRs(workout, olderWorkouts, allNames);
      if (prs.length > 0) {
        return {
          exerciseName: prs[0].exerciseName,
          value: prs[0].newValue,
          type: prs[0].type,
          date: workout.date,
        };
      }
    }
    return null;
  }, [workouts, trainingPlan]);

  // Greeting
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';
  const GreetingIcon = hour < 18 ? Sun : Moon;
  const displayName = profile?.displayName?.split(' ')[0] || 'Trener';
  const formattedDate = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Plan progress
  const planProgress = Math.min(100, Math.round((currentWeek / planDurationWeeks) * 100));

  // Day focus descriptions
  const dayColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Błąd: {error}</p>
      </div>
    );
  }

  const formatPRDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'dziś';
    if (diffDays === 1) return 'wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2 tracking-tight">
          <GreetingIcon className="h-6 w-6 text-yellow-500" />
          {greetingText}, {displayName}!
        </h1>
        <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
      </div>

      {/* Plan expired banner */}
      {isPlanExpired && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Twój plan się zakończył!</p>
              <p className="text-xs text-muted-foreground">Czas na nowy plan treningowy.</p>
            </div>
            <Button size="sm" onClick={() => navigate('/new-plan')}>Nowy plan</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title="Treningi"
          value={completedCount}
          icon={Trophy}
          trend={trends.workouts}
          iconColor="bg-emerald-500/15 text-emerald-500"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Tonaż"
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          icon={Dumbbell}
          trend={trends.tonnage}
          trendSuffix="t"
          iconColor="bg-primary/15 text-primary"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Waga"
          value={latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : '--'}
          icon={Weight}
          trend={trends.weight}
          trendSuffix=" kg"
          iconColor="bg-muted text-muted-foreground"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <DashboardStatCard
          title="Streak"
          value={`${streak} tyg.`}
          icon={Flame}
          trend={trends.streak}
          trendSuffix=" tyg."
          iconColor="bg-amber-500/15 text-amber-500"
          onClick={() => navigate('/analytics?tab=charts')}
        />
      </div>

      {/* Your Plan Card */}
      {!isPlanExpired && trainingPlan.length > 0 && (
        <Card className="hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-heading font-semibold text-base">Twój Plan Treningowy</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7 gap-1"
                onClick={() => navigate('/plan/edit')}
              >
                <Pencil className="h-3 w-3" />
                Edytuj
              </Button>
            </div>

            {/* Plan meta */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
              <span>{trainingPlan.length}x/tydzień</span>
              <span>·</span>
              <span>Tydzień {Math.min(currentWeek, planDurationWeeks)} z {planDurationWeeks}</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${planProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{planProgress}% ukończone</p>
            </div>

            {/* Days overview */}
            <div className="space-y-2">
              {trainingPlan.map((day, i) => (
                <div key={day.id} className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full shrink-0", dayColors[i % dayColors.length])} />
                  <span className="text-sm">
                    <span className="font-medium">{day.dayName}:</span>{' '}
                    <span className="text-muted-foreground">{day.focus}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights (max 2) */}
      {showAIInsights && insights.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setAIExpanded(prev => !prev)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-heading font-semibold text-sm flex-1">AI Insights</span>
            {aiExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {aiExpanded && (
            <div className="space-y-2">
              {insights.slice(0, 2).map((insight, i) => (
                <CompactInsightCard key={`${insight.type}-${i}`} insight={insight} />
              ))}
              {insights.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground w-full"
                  onClick={() => navigate('/ai')}
                >
                  Zobacz więcej w AI Coach
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Latest PR */}
      {latestPR && (
        <Card
          className="cursor-pointer hover:border-amber-500/40 transition-all duration-200 border-amber-500/20"
          onClick={() => navigate('/achievements')}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ostatni rekord</p>
                  <p className="text-xs text-muted-foreground">
                    {latestPR.exerciseName} — <span className="font-heading font-semibold text-foreground">{latestPR.value} kg</span>
                    {' '}
                    <span className="text-muted-foreground">({formatPRDate(latestPR.date)})</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* This week's training */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-base tracking-tight">Plan tygodnia</h2>
        <div className="grid gap-3">
          {thisWeek.map(({ dayId, date }) => {
            const day = trainingPlan.find(d => d.id === dayId);
            if (!day) return null;

            const dateStr = formatLocalDate(date);
            const workoutForDate = workouts.find(w => w.dayId === dayId && w.date === dateStr);

            return (
              <TrainingDayCard
                key={dayId}
                day={day}
                latestWorkout={workoutForDate}
                trainingDate={date}
                onClick={() => navigate(`/workout/${dayId}?date=${dateStr}`)}
              />
            );
          })}

          {/* Strava activities for this week */}
          {stravaConnection.connected && (() => {
            const mondayStr = formatLocalDate(thisWeek[0].date);
            const sundayDate = new Date(thisWeek[0].date);
            sundayDate.setDate(sundayDate.getDate() + 6);
            const sundayStr = formatLocalDate(sundayDate);

            const weekActivities = stravaActivities.filter(
              a => a.date >= mondayStr && a.date <= sundayStr
            );

            if (weekActivities.length === 0) return null;

            return weekActivities.map(activity => (
              <StravaActivityCard key={activity.id} activity={activity} />
            ));
          })()}
        </div>
      </div>

      {/* Analytics link */}
      <Button
        variant="outline"
        className="w-full py-5 hover:border-primary/30 transition-all duration-200"
        onClick={() => navigate('/analytics')}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Zobacz analitykę
      </Button>
    </div>
  );
};

export default Dashboard;

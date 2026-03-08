import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Weight, Trophy, Flame, ChevronRight, BarChart3, Brain, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/StatsCard';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useStrava } from '@/hooks/useStrava';
import { useAICoach } from '@/hooks/useAICoach';
import { useCurrentUser } from '@/contexts/UserContext';
import { calculateStreak } from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
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

// AI Insight card (compact)
const insightConfig: Record<CoachInsight['type'], { emoji: string; bgColor: string }> = {
  plateau: { emoji: '🔴', bgColor: 'bg-red-50 border-red-200' },
  warning: { emoji: '🔴', bgColor: 'bg-red-50 border-red-200' },
  progress: { emoji: '🟢', bgColor: 'bg-green-50 border-green-200' },
  suggestion: { emoji: '🟡', bgColor: 'bg-amber-50 border-amber-200' },
  consistency: { emoji: '🟡', bgColor: 'bg-amber-50 border-amber-200' },
};

const CompactInsightCard = ({ insight }: { insight: CoachInsight }) => {
  const config = insightConfig[insight.type];
  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border text-sm', config.bgColor)}>
      <span className="mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.message}</p>
      </div>
    </div>
  );
};

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
  const { plan: trainingPlan } = useTrainingPlan(uid);
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GreetingIcon className="h-6 w-6 text-yellow-500" />
          {greetingText}, {displayName}!
        </h1>
        <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ukończone treningi"
          value={completedCount}
          icon={Trophy}
          variant="success"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <StatsCard
          title="Tonaż całkowity"
          value={`${(totalWeight / 1000).toFixed(1)}t`}
          subtitle="Suma podniesionych kg"
          icon={Dumbbell}
          variant="primary"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <StatsCard
          title="Aktualna waga"
          value={latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : '--'}
          icon={Weight}
          variant="default"
          onClick={() => navigate('/analytics?tab=charts')}
        />
        <StatsCard
          title="Seria treningowa"
          value={`${streak} tyg.`}
          subtitle={streak > 0 ? 'Nie przerywaj!' : 'Zacznij serię'}
          icon={Flame}
          variant="warning"
          onClick={() => navigate('/analytics?tab=charts')}
        />
      </div>

      {/* AI Insights */}
      {showAIInsights && insights.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setAIExpanded(prev => !prev)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm flex-1">AI Insights</span>
            {aiExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {aiExpanded && (
            <div className="space-y-2">
              {insights.slice(0, 3).map((insight, i) => (
                <CompactInsightCard key={`${insight.type}-${i}`} insight={insight} />
              ))}
              {insights.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground w-full"
                  onClick={() => navigate('/ai')}
                >
                  Więcej insightów w AI Chat
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Latest PR */}
      {latestPR && (
        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors border-yellow-500/30 bg-yellow-500/5"
          onClick={() => navigate('/achievements')}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Ostatni rekord</p>
                  <p className="text-xs text-muted-foreground">
                    {latestPR.exerciseName} — <span className="font-semibold text-foreground">{latestPR.value} kg</span>
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
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Plan tygodnia</h2>
        <div className="grid gap-4">
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
        className="w-full py-5"
        onClick={() => navigate('/analytics')}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Zobacz analitykę
      </Button>
    </div>
  );
};

export default Dashboard;

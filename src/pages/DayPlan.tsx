import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Dumbbell, Play, Moon, Sun, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getTrainingRules } from '@/data/trainingPlan';
import { warmupExercises, getStretchingForFocus, localizeWarmup } from '@/data/warmupStretching';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useStrava } from '@/hooks/useStrava';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { cn, formatLocalDate } from '@/lib/utils';
import { getNextScheduledTraining, getScheduledTrainingForDate } from '@/lib/plan-schedule';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';

const DayPlan = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid, canUseStrava } = useCurrentUser();
  const { getTodaysWorkout, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, canUseStrava);

  const [showWarmup, setShowWarmup] = useState(false);
  const [showStretching, setShowStretching] = useState(false);

  const trainingRules = getTrainingRules(lang);

  // Determine today's training from dynamic plan
  const today = new Date();
  const todaysTraining = getScheduledTrainingForDate(trainingPlan, today)?.day ?? null;
  const nextScheduledTraining = getNextScheduledTraining(trainingPlan, today);
  const dayName = today.toLocaleDateString(dateLocale(lang), { weekday: 'long' });
  const dateStr = today.toLocaleDateString(dateLocale(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Check if today's workout is already completed
  const todaysWorkout = todaysTraining ? getTodaysWorkout(todaysTraining.id) : null;
  const isWorkoutCompleted = todaysWorkout?.completed === true;

  // Determine greeting based on time
  const hour = today.getHours();
  const greeting = hour < 12 ? t('dayplan.greetingMorning') : hour < 18 ? t('dayplan.greetingDay') : t('dayplan.greetingEvening');
  const GreetingIcon = hour < 18 ? Sun : Moon;

  // Today's Strava activities (non-strength)
  const todayStr = formatLocalDate(today);
  const todayStravaActivities = stravaConnection.connected
    ? stravaActivities.filter(a =>
        a.date === todayStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit'
      )
    : [];

  // Stretching exercises for today's focus
  const stretchingExercises = todaysTraining
    ? getStretchingForFocus(todaysTraining.focus)
    : [];

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  // Show rest day view if no training today OR if today's workout is completed
  if (!todaysTraining || isWorkoutCompleted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isWorkoutCompleted ? 'bg-fitness-success' : 'bg-muted'}`}>
                {isWorkoutCompleted ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : (
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GreetingIcon className="h-5 w-5 text-yellow-500" />
                  {greeting}!
                </CardTitle>
                <CardDescription className="capitalize">
                  {dayName}, {dateStr}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className={`h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isWorkoutCompleted ? 'bg-fitness-success/20' : 'bg-muted'}`}>
                <span className="text-4xl">{isWorkoutCompleted ? '💪' : '🧘'}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {isWorkoutCompleted
                  ? t('dayplan.workoutDoneTitle')
                  : todayStravaActivities.length > 0
                    ? t('dayplan.noStrengthTitle')
                    : t('dayplan.restTitle')
                }
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isWorkoutCompleted
                  ? t('dayplan.workoutDoneDesc', { focus: localizeFocus(todaysTraining?.focus ?? '', lang) })
                  : todayStravaActivities.length > 0
                    ? t('dayplan.noStrengthDesc')
                    : t('dayplan.restDesc')
                }
              </p>
            </div>

            {/* Today's Strava activities — shown before tips */}
            {todayStravaActivities.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{t('dayplan.stravaToday')}</h4>
                {todayStravaActivities.map(activity => (
                  <StravaActivityCard key={activity.id} activity={activity} maxHR={stravaConnection.estimatedMaxHR} />
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-1">
                    {isWorkoutCompleted ? t('dayplan.workoutStats') : t('dayplan.nextTraining')}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {isWorkoutCompleted
                      ? t('dayplan.exercisesDone', { n: todaysWorkout?.exercises.length || 0 })
                    : nextScheduledTraining
                      ? t('dayplan.nextTrainingDetail', { day: localizeDayName(nextScheduledTraining.day.dayName, lang), focus: localizeFocus(nextScheduledTraining.day.focus, lang) })
                      : t('dayplan.checkWeeklyPlan')
                    }
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-1">{t('dayplan.tipOfDay')}</h4>
                  <p className="text-muted-foreground text-sm">
                    {isWorkoutCompleted
                      ? t('dayplan.tipProtein')
                      : t('dayplan.tipHydration')
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {isWorkoutCompleted && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/workout/${todaysTraining?.id}?date=${formatLocalDate(today)}`)}
              >
                {t('dayplan.viewWorkoutDetails')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
                <Dumbbell className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GreetingIcon className="h-5 w-5 text-yellow-500" />
                  {greeting}! {t('dayplan.todayTraining')}
                </CardTitle>
                <CardDescription className="capitalize">
                  {dayName}, {dateStr}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground px-3 py-1">
              {localizeDayName(todaysTraining.dayName, lang)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-1">{localizeFocus(todaysTraining.focus, lang)}</h3>
            <p className="text-muted-foreground text-sm">
              {t('dayplan.exercisesInToday', { n: todaysTraining.exercises.length })}
            </p>
          </div>

          {/* Warmup section (collapsible) */}
          <button
            onClick={() => setShowWarmup(prev => !prev)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="font-medium text-sm">{t('dayplan.warmup')}</span>
            </div>
            {showWarmup ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showWarmup && (
            <div className="space-y-1 pl-4">
              {warmupExercises.map((ex, i) => {
                const w = localizeWarmup(ex, lang);
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <span>{w.name}</span>
                    <span className="text-muted-foreground text-xs">{w.duration}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Training Rules */}
          <Alert>
            <AlertDescription className="space-y-1 text-sm">
              <p>⚡ {trainingRules.weight}</p>
              <p>⏱️ {trainingRules.restMain}</p>
              <p>🔄 {trainingRules.supersets}</p>
            </AlertDescription>
          </Alert>

          {/* Exercise List Preview */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">{t('dayplan.todaysExercises')}</h4>
            <div className="space-y-2">
              {todaysTraining.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Badge
                    variant="secondary"
                    className="h-8 w-8 rounded-md flex items-center justify-center font-bold shrink-0"
                  >
                    {exercise.isSuperset
                      ? `${index + 1}${exercise.id.endsWith('a') ? 'a' : 'b'}`
                      : index + 1
                    }
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{localizeExerciseName(exercise.name, lang)}</p>
                    <p className="text-xs text-muted-foreground">{exercise.sets}</p>
                  </div>
                  {exercise.isSuperset && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {t('dayplan.superset')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stretching section (collapsible) */}
          <button
            onClick={() => setShowStretching(prev => !prev)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🧘</span>
              <span className="font-medium text-sm">{t('dayplan.stretching')}</span>
            </div>
            {showStretching ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showStretching && (
            <div className="space-y-1 pl-4">
              {stretchingExercises.map((ex, i) => {
                const s = localizeWarmup(ex, lang);
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground text-xs">{s.duration}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's Strava activities */}
          {todayStravaActivities.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">{t('dayplan.stravaToday')}</h4>
              {todayStravaActivities.map(activity => (
                <StravaActivityCard key={activity.id} activity={activity} maxHR={stravaConnection.estimatedMaxHR} />
              ))}
            </div>
          )}

          {/* Start Workout Button */}
          <Button
            size="lg"
            className="w-full py-6 text-lg"
            onClick={() => navigate(`/workout/${todaysTraining.id}?date=${formatLocalDate(today)}&autostart=true`)}
          >
            <Play className="h-5 w-5 mr-2" />
            {t('dayplan.startWorkout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayPlan;

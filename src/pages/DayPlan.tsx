import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, Play, CheckCircle, ChevronDown, ChevronUp, Leaf, Flame, Zap, Timer, Repeat } from 'lucide-react';
import { getTrainingRules } from '@/data/trainingPlan';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { slugifyExercise } from '@/lib/exercise-media';
import { getStretchingForFocus, localizeWarmup } from '@/data/warmupStretching';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useStrava } from '@/hooks/useStrava';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useCurrentUser } from '@/contexts/UserContext';
import { StravaActivityCard } from '@/components/StravaActivityCard';
import { formatLocalDate } from '@/lib/utils';
import { getNextScheduledTraining, getScheduledTrainingForDate } from '@/lib/plan-schedule';
import { useTranslation } from '@/contexts/LanguageContext';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { displayDayNameForDate, localizeFocus } from '@/lib/plan-i18n';
import { dateLocale } from '@/i18n';

const DayPlan = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid, profile, canUseStrava } = useCurrentUser();
  const { getTodaysWorkout, isLoaded } = useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });
  const { plan: trainingPlan, scheduleOverrides, planStartDate } = useTrainingPlan(uid);
  // Z214: ekran dnia pokazuje wyłącznie dzisiejsze aktywności — okno od dziś.
  const { activities: stravaActivities, connection: stravaConnection } = useStrava(uid, canUseStrava, formatLocalDate(new Date()));

  const [showWarmup, setShowWarmup] = useState(false);
  const [showStretching, setShowStretching] = useState(false);
  const [showTrainingTips, setShowTrainingTips] = useState(false);

  const trainingRules = getTrainingRules(lang);

  // Determine today's training from dynamic plan
  // WP-B (X28): overrides + start planu jak w Dashboardzie — dzień sprzed
  // startu nie ma treningu planowego, przełożenia obowiązują też tutaj.
  const today = new Date();
  const todaysTraining = getScheduledTrainingForDate(trainingPlan, today, scheduleOverrides, planStartDate)?.day ?? null;
  const nextScheduledTraining = getNextScheduledTraining(trainingPlan, today, { overrides: scheduleOverrides, startDateISO: planStartDate });
  const dateStr = today.toLocaleDateString(dateLocale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Check if today's workout is already completed
  const todaysWorkout = todaysTraining ? getTodaysWorkout(todaysTraining.id) : null;
  const isWorkoutCompleted = todaysWorkout?.completed === true;

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
  // Jedno źródło prawdy z dialogiem startu treningu. Stara stała lista na /day
  // nie miała opisów i nadal pokazywała pajacyki usunięte z rozgrzewki v3.
  const firstExercise = todaysTraining?.exercises[0];
  const firstLibraryExercise = firstExercise
    ? exerciseLibrary.find((exercise) => exercise.name === firstExercise.name)
    : undefined;
  const warmupPlan = firstExercise
    ? buildPreStartWarmup({
      exerciseName: firstExercise.name,
      category: firstLibraryExercise?.category,
      isBodyweight: firstLibraryExercise?.isBodyweight,
      level: profile?.trainingProfile?.level,
    })
    : null;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const dateLabel = (
    <time dateTime={todayStr} className="block text-sm leading-relaxed text-muted-foreground first-letter:uppercase">
      {dateStr}
    </time>
  );

  // Rest/completed states keep their existing data and navigation, with one heading.
  if (!todaysTraining || isWorkoutCompleted) {
    return (
      <div className="space-y-5">
        {dateLabel}
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isWorkoutCompleted ? 'bg-fitness-success/10 text-fitness-success' : 'bg-muted text-muted-foreground'}`}>
            {isWorkoutCompleted ? <CheckCircle className="h-5 w-5" aria-hidden /> : <Leaf className="h-5 w-5" aria-hidden />}
          </div>
          <div className="min-w-0 space-y-2">
            <h2 className="break-words text-xl font-semibold leading-snug">
              {isWorkoutCompleted
                ? t('dayplan.workoutDoneTitle')
                : todayStravaActivities.length > 0
                  ? t('dayplan.noStrengthTitle')
                  : t('dayplan.restTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isWorkoutCompleted
                ? t('dayplan.workoutDoneDesc', { focus: localizeFocus(todaysTraining?.focus ?? '', lang) })
                : todayStravaActivities.length > 0
                  ? t('dayplan.noStrengthDesc')
                  : t('dayplan.restDesc')}
            </p>
          </div>
        </div>

        {todayStravaActivities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dayplan.stravaToday')}</h3>
            {todayStravaActivities.map(activity => (
              <StravaActivityCard key={activity.id} activity={activity} maxHR={stravaConnection.estimatedMaxHR} />
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-0 bg-muted/30 shadow-none">
            <CardContent className="space-y-1 p-4">
              <h3 className="text-sm font-medium">
                {isWorkoutCompleted ? t('dayplan.workoutStats') : t('dayplan.nextTraining')}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isWorkoutCompleted
                  ? t('dayplan.exercisesDone', { n: todaysWorkout?.exercises.length || 0 })
                  : nextScheduledTraining
                    ? t('dayplan.nextTrainingDetail', { day: displayDayNameForDate(nextScheduledTraining.day.dayName, nextScheduledTraining.day.weekday, nextScheduledTraining.date, lang), focus: localizeFocus(nextScheduledTraining.day.focus, lang) })
                    : t('dayplan.checkWeeklyPlan')}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/30 shadow-none">
            <CardContent className="space-y-1 p-4">
              <h3 className="text-sm font-medium">{t('dayplan.tipOfDay')}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isWorkoutCompleted ? t('dayplan.tipProtein') : t('dayplan.tipHydration')}
              </p>
            </CardContent>
          </Card>
        </div>

        {isWorkoutCompleted && (
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full whitespace-normal py-3"
            onClick={() => navigate(`/workout/${todaysTraining?.id}?date=${todayStr}`)}
          >
            {t('dayplan.viewWorkoutDetails')}
          </Button>
        )}
      </div>
    );
  }

  const focus = localizeFocus(todaysTraining.focus, lang);
  const scheduledName = displayDayNameForDate(todaysTraining.dayName, todaysTraining.weekday, today, lang);
  const weekdayName = today.toLocaleDateString(dateLocale(lang), { weekday: 'long' });
  const customDayName = scheduledName.toLocaleLowerCase() !== weekdayName.toLocaleLowerCase() && scheduledName !== focus
    ? scheduledName
    : null;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        {dateLabel}
        <h2 className="break-words text-xl font-semibold leading-snug">{customDayName ? `${customDayName} · ${focus}` : focus}</h2>
        <p className="text-sm text-muted-foreground">
          {t('dayplan.exercisesInToday', { n: todaysTraining.exercises.length })}
        </p>
      </header>

      <Button
        className="h-auto min-h-11 w-full whitespace-normal py-3 text-base"
        onClick={() => navigate(`/workout/${todaysTraining.id}?date=${todayStr}&autostart=true`)}
      >
        <Play aria-hidden />
        {t('dayplan.startWorkout')}
      </Button>

      <section aria-labelledby="dayplan-exercises-heading" className="space-y-2">
        <h3 id="dayplan-exercises-heading" className="text-sm font-medium text-muted-foreground">
          {t('dayplan.todaysExercises')}
        </h3>
        <ol role="list" aria-labelledby="dayplan-exercises-heading" className="space-y-2">
          {todaysTraining.exercises.map((exercise, index) => {
            // Group identity is independent of generated exercise IDs. Keep the
            // pair's first ordinal (5A/5B); ungrouped flags retain normal ordering.
            const group = exercise.isSuperset && exercise.supersetGroup
              ? todaysTraining.exercises.filter(item => item.isSuperset && item.supersetGroup === exercise.supersetGroup)
              : [];
            const ordinal = group.length > 1
              ? `${todaysTraining.exercises.indexOf(group[0]) + 1}${String.fromCharCode(65 + group.indexOf(exercise))}`
              : String(index + 1);
            const slug = slugifyExercise(exercise.name);
            const hasDetail = slug && exerciseLibrary.some(item => slugifyExercise(item.name) === slug);
            return (
              <li key={exercise.id} className="rounded-xl bg-card p-3">
                <div className={hasDetail ? 'grid grid-cols-[minmax(0,1fr)_44px] items-start gap-2' : 'min-w-0'}>
                  <div className="min-w-0">
                    <p className="text-base font-medium leading-snug [overflow-wrap:anywhere]">
                      <span className="mr-2 inline-block text-sm font-semibold tabular-nums text-primary">{ordinal}</span>
                      {localizeExerciseName(exercise.name, lang)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-relaxed text-muted-foreground">
                      <p className="min-w-0 max-w-full [overflow-wrap:anywhere]">{exercise.sets}</p>
                      {exercise.isSuperset && (
                        <p className="min-w-0 max-w-full [overflow-wrap:anywhere]">{t('dayplan.superset')}</p>
                      )}
                    </div>
                  </div>
                  {hasDetail && (
                    <button
                      type="button"
                      onClick={() => navigate(`/exercise/${slug}`)}
                      aria-label={t('card.details')}
                      className="grid h-[44px] w-[44px] place-items-center rounded-lg text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Info className="h-5 w-5" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowWarmup(prev => !prev)}
          aria-expanded={showWarmup}
          aria-controls="dayplan-warmup-content"
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {t('dayplan.warmup')}
          </span>
          {showWarmup ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
        {showWarmup && (
          <div id="dayplan-warmup-content" className="space-y-2" data-testid="dayplan-warmup-v3">
            {warmupPlan?.items.map(item => {
              const amount = typeof item.durationSec === 'number'
                ? t('warmup.v3.seconds', { n: item.durationSec })
                : item.perSide
                  ? t('warmup.v3.repsPerSide', { n: item.reps ?? 0 })
                  : t('warmup.v3.reps', { n: item.reps ?? 0 });
              return (
                <div key={item.key} className="rounded-xl bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 font-medium [overflow-wrap:anywhere]">{t(item.key)}</p>
                    <p className="text-muted-foreground">{amount}</p>
                  </div>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{t(item.instructionKey)}</p>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowStretching(prev => !prev)}
          aria-expanded={showStretching}
          aria-controls="dayplan-stretching-content"
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Leaf className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {t('dayplan.stretching')}
          </span>
          {showStretching ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
        {showStretching && (
          <div id="dayplan-stretching-content" className="space-y-2 rounded-xl bg-card p-3">
            {stretchingExercises.map((exercise, index) => {
              const stretching = localizeWarmup(exercise, lang);
              return (
                <div key={index} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{stretching.name}</span>
                  <span className="text-muted-foreground">{stretching.duration}</span>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowTrainingTips(prev => !prev)}
          aria-expanded={showTrainingTips}
          aria-controls="dayplan-training-tips"
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {t('dayplan.trainingTips')}
          </span>
          {showTrainingTips ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
        {showTrainingTips && (
          <div id="dayplan-training-tips" className="space-y-3 rounded-xl bg-card p-3 text-sm leading-relaxed text-muted-foreground">
            <p className="flex items-start gap-2"><Zap className="mt-1 h-4 w-4 shrink-0" aria-hidden />{trainingRules.weight}</p>
            <p className="flex items-start gap-2"><Timer className="mt-1 h-4 w-4 shrink-0" aria-hidden />{trainingRules.restMain}</p>
            <p className="flex items-start gap-2"><Repeat className="mt-1 h-4 w-4 shrink-0" aria-hidden />{trainingRules.supersets}</p>
          </div>
        )}
      </div>

      {todayStravaActivities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('dayplan.stravaToday')}</h3>
          {todayStravaActivities.map(activity => (
            <StravaActivityCard key={activity.id} activity={activity} maxHR={stravaConnection.estimatedMaxHR} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DayPlan;

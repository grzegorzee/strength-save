// Trening próbny (przewodnik nowego konta v2, 2026-09-30). Ten sam UI co
// prawdziwy trening (ExerciseCard, wiersz serii, menu ćwiczenia, RestBar,
// Zakończ), ale dane przykładowe w pamięci komponentu i ZERO zapisów.
//
// Niezmiennik izolacji (test: practice-isolation.test.tsx):
// - ta strona nie importuje żadnego modułu zapisu (draft IDB, kolejka sync,
//   Firestore treningów/planu/cykli, HealthKit, zegarek, PR, celebracje);
// - efekty uboczne wspólnych komponentów (telemetria odhaczenia, powiadomienia
//   systemowe przerwy i odliczania) idą przez adapter WorkoutEffects, który tu
//   jest no-op (PracticeWorkoutEffects);
// - zamiana/pominięcie ćwiczenia zmienia wyłącznie lokalny stan próby;
// - jedyny zapis to stan przewodnika (preferences.appTour), jak dotąd.
// Wyjście w dowolny sposób (wstecz, gest, zakładka, zabicie apki) gubi stan
// próby, bo żyje tylko w pamięci; nic nie trzeba sprzątać.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Check, FlaskConical, X } from 'lucide-react';
import { ExerciseCard } from '@/components/ExerciseCard';
import { RestBar } from '@/components/RestBar';
import { AppTour } from '@/components/AppTour';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PracticeWorkoutEffects } from '@/contexts/WorkoutEffectsContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useAppTour } from '@/hooks/useAppTour';
import { hapticSuccess } from '@/lib/haptics';
import { lbsToKg } from '@/lib/units';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { PRACTICE_TOUR_STEPS, countCheckedSets } from '@/lib/first-workout-tour';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { PRACTICE_EXERCISES, PRACTICE_SWAP_OPTIONS, type PracticeExercise } from '@/data/practice-workout';
import type { SetData } from '@/types';

const buildSets = (item: PracticeExercise, unit: string): SetData[] => {
  const weight = unit === 'lbs' ? lbsToKg(item.lbs) : item.kg;
  return [0, 1, 2].map(() => ({ weight, reps: item.reps, completed: false }));
};

interface RestState {
  deadlineAt: number;
  totalSeconds: number;
  runId: number;
  exerciseId: string;
}

const PracticeWorkoutScreen = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { unit } = useUnit();
  const appTour = useAppTour(null);
  const tourActive = appTour.stage === 'dashboard' || appTour.stage === 'practice';

  const [items, setItems] = useState(() => PRACTICE_EXERCISES.map((item) => ({
    ...item,
    sets: buildSets(item, unit),
    skipped: false,
  })));
  const [rest, setRest] = useState<RestState | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [done, setDone] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null);

  // Wejście do próby spoza Dashboardu (np. link) w trakcie przewodnika.
  useEffect(() => {
    if (appTour.stage === 'dashboard') appTour.advance('practice');
  }, [appTour]);

  const checkedSets = useMemo(
    () => countCheckedSets(Object.fromEntries(items.map((i) => [i.exercise.id, i.sets]))),
    [items],
  );

  const handleSetsChange = useCallback((exerciseId: string, sets: SetData[]) => {
    setItems((prev) => prev.map((i) => (i.exercise.id === exerciseId ? { ...i, sets } : i)));
  }, []);

  const handleRestStart = useCallback((exerciseId: string, seconds: number) => {
    setRest((prev) => ({
      deadlineAt: Date.now() + seconds * 1000,
      totalSeconds: seconds,
      runId: (prev?.runId ?? 0) + 1,
      exerciseId,
    }));
  }, []);

  const handleSkip = useCallback((exerciseId: string) => {
    setItems((prev) => prev.map((i) => (i.exercise.id === exerciseId ? { ...i, skipped: true } : i)));
  }, []);

  const swapTo = (name: string) => {
    const targetId = swapFor;
    setSwapFor(null);
    if (!targetId) return;
    setItems((prev) => prev.map((i) => (i.exercise.id === targetId
      ? {
          ...i,
          exercise: { ...i.exercise, id: `${i.exercise.id}-swap`, name },
          sets: i.sets.map((s) => ({ ...s, completed: false })),
        }
      : i)));
  };

  const exit = () => {
    // Wyjście z próby w trakcie przewodnika: rozdział próby pominięty, przewodnik
    // idzie dalej (zakładki), zamiast wracać w pętli do zaproszenia.
    if (tourActive) appTour.advance('tabs', 'tab-plan');
    navigate('/');
  };

  const visibleItems = items.filter((i) => !i.skipped);
  const restItem = rest ? items.find((i) => i.exercise.id === rest.exerciseId) : undefined;

  if (done) {
    return (
      <div className="space-y-4 pt-2" data-testid="practice-done">
        <section className="rounded-3xl bg-surface-container p-6 text-center">
          <span className="tour-check-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
          </span>
          <p className="eyebrow-mono mt-5 text-primary">{t('practice.doneKicker')}</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">{t('practice.doneTitle')}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{t('practice.doneDesc')}</p>
        </section>
        {tourActive ? (
          <Button
            data-testid="practice-show-tabs"
            className="kinetic-primary-button h-14 w-full text-base"
            onClick={() => {
              appTour.advance('tabs', 'tab-plan');
              navigate('/');
            }}
          >
            {t('practice.showTabs')}
          </Button>
        ) : null}
        <Button
          data-testid="practice-back-home"
          variant={tourActive ? 'ghost' : 'default'}
          className={tourActive ? 'h-12 w-full text-muted-foreground' : 'kinetic-primary-button h-14 w-full text-base'}
          onClick={() => {
            if (tourActive) appTour.finish('done');
            navigate('/');
          }}
        >
          {t('practice.backHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-[calc(var(--mobile-nav-clearance,7rem)+5rem)]" data-testid="practice-workout">
      {/* Stały pasek: tryb próbny widoczny zawsze, wyjście jednym tapnięciem.
          z-[75]: NAD overlayem przewodnika (z-70), więc „Zakończ próbę” działa
          także w trakcie kroku (każdy stan ma wyjście, zasada 6). */}
      <div
        className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-[75] flex items-center gap-3 rounded-2xl bg-surface-low py-2 pl-4 pr-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        data-testid="practice-banner"
      >
        <FlaskConical className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-primary">{t('practice.banner')}</p>
        <button
          type="button"
          data-testid="practice-exit"
          onClick={exit}
          className="flex min-h-11 shrink-0 touch-manipulation items-center gap-1 rounded-xl px-3 text-[13px] font-semibold text-foreground hover:bg-surface-high"
        >
          <X className="h-4 w-4" aria-hidden />
          {t('practice.exit')}
        </button>
      </div>

      <h1 className="font-heading text-xl font-bold tracking-tight">{t('practice.title')}</h1>

      {visibleItems.map((item, index) => (
        <ExerciseCard
          key={item.exercise.id}
          exercise={item.exercise}
          index={index + 1}
          isEditable
          savedSets={item.sets}
          onSetsChange={handleSetsChange}
          onRestStart={handleRestStart}
          onRequestSwap={setSwapFor}
          onSkip={handleSkip}
          restRun={rest && rest.exerciseId === item.exercise.id ? rest : null}
        />
      ))}

      {confirmFinish ? (
        <div className="flex flex-col-reverse gap-2">
          <Button size="lg" variant="outline" className="h-12 w-full" onClick={() => setConfirmFinish(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="lg"
            data-testid="practice-confirm-finish"
            className="kinetic-primary-button min-h-14 w-full text-sm"
            onClick={() => {
              setRest(null);
              void hapticSuccess();
              setDone(true);
            }}
          >
            <Check className="mr-2 h-5 w-5" />
            {t('practice.confirmFinish')}
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="kinetic-primary-button h-14 w-full text-base hover:brightness-105"
          data-testid="practice-finish"
          data-tour="finish"
          onClick={() => setConfirmFinish(true)}
        >
          <Check className="mr-2 h-5 w-5" />
          {t('practice.finish')}
        </Button>
      )}

      {FEATURE_FLAGS.workoutTimers && rest && (
        <RestBar
          deadlineAt={rest.deadlineAt}
          totalSeconds={rest.totalSeconds}
          runId={rest.runId}
          exerciseLabel={restItem ? localizeExerciseName(restItem.exercise.name, lang) : ''}
          onSkip={() => setRest(null)}
          onAdjust={(delta) => setRest((prev) => (prev
            ? { ...prev, deadlineAt: prev.deadlineAt + delta * 1000, totalSeconds: Math.max(1, prev.totalSeconds + delta) }
            : prev))}
          onFinished={() => setRest(null)}
          onOpenSettings={() => undefined}
        />
      )}

      {/* Zamiana w próbie: zawsze zamontowany dialog (pułapka Radix: nie
          unmountuj otwartego), lista stała, plan usera nietknięty. */}
      <Dialog open={swapFor !== null} onOpenChange={(open) => { if (!open) setSwapFor(null); }}>
        <DialogContent className="max-w-sm" data-testid="practice-swap">
          <DialogHeader>
            <DialogTitle className="font-heading">{t('practice.swapTitle')}</DialogTitle>
            <DialogDescription>{t('practice.swapDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {PRACTICE_SWAP_OPTIONS.filter((name) => !items.some((i) => i.exercise.name === name)).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => swapTo(name)}
                className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl bg-surface-low px-3 text-left text-sm font-semibold hover:bg-surface-high"
              >
                <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {localizeExerciseName(name, lang)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {tourActive && (
        <AppTour
          steps={PRACTICE_TOUR_STEPS}
          checkedSets={checkedSets}
          onFirstSet={() => { void hapticSuccess(); }}
          onComplete={() => undefined}
          onSkip={() => appTour.finish('skipped')}
        />
      )}
    </div>
  );
};

const PracticeWorkout = () => (
  <PracticeWorkoutEffects>
    <PracticeWorkoutScreen />
  </PracticeWorkoutEffects>
);

export default PracticeWorkout;

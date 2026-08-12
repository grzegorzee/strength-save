import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trainingPlan as defaultPlan, type TrainingDay, type Exercise } from '@/data/trainingPlan';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek, type ScheduleOverrides } from '@/lib/plan-schedule';
import {
  buildScheduleMove,
  sanitizeScheduleOverrides,
  shouldClearOverridesOnPlanSave,
} from '@/lib/schedule-overrides';
import { useTranslation } from '@/contexts/LanguageContext';
import { swapExerciseIdentity } from '@/lib/exercise-swap';
import { resolvePlanDaysForSave, saveTrainingPlanWithRevision } from '@/lib/training-plan-save';
import { sanitizeProgressionConfig, type ProgressionConfig, type DeloadDecision } from '@/lib/progression-engine';
import { pruneSkippedDates, sanitizeSkippedDates } from '@/lib/skipped-days';
import { sanitizeTrainingPlanDays } from '@/lib/firestore-doc-guards';
import { reportClientError } from '@/lib/error-telemetry';
import { classifyWorkoutSyncError } from '@/lib/workout-sync-conflict';
import { trackTelemetryEvent } from '@/lib/app-telemetry';

const PLAN_COLLECTION = 'training_plans';

export const useTrainingPlan = (userId: string) => {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<TrainingDay[]>(defaultPlan);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [planDurationWeeks, setPlanDurationWeeks] = useState(12);
  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [planRevision, setPlanRevision] = useState(0);
  // Progresja programowa (Z119): null = pole nieustawione (stare plany, silnik wyłączony).
  const [progression, setProgression] = useState<ProgressionConfig | null>(null);
  // Z172: błąd snapshotu — plan usera ZOSTAJE w stanie (nie podmieniamy na default),
  // konsument może pokazać komunikat zamiast cudzego planu.
  const [planError, setPlanError] = useState(false);
  // Przełożenia treningów (spec 2026-08-11): mapa data -> dayId|null.
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverrides>({});
  // Runna p.1 (spec C1): daty jawnie pominięte ("tego nie zrobię"), per data.
  const [skippedDates, setSkippedDates] = useState<string[]>([]);

  // Subscribe to plan document using userId as doc ID
  useEffect(() => {
    // Brak userId (np. odświeżanie tokena): nie ma czego ładować → "puste, ale gotowe".
    // Inaczej isLoaded zostaje false i gate startu treningu wisi w spinnerze (#6).
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    // E2E mock (Z120/Z141): Firestore zablokowany, więc cały plan (days + meta)
    // żyje w localStorage. Subskrypcję snapshotów POMIJAMY — cache'owy snapshot
    // "exists=false" nadpisywałby dni z mocka defaultem chwilę po mouncie.
    if (import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true') {
      try {
        const raw = window.localStorage.getItem('fittracker_e2e_plan');
        if (raw) {
          const data = JSON.parse(raw) as { startDate?: string; progression?: unknown; days?: unknown; durationWeeks?: number; scheduleOverrides?: unknown; skippedDates?: unknown };
          if (data.startDate) setPlanStartDate(data.startDate);
          setProgression(sanitizeProgressionConfig(data.progression));
          if (data.durationWeeks) setPlanDurationWeeks(data.durationWeeks);
          setScheduleOverrides(sanitizeScheduleOverrides(data.scheduleOverrides));
          setSkippedDates(sanitizeSkippedDates(data.skippedDates));
          const days = data.days !== undefined ? sanitizeTrainingPlanDays(data.days) : null;
          if (days) {
            setPlan(days);
            setIsCustom(true);
          }
        }
      } catch { /* uszkodzony wpis e2e — zostaje default */ }
      setIsLoaded(true);
      return;
    }

    const docRef = doc(db, PLAN_COLLECTION, userId);

    const unsubscribe = onSnapshot(docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.days !== undefined) {
            // P0: uszkodzone days NIE nadpisują stanu (zostaje poprzedni dobry
            // plan lub default) — raport zamiast renderowania śmieci.
            const days = sanitizeTrainingPlanDays(data.days);
            if (days !== null) {
              setPlan(days);
              setIsCustom(true);
            } else {
              void reportClientError(userId, { code: 'invalid-doc', phase: 'other', detail: `training_plans/${userId}:days` });
            }
          }
          if (data.durationWeeks) setPlanDurationWeeks(data.durationWeeks);
          if (data.startDate) setPlanStartDate(data.startDate);
          setProgression(sanitizeProgressionConfig(data.progression));
          setScheduleOverrides(sanitizeScheduleOverrides(data.scheduleOverrides));
          setSkippedDates(sanitizeSkippedDates(data.skippedDates));
          setPlanRevision(typeof data.revision === 'number' ? Math.max(0, Math.floor(data.revision)) : 0);
        } else {
          // No custom plan, use default
          setPlan(defaultPlan);
          setIsCustom(false);
          setPlanRevision(0);
          setScheduleOverrides({});
          setSkippedDates([]);
        }
        setPlanError(false);
        setIsLoaded(true);
      },
      (err) => {
        console.error('Error fetching training plan:', err);
        // Z172: NIE podmieniamy planu na default — jeśli wcześniej doszedł dobry
        // snapshot, zostaje plan usera; jeśli nie, konsument widzi planError i sam
        // decyduje, co pokazać (Dashboard nie renderuje wtedy cudzego planu).
        setPlanError(true);
        setIsLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // Auto-repair: if custom plan exists but startDate is missing, recover it from workout history
  const repairAttempted = useRef(false);
  useEffect(() => {
    if (!isLoaded || !isCustom || planStartDate || !userId || repairAttempted.current) return;
    repairAttempted.current = true;

    const repair = async () => {
      try {
        // Find earliest workout for this user to determine plan start
        // No orderBy — avoids composite index mismatch (existing index is date DESC)
        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
        );
        const snap = await getDocs(q);
        let startDateStr: string;

        if (!snap.empty) {
          // Find earliest date in JS
          let earliest: string | null = null;
          snap.forEach(d => {
            const date = d.data().date as string;
            if (!earliest || date < earliest) earliest = date;
          });
          startDateStr = formatLocalDate(getStartOfPlanWeek(parseLocalDate(earliest!)));
        } else {
          // No workouts found - use current week's Monday
          startDateStr = formatLocalDate(getStartOfPlanWeek(new Date()));
        }

        console.log('[useTrainingPlan] Auto-repairing missing startDate:', startDateStr);
        await updateDoc(doc(db, PLAN_COLLECTION, userId), { startDate: startDateStr });
        setPlanStartDate(startDateStr);
      } catch (err) {
        console.error('[useTrainingPlan] Failed to auto-repair startDate:', err);
      }
    };

    repair();
  }, [isLoaded, isCustom, planStartDate, userId]);

  const currentWeek = useMemo(() => {
    if (!planStartDate) return 1;
    const start = getStartOfPlanWeek(parseLocalDate(planStartDate));
    const nowWeekStart = getStartOfPlanWeek(new Date());
    // Plan startujący w przyszłości: tydzień 0 (jeszcze nie ruszył) — nie liczy postępu.
    if (nowWeekStart.getTime() < start.getTime()) return 0;
    const diffMs = nowWeekStart.getTime() - start.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  }, [planStartDate]);

  const isPlanExpired = currentWeek > planDurationWeeks;
  const weeksRemaining = Math.max(0, planDurationWeeks - currentWeek);
  // False when the plan's start date is still in the future (plan hasn't begun yet).
  const planStarted = !planStartDate
    || getStartOfPlanWeek(new Date()).getTime() >= getStartOfPlanWeek(parseLocalDate(planStartDate)).getTime();

  const savePlan = useCallback(async (
    newPlan: TrainingDay[],
    options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean; progression?: ProgressionConfig },
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: t('err.noUserId') };
    // Zapis przed załadowaniem snapshotu nadpisałby istniejący plan domyślnym stanem
    // (durationWeeks=12, startDate=null) — czyli skasowałby custom plan i datę startu.
    if (!isLoaded) return { success: false, error: t('err.planNotLoaded') };
    // E2E mock (Z141): zapis planu do localStorage zamiast transakcji Firestore
    // (ten sam seam co saveDeloadDecision) — edycja planu testowalna bez backendu.
    if (import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true') {
      const nextDurationWeeks = options?.durationWeeks ?? planDurationWeeks;
      const nextStartDate = options?.startDate !== undefined ? options.startDate : planStartDate;
      const nextProgression = options?.progression !== undefined ? options.progression : progression;
      // Z151: ta gałąź omija saveTrainingPlanWithRevision, więc niezmiennik id dni
      // aktywnego cyklu egzekwujemy tu tak samo — cykle z seamu e2e.
      let alignedPlan = newPlan;
      if (options?.syncActiveCycle !== false) {
        try {
          const raw = window.localStorage.getItem('fittracker_e2e_cycles');
          const cycles = raw ? (JSON.parse(raw) as Array<{ status?: string; days?: TrainingDay[]; startDate?: string }>) : [];
          alignedPlan = resolvePlanDaysForSave(newPlan, cycles.filter(cycle => cycle.status === 'active'));
        } catch { /* noop */ }
      }
      // Przełożenia: zmiana zestawu dni czyści scheduleOverrides jak w transakcji
      // prod; edycja ćwiczeń je zachowuje (bez tego e2e zapis by je dropował).
      const nextOverrides = shouldClearOverridesOnPlanSave(plan, alignedPlan) ? {} : scheduleOverrides;
      try {
        window.localStorage.setItem('fittracker_e2e_plan', JSON.stringify({
          days: alignedPlan,
          durationWeeks: nextDurationWeeks,
          ...(nextStartDate ? { startDate: nextStartDate } : {}),
          ...(nextProgression ? { progression: nextProgression } : {}),
          ...(Object.keys(nextOverrides).length > 0 ? { scheduleOverrides: nextOverrides } : {}),
        }));
      } catch { /* noop */ }
      setPlan(alignedPlan);
      setIsCustom(true);
      setPlanDurationWeeks(nextDurationWeeks);
      setPlanStartDate(nextStartDate);
      setProgression(nextProgression ?? null);
      setScheduleOverrides(nextOverrides);
      return { success: true };
    }
    try {
      const nextDurationWeeks = options?.durationWeeks ?? planDurationWeeks;
      await saveTrainingPlanWithRevision(db, {
        userId,
        newPlan,
        expectedRevision: planRevision,
        durationWeeks: nextDurationWeeks,
        startDate: options?.startDate !== undefined ? options.startDate : planStartDate,
        syncActiveCycle: options?.syncActiveCycle,
        ...(options?.progression !== undefined ? { progression: options.progression } : {}),
      });

      trackTelemetryEvent(userId, 'action_plan_edited');
      return { success: true };
    } catch (err) {
      console.error('Error saving training plan:', err);
      // M19: transakcja zapisu planu wymaga sieci — offline dostaje ludzki
      // komunikat zamiast surowego błędu Firestore.
      if (classifyWorkoutSyncError(err) === 'offline') {
        return { success: false, error: t('err.planOffline') };
      }
      const errorMessage = err instanceof Error ? err.message : t('common.unknownError');
      return { success: false, error: errorMessage };
    }
  }, [userId, isLoaded, plan, scheduleOverrides, planDurationWeeks, planStartDate, planRevision, progression, t]);

  /**
   * Przełożenie treningu z daty na datę (spec 2026-08-11): jedna nowa mapa
   * scheduleOverrides (move {A: null, B: dayId} albo swap) w JEDNYM zapisie pola
   * (atomowość, LWW). Zapis offline-first: setDoc merge trafia od razu do lokalnej
   * kolejki Firestore (snapshot dostarcza stan bez sieci), promise potwierdza
   * dopiero serwer — nie blokujemy na nim wyniku.
   */
  const moveScheduledDay = useCallback(async (
    fromDateISO: string,
    toDateISO: string,
  ): Promise<{ success: boolean; swapped?: boolean }> => {
    if (!userId || !isLoaded) return { success: false };
    const move = buildScheduleMove({
      overrides: scheduleOverrides,
      planDays: plan,
      fromISO: fromDateISO,
      toISO: toDateISO,
      todayISO: formatLocalDate(new Date()),
    });
    if (!move.ok) return { success: false };
    if (import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true') {
      try {
        const raw = window.localStorage.getItem('fittracker_e2e_plan');
        const data = raw ? JSON.parse(raw) : {};
        window.localStorage.setItem('fittracker_e2e_plan', JSON.stringify({ ...data, scheduleOverrides: move.overrides }));
      } catch { /* noop */ }
      setScheduleOverrides(move.overrides);
      return { success: true, swapped: move.swapped };
    }
    setDoc(doc(db, PLAN_COLLECTION, userId), {
      scheduleOverrides: move.overrides,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => {
      console.error('Error saving schedule override:', err);
      void reportClientError(userId, { code: 'schedule-override-save', phase: 'other', detail: String(err) });
    });
    setScheduleOverrides(move.overrides);
    return { success: true, swapped: move.swapped };
  }, [userId, isLoaded, plan, scheduleOverrides]);

  /**
   * Runna p.1 (spec C1): jawne pominięcie/przywrócenie treningu danej daty.
   * Wzorzec moveScheduledDay: pole nadpisywane w całości (LWW), zapis
   * offline-first (setDoc merge), pruning 28 dni przy każdym zapisie.
   */
  const setDaySkipped = useCallback(async (
    dateISO: string,
    skipped: boolean,
  ): Promise<{ success: boolean }> => {
    if (!userId || !isLoaded) return { success: false };
    const todayISO = formatLocalDate(new Date());
    const pruned = pruneSkippedDates(skippedDates, todayISO);
    const next = skipped
      ? [...new Set([...pruned, dateISO])].sort()
      : pruned.filter((date) => date !== dateISO);
    if (import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true') {
      try {
        const raw = window.localStorage.getItem('fittracker_e2e_plan');
        const data = raw ? JSON.parse(raw) : {};
        window.localStorage.setItem('fittracker_e2e_plan', JSON.stringify({ ...data, skippedDates: next }));
      } catch { /* noop */ }
      setSkippedDates(next);
      return { success: true };
    }
    setDoc(doc(db, PLAN_COLLECTION, userId), {
      skippedDates: next,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => {
      console.error('Error saving skipped dates:', err);
      void reportClientError(userId, { code: 'skipped-dates-save', phase: 'other', detail: String(err) });
    });
    setSkippedDates(next);
    return { success: true };
  }, [userId, isLoaded, skippedDates]);

  const swapExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
    newName: string,
    newSets?: string,
    newVideoUrl?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return swapExerciseIdentity(
            ex,
            { name: newName, sets: newSets, videoUrl: newVideoUrl },
            day.exercises.map(e => e.id),
          );
        }),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const updateExerciseSets = useCallback(async (
    dayId: string,
    exerciseId: string,
    newSets: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, sets: newSets } : ex,
        ),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const removeExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.filter(ex => ex.id !== exerciseId),
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const addExercise = useCallback(async (
    dayId: string,
    exercise: Exercise,
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: [...day.exercises, exercise],
      };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const moveExercise = useCallback(async (
    dayId: string,
    exerciseId: string,
    direction: 'up' | 'down',
  ): Promise<{ success: boolean; error?: string }> => {
    const newPlan = plan.map(day => {
      if (day.id !== dayId) return day;
      const exercises = [...day.exercises];
      const idx = exercises.findIndex(e => e.id === exerciseId);
      if (idx < 0) return day;

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= exercises.length) return day;

      [exercises[idx], exercises[newIdx]] = [exercises[newIdx], exercises[idx]];
      return { ...day, exercises };
    });
    return savePlan(newPlan);
  }, [plan, savePlan]);

  const resetToDefault = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return savePlan(defaultPlan);
  }, [savePlan]);

  // Z121: decyzja deload usera ([Zastosuj]/[Pomiń]) — punktowy update pola progression,
  // bez podbijania rewizji planu (dni się nie zmieniają).
  const saveDeloadDecision = useCallback(async (
    weekIndex: number,
    decision: DeloadDecision,
  ): Promise<{ success: boolean }> => {
    if (!userId || !progression) return { success: false };
    const next: ProgressionConfig = {
      ...progression,
      deloadDecisions: { ...progression.deloadDecisions, [String(weekIndex)]: decision },
    };
    if (import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true') {
      try {
        const raw = window.localStorage.getItem('fittracker_e2e_plan');
        const data = raw ? JSON.parse(raw) : {};
        window.localStorage.setItem('fittracker_e2e_plan', JSON.stringify({ ...data, progression: next }));
      } catch { /* noop */ }
      setProgression(next);
      return { success: true };
    }
    try {
      await updateDoc(doc(db, PLAN_COLLECTION, userId), {
        progression: next,
        updatedAt: new Date().toISOString(),
      });
      setProgression(next);
      return { success: true };
    } catch (err) {
      console.error('Error saving deload decision:', err);
      return { success: false };
    }
  }, [userId, progression]);

  return {
    plan,
    isLoaded,
    planError,
    isCustom,
    scheduleOverrides,
    moveScheduledDay,
    skippedDates,
    setDaySkipped,
    planDurationWeeks,
    planStartDate,
    progression,
    currentWeek,
    isPlanExpired,
    weeksRemaining,
    planStarted,
    savePlan,
    saveDeloadDecision,
    swapExercise,
    updateExerciseSets,
    removeExercise,
    addExercise,
    moveExercise,
    resetToDefault,
  };
};

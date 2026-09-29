import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { persistAppTourOutcome } from '@/lib/app-tour-sync';
import {
  isDesktopViewport,
  isLegacyTourSeen,
  readLocalAppTour,
  resolveAppTourStage,
  writeLocalAppTour,
  type AppTourOutcome,
  type AppTourStage,
  type AppTourStepId,
  type LocalAppTourState,
} from '@/lib/first-workout-tour';

export interface AppTourController {
  /** Aktywny etap albo null (przewodnik nie dotyczy tego konta/urządzenia). */
  stage: AppTourStage | null;
  /** Zapamiętany krok etapu workout (powrót do treningu w połowie). */
  step: AppTourStepId | undefined;
  advance: (stage: AppTourStage, step?: AppTourStepId) => void;
  rememberStep: (step: AppTourStepId) => void;
  finish: (outcome: AppTourOutcome) => void;
}

/** Odtworzenie przewodnika z Profilu: etap dashboard, bez warunku treningów. */
export const startAppTourReplay = (uid: string): void => {
  writeLocalAppTour(uid, { stage: 'dashboard', replay: true });
};

/**
 * Stan przewodnika dla bieżącego konta. `completedCount` null = dane się
 * ładują (przewodnik nie startuje, dopóki nie wiadomo, że konto jest nowe).
 */
export const useAppTour = (completedCount: number | null): AppTourController => {
  const { uid, profile } = useCurrentUser();
  const [local, setLocal] = useState<LocalAppTourState | null>(() => readLocalAppTour(uid));
  const cloud = profile?.preferences?.appTour ?? null;

  useEffect(() => {
    setLocal(readLocalAppTour(uid));
  }, [uid]);

  const update = useCallback((next: LocalAppTourState) => {
    writeLocalAppTour(uid, next);
    setLocal(next);
  }, [uid]);

  const sync = useCallback((outcome: AppTourOutcome) => {
    void persistAppTourOutcome(uid, outcome).then((ok) => {
      if (!ok) return;
      const current = readLocalAppTour(uid);
      if (current?.stage === 'done' && current.pendingSync) {
        writeLocalAppTour(uid, { stage: 'done', outcome: current.outcome ?? outcome });
      }
    });
  }, [uid]);

  // Zakończenie offline: ponów zapis przy następnym montażu (chmura jeszcze nie wie).
  useEffect(() => {
    if (local?.stage === 'done' && local.pendingSync && !cloud) sync(local.outcome ?? 'done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const stage = useMemo(() => resolveAppTourStage({
    cloud: local?.replay ? null : cloud,
    local,
    legacySeen: isLegacyTourSeen(),
    completedCount,
    isDesktop: isDesktopViewport(),
  }), [cloud, local, completedCount]);

  const advance = useCallback((nextStage: AppTourStage, step?: AppTourStepId) => {
    update({ ...(local ?? {}), stage: nextStage, ...(step ? { step } : { step: undefined }) });
  }, [local, update]);

  const rememberStep = useCallback((step: AppTourStepId) => {
    if (!local && stage === null) return;
    const current = readLocalAppTour(uid) ?? { stage: stage ?? 'workout' };
    if (current.step === step) return;
    update({ ...current, step });
  }, [local, stage, uid, update]);

  const finish = useCallback((outcome: AppTourOutcome) => {
    if (local?.stage === 'done') return;
    update({ stage: 'done', outcome, pendingSync: true });
    sync(outcome);
  }, [local, sync, update]);

  return { stage, step: local?.step, advance, rememberStep, finish };
};

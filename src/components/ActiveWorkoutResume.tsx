// Auto-resume aktywnego treningu (Z49): po zimnym starcie apki i po powrocie z tła
// user ląduje z powrotem w treningu, jeśli draft jest żywy (decyzja: workout-resume.ts).
// Guard: resume odpala się MAKSYMALNIE raz na mount i raz per przejście background->active,
// żeby nie walczyć z nawigacją usera (świadome wyjście z treningu = nie wracamy).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/UserContext';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { continuableDraftTarget, isDraftContinuableToday, shouldResumeWorkoutDraft } from '@/lib/workout-resume';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { addRestNotificationTapListener } from '@/lib/rest-notification';
import { formatLocalDate } from '@/lib/utils';

export const ActiveWorkoutResume = () => {
  const { uid } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const locationRef = useRef(location);
  locationRef.current = location;
  const mountResumeDone = useRef(false);

  useEffect(() => {
    if (!uid) return;

    const tryResume = async () => {
      const draft = await workoutDraftDb.loadActiveDraft(uid);
      const decision = shouldResumeWorkoutDraft(draft, formatLocalDate(new Date()), Date.now());
      if (!decision.resume) return;
      if (locationRef.current.pathname.startsWith('/workout/')) return;
      trackTelemetryEvent(uid, 'workout_auto_resume');
      navigateRef.current(decision.target);
    };

    // Bug 53 (X30): tap w powiadomienie "Koniec przerwy" = jawna intencja
    // powrotu do treningu. Reguła ŁAGODNIEJSZA niż auto-resume (jak karta
    // Dashboardu): każdy nieukończony dzisiejszy draft, także zsynchronizowany
    // (po checkpoincie przy wyjściu w tło dirty=false, auto-resume odmawia).
    const continueFromRestNotification = async () => {
      const draft = await workoutDraftDb.loadActiveDraft(uid);
      if (!isDraftContinuableToday(draft, formatLocalDate(new Date()))) return;
      if (locationRef.current.pathname.startsWith('/workout/')) return;
      navigateRef.current(continuableDraftTarget(draft));
    };

    if (!mountResumeDone.current) {
      mountResumeDone.current = true;
      void tryResume();
    }

    let wasActive = true;
    const removeListener = addAppStateListener((isActive) => {
      if (isActive && !wasActive) {
        void tryResume();
      }
      wasActive = isActive;
    });
    const removeTapListener = addRestNotificationTapListener(() => {
      void continueFromRestNotification();
    });
    return () => {
      removeListener();
      removeTapListener();
    };
  }, [uid]);

  return null;
};

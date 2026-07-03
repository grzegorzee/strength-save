// Auto-resume aktywnego treningu (Z49): po zimnym starcie apki i po powrocie z tła
// user ląduje z powrotem w treningu, jeśli draft jest żywy (decyzja: workout-resume.ts).
// Guard: resume odpala się MAKSYMALNIE raz na mount i raz per przejście background->active,
// żeby nie walczyć z nawigacją usera (świadome wyjście z treningu = nie wracamy).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/UserContext';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { shouldResumeWorkoutDraft } from '@/lib/workout-resume';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { addAppStateListener } from '@/lib/app-lifecycle';
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
    return removeListener;
  }, [uid]);

  return null;
};

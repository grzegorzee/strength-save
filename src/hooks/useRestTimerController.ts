import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelRestEndNotification } from '@/lib/rest-notification';

// Z143 (X18B): JEDEN timer przerwy na sesję. Stan przerwy mieszka w WorkoutDay
// (właściciel), nie w ExerciseCard — dwie karty nie mogą już odliczać równolegle,
// a odhaczenie serii w B przejmuje przerwę biegnącą w A.
// Tykanie ZOSTAJE w RestBar (twarda zasada 2, re-render bomba R2-07): ten stan
// zmienia się wyłącznie przy starcie / przejęciu / korekcie / skipie / końcu przerwy.
//
// Z188: kontroler jest ŹRÓDŁEM PRAWDY o deadline (RestBar czysto prezentacyjny)
// i persystuje stan w localStorage — kill apki w środku przerwy nie gubi
// odliczania: resumeFromStorage() po mouncie sesji przywraca realny czas.

export interface RestRunState {
  exerciseId: string;
  /** Epoch ms końca przerwy. */
  deadlineAt: number;
  /** Pełna długość bieżącej przerwy w sekundach — do paska postępu. */
  totalSeconds: number;
  runId: number;
}

export const REST_STATE_STORAGE_KEY = 'fittracker_rest_state_v1';

// Bug 52 (X30): wpis niesie tożsamość sesji jako scope (dayId:date — stabilne
// przez promocję provisional->remote, w przeciwieństwie do sessionId; pułapka
// znana z klucza scrolla, CLAUDE.md zasada 1). resumeFromStorage przywraca
// przerwę tylko we WŁASNEJ sesji; obcy/stary wpis jest czyszczony.
const persistRestState = (state: RestRunState, scope: string | null): void => {
  try {
    localStorage.setItem(REST_STATE_STORAGE_KEY, JSON.stringify({
      exerciseId: state.exerciseId,
      deadlineAt: state.deadlineAt,
      totalSeconds: state.totalSeconds,
      ...(scope !== null && { scope }),
    }));
  } catch { /* localStorage niedostępne — przerwa po prostu nie przeżyje killa */ }
};

const clearPersistedRestState = (): void => {
  try {
    localStorage.removeItem(REST_STATE_STORAGE_KEY);
  } catch { /* jak wyżej */ }
};

export const useRestTimerController = (scopeKey?: string | null) => {
  const [restState, setRestState] = useState<RestRunState | null>(null);
  // Monotoniczny licznik w ref: runId NIGDY nie wraca do starej wartości, więc
  // RestBar zamontowany w tej samej karcie zawsze dostaje zmianę i restartuje.
  const runIdRef = useRef(0);
  // Bug 52 (X30): tożsamość sesji dla persystencji (dayId:date w WorkoutDay).
  const scopeRef = useRef<string | null>(scopeKey ?? null);
  scopeRef.current = scopeKey ?? null;

  const startRest = useCallback((exerciseId: string, seconds: number) => {
    runIdRef.current += 1;
    const next: RestRunState = {
      exerciseId,
      deadlineAt: Date.now() + seconds * 1000,
      totalSeconds: seconds,
      runId: runIdRef.current,
    };
    setRestState(next);
    persistRestState(next, scopeRef.current);
  }, []);

  // Korekta ±15 s: deadline nie schodzi poniżej "teraz" (nigdy ujemny czas),
  // totalSeconds idzie za zmianą, żeby pasek postępu nie kłamał. runId BEZ zmian —
  // to ta sama przerwa, nie nowa.
  const adjustRest = useCallback((deltaSeconds: number) => {
    setRestState((current) => {
      if (!current) return current;
      const next: RestRunState = {
        ...current,
        deadlineAt: Math.max(Date.now(), current.deadlineAt + deltaSeconds * 1000),
        totalSeconds: Math.max(1, current.totalSeconds + deltaSeconds),
      };
      persistRestState(next, scopeRef.current);
      return next;
    });
  }, []);

  const stopRest = useCallback(() => {
    setRestState(null);
    clearPersistedRestState();
  }, []);

  // Z188: przywrócenie przerwy po kill/zimnym starcie. Deadline w przeszłości =
  // przerwa już się skończyła (sygnał dostarczyła notyfikacja systemowa) —
  // czyścimy wpis i anulujemy ewentualną wiszącą notyfikację.
  const resumeFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(REST_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as (Partial<RestRunState> & { scope?: unknown }) | null;
      if (!parsed
        || typeof parsed.exerciseId !== 'string' || parsed.exerciseId.length === 0
        || typeof parsed.deadlineAt !== 'number' || !Number.isFinite(parsed.deadlineAt)
        || typeof parsed.totalSeconds !== 'number' || !Number.isFinite(parsed.totalSeconds)) {
        clearPersistedRestState();
        return;
      }
      // Bug 52 (X30): wpis innej sesji (albo w starym formacie bez scope) nie
      // jest przywracany w obcym treningu — czyścimy go razem z wiszącą
      // notyfikacją, zamiast pokazywać pasek z pustą etykietą.
      const storedScope = typeof parsed.scope === 'string' ? parsed.scope : null;
      if (storedScope !== scopeRef.current) {
        clearPersistedRestState();
        void cancelRestEndNotification();
        return;
      }
      if (parsed.deadlineAt <= Date.now()) {
        clearPersistedRestState();
        void cancelRestEndNotification();
        return;
      }
      runIdRef.current += 1;
      setRestState({
        exerciseId: parsed.exerciseId,
        deadlineAt: parsed.deadlineAt,
        totalSeconds: Math.max(1, Math.round(parsed.totalSeconds)),
        runId: runIdRef.current,
      });
    } catch {
      clearPersistedRestState();
    }
  }, []);

  // Z189: watchdog samonaprawy. Koniec przerwy w foregroundzie zeruje stan przez
  // RestBar → onFinished, ale gdy pasek zniknie inaczej (błąd renderu, unmount),
  // stan mógłby wisieć wiecznie. Deadline przekroczony o >3 s = nikt nie posprzątał:
  // gasimy stan, czyścimy localStorage i anulujemy wiszącą notyfikację.
  useEffect(() => {
    if (!restState) return;
    const id = setInterval(() => {
      if (Date.now() - restState.deadlineAt > 3000) {
        setRestState(null);
        clearPersistedRestState();
        void cancelRestEndNotification();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [restState]);

  return { restState, startRest, adjustRest, stopRest, resumeFromStorage };
};

import { useCallback, useRef, useState } from 'react';

// Z143 (X18B): JEDEN timer przerwy na sesję. Stan przerwy mieszka w WorkoutDay
// (właściciel), nie w ExerciseCard — dwie karty nie mogą już odliczać równolegle,
// a odhaczenie serii w B przejmuje przerwę biegnącą w A.
// Tykanie ZOSTAJE w RestBar (twarda zasada 2, re-render bomba R2-07): ten stan
// zmienia się wyłącznie przy starcie / przejęciu / skipie / końcu przerwy.

export interface RestRunState {
  exerciseId: string;
  seconds: number;
  runId: number;
}

export const useRestTimerController = () => {
  const [restState, setRestState] = useState<RestRunState | null>(null);
  // Monotoniczny licznik w ref: runId NIGDY nie wraca do starej wartości, więc
  // RestBar zamontowany w tej samej karcie zawsze dostaje zmianę i restartuje.
  const runIdRef = useRef(0);

  const startRest = useCallback((exerciseId: string, seconds: number) => {
    runIdRef.current += 1;
    setRestState({ exerciseId, seconds, runId: runIdRef.current });
  }, []);

  const stopRest = useCallback(() => {
    setRestState(null);
  }, []);

  return { restState, startRest, stopRest };
};

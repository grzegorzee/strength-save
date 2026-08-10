import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { sanitizeAggregateTotals, type AllTimeAggregateTotals } from '@/lib/workout-aggregate-client';

// Z216: lazy backfill — user sprzed wdrożenia agregatu nie ma dokumentu, dopóki
// nie zapisze treningu (trigger). Jedno wywołanie rebuildu dziennie per uid
// (guard localStorage) domyka lukę bez spamowania backendu.
const BACKFILL_GUARD_KEY = 'strength-save:aggregate-backfill-v1';

const shouldRequestBackfill = (userId: string): boolean => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(BACKFILL_GUARD_KEY);
    if (raw === `${userId}:${today}`) return false;
    localStorage.setItem(BACKFILL_GUARD_KEY, `${userId}:${today}`);
    return true;
  } catch {
    return false; // brak localStorage = nie ryzykujemy pętli wywołań
  }
};

// Z217: agregat all-time dla kafli Dashboardu. Jeden mały dokument zamiast
// liczenia z okna 500 treningów; brak dokumentu / zły kształt => null =>
// wywołujący używa lokalnego fallbacku (obecne obliczenia).
export const useWorkoutAggregate = (userId: string): AllTimeAggregateTotals | null => {
  const [totals, setTotals] = useState<AllTimeAggregateTotals | null>(null);

  useEffect(() => {
    setTotals(null);
    if (!userId || import.meta.env.VITE_E2E_MODE === 'true') return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'aggregates', 'allTime'),
      (snapshot) => {
        if (!snapshot.exists()) {
          setTotals(null);
          if (!snapshot.metadata.fromCache && shouldRequestBackfill(userId)) {
            // Best-effort: po sukcesie snapshot przyjdzie sam; błąd = zostaje fallback.
            void httpsCallable(functions, 'rebuildWorkoutAggregate')({}).catch(() => undefined);
          }
          return;
        }
        setTotals(sanitizeAggregateTotals(snapshot.data()));
      },
      () => setTotals(null), // odczyt bez uprawnień/offline: fallback lokalny
    );
    return () => unsubscribe();
  }, [userId]);

  return totals;
};

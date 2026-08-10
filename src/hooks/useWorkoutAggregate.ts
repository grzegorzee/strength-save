import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeAggregateTotals, type AllTimeAggregateTotals } from '@/lib/workout-aggregate-client';

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
        setTotals(snapshot.exists() ? sanitizeAggregateTotals(snapshot.data()) : null);
      },
      () => setTotals(null), // odczyt bez uprawnień/offline: fallback lokalny
    );
    return () => unsubscribe();
  }, [userId]);

  return totals;
};

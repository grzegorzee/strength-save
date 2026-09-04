import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { sanitizeAggregate, type AllTimeAggregate } from '@/lib/workout-aggregate-client';

// Z216: lazy backfill — user sprzed wdrożenia agregatu nie ma dokumentu, dopóki
// nie zapisze treningu (trigger). Sukces zapisujemy raz dziennie per uid;
// nieudana próba nie blokuje retry po kolejnym snapshotcie/otwarciu ekranu.
const BACKFILL_GUARD_KEY = 'strength-save:aggregate-backfill-v2';
const backfillsInFlight = new Set<string>();

const backfillSucceededToday = (userId: string): boolean => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(BACKFILL_GUARD_KEY) === `${userId}:${today}`;
  } catch {
    return false;
  }
};

const markBackfillSucceeded = (userId: string): void => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(BACKFILL_GUARD_KEY, `${userId}:${today}`);
  } catch {
    // In-flight guard nadal zapobiega równoległym wywołaniom bez localStorage.
  }
};

const requestBackfill = (userId: string): void => {
  if (backfillsInFlight.has(userId) || backfillSucceededToday(userId)) return;
  backfillsInFlight.add(userId);
  void httpsCallable(functions, 'rebuildWorkoutAggregate')({})
    .then(() => markBackfillSucceeded(userId))
    .catch(() => undefined)
    .finally(() => backfillsInFlight.delete(userId));
};

// Z217: agregat all-time dla kafli Dashboardu. Jeden mały dokument zamiast
// liczenia z okna 500 treningów; brak dokumentu / zły kształt => null =>
// wywołujący używa lokalnego fallbacku (obecne obliczenia).
export const useWorkoutAggregate = (userId: string): AllTimeAggregate | null => {
  const [aggregate, setAggregate] = useState<AllTimeAggregate | null>(null);

  useEffect(() => {
    setAggregate(null);
    if (!userId || import.meta.env.VITE_E2E_MODE === 'true') return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'aggregates', 'allTime'),
      (snapshot) => {
        if (!snapshot.exists()) {
          setAggregate(null);
          if (!snapshot.metadata.fromCache) requestBackfill(userId);
          return;
        }
        const next = sanitizeAggregate(snapshot.data());
        setAggregate(next);
        // Stary schemaVersion ma inną definicję ukończonego treningu. Tak jak
        // brak dokumentu wymaga bezpiecznego, idempotentnego rebuildu v2.
        if (next === null && !snapshot.metadata.fromCache) requestBackfill(userId);
      },
      () => setAggregate(null), // odczyt bez uprawnień/offline: fallback lokalny
    );
    return () => unsubscribe();
  }, [userId]);

  return aggregate;
};

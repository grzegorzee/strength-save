import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WeeklySummary } from '@/lib/weekly-summary';

// Tylko odczyt historycznych podsumowań — generowanie raportów usunięte z UI
// (przycisk "Generate now" + auto-generacja), dane w weekly_summaries zostają.
export const useWeeklySummary = (userId: string) => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);

  // Listen to summaries (no orderBy — avoids composite index requirement)
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'weekly_summaries'),
      where('userId', '==', userId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as WeeklySummary))
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)); // sort client-side
      setSummaries(docs);
    }, (err) => {
      console.error('Weekly summaries listener error:', err);
    });

    return unsubscribe;
  }, [userId]);

  return { summaries };
};

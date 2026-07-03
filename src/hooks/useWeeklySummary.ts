import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WeeklySummary } from '@/lib/weekly-summary';

// Tylko odczyt historycznych podsumowań — generowanie raportów usunięte z UI
// (przycisk "Generate now" + auto-generacja), dane w weekly_summaries zostają.
const WEEKLY_SUMMARIES_LISTENER_LIMIT = 26;

export const useWeeklySummary = (userId: string) => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);

  // Listen to summaries (no orderBy — avoids composite index requirement)
  useEffect(() => {
    if (!userId) return;

    // Limit (Z55): czapka kosztowa. Kolekcja jest zamrożona (generator usunięty w R2),
    // więc limit nie wybiera "najnowszych" — po prostu ogranicza odczyt legacy danych.
    const q = query(
      collection(db, 'weekly_summaries'),
      where('userId', '==', userId),
      limit(WEEKLY_SUMMARIES_LISTENER_LIMIT),
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

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import type { StravaActivity, StravaConnection } from '@/types/strava';

const STRAVA_ACTIVITIES_COLLECTION = 'strava_activities';

export const useStrava = (userId: string) => {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [connection, setConnection] = useState<StravaConnection>({ connected: false });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Strava activities
  useEffect(() => {
    if (!userId) return;

    const activitiesQuery = query(
      collection(db, STRAVA_ACTIVITIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(activitiesQuery,
      (snapshot) => {
        const data: StravaActivity[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as StravaActivity);
        });
        setActivities(data);
      },
      (err) => {
        console.error('Error fetching Strava activities:', err);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to user's Strava connection status
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConnection({
          connected: data.stravaConnected || false,
          athleteId: data.stravaAthleteId,
          athleteName: data.stravaAthleteName,
          lastSync: data.stravaLastSync,
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const connectStrava = useCallback(async () => {
    setError(null);
    try {
      const functions = getFunctions();
      const getAuthUrl = httpsCallable(functions, 'stravaAuthUrl');
      const result = await getAuthUrl({ userId });
      const data = result.data as { url: string };
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się połączyć ze Stravą';
      setError(message);
    }
  }, [userId]);

  const syncActivities = useCallback(async () => {
    setError(null);
    setIsSyncing(true);
    try {
      const functions = getFunctions();
      const sync = httpsCallable(functions, 'stravaSync');
      const result = await sync({ userId });
      const data = result.data as { synced: number };
      return data.synced;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd synchronizacji';
      setError(message);
      return 0;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const disconnectStrava = useCallback(async () => {
    setError(null);
    try {
      await updateDoc(doc(db, 'users', userId), {
        stravaConnected: false,
        stravaTokens: null,
        stravaAthleteId: null,
        stravaAthleteName: null,
      });
      setConnection({ connected: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd rozłączenia';
      setError(message);
    }
  }, [userId]);

  return {
    activities,
    connection,
    isSyncing,
    error,
    connectStrava,
    syncActivities,
    disconnectStrava,
  };
};

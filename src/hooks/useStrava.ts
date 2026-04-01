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

const EMPTY_ACTIVITIES: StravaActivity[] = [];
const EMPTY_CONNECTION: StravaConnection = { connected: false };
const noop = async () => ({ ok: false as const, message: 'Strava disabled' });

export const useStrava = (userId: string, enabled: boolean = true) => {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connection, setConnection] = useState<StravaConnection>({ connected: false });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Strava activities
  useEffect(() => {
    if (!userId || !enabled) return;

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
        console.log(`[Strava] Activities loaded: ${data.length}`);
        setActivities(data);
        setIsLoaded(true);
      },
      (err) => {
        console.error('[Strava] Activities query failed:', err.code, err.message);
        if (err.code === 'failed-precondition') {
          setError('Brak indeksu Firestore — sprawdź konsolę Firebase.');
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to user's Strava connection status
  useEffect(() => {
    if (!userId || !enabled) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const conn: StravaConnection = {
          connected: data.stravaConnected || false,
          athleteId: data.stravaAthleteId,
          athleteName: data.stravaAthleteName,
          lastSync: data.stravaLastSync,
          estimatedMaxHR: data.estimatedMaxHR || undefined,
          maxHRManualOverride: data.maxHRManualOverride || false,
        };
        console.log('[Strava] Connection status:', conn.connected ? `connected (${conn.athleteName})` : 'disconnected');
        setConnection(conn);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const connectStrava = useCallback(async () => {
    setError(null);
    console.log('[Strava] Requesting auth URL...');
    try {
      const functions = getFunctions();
      const getAuthUrl = httpsCallable(functions, 'stravaAuthUrl');
      const result = await getAuthUrl({ userId });
      const data = result.data as { url: string };
      console.log('[Strava] Redirecting to Strava OAuth');
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się połączyć ze Stravą';
      console.error('[Strava] Connect failed:', message);
      setError(message);
    }
  }, [userId]);

  const syncActivities = useCallback(async (fullSync = false): Promise<
    | { ok: true; synced: number; totalFetched: number; alreadyExisted: number; lookbackDays: number }
    | { ok: false; message: string }
  > => {
    setError(null);
    setIsSyncing(true);
    console.log(`[Strava] Manual sync started (fullSync=${fullSync})...`);
    try {
      const functions = getFunctions();
      const sync = httpsCallable(functions, 'stravaSync');
      const result = await sync({ userId, fullSync });
      const data = result.data as {
        synced: number;
        totalFetched: number;
        alreadyExisted: number;
        lookbackDays: number;
      };
      console.log(`[Strava] Sync OK: ${data.synced} new, ${data.alreadyExisted} existed, ${data.totalFetched} total (lookback: ${data.lookbackDays}d)`);
      return { ok: true, ...data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd synchronizacji';
      console.error('[Strava] Sync failed:', message);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const disconnectStrava = useCallback(async () => {
    setError(null);
    console.log('[Strava] Disconnecting...');
    try {
      // Clear all Strava data from user doc (including stravaLastSync!)
      // strava_activities cleanup happens server-side in stravaCallback on reconnect
      await updateDoc(doc(db, 'users', userId), {
        stravaConnected: false,
        stravaTokens: null,
        stravaAthleteId: null,
        stravaAthleteName: null,
        stravaLastSync: null,
        estimatedMaxHR: null,
        maxHRManualOverride: null,
      });

      console.log('[Strava] Disconnected OK');
      setConnection({ connected: false });
      setActivities([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd rozłączenia';
      console.error('[Strava] Disconnect failed:', message);
      setError(message);
    }
  }, [userId]);

  if (!enabled) {
    return {
      activities: EMPTY_ACTIVITIES,
      isLoaded: true,
      connection: EMPTY_CONNECTION,
      isSyncing: false,
      error: null,
      connectStrava: noop,
      syncActivities: noop as () => ReturnType<typeof syncActivities>,
      disconnectStrava: noop,
    };
  }

  return {
    activities,
    isLoaded,
    connection,
    isSyncing,
    error,
    connectStrava,
    syncActivities,
    disconnectStrava,
  };
};

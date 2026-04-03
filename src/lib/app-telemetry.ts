import { doc, increment, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TELEMETRY_STORAGE_KEY_PREFIX = 'fittracker_telemetry_v1';
const TELEMETRY_COLLECTION = 'app_telemetry_daily';

export type TelemetryEventName =
  | 'provisional_session_started'
  | 'provisional_session_promoted'
  | 'draft_recovered'
  | 'local_save_failed'
  | 'sync_retry_manual'
  | 'sync_retry_batch'
  | 'sync_success'
  | 'sync_failure'
  | 'final_sync_pending'
  | 'sync_queue_enqueued';

type PendingTelemetry = Record<string, Record<TelemetryEventName, number>>;

const getStorageKey = (userId: string) => `${TELEMETRY_STORAGE_KEY_PREFIX}_${userId}`;

const readPendingTelemetry = (userId: string): PendingTelemetry => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as PendingTelemetry : {};
  } catch {
    return {};
  }
};

const writePendingTelemetry = (userId: string, pending: PendingTelemetry) => {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(pending));
};

const getDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const trackTelemetryEvent = (userId: string, eventName: TelemetryEventName, count = 1) => {
  if (!userId || count <= 0) return;
  const dateKey = getDateKey();
  const pending = readPendingTelemetry(userId);
  const existing = pending[dateKey] ?? {};
  pending[dateKey] = {
    ...existing,
    [eventName]: ((existing[eventName] as number | undefined) ?? 0) + count,
  };
  writePendingTelemetry(userId, pending);
};

export const flushTelemetryEvents = async (userId: string) => {
  if (!userId || !navigator.onLine) return;

  const pending = readPendingTelemetry(userId);
  const dateEntries = Object.entries(pending);
  if (dateEntries.length === 0) return;

  const successfullyFlushed: string[] = [];

  for (const [dateKey, counters] of dateEntries) {
    const increments = Object.entries(counters).reduce<Record<string, ReturnType<typeof increment>>>((acc, [eventName, value]) => {
      if (typeof value === 'number' && value > 0) {
        acc[`counters.${eventName}`] = increment(value);
      }
      return acc;
    }, {});

    if (Object.keys(increments).length === 0) {
      successfullyFlushed.push(dateKey);
      continue;
    }

    try {
      await setDoc(doc(db, TELEMETRY_COLLECTION, `${userId}-${dateKey}`), {
        userId,
        date: dateKey,
        updatedAt: new Date().toISOString(),
        ...increments,
      }, { merge: true });
      successfullyFlushed.push(dateKey);
    } catch {
      // Keep counters locally and retry later.
    }
  }

  if (successfullyFlushed.length === 0) return;

  const nextPending = { ...pending };
  successfullyFlushed.forEach((dateKey) => {
    delete nextPending[dateKey];
  });
  writePendingTelemetry(userId, nextPending);
};

export const getPendingTelemetrySnapshot = (userId: string) => readPendingTelemetry(userId);

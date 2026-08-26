// B-T6: prawdziwy inbox zdarzeń. Serwer (kolekcja `user_events`) jest źródłem
// prawdy między urządzeniami; offline cache daje persistence SDK Firestore.
// Idempotencja przez DETERMINISTYCZNY id dokumentu: telefon, Watch, Garmin,
// drugi telefon, późny sync i edycja historii produkują ten sam klucz, więc
// powstaje dokładnie jedno zdarzenie. Powtórna emisja to update spoza `readAt`,
// który rules odrzucają — oryginał (createdAt, readAt) zostaje nietknięty.
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const USER_EVENTS_SCHEMA_VERSION = 1;
export const USER_EVENTS_QUERY_LIMIT = 50;

// T15: 'announcement' (ogłoszenie od twórcy) tworzy WYŁĄCZNIE backend (Admin SDK,
// mirror adminSendPush); klient je tylko czyta. Rules ograniczają create klienta
// do pozostałych typów, dlatego nie ma tu helpera klucza announcement.
// WP-C (X38): 'sync' = trening doniesiony do chmury po odroczonym zapisie
// (zakończony offline). Klient tworzy, rules dopuszczają.
export type UserEventType = 'pr' | 'badge' | 'week' | 'plan' | 'announcement' | 'sync';

export type UserEventPayload = Record<string, string | number | boolean | null>;

export interface UserEvent {
  v: typeof USER_EVENTS_SCHEMA_VERSION;
  userId: string;
  type: UserEventType;
  /** Semantyczny klucz idempotencji (id dokumentu = `${userId}-${key}`). */
  key: string;
  payload: UserEventPayload;
  deepLink: string | null;
  createdAt: number;
  readAt: number | null;
}

export const userEventDocId = (userId: string, key: string): string => `${userId}-${key}`;

// Klucze semantyczne. dayId+date zamiast id sesji: promocja provisional->remote
// nie zmienia klucza, a wszystkie urządzenia widzą ten sam dzień planu.
export const prEventKey = (dayId: string, date: string, exerciseId: string, prType: string): string =>
  `pr-${dayId}-${date}-${exerciseId}-${prType}`;

/** Kamienie milowe są życiowe (kategoria+próg), więc klucz jest globalny per konto. */
export const badgeEventKey = (category: string, threshold: number): string =>
  `badge-${category}-${threshold}`;

export const weekEventKey = (weekStartISO: string): string => `week-${weekStartISO}`;

export const planEventKey = (action: 'started' | 'changed' | 'ended', ref: string): string =>
  `plan-${action}-${ref}`;

/** WP-C (X38): jeden wpis per dzień planu i data (promocja provisional nie zmienia klucza). */
export const syncEventKey = (dayId: string, date: string): string => `sync-${dayId}-${date}`;

export interface EmitUserEventInput {
  type: UserEventType;
  key: string;
  payload: UserEventPayload;
  deepLink?: string | null;
  createdAt?: number;
}

/**
 * Best-effort producer (jak stary lokalny inbox): odrzucenie powtórnej emisji
 * przez rules ani brak sieci nie mogą wywrócić przepływu treningu.
 */
export const emitUserEvent = async (userId: string, input: EmitUserEventInput): Promise<void> => {
  try {
    const ref = doc(db, 'user_events', userEventDocId(userId, input.key));
    const event: UserEvent = {
      v: USER_EVENTS_SCHEMA_VERSION,
      userId,
      type: input.type,
      key: input.key,
      payload: input.payload,
      deepLink: input.deepLink ?? null,
      createdAt: input.createdAt ?? Date.now(),
      readAt: null,
    };
    await setDoc(ref, event);
  } catch {
    // Duplikat (rules: update tylko readAt) albo offline-edge — zdarzenie już
    // istnieje lub dojdzie z innego urządzenia; nie przerywamy przepływu.
  }
};

/** Producent zdarzeń planu do wstrzyknięcia w cycle-actions (deps-injection,
 *  żeby cycle-actions nie importował Firebase — pułapka transitive import). */
export const buildPlanEventEmitter = (userId: string) =>
  (action: 'started' | 'changed' | 'ended', info: { days: number; weeks: number; startDate: string }): void => {
    void emitUserEvent(userId, {
      type: 'plan',
      key: planEventKey(action, info.startDate),
      payload: { action, days: info.days, weeks: info.weeks, startDate: info.startDate },
      deepLink: '/plan',
    });
  };

/** Subskrypcja inboxa (serwer + cache offline SDK). Zwraca unsubscribe. */
export const subscribeUserEvents = (
  userId: string,
  onEvents: (events: UserEvent[]) => void,
): (() => void) => {
  const q = query(
    collection(db, 'user_events'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(USER_EVENTS_QUERY_LIMIT),
  );
  return onSnapshot(q, (snapshot) => {
    const events: UserEvent[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserEvent;
      if (data && data.v === USER_EVENTS_SCHEMA_VERSION) events.push(data);
    });
    onEvents(events);
  }, () => {
    // Błąd subskrypcji (np. brak indeksu w środowisku dev) nie wywraca UI.
    onEvents([]);
  });
};

export const countUnreadUserEvents = (events: UserEvent[]): number =>
  events.filter((event) => event.readAt === null).length;

/** Oznacza nieprzeczytane jako przeczytane (readAt = teraz) jednym batchem. */
export const markAllUserEventsRead = async (
  userId: string,
  events: UserEvent[],
): Promise<void> => {
  const unread = events.filter((event) => event.readAt === null);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    const readAt = Date.now();
    unread.forEach((event) => {
      batch.update(doc(db, 'user_events', userEventDocId(userId, event.key)), { readAt });
    });
    await batch.commit();
  } catch {
    // Best-effort: nieudane oznaczenie zostawia kropkę, nic więcej.
  }
};

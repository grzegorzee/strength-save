import { createRequire } from 'node:module';
import { PROJECT_ID } from './support';

// Release e2e: poranne przypomnienie (dailyTrainingReminder) na emulatorze.
// Emulator nie odpala harmonogramów, więc test woła SKOMPILOWANĄ funkcję
// (functions/lib, ta sama co deploy) z produkcyjnymi loaderami Firestore
// (buildFirestoreReminderDeps). Podmienione są tylko zegar (lokalna 07:00
// w strefie usera) i transport FCM (rejestr wysyłek zamiast realnego pusha).

const require = createRequire(import.meta.url);

type SendMulticast = (tokens: string[], title: string, body: string) => Promise<{
  successCount: number; failureCount: number; responses: Array<{ success: boolean }>;
}>;

interface ReminderModule {
  runDailyReminder: (deps: unknown) => Promise<{ candidates: number; sent: number; skippedActive: number }>;
  buildFirestoreReminderDeps: (db: unknown, now: Date, send: SendMulticast) => unknown;
  REMINDER_LOCAL_HOUR: number;
}

let firestore: unknown = null;
function adminFirestore(): unknown {
  if (firestore) return firestore;
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8081';
  process.env.GCLOUD_PROJECT ??= PROJECT_ID;
  const admin = require('../../../functions/node_modules/firebase-admin') as {
    apps: unknown[];
    initializeApp: (options: { projectId: string }, name?: string) => { firestore: () => unknown };
  };
  const app = admin.initializeApp({ projectId: PROJECT_ID }, `release-e2e-reminder-${Date.now()}`);
  firestore = app.firestore();
  return firestore;
}

/** Chwila, w której w strefie `timeZone` jest `dateIso` godz. REMINDER_LOCAL_HOUR. */
function reminderInstant(dateIso: string, timeZone: string, hour: number): Date {
  const { localDayParts } = require('../../../functions/lib/local-time.js') as {
    localDayParts: (now: Date, tz: string) => { dateStr: string; hour: number };
  };
  const [y, m, d] = dateIso.split('-').map(Number);
  for (let offset = -24; offset <= 24; offset += 1) {
    const candidate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offset * 3_600_000);
    const parts = localDayParts(candidate, timeZone);
    if (parts.dateStr === dateIso && parts.hour === hour) return candidate;
  }
  throw new Error(`Brak godziny ${hour} dnia ${dateIso} w ${timeZone}`);
}

export interface ReminderRun { pushedTokens: string[]; result: { candidates: number; sent: number; skippedActive: number } }

/** Uruchamia produkcyjne przypomnienie na „lokalną 07:00 dnia dateIso”. */
export async function runReminderAt(dateIso: string, timeZone = 'Europe/Warsaw'): Promise<ReminderRun> {
  const reminder = require('../../../functions/lib/daily-reminder.js') as ReminderModule;
  const now = reminderInstant(dateIso, timeZone, reminder.REMINDER_LOCAL_HOUR);
  const pushedTokens: string[] = [];
  const send: SendMulticast = async (tokens) => {
    pushedTokens.push(...tokens);
    return { successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) };
  };
  const result = await reminder.runDailyReminder(reminder.buildFirestoreReminderDeps(adminFirestore(), now, send));
  return { pushedTokens, result };
}

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { detectEmailPRs, type EmailPR } from "./email-prs";
import { PR_BASELINE_LIMIT, type EmailUnit, type EmailWorkout } from "./email-workout";
import type { Lang } from "./email-templates";
import { localizeExerciseNameEn } from "./exercise-name-en";
import { getInvalidFcmTokens, type ReminderUser } from "./daily-reminder";

// X35c (WP-E, pkt 2): push o nowym rekordzie po zapisie UKOŃCZONEGO treningu.
//
// Podział ról klient/serwer (decyzja X35c): KLIENT zostaje jedynym producentem
// wpisu 'pr' w dzwonku (WorkoutDay.tsx emituje natychmiast, działa offline,
// zna 7 typów PR: waga/1RM/both/powtórzenia/czas/dystans/effective_load).
// SERWER wyłącznie DOSYŁA PUSH i nie tworzy drugiego wpisu w user_events:
// serwerowa detekcja (email-prs: waga/powtórzenia/e1RM) różni się od klienckiej
// w nazwach typów ('e1rm' vs '1rm', 'both'), więc "ten sam klucz" nie byłby
// gwarantowany i dzwonek dostawałby duplikaty. Idempotencja pusha: znacznik
// pr_push_markers/{workoutId} (create = claim; retry triggera dostaje
// ALREADY_EXISTS i milczy). Koszt: trigger liczy cokolwiek TYLKO na przejściu
// completed -> true; zapisy checkpointowe serii w trakcie treningu kończą się
// na pierwszym if-ie bez odczytu.

const FCM_TOKEN_REGISTRATIONS_COLLECTION = "fcm_token_registrations";
export const PR_PUSH_MARKERS_COLLECTION = "pr_push_markers";
export const PR_PUSH_DEEP_LINK = "/history";

type DeliveryResponse = { success: boolean; error?: { code?: string } };

export interface PrPushUser extends ReminderUser {
  preferences?: { unit?: string };
}

export interface PrPushDeps {
  getUser: (uid: string) => Promise<PrPushUser | null>;
  /** Baseline PR: ukończone treningi usera sprzed daty (wzór sendWorkoutEmail). */
  listBaselineWorkouts: (uid: string, beforeDate: string, limit: number) => Promise<EmailWorkout[]>;
  /** Znacznik "push za ten trening wysłany". true = zajęty teraz, false = już był. */
  claimPrPush: (workoutId: string, uid: string) => Promise<boolean>;
  listTokenRegistrations: (uid: string) => Promise<Array<{ id: string; token: string }>>;
  sendMulticast: (tokens: string[], title: string, body: string, data: Record<string, string>) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
}

export type PrPushOutcome =
  | { status: "skipped"; reason: "not-completed" | "no-working-sets" | "no-user" | "prefs-off" | "access" | "no-tokens" | "already-sent" }
  | { status: "no-prs" }
  | { status: "sent"; prs: number; sent: number; failed: number; invalidTokens: number };

/** Trigger liczy cokolwiek TYLKO na przejściu completed -> true. */
export const isCompletionTransition = (
  before: { completed?: boolean } | null | undefined,
  after: { completed?: boolean } | null | undefined,
): boolean => after?.completed === true && before?.completed !== true;

const hasWorkingSets = (workout: EmailWorkout): boolean =>
  (workout.exercises ?? []).some((ex) => (ex.sets ?? []).some((set) => set.completed && !set.isWarmup));

const KG_TO_LB = 2.20462;

const weightLabel = (kg: number, unit: EmailUnit): string => {
  if (unit !== "lbs") return `${kg} kg`;
  const lb = Math.round(kg * KG_TO_LB * 2) / 2;
  return `${Number.isInteger(lb) ? String(lb) : lb.toFixed(1)} lb`;
};

const prValueLabel = (pr: EmailPR, value: number, lang: Lang, unit: EmailUnit): string => {
  if (pr.type === "reps") return lang === "en" ? `${value} reps` : `${value} powt.`;
  if (pr.type === "e1rm") return `${lang === "en" ? "est. 1RM" : "szac. 1RM"} ${weightLabel(value, unit)}`;
  return weightLabel(value, unit);
};

const plRecordsPlural = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} nowe rekordy`;
  return `${n} nowych rekordów`;
};

/** Treść pusha w języku i jednostce usera. */
export const buildPrPushMessage = (prs: EmailPR[], lang: Lang, unit: EmailUnit): { title: string; body: string } => {
  const nameOf = (pr: EmailPR) => (lang === "en" ? localizeExerciseNameEn(pr.exerciseName) : pr.exerciseName);
  if (prs.length === 1) {
    const [pr] = prs;
    const current = `${nameOf(pr)} ${prValueLabel(pr, pr.newValue, lang, unit)}`;
    const previous = prValueLabel(pr, pr.oldValue, lang, unit);
    return lang === "en"
      ? { title: `New record: ${current}`, body: `Previously ${previous}. Keep it up!` }
      : { title: `Nowy rekord: ${current}`, body: `Poprzednio ${previous}. Tak trzymaj!` };
  }
  const list = prs.map((pr) => `${nameOf(pr)} ${prValueLabel(pr, pr.newValue, lang, unit)}`).join(", ");
  return {
    title: lang === "en" ? `${prs.length} new records` : plRecordsPlural(prs.length),
    body: list,
  };
};

export async function runPrPush(deps: PrPushDeps, workout: EmailWorkout): Promise<PrPushOutcome> {
  if (!workout.completed) return { status: "skipped", reason: "not-completed" };
  if (!hasWorkingSets(workout)) return { status: "skipped", reason: "no-working-sets" };

  const user = await deps.getUser(workout.userId);
  if (!user) return { status: "skipped", reason: "no-user" };
  if (user.notificationPrefs?.prPush === false) return { status: "skipped", reason: "prefs-off" };
  if (user.access?.enabled === false || user.status === "suspended") return { status: "skipped", reason: "access" };

  const baseline = await deps.listBaselineWorkouts(workout.userId, workout.date, PR_BASELINE_LIMIT);
  const { prs } = detectEmailPRs(workout, baseline);
  if (prs.length === 0) return { status: "no-prs" };

  // Tokeny PRZED znacznikiem: bez telefonu nie ma co "zajmować" (1 zapis mniej,
  // a push o rekordzie jest czasowy — późniejsza rejestracja nic nie zmienia).
  const registrations = (await deps.listTokenRegistrations(workout.userId))
    .filter((registration) => !!registration.token);
  if (registrations.length === 0) return { status: "skipped", reason: "no-tokens" };

  const claimed = await deps.claimPrPush(workout.id, workout.userId);
  if (!claimed) return { status: "skipped", reason: "already-sent" };

  const lang: Lang = user.language === "en" ? "en" : "pl";
  const unit: EmailUnit = user.preferences?.unit === "lbs" ? "lbs" : "kg";
  const { title, body } = buildPrPushMessage(prs, lang, unit);
  const tokens = registrations.map((registration) => registration.token);

  let sent = 0;
  let failed = 0;
  let invalidTokens = 0;
  try {
    for (let index = 0; index < tokens.length; index += 500) {
      const tokenBatch = tokens.slice(index, index + 500);
      const res = await deps.sendMulticast(tokenBatch, title, body, { type: "pr", deepLink: PR_PUSH_DEEP_LINK });
      sent += res.successCount;
      failed += res.failureCount;

      const invalid = getInvalidFcmTokens(tokenBatch, res.responses);
      if (invalid.length > 0) {
        invalidTokens += invalid.length;
        const invalidIds = registrations
          .filter((registration) => invalid.includes(registration.token))
          .map((registration) => registration.id);
        await deps.deleteRegistrations(invalidIds);
      }
    }
  } catch (e) {
    logger.error(`[prPush] send failed for ${workout.userId}`, e);
  }

  return { status: "sent", prs: prs.length, sent, failed, invalidTokens };
}

export const onWorkoutCompletedPrPush = onDocumentWritten(
  { document: "workouts/{workoutId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before?.exists ? (event.data.before.data() as { completed?: boolean }) : null;
    const afterSnap = event.data?.after;
    const after = afterSnap?.exists ? (afterSnap.data() as Omit<EmailWorkout, "id">) : null;
    if (!after || !isCompletionTransition(before, after)) return;
    if (typeof after.userId !== "string" || typeof after.date !== "string") return;

    const db = admin.firestore();
    const workout: EmailWorkout = { ...after, id: event.params.workoutId };

    const result = await runPrPush({
      getUser: async (uid) => {
        const snap = await db.collection("users").doc(uid).get();
        return snap.exists ? (snap.data() as PrPushUser) : null;
      },
      listBaselineWorkouts: async (uid, beforeDate, limit) => {
        // Ten sam indeks co sendWorkoutEmail: workouts(userId, completed, date DESC).
        const snap = await db.collection("workouts")
          .where("userId", "==", uid)
          .where("completed", "==", true)
          .where("date", "<", beforeDate)
          .orderBy("date", "desc")
          .limit(limit)
          .get();
        return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EmailWorkout, "id">) }));
      },
      claimPrPush: async (workoutId, uid) => {
        try {
          await db.collection(PR_PUSH_MARKERS_COLLECTION).doc(workoutId).create({
            userId: uid,
            createdAt: Date.now(),
          });
          return true;
        } catch (error) {
          const code = (error as { code?: number | string }).code;
          if (code === 6 || code === "already-exists") return false;
          throw error;
        }
      },
      listTokenRegistrations: async (uid) => {
        const snap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION)
          .where("userId", "==", uid)
          .get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          token: typeof doc.data().token === "string" ? doc.data().token as string : "",
        }));
      },
      sendMulticast: (tokens, title, body, data) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
    }, workout);

    logger.info(`[prPush] workout=${workout.id} uid=${workout.userId}`, result);
  },
);

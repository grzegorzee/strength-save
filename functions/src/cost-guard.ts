import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { SES_EMAIL_SECRETS, sendSesEmail } from "./ses-email";
import { MAX_INSTANCES_OVERRIDES } from "./function-limits";

// Bezpiecznik kosztów (docs/COST-GUARDS.md, sekcja 3). Zamiast odcinania
// billingu (Google wyłącza wtedy WSZYSTKIE usługi, apka z płacącymi userami
// przestaje działać) aplikacja sama wstrzymuje niekrytyczne zadania cykliczne,
// gdy koszt miesiąca dojdzie do progu budżetu:
//   budżet (Cloud Billing) -> Pub/Sub `cost-guard-budget` -> costGuardBudgetListener
//   -> config/cost_guard {paused: true} -> withCostGuard() w onSchedule wychodzi wcześnie.
// Wyjścia ze stanu paused (zasada 6): automatycznie w nowym okresie budżetu
// albo gdy koszt spadnie pod próg (np. korekta/kredyt), ręcznie przełącznikiem
// w panelu admina (adminSetCostGuard). Ręczne wznowienie trzyma do końca okresu.

export const COST_GUARD_TOPIC = "cost-guard-budget";
export const COST_GUARD_COLLECTION = "config";
export const COST_GUARD_DOC_ID = "cost_guard";
export const DEFAULT_PAUSE_RATIO = 0.9;
// 2026-09-30: alert idzie też na Gmail właściciela (skrzynka produktowa bywa sprawdzana rzadziej).
export const COST_GUARD_ALERT_RECIPIENTS = ["contact@strengthsave.app", "g.jasionowicz@gmail.com"];
const AUDIT_TTL_DAYS = 365;

export type CostGuardReason =
  | "budget-threshold"
  | "new-budget-period"
  | "below-threshold"
  | "admin-pause"
  | "admin-resume";

export interface CostGuardState {
  paused: boolean;
  reason: CostGuardReason | null;
  costAmount: number | null;
  budgetAmount: number | null;
  currencyCode: string | null;
  ratio: number | null;
  /** costIntervalStart z komunikatu budżetu = klucz okresu rozliczeniowego. */
  budgetPeriod: string | null;
  /** Ostatnia zmiana stanu paused (ISO). */
  at: string | null;
  changedBy: string | null;
  /** Okres, dla którego mail alarmowy już poszedł (idempotencja). */
  alertEmailPeriod: string | null;
  /** Okres, w którym admin ręcznie wznowił: budżet nie pauzuje ponownie do końca okresu. */
  manualResumePeriod: string | null;
  /** Opcjonalny próg (ułamek budżetu), ustawiany ręcznie w dokumencie. */
  pauseAtRatio: number | null;
  lastNotificationAt: string | null;
}

export const EMPTY_COST_GUARD_STATE: CostGuardState = {
  paused: false,
  reason: null,
  costAmount: null,
  budgetAmount: null,
  currencyCode: null,
  ratio: null,
  budgetPeriod: null,
  at: null,
  changedBy: null,
  alertEmailPeriod: null,
  manualResumePeriod: null,
  pauseAtRatio: null,
  lastNotificationAt: null,
};

export interface BudgetNotification {
  costAmount: number;
  budgetAmount: number;
  currencyCode: string;
  budgetPeriod: string;
  budgetDisplayName: string;
  alertThresholdExceeded: number | null;
  forecastThresholdExceeded: number | null;
}

const finiteNumber = (value: unknown): number | null => (
  typeof value === "number" && Number.isFinite(value) ? value : null
);
const shortString = (value: unknown, max = 200): string | null => (
  typeof value === "string" && value.length > 0 && value.length <= max ? value : null
);

/**
 * Komunikat budżetu (schemaVersion 1.0): JSON w base64 w message.data.
 * Uszkodzony albo niepełny komunikat = null (log + ack, bez zmiany stanu).
 */
export const parseBudgetNotification = (base64Data: unknown): BudgetNotification | null => {
  if (typeof base64Data !== "string" || base64Data.length === 0 || base64Data.length > 20_000) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const costAmount = finiteNumber(data.costAmount);
  const budgetAmount = finiteNumber(data.budgetAmount);
  const budgetPeriod = shortString(data.costIntervalStart, 64);
  if (costAmount === null || costAmount < 0 || budgetAmount === null || budgetAmount <= 0 || !budgetPeriod) return null;
  return {
    costAmount,
    budgetAmount,
    currencyCode: shortString(data.currencyCode, 8) ?? "",
    budgetPeriod,
    budgetDisplayName: shortString(data.budgetDisplayName) ?? "",
    alertThresholdExceeded: finiteNumber(data.alertThresholdExceeded),
    forecastThresholdExceeded: finiteNumber(data.forecastThresholdExceeded),
  };
};

export const normalizeCostGuardState = (raw: unknown): CostGuardState => {
  if (!raw || typeof raw !== "object") return { ...EMPTY_COST_GUARD_STATE };
  const data = raw as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value : null);
  const ratio = finiteNumber(data.pauseAtRatio);
  return {
    paused: data.paused === true,
    reason: str(data.reason) as CostGuardReason | null,
    costAmount: finiteNumber(data.costAmount),
    budgetAmount: finiteNumber(data.budgetAmount),
    currencyCode: str(data.currencyCode),
    ratio: finiteNumber(data.ratio),
    budgetPeriod: str(data.budgetPeriod),
    at: str(data.at),
    changedBy: str(data.changedBy),
    alertEmailPeriod: str(data.alertEmailPeriod),
    manualResumePeriod: str(data.manualResumePeriod),
    pauseAtRatio: ratio !== null && ratio > 0 && ratio <= 2 ? ratio : null,
    lastNotificationAt: str(data.lastNotificationAt),
  };
};

export type BudgetAction = "pause" | "resume" | "hold-manual-resume" | "noop";

export interface BudgetDecision {
  next: CostGuardState;
  action: BudgetAction;
  /** true = ta transakcja zarezerwowała wysyłkę maila dla okresu. */
  claimAlertEmail: boolean;
}

/** Czysta decyzja: poprzedni stan + komunikat budżetu -> następny stan. */
export const decideBudgetTransition = (
  previous: CostGuardState,
  notification: BudgetNotification,
  nowIso: string,
): BudgetDecision => {
  const pauseRatio = previous.pauseAtRatio ?? DEFAULT_PAUSE_RATIO;
  const ratio = notification.costAmount / notification.budgetAmount;
  const period = notification.budgetPeriod;
  const next: CostGuardState = {
    ...previous,
    costAmount: notification.costAmount,
    budgetAmount: notification.budgetAmount,
    currencyCode: notification.currencyCode || previous.currencyCode,
    ratio,
    budgetPeriod: period,
    lastNotificationAt: nowIso,
  };
  let action: BudgetAction = "noop";
  const pausedByBudget = previous.paused && previous.reason === "budget-threshold";

  if (ratio >= pauseRatio) {
    if (!previous.paused && previous.manualResumePeriod === period) {
      action = "hold-manual-resume";
    } else if (!previous.paused) {
      Object.assign(next, { paused: true, reason: "budget-threshold", at: nowIso, changedBy: "budget" });
      action = "pause";
    }
  } else if (pausedByBudget) {
    // Nowy okres (koszt liczony od zera) albo korekta w tym samym okresie.
    const reason: CostGuardReason = previous.budgetPeriod !== period ? "new-budget-period" : "below-threshold";
    Object.assign(next, { paused: false, reason, at: nowIso, changedBy: "budget" });
    action = "resume";
  }

  const claimAlertEmail = next.paused && next.reason === "budget-threshold" && previous.alertEmailPeriod !== period;
  if (claimAlertEmail) next.alertEmailPeriod = period;
  return { next, action, claimAlertEmail };
};

export interface CostGuardMutation<T> {
  /** null = bez zapisu. */
  next: CostGuardState | null;
  result: T;
  /** Wpis admin_audit_log zapisywany w TEJ SAMEJ transakcji co stan. */
  audit?: Record<string, unknown>;
}

export interface CostGuardStore {
  /** Transakcja read-modify-write na config/cost_guard. */
  update: <T>(mutate: (current: CostGuardState) => CostGuardMutation<T>) => Promise<T>;
}

export interface BudgetHandlerDeps {
  store: CostGuardStore;
  sendAlertEmail: (subject: string, html: string) => Promise<void>;
  nowIso: () => string;
}

const formatAmount = (amount: number | null, currency: string | null): string => (
  amount === null ? "?" : `${amount.toFixed(2)} ${currency ?? ""}`.trim()
);

export const buildCostGuardAlertEmail = (state: CostGuardState): { subject: string; html: string } => {
  const percent = state.ratio === null ? "?" : `${Math.round(state.ratio * 100)}%`;
  const subject = `[Strength Save] Bezpiecznik kosztów: ${percent} budżetu, zadania niekrytyczne wstrzymane`;
  const html = `
    <h2>Strength Save: bezpiecznik kosztów zadziałał</h2>
    <p>Koszt projektu fittracker-workouts w bieżącym okresie: <b>${formatAmount(state.costAmount, state.currencyCode)}</b>
       z budżetu ${formatAmount(state.budgetAmount, state.currencyCode)} (${percent}).</p>
    <p>Wstrzymane: niekrytyczne zadania cykliczne (przypomnienia, digesty, rollupy, sync Strava).
       Aplikacja, zapis treningów, płatności i usuwanie kont działają bez zmian.</p>
    <p>Wznowienie: automatycznie w nowym okresie budżetu albo ręcznie w panelu admina
       (karta „Bezpiecznik kosztów”). Najpierw sprawdź przyczynę: Billing &gt; Reports, alerty Cloud Monitoring.</p>
    <p style="color:#666;font-size:12px;">Okres od: ${state.budgetPeriod ?? "?"}. Jeden mail na okres budżetu.</p>`;
  return { subject, html };
};

/** Obsługa jednego komunikatu Pub/Sub budżetu. Nie rzuca (retry i tak wyłączony). */
export const handleBudgetMessage = async (
  deps: BudgetHandlerDeps,
  base64Data: unknown,
): Promise<{ action: BudgetAction | "invalid"; emailed: boolean }> => {
  const notification = parseBudgetNotification(base64Data);
  if (!notification) {
    logger.warn("cost_guard_invalid_budget_message");
    return { action: "invalid", emailed: false };
  }
  const now = deps.nowIso();
  const decision = await deps.store.update((current) => {
    const decided = decideBudgetTransition(current, notification, now);
    return { next: decided.next, result: decided };
  });
  logger.info("cost_guard_budget_message", {
    action: decision.action,
    ratio: decision.next.ratio,
    period: decision.next.budgetPeriod,
    paused: decision.next.paused,
  });
  if (!decision.claimAlertEmail) return { action: decision.action, emailed: false };

  const email = buildCostGuardAlertEmail(decision.next);
  try {
    await deps.sendAlertEmail(email.subject, email.html);
    return { action: decision.action, emailed: true };
  } catch (error) {
    // Zwolnij rezerwację: następny komunikat (~co kilkadziesiąt minut) ponowi mail.
    logger.error("cost_guard_alert_email_failed", { message: error instanceof Error ? error.message : String(error) });
    await deps.store.update((current) => (
      current.alertEmailPeriod === notification.budgetPeriod
        ? { next: { ...current, alertEmailPeriod: null }, result: undefined }
        : { next: null, result: undefined }
    ));
    return { action: decision.action, emailed: false };
  }
};

// ---------------------------------------------------------------------------
// Guard zadań cyklicznych.

/**
 * Zadania cykliczne, których bezpiecznik NIE wstrzymuje (obowiązek prawny,
 * retencja danych albo pomiar samego incydentu). Każde inne onSchedule musi
 * być owinięte withCostGuard (kontrakt: cost-guard-contract.test.ts).
 */
export const COST_GUARD_EXEMPT: Readonly<Record<string, string>> = {
  resumeDeletionOperations: "RODO: usuwanie kont w zadeklarowanym terminie (obowiązek prawny)",
  cleanupExpiredSesEvents: "retencja 180 dni zdarzeń e-mail z polityki prywatności",
  cleanupStaleBugReports: "retencja 180 dni zgłoszeń ze zrzutami + odzysk zgłoszeń userów",
  dailyCostDigest: "pomiar kosztów: bez niego incydent kosztowy jest ślepy (kilka zapytań Monitoring API na dobę)",
  dailyErrorDigest: "alarm błędów produkcji (zasada 11), max 2000 odczytów na dobę",
};

export type CostGuardedHandler<E> = ((event: E) => Promise<void>) & { costGuard: string };

export const readCostGuardStateFromFirestore = async (): Promise<CostGuardState> => {
  const snapshot = await admin.firestore().collection(COST_GUARD_COLLECTION).doc(COST_GUARD_DOC_ID).get();
  return normalizeCostGuardState(snapshot.exists ? snapshot.data() : null);
};

/**
 * Owija handler onSchedule: przy config/cost_guard.paused wychodzi przed pracą.
 * Błąd odczytu flagi = fail-open (zadanie rusza): awaria Firestore nie może
 * po cichu wyłączyć przypomnień.
 */
export const withCostGuard = <E>(
  name: string,
  handler: (event: E) => Promise<void> | void,
  readState: () => Promise<CostGuardState> = readCostGuardStateFromFirestore,
): CostGuardedHandler<E> => {
  const guarded = async (event: E): Promise<void> => {
    let state: CostGuardState | null = null;
    try {
      state = await readState();
    } catch (error) {
      logger.warn("cost_guard_read_failed_fail_open", {
        fn: name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (state?.paused) {
      logger.warn("cost_guard_skip", { fn: name, reason: state.reason, ratio: state.ratio });
      return;
    }
    await handler(event);
  };
  return Object.assign(guarded, { costGuard: name });
};

// ---------------------------------------------------------------------------
// Przełącznik admina.

export interface AdminCostGuardDeps {
  isAdmin: (uid: string) => Promise<boolean>;
  store: CostGuardStore;
  nowMs: () => number;
}

export const setCostGuardByAdmin = async (
  deps: AdminCostGuardDeps,
  adminUid: string | undefined,
  data: unknown,
): Promise<{ success: true; paused: boolean }> => {
  if (!adminUid) throw new HttpsError("unauthenticated", "Must be logged in");
  if (!await deps.isAdmin(adminUid)) throw new HttpsError("permission-denied", "Admin access required");
  const paused = (data as { paused?: unknown } | null)?.paused;
  if (typeof paused !== "boolean") throw new HttpsError("invalid-argument", "paused must be boolean");

  const nowMs = deps.nowMs();
  const nowIso = new Date(nowMs).toISOString();
  await deps.store.update((current) => {
    const next: CostGuardState = {
      ...current,
      paused,
      reason: paused ? "admin-pause" : "admin-resume",
      at: nowIso,
      changedBy: `admin:${adminUid}`,
      // Ręczne wznowienie trzyma do końca bieżącego okresu budżetu.
      manualResumePeriod: paused ? null : current.budgetPeriod,
    };
    const audit = {
      adminUid,
      action: paused ? "costGuard:pause" : "costGuard:resume",
      targetUid: `${COST_GUARD_COLLECTION}/${COST_GUARD_DOC_ID}`,
      detail: `ratio=${current.ratio ?? "?"} period=${current.budgetPeriod ?? "?"}`.slice(0, 500),
      createdAt: nowIso,
      expiresAt: Timestamp.fromMillis(nowMs + AUDIT_TTL_DAYS * 24 * 60 * 60 * 1000),
    };
    return { next, result: undefined, audit };
  });
  logger.info("cost_guard_admin_toggle", { adminUid, paused });
  return { success: true, paused };
};

// ---------------------------------------------------------------------------
// Firestore + wdrażane funkcje.

const costGuardRef = () => admin.firestore().collection(COST_GUARD_COLLECTION).doc(COST_GUARD_DOC_ID);

const firestoreStore = (): CostGuardStore => ({
  update: (mutate) => admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(costGuardRef());
    const { next, result, audit } = mutate(normalizeCostGuardState(snapshot.exists ? snapshot.data() : null));
    if (next) tx.set(costGuardRef(), next, { merge: true });
    if (audit) tx.set(admin.firestore().collection("admin_audit_log").doc(), audit);
    return result;
  }),
});

export const costGuardBudgetListener = onMessagePublished(
  {
    topic: COST_GUARD_TOPIC,
    region: "us-central1",
    maxInstances: MAX_INSTANCES_OVERRIDES.costGuardBudgetListener,
    secrets: [...SES_EMAIL_SECRETS],
    timeoutSeconds: 60,
  },
  async (event) => {
    await handleBudgetMessage({
      store: firestoreStore(),
      sendAlertEmail: async (subject, html) => {
        for (const to of COST_GUARD_ALERT_RECIPIENTS) await sendSesEmail({ to, subject, html });
      },
      nowIso: () => new Date().toISOString(),
    }, event.data?.message?.data);
  },
);

export const adminSetCostGuard = onCall((request) => setCostGuardByAdmin({
  isAdmin: async (uid) => {
    const snap = await admin.firestore().collection("users").doc(uid).get();
    return snap.exists && snap.data()?.role === "admin";
  },
  store: firestoreStore(),
  nowMs: () => Date.now(),
}, request.auth?.uid, request.data));

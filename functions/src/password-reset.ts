// Reset hasła własnym kanałem (2026-09-13): Google zablokował na projekcie
// edycję treści i adresu linku szablonów Firebase Auth
// (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED), więc mail resetu buduje backend:
// Admin SDK generuje link, host idzie na auth.strengthsave.app (Firebase
// Hosting projektu, ten sam handler /__/auth/action), a wysyłka leci przez
// Amazon SES z noreply@strengthsave.app z naszym szablonem (przycisk + link
// zapasowy, PL/EN). Klient: useAuth.resetPassword -> requestPasswordReset.
import { createHash } from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { SES_EMAIL_SECRETS } from "./ses-email";
import { sendTransactionalEmail } from "./registration";
import { passwordResetEmailHtml, passwordResetSubject, type Lang } from "./email-templates";

export const PASSWORD_RESET_LINK_ORIGIN = "https://auth.strengthsave.app";
export const PASSWORD_RESET_COOLDOWN_MS = 60_000;
export const PASSWORD_RESET_DAILY_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const RATE_COLLECTION = "password_reset_rate_limits";
const ACTION_PATH = "/__/auth/action";

export interface PasswordResetRateDoc {
  lastRequestAt: string;
  windowStartedAt: string;
  count: number;
  expiresAt?: Timestamp;
}

interface PasswordResetDeps {
  now: () => number;
  readRate: () => Promise<PasswordResetRateDoc | null>;
  writeRate: (doc: PasswordResetRateDoc) => Promise<void>;
  generateLink: (email: string) => Promise<string>;
  sendEmail: (params: { to: string; subject: string; html: string; type: string }) => Promise<void>;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Email jest wymagany.");
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpsError("invalid-argument", "Nieprawidłowy adres email.");
  }
  return normalized;
}

const normalizeLanguage = (value: unknown): Lang => (value === "en" ? "en" : "pl");

/**
 * Link z Admin SDK wskazuje na callbackUri projektu (fittracker-workouts.firebaseapp.com).
 * Handler /__/auth/action jest serwowany przez Firebase Hosting na każdej domenie
 * projektu, więc wystarczy podmienić origin. Ścieżka musi być handlerem Firebase:
 * nie przepisujemy dowolnego URL-a.
 */
export function rewriteResetLink(link: string, lang: Lang): string {
  const url = new URL(link);
  if (url.pathname !== ACTION_PATH || !url.searchParams.get("oobCode")) {
    throw new Error("Unexpected password reset link shape");
  }
  const target = new URL(PASSWORD_RESET_LINK_ORIGIN);
  target.pathname = ACTION_PATH;
  url.searchParams.set("lang", lang);
  target.search = url.search;
  return target.toString();
}

/**
 * Nieznany adres. Projekt ma włączoną ochronę przed enumeracją kont, więc
 * backend Firebase odpowiada sukcesem bez linku, a Admin SDK rzuca wtedy
 * auth/internal-error "Unable to create the email action link"
 * (node_modules/firebase-admin/lib/auth/auth-api-request.js:676, sprawdzone
 * realnym wywołaniem na produkcji 2026-09-13). Bez tej ochrony byłoby
 * auth/user-not-found albo auth/email-not-found.
 */
const isUserNotFound = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return false;
  if (code.endsWith("user-not-found") || code.endsWith("email-not-found")) return true;
  const message = (error as { message?: unknown }).message;
  return code.endsWith("internal-error")
    && typeof message === "string"
    && message.includes("Unable to create the email action link");
};

export async function requestPasswordResetCore(
  input: { email: unknown; language: unknown },
  deps: PasswordResetDeps,
): Promise<{ sent: true }> {
  const email = normalizeEmail(input.email);
  const language = normalizeLanguage(input.language);
  const now = deps.now();

  const rate = await deps.readRate();
  const lastRequestAt = rate ? Date.parse(rate.lastRequestAt) : NaN;
  if (Number.isFinite(lastRequestAt) && now - lastRequestAt < PASSWORD_RESET_COOLDOWN_MS) {
    throw new HttpsError("resource-exhausted", "Odczekaj chwilę przed ponowną prośbą o reset hasła.");
  }
  const windowStartedAt = rate ? Date.parse(rate.windowStartedAt) : NaN;
  const windowActive = Number.isFinite(windowStartedAt) && now - windowStartedAt < DAY_MS;
  const count = windowActive ? rate!.count : 0;
  if (count >= PASSWORD_RESET_DAILY_LIMIT) {
    throw new HttpsError("resource-exhausted", "Limit próśb o reset hasła na dziś wyczerpany. Spróbuj jutro.");
  }
  const nowIso = new Date(now).toISOString();
  await deps.writeRate({
    lastRequestAt: nowIso,
    windowStartedAt: windowActive ? rate!.windowStartedAt : nowIso,
    count: count + 1,
  });

  let link: string;
  try {
    link = rewriteResetLink(await deps.generateLink(email), language);
  } catch (error) {
    // Nieznany adres dostaje tę samą odpowiedź co istniejący (brak enumeracji kont).
    if (isUserNotFound(error)) return { sent: true };
    console.error("Password reset link generation failed", error);
    throw new HttpsError("unavailable", "Nie udało się przygotować linku resetu hasła.");
  }

  await deps.sendEmail({
    to: email,
    subject: passwordResetSubject(language),
    html: passwordResetEmailHtml(link, email, language),
    type: "password_reset",
  });
  return { sent: true };
}

export const requestPasswordReset = onCall({ secrets: [...SES_EMAIL_SECRETS] }, async (request) => {
  const db = admin.firestore();
  const rateRef = db.collection(RATE_COLLECTION).doc(
    createHash("sha256").update(normalizeEmail(request.data?.email)).digest("hex"),
  );
  return requestPasswordResetCore(
    { email: request.data?.email, language: request.data?.language },
    {
      now: () => Date.now(),
      readRate: async () => {
        const snap = await rateRef.get();
        return snap.exists ? (snap.data() as PasswordResetRateDoc) : null;
      },
      writeRate: async (doc) => {
        await rateRef.set({
          ...doc,
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 2 * DAY_MS)),
        });
      },
      generateLink: (email) => admin.auth().generatePasswordResetLink(email),
      sendEmail: (params) => sendTransactionalEmail(params),
    },
  );
});

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SendEmailCommandOutput,
} from "@aws-sdk/client-sesv2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

export const sesRegion = defineSecret("SES_REGION");
export const sesAccessKeyId = defineSecret("SES_ACCESS_KEY_ID");
export const sesSecretAccessKey = defineSecret("SES_SECRET_ACCESS_KEY");
export const sesFrom = defineSecret("SES_FROM");
export const SES_EMAIL_SECRETS = [sesRegion, sesAccessKeyId, sesSecretAccessKey, sesFrom] as const;
export const SES_CONFIGURATION_SET = "strengthsave";

export interface SesEmailConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from: string;
}

/** Skrzynka supportu z odbiorem (MX seohost od 2026-09-16). */
export const SUPPORT_REPLY_TO = "contact@strengthsave.app";

export interface SesEmailHeader {
  name: string;
  value: string;
}

export interface SesEmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Domyślnie skrzynka supportu: odpowiedź na noreply@ nie ginie. */
  replyTo?: string[];
  /** Dodatkowe nagłówki (np. List-Unsubscribe dla digestu). */
  headers?: SesEmailHeader[];
}

export interface SesEmailResult {
  transport: "ses";
  sesMessageId?: string;
}

export const safeSesErrorCode = (error: unknown): string => {
  if (error instanceof Error && error.message === "Amazon SES email transport is not configured") {
    return "ses-not-configured";
  }
  if (error !== null && typeof error === "object") {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name !== "Error" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(name)) {
      return name;
    }
  }
  return "ses-send-failed";
};

interface SesClientLike {
  send(command: SendEmailCommand): Promise<Pick<SendEmailCommandOutput, "MessageId">>;
}

const isConfiguredValue = (value: string): boolean => {
  const normalized = value.trim();
  return normalized !== "" && normalized !== "unset";
};

export const normalizeSesEmailConfig = (config: SesEmailConfig): SesEmailConfig | null => {
  if (!Object.values(config).every(isConfiguredValue)) return null;
  return {
    region: config.region.trim(),
    accessKeyId: config.accessKeyId.trim(),
    secretAccessKey: config.secretAccessKey.trim(),
    from: config.from.trim(),
  };
};

export const buildSesEmailCommandInput = (message: SesEmailMessage): SendEmailCommandInput => ({
  FromEmailAddress: message.from,
  ReplyToAddresses: message.replyTo ?? [SUPPORT_REPLY_TO],
  // Jawny kontrakt transportu: telemetryka nie zależy wyłącznie od ustawienia
  // default na identity, które może zostać zmienione poza repozytorium.
  ConfigurationSetName: SES_CONFIGURATION_SET,
  Destination: { ToAddresses: [message.to] },
  Content: {
    Simple: {
      Subject: { Data: message.subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: message.html, Charset: "UTF-8" },
        Text: { Data: message.text, Charset: "UTF-8" },
      },
      ...(message.headers && message.headers.length > 0
        ? { Headers: message.headers.map((header) => ({ Name: header.name, Value: header.value })) }
        : {}),
    },
  },
});

const decodeEntities = (value: string): string => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;/gi, "'")
  .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&amp;/gi, "&");

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, " ");

/**
 * Wersja text/plain z HTML maila (2026-09-29: czytelna, z adresami linków).
 * Pomija <head>, preheader (znaczniki z email-layout.ts) i komentarze; link
 * zamienia na "etykieta: adres", a gdy etykietą jest sam adres, zostawia adres.
 */
export const htmlToPlainText = (html: string): string => html
  .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
  .replace(/<!--preheader-->[\s\S]*?<!--\/preheader-->/g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const url = decodeEntities(href);
    const label = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
    if (!label || label === url || `mailto:${label}` === url) return ` ${url} `;
    return ` ${label}: ${url} `;
  })
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<li\b[^>]*>/gi, "\n- ")
  .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>|<\/ul>|<\/table>/gi, "\n")
  .replace(/<\/td>|<\/th>/gi, "\t")
  .replace(/<\/(strong|b|span|em)>(?=[:,.])/gi, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .split("\n")
  .map((line) => decodeEntities(line).replace(/\u200B|\u200C|\u200D|\uFEFF|\u034F|\u2007/g, "").replace(/[ \t]+/g, " ").trim())
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

export const sendSesEmailWithClient = async (
  client: SesClientLike,
  message: SesEmailMessage,
): Promise<SesEmailResult> => {
  const response = await client.send(new SendEmailCommand(buildSesEmailCommandInput(message)));
  return {
    transport: "ses",
    ...(response.MessageId ? { sesMessageId: response.MessageId } : {}),
  };
};

export const readSesEmailConfig = (): SesEmailConfig | null => normalizeSesEmailConfig({
  region: sesRegion.value(),
  accessKeyId: sesAccessKeyId.value(),
  secretAccessKey: sesSecretAccessKey.value(),
  from: sesFrom.value(),
});

let cachedClient: SESv2Client | null = null;
let cachedClientKey = "";

const getSesClient = (config: SesEmailConfig): SESv2Client => {
  const key = `${config.region}\u0000${config.accessKeyId}\u0000${config.secretAccessKey}`;
  if (cachedClient && cachedClientKey === key) return cachedClient;
  cachedClient = new SESv2Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    retryMode: "standard",
    maxAttempts: 3,
  });
  cachedClientKey = key;
  return cachedClient;
};

// Release e2e (2026-09-29): w emulatorze Functions z kluczem-fixture E2E
// (scripts/ensure-functions-emulator-secrets.mjs) mail trafia do kolekcji
// Firestore zamiast do SES, żeby testy e2e mogły przeczytać kod weryfikacji
// i link resetu hasła. Produkcja nie ma FUNCTIONS_EMULATOR ani tego klucza.
export const EMULATOR_EMAIL_OUTBOX_COLLECTION = "emulator_email_outbox";
const EMULATOR_SES_ACCESS_KEY_ID = "e2e-emulator-only";

export const shouldUseEmulatorOutbox = (
  env: Record<string, string | undefined>,
  config: SesEmailConfig,
): boolean => env.FUNCTIONS_EMULATOR === "true" && config.accessKeyId === EMULATOR_SES_ACCESS_KEY_ID;

export const sendSesEmail = async (message: Omit<SesEmailMessage, "from" | "text"> & {
  text?: string;
}): Promise<SesEmailResult> => {
  const config = readSesEmailConfig();
  if (!config) throw new Error("Amazon SES email transport is not configured");
  if (shouldUseEmulatorOutbox(process.env, config)) {
    const ref = await admin.firestore().collection(EMULATOR_EMAIL_OUTBOX_COLLECTION).add({
      to: message.to,
      subject: message.subject,
      html: message.html,
      createdAt: new Date().toISOString(),
    });
    return { transport: "ses", sesMessageId: `emulator-${ref.id}` };
  }
  return sendSesEmailWithClient(getSesClient(config), {
    ...message,
    from: config.from,
    text: message.text ?? htmlToPlainText(message.html),
  });
};

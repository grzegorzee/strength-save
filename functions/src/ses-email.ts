import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SendEmailCommandOutput,
} from "@aws-sdk/client-sesv2";
import { defineSecret } from "firebase-functions/params";

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

export interface SesEmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
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
    },
  },
});

export const htmlToPlainText = (html: string): string => html
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>/gi, "\n")
  .replace(/<\/td>|<\/th>/gi, "\t")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;/gi, "'")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
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

export const sendSesEmail = async (message: Omit<SesEmailMessage, "from" | "text"> & {
  text?: string;
}): Promise<SesEmailResult> => {
  const config = readSesEmailConfig();
  if (!config) throw new Error("Amazon SES email transport is not configured");
  return sendSesEmailWithClient(getSesClient(config), {
    ...message,
    from: config.from,
    text: message.text ?? htmlToPlainText(message.html),
  });
};

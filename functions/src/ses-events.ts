// G-T2: czysta logika pipeline'u zdarzeń SES (SNS -> Firestore).
// Webhook w index.ts skleja: walidacja podpisu SNS + zapis email_events
// + aktualizacja email_log. Tu wyłącznie parsowanie i mapowanie (testowalne).

/** Zparsowana koperta SNS (bez walidacji podpisu — to robi webhook). */
export interface SnsEnvelope {
  type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  topicArn: string;
  message: string;
  subscribeUrl?: string;
  /** Pełny obiekt koperty — potrzebny walidatorowi podpisu. */
  raw: Record<string, unknown>;
}

/** Dokument email_events/{id}. */
export interface SesEventRecord {
  messageId: string;
  eventType: string;
  timestamp: string;
  to: string;
  subject?: string;
  bounceType?: string;
  complaintFeedbackType?: string;
  ipAddress?: string;
  userAgent?: string;
  link?: string;
}

/** Instrukcja aktualizacji email_log (wykonuje ją transakcja w webhoooku). */
export type SesLogUpdate =
  | { kind: "delivered"; deliveredAt: string }
  | { kind: "bounced"; bounceType?: string }
  | { kind: "complaint"; complaintFeedbackType?: string }
  | { kind: "failed"; reason: string }
  | { kind: "open"; timestamp: string }
  | { kind: "click"; timestamp: string; link?: string }
  | null;

export interface MappedSesEvent {
  /** Idempotentny klucz dokumentu: messageId-EventType-timestampMs (bez spacji). */
  id: string;
  record: SesEventRecord;
  logUpdate: SesLogUpdate;
}

/** Stan wpisu email_log potrzebny do wyliczenia aktualizacji. */
export interface EmailLogState {
  status?: string;
  openedAt?: string;
  openCount?: number;
  clickedAt?: string;
  clickCount?: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

export function parseSnsEnvelope(body: string): SnsEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const type = str(parsed.Type);
  if (type !== "SubscriptionConfirmation" && type !== "Notification" && type !== "UnsubscribeConfirmation") return null;
  const topicArn = str(parsed.TopicArn);
  if (!topicArn) return null;
  return {
    type,
    topicArn,
    message: str(parsed.Message) ?? "",
    ...(str(parsed.SubscribeURL) ? { subscribeUrl: str(parsed.SubscribeURL) } : {}),
    raw: parsed,
  };
}

/** Timestamp sekcji zdarzenia (delivery/open/click...) albo mail.timestamp. */
const eventTimestamp = (event: Record<string, unknown>, mailTs: string): string => {
  for (const key of ["delivery", "bounce", "complaint", "open", "click", "deliveryDelay"]) {
    const section = event[key];
    if (isRecord(section)) {
      const ts = str(section.timestamp);
      if (ts) return ts;
    }
  }
  return mailTs;
};

export function mapSesEvent(rawEvent: unknown): MappedSesEvent | null {
  if (!isRecord(rawEvent)) return null;
  const eventType = str(rawEvent.eventType);
  const mail = rawEvent.mail;
  if (!eventType || !isRecord(mail)) return null;
  const messageId = str(mail.messageId);
  const mailTs = str(mail.timestamp);
  if (!messageId || !mailTs) return null;

  const destination = Array.isArray(mail.destination) ? mail.destination : [];
  const to = str(destination[0]) ?? "";
  const commonHeaders = isRecord(mail.commonHeaders) ? mail.commonHeaders : {};
  const subject = str(commonHeaders.subject);

  const timestamp = eventTimestamp(rawEvent, mailTs);
  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) return null;

  const record: SesEventRecord = {
    messageId,
    eventType,
    timestamp,
    to,
    ...(subject ? { subject } : {}),
  };
  let logUpdate: SesLogUpdate = null;

  switch (eventType) {
    case "Send":
    case "DeliveryDelay":
      break;
    case "Delivery":
      logUpdate = { kind: "delivered", deliveredAt: timestamp };
      break;
    case "Bounce": {
      const bounce = isRecord(rawEvent.bounce) ? rawEvent.bounce : {};
      const bounceType = str(bounce.bounceType);
      if (bounceType) record.bounceType = bounceType;
      logUpdate = { kind: "bounced", ...(bounceType ? { bounceType } : {}) };
      break;
    }
    case "Complaint": {
      const complaint = isRecord(rawEvent.complaint) ? rawEvent.complaint : {};
      const feedbackType = str(complaint.complaintFeedbackType);
      if (feedbackType) record.complaintFeedbackType = feedbackType;
      const userAgent = str(complaint.userAgent);
      if (userAgent) record.userAgent = userAgent;
      logUpdate = { kind: "complaint", ...(feedbackType ? { complaintFeedbackType: feedbackType } : {}) };
      break;
    }
    case "Open": {
      const open = isRecord(rawEvent.open) ? rawEvent.open : {};
      const ipAddress = str(open.ipAddress);
      if (ipAddress) record.ipAddress = ipAddress;
      const userAgent = str(open.userAgent);
      if (userAgent) record.userAgent = userAgent;
      logUpdate = { kind: "open", timestamp };
      break;
    }
    case "Click": {
      const click = isRecord(rawEvent.click) ? rawEvent.click : {};
      const ipAddress = str(click.ipAddress);
      if (ipAddress) record.ipAddress = ipAddress;
      const userAgent = str(click.userAgent);
      if (userAgent) record.userAgent = userAgent;
      const link = str(click.link);
      if (link) record.link = link;
      logUpdate = { kind: "click", timestamp, ...(link ? { link } : {}) };
      break;
    }
    case "Reject": {
      const reject = isRecord(rawEvent.reject) ? rawEvent.reject : {};
      logUpdate = { kind: "failed", reason: str(reject.reason) ?? "rejected" };
      break;
    }
    case "Rendering Failure": {
      const failure = isRecord(rawEvent.failure) ? rawEvent.failure : {};
      logUpdate = { kind: "failed", reason: str(failure.errorMessage) ?? "rendering-failure" };
      break;
    }
    default:
      // Nieznany typ (np. Subscription): zapisz sam rekord, bez dotykania logu.
      break;
  }

  return {
    id: `${messageId}-${eventType.replace(/\s+/g, "")}-${timestampMs}`,
    record,
    logUpdate,
  };
}

/**
 * Wylicza pola do merge'a na wpisie email_log. null = nic nie zmieniaj.
 * Niezmiennik: zdarzenia nie cofają mocniejszych statusów (complaint/bounced
 * zostają mimo późniejszego Delivery; failed nie nadpisuje delivered).
 */
export function applyLogUpdate(current: EmailLogState, update: SesLogUpdate): Record<string, unknown> | null {
  if (!update) return null;
  switch (update.kind) {
    case "delivered":
      return current.status === "sent"
        ? { status: "delivered", deliveredAt: update.deliveredAt }
        : { deliveredAt: update.deliveredAt };
    case "bounced":
      return { status: "bounced", ...(update.bounceType ? { bounceType: update.bounceType } : {}) };
    case "complaint":
      return { status: "complaint", ...(update.complaintFeedbackType ? { complaintFeedbackType: update.complaintFeedbackType } : {}) };
    case "failed":
      return current.status === "sent" ? { status: "failed", error: update.reason } : null;
    case "open":
      return { openedAt: current.openedAt ?? update.timestamp, openCount: (current.openCount ?? 0) + 1 };
    case "click":
      return { clickedAt: current.clickedAt ?? update.timestamp, clickCount: (current.clickCount ?? 0) + 1 };
  }
}

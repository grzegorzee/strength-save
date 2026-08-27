// G-T2: pipeline zdarzeń SES → Firestore. Fixtures w realnym formacie
// SES event publishing (SNS Notification.Message): obiekt mail + sekcja
// per typ zdarzenia. Kontrakty: idempotentne id dokumentu, mapowanie
// wszystkich typów, aktualizacja email_log bez cofania statusów.
import { describe, expect, it } from "vitest";
import {
  applyLogUpdate,
  emailEventExpiresAtMs,
  logUpdateFromRecord,
  mapSesEvent,
  parseSnsEnvelope,
  shouldApplySesLogUpdate,
  type EmailLogState,
} from "./ses-events";

const MESSAGE_ID = "0107019874abcdef-1111-2222-3333-444444444444-000000";

const mail = (over: Record<string, unknown> = {}) => ({
  timestamp: "2026-08-20T10:00:00.000Z",
  messageId: MESSAGE_ID,
  source: "Strength Save <noreply@strengthsave.app>",
  sourceArn: "arn:aws:ses:eu-central-1:123:identity/strengthsave.app",
  sendingAccountId: "123",
  destination: ["g.jasionowicz@gmail.com"],
  headersTruncated: false,
  commonHeaders: {
    from: ["Strength Save <noreply@strengthsave.app>"],
    to: ["g.jasionowicz@gmail.com"],
    subject: "Trening 2026-08-20 (Strength Save)",
  },
  tags: { "ses:configuration-set": ["strengthsave"] },
  ...over,
});

describe("mapSesEvent (G-T2)", () => {
  it("Send: rekord bez aktualizacji logu (status zostaje sent)", () => {
    const mapped = mapSesEvent({ eventType: "Send", mail: mail(), send: {} });
    expect(mapped).not.toBeNull();
    expect(mapped!.id).toBe(`${MESSAGE_ID}-Send-1787220000000`);
    expect(mapped!.record).toMatchObject({
      messageId: MESSAGE_ID,
      eventType: "Send",
      timestamp: "2026-08-20T10:00:00.000Z",
      to: "g.jasionowicz@gmail.com",
      subject: "Trening 2026-08-20 (Strength Save)",
    });
    expect(mapped!.logUpdate).toBeNull();
  });

  it("Delivery: delivered + deliveredAt z timestampu delivery", () => {
    const mapped = mapSesEvent({
      eventType: "Delivery",
      mail: mail(),
      delivery: {
        timestamp: "2026-08-20T10:00:05.000Z",
        processingTimeMillis: 5000,
        recipients: ["g.jasionowicz@gmail.com"],
        smtpResponse: "250 2.0.0 OK",
        reportingMTA: "a48-110.smtp-out.amazonses.com",
      },
    });
    expect(mapped!.id).toBe(`${MESSAGE_ID}-Delivery-1787220005000`);
    expect(mapped!.logUpdate).toEqual({ kind: "delivered", deliveredAt: "2026-08-20T10:00:05.000Z" });
  });

  it("Bounce: bounced z bounceType", () => {
    const mapped = mapSesEvent({
      eventType: "Bounce",
      mail: mail(),
      bounce: {
        bounceType: "Permanent",
        bounceSubType: "General",
        bouncedRecipients: [{ emailAddress: "g.jasionowicz@gmail.com", action: "failed", status: "5.1.1", diagnosticCode: "smtp; 550 5.1.1 user unknown" }],
        timestamp: "2026-08-20T10:00:07.000Z",
        feedbackId: "0100018-fb",
      },
    });
    expect(mapped!.record.bounceType).toBe("Permanent");
    expect(mapped!.logUpdate).toEqual({ kind: "bounced", bounceType: "Permanent" });
  });

  it("Complaint: complaint z complaintFeedbackType (sygnał spamu)", () => {
    const mapped = mapSesEvent({
      eventType: "Complaint",
      mail: mail(),
      complaint: {
        complainedRecipients: [{ emailAddress: "g.jasionowicz@gmail.com" }],
        timestamp: "2026-08-20T11:00:00.000Z",
        feedbackId: "0100018-fb",
        userAgent: "Yahoo!-Mail-Feedback/2.0",
        complaintFeedbackType: "abuse",
      },
    });
    expect(mapped!.record.complaintFeedbackType).toBe("abuse");
    expect(mapped!.logUpdate).toEqual({ kind: "complaint", complaintFeedbackType: "abuse" });
  });

  it("Open: open z timestampem, ip i user agent w rekordzie", () => {
    const mapped = mapSesEvent({
      eventType: "Open",
      mail: mail(),
      open: {
        ipAddress: "66.249.84.1",
        timestamp: "2026-08-20T12:00:00.000Z",
        userAgent: "Mozilla/5.0 (via ggpht.com GoogleImageProxy)",
      },
    });
    expect(mapped!.record.ipAddress).toBe("66.249.84.1");
    expect(mapped!.record.userAgent).toContain("GoogleImageProxy");
    expect(mapped!.logUpdate).toEqual({ kind: "open", timestamp: "2026-08-20T12:00:00.000Z" });
  });

  it("Click: click z linkiem", () => {
    const mapped = mapSesEvent({
      eventType: "Click",
      mail: mail(),
      click: {
        ipAddress: "66.249.84.1",
        timestamp: "2026-08-20T12:05:00.000Z",
        userAgent: "Mozilla/5.0",
        link: "https://app.strengthsave.app/",
        linkTags: null,
      },
    });
    expect(mapped!.record.link).toBe("https://app.strengthsave.app/");
    expect(mapped!.logUpdate).toEqual({ kind: "click", timestamp: "2026-08-20T12:05:00.000Z", link: "https://app.strengthsave.app/" });
  });

  it("Reject: failed z powodem", () => {
    const mapped = mapSesEvent({
      eventType: "Reject",
      mail: mail(),
      reject: { reason: "Bad content" },
    });
    expect(mapped!.logUpdate).toEqual({ kind: "failed", reason: "Bad content" });
  });

  it("DeliveryDelay: rekord bez aktualizacji logu", () => {
    const mapped = mapSesEvent({
      eventType: "DeliveryDelay",
      mail: mail(),
      deliveryDelay: {
        timestamp: "2026-08-20T10:30:00.000Z",
        delayType: "MailboxFull",
        expirationTime: "2026-08-21T10:00:00.000Z",
        delayedRecipients: [{ emailAddress: "g.jasionowicz@gmail.com", status: "4.2.2", diagnosticCode: "smtp; 452 mailbox full" }],
      },
    });
    expect(mapped!.record.eventType).toBe("DeliveryDelay");
    expect(mapped!.logUpdate).toBeNull();
  });

  it("Rendering Failure: failed, id dokumentu bez spacji", () => {
    const mapped = mapSesEvent({
      eventType: "Rendering Failure",
      mail: mail(),
      failure: { errorMessage: "Attribute 'name' is not present in the rendering data", templateName: "x" },
    });
    expect(mapped!.id).toBe(`${MESSAGE_ID}-RenderingFailure-1787220000000`);
    expect(mapped!.logUpdate).toEqual({ kind: "failed", reason: "Attribute 'name' is not present in the rendering data" });
  });

  it("śmieci (brak mail.messageId, nie-obiekt) = null", () => {
    expect(mapSesEvent(null)).toBeNull();
    expect(mapSesEvent("Delivery")).toBeNull();
    expect(mapSesEvent({ eventType: "Delivery" })).toBeNull();
    expect(mapSesEvent({ eventType: "Delivery", mail: { timestamp: "x" } })).toBeNull();
  });
});

describe("retencja szczegółowych zdarzeń SES", () => {
  it("wyznacza TTL dokładnie 180 dni po zdarzeniu", () => {
    expect(emailEventExpiresAtMs("2026-08-20T12:05:00.000Z"))
      .toBe(Date.parse("2027-02-16T12:05:00.000Z"));
  });

  it("odrzuca nieprawidłowy timestamp zamiast tworzyć wieczny rekord", () => {
    expect(() => emailEventExpiresAtMs("not-a-date")).toThrow(/timestamp/i);
  });
});

describe("idempotencja i późna rekonsyliacja email_log", () => {
  it("ten sam event może zaktualizować dany log tylko raz", () => {
    expect(shouldApplySesLogUpdate([], "log-1")).toBe(true);
    expect(shouldApplySesLogUpdate(["log-1"], "log-1")).toBe(false);
    expect(shouldApplySesLogUpdate(["inny-log"], "log-1")).toBe(true);
  });

  it("odtwarza aktualizację open/click z trwałego rekordu po wyścigu event → log", () => {
    expect(logUpdateFromRecord({
      messageId: "m1", eventType: "Open", timestamp: "2026-08-20T12:00:00.000Z", to: "u@example.com",
    })).toEqual({ kind: "open", timestamp: "2026-08-20T12:00:00.000Z" });
    expect(logUpdateFromRecord({
      messageId: "m1", eventType: "Click", timestamp: "2026-08-20T12:05:00.000Z", to: "u@example.com", link: "https://strengthsave.app",
    })).toEqual({ kind: "click", timestamp: "2026-08-20T12:05:00.000Z", link: "https://strengthsave.app" });
  });
});

describe("applyLogUpdate (G-T2)", () => {
  const sent: EmailLogState = { status: "sent" };

  it("delivered na sent ustawia status i deliveredAt", () => {
    expect(applyLogUpdate(sent, { kind: "delivered", deliveredAt: "T1" }))
      .toEqual({ status: "delivered", deliveredAt: "T1" });
  });

  it("delivered NIE cofa statusu complaint (zostaje sygnał spamu)", () => {
    expect(applyLogUpdate({ status: "complaint" }, { kind: "delivered", deliveredAt: "T1" }))
      .toEqual({ deliveredAt: "T1" });
  });

  it("bounced nadpisuje status zawsze, z bounceType", () => {
    expect(applyLogUpdate({ status: "delivered" }, { kind: "bounced", bounceType: "Transient" }))
      .toEqual({ status: "bounced", bounceType: "Transient" });
  });

  it("complaint nadpisuje status zawsze", () => {
    expect(applyLogUpdate({ status: "delivered" }, { kind: "complaint", complaintFeedbackType: "abuse" }))
      .toEqual({ status: "complaint", complaintFeedbackType: "abuse" });
  });

  it("failed tylko z sent (nie cofa delivered)", () => {
    expect(applyLogUpdate(sent, { kind: "failed", reason: "Bad content" }))
      .toEqual({ status: "failed", error: "Bad content" });
    expect(applyLogUpdate({ status: "delivered" }, { kind: "failed", reason: "x" })).toBeNull();
  });

  it("open: pierwsze otwarcie ustawia openedAt, kolejne tylko licznik", () => {
    expect(applyLogUpdate(sent, { kind: "open", timestamp: "T1" }))
      .toEqual({ openedAt: "T1", openCount: 1 });
    expect(applyLogUpdate({ status: "delivered", openedAt: "T1", openCount: 3 }, { kind: "open", timestamp: "T2" }))
      .toEqual({ openedAt: "T1", openCount: 4 });
  });

  it("click: clickedAt pierwszy raz + licznik", () => {
    expect(applyLogUpdate(sent, { kind: "click", timestamp: "T1", link: "https://x" }))
      .toEqual({ clickedAt: "T1", clickCount: 1 });
    expect(applyLogUpdate({ status: "sent", clickedAt: "T1", clickCount: 1 }, { kind: "click", timestamp: "T2" }))
      .toEqual({ clickedAt: "T1", clickCount: 2 });
  });
});

describe("parseSnsEnvelope (G-T2)", () => {
  it("SubscriptionConfirmation: typ, topicArn i subscribeUrl", () => {
    const env = parseSnsEnvelope(JSON.stringify({
      Type: "SubscriptionConfirmation",
      MessageId: "165545c9-2a5c-472c-8df2-7ff2be2b3b1b",
      Token: "2336412f37...",
      TopicArn: "arn:aws:sns:eu-central-1:123:strengthsave-ses-events",
      Message: "You have chosen to subscribe...",
      SubscribeURL: "https://sns.eu-central-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn...",
      Timestamp: "2026-08-20T09:00:00.000Z",
      SignatureVersion: "1",
      Signature: "EXAMPLE",
      SigningCertURL: "https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-x.pem",
    }));
    expect(env).toMatchObject({
      type: "SubscriptionConfirmation",
      topicArn: "arn:aws:sns:eu-central-1:123:strengthsave-ses-events",
    });
    expect(env!.subscribeUrl).toContain("ConfirmSubscription");
  });

  it("Notification: typ, topicArn i surowy message", () => {
    const inner = JSON.stringify({ eventType: "Send", mail: mail(), send: {} });
    const env = parseSnsEnvelope(JSON.stringify({
      Type: "Notification",
      MessageId: "m1",
      TopicArn: "arn:aws:sns:eu-central-1:123:strengthsave-ses-events",
      Message: inner,
      Timestamp: "2026-08-20T10:00:01.000Z",
      SignatureVersion: "1",
      Signature: "EXAMPLE",
      SigningCertURL: "https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-x.pem",
    }));
    expect(env!.type).toBe("Notification");
    expect(env!.message).toBe(inner);
  });

  it("zepsuty JSON albo brak Type = null", () => {
    expect(parseSnsEnvelope("nie-json{")).toBeNull();
    expect(parseSnsEnvelope(JSON.stringify({ TopicArn: "x" }))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  buildSesEmailCommandInput,
  normalizeSesEmailConfig,
  safeSesErrorCode,
  sendSesEmailWithClient,
} from "./ses-email";

describe("shared Amazon SES email transport", () => {
  it("rejects missing and placeholder credentials instead of falling back to another provider", () => {
    expect(normalizeSesEmailConfig({
      region: "eu-central-1",
      accessKeyId: "unset",
      secretAccessKey: "secret",
      from: "Strength Save <noreply@strengthsave.app>",
    })).toBeNull();
  });

  it("builds a UTF-8 multipart message for the exact recipient", () => {
    expect(buildSesEmailCommandInput({
      from: "Strength Save <noreply@strengthsave.app>",
      to: "contact@strengthsave.app",
      subject: "Nowe zgłoszenie",
      html: "<h1>Błąd</h1><p>Nie zapisuje serii.</p>",
      text: "Błąd\n\nNie zapisuje serii.",
    })).toEqual({
      FromEmailAddress: "Strength Save <noreply@strengthsave.app>",
      ReplyToAddresses: ["contact@strengthsave.app"],
      ConfigurationSetName: "strengthsave",
      Destination: { ToAddresses: ["contact@strengthsave.app"] },
      Content: {
        Simple: {
          Subject: { Data: "Nowe zgłoszenie", Charset: "UTF-8" },
          Body: {
            Html: { Data: "<h1>Błąd</h1><p>Nie zapisuje serii.</p>", Charset: "UTF-8" },
            Text: { Data: "Błąd\n\nNie zapisuje serii.", Charset: "UTF-8" },
          },
        },
      },
    });
  });

  // 2026-09-29: odpowiedź na mail z noreply@ trafiała w próżnię. Domyślny
  // Reply-To prowadzi do skrzynki supportu, która ma odbiór (MX od 16.09).
  it("defaults Reply-To to the support mailbox and lets a message override it", () => {
    const base = { from: "noreply@strengthsave.app", to: "u@example.com", subject: "S", html: "<p>B</p>", text: "B" };
    expect(buildSesEmailCommandInput(base).ReplyToAddresses).toEqual(["contact@strengthsave.app"]);
    expect(buildSesEmailCommandInput({ ...base, replyTo: ["jan@example.com"] }).ReplyToAddresses)
      .toEqual(["jan@example.com"]);
  });

  it("passes custom headers (List-Unsubscribe) and omits the field when there are none", () => {
    const base = { from: "noreply@strengthsave.app", to: "u@example.com", subject: "S", html: "<p>B</p>", text: "B" };
    expect(buildSesEmailCommandInput(base).Content?.Simple?.Headers).toBeUndefined();
    const withHeaders = buildSesEmailCommandInput({
      ...base,
      headers: [
        { name: "List-Unsubscribe", value: "<https://example.com/u?t=1>" },
        { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
      ],
    });
    expect(withHeaders.Content?.Simple?.Headers).toEqual([
      { Name: "List-Unsubscribe", Value: "<https://example.com/u?t=1>" },
      { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
    ]);
  });

  it("returns the SES MessageId used by delivery-event correlation", async () => {
    const sent: unknown[] = [];
    const result = await sendSesEmailWithClient({
      send: async (command) => {
        sent.push(command);
        return { MessageId: "ses-message-123" };
      },
    }, {
      from: "noreply@strengthsave.app",
      to: "user@example.com",
      subject: "Subject",
      html: "<p>Body</p>",
      text: "Body",
    });

    expect(sent).toHaveLength(1);
    expect(result).toEqual({ transport: "ses", sesMessageId: "ses-message-123" });
  });

  it("reduces provider failures to a bounded non-sensitive code", () => {
    expect(safeSesErrorCode({ name: "TooManyRequestsException", message: "secret detail" }))
      .toBe("TooManyRequestsException");
    expect(safeSesErrorCode(new Error("raw socket and credential context")))
      .toBe("ses-send-failed");
  });
});

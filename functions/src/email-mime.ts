// J-T4: RAW MIME dla SES Content.Raw — załączniki wymagają multipart/mixed,
// a SES Simple ich nie wspiera. Składane ręcznie (bez nowych zależności):
// wszystkie części w base64, więc boundary z '_' (spoza alfabetu base64)
// nigdy nie koliduje z treścią. CRLF zgodnie z RFC 5322.
import { randomBytes } from "node:crypto";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Treść jako string UTF-8 (np. CSV z BOM). */
  content: string;
}

export interface RawEmailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments: EmailAttachment[];
}

/** Base64 łamane na linie po 76 znaków (limit linii RFC to 998). */
const base64Lines = (content: string): string =>
  Buffer.from(content, "utf8").toString("base64").replace(/(.{76})(?=.)/g, "$1\r\n");

/** Temat zawsze jako encoded-word UTF-8 (RFC 2047) — zero zgadywania ASCII. */
const encodeSubject = (subject: string): string =>
  `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;

export function buildRawEmail(input: RawEmailInput): Buffer {
  const boundary = `=_ss_${randomBytes(12).toString("hex")}`;
  const lines: string[] = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.html),
  ];
  for (const attachment of input.attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(attachment.content),
    );
  }
  lines.push(`--${boundary}--`, "");
  return Buffer.from(lines.join("\r\n"), "utf8");
}

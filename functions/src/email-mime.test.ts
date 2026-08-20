// J-T4: RAW MIME dla SES (Content.Raw) — multipart/mixed budowany ręcznie,
// bez nowych zależności. Testy graniczne: struktura, kodowanie UTF-8,
// bezpieczeństwo boundary, długość linii.
import { describe, expect, it } from "vitest";
import { buildRawEmail } from "./email-mime";

const input = () => ({
  from: "Strength Save <noreply@strengthsave.app>",
  to: "g.jasionowicz@gmail.com",
  subject: "Strength Save: treningi Grzegorz, 14.08.2026 do 20.08.2026",
  html: "<p>Trening: przysiad 100 kg × 5, ból: bark</p>",
  attachments: [{
    filename: "strength-save-workouts.csv",
    contentType: "text/csv; charset=UTF-8",
    content: "﻿date,day\r\n2026-08-20,Czwartek\r\n",
  }],
});

const raw = () => buildRawEmail(input()).toString("utf8");

describe("buildRawEmail", () => {
  it("multipart/mixed: nagłówki, część HTML, załącznik CSV, domknięty boundary", () => {
    const msg = raw();
    expect(msg).toContain("From: Strength Save <noreply@strengthsave.app>\r\n");
    expect(msg).toContain("To: g.jasionowicz@gmail.com\r\n");
    expect(msg).toContain("MIME-Version: 1.0\r\n");
    expect(msg).toMatch(/Content-Type: multipart\/mixed; boundary="[^"]+"\r\n/);
    expect(msg).toContain("Content-Type: text/html; charset=UTF-8\r\n");
    expect(msg).toContain('Content-Type: text/csv; charset=UTF-8; name="strength-save-workouts.csv"\r\n');
    expect(msg).toContain('Content-Disposition: attachment; filename="strength-save-workouts.csv"\r\n');
    const boundary = msg.match(/boundary="([^"]+)"/)?.[1] ?? "";
    expect(msg.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
  });

  it("temat z polskimi znakami jako encoded-word UTF-8, dekoduje się do oryginału", () => {
    const msg = raw();
    const match = msg.match(/Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=\r\n/);
    expect(match).not.toBeNull();
    expect(Buffer.from(match![1], "base64").toString("utf8")).toBe(input().subject);
  });

  it("HTML i CSV w base64 dekodują się do oryginału (BOM i polskie znaki bez strat)", () => {
    const msg = raw();
    const boundary = msg.match(/boundary="([^"]+)"/)?.[1] ?? "";
    const parts = msg.split(`--${boundary}`);
    const htmlB64 = parts[1].split("\r\n\r\n")[1].replace(/\r\n/g, "");
    const csvB64 = parts[2].split("\r\n\r\n")[1].replace(/\r\n/g, "");
    expect(Buffer.from(htmlB64, "base64").toString("utf8")).toBe(input().html);
    expect(Buffer.from(csvB64, "base64").toString("utf8")).toBe(input().attachments[0].content);
  });

  it("boundary nie może kolidować z treścią: zawiera '_' (spoza alfabetu base64)", () => {
    const msg = raw();
    const boundary = msg.match(/boundary="([^"]+)"/)?.[1] ?? "";
    expect(boundary).toContain("_");
    // Treść części jest w base64 (A-Za-z0-9+/=), więc nigdy nie zawiera boundary.
    const occurrences = msg.split(boundary).length - 1;
    expect(occurrences).toBe(4); // deklaracja + 2 separatory + domknięcie
  });

  it("każdy nowy mail ma inny boundary, linie nie przekraczają limitu RFC", () => {
    const a = buildRawEmail(input()).toString("utf8");
    const b = buildRawEmail(input()).toString("utf8");
    expect(a.match(/boundary="([^"]+)"/)?.[1]).not.toBe(b.match(/boundary="([^"]+)"/)?.[1]);
    for (const line of a.split("\r\n")) expect(line.length).toBeLessThanOrEqual(998);
  });

  it("długi HTML (>76 znaków base64) jest łamany na linie", () => {
    const long = { ...input(), html: `<p>${"żółć ".repeat(500)}</p>` };
    const msg = buildRawEmail(long).toString("utf8");
    const boundary = msg.match(/boundary="([^"]+)"/)?.[1] ?? "";
    const htmlPart = msg.split(`--${boundary}`)[1];
    const b64Lines = htmlPart.split("\r\n\r\n")[1].trim().split("\r\n");
    expect(b64Lines.length).toBeGreaterThan(1);
    for (const line of b64Lines) expect(line.length).toBeLessThanOrEqual(76);
    expect(Buffer.from(b64Lines.join(""), "base64").toString("utf8")).toBe(long.html);
  });
});

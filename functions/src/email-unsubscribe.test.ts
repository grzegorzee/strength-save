import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  deriveUnsubscribeKey,
  handleUnsubscribeRequest,
  listUnsubscribeHeaders,
  unsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "./email-unsubscribe";

// 2026-09-29: one-click unsubscribe (RFC 8058) dla cotygodniowego digestu.
// Link w nagłówku List-Unsubscribe musi DZIAŁAĆ: POST wyłącza
// notificationPrefs.weeklyDigest, GET (skanery linków, przeglądarka) niczego
// nie zmienia i pokazuje przycisk potwierdzenia.

const key = deriveUnsubscribeKey("test-pepper");

describe("token wypisu", () => {
  it("jest deterministyczny per uid i weryfikowalny tylko tym samym kluczem", () => {
    const token = unsubscribeToken("uid-1", key);
    expect(token).toBe(unsubscribeToken("uid-1", key));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyUnsubscribeToken("uid-1", token, key)).toBe(true);
    expect(verifyUnsubscribeToken("uid-2", token, key)).toBe(false);
    expect(verifyUnsubscribeToken("uid-1", token, deriveUnsubscribeKey("inny-pepper"))).toBe(false);
    expect(verifyUnsubscribeToken("uid-1", "zly", key)).toBe(false);
    expect(verifyUnsubscribeToken("uid-1", undefined, key)).toBe(false);
  });

  it("klucz wypisu jest wyprowadzony z peppera, nie jest nim samym", () => {
    expect(key.toString("utf8")).not.toBe("test-pepper");
    expect(key).toHaveLength(32);
  });

  it("URL https i nagłówki one-click", () => {
    const url = unsubscribeUrl("uid-1", key);
    expect(url.startsWith("https://")).toBe(true);
    expect(url).toContain("u=uid-1");
    expect(url).toContain(`t=${unsubscribeToken("uid-1", key)}`);
    expect(listUnsubscribeHeaders(url)).toEqual([
      { name: "List-Unsubscribe", value: `<${url}>` },
      { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
    ]);
  });
});

describe("handleUnsubscribeRequest", () => {
  const token = unsubscribeToken("uid-1", key);

  it("POST z poprawnym tokenem wyłącza digest i zwraca 200", async () => {
    const optOut = vi.fn(async () => undefined);
    const res = await handleUnsubscribeRequest({ key, optOut }, { method: "POST", uid: "uid-1", token });
    expect(optOut).toHaveBeenCalledWith("uid-1");
    expect(res.status).toBe(200);
    expect(res.body).toContain("wyłączone");
  });

  it("GET niczego nie zmienia, pokazuje formularz POST na ten sam adres", async () => {
    const optOut = vi.fn(async () => undefined);
    const res = await handleUnsubscribeRequest({ key, optOut }, { method: "GET", uid: "uid-1", token });
    expect(optOut).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toContain('method="post"');
    expect(res.body).toContain(`t=${token}`);
  });

  it("zły token: 400 bez zmian (także dla POST)", async () => {
    const optOut = vi.fn(async () => undefined);
    const res = await handleUnsubscribeRequest({ key, optOut }, { method: "POST", uid: "uid-2", token });
    expect(optOut).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
  });

  it("inna metoda: 405", async () => {
    const res = await handleUnsubscribeRequest({ key, optOut: vi.fn() }, { method: "PUT", uid: "uid-1", token });
    expect(res.status).toBe(405);
  });

  it("awaria zapisu: 500, żeby klient pocztowy mógł ponowić", async () => {
    const optOut = vi.fn(async () => { throw new Error("firestore down"); });
    const res = await handleUnsubscribeRequest({ key, optOut }, { method: "POST", uid: "uid-1", token });
    expect(res.status).toBe(500);
  });

  it("strona nie zawiera pauz ani wykrzykników", async () => {
    const res = await handleUnsubscribeRequest({ key, optOut: vi.fn(async () => undefined) }, { method: "POST", uid: "uid-1", token });
    expect(res.body).not.toMatch(/[–—]/);
    expect(res.body.replace("<!DOCTYPE", "")).not.toContain("!");
  });
});

describe("funkcja HTTP", () => {
  it("emailUnsubscribe jest eksportowana z index i używa sekretu API_KEY_PEPPER", () => {
    const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(index).toContain('export { emailUnsubscribe } from "./email-unsubscribe";');
    const source = readFileSync(new URL("./email-unsubscribe.ts", import.meta.url), "utf8");
    expect(source).toMatch(/export const emailUnsubscribe = onRequest\(\{[^}]*secrets: \[unsubscribePepper\]/);
  });
});

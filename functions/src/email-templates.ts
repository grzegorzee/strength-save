// Szablony maili transakcyjnych (treść + tematy). Trzymane w kodzie, bo:
// wersjonowane w git, testowalne, typowane, i18n PL/EN, łatwa zmiana providera.
// registration.ts importuje stąd buildery i przekazuje wynik do Resend.

export type Lang = "pl" | "en";

// Deep link do natywnej aplikacji (custom URL scheme zarejestrowany w iOS Info.plist
// i Android AndroidManifest.xml). Otwiera Strength Save na telefonie.
const APP_DEEP_LINK = "strengthsave://open";

// ── Tematy maili (i18n; kod wstawiony w temat weryfikacji) ───────────────────
export function verificationSubject(code: string, lang: Lang): string {
  return lang === "en"
    ? `Strength Save verification code: ${code}`
    : `Kod weryfikacyjny Strength Save: ${code}`;
}

export function welcomeSubject(lang: Lang): string {
  return lang === "en" ? "Strength Save: account ready" : "Strength Save: konto gotowe";
}

export function accessChangedSubject(lang: Lang): string {
  return lang === "en"
    ? "Strength Save: account access change"
    : "Strength Save: zmiana dostępu do konta";
}

// ── Treści HTML ──────────────────────────────────────────────────────────────
export function verificationEmailHtml(code: string, email: string, lang: Lang): string {
  const t = lang === "en"
    ? {
        title: "Confirm your email",
        intro: `Use the code below to finish signing up for Strength Save for ${email}.`,
        expires: "The code expires in 10 minutes.",
      }
    : {
        title: "Potwierdź adres email",
        intro: `Użyj poniższego kodu, aby dokończyć rejestrację w Strength Save dla ${email}.`,
        expires: "Kod wygasa po 10 minutach.",
      };
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">${t.title}</h1>
      <p style="margin:0 0 24px;color:#475569;">${t.intro}</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:0.18em;text-align:center;padding:20px 0;border-radius:12px;background:#0f172a;color:#fff;">
        ${code}
      </div>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px;">${t.expires}</p>
    </div>
  </div>`;
}

export function welcomeEmailHtml(displayName: string, lang: Lang): string {
  const t = lang === "en"
    ? {
        title: "Welcome to Strength Save",
        body: `${displayName || "Hi"}, your account is ready. You can head to onboarding and start building your training plan.`,
        cta: "Open the app",
      }
    : {
        title: "Witamy w Strength Save",
        body: `${displayName || "Cześć"}, konto jest gotowe. Możesz przejść do onboardingu i zacząć układać swój plan treningowy.`,
        cta: "Otwórz aplikację",
      };
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">${t.title}</h1>
      <p style="margin:0 0 24px;color:#475569;">${t.body}</p>
      <a href="${APP_DEEP_LINK}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;">${t.cta}</a>
    </div>
  </div>`;
}

export function inviteEmailHtml(code: string, inviteUrl: string, note: string | null): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">Masz zaproszenie do Strength Save</h1>
      <p style="margin:0 0 16px;color:#475569;">Możesz wejść do aplikacji przez Google albo email + hasło. Jeśli aplikacja poprosi o kod zaproszenia, użyj:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:0.12em;text-align:center;padding:18px 0;border-radius:12px;background:#0f172a;color:#fff;">
        ${code}
      </div>
      ${note ? `<p style="margin:16px 0 0;color:#334155;">${note}</p>` : ""}
      <p style="margin:20px 0 12px;color:#64748b;">Bezpośredni link:</p>
      <a href="${inviteUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;">Otwórz aplikację</a>
    </div>
  </div>`;
}

export function accessChangedEmailHtml(enabled: boolean, lang: Lang): string {
  const t = lang === "en"
    ? {
        title: "Account access change",
        body: enabled
          ? "An administrator has re-enabled access to the app."
          : "An administrator has disabled access to the app.",
      }
    : {
        title: "Zmiana dostępu do konta",
        body: enabled
          ? "Administrator ponownie włączył dostęp do aplikacji."
          : "Administrator wyłączył dostęp do aplikacji.",
      };
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;padding:24px;background:#f8fafc;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 12px;font-size:24px;">${t.title}</h1>
      <p style="margin:0;color:#475569;">${t.body}</p>
    </div>
  </div>`;
}

// Prosty branded HTML dla maili admina (custom + broadcast).
export function adminMessageEmailHtml(body: string): string {
  const safe = body.replace(/\n/g, "<br/>");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <p style="font-weight:700;font-size:18px;color:#0e0e0e;margin:0 0 16px">Strength Save</p>
    <div style="font-size:15px;line-height:1.6">${safe}</div>
    <p style="margin-top:24px;font-size:12px;color:#888">Strength Save</p>
  </div>`;
}

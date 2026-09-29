// Szablony maili transakcyjnych (treść + tematy). Trzymane w kodzie, bo:
// wersjonowane w git, testowalne, typowane, i18n PL/EN, łatwa zmiana providera.
// registration.ts importuje stąd buildery i przekazuje wynik do Amazon SES.

// Lang i esc żyją w email-layout.ts (wspólny layout maili, 2026-09-29);
// re-eksport zostawia dotychczasowe importy bez zmian.
import {
  emailButton,
  emailCode,
  emailHeading,
  emailLink,
  emailMuted,
  emailParagraph,
  esc,
  renderEmailLayout,
  type Lang,
} from "./email-layout";

export { esc, type Lang };

// Adres webowy aplikacji. X29 WP-J: wcześniej deep link z custom URL scheme,
// ale taki link jest martwy w webmailach (Gmail/Outlook go nie otworzą).
const APP_WEB_URL = "https://app.strengthsave.app/";

const ACCOUNT_REASON: Record<Lang, string> = {
  pl: "Wiadomość dotyczy Twojego konta w Strength Save.",
  en: "This email is about your Strength Save account.",
};

// ── Tematy maili (i18n; kod wstawiony w temat weryfikacji) ───────────────────
export function verificationSubject(code: string, lang: Lang): string {
  return lang === "en"
    ? `Strength Save verification code: ${code}`
    : `Kod weryfikacyjny Strength Save: ${code}`;
}

export function welcomeSubject(lang: Lang): string {
  return lang === "en" ? "Strength Save: account ready" : "Strength Save: konto gotowe";
}

export function passwordResetSubject(lang: Lang): string {
  return lang === "en" ? "Strength Save: set a new password" : "Strength Save: ustaw nowe hasło";
}

export function accessChangedSubject(lang: Lang): string {
  return lang === "en"
    ? "Strength Save: account access change"
    : "Strength Save: zmiana dostępu do konta";
}

// ── Treści HTML (wspólny layout: email-layout.ts) ────────────────────────────
export function verificationEmailHtml(code: string, email: string, lang: Lang): string {
  const e = esc(email);
  const t = lang === "en"
    ? {
        title: "Confirm your email",
        preheader: "Your code expires in 10 minutes.",
        intro: `Use the code below to finish signing up for Strength Save for ${e}.`,
        expires: "The code expires in 10 minutes.",
        reason: "You got this email because this address was used to sign up for Strength Save. If it wasn't you, ignore it.",
      }
    : {
        title: "Potwierdź adres email",
        preheader: "Kod wygasa po 10 minutach.",
        intro: `Użyj poniższego kodu, aby dokończyć rejestrację w Strength Save dla ${e}.`,
        expires: "Kod wygasa po 10 minutach.",
        reason: "Dostajesz ten mail, bo ten adres podano przy rejestracji w Strength Save. Jeśli to nie Ty, zignoruj go.",
      };
  return renderEmailLayout({
    lang,
    preheader: t.preheader,
    reason: t.reason,
    replyHint: true,
    bodyHtml: `${emailHeading(t.title)}
${emailParagraph(t.intro)}
${emailCode(code)}
${emailMuted(t.expires, "margin:0;")}`,
  });
}

// Reset hasła (2026-09-13): link z Firebase Auth wysyłany naszym kanałem (SES),
// bo Google blokuje edycję szablonów Firebase na tym projekcie. Przycisk +
// ten sam link jako tekst zapasowy (klienci pocztowi bez CSS, kopiowanie).
// Oba linki z ses:no-track: link z oobCode nie idzie przez przekierowanie
// śledzenia kliknięć SES (awstrack.me).
export function passwordResetEmailHtml(link: string, email: string, lang: Lang): string {
  const e = esc(email);
  const l = esc(link);
  const t = lang === "en"
    ? {
        title: "Set a new password",
        preheader: "Link to set a new password for your Strength Save account.",
        intro: `We received a request to set a new password for the Strength Save account <strong>${e}</strong>.`,
        cta: "Set a new password",
        fallback: "Button not working? Copy this link into your browser:",
        ignore: "If you didn't ask for this, ignore this email. Your password stays the same.",
      }
    : {
        title: "Ustaw nowe hasło",
        preheader: "Link do ustawienia nowego hasła do konta Strength Save.",
        intro: `Dostaliśmy prośbę o ustawienie nowego hasła do konta <strong>${e}</strong> w Strength Save.`,
        cta: "Ustaw nowe hasło",
        fallback: "Przycisk nie działa? Skopiuj ten link do przeglądarki:",
        ignore: "Jeśli to nie Twoje zgłoszenie, zignoruj tę wiadomość: hasło zostaje bez zmian.",
      };
  return renderEmailLayout({
    lang,
    preheader: t.preheader,
    reason: ACCOUNT_REASON[lang],
    replyHint: true,
    bodyHtml: `${emailHeading(t.title)}
${emailParagraph(t.intro, "margin:0 0 24px;")}
${emailButton(link, t.cta, { noTrack: true })}
${emailMuted(t.fallback, "margin:0 0 6px;")}
${emailMuted(emailLink(link, l, { noTrack: true }), "margin:0 0 24px;word-break:break-all;")}
${emailMuted(t.ignore, "margin:0;font-size:14px;")}`,
  });
}

export function welcomeEmailHtml(displayName: string, lang: Lang): string {
  const name = esc(displayName);
  const t = lang === "en"
    ? {
        title: "Welcome to Strength Save",
        preheader: "Your account is ready. Set up your training plan.",
        body: `${name || "Hi"}, your account is ready. Open the app to set up your training plan.`,
        cta: "Open the app",
      }
    : {
        title: "Witamy w Strength Save",
        preheader: "Konto jest gotowe, możesz ułożyć plan treningowy.",
        body: `${name || "Cześć"}, konto jest gotowe. Otwórz aplikację i ułóż swój plan treningowy.`,
        cta: "Otwórz aplikację",
      };
  return renderEmailLayout({
    lang,
    preheader: t.preheader,
    reason: ACCOUNT_REASON[lang],
    replyHint: true,
    bodyHtml: `${emailHeading(t.title)}
${emailParagraph(t.body, "margin:0 0 24px;")}
${emailButton(APP_WEB_URL, t.cta)}`,
  });
}

export function inviteEmailHtml(
  code: string,
  inviteUrl: string,
  note: string | null,
  lang: Lang = "pl",
): string {
  // Z167: default PL — dzisiejsze wysyłki są polskie, parametr przyszłościowy.
  const t = lang === "en"
    ? {
        title: esc("You're invited to Strength Save"),
        preheader: "Your invite code and a link to the app.",
        body: "You can sign in with Google or email + password using this invite code:",
        link: "Direct link:",
        cta: "Open the app",
        reason: "You got this email because a Strength Save administrator sent an invite to this address.",
      }
    : {
        title: "Masz zaproszenie do Strength Save",
        preheader: "Kod zaproszenia i link do aplikacji.",
        body: "Możesz wejść do aplikacji przez Google albo email + hasło. Jeśli aplikacja poprosi o kod zaproszenia, użyj:",
        link: "Bezpośredni link:",
        cta: "Otwórz aplikację",
        reason: "Dostajesz ten mail, bo administrator Strength Save wysłał zaproszenie na ten adres.",
      };
  return renderEmailLayout({
    lang,
    preheader: t.preheader,
    reason: t.reason,
    replyHint: true,
    bodyHtml: `${emailHeading(t.title)}
${emailParagraph(t.body)}
${emailCode(code)}
${note ? emailParagraph(esc(note)) : ""}
${emailMuted(t.link)}
${emailButton(inviteUrl, t.cta, { noTrack: true })}`,
  });
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
  return renderEmailLayout({
    lang,
    preheader: t.body,
    reason: ACCOUNT_REASON[lang],
    replyHint: true,
    bodyHtml: `${emailHeading(t.title)}
${emailParagraph(t.body, "margin:0;")}`,
  });
}

// Maile admina (custom + broadcast): treść wpisana w panelu, zawsze PL.
// 2026-09-29: broadcast ma w stopce powód i drogę wyłączenia (plus nagłówek
// List-Unsubscribe z registration.ts); wiadomość 1:1 dotyczy konta.
export function adminMessageEmailHtml(body: string, options: { broadcast?: boolean } = {}): string {
  const safe = esc(body).replace(/\n/g, "<br/>");
  const firstLine = body.split("\n").map((line) => line.trim()).find(Boolean) ?? "Strength Save";
  return renderEmailLayout({
    lang: "pl",
    preheader: firstLine.slice(0, 90),
    reason: options.broadcast
      ? "Dostajesz ten mail, bo masz włączone ogłoszenia e-mail od zespołu Strength Save. Wyłączysz w aplikacji: Profil, Powiadomienia."
      : "Wiadomość od zespołu Strength Save dotyczy Twojego konta.",
    replyHint: true,
    bodyHtml: emailParagraph(safe, "margin:0;"),
  });
}

// ── Powiadomienie operatora o samodzielnym usunięciu konta (Z238) ─────────────
// Mail wewnętrzny (do operatora aplikacji), więc tylko PL.
export function selfDeletionNoticeSubject(email: string): string {
  return `Strength Save: użytkownik ${email} usunął konto`;
}

export function selfDeletionNoticeHtml(email: string, uid: string, purgeAfterIso: string): string {
  const e = esc(email);
  const u = esc(uid);
  const date = esc(purgeAfterIso.slice(0, 10));
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <p style="font-weight:700;font-size:18px;color:#0e0e0e;margin:0 0 16px">Strength Save</p>
    <div style="font-size:15px;line-height:1.6">
      <p>Użytkownik <strong>${e}</strong> (uid: <code>${u}</code>) usunął swoje konto.</p>
      <p>Logowanie zostało zablokowane od razu. Dane zostaną trwale wymazane po 30 dniach karencji: <strong>${date}</strong> (cron resumeDeletionOperations).</p>
      <p>Aby anulować usunięcie przed tą datą: odczytaj <code>recoveryProfile</code> z <code>deletion_operations/${u}</code>, przywróć z niego status i access w <code>users/${u}</code>, usuń pole <code>deletionPending</code>, a następnie usuń operację i utwórz ponownie konto Auth z tym samym uid (Admin SDK importUsers). Urządzenia i Strava wymagają ponownego połączenia.</p>
    </div>
    <p style="margin-top:24px;font-size:12px;color:#888">Strength Save</p>
  </div>`;
}

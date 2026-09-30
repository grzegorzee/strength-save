// 2026-09-29 (audyt maili): jeden layout dla wszystkich maili do użytkownika.
// Zasady klientów pocztowych:
// - tabele + inline CSS (Gmail/Outlook wycinają flex/grid i arkusze zewnętrzne),
// - zero obrazków: wordmark tekstowy z limonkowym akcentem (G-T3). Obrazy są
//   domyślnie blokowane u nowych nadawców, a mail bez nich nie zależy od webu,
// - jawnie jasny motyw (`color-scheme: light`): Apple Mail nie odwraca kolorów,
//   a klienty wymuszające ciemny motyw (Gmail app) dostają kolory tła jako
//   atrybut `bgcolor` i obramowania w tym samym kolorze (lekcja c7e32497),
// - ukryty preheader (tekst zapowiedzi w skrzynce) otoczony znacznikami,
//   żeby wersja text/plain go pomijała,
// - stopka: powód wysyłki i droga do pomocy. 2026-09-30 (zgłoszenie
//   właściciela): bez danych firmy, imienia, nazwiska i adresu. Dane
//   usługodawcy (art. 5 u.ś.u.d.e.) są w polityce prywatności i regulaminie
//   na stronie. Wyjątek: informacja handlowa (broadcast), gdzie art. 9 ust. 2
//   pkt 1 wymaga oznaczenia podmiotu i jego adresu elektronicznego
//   (bez adresu pocztowego), patrz `serviceProviderNotice`.
export type Lang = "pl" | "en";

// Escape HTML dla wartości interpolowanych do maili (email, displayName, note, body
// mogą zawierać znaki sterujące z OAuth/inputu admina). Zapobiega HTML injection.
export function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EMAIL_COLORS = {
  bg: "#f6f7f9",
  card: "#ffffff",
  text: "#111827",
  body: "#374151",
  muted: "#6b7280",
  border: "#e5e7eb",
  lime: "#ccfc22",
  button: "#111827",
} as const;

export const EMAIL_FONT = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** Droga do pomocy, tekstem (maile raportowe i do trenera są bez linków). */
const HELP_LINE: Record<Lang, string> = {
  pl: "Strength Save · pomoc: strengthsave.app/support",
  en: "Strength Save · help: strengthsave.app/support",
};

/**
 * Oznaczenie usługodawcy TYLKO dla informacji handlowej (art. 9 ust. 2 pkt 1
 * u.ś.u.d.e.: oznaczenie podmiotu i jego adresy elektroniczne). Adres
 * pocztowy nie jest tam wymagany. Do weryfikacji prawnej (DECYZJE.md 2026-09-30).
 */
const SERVICE_PROVIDER_LINE: Record<Lang, string> = {
  pl: "Usługodawca: WEB3 POWER Grzegorz Jasionowicz, contact@strengthsave.app",
  en: "Service provider: WEB3 POWER Grzegorz Jasionowicz, contact@strengthsave.app",
};

const REPLY_HINT: Record<Lang, string> = {
  pl: "Masz pytanie? Odpowiedz na tę wiadomość.",
  en: "Questions? Reply to this email.",
};

export interface EmailFooterLink {
  label: string;
  href: string;
}

export interface EmailLayoutOptions {
  lang: Lang;
  /** Tekst zapowiedzi w skrzynce (niewidoczny w treści). */
  preheader: string;
  /** Treść karty (HTML już z escapowanymi danymi). */
  bodyHtml: string;
  /** Dlaczego odbiorca dostał ten mail: stała z kodu, bez danych usera (wstawiana jak HTML). */
  reason: string;
  /** Linki w stopce (tylko https). */
  footerLinks?: EmailFooterLink[];
  /** "Odpowiedz na tę wiadomość" ma sens tylko, gdy Reply-To trafia do supportu. */
  replyHint?: boolean;
  /** Informacja handlowa (broadcast): oznaczenie usługodawcy w stopce. */
  serviceProviderNotice?: boolean;
  /** Mail wewnętrzny do właściciela (alert subskrypcji): stopka bez linii pomocy. */
  internal?: boolean;
}

// Wypełniacz po preheaderze: część klientów dokleja do zapowiedzi początek
// treści, niewidoczne znaki zajmują to miejsce.
const PREHEADER_FILLER = "&#8199;&#65279;&#847;".repeat(40);

export const emailHeading = (text: string): string =>
  `<h1 style="${EMAIL_FONT}margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${EMAIL_COLORS.text};">${text}</h1>`;

export const emailParagraph = (html: string, extra = ""): string =>
  `<p style="${EMAIL_FONT}margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.body};${extra}">${html}</p>`;

export const emailMuted = (html: string, extra = ""): string =>
  `<p style="${EMAIL_FONT}margin:0 0 12px;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};${extra}">${html}</p>`;

/** Kod (weryfikacja, zaproszenie): duże cyfry na jasnym tle z limonkowym paskiem. */
export const emailCode = (code: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
    <tr><td align="center" bgcolor="${EMAIL_COLORS.bg}" style="background-color:${EMAIL_COLORS.bg};border-left:4px solid ${EMAIL_COLORS.lime};padding:18px 8px;${EMAIL_FONT}font-size:32px;font-weight:700;letter-spacing:0.18em;color:${EMAIL_COLORS.text};">${esc(code)}</td></tr>
  </table>`;

/**
 * Przycisk odporny na tryb ciemny i klienty bez CSS: bgcolor jako atrybut,
 * obramowanie w kolorze tła, jawny kolor tekstu także na <span>.
 * noTrack: link z danymi logowania nie idzie przez przekierowanie śledzenia
 * kliknięć SES (atrybut ses:no-track SES usuwa przed doręczeniem).
 */
export const emailButton = (href: string, label: string, options: { noTrack?: boolean } = {}): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 20px;">
    <tr><td bgcolor="${EMAIL_COLORS.button}" style="border-radius:10px;background-color:${EMAIL_COLORS.button};border:2px solid ${EMAIL_COLORS.button};">
      <a ${options.noTrack ? "ses:no-track " : ""}href="${esc(href)}" style="${EMAIL_FONT}display:inline-block;padding:12px 22px;border-radius:8px;background-color:${EMAIL_COLORS.button};color:#ffffff !important;font-size:15px;font-weight:600;text-decoration:none;"><span style="color:#ffffff;">${label}</span></a>
    </td></tr>
  </table>`;

export const emailLink = (href: string, label: string, options: { noTrack?: boolean } = {}): string =>
  `<a ${options.noTrack ? "ses:no-track " : ""}href="${esc(href)}" style="color:${EMAIL_COLORS.text};text-decoration:underline;">${label}</a>`;

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const { lang, preheader, bodyHtml, reason } = options;
  const links = (options.footerLinks ?? [])
    .map((link) => `<a href="${esc(link.href)}" style="color:${EMAIL_COLORS.muted};text-decoration:underline;">${esc(link.label)}</a>`)
    .join(" · ");
  const footerLine = (html: string) =>
    `<p style="${EMAIL_FONT}margin:0 0 6px;font-size:12px;line-height:1.5;color:${EMAIL_COLORS.muted};">${html}</p>`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Strength Save</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.bg};-webkit-text-size-adjust:100%;">
<!--preheader--><div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${EMAIL_COLORS.bg};">${esc(preheader)}${PREHEADER_FILLER}</div><!--/preheader-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${EMAIL_COLORS.bg}" style="border-collapse:collapse;background-color:${EMAIL_COLORS.bg};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;">
      <tr><td style="padding:0 4px 12px;">
        <div style="${EMAIL_FONT}font-size:14px;font-weight:800;letter-spacing:3px;color:${EMAIL_COLORS.text};">STRENGTH SAVE</div>
        <div style="height:4px;width:56px;background-color:${EMAIL_COLORS.lime};margin-top:4px;font-size:0;line-height:0;">&nbsp;</div>
      </td></tr>
      <tr><td bgcolor="${EMAIL_COLORS.card}" style="background-color:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:12px;padding:28px 24px;">
${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 4px 0;">
        ${options.replyHint ? footerLine(REPLY_HINT[lang]) : ""}
        ${footerLine(reason)}
        ${links ? footerLine(links) : ""}
        ${options.internal ? "" : footerLine(esc(HELP_LINE[lang]))}
        ${options.serviceProviderNotice ? footerLine(esc(SERVICE_PROVIDER_LINE[lang])) : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

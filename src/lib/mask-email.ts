// WP-G (plan X29): maskowanie adresu email w UI (Profil + sidebar desktop).
// Pierwszy znak części lokalnej i domeny widoczny, środek wypełniony U+2022,
// TLD (ostatni człon po kropce) w całości widoczny.

const BULLET = '•';

/** Klucz localStorage współdzielony przez Profil (toggle) i sidebar (odczyt). */
export const EMAIL_VISIBLE_KEY = 'ss-email-visible';

/** Czy user odsłonił email (default false = zamaskowany). */
export const readEmailVisible = (): boolean => {
  try {
    return localStorage.getItem(EMAIL_VISIBLE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const storeEmailVisible = (visible: boolean): void => {
  try {
    localStorage.setItem(EMAIL_VISIBLE_KEY, String(visible));
  } catch {
    // localStorage niedostępny — maska działa dalej, tylko bez persystencji.
  }
};

const maskPart = (part: string): string => part[0] + BULLET.repeat(part.length - 1);

/** `grzegorz@gmail.com` -> `g•••••••@g••••.com`; string bez `@` wraca bez zmian. */
export const maskEmail = (email: string): string => {
  const at = email.indexOf('@');
  if (at <= 0 || at === email.length - 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf('.');
  const maskedDomain = lastDot > 0
    ? maskPart(domain.slice(0, lastDot)) + domain.slice(lastDot)
    : maskPart(domain);
  return `${maskPart(local)}@${maskedDomain}`;
};

import type { LanguageCode } from '@/i18n';

// Lokalizacja słownictwa planu (nazwy dni, focus) zapisanego po polsku w danych
// planu/cyklu. PL pozostaje kanoniczne w Firestore; tłumaczymy tylko wyświetlanie.

const WEEKDAY_EN: Record<string, string> = {
  'Poniedziałek': 'Monday',
  'Wtorek': 'Tuesday',
  'Środa': 'Wednesday',
  'Czwartek': 'Thursday',
  'Piątek': 'Friday',
  'Sobota': 'Saturday',
  'Niedziela': 'Sunday',
};

// Tokeny focusu (np. "Góra A" -> "Upper A"). Tłumaczymy znane słowa, resztę (litery,
// liczby, terminy już angielskie jak Push/Pull/FBW) zostawiamy.
const FOCUS_TOKEN_EN: Record<string, string> = {
  'Góra': 'Upper',
  'Dół': 'Lower',
  'Nogi': 'Legs',
  'Klatka': 'Chest',
  'Plecy': 'Back',
  'Barki': 'Shoulders',
  'Ramiona': 'Arms',
  'Brzuch': 'Core',
  'Pośladki': 'Glutes',
  'Łydki': 'Calves',
  'Ciało': 'Body',
  'Całe': 'Full',
  'Cały': 'Full',
  'Tył': 'Posterior',
  'Przód': 'Anterior',
  'Siła': 'Strength',
  'Wytrzymałość': 'Endurance',
};

const WEEKDAY_SHORT_EN: Record<string, string> = {
  'Pn': 'Mon', 'Wt': 'Tue', 'Śr': 'Wed', 'Cz': 'Thu', 'Pt': 'Fri', 'So': 'Sat', 'Nd': 'Sun',
};

/** Nazwa dnia w języku UI (mapuje kanoniczne polskie nazwy dni; inne zostawia). */
export const localizeDayName = (name: string, lang: LanguageCode): string => {
  if (lang !== 'en' || !name) return name;
  return WEEKDAY_EN[name] ?? name;
};

/** Skrót dnia w języku UI (Pn -> Mon). */
export const localizeWeekdayShort = (short: string, lang: LanguageCode): string => {
  if (lang !== 'en' || !short) return short;
  return WEEKDAY_SHORT_EN[short] ?? short;
};

/** Focus dnia w języku UI (tłumaczy znane tokeny, zachowuje litery/liczby/terminy EN). */
export const localizeFocus = (focus: string, lang: LanguageCode): string => {
  if (lang !== 'en' || !focus) return focus;
  return focus
    .split(/(\s+)/)
    .map((tok) => FOCUS_TOKEN_EN[tok] ?? tok)
    .join('');
};

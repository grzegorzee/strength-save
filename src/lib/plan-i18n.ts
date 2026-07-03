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
  'ciało': 'Body',
  'Całe': 'Full',
  'Cały': 'Full',
  'Tył': 'Posterior',
  'Przód': 'Anterior',
  'Siła': 'Strength',
  'Wytrzymałość': 'Endurance',
  'Kondycja': 'Conditioning',
  'Akcesoria': 'Accessories',
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

// Nazwy i opisy gotowych planów (planTemplates). W danych nazwy są po angielsku,
// a opisy po polsku — tu trzymamy obie wersje, żeby polski user widział polskie nazwy,
// a angielski — angielskie opisy. Kluczem jest id szablonu.
interface PlanText { pl: string; en: string }

const PLAN_NAME: Record<string, PlanText> = {
  'tpl-fullbody-2': { pl: 'Żelazny Fundament', en: 'Iron Foundation' },
  'tpl-fullbody-3': { pl: 'Zrównoważony Rozwój', en: 'Balanced Builder' },
  'tpl-ppl-3': { pl: 'Pchanie / Ciągnięcie / Nogi', en: 'Push Pull Legs Engine' },
  'tpl-ppl-6': { pl: 'Push Pull Legs ×2', en: 'Push Pull Legs ×2' },
  'tpl-upper-lower-4': { pl: 'Góra / Dół', en: 'Upper / Lower Forge' },
  'tpl-split-5': { pl: 'Split Hipertroficzny', en: 'Hypertrophy Split' },
  'tpl-push-pull-4': { pl: 'Protokół Napięcia', en: 'Tension Protocol' },
  'tpl-strength-5x5': { pl: 'Siła Fundamentalna', en: 'Foundational Strength' },
  'tpl-powerbuilding-4': { pl: 'Siła i Masa', en: 'Powerbuilding Protocol' },
  'tpl-lean-engine-4': { pl: 'Rzeźba i Kondycja', en: 'Lean Engine' },
  'tpl-athletic-4': { pl: 'Atletyczna Moc', en: 'Kinetic Athlete' },
};

const PLAN_DESC: Record<string, PlanText> = {
  'tpl-fullbody-2': {
    pl: 'Całe ciało na dwóch treningach. Idealny na start, powrót po przerwie albo tygodnie z mało czasu.',
    en: 'Full body across two sessions. Perfect for starting out, returning after a break, or busy weeks.',
  },
  'tpl-fullbody-3': {
    pl: 'Full Body 3 razy w tygodniu (A/B/C), każdy trening na całe ciało, na zmianę z dniem przerwy. Świetny stosunek efektów do czasu.',
    en: 'Full body 3× a week (A/B/C), each session full body, alternating with a rest day. Great results-to-time ratio.',
  },
  'tpl-ppl-3': {
    pl: 'Klasyczny podział na pchanie, ciągnięcie i nogi. Najpopularniejszy plan na budowę masy przy 3 treningach.',
    en: 'Classic push, pull, legs split. The most popular plan for building mass on 3 sessions.',
  },
  'tpl-upper-lower-4': {
    pl: 'Góra/dół dwa razy w tygodniu. Świetny balans siły i masy przy 4 treningach.',
    en: 'Upper/lower twice a week. A great balance of strength and size on 4 sessions.',
  },
  'tpl-ppl-6': {
    pl: 'Pełny cykl PPL dwa razy w tygodniu: 6 treningów pon-sob, każda partia trenowana 2×. Maksymalna objętość dla budowy masy przy wysokiej dyspozycyjności.',
    en: 'Full PPL cycle twice a week: 6 sessions Mon-Sat, every muscle group trained 2×. Maximum volume for building mass with high availability.',
  },
  'tpl-split-5': {
    pl: 'Klasyczny split na partie: klatka, plecy, nogi, barki, ramiona. Dla zaawansowanych z dużą objętością.',
    en: 'Classic body-part split: chest, back, legs, shoulders, arms. For advanced lifters with high volume.',
  },
  'tpl-push-pull-4': {
    pl: 'Plan z kontrolą RIR, tempa i przerw: 2× Push i 2× Pull, z mobilnością na rozgrzewce. Dla świadomego progresu. Sam wybierasz dni treningowe.',
    en: 'Plan with RIR, tempo and rest control: 2× Push and 2× Pull, with mobility in the warm-up. For deliberate progress. You pick the training days.',
  },
  'tpl-strength-5x5': {
    pl: 'Siła na bazie 5×5 na wielkich bojach (przysiad, wyciskanie, martwy ciąg, OHP, wiosłowanie). 3 treningi A/B, progres liniowy. Fundament siłowy.',
    en: 'Strength built on 5×5 of the big lifts (squat, bench, deadlift, OHP, row). 3 A/B sessions, linear progression. A strength foundation.',
  },
  'tpl-powerbuilding-4': {
    pl: 'Połączenie siły i masy: każdy dzień startuje ciężkim bojem (przysiad / wyciskanie / martwy ciąg / OHP), potem akcesoria hipertroficzne. Dla zaawansowanych.',
    en: 'Strength plus size: each day starts with a heavy lift (squat / bench / deadlift / OHP), then hypertrophy accessories. For advanced lifters.',
  },
  'tpl-lean-engine-4': {
    pl: 'Spalanie i rekompozycja: obwody całego ciała z krótkimi przerwami, wysokie powtórzenia i wstawki kondycyjne. Utrzymuje mięśnie przy redukcji.',
    en: 'Fat loss and recomposition: full-body circuits with short rests, high reps and conditioning finishers. Keeps muscle during a cut.',
  },
  'tpl-athletic-4': {
    pl: 'Moc i wydolność: ciężkie boje dla siły bazowej + wstawki eksplozywne i kondycyjne. Pod sport i funkcjonalną sprawność.',
    en: 'Power and conditioning: heavy lifts for base strength + explosive and conditioning work. For sport and functional fitness.',
  },
};

/** Nazwa gotowego planu w języku UI (PL kanoniczne dla polskiego usera). */
export const localizePlanName = (id: string, fallback: string, lang: LanguageCode): string =>
  PLAN_NAME[id]?.[lang === 'en' ? 'en' : 'pl'] ?? fallback;

/** Opis gotowego planu w języku UI. */
export const localizePlanDescription = (id: string, fallback: string, lang: LanguageCode): string =>
  PLAN_DESC[id]?.[lang === 'en' ? 'en' : 'pl'] ?? fallback;

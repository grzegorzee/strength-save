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
export const FOCUS_TOKEN_EN: Record<string, string> = {
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

// Z168: nakładki per język (kanoniczne PL to baza). Dodanie języka = dopisanie map
// do trzech rejestrów niżej; brak wpisu → wartość kanoniczna.
const WEEKDAY_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: WEEKDAY_EN };
const WEEKDAY_SHORT_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: WEEKDAY_SHORT_EN };
const FOCUS_TOKEN_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: FOCUS_TOKEN_EN };

/** Nazwa dnia w języku UI (mapuje kanoniczne polskie nazwy dni; inne zostawia). */
export const localizeDayName = (name: string, lang: LanguageCode): string => {
  if (!name) return name;
  return WEEKDAY_OVERLAYS[lang]?.[name] ?? name;
};

/** Skrót dnia w języku UI (Pn -> Mon). */
export const localizeWeekdayShort = (short: string, lang: LanguageCode): string => {
  if (!short) return short;
  return WEEKDAY_SHORT_OVERLAYS[lang]?.[short] ?? short;
};

/** Focus dnia w języku UI (tłumaczy znane tokeny, zachowuje litery/liczby/terminy EN). */
export const localizeFocus = (focus: string, lang: LanguageCode): string => {
  const overlay = FOCUS_TOKEN_OVERLAYS[lang];
  if (!overlay || !focus) return focus;
  return focus
    .split(/(\s+)/)
    .map((tok) => overlay[tok] ?? tok)
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
  // X26/Z246
  'tpl-minimalist-2': { pl: 'Minimalna Dawka', en: 'Minimalist Protocol' },
  'tpl-six-lifts-3': { pl: 'Sześć Ruchów', en: 'Six Lift Blueprint' },
  'tpl-gzclp-3': { pl: 'Trójstopniowa Siła', en: 'Three Tier Strength' },
  'tpl-calisthenics-3': { pl: 'Własny Ciężar', en: 'Bodyweight Foundation' },
  'tpl-glutes-3': { pl: 'Moc Pośladków', en: 'Glute Foundations' },
  'tpl-phul-4': { pl: 'Moc i Objętość', en: 'Power Hypertrophy Upper Lower' },
  'tpl-531-bbb-4': { pl: 'Żelazny Cykl 5/3/1', en: 'Iron Cycle 5/3/1' },
  'tpl-meso-4': { pl: 'Mezocykl Naukowy', en: 'Science Mesocycle' },
  'tpl-phat-5': { pl: 'Powerbuilding PHAT', en: 'PHAT Powerbuilding' },
  'tpl-hybrid-5': { pl: 'Hybryda Pięciu Dni', en: 'Hybrid Five' },
  'tpl-nsuns-5': { pl: 'Objętość Maksymalna', en: 'Volume Max LP' },
  'tpl-arnold-6': { pl: 'Złota Era', en: 'Golden Era Split' },
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
  'tpl-rza-3': {
    pl: 'Trzy dni A/B/C przez 12 tygodni. Nacisk na barki boczne, plecy i szerokość sylwetki (V-taper), sterowanie przez RPE i finishery kondycyjne. Dla świadomych, którzy lubią twarde, mierzalne treningi.',
    en: 'Three A/B/C days over 12 weeks. Emphasis on side delts, back and V-taper width, RPE-driven with conditioning finishers. For experienced lifters who like hard, measurable training.',
  },
  // X26/Z246
  'tpl-minimalist-2': {
    pl: 'Minimalna objętość, maksymalny efekt (styl Jeffa Nipparda): 2 krótkie treningi całego ciała, serie blisko upadku, drop sety na izolacjach. Pod 45 minut.',
    en: 'Minimum volume, maximum effect (Jeff Nippard style): 2 short full-body sessions, sets close to failure, drop sets on isolations. Under 45 minutes.',
  },
  'tpl-six-lifts-3': {
    pl: 'Sześć tych samych ruchów na każdym treningu (styl Built With Science): pełne ciało 3× w tygodniu, prosty start i szybka nauka techniki. Progres przez dokładanie powtórzeń.',
    en: 'The same six lifts every session (Built With Science style): full body 3× a week, a simple start and fast technique learning. Progress by adding reps.',
  },
  'tpl-gzclp-3': {
    pl: 'GZCLP: trzy poziomy pracy — ciężki bój główny (T1: 5×3, ostatnia seria MAX), średni bój dodatkowy (T2: 3×10) i lekka izolacja (T3: 3×15). Idealny krok po programie 5×5.',
    en: 'GZCLP: three tiers of work — a heavy main lift (T1: 5×3, last set MAX), a medium secondary lift (T2: 3×10) and light isolation (T3: 3×15). The perfect step after a 5×5 program.',
  },
  'tpl-calisthenics-3': {
    pl: 'Kalistenika w duchu Recommended Routine (r/bodyweightfitness): pary ćwiczeń z masą ciała + core. Wystarczy drążek i poręcze (albo stół i dwa krzesła). Progres przez trudniejsze warianty.',
    en: 'Calisthenics in the spirit of the Recommended Routine (r/bodyweightfitness): bodyweight exercise pairs + core. All you need is a bar and dip station (or a table and two chairs). Progress through harder variations.',
  },
  'tpl-glutes-3': {
    pl: 'Program w duchu Strong Curves (Bret Contreras): priorytet pośladków i dołu ciała z pracą całej sylwetki. Superserie pośladki+góra, zakresy 8-20 powtórzeń.',
    en: 'A Strong Curves inspired program (Bret Contreras): glute and lower-body priority with full-body work. Glute+upper supersets, 8-20 rep ranges.',
  },
  'tpl-phul-4': {
    pl: 'PHUL: dwa dni siłowe (3-5 powtórzeń na bojach) i dwa objętościowe (8-12). Każda partia trenowana 2× w tygodniu. Siła i sylwetka jednocześnie.',
    en: 'PHUL: two power days (3-5 reps on the big lifts) and two hypertrophy days (8-12). Every muscle trained 2× a week. Strength and physique at once.',
  },
  'tpl-531-bbb-4': {
    pl: '5/3/1 Boring But Big (Jim Wendler): jeden ciężki bój dziennie wg procentów Training Max (90% 1RM), potem 5×10 boju pomocniczego. Tydzień 1: 5/5/5+, tydzień 2: 3/3/3+, tydzień 3: 5/3/1+, tydzień 4: deload. Po cyklu +2,5 kg góra / +5 kg dół.',
    en: '5/3/1 Boring But Big (Jim Wendler): one heavy lift a day using Training Max percentages (90% of 1RM), then 5×10 of a supplemental lift. Week 1: 5/5/5+, week 2: 3/3/3+, week 3: 5/3/1+, week 4: deload. After each cycle +2.5 kg upper / +5 kg lower.',
  },
  'tpl-meso-4': {
    pl: 'Hipertrofia sterowana objętością (inspiracja Renaissance Periodization): start na minimalnej skutecznej objętości, co tydzień +1 seria do części ćwiczeń i mniejszy zapas (RIR 3→0), tydzień 5 to deload. Dwa mezocykle.',
    en: 'Volume-driven hypertrophy (Renaissance Periodization inspired): start at minimum effective volume, add a set to some exercises each week with less reps in reserve (RIR 3→0), week 5 is a deload. Two mesocycles.',
  },
  'tpl-phat-5': {
    pl: 'PHAT (Layne Norton): 2 dni siłowe (3-5 powtórzeń) + 3 dni objętościowe (~85% ciężaru z dni siłowych, 8-20 powtórzeń). Bardzo wysoka objętość dla zaawansowanych z dobrą regeneracją.',
    en: 'PHAT (Layne Norton): 2 power days (3-5 reps) + 3 hypertrophy days (~85% of power-day loads, 8-20 reps). Very high volume for advanced lifters who recover well.',
  },
  'tpl-hybrid-5': {
    pl: 'Hybryda Upper/Lower + Push/Pull/Legs: dwa cięższe dni siłowe (4-8 powtórzeń) i trzy objętościowe (8-20). Każdy mięsień 2× w tygodniu, dużo izolacji tam, gdzie robi różnicę.',
    en: 'An Upper/Lower + Push/Pull/Legs hybrid: two heavier strength days (4-8 reps) and three volume days (8-20). Every muscle 2× a week, with isolation where it matters.',
  },
  'tpl-nsuns-5': {
    pl: 'nSuns 531LP: 9 serii boju głównego z falującymi procentami Training Max (65-95%, serie MAX sterują progresją) + 8 serii boju pokrewnego. Najcięższy plan w aplikacji — wymaga nadwyżki kalorycznej i snu.',
    en: 'nSuns 531LP: 9 sets of the main lift with waving Training Max percentages (65-95%, MAX sets drive progression) + 8 sets of a related lift. The heaviest plan in the app — requires a calorie surplus and sleep.',
  },
  'tpl-arnold-6': {
    pl: 'Arnold Split w nowoczesnej objętości: Klatka+Plecy, Barki+Ramiona, Nogi — każda sesja 2× w tygodniu, superserie antagonistyczne (klatka z plecami, biceps z tricepsem). Dla zaawansowanych.',
    en: 'The Arnold Split at modern volume: Chest+Back, Shoulders+Arms, Legs — each session 2× a week, antagonist supersets (chest with back, biceps with triceps). For advanced lifters.',
  },
};

// Teksty planów trzymamy per język w PlanText; nowy język = nowe pole w PlanText
// (brak pola → fallback do PL, czyli wartości kanonicznej z danych szablonu).
const planText = (text: PlanText | undefined, lang: LanguageCode): string | undefined =>
  text?.[lang as keyof PlanText] ?? text?.pl;

/** Nazwa gotowego planu w języku UI (PL kanoniczne dla polskiego usera). */
export const localizePlanName = (id: string, fallback: string, lang: LanguageCode): string =>
  planText(PLAN_NAME[id], lang) ?? fallback;

/** Opis gotowego planu w języku UI. */
export const localizePlanDescription = (id: string, fallback: string, lang: LanguageCode): string =>
  planText(PLAN_DESC[id], lang) ?? fallback;

import type { LanguageCode } from '@/i18n';
import type { Weekday } from '@/data/trainingPlan';
import { weekdayOfDate } from '@/lib/plan-schedule';
import { weekdayLong } from '@/lib/plan-cycle-utils';
import { parseLocalDateSafe } from '@/lib/utils';

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
  'Jednonóż': 'Unilateral',
  'Detale': 'Detail Work',
  'Płasko': 'Flat',
  'Środek': 'Mid',
  'Szerokie': 'Wide',
  'Uda': 'Thighs',
  'Przysiad': 'Squat',
  // T6: focus nowych szablonów (Moc Góra/Dół/Tył, Objętość A/B/C).
  'Moc': 'Power',
  'Objętość': 'Volume',
};

const WEEKDAY_SHORT_EN: Record<string, string> = {
  'Pn': 'Mon', 'Wt': 'Tue', 'Śr': 'Wed', 'Cz': 'Thu', 'Pt': 'Fri', 'So': 'Sat', 'Nd': 'Sun',
};

// Z168: nakładki per język (kanoniczne PL to baza). Dodanie języka = dopisanie map
// do trzech rejestrów niżej; brak wpisu → wartość kanoniczna.
const WEEKDAY_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: WEEKDAY_EN };
const WEEKDAY_SHORT_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: WEEKDAY_SHORT_EN };
const FOCUS_TOKEN_OVERLAYS: Partial<Record<LanguageCode, Record<string, string>>> = { en: FOCUS_TOKEN_EN };

const FOCUS_PHRASE_EN: Record<string, string> = {
  'Szerokie Plecy': 'Back Width',
  'Tył Uda': 'Hamstrings',
  'Klatka Płasko': 'Flat Chest',
  'Środek Pleców': 'Mid Back',
};

/** Nazwa dnia w języku UI (mapuje kanoniczne polskie nazwy dni; inne zostawia). */
export const localizeDayName = (name: string, lang: LanguageCode): string => {
  if (!name) return name;
  return WEEKDAY_OVERLAYS[lang]?.[name] ?? name;
};

/**
 * WP-L (X30): nazwa dnia podąża za datą przełożenia. Jeśli dayName to DOMYŚLNA
 * nazwa weekday dnia planu (kanoniczna PL "Poniedziałek" albo EN "Monday"),
 * a data renderowania wypada w INNY dzień tygodnia (scheduleOverrides zmienia
 * datę, nie nazwę), zwracamy zlokalizowaną nazwę dnia tygodnia daty docelowej.
 * Własna nazwa usera ("Push", "Klatka") zostaje nietknięta. Dotyczy WYŁĄCZNIE
 * renderów zakotwiczonych w dacie; edytor planu i snapshoty historii używają
 * nadal localizeDayName.
 */
export const displayDayNameForDate = (
  dayName: string,
  weekday: Weekday,
  date: Date,
  lang: LanguageCode,
): string => {
  const canonical = weekdayLong(weekday);
  const isDefaultName = dayName === canonical || dayName === WEEKDAY_EN[canonical];
  if (!isDefaultName) return localizeDayName(dayName, lang);
  return localizeDayName(weekdayLong(weekdayOfDate(date)), lang);
};

/**
 * Wariant displayDayNameForDate dla dat ISO (YYYY-MM-DD) w etykietach:
 * zly string degraduje do dotychczasowej zlokalizowanej nazwy, bo etykieta
 * nie ma prawa rzucic (zasada 11, guard date-label-guard).
 */
export const displayDayNameForDateISO = (
  dayName: string,
  weekday: Weekday,
  dateISO: string,
  lang: LanguageCode,
): string => {
  const date = parseLocalDateSafe(dateISO);
  return date ? displayDayNameForDate(dayName, weekday, date, lang) : localizeDayName(dayName, lang);
};

/** Stored workout/inbox snapshots have no weekday field. A weekday name still
 * follows the actual workout date; user names such as Push or FBW C survive. */
export const displayStoredWorkoutDayName = (dayName: string, dateISO: string, lang: LanguageCode): string => {
  const date = parseLocalDateSafe(dateISO);
  const isWeekday = Object.keys(WEEKDAY_EN).includes(dayName) || Object.values(WEEKDAY_EN).includes(dayName);
  return date && (isWeekday || !dayName)
    ? localizeDayName(weekdayLong(weekdayOfDate(date)), lang)
    : localizeDayName(dayName, lang) || dateISO;
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
    .split(/(\s*\/\s*)/)
    .map((segment) => {
      if (/^\s*\/\s*$/.test(segment)) return segment;
      const trimmed = segment.trim();
      const phrase = lang === 'en' ? FOCUS_PHRASE_EN[trimmed] : undefined;
      if (phrase) return segment.replace(trimmed, phrase);
      return segment
        .split(/(\s+)/)
        .map((token) => overlay[token] ?? token)
        .join('');
    })
    .join('');
};

// Nazwy i opisy gotowych planów (planTemplates). W danych nazwy są po angielsku,
// a opisy po polsku — tu trzymamy obie wersje, żeby polski user widział polskie nazwy,
// a angielski — angielskie opisy. Kluczem jest id szablonu.
interface PlanText { pl: string; en: string }

const PLAN_NAME: Record<string, PlanText> = {
  'tpl-fullbody-2': { pl: 'Żelazny Fundament', en: 'Iron Foundation' },
  'tpl-fullbody-3': { pl: 'Zrównoważony Rozwój', en: 'Balanced Builder' },
  // WP-PLANS-1 (X27): nazwa FBW celowo identyczna w obu językach (żądanie usera).
  'tpl-fbw-3': { pl: 'Full Body Workout (FBW)', en: 'Full Body Workout (FBW)' },
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
  'tpl-phul-4': { pl: 'Moc i Objętość', en: 'Strength & Size Upper/Lower' },
  'tpl-531-bbb-4': { pl: 'Żelazny Cykl Siłowy', en: 'Iron Strength Cycle' },
  'tpl-meso-4': { pl: 'Mezocykl Naukowy', en: 'Science Mesocycle' },
  'tpl-phat-5': { pl: 'Siła i Masa 5 Dni', en: 'Five-Day Powerbuilding' },
  'tpl-hybrid-5': { pl: 'Hybryda Pięciu Dni', en: 'Hybrid Five' },
  'tpl-nsuns-5': { pl: 'Objętość Maksymalna', en: 'Volume Max LP' },
  'tpl-arnold-6': { pl: 'Złota Era', en: 'Golden Era Split' },
  'tpl-fatloss-3': { pl: 'Redukcja na Start', en: 'Fat Loss Starter' },
  'tpl-home-db-3': { pl: 'Hantle w Domu', en: 'Home Dumbbell Basics' },
  'tpl-glutes-4': { pl: 'Pośladki Priorytet', en: 'Glute Priority' },
  'tpl-strength-2': { pl: 'Siła w Dwa Dni', en: 'Two-Day Strength' },
  'tpl-beginner-ul-4': { pl: 'Góra/Dół na Start', en: 'Upper Lower Starter' },
  'tpl-athletic-3': { pl: 'Atleta w Trzy Dni', en: 'Three-Day Athlete' },
  'tpl-home-db-4': { pl: 'Domowy Góra/Dół', en: 'Home Upper Lower' },
  'tpl-fatloss-2': { pl: 'Redukcja w Dwa Dni', en: 'Two-Day Fat Loss' },
  'tpl-fatloss-5': { pl: 'Redukcja Plus', en: 'Fat Loss Plus' },
  'tpl-strength-ul-4': { pl: 'Siła Góra/Dół na Start', en: 'Strength Upper Lower Starter' },
  'tpl-strength-6': { pl: 'Siła Falowa', en: 'Wave Strength' },
  'tpl-glutes-2': { pl: 'Pośladki w Dwa Dni', en: 'Two-Day Glutes' },
  'tpl-health-50-2': { pl: 'Sprawna Codzienność', en: 'Everyday Strength' },
  'tpl-kettlebell-3': { pl: 'Kettlebell Podstawy', en: 'Kettlebell Basics' },
  'tpl-express-3': { pl: 'Ekspres 35 Minut', en: 'Express 35' },
  'tpl-travel-2': { pl: 'Trening w Podróży', en: 'Travel Workout' },
  'tpl-bodyweight-home-3': { pl: 'Start bez Sprzętu', en: 'No-Equipment Starter' },
};

const PLAN_DESC: Record<string, PlanText> = {
  'tpl-fullbody-2': {
    pl: 'Całe ciało na dwóch treningach. Dla początkujących, osób wracających po przerwie i tygodni z małą ilością czasu.',
    en: 'Full body across two sessions for beginners, people returning after a break, or busy weeks.',
  },
  'tpl-fullbody-3': {
    pl: 'Full Body 3 razy w tygodniu (A/B/C), każdy trening na całe ciało, z dniem przerwy między sesjami.',
    en: 'Full body 3× a week (A/B/C), with a rest day between sessions.',
  },
  'tpl-fbw-3': {
    pl: 'Klasyczny FBW A/B/C: przysiad, wyciskanie i wiosłowanie na każdym treningu w innych wariantach. Całe ciało 3 razy w tygodniu, proste ciężkie boje plus akcesoria.',
    en: 'Classic FBW A/B/C: squat, press and row in every session in different variants. Full body 3× a week, simple heavy lifts plus accessories.',
  },
  'tpl-ppl-3': {
    pl: 'Klasyczny podział na pchanie, ciągnięcie i nogi. Najpopularniejszy plan na budowę masy przy 3 treningach.',
    en: 'Classic push, pull, legs split. The most popular plan for building mass on 3 sessions.',
  },
  'tpl-upper-lower-4': {
    pl: 'Góra/dół dwa razy w tygodniu: dwa dni góry i dwa dni dołu przy 4 treningach.',
    en: 'Upper/lower twice a week: two upper-body and two lower-body sessions.',
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
    pl: 'Plan pod redukcję: obwody całego ciała z krótkimi przerwami, wysokie powtórzenia i wstawki kondycyjne.',
    en: 'A fat-loss plan with full-body circuits, short rests, high reps and conditioning finishers.',
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
    pl: 'Plan o małej objętości: 2 krótkie treningi całego ciała, serie blisko upadku i drop sety na izolacjach. Do 45 minut.',
    en: 'A low-volume plan: 2 short full-body sessions, sets close to failure and drop sets on isolations. Under 45 minutes.',
  },
  'tpl-six-lifts-3': {
    pl: 'Sześć tych samych ruchów na każdym treningu: pełne ciało 3× w tygodniu, prosty start i szybka nauka techniki. Progres przez dokładanie powtórzeń.',
    en: 'The same six lifts every session: full body 3× a week, a simple start and fast technique learning. Progress by adding reps.',
  },
  'tpl-gzclp-3': {
    pl: 'Trzy poziomy pracy: ciężki bój główny (T1: 5×3, ostatnia seria MAX), średni bój dodatkowy (T2: 3×10) i lekka izolacja (T3: 3×15). Naturalny krok po planie 5×5.',
    en: 'Three tiers of work: a heavy main lift (T1: 5×3, last set MAX), a medium secondary lift (T2: 3×10) and light isolation (T3: 3×15). A natural next step after a 5×5 plan.',
  },
  'tpl-calisthenics-3': {
    pl: 'Kalistenika: pary ćwiczeń z masą ciała + core. Wystarczy drążek i poręcze (albo stół i dwa krzesła). Progres przez trudniejsze warianty.',
    en: 'Calisthenics: bodyweight exercise pairs + core. All you need is a bar and dip station (or a table and two chairs). Progress through harder variations.',
  },
  'tpl-glutes-3': {
    pl: 'Program z priorytetem pośladków i dołu ciała, z pracą całej sylwetki. Superserie pośladki+góra, zakresy 8-20 powtórzeń.',
    en: 'A glute and lower-body priority program with full-body work. Glute+upper supersets, 8-20 rep ranges.',
  },
  'tpl-phul-4': {
    pl: 'Dwa dni siłowe (3-5 powtórzeń na bojach) i dwa objętościowe (8-12) w układzie góra/dół. Każda partia trenowana 2× w tygodniu. Siła i sylwetka jednocześnie.',
    en: 'Two power days (3-5 reps on the big lifts) and two hypertrophy days (8-12) in an upper/lower split. Every muscle trained 2× a week. Strength and physique at once.',
  },
  'tpl-531-bbb-4': {
    pl: 'Cykl 4-tygodniowy oparty na Training Max (90% 1RM): jeden ciężki bój dziennie według procentów TM, potem 5×10 boju pomocniczego. Tydzień 1: serie po 5 powtórzeń, tydzień 2: po 3, tydzień 3: 5, 3 i 1 (ostatnia seria zawsze na maksimum powtórzeń), tydzień 4: deload. Po cyklu +2,5 kg góra / +5 kg dół.',
    en: 'A 4-week cycle built on a Training Max (90% of 1RM): one heavy lift a day using TM percentages, then 5×10 of a supplemental lift. Week 1: sets of 5, week 2: sets of 3, week 3: 5, 3 and 1 (last set always for max reps), week 4: deload. After each cycle +2.5 kg upper / +5 kg lower.',
  },
  'tpl-meso-4': {
    pl: 'Hipertrofia sterowana objętością: start na minimalnej skutecznej objętości, co tydzień +1 seria do części ćwiczeń i mniejszy zapas (RIR 3→0), tydzień 5 to deload. Dwa mezocykle.',
    en: 'Volume-driven hypertrophy: start at minimum effective volume, add a set to some exercises each week with less reps in reserve (RIR 3→0), week 5 is a deload. Two mesocycles.',
  },
  'tpl-phat-5': {
    pl: 'Pięć dni siły i masy: 2 dni siłowe (3-5 powtórzeń) + 3 dni objętościowe (~85% ciężaru z dni siłowych, 8-20 powtórzeń). Bardzo wysoka objętość dla zaawansowanych z dobrą regeneracją.',
    en: 'Five days of strength and size: 2 power days (3-5 reps) + 3 hypertrophy days (~85% of power-day loads, 8-20 reps). Very high volume for advanced lifters who recover well.',
  },
  'tpl-hybrid-5': {
    pl: 'Hybryda Upper/Lower + Push/Pull/Legs: dwa cięższe dni siłowe (4-8 powtórzeń) i trzy objętościowe (8-20). Każdy mięsień 2× w tygodniu, dużo izolacji tam, gdzie robi różnicę.',
    en: 'An Upper/Lower + Push/Pull/Legs hybrid: two heavier strength days (4-8 reps) and three volume days (8-20). Every muscle 2× a week, with isolation where it matters.',
  },
  'tpl-nsuns-5': {
    pl: 'Progresja liniowa na Training Max: 9 serii boju głównego z falującymi procentami TM (65-95%, serie MAX sterują progresją) + 8 serii boju pokrewnego. Plan o bardzo wysokiej objętości dla zaawansowanych.',
    en: 'Linear progression on a Training Max: 9 sets of the main lift with waving TM percentages (65-95%, MAX sets drive progression) + 8 sets of a related lift. A very high-volume plan for advanced lifters.',
  },
  'tpl-arnold-6': {
    pl: 'Klasyczny split złotej ery kulturystyki w nowoczesnej objętości: Klatka+Plecy, Barki+Ramiona, Nogi. Każda sesja 2× w tygodniu, superserie antagonistyczne (klatka z plecami, biceps z tricepsem). Dla zaawansowanych.',
    en: 'The classic golden-era bodybuilding split at modern volume: Chest+Back, Shoulders+Arms, Legs. Each session 2× a week, antagonist supersets (chest with back, biceps with triceps). For advanced lifters.',
  },
  'tpl-fatloss-3': {
    pl: 'Plan pod redukcję dla początkujących: 3 treningi całego ciała na maszynach i hantlach. Najpierw blok siłowy (3 ćwiczenia wielostawowe), potem krótki obwód i interwały na sprzęcie cardio.',
    en: 'A beginner fat-loss plan: 3 full-body sessions on machines and dumbbells. A strength block (3 compound lifts) first, then a short circuit and cardio machine intervals.',
  },
  'tpl-home-db-3': {
    pl: 'Trzy treningi całego ciała w domu: para hantli i ławka. Proste ruchy wielostawowe, 3 serie, progres przez dokładanie powtórzeń, potem ciężaru.',
    en: 'Three full-body sessions at home with a pair of dumbbells and a bench. Simple compound lifts, 3 sets, progress by adding reps first, then load.',
  },
  'tpl-glutes-4': {
    pl: 'Cztery treningi z priorytetem pośladków: dwa dni dołu z różnymi wzorcami (wypychanie bioder, przysiad, zawias, wykrok), jeden dzień góry i jeden całego ciała. Zakresy 6-30 powtórzeń.',
    en: 'Four sessions with a glute priority: two lower days with different patterns (hip thrust, squat, hinge, lunge), one upper day and one full-body day. Rep ranges from 6 to 30.',
  },
  'tpl-strength-2': {
    pl: 'Siła na dwóch treningach w tygodniu: przysiad, wyciskanie leżąc, martwy ciąg i wyciskanie nad głowę po 5 powtórzeń, plus wiosłowanie, podciąganie i noszenie ciężaru. Progres liniowy ciężaru na bojach.',
    en: 'Strength on two sessions a week: squat, bench press, deadlift and overhead press for sets of 5, plus rows, pull-ups and a loaded carry. Linear load progression on the main lifts.',
  },
  'tpl-beginner-ul-4': {
    pl: 'Pierwszy plan 4-dniowy: góra i dół ciała na zmianę, głównie maszyny i hantle. Pięć ćwiczeń po 2-3 serie, zostawiaj 2-3 powtórzenia w zapasie.',
    en: 'A first 4-day plan: upper and lower body in turns, mostly machines and dumbbells. Five exercises of 2-3 sets, leave 2-3 reps in reserve.',
  },
  'tpl-athletic-3': {
    pl: 'Moc, siła i kondycja w trzech treningach. Każdy dzień zaczyna ćwiczenie eksplozywne (skok albo rzut piłką), potem bój siłowy, praca jednonóż, core przeciw rotacji i krótkie interwały.',
    en: 'Power, strength and conditioning in three sessions. Each day opens with an explosive drill (jump or medicine ball throw), then a main lift, single-leg work, anti-rotation core and short intervals.',
  },
  'tpl-home-db-4': {
    pl: 'Góra/dół 4 razy w tygodniu w domu: hantle, ławka i drążek do podciągania. Dwa warianty każdego dnia, praca jednonóż zamiast ciężkiej sztangi.',
    en: 'Upper/lower 4 times a week at home: dumbbells, a bench and a pull-up bar. Two versions of each day, single-leg work instead of a heavy barbell.',
  },
  'tpl-fatloss-2': {
    pl: 'Redukcja przy dwóch treningach w tygodniu: całe ciało na maszynach i hantlach, krótka superseria na koniec i 10 interwałów na rowerze albo wioślarzu.',
    en: 'Fat loss on two sessions a week: full body on machines and dumbbells, a short superset to finish and 10 intervals on a bike or rower.',
  },
  'tpl-fatloss-5': {
    pl: 'Redukcja na 5 treningach: góra/dół dwa razy w tygodniu na ciężarach plus jeden dzień kondycyjny (interwały, sanie, noszenie ciężaru, rzuty piłką).',
    en: 'Fat loss on 5 sessions: upper/lower twice a week with weights plus one conditioning day (intervals, sled, loaded carries, medicine ball throws).',
  },
  'tpl-strength-ul-4': {
    pl: 'Pierwszy plan siłowy na 4 dni: każdy z czterech bojów (przysiad, wyciskanie leżąc, martwy ciąg, wyciskanie nad głowę) raz w tygodniu ciężko po 5 powtórzeń, reszta to lżejsze ćwiczenia pomocnicze. Progres liniowy.',
    en: 'A first 4-day strength plan: each of the four main lifts (squat, bench press, deadlift, overhead press) once a week heavy for sets of 5, the rest are lighter accessories. Linear progression.',
  },
  'tpl-strength-6': {
    pl: 'Siła na 6 dniach z falującą objętością: każdy z trzech bojów (przysiad, wyciskanie leżąc, martwy ciąg) ma w tygodniu dzień ciężki (niskie powtórzenia) i dzień objętościowy (warianty z pauzą, więcej serii). Dla osób z kilkuletnim stażem.',
    en: 'Strength on 6 days with undulating volume: each of the three main lifts (squat, bench press, deadlift) gets a heavy day (low reps) and a volume day (paused variations, more sets) every week. For lifters with several years of training.',
  },
  'tpl-glutes-2': {
    pl: 'Dwa treningi całego ciała z akcentem na pośladki: wypychanie bioder, przysiad, zawias biodrowy, wejścia na skrzynię i odwodzenie z gumą. Hantle, wyciąg i guma oporowa.',
    en: 'Two full-body sessions with a glute emphasis: hip thrusts, squats, hip hinges, step-ups and banded abduction. Dumbbells, a cable station and a resistance band.',
  },
  'tpl-health-50-2': {
    pl: 'Dwa spokojne treningi całego ciała na maszynach i w stabilnych pozycjach, bez sztangi nad głową: nogi, pchanie, przyciąganie, noszenie ciężaru i core. Dla osób 50+ i wracających po długiej przerwie.',
    en: 'Two steady full-body sessions on machines and in stable positions, no barbell overhead: legs, pushing, pulling, loaded carries and core. For people over 50 and anyone returning after a long break.',
  },
  'tpl-kettlebell-3': {
    pl: 'Trzy treningi z jednym lub dwoma odważnikami kettlebell: martwy ciąg, wymachy, przysiad, wyciskanie, wiosłowanie i noszenie. Wystarczy kawałek podłogi.',
    en: 'Three sessions with one or two kettlebells: deadlifts, swings, squats, presses, rows and carries. A bit of floor space is enough.',
  },
  'tpl-express-3': {
    pl: 'Trzy krótkie treningi (ok. 35 minut) na superseriach antagonistycznych: pchanie z przyciąganiem, nogi przód z tyłem, na koniec 6 interwałów. Pod redukcję przy małej ilości czasu.',
    en: 'Three short sessions (about 35 minutes) built on antagonist supersets: push with pull, front of the legs with the back, then 6 intervals to finish. For fat loss on a tight schedule.',
  },
  'tpl-travel-2': {
    pl: 'Dwa obwody bez siłowni: masa ciała i guma oporowa, do hotelowego pokoju. Stół do wiosłowania odwrotnego, krzesło do wykroków, krótkie interwały na koniec.',
    en: 'Two circuits without a gym: bodyweight and a resistance band, made for a hotel room. A sturdy table for inverted rows, a chair for split squats, short intervals to finish.',
  },
  'tpl-bodyweight-home-3': {
    pl: 'Trzy treningi całego ciała w domu, bez sprzętu i bez podporu na rękach: przysiady, mostki, wykroki, praca grzbietu w leżeniu i brzuch w leżeniu na plecach. Na koniec krótkie interwały. Progres przez dokładanie powtórzeń.',
    en: 'Three full-body home sessions with no equipment and no weight on your hands: squats, bridges, lunges, back work lying face down and core work on your back. Short intervals to finish. Progress by adding reps.',
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

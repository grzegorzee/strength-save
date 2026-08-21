import { exerciseLibrary } from './exerciseLibrary';
import type { TrainingDay, Exercise } from './trainingPlan';

// Gotowe (nie-AI) plany treningowe do wyboru jednym klikiem.
// Każde ćwiczenie z source:'library' jest zakotwiczone w bibliotece (exerciseLibrary),
// dzięki czemu dziedziczy wskazówki techniczne i lokalizację, a podmiana działa tak samo.

/** Cel treningowy (mapuje się na kroki onboardingu i rekomendację planu). */
export type PlanObjective = 'build_muscle' | 'peak_strength' | 'fat_loss' | 'athletic';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  goal: 'strength' | 'muscle' | 'fat_loss' | 'health';
  /** Główny cel pod onboarding (Build Muscle / Peak Strength / Fat Loss / Athletic). */
  objective: PlanObjective;
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  durationWeeks: number;
  // 'library' = ćwiczenia w 100% z biblioteki; 'imported' = zaimportowany plan z własnymi ćwiczeniami.
  source?: 'library' | 'imported';
  days: TrainingDay[];
}

// Deterministyczny licznik id ćwiczeń (stały przy każdym załadowaniu modułu).
let exerciseCounter = 0;

const ex = (
  name: string,
  sets: string,
  opts?: { superset?: string },
): Exercise => {
  const lib = exerciseLibrary.find((e) => e.name === name);
  if (!lib && typeof console !== 'undefined') {
    // Pomaga wyłapać literówkę w nazwie względem biblioteki (patrz test planTemplates).
    console.warn(`[planTemplates] Ćwiczenie spoza biblioteki: "${name}"`);
  }
  exerciseCounter += 1;
  return {
    id: `tpl-ex-${exerciseCounter}`,
    name,
    sets,
    instructions: lib?.instructions ?? [],
    ...(lib?.videoUrl ? { videoUrl: lib.videoUrl } : {}),
    ...(opts?.superset ? { isSuperset: true, supersetGroup: opts.superset } : {}),
  };
};

const day = (
  id: string,
  dayName: TrainingDay['dayName'],
  weekday: TrainingDay['weekday'],
  focus: string,
  exercises: Exercise[],
): TrainingDay => ({ id, dayName, weekday, focus, exercises });

// Ćwiczenie z zaimportowanego planu (poza biblioteką). Parametry (RIR, tempo, przerwa,
// notatka, superseria) trafiają do instrukcji, bo model nie ma osobnych pól.
const imp = (
  name: string,
  sets: string,
  opts?: { rir?: string; tempo?: string; rest?: string; note?: string; superset?: string },
): Exercise => {
  const lib = exerciseLibrary.find((e) => e.name === name);
  exerciseCounter += 1;
  const params = [
    opts?.rir ? `RIR ${opts.rir}` : null,
    opts?.tempo ? `Tempo ${opts.tempo}` : null,
    opts?.rest ? `Przerwa ${opts.rest}` : null,
  ].filter(Boolean).join(' • ');
  const instructions: Exercise['instructions'] = [];
  if (params) instructions.push({ title: '📋 Parametry', content: params });
  if (opts?.note) instructions.push({ title: '💡 Wskazówka', content: opts.note });
  return {
    id: `tpl-ex-${exerciseCounter}`,
    name,
    sets,
    instructions,
    ...(lib?.videoUrl ? { videoUrl: lib.videoUrl } : {}),
    ...(opts?.superset ? { isSuperset: true, supersetGroup: opts.superset } : {}),
  };
};

// Ćwiczenie planu RZA (3-dniowy, 12 tygodni). Nazwy zostają 1:1 z arkusza (są skrótami
// i wariantami combo spoza biblioteki), dlatego plan jest 'imported'. Parametry RZA
// (Typ, Timer interwałowy, docelowe RPE, uwaga techniczna) trafiają do instrukcji.
const rza = (
  name: string,
  cel: string,
  opts: { typ: string; timer: string; rpe: string; uwaga: string },
): Exercise => {
  const lib = exerciseLibrary.find((e) => e.name === name);
  exerciseCounter += 1;
  return {
    id: `tpl-ex-${exerciseCounter}`,
    name,
    sets: cel,
    timer: opts.timer,
    instructions: [
      { title: '📋 Parametry', content: `${opts.typ} • ${opts.timer} • RPE ${opts.rpe}` },
      { title: '💡 Wskazówka', content: opts.uwaga },
    ],
    ...(lib?.videoUrl ? { videoUrl: lib.videoUrl } : {}),
  };
};

export const planTemplates: PlanTemplate[] = [
  {
    id: 'tpl-fullbody-2',
    name: 'Iron Foundation',
    description: 'Całe ciało na dwóch treningach. Idealny na start, powrót po przerwie albo tygodnie z mało czasu.',
    goal: 'health',
    objective: 'build_muscle',
    level: 'beginner',
    daysPerWeek: 2,
    durationWeeks: 8,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Całe ciało A', [
        ex('Przysiad goblet', '3 x 8-10'),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 8-10'),
        ex('Wiosłowanie sztangą', '3 x 8-10'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 10-12'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-2', 'Czwartek', 'thursday', 'Całe ciało B', [
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-10'),
        ex('Wyciskanie sztangi na ławce płaskiej', '3 x 6-8'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-10'),
        ex('Wykroki chodzone', '3 x 10/noga'),
        ex('Modlitewnik (Cable Crunch)', '3 x 12-15'),
      ]),
    ],
  },
  {
    id: 'tpl-fullbody-3',
    name: 'Balanced Builder',
    description: 'Full Body 3 razy w tygodniu (A/B/C), każdy trening na całe ciało, na zmianę z dniem przerwy. Świetny stosunek efektów do czasu.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 10,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Full Body A', [
        ex('Wyciskanie hantli (Lekki skos)', '3 x 8-12'),
        ex('Przysiad ze sztangą (High Bar)', '3 x 6-8'),
        ex('Wiosłowanie hantlami na ławce (przodem)', '3 x 8-12'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 10-12'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 10-12', { superset: 'A' }),
        ex('Wyprosty francuskie zza głowy', '3 x 10-12', { superset: 'A' }),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Full Body B', [
        ex('Wyciskanie sztangi na ławce płaskiej', '3 x 4-6'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 6-8'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-12'),
        ex('Wykroki chodzone', '3 x 6-10'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15', { superset: 'B' }),
        ex('Reverse Crunch na ławce', '3 x 12-15', { superset: 'B' }),
      ]),
      day('day-3', 'Piątek', 'friday', 'Full Body C', [
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 8-12'),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 8-12'),
        ex('Hip Thrust ze sztangą', '3 x 10-15'),
        ex('Wyprosty nóg na maszynie', '3 x 10-15'),
        ex('Rozpiętki na lince (Crossover)', '3 x 10-15'),
        ex('Wspięcia na palce (Nogi proste)', '3 x 10-15', { superset: 'C' }),
        ex('Odwrotne rozpiętki (Tył barku)', '3 x 12-15', { superset: 'C' }),
      ]),
    ],
  },
  {
    // WP-PLANS-1 (X27, Task P6): klasyczny FBW A/B/C — wielostawy na start
    // (przysiad / martwy ciąg / hip thrust), potem push+pull, akcesoria na koniec.
    // Level intermediate + pozycja ZA tpl-fullbody-3: remis score w
    // getRecommendedPlan rozstrzyga pozycja, więc rekomendacje bez zmian.
    id: 'tpl-fbw-3',
    name: 'Full Body Workout (FBW)',
    description: 'Klasyczny FBW A/B/C: przysiad, wyciskanie i wiosłowanie na każdym treningu w innych wariantach. Całe ciało 3 razy w tygodniu, proste ciężkie boje plus akcesoria.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'FBW A', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 5-6'),
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 5-6'),
        ex('Wiosłowanie sztangą', '4 x 6-8'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'FBW B', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '4 x 6-8'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wyprosty na lince (Pushdown)', '3 x 10-12'),
        ex('Brzuszki klasyczne (Crunch)', '3 x 12-15'),
      ]),
      day('day-3', 'Piątek', 'friday', 'FBW C', [
        ex('Hip Thrust ze sztangą', '4 x 8-10'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-12'),
        ex('Wykroki chodzone', '3 x 10/noga'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
      ]),
    ],
  },
  {
    id: 'tpl-ppl-3',
    name: 'Push Pull Legs Engine',
    description: 'Klasyczny podział na pchanie, ciągnięcie i nogi. Najpopularniejszy plan na budowę masy przy 3 treningach.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Push', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-8'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 8-10'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
        ex('Wyprosty na lince (Pushdown)', '3 x 10-12'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Pull', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wiosłowanie sztangą', '4 x 8-10'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-12'),
        ex('Face Pull', '3 x 15'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Legs', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 6-8'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-10'),
        ex('Prasa nożna', '3 x 10-12'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 12-15'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
      ]),
    ],
  },
  {
    id: 'tpl-upper-lower-4',
    name: 'Upper / Lower Forge',
    description: 'Góra/dół dwa razy w tygodniu. Świetny balans siły i masy przy 4 treningach.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Góra A', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-8'),
        ex('Wiosłowanie sztangą', '4 x 6-8'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 8-10'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 10-12'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 10-12', { superset: 'A' }),
        ex('Wyprosty francuskie zza głowy', '3 x 10-12', { superset: 'A' }),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Dół A', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 6-8'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-10'),
        ex('Prasa nożna', '3 x 10-12'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 12-15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Góra B', [
        ex('Wyciskanie sztangi na skosie', '4 x 6-8'),
        ex('Podciąganie na drążku', '4 x 6-10'),
        ex('Arnoldki', '3 x 10-12'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-12'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
        ex('Uginanie na lince (Hammer)', '3 x 12', { superset: 'B' }),
        ex('Wyprosty na lince (Pushdown)', '3 x 12', { superset: 'B' }),
      ]),
      day('day-4', 'Piątek', 'friday', 'Dół B', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Hip Thrust ze sztangą', '3 x 8-10'),
        ex('Wykroki bułgarskie', '3 x 10/noga'),
        ex('Wyprosty nóg na maszynie', '3 x 12-15'),
        ex('Modlitewnik (Cable Crunch)', '3 x 12-15'),
      ]),
    ],
  },
  {
    id: 'tpl-split-5',
    name: 'Hypertrophy Split',
    description: 'Klasyczny split na partie: klatka, plecy, nogi, barki, ramiona. Dla zaawansowanych z dużą objętością.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'advanced',
    daysPerWeek: 5,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Klatka', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-8'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 10-12'),
        ex('Rozpiętki na lince (Crossover)', '3 x 12-15'),
        ex('Dips (pompki na poręczach)', '3 x MAX'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Plecy', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Podciąganie na drążku', '4 x 6-10'),
        ex('Wiosłowanie sztangą', '4 x 8-10'),
        ex('Ściąganie drążka (Wąski nachwyt)', '3 x 10-12'),
        ex('Wiosłowanie na lince siedząc', '3 x 12'),
        ex('Pullover na lince', '3 x 12-15'),
      ]),
      day('day-3', 'Środa', 'wednesday', 'Nogi', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 6-8'),
        ex('Prasa nożna', '4 x 10-12'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-10'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 15'),
      ]),
      day('day-4', 'Czwartek', 'thursday', 'Barki', [
        ex('Wyciskanie sztangi nad głowę (OHP)', '4 x 6-8'),
        ex('Arnoldki', '3 x 10-12'),
        ex('Wznosy bokiem (Lateral Raise)', '4 x 12-15'),
        ex('Odwrotne rozpiętki (Tył barku)', '3 x 15'),
        ex('Face Pull', '3 x 15'),
      ]),
      day('day-5', 'Piątek', 'friday', 'Ramiona + Brzuch', [
        ex('Uginanie sztangi stojąc', '4 x 8-10'),
        ex('Wyprosty na lince (Pushdown)', '4 x 10-12'),
        ex('Uginanie hantli hammer', '3 x 12'),
        ex('Skull Crushers', '3 x 10-12'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
        ex('Plank', '3 x MAX'),
      ]),
    ],
  },
  {
    id: 'tpl-ppl-6',
    name: 'Push Pull Legs ×2',
    description: 'Pełny cykl PPL dwa razy w tygodniu: 6 treningów pon-sob, każda partia trenowana 2×. Maksymalna objętość dla budowy masy przy wysokiej dyspozycyjności.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 6,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Push A', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-8'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 8-10'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
        ex('Wyprosty na lince (Pushdown)', '3 x 10-12'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Pull A', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wiosłowanie sztangą', '4 x 8-10'),
        ex('Face Pull', '3 x 15'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
      ]),
      day('day-3', 'Środa', 'wednesday', 'Legs A', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 6-8'),
        ex('Prasa nożna', '3 x 10-12'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 12-15'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-4', 'Czwartek', 'thursday', 'Push B', [
        ex('Wyciskanie hantli (Lekki skos)', '4 x 8-10'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 6-8'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
        ex('Rozpiętki na lince (Crossover)', '3 x 12-15'),
        ex('Wyprosty francuskie zza głowy', '3 x 10-12'),
      ]),
      day('day-5', 'Piątek', 'friday', 'Pull B', [
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-10'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 10-12'),
        ex('Wiosłowanie hantlami na ławce (przodem)', '3 x 8-12'),
        ex('Odwrotne rozpiętki (Tył barku)', '3 x 12-15'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 10-12'),
      ]),
      day('day-6', 'Sobota', 'saturday', 'Legs B', [
        ex('Hip Thrust ze sztangą', '3 x 8-10'),
        ex('Wykroki bułgarskie', '3 x 10/noga'),
        ex('Wyprosty nóg na maszynie', '3 x 12-15'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 10-12'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
      ]),
    ],
  },
  {
    id: 'tpl-push-pull-4',
    name: 'Tension Protocol',
    description: 'Plan z kontrolą RIR, tempa i przerw: 2× Push i 2× Pull, z mobilnością na rozgrzewce. Dla świadomego progresu. Sam wybierasz dni treningowe.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 12,
    source: 'imported',
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Push', [
        imp('Cossack Squat', '2 x 12', { tempo: '2020', rest: '60s' }),
        imp('Aniołki i demony', '2 x 10', { tempo: '3030', rest: '60s' }),
        imp('Przysiad ze sztangą', '3 x 8', { rir: '2', tempo: '4010', rest: '120s' }),
        imp('Przysiady bułgarskie', '3 x 12', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('Wyciskanie sztangi na ławce poziomej', '3 x 8', { rir: '2', tempo: '3010', rest: '120s' }),
        imp('Rozpiętki na ławce poziomej', '3 x 15', { rir: '2', tempo: '3010', rest: '90s' }),
        imp('Wyciskanie hantli siedząc', '3 x 8', { rir: '2', tempo: '2010', rest: '120s' }),
        imp('Wyciskanie hantla oburącz w klęku', '3 x 15', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('Francuskie wyciskanie sztangi leżąc', '3 x 12', { rir: '2', tempo: '3011', rest: '120s' }),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Pull', [
        imp('Otwieranie klatki hantlami', '2 x 45s', { superset: 'A', rest: 'brak', note: 'Rozciągaj 45s, bez przerwy przejdź do 1b. Wykonaj obwód 2×.' }),
        imp('Rotacje ramienia z gumą frontem', '2 x 15', { superset: 'A', tempo: '2020', rest: '60s', note: 'Superseria z poprzednim ćwiczeniem, bez przerwy między 1a i 1b.' }),
        imp('Martwy ciąg ze sztangą', '3 x 8', { rir: '2', tempo: '3010', rest: '120s' }),
        imp('Pull Through', '2 x 15', { rir: '2', tempo: '2011', rest: '90s' }),
        imp('Podciąganie na drążku podchwytem', '3 x 8', { rir: '1-0', tempo: '3010', rest: '120s' }),
        imp('Wiosłowanie hantlą w opadzie', '3 x 12', { rir: '2', tempo: '3010', rest: '75s' }),
        imp('Uginania łokci z hantlami stojąc', '3 x 8', { rir: '2', tempo: '2011', rest: '90s' }),
        imp('Uginania ze sztangą na modlitewniku', '3 x 12', { rir: '2', tempo: '2011', rest: '90s' }),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Push', [
        imp('Wall Angel', '2 x 15', { superset: 'B', tempo: '3030', rest: '60s', note: '15 ruchów, bez przerwy do 1b. Po serii 60s przerwy i powtórz obwód.' }),
        imp('Rozciąganie gumy nad głową', '2 x 15', { superset: 'B', tempo: '1010', rest: '60s' }),
        imp('Przysiady wykroczne', '3 x 12', { rir: '2', tempo: '3010', rest: '90s' }),
        imp('Wejścia bokiem na skrzynię', '2 x 15', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('Pompki na poręczach', '3 x 8', { rir: '2', tempo: '3010', rest: '120s' }),
        imp('Wyciskanie hantla po skosie w górę', '3 x 12', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('OHP', '3 x 8', { rir: '2', tempo: '3010', rest: '120s' }),
      ]),
      day('day-4', 'Piątek', 'friday', 'Pull', [
        imp('Aniołki i demony', '2 x 12', { tempo: '2020', rest: '60s' }),
        imp('Wyprosty biodra z gumą', '2 x 15', { rir: '5', tempo: '2011', rest: '60s' }),
        imp('Hip Thrust ze sztangą', '3 x 8', { rir: '2', tempo: '3011', rest: '120s' }),
        imp('Zakroki sprinterskie', '3 x 12', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('Wiosłowanie Pendleya', '3 x 8', { rir: '2', tempo: '3010', rest: '120s' }),
        imp('Przenoszenie hantla za głowę', '3 x 12', { rir: '2', tempo: '2010', rest: '90s' }),
        imp('Uginania łokci ze sztangą stojąc', '3 x 8', { rir: '2', tempo: '2010', rest: '75s' }),
        imp('Uginania młotkowe hantlą', '3 x 15', { rir: '2', tempo: '2010', rest: '90s' }),
      ]),
    ],
  },
  {
    id: 'tpl-strength-5x5',
    name: 'Foundational Strength',
    description: 'Siła na bazie 5×5 na wielkich bojach (przysiad, wyciskanie, martwy ciąg, OHP, wiosłowanie). 3 treningi A/B, progres liniowy. Fundament siłowy.',
    goal: 'strength',
    objective: 'peak_strength',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Siła A', [
        ex('Przysiad ze sztangą (High Bar)', '5 x 5'),
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 5'),
        ex('Wiosłowanie sztangą', '5 x 5'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Siła B', [
        ex('Przysiad ze sztangą (High Bar)', '5 x 5'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '5 x 5'),
        ex('Martwy ciąg klasyczny', '1 x 5'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Siła A', [
        ex('Przysiad ze sztangą (High Bar)', '5 x 5'),
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 5'),
        ex('Wiosłowanie sztangą', '5 x 5'),
        ex('Wspięcia na palce (Nogi proste)', '3 x 12-15'),
      ]),
    ],
  },
  {
    id: 'tpl-powerbuilding-4',
    name: 'Powerbuilding Protocol',
    description: 'Połączenie siły i masy: każdy dzień startuje ciężkim bojem (przysiad / wyciskanie / martwy ciąg / OHP), potem akcesoria hipertroficzne. Dla zaawansowanych.',
    goal: 'strength',
    objective: 'peak_strength',
    level: 'advanced',
    daysPerWeek: 4,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Nogi', [
        ex('Przysiad ze sztangą (Low Bar)', '5 x 3-5'),
        ex('Prasa nożna', '3 x 8-10'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 12-15'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Klatka', [
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 3-5'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
        ex('Wyprosty na lince (Pushdown)', '3 x 12'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Plecy', [
        ex('Martwy ciąg klasyczny', '4 x 3-4'),
        ex('Wiosłowanie sztangą', '4 x 6-8'),
        ex('Podciąganie na drążku', '3 x MAX'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Barki', [
        ex('Wyciskanie sztangi nad głowę (OHP)', '5 x 3-5'),
        ex('Arnoldki', '3 x 8-10'),
        ex('Wznosy bokiem (Lateral Raise)', '4 x 12-15'),
        ex('Face Pull', '3 x 15'),
        ex('Skull Crushers', '3 x 10-12'),
      ]),
    ],
  },
  {
    id: 'tpl-lean-engine-4',
    name: 'Lean Engine',
    description: 'Spalanie i rekompozycja: obwody całego ciała z krótkimi przerwami, wysokie powtórzenia i wstawki kondycyjne. Utrzymuje mięśnie przy redukcji.',
    goal: 'fat_loss',
    objective: 'fat_loss',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 8,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Całe ciało A', [
        ex('Przysiad goblet', '3 x 15', { superset: 'A' }),
        ex('Pompki', '3 x MAX', { superset: 'A' }),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 12', { superset: 'A' }),
        ex('Burpees', '3 x 15'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Całe ciało B', [
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 12', { superset: 'B' }),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 12', { superset: 'B' }),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 12', { superset: 'B' }),
        ex('Mountain Climbers', '3 x 40'),
        ex('Skręty rosyjskie', '3 x 20'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Całe ciało C', [
        ex('Wykroki chodzone', '3 x 12/noga', { superset: 'C' }),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 12', { superset: 'C' }),
        ex('Wiosłowanie na lince siedząc', '3 x 12', { superset: 'C' }),
        ex('Burpees', '3 x 12'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Całe ciało D', [
        ex('Hip Thrust ze sztangą', '3 x 15', { superset: 'D' }),
        ex('Dips (pompki na poręczach)', '3 x MAX', { superset: 'D' }),
        ex('Podciąganie na drążku', '3 x MAX', { superset: 'D' }),
        ex('Mountain Climbers', '3 x 40'),
        ex('Plank', '3 x MAX'),
      ]),
    ],
  },
  {
    id: 'tpl-athletic-4',
    name: 'Kinetic Athlete',
    description: 'Moc i wydolność: ciężkie boje dla siły bazowej + wstawki eksplozywne i kondycyjne. Pod sport i funkcjonalną sprawność.',
    goal: 'strength',
    objective: 'athletic',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 10,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Dół', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 5'),
        ex('Wykroki bułgarskie', '3 x 8/noga'),
        ex('Hip Thrust ze sztangą', '3 x 8'),
         ex('Wspięcia na palce (Nogi proste)', '3 x 12'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Góra', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 5'),
        ex('Podciąganie na drążku', '4 x MAX'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 6'),
        ex('Face Pull', '3 x 15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Kondycja', [
        ex('Martwy ciąg klasyczny', '3 x 3'),
        ex('Burpees', '4 x 12'),
        ex('Mountain Climbers', '3 x 40'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Akcesoria', [
        ex('Wykroki chodzone', '3 x 12/noga'),
        ex('Wiosłowanie sztangą', '3 x 8'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12'),
        ex('Skręty rosyjskie', '3 x 20'),
      ]),
    ],
  },
  {
    id: 'tpl-rza-3',
    name: 'RZA V-Taper',
    description: 'Trzy dni A/B/C przez 12 tygodni. Nacisk na barki boczne, plecy i szerokość sylwetki (V-taper), sterowanie przez RPE i finishery kondycyjne. Dla świadomych, którzy lubią twarde, mierzalne treningi.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'advanced',
    daysPerWeek: 3,
    durationWeeks: 12,
    source: 'imported',
    days: [
      day('day-1', 'Dzień A', 'monday', 'Nogi + plecy + barki', [
        rza('Przysiad tylny', '5 x 3-5', { typ: 'Heavy', timer: 'E4MOM x5', rpe: '7-8', uwaga: 'Główny bój. Kontrola zejścia, bez grind reps.' }),
        rza('Podciaganie nachwytem', '5 x 4-8', { typ: 'Heavy', timer: 'E3MOM x5', rpe: '8', uwaga: 'Pełny zwis, depresja łopatki, bez kopania. Obciążenie/guma wg formy.' }),
        rza('Wioslowanie chest-supported', '4 rundy 30/20/10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8-9', uwaga: 'Bez pracy lędźwiami; prowadzenie łokcia. Na zmianę z lateral raise.' }),
        rza('Unoszenie bokiem linka/hantle', '4 rundy 30/20/10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8-9', uwaga: 'Priorytet barków. Zero bujania, kontrola górnej połowy ruchu.' }),
        rza('Reverse pec deck / rear delt fly', '3 rundy 40s', { typ: 'Timed', timer: 'E2MOM x5', rpe: '8', uwaga: 'Łopatki stabilne, ruch z barku. Na zmianę z core.' }),
        rza('Core: dead bug / plank RKC', '2 rundy 30-40s', { typ: 'Timed', timer: 'E2MOM x5', rpe: '7', uwaga: 'Jakość napięcia ważniejsza niż czas.' }),
        rza('Air bike / farmer walk', '8 min', { typ: 'Finisher', timer: 'EMOM 8', rpe: '7', uwaga: 'Bez zajechania; oddech pod kontrolą.' }),
      ]),
      day('day-2', 'Dzień B', 'wednesday', 'Push + tył uda + barki', [
        rza('Wyciskanie sztangi lezac', '5 x 3-5', { typ: 'Heavy', timer: 'E4MOM x5', rpe: '7-8', uwaga: 'Stabilne łopatki, nogi w podłodze.' }),
        rza('RDL - martwy rumunski', '4 x 6-8', { typ: 'Heavy', timer: 'E3MOM x4', rpe: '7-8', uwaga: '3 s ekscentryka, neutralny kręgosłup.' }),
        rza('Wyciskanie hantli siedzac / landmine', '4 rundy 6-10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8', uwaga: 'Kontrola toru, bez przeprostu lędźwi. Na zmianę z lateral raise.' }),
        rza('Unoszenie bokiem linka/hantle', '4 rundy 30/20/10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8-9', uwaga: 'Drugi bodziec barków. Zero bujania.' }),
        rza('Sciaganie drazka neutralnie', '3 rundy 35-45s', { typ: 'Timed', timer: 'E2MOM x6 alt', rpe: '8', uwaga: 'Łokcie do bioder, bez bujania.' }),
        rza('Face pull z rotacja', '3 rundy 35-45s', { typ: 'Timed', timer: 'E2MOM x6 alt', rpe: '7-8', uwaga: 'Rotacja zewnętrzna na końcu ruchu.' }),
        rza('AMRAP: swing/pompki/bike', '8 min', { typ: 'Finisher', timer: 'AMRAP 8', rpe: '7-8', uwaga: 'Równy rytm, nie rzeź.' }),
      ]),
      day('day-3', 'Dzień C', 'friday', 'Full body + V-taper', [
        rza('Trap bar deadlift / Front squat', '5 x 3-5', { typ: 'Heavy', timer: 'E4MOM x5', rpe: '7-8', uwaga: 'Wybierz jedną wersję na cały cykl (12 tygodni).' }),
        rza('Wioslowanie chest-supported', '5 x 6-8', { typ: 'Heavy', timer: 'E3MOM x5', rpe: '8', uwaga: 'Ciężkie plecy bez lędźwi; prowadzenie łokcia.' }),
        rza('Cable pullover / straight-arm pulldown', '4 rundy 30/20/10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8-9', uwaga: 'Szerokość pleców. Ruch przez bark; czuj najszerszy.' }),
        rza('Machine/cable lateral raise', '4 rundy 30/20/10', { typ: 'Timed', timer: 'E2MOM x8 alt', rpe: '8-9', uwaga: 'Najważniejszy blok estetyczny.' }),
        rza('Cable curl / modlitewnik', '3 rundy 40s', { typ: 'Timed', timer: 'E2MOM x6 alt', rpe: '8', uwaga: 'Dodatek; nie kradnij czasu plecom.' }),
        rza('Reverse pec deck / rear delt fly', '3 rundy 40s', { typ: 'Timed', timer: 'E2MOM x6 alt', rpe: '8', uwaga: 'Tył barku. Łopatki stabilne, ruch z barku.' }),
        rza('Ski erg / sled / farmer', '10 min', { typ: 'Finisher', timer: 'EMOM 10', rpe: '7-8', uwaga: 'Kondycja bez spalenia regeneracji.' }),
      ]),
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // X26/Z246: 12 planów z researchu evidence-based (YouTube/społeczność).
  // Źródła i pełne rozpiski: docs/RESEARCH-PLANY-TRENINGOWE-2026-08-11.md
  // ══════════════════════════════════════════════════════════════
  {
    id: 'tpl-minimalist-2',
    name: 'Minimalist Protocol',
    description: 'Minimalna objętość, maksymalny efekt (styl Jeffa Nipparda): 2 krótkie treningi całego ciała, serie blisko upadku, drop sety na izolacjach. Pod 45 minut.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'beginner',
    daysPerWeek: 2,
    durationWeeks: 8,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Całe ciało A', [
        ex('Wyciskanie hantli na ławce płaskiej', '2 x 6-10'),
        ex('Martwy Ciąg Rumuński (RDL)', '2 x 8-10'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '1 x 10-12', { superset: 'A' }),
        ex('Ściąganie drążka (Wąski nachwyt)', '1 x 10-12', { superset: 'A' }),
        ex('Wykroki bułgarskie', '1 x 8-10/noga'),
        ex('Wyprosty francuskie zza głowy', '1 x 12-15'),
        ex('Wznosy bokiem na maszynie', '1 x 12-15'),
        ex('Wspięcia na palce siedząc', '1 x 12-15'),
      ]),
      day('day-2', 'Czwartek', 'thursday', 'Całe ciało B', [
        ex('Hack Squat (maszyna)', '2 x 6-10'),
        ex('Wyciskanie sztangi na skosie', '2 x 10-12', { superset: 'A' }),
        ex('Wiosłowanie T-bar', '2 x 10-12', { superset: 'A' }),
        ex('Uginanie nóg na maszynie (Siedząc)', '1 x 10-12'),
        ex('Uginanie sztangi stojąc', '1 x 12-15'),
        ex('Modlitewnik (Cable Crunch)', '1 x 12-15'),
      ]),
    ],
  },
  {
    id: 'tpl-six-lifts-3',
    name: 'Six Lift Blueprint',
    description: 'Sześć tych samych ruchów na każdym treningu (styl Built With Science): pełne ciało 3× w tygodniu, prosty start i szybka nauka techniki. Progres przez dokładanie powtórzeń.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 8,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Całe ciało A', [
        ex('Wyciskanie hantli (Lekki skos)', '3 x 10-15'),
        ex('Przysiad goblet', '3 x 10-15'),
        ex('Podciąganie na drążku', '3 x 5-8'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 10-15'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-15'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 10-20'),
        ex('Dead Bug (Robak - Brzuch)', '3 x 5/strona'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Całe ciało B', [
        ex('Wyciskanie hantli (Lekki skos)', '3 x 10-15'),
        ex('Przysiad goblet', '3 x 10-15'),
        ex('Podciąganie na drążku', '3 x 5-8'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 10-15'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-15'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 10-20'),
        ex('Dead Bug (Robak - Brzuch)', '3 x 5/strona'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Całe ciało C', [
        ex('Wyciskanie hantli (Lekki skos)', '3 x 10-15'),
        ex('Przysiad goblet', '3 x 10-15'),
        ex('Podciąganie na drążku', '3 x 5-8'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 10-15'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-15'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 10-20'),
        ex('Dead Bug (Robak - Brzuch)', '3 x 5/strona'),
      ]),
    ],
  },
  {
    id: 'tpl-gzclp-3',
    name: 'Three Tier Strength',
    description: 'GZCLP: trzy poziomy pracy. Ciężki bój główny (T1: 5×3, ostatnia seria MAX), średni bój dodatkowy (T2: 3×10) i lekka izolacja (T3: 3×15). Idealny krok po programie 5×5.',
    goal: 'strength',
    objective: 'peak_strength',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Siła A', [
        ex('Przysiad ze sztangą (High Bar)', '5 x 3 (T1, ostatnia MAX)'),
        ex('Wyciskanie sztangi na ławce płaskiej', '3 x 10 (T2)'),
        ex('Prasa nożna', '3 x 15 (T3)'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 15 (T3)'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Siła B', [
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 3 (T1, ostatnia MAX)'),
        ex('Przysiad ze sztangą (High Bar)', '3 x 10 (T2)'),
        ex('Wyprosty na lince (Pushdown)', '3 x 15 (T3)'),
        ex('Wiosłowanie na lince siedząc', '3 x 15 (T3)'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Siła C', [
        ex('Martwy ciąg klasyczny', '5 x 3 (T1, ostatnia MAX)'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 10 (T2)'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 15 (T3)'),
        ex('Uginanie sztangi stojąc', '3 x 15 (T3)'),
      ]),
    ],
  },
  {
    id: 'tpl-calisthenics-3',
    name: 'Bodyweight Foundation',
    description: 'Kalistenika w duchu Recommended Routine (r/bodyweightfitness): pary ćwiczeń z masą ciała + core. Wystarczy drążek i poręcze (albo stół i dwa krzesła). Progres przez trudniejsze warianty.',
    goal: 'health',
    objective: 'athletic',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Kalistenika A', [
        ex('Podciąganie na drążku', '3 x 5-8', { superset: 'A' }),
        ex('Przysiady wykroczne', '3 x 5-8/noga', { superset: 'A' }),
        ex('Dips (pompki na poręczach)', '3 x 5-8', { superset: 'B' }),
        ex('Nordic Hamstring Curl', '3 x 5-8', { superset: 'B' }),
        ex('Australijskie podciąganie (Inverted Row)', '3 x 5-8', { superset: 'C' }),
        ex('Pompki', '3 x 5-8', { superset: 'C' }),
        ex('Plank', '3 x 30-60s'),
        ex('Hollow Hold', '3 x 15-30s'),
        ex('Superman (Unoszenie tułowia leżąc na brzuchu)', '3 x 8-12'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Kalistenika B', [
        ex('Podciąganie na drążku', '3 x 5-8', { superset: 'A' }),
        ex('Przysiady wykroczne', '3 x 5-8/noga', { superset: 'A' }),
        ex('Dips (pompki na poręczach)', '3 x 5-8', { superset: 'B' }),
        ex('Nordic Hamstring Curl', '3 x 5-8', { superset: 'B' }),
        ex('Australijskie podciąganie (Inverted Row)', '3 x 5-8', { superset: 'C' }),
        ex('Pompki', '3 x 5-8', { superset: 'C' }),
        ex('Plank', '3 x 30-60s'),
        ex('Hollow Hold', '3 x 15-30s'),
        ex('Superman (Unoszenie tułowia leżąc na brzuchu)', '3 x 8-12'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Kalistenika C', [
        ex('Podciąganie na drążku', '3 x 5-8', { superset: 'A' }),
        ex('Przysiady wykroczne', '3 x 5-8/noga', { superset: 'A' }),
        ex('Dips (pompki na poręczach)', '3 x 5-8', { superset: 'B' }),
        ex('Nordic Hamstring Curl', '3 x 5-8', { superset: 'B' }),
        ex('Australijskie podciąganie (Inverted Row)', '3 x 5-8', { superset: 'C' }),
        ex('Pompki', '3 x 5-8', { superset: 'C' }),
        ex('Plank', '3 x 30-60s'),
        ex('Hollow Hold', '3 x 15-30s'),
        ex('Superman (Unoszenie tułowia leżąc na brzuchu)', '3 x 8-12'),
      ]),
    ],
  },
  {
    id: 'tpl-glutes-3',
    name: 'Glute Foundations',
    description: 'Program w duchu Strong Curves (Bret Contreras): priorytet pośladków i dołu ciała z pracą całej sylwetki. Superserie pośladki+góra, zakresy 8-20 powtórzeń.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'beginner',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Pośladki A', [
        ex('Glute Bridge', '3 x 10-20', { superset: 'A' }),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 8-12', { superset: 'A' }),
        ex('Przysiad goblet', '3 x 10-15', { superset: 'B' }),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 8-12', { superset: 'B' }),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 10-15'),
        ex('Odwodziciele na maszynie', '1 x 15-30'),
        ex('Plank', '1 x 30-90s'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Pośladki B', [
        ex('Hip Thrust (Wypychanie bioder)', '3 x 10-15', { superset: 'A' }),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-12', { superset: 'A' }),
        ex('Wysoki step-up z hantlami', '3 x 10-15/noga', { superset: 'B' }),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 8-12', { superset: 'B' }),
        ex('Prostowniki grzbietu (Hyperextensions)', '3 x 10-20'),
        ex('Pallof Press', '1 x 10/strona'),
        ex('Hollow Hold', '1 x 20-45s'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Pośladki C', [
        ex('Mostek pośladkowy na jednej nodze', '3 x 10-15/noga', { superset: 'A' }),
        ex('Wiosłowanie na lince siedząc', '3 x 8-12', { superset: 'A' }),
        ex('Przysiad goblet', '3 x 10-15', { superset: 'B' }),
        ex('Wyciskanie hantli (Lekki skos)', '3 x 8-12', { superset: 'B' }),
        ex('Rumuński martwy ciąg z akcentem na pośladek', '3 x 10-15'),
        ex('Odwodzenie na lince', '1 x 15-20/strona'),
        ex('Cable Woodchopper', '1 x 10/strona'),
      ]),
    ],
  },
  {
    id: 'tpl-phul-4',
    name: 'Power Hypertrophy Upper Lower',
    description: 'PHUL: dwa dni siłowe (3-5 powtórzeń na bojach) i dwa objętościowe (8-12). Każda partia trenowana 2× w tygodniu. Siła i sylwetka jednocześnie.',
    goal: 'strength',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Góra Siła', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 3-5'),
        ex('Wyciskanie hantli (Lekki skos)', '3 x 6-10'),
        ex('Wiosłowanie sztangą', '4 x 3-5'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 6-10'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 5-8'),
        ex('Uginanie sztangi stojąc', '3 x 6-10'),
        ex('Skull Crushers', '3 x 6-10'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Dół Siła', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 3-5'),
        ex('Martwy ciąg klasyczny', '4 x 3-5'),
        ex('Prasa nożna', '4 x 10-15'),
        ex('Uginanie nóg na maszynie (Leżąc)', '4 x 6-10'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 6-10'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Góra Hipertrofia', [
        ex('Wyciskanie sztangi na skosie', '4 x 8-12'),
        ex('Rozpiętki hantlami', '3 x 8-12'),
        ex('Wiosłowanie na lince siedząc', '4 x 8-12'),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 8-12'),
        ex('Wznosy bokiem (Lateral Raise)', '4 x 8-12'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 8-12'),
        ex('Wyprosty na lince (Pushdown)', '3 x 8-12'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Dół Hipertrofia', [
        ex('Przysiad przedni ze sztangą (Front Squat)', '4 x 8-12'),
        ex('Wykroki chodzone', '3 x 8-12/noga'),
        ex('Wyprosty nóg na maszynie', '3 x 10-15'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 10-15'),
        ex('Wspięcia na palce siedząc', '4 x 8-12'),
        ex('Wspięcia na palce na suwnicy', '3 x 8-12'),
      ]),
    ],
  },
  {
    id: 'tpl-531-bbb-4',
    name: 'Iron Cycle 5/3/1',
    description: '5/3/1 Boring But Big (Jim Wendler): jeden ciężki bój dziennie wg procentów Training Max (90% 1RM), potem 5×10 boju pomocniczego. Tydzień 1: 5/5/5+, tydzień 2: 3/3/3+, tydzień 3: 5/3/1+, tydzień 4: deload. Po cyklu +2,5 kg góra / +5 kg dół.',
    goal: 'strength',
    objective: 'peak_strength',
    level: 'intermediate',
    daysPerWeek: 4,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'OHP + objętość', [
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 5/3/1 (% TM)'),
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 10 (50% TM)'),
        ex('Podciąganie na drążku', '5 x 10'),
        ex('Uginanie hantli hammer', '3 x 12'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Martwy ciąg + objętość', [
        ex('Martwy ciąg klasyczny', '3 x 5/3/1 (% TM)'),
        ex('Przysiad ze sztangą (High Bar)', '5 x 10 (50% TM)'),
        ex('Unoszenie nóg w zwisie', '5 x 12'),
        ex('Prostowniki grzbietu (Hyperextensions)', '3 x 12'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Wyciskanie + objętość', [
        ex('Wyciskanie sztangi na ławce płaskiej', '3 x 5/3/1 (% TM)'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '5 x 10 (50% TM)'),
        ex('Wiosłowanie sztangą', '5 x 10'),
        ex('Wyprosty na lince (Pushdown)', '3 x 12'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Przysiad + objętość', [
        ex('Przysiad ze sztangą (High Bar)', '3 x 5/3/1 (% TM)'),
        ex('Martwy ciąg klasyczny', '5 x 10 (50% TM)'),
        ex('Uginanie nóg na maszynie (Leżąc)', '5 x 10'),
        ex('Ab Rollout', '3 x 12'),
      ]),
    ],
  },
  {
    id: 'tpl-meso-4',
    name: 'Science Mesocycle',
    description: 'Hipertrofia sterowana objętością (inspiracja Renaissance Periodization): start na minimalnej skutecznej objętości, co tydzień +1 seria do części ćwiczeń i mniejszy zapas (RIR 3→0), tydzień 5 to deload. Dwa mezocykle.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'advanced',
    daysPerWeek: 4,
    durationWeeks: 10,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Góra A', [
        ex('Wyciskanie sztangi na skosie', '3 x 6-10'),
        ex('Wiosłowanie sztangą', '3 x 8-12'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '2 x 10-15'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '2 x 10-15'),
        ex('Wznosy bokiem na wyciągu', '2 x 12-20'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '2 x 10-15'),
        ex('Wyprosty francuskie zza głowy', '2 x 10-15'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Dół A', [
        ex('Przysiad ze sztangą (High Bar)', '3 x 6-10'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-12'),
        ex('Prasa nożna', '2 x 10-15'),
        ex('Uginanie nóg na maszynie (Siedząc)', '2 x 10-15'),
        ex('Wspięcia na palce (Nogi proste)', '3 x 10-15'),
        ex('Modlitewnik (Cable Crunch)', '2 x 12-20'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Góra B', [
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 8-12'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wiosłowanie na lince siedząc', '2 x 10-15'),
        ex('Pec Deck (Butterfly)', '2 x 12-20'),
        ex('Odwrotne rozpiętki (Tył barku)', '2 x 15-20'),
        ex('Uginanie na lince (Hammer)', '2 x 12-20'),
        ex('Wyprosty na lince (Pushdown)', '2 x 12-20'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Dół B', [
        ex('Hack Squat (maszyna)', '3 x 8-12'),
        ex('Hip Thrust ze sztangą', '3 x 8-12'),
        ex('Wyprosty nóg na maszynie', '2 x 12-20'),
        ex('Uginanie nóg na maszynie (Leżąc)', '2 x 10-15'),
        ex('Wspięcia na palce siedząc', '3 x 12-20'),
        ex('Unoszenie nóg w zwisie', '2 x 12-20'),
      ]),
    ],
  },
  {
    id: 'tpl-phat-5',
    name: 'PHAT Powerbuilding',
    description: 'PHAT (Layne Norton): 2 dni siłowe (3-5 powtórzeń) + 3 dni objętościowe (~85% ciężaru z dni siłowych, 8-20 powtórzeń). Bardzo wysoka objętość dla zaawansowanych z dobrą regeneracją.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'advanced',
    daysPerWeek: 5,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Góra Siła', [
        ex('Wiosłowanie sztangą', '3 x 3-5'),
        ex('Podciąganie na drążku', '2 x 6-10'),
        ex('Ściąganie drążka (Wąski nachwyt)', '2 x 6-10'),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 3-5'),
        ex('Dips (pompki na poręczach)', '2 x 6-10'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 6-10'),
        ex('Uginanie sztangi stojąc', '3 x 6-10'),
        ex('Skull Crushers', '3 x 6-10'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Dół Siła', [
        ex('Przysiad ze sztangą (High Bar)', '3 x 3-5'),
        ex('Hack Squat (maszyna)', '2 x 6-10'),
        ex('Wyprosty nóg na maszynie', '2 x 6-10'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 5-8'),
        ex('Uginanie nóg na maszynie (Leżąc)', '2 x 6-10'),
        ex('Wspięcia na palce (Nogi proste)', '3 x 6-10'),
        ex('Wspięcia na palce siedząc', '2 x 6-10'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Plecy + Barki', [
        ex('Wiosłowanie sztangą', '4 x 8-10'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-12'),
        ex('Wiosłowanie na lince siedząc', '3 x 8-12'),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '2 x 12-15'),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 8-12'),
        ex('Podciąganie sztangi wzdłuż tułowia (Upright Row)', '2 x 12-15'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-20'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Dół Hipertrofia', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 8-10'),
        ex('Prasa nożna', '2 x 12-15'),
        ex('Wyprosty nóg na maszynie', '3 x 15-20'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-12'),
        ex('Uginanie nóg na maszynie (Siedząc)', '2 x 15-20'),
        ex('Donkey Calf Raise', '4 x 10-15'),
        ex('Wspięcia na palce siedząc', '3 x 15-20'),
      ]),
      day('day-5', 'Sobota', 'saturday', 'Klatka + Ramiona', [
        ex('Wyciskanie hantli na ławce płaskiej', '4 x 8-10'),
        ex('Wyciskanie hantli (Lekki skos)', '3 x 8-12'),
        ex('Wyciskanie na maszynie Hammer', '3 x 12-15'),
        ex('Rozpiętki na lince (Crossover)', '2 x 15-20'),
        ex('Uginania ze sztangą na modlitewniku', '3 x 8-12'),
        ex('Uginanie na wyciągu dolnym', '2 x 12-15'),
        ex('Wyprosty francuskie zza głowy', '3 x 8-12'),
        ex('Kickback z hantlą', '2 x 15-20'),
      ]),
    ],
  },
  {
    id: 'tpl-hybrid-5',
    name: 'Hybrid Five',
    description: 'Hybryda Upper/Lower + Push/Pull/Legs: dwa cięższe dni siłowe (4-8 powtórzeń) i trzy objętościowe (8-20). Każdy mięsień 2× w tygodniu, dużo izolacji tam, gdzie robi różnicę.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 5,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Góra Siła', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 4-6'),
        ex('Wiosłowanie Pendleya', '4 x 5-8'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 6-8'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 8-12'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Dół Siła', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 4-6'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 6-8'),
        ex('Prasa nożna', '3 x 8-12'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 8-12'),
        ex('Ab Rollout', '3 x 10-15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Push', [
        ex('Wyciskanie hantli (Lekki skos)', '4 x 8-12'),
        ex('Wyciskanie na maszynie Hammer', '3 x 10-15'),
        ex('Wyciskanie nad głowę na maszynie', '3 x 10-12'),
        ex('Rozpiętki na lince (Crossover)', '3 x 12-15'),
        ex('Wznosy bokiem na wyciągu', '3 x 15-20'),
        ex('Wyprosty na lince (Pushdown)', '3 x 12-15'),
        ex('Wyprosty francuskie zza głowy', '2 x 12-15'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Pull', [
        ex('Ściąganie drążka (Szeroki nachwyt)', '4 x 10-12'),
        ex('Wiosłowanie na maszynie (Hammer)', '4 x 10-12'),
        ex('Wiosłowanie na lince siedząc', '3 x 12-15'),
        ex('Ściąganie linki prostymi ramionami', '3 x 12-15'),
        ex('Face Pull', '3 x 15-20'),
        ex('Uginanie na lince (Hammer)', '3 x 12-15'),
        ex('Uginanie na modlitewniku (Preacher)', '2 x 12-15'),
      ]),
      day('day-5', 'Sobota', 'saturday', 'Nogi', [
        ex('Hack Squat (maszyna)', '4 x 8-12'),
        ex('Hip Thrust ze sztangą', '3 x 10-12'),
        ex('Wykroki bułgarskie', '3 x 10-12/noga'),
        ex('Wyprosty nóg na maszynie', '3 x 12-20'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 12-15'),
        ex('Wspięcia na palce siedząc', '4 x 12-20'),
        ex('Modlitewnik (Cable Crunch)', '3 x 12-20'),
      ]),
    ],
  },
  {
    id: 'tpl-nsuns-5',
    name: 'Volume Max LP',
    description: 'nSuns 531LP: 9 serii boju głównego z falującymi procentami Training Max (65-95%, serie MAX sterują progresją) + 8 serii boju pokrewnego. Najcięższy plan w aplikacji. Wymaga nadwyżki kalorycznej i snu.',
    goal: 'strength',
    objective: 'peak_strength',
    level: 'advanced',
    daysPerWeek: 5,
    durationWeeks: 8,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Wyciskanie + OHP', [
        ex('Wyciskanie sztangi na ławce płaskiej', '9 x 1-8 (fala % TM)'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '8 x 3-8 (50-70% TM)'),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 12'),
        ex('Face Pull', '3 x 15'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Przysiad + Sumo', [
        ex('Przysiad ze sztangą (High Bar)', '9 x 1-8 (fala % TM)'),
        ex('Martwy ciąg sumo (akcent na plecy)', '8 x 3-8 (50-70% TM)'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 12'),
        ex('Modlitewnik (Cable Crunch)', '3 x 15'),
      ]),
      day('day-3', 'Środa', 'wednesday', 'OHP + skos', [
        ex('Wyciskanie sztangi nad głowę (OHP)', '9 x 1-8 (fala % TM)'),
        ex('Wyciskanie sztangi na skosie', '8 x 3-8 (50-70% TM)'),
        ex('Wiosłowanie na lince siedząc', '3 x 12'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 15'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Martwy ciąg + Front Squat', [
        ex('Martwy ciąg klasyczny', '9 x 1-8 (fala % TM)'),
        ex('Przysiad przedni ze sztangą (Front Squat)', '8 x 3-8 (50-70% TM)'),
        ex('Prostowniki grzbietu (Hyperextensions)', '3 x 12'),
        ex('Unoszenie nóg w zwisie', '3 x 15'),
      ]),
      day('day-5', 'Sobota', 'saturday', 'Wyciskanie + wąsko', [
        ex('Wyciskanie sztangi na ławce płaskiej', '9 x 1-8 (fala % TM)'),
        ex('Wyciskanie wąsko (Close-grip)', '8 x 3-8 (50-70% TM)'),
        ex('Wiosłowanie sztangą', '3 x 12'),
        ex('Uginanie sztangi stojąc', '3 x 15'),
      ]),
    ],
  },
  {
    id: 'tpl-arnold-6',
    name: 'Golden Era Split',
    description: 'Arnold Split w nowoczesnej objętości: Klatka+Plecy, Barki+Ramiona, Nogi. Każda sesja 2× w tygodniu, superserie antagonistyczne (klatka z plecami, biceps z tricepsem). Dla zaawansowanych.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'advanced',
    daysPerWeek: 6,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Klatka + Plecy A', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-10', { superset: 'A' }),
        ex('Wiosłowanie sztangą', '4 x 6-10', { superset: 'A' }),
        ex('Wyciskanie hantli (Lekki skos)', '3 x 8-12', { superset: 'B' }),
        ex('Podciąganie na drążku', '3 x 8-12', { superset: 'B' }),
        ex('Rozpiętki na lince (Crossover)', '3 x 12-15', { superset: 'C' }),
        ex('Wiosłowanie na lince siedząc', '3 x 12-15', { superset: 'C' }),
        ex('Pullover na lince', '2 x 12-15'),
        ex('Modlitewnik (Cable Crunch)', '3 x 15-20'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Barki + Ramiona A', [
        ex('Wyciskanie sztangi nad głowę (OHP)', '4 x 6-10'),
        ex('Arnoldki', '3 x 8-12'),
        ex('Wznosy bokiem (Lateral Raise)', '4 x 12-20'),
        ex('Odwrotne rozpiętki (Tył barku)', '3 x 15-20'),
        ex('Uginanie sztangi stojąc', '3 x 8-12', { superset: 'A' }),
        ex('Wyciskanie wąsko (Close-grip)', '3 x 8-12', { superset: 'A' }),
        ex('Uginanie hantli z supinacją (Ławka skośna)', '3 x 10-15', { superset: 'B' }),
        ex('Wyprosty na lince (Pushdown)', '3 x 10-15', { superset: 'B' }),
      ]),
      day('day-3', 'Środa', 'wednesday', 'Nogi A', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 6-10'),
        ex('Prasa nożna', '3 x 10-15'),
        ex('Wykroki chodzone', '3 x 10-12/noga'),
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 8-12'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-15'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 10-15'),
      ]),
      day('day-4', 'Czwartek', 'thursday', 'Klatka + Plecy B', [
        ex('Wyciskanie sztangi na skosie', '4 x 6-10', { superset: 'A' }),
        ex('Wiosłowanie T-bar', '4 x 6-10', { superset: 'A' }),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 8-12', { superset: 'B' }),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 8-12', { superset: 'B' }),
        ex('Rozpiętki hantlami', '3 x 12-15', { superset: 'C' }),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 12-15', { superset: 'C' }),
        ex('Ściąganie linki prostymi ramionami', '2 x 12-15'),
        ex('Unoszenie nóg w zwisie', '3 x 12-15'),
      ]),
      day('day-5', 'Piątek', 'friday', 'Barki + Ramiona B', [
        ex('Wyciskanie hantli nad głowę (Siedząc)', '4 x 6-10'),
        ex('Wznosy bokiem na wyciągu', '4 x 12-20'),
        ex('Face Pull', '3 x 15-20'),
        ex('Podciąganie sztangi wzdłuż tułowia (Upright Row)', '3 x 10-12'),
        ex('Uginania ze sztangą na modlitewniku', '3 x 8-12', { superset: 'A' }),
        ex('Skull Crushers', '3 x 8-12', { superset: 'A' }),
        ex('Uginanie hantli hammer', '3 x 10-15', { superset: 'B' }),
        ex('Wyprosty francuskie zza głowy', '3 x 10-15', { superset: 'B' }),
      ]),
      day('day-6', 'Sobota', 'saturday', 'Nogi B', [
        ex('Hack Squat (maszyna)', '4 x 8-12'),
        ex('Wykroki bułgarskie', '3 x 10-12/noga'),
        ex('Hip Thrust ze sztangą', '3 x 10-12'),
        ex('Uginanie nóg na maszynie (Siedząc)', '3 x 12-15'),
        ex('Wyprosty nóg na maszynie', '3 x 12-20'),
        ex('Wspięcia na palce siedząc', '4 x 15-20'),
      ]),
    ],
  },
];

export const getPlanTemplateById = (id: string): PlanTemplate | undefined =>
  planTemplates.find((t) => t.id === id);

/**
 * Rekomenduje plan na podstawie wyborów z onboardingu (cel × poziom × dni/tydz).
 * Punktacja: CZĘSTOTLIWOŚĆ = twardy priorytet (user świadomie wybrał liczbę dni na kroku 4,
 * więc rekomendacja musi ją uszanować — inaczej krok 5 pokazuje inną liczbę dni niż wybrana),
 * potem cel, potem poziom. Zawsze zwraca plan.
 */
export const getRecommendedPlan = (
  objective: PlanObjective,
  level: PlanTemplate['level'],
  daysPerWeek: number,
): PlanTemplate => {
  const levelRank: Record<PlanTemplate['level'], number> = { beginner: 0, intermediate: 1, advanced: 2 };
  const score = (t: PlanTemplate): number => {
    let s = 0;
    // Waga 1000 sprawia, że dopasowanie częstotliwości przebija cel (100) i poziom (10):
    // plan o pasującej liczbie dni zawsze wygrywa, a w obrębie tej samej liczby decyduje cel.
    s -= Math.abs(t.daysPerWeek - daysPerWeek) * 1000;
    if (t.objective === objective) s += 100;
    s -= Math.abs(levelRank[t.level] - levelRank[level]) * 10;
    return s;
  };
  return [...planTemplates].sort((a, b) => score(b) - score(a))[0];
};

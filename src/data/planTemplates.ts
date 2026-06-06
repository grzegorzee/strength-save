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
    id: 'tpl-ppl-3',
    name: 'Push Pull Legs Engine',
    description: 'Klasyczny podział na pchanie, ciągnięcie i nogi. Najpopularniejszy plan na budowę masy przy 3 treningach.',
    goal: 'muscle',
    objective: 'build_muscle',
    level: 'intermediate',
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      day('day-1', 'Poniedziałek', 'monday', 'Push (klatka, barki, triceps)', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 6-8'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 8-10'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12-15'),
        ex('Wyprosty na lince (Pushdown)', '3 x 10-12'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
      ]),
      day('day-2', 'Środa', 'wednesday', 'Pull (plecy, biceps)', [
        ex('Martwy ciąg klasyczny', '3 x 5'),
        ex('Podciąganie na drążku', '3 x 6-10'),
        ex('Wiosłowanie sztangą', '4 x 8-10'),
        ex('Wiosłowanie na lince siedząc', '3 x 10-12'),
        ex('Face Pull', '3 x 15'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
      ]),
      day('day-3', 'Piątek', 'friday', 'Legs (nogi, brzuch)', [
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
      day('day-5', 'Piątek', 'friday', 'Ramiona + brzuch', [
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
        imp('Rotacje ramienia z gumą frontem', '2 x 15', { superset: 'A', tempo: '2020', rest: '60s', note: 'Superseria z poprzednim ćwiczeniem — bez przerwy między 1a i 1b.' }),
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
      day('day-1', 'Poniedziałek', 'monday', 'Przysiad + nogi', [
        ex('Przysiad ze sztangą (Low Bar)', '5 x 3-5'),
        ex('Prasa nożna', '3 x 8-10'),
        ex('Uginanie nóg na maszynie (Leżąc)', '3 x 10-12'),
        ex('Wspięcia na palce (Nogi proste)', '4 x 12-15'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Wyciskanie + klatka', [
        ex('Wyciskanie sztangi na ławce płaskiej', '5 x 3-5'),
        ex('Wyciskanie sztangi na skosie', '3 x 8-10'),
        ex('Dips (pompki na poręczach)', '3 x 8-12'),
        ex('Wyprosty na lince (Pushdown)', '3 x 12'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Martwy ciąg + plecy', [
        ex('Martwy ciąg klasyczny', '4 x 3-4'),
        ex('Wiosłowanie sztangą', '4 x 6-8'),
        ex('Podciąganie na drążku', '3 x MAX'),
        ex('Uginanie sztangi stojąc', '3 x 10-12'),
      ]),
      day('day-4', 'Piątek', 'friday', 'OHP + barki', [
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
      day('day-1', 'Poniedziałek', 'monday', 'Obwód całego ciała A', [
        ex('Przysiad goblet', '3 x 15', { superset: 'A' }),
        ex('Pompki', '3 x MAX', { superset: 'A' }),
        ex('Wiosłowanie hantlem jednorącz (Laty)', '3 x 12', { superset: 'A' }),
        ex('Burpees', '3 x 15'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Obwód całego ciała B', [
        ex('Martwy Ciąg Rumuński (RDL)', '3 x 12', { superset: 'B' }),
        ex('Wyciskanie hantli nad głowę (Siedząc)', '3 x 12', { superset: 'B' }),
        ex('Ściąganie drążka (Szeroki nachwyt)', '3 x 12', { superset: 'B' }),
        ex('Mountain Climbers', '3 x 40'),
        ex('Skręty rosyjskie', '3 x 20'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Obwód całego ciała C', [
        ex('Wykroki chodzone', '3 x 12/noga', { superset: 'C' }),
        ex('Wyciskanie hantli na ławce płaskiej', '3 x 12', { superset: 'C' }),
        ex('Wiosłowanie na lince siedząc', '3 x 12', { superset: 'C' }),
        ex('Burpees', '3 x 12'),
        ex('Unoszenie nóg w zwisie', '3 x MAX'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Obwód całego ciała D', [
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
      day('day-1', 'Poniedziałek', 'monday', 'Dolne partie + moc', [
        ex('Przysiad ze sztangą (High Bar)', '4 x 5'),
        ex('Wykroki bułgarskie', '3 x 8/noga'),
        ex('Hip Thrust ze sztangą', '3 x 8'),
         ex('Wspięcia na palce (Nogi proste)', '3 x 12'),
      ]),
      day('day-2', 'Wtorek', 'tuesday', 'Górne partie + moc', [
        ex('Wyciskanie sztangi na ławce płaskiej', '4 x 5'),
        ex('Podciąganie na drążku', '4 x MAX'),
        ex('Wyciskanie sztangi nad głowę (OHP)', '3 x 6'),
        ex('Face Pull', '3 x 15'),
      ]),
      day('day-3', 'Czwartek', 'thursday', 'Kondycja + core', [
        ex('Martwy ciąg klasyczny', '3 x 3'),
        ex('Burpees', '4 x 12'),
        ex('Mountain Climbers', '3 x 40'),
        ex('Plank', '3 x MAX'),
      ]),
      day('day-4', 'Piątek', 'friday', 'Akcesoria atletyczne', [
        ex('Wykroki chodzone', '3 x 12/noga'),
        ex('Wiosłowanie sztangą', '3 x 8'),
        ex('Wznosy bokiem (Lateral Raise)', '3 x 12'),
        ex('Skręty rosyjskie', '3 x 20'),
      ]),
    ],
  },
];

export const getPlanTemplateById = (id: string): PlanTemplate | undefined =>
  planTemplates.find((t) => t.id === id);

/**
 * Rekomenduje plan na podstawie wyborów z onboardingu (cel × poziom × dni/tydz).
 * Punktacja: cel = najważniejszy, potem dopasowanie dni, potem poziom. Zawsze zwraca plan.
 */
export const getRecommendedPlan = (
  objective: PlanObjective,
  level: PlanTemplate['level'],
  daysPerWeek: number,
): PlanTemplate => {
  const levelRank: Record<PlanTemplate['level'], number> = { beginner: 0, intermediate: 1, advanced: 2 };
  const score = (t: PlanTemplate): number => {
    let s = 0;
    if (t.objective === objective) s += 100;
    s -= Math.abs(t.daysPerWeek - daysPerWeek) * 15;
    s -= Math.abs(levelRank[t.level] - levelRank[level]) * 10;
    return s;
  };
  return [...planTemplates].sort((a, b) => score(b) - score(a))[0];
};

// Fictional local demo data for native store captures. No real account is used.
const localISO = (date) => {
  const copy = new Date(date);
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`;
};

const daysAgo = (count) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - count);
  return localISO(date);
};

const mondayOfWeek = (weeksAgo = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const sinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - sinceMonday - weeksAgo * 7);
  return date;
};

const dateFromMonday = (weeksAgo, dayOffset) => {
  const date = mondayOfWeek(weeksAgo);
  date.setDate(date.getDate() + dayOffset);
  return localISO(date);
};

const set = (reps, weight) => ({ reps, weight, completed: true });
const exercise = (exerciseId, name, weight, reps = 8) => ({
  exerciseId,
  name,
  sets: [set(reps, weight), set(reps, weight), set(reps, weight)],
});

const dayDefinitions = [
  {
    dayId: 'day-1',
    dayName: 'Poniedziałek',
    dayFocus: 'Chest / Squat / Mid Back',
    offset: 0,
    exercises: [
      ['ex-1-1', 'Wyciskanie hantli (Lekki skos)', 34, 8],
      ['ex-1-2', 'Przysiad ze sztangą (High Bar)', 102.5, 6],
      ['ex-1-3', 'Wiosłowanie hantlami na ławce (przodem)', 32, 10],
    ],
  },
  {
    dayId: 'day-2',
    dayName: 'Środa',
    dayFocus: 'Wide Back / Hamstrings / Flat Chest',
    offset: 2,
    exercises: [
      ['ex-2-1', 'Wyciskanie sztangi na ławce płaskiej', 82.5, 6],
      ['ex-2-2', 'Martwy Ciąg Rumuński (RDL)', 95, 8],
      ['ex-2-3', 'Ściąganie drążka (Szeroki nachwyt)', 65, 10],
    ],
  },
  {
    dayId: 'day-3',
    dayName: 'Piątek',
    dayFocus: 'Shoulders / Unilateral / Accessories',
    offset: 4,
    exercises: [
      ['ex-3-1', 'Wyciskanie hantli nad głowę (Siedząc)', 26, 8],
      ['ex-3-2', 'Wiosłowanie hantlem jednorącz (Laty)', 36, 10],
      ['ex-3-3', 'Hip Thrust (Wypychanie bioder)', 120, 8],
    ],
  },
];

// Six completed weeks give every history/progress screen meaningful data while
// leaving the current Monday workout ready to start on the Today screen.
const workouts = dayDefinitions.flatMap((day, dayIndex) => (
  Array.from({ length: 6 }, (_, index) => {
    const weeksAgo = index + 1;
    const progression = (5 - index) * 1.25;
    return {
      id: `store-${day.dayId}-w${weeksAgo}`,
      userId: 'e2e-test-user',
      dayId: day.dayId,
      dayName: day.dayName,
      dayFocus: day.dayFocus,
      date: dateFromMonday(weeksAgo, day.offset),
      completed: true,
      durationSec: 3120 + dayIndex * 240 + index * 45,
      cycleId: 'store-cycle-active',
      exercises: day.exercises.map(([id, name, baseWeight, reps]) => (
        exercise(id, name, Math.round((baseWeight - 6.25 + progression) * 4) / 4, reps)
      )),
    };
  })
));

const planDays = [
  {
    id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday',
    focus: 'Chest / Squat / Mid Back',
    exercises: [
      { id: 'ex-1-1', name: 'Wyciskanie hantli (Lekki skos)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-1-2', name: 'Przysiad ze sztangą (High Bar)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-1-3', name: 'Wiosłowanie hantlami na ławce (przodem)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-1-4', name: 'Uginanie nóg na maszynie (Siedząc)', sets: '3 x 10-12', instructions: [] },
    ],
  },
  {
    id: 'day-2', dayName: 'Środa', weekday: 'wednesday',
    focus: 'Wide Back / Hamstrings / Flat Chest',
    exercises: [
      { id: 'ex-2-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-2-2', name: 'Martwy Ciąg Rumuński (RDL)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-2-3', name: 'Ściąganie drążka (Szeroki nachwyt)', sets: '3 x 8-12', instructions: [] },
      { id: 'ex-2-4', name: 'Wykroki chodzone', sets: '3 x 10', instructions: [] },
    ],
  },
  {
    id: 'day-3', dayName: 'Piątek', weekday: 'friday',
    focus: 'Shoulders / Unilateral / Accessories',
    exercises: [
      { id: 'ex-3-1', name: 'Wyciskanie hantli nad głowę (Siedząc)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-3-2', name: 'Wiosłowanie hantlem jednorącz (Laty)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-3-3', name: 'Hip Thrust (Wypychanie bioder)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-3-4', name: 'Wyprosty nóg na maszynie', sets: '3 x 10-12', instructions: [] },
    ],
  },
];

const planStart = dateFromMonday(8, 0);
const plan = {
  name: 'Strength & Hypertrophy',
  days: planDays,
  startDate: planStart,
  durationWeeks: 12,
  progression: { enabled: true, deloadEveryWeeks: 5 },
};

const cycles = [{
  id: 'store-cycle-active',
  userId: 'e2e-test-user',
  name: 'Strength & Hypertrophy',
  days: planDays,
  durationWeeks: 12,
  startDate: planStart,
  status: 'active',
  createdAt: new Date(mondayOfWeek(8)).toISOString(),
  stats: { totalWorkouts: workouts.length, totalTonnage: 0, prs: [], completionRate: 100 },
}];

const dismissedDates = Array.from({ length: 60 }, (_, count) => {
  const iso = daysAgo(count);
  return [iso, `week:${iso}`];
}).flat();

const authState = {
  scenario: 'active-user',
  email: 'demo@example.com',
  displayName: 'Alex',
  subscription: { tier: 'yearly', status: 'active', expiresAt: '2027-12-31T00:00:00.000Z' },
  hasWorkouts: true,
  trainingProfile: { level: 'intermediate', objective: 'build_muscle', daysPerWeek: 3 },
};


export { authState, plan, workouts, cycles, dismissedDates };

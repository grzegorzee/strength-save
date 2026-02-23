import type { WorkoutSession, BodyMeasurement } from '@/types';
import type { TrainingDay } from '@/data/trainingPlan';
import { calculateStreak, getWeekBounds } from '@/lib/summary-utils';

// --- Types ---

export interface CoachInsight {
  type: 'plateau' | 'progress' | 'consistency' | 'suggestion' | 'warning';
  title: string;
  message: string;
  exerciseId?: string;
  priority: 'high' | 'medium' | 'low';
}

interface CoachData {
  trainingPlan: {
    dayId: string;
    dayName: string;
    exercises: { id: string; name: string; sets: string }[];
  }[];
  recentWorkouts: {
    date: string;
    dayId: string;
    exercises: { name: string; sets: { reps: number; weight: number }[] }[];
  }[];
  bodyWeight: { date: string; weight: number }[];
  stats: {
    streak: number;
    completedTotal: number;
    avgWorkoutsPerWeek: number;
  };
}

// --- System prompt ---

const SYSTEM_PROMPT = `Jesteś osobistym trenerem siłowym. Analizujesz dane treningowe i dajesz konkretne,
praktyczne sugestie. Mów po polsku, bezpośrednio, bez zbędnych wstępów.

TWOJE ZADANIA:
1. Wykryj plateau (brak progresji ciężaru/objętości przez ≥2 tygodnie)
2. Zauważ pozytywne trendy (rosnące ciężary, lepsza frekwencja)
3. Zwróć uwagę na problemy z konsystencją (pomijane treningi)
4. Sugeruj techniki przełamania plateau (pause reps, drop sets, tempo, deload)
5. Analizuj proporcje objętości między grupami mięśniowymi

ZASADY:
- Odpowiadaj TYLKO w formacie JSON (tablica obiektów CoachInsight)
- Max 5-7 insightów, posortowane od najważniejszych
- Bądź konkretny — podawaj liczby (kg, tygodnie, %)
- Nie powtarzaj danych — interpretuj je
- Jeśli dane są niewystarczające (< 3 tygodnie), powiedz to

Format odpowiedzi:
[
  {
    "type": "plateau" | "progress" | "consistency" | "suggestion" | "warning",
    "title": "Krótki tytuł",
    "message": "Szczegółowy opis z liczbami i konkretną sugestią",
    "exerciseId": "ex-1-1",
    "priority": "high" | "medium" | "low"
  }
]`;

// --- Data preparation ---

export function prepareCoachData(
  workouts: WorkoutSession[],
  measurements: BodyMeasurement[],
  plan: TrainingDay[],
): CoachData {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  // Build exercise name map
  const exerciseNames = new Map<string, string>();
  plan.forEach(day => {
    day.exercises.forEach(ex => {
      exerciseNames.set(ex.id, ex.name);
    });
  });

  // Filter completed workouts from last 8 weeks
  const recentCompleted = workouts
    .filter(w => w.completed && new Date(w.date) >= eightWeeksAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const recentWorkouts = recentCompleted.map(w => ({
    date: w.date,
    dayId: w.dayId,
    exercises: w.exercises.map(ex => ({
      name: exerciseNames.get(ex.exerciseId) || ex.exerciseId,
      sets: ex.sets
        .filter(s => s.completed && !s.isWarmup)
        .map(s => ({ reps: s.reps, weight: s.weight })),
    })),
  }));

  // Body weight from measurements
  const bodyWeight = measurements
    .filter(m => m.weight && m.weight > 0 && new Date(m.date) >= eightWeeksAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(m => ({ date: m.date, weight: m.weight! }));

  // Stats
  const completedAll = workouts.filter(w => w.completed);
  const streak = calculateStreak(workouts);

  // Average workouts per week (last 8 weeks)
  const weeksWithWorkouts = new Set<string>();
  recentCompleted.forEach(w => {
    const { start } = getWeekBounds(new Date(w.date));
    weeksWithWorkouts.add(start.toISOString().split('T')[0]);
  });
  const weekCount = Math.max(weeksWithWorkouts.size, 1);
  const avgWorkoutsPerWeek = Math.round((recentCompleted.length / weekCount) * 10) / 10;

  return {
    trainingPlan: plan.map(day => ({
      dayId: day.id,
      dayName: day.dayName,
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
      })),
    })),
    recentWorkouts,
    bodyWeight,
    stats: {
      streak,
      completedTotal: completedAll.length,
      avgWorkoutsPerWeek,
    },
  };
}

// --- OpenAI API call ---

async function callOpenAI(
  messages: { role: 'system' | 'user'; content: string }[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Brak klucza API OpenAI. Ustaw VITE_OPENAI_API_KEY w .env');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages,
      temperature: 0.7,
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Błąd OpenAI API: ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '[]';
}

// --- Swap types ---

export interface SwapSuggestion {
  original: string;
  alternatives: {
    name: string;
    reason: string;
    setsScheme: string;
  }[];
}

// --- Summary types ---

export interface WorkoutSummaryResult {
  headline: string;
  highlights: string[];
  comparison: string;
  motivation: string;
}

// --- Plan suggestion types ---

export interface PlanSuggestion {
  overview: string;
  changes: {
    dayId: string;
    dayName: string;
    action: 'add' | 'remove' | 'swap' | 'modify';
    exercise: string;
    detail: string;
  }[];
  reasoning: string;
}

// --- System prompts ---

const SWAP_SYSTEM_PROMPT = `Jesteś trenerem siłowym. Użytkownik nie może wykonać danego ćwiczenia i prosi o zamiennik.

ZASADY:
- Podaj 3 alternatywy, od najlepszej
- Każda musi angażować te same grupy mięśniowe
- Uwzględnij typowy sprzęt siłowni (hantle, sztanga, maszyny, linka)
- Podaj schemat serii (np. "3 x 8-10")
- Odpowiadaj TYLKO w formacie JSON

Format:
{
  "original": "Nazwa oryginalnego ćwiczenia",
  "alternatives": [
    { "name": "Zamiennik 1", "reason": "Dlaczego pasuje", "setsScheme": "3 x 8-10" },
    { "name": "Zamiennik 2", "reason": "...", "setsScheme": "3 x 6-8" },
    { "name": "Zamiennik 3", "reason": "...", "setsScheme": "3 x 10-12" }
  ]
}`;

const SUMMARY_SYSTEM_PROMPT = `Jesteś trenerem siłowym. Podsumowujesz trening użytkownika. Mów po polsku, krótko, konkretnie.

ZASADY:
- headline: 1 zdanie podsumowujące (max 15 słów)
- highlights: 2-4 punkty — PRy, rekordy, ciekawe obserwacje (z liczbami!)
- comparison: 1-2 zdania porównujące z poprzednim treningiem tego dnia
- motivation: 1 krótkie zdanie motywacyjne
- Odpowiadaj TYLKO w formacie JSON

Format:
{
  "headline": "Solidny trening klatki — +2.5 kg na wyciskaniu!",
  "highlights": ["PR na wyciskaniu: 55 kg x 7", "Tonaż: 4200 kg (+8%)"],
  "comparison": "W porównaniu do ostatniego poniedziałku: ciężar na benchpresie +2.5 kg, wiosłowanie bez zmian.",
  "motivation": "Trzeci trening z rzędu — nie zatrzymuj się!"
}`;

const PLAN_SYSTEM_PROMPT = `Jesteś trenerem siłowym. Na podstawie historii treningów i aktualnego planu sugerujesz modyfikacje.

ZASADY:
- overview: 2-3 zdania ogólnej oceny planu
- changes: max 3-5 konkretnych zmian, posortowane od najważniejszych
- reasoning: 2-3 zdania dlaczego te zmiany
- Bądź konkretny — podawaj nazwy ćwiczeń, schematy serii
- Nie zmieniaj wszystkiego — ewoluuj plan
- Odpowiadaj TYLKO w formacie JSON

Format:
{
  "overview": "Plan jest dobry, ale brakuje objętości na barki...",
  "changes": [
    { "dayId": "day-1", "dayName": "Poniedziałek", "action": "swap", "exercise": "Nazwa", "detail": "Zamień X na Y (3x8-10) — lepsze aktywowanie..." },
    { "dayId": "day-2", "dayName": "Środa", "action": "add", "exercise": "Face pulls", "detail": "Dodaj 3x15 na końcu — balans barków..." }
  ],
  "reasoning": "Zmiany celują w..."
}`;

// --- Main analysis function ---

export async function analyzeWithAI(data: CoachData): Promise<CoachInsight[]> {
  if (data.recentWorkouts.length < 6) {
    return [{
      type: 'warning',
      title: 'Za mało danych',
      message: `Mam tylko ${data.recentWorkouts.length} treningów z ostatnich 8 tygodni. Potrzebuję minimum 6 ukończonych treningów (ok. 2-3 tygodnie), żeby dać sensowną analizę. Trenuj dalej!`,
      priority: 'medium',
    }];
  }

  const userMessage = `Przeanalizuj moje dane treningowe:\n\n${JSON.stringify(data, null, 2)}`;

  const raw = await callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error('Odpowiedź AI nie jest tablicą');
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return parsed.sort(
    (a: CoachInsight, b: CoachInsight) =>
      (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2),
  );
}

// --- Swap function ---

export async function getSwapSuggestions(
  exerciseName: string,
  reason: string,
  plan: TrainingDay[],
): Promise<SwapSuggestion> {
  const planContext = plan.map(d => ({
    day: d.dayName,
    exercises: d.exercises.map(e => e.name),
  }));

  const userMessage = `Nie mogę robić: "${exerciseName}"
Powód: ${reason || 'brak sprzętu / dyskomfort'}
Mój aktualny plan: ${JSON.stringify(planContext)}

Zaproponuj 3 zamienniki.`;

  const raw = await callOpenAI([
    { role: 'system', content: SWAP_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

// --- Summary function ---

export async function generateWorkoutSummary(
  workout: WorkoutSession,
  previousWorkout: WorkoutSession | undefined,
  plan: TrainingDay[],
): Promise<WorkoutSummaryResult> {
  const exerciseNames = new Map<string, string>();
  plan.forEach(day => {
    day.exercises.forEach(ex => {
      exerciseNames.set(ex.id, ex.name);
    });
  });

  const formatWorkout = (w: WorkoutSession) => ({
    date: w.date,
    dayId: w.dayId,
    exercises: w.exercises.map(ex => ({
      name: exerciseNames.get(ex.exerciseId) || ex.exerciseId,
      sets: ex.sets
        .filter(s => s.completed)
        .map(s => ({
          reps: s.reps,
          weight: s.weight,
          isWarmup: s.isWarmup || false,
        })),
    })),
  });

  const current = formatWorkout(workout);
  const previous = previousWorkout ? formatWorkout(previousWorkout) : null;

  const userMessage = `Podsumuj ten trening:

DZISIEJSZY TRENING:
${JSON.stringify(current, null, 2)}

${previous ? `POPRZEDNI TRENING (ten sam dzień):
${JSON.stringify(previous, null, 2)}` : 'Brak poprzedniego treningu do porównania.'}`;

  const raw = await callOpenAI([
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

// --- Plan suggestion function ---

export async function suggestPlanChanges(data: CoachData): Promise<PlanSuggestion> {
  if (data.recentWorkouts.length < 6) {
    return {
      overview: 'Za mało danych do analizy planu. Potrzebuję minimum 6 ukończonych treningów.',
      changes: [],
      reasoning: 'Trenuj przez 2-3 tygodnie, a potem wróć po sugestie zmian w planie.',
    };
  }

  const userMessage = `Przeanalizuj mój plan treningowy i historię, zasugeruj zmiany:

${JSON.stringify(data, null, 2)}`;

  const raw = await callOpenAI([
    { role: 'system', content: PLAN_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

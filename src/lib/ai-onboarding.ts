import { callOpenAI } from '@/lib/ai-coach';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

export interface OnboardingAnswers {
  goal: string;
  experience: string;
  daysPerWeek: number;
  equipment: string[];
  injuries: string;
}

const weekdayMap: Record<number, { name: string; weekday: string }[]> = {
  2: [
    { name: 'Poniedziałek', weekday: 'monday' },
    { name: 'Czwartek', weekday: 'thursday' },
  ],
  3: [
    { name: 'Poniedziałek', weekday: 'monday' },
    { name: 'Środa', weekday: 'wednesday' },
    { name: 'Piątek', weekday: 'friday' },
  ],
  4: [
    { name: 'Poniedziałek', weekday: 'monday' },
    { name: 'Wtorek', weekday: 'tuesday' },
    { name: 'Czwartek', weekday: 'thursday' },
    { name: 'Piątek', weekday: 'friday' },
  ],
  5: [
    { name: 'Poniedziałek', weekday: 'monday' },
    { name: 'Wtorek', weekday: 'tuesday' },
    { name: 'Środa', weekday: 'wednesday' },
    { name: 'Czwartek', weekday: 'thursday' },
    { name: 'Piątek', weekday: 'friday' },
  ],
};

export interface GeneratedPlan {
  days: TrainingDay[];
  planDurationWeeks: number;
}

export async function generateTrainingPlan(answers: OnboardingAnswers): Promise<GeneratedPlan> {
  const libraryStr = exerciseLibrary.map(ex =>
    `- ${ex.name} (${ex.category}, ${ex.type})`
  ).join('\n');

  const daysInfo = weekdayMap[answers.daysPerWeek] || weekdayMap[3];

  const systemPrompt = `Jesteś trenerem siłowym. Na podstawie odpowiedzi użytkownika generujesz plan treningowy.

DOSTĘPNE ĆWICZENIA Z BIBLIOTEKI (PRIORYTET — używaj tych nazw!):
${libraryStr}

ZASADY:
1. PRIORYTET: Dobieraj ćwiczenia z biblioteki powyżej. Używaj DOKŁADNYCH nazw z listy.
2. FALLBACK: Jeśli w bibliotece brakuje ćwiczenia na daną partię (np. user ma tylko ciężar ciała) — możesz dodać swoje.
3. Dopasuj sety/powtórzenia do doświadczenia:
   - Początkujący: 3x10-12 (więcej powtórzeń, mniej ciężaru)
   - Średnio-zaawansowany: 3-4x6-10
   - Zaawansowany: 4-5x4-8
4. Uwzględnij kontuzje/ograniczenia.
5. Każdy dzień powinien mieć 5-8 ćwiczeń.
6. Ustal czas trwania planu (planDurationWeeks): 8-12 tygodni, w zależności od celu i doświadczenia.
7. Odpowiadaj TYLKO w formacie JSON.

FORMAT ODPOWIEDZI (obiekt z planDurationWeeks i days):
{
  "planDurationWeeks": 12,
  "days": [
    {
      "id": "day-1",
      "dayName": "Poniedziałek",
      "weekday": "monday",
      "focus": "Klatka / Triceps",
      "exercises": [
        { "id": "ex-1-1", "name": "Wyciskanie sztangi na ławce płaskiej", "sets": "3x8-10" },
        { "id": "ex-1-2", "name": "...", "sets": "3x10-12" }
      ]
    }
  ]
}

Dni treningowe do wygenerowania: ${daysInfo.map(d => `${d.name} (${d.weekday})`).join(', ')}
ID format: day-1, day-2, day-3... ; ćwiczenia: ex-1-1, ex-1-2, ex-2-1...`;

  const userMessage = `Wygeneruj plan treningowy na podstawie moich odpowiedzi:

CEL: ${answers.goal}
DOŚWIADCZENIE: ${answers.experience}
DNI W TYGODNIU: ${answers.daysPerWeek}
DOSTĘPNY SPRZĘT: ${answers.equipment.join(', ')}
KONTUZJE/OGRANICZENIA: ${answers.injuries || 'Brak'}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // Support both new format { planDurationWeeks, days: [...] } and legacy [...] format
      const days: unknown[] = Array.isArray(parsed) ? parsed : parsed.days;
      const planDurationWeeks: number = !Array.isArray(parsed) && parsed.planDurationWeeks
        ? Math.min(16, Math.max(4, parsed.planDurationWeeks))
        : 12;

      if (!Array.isArray(days)) throw new Error('Odpowiedź nie zawiera tablicy dni');

      // Validate structure
      for (const day of days) {
        const d = day as Record<string, unknown>;
        if (!d.id || !d.dayName || !d.weekday || !d.focus || !Array.isArray(d.exercises)) {
          throw new Error(`Nieprawidłowy format dnia: ${JSON.stringify(day)}`);
        }
        for (const ex of d.exercises as Record<string, unknown>[]) {
          if (!ex.id || !ex.name || !ex.sets) {
            throw new Error(`Nieprawidłowy format ćwiczenia: ${JSON.stringify(ex)}`);
          }
        }
      }

      return { days: days as TrainingDay[], planDurationWeeks };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Nieznany błąd');
    }
  }

  throw lastError || new Error('Nie udało się wygenerować planu');
}

export async function generatePlanFromCycle(
  answers: OnboardingAnswers,
  previousCycle: PlanCycle,
): Promise<GeneratedPlan> {
  const libraryStr = exerciseLibrary.map(ex =>
    `- ${ex.name} (${ex.category}, ${ex.type})`
  ).join('\n');

  const daysInfo = weekdayMap[answers.daysPerWeek] || weekdayMap[3];

  const previousPlanJson = JSON.stringify(previousCycle.days.map(d => ({
    dayName: d.dayName,
    focus: d.focus,
    exercises: d.exercises.map(e => ({ name: e.name, sets: e.sets })),
  })));

  const previousStatsStr = previousCycle.stats.prs.length > 0
    ? `Rekordy osobiste z poprzedniego cyklu:\n${previousCycle.stats.prs.map(pr => `- ${pr.exerciseName}: ${pr.weight}kg (est. 1RM: ${pr.estimated1RM}kg)`).join('\n')}`
    : 'Brak rekordów osobistych z poprzedniego cyklu.';

  const systemPrompt = `Jesteś trenerem siłowym. Generujesz NOWY plan treningowy na bazie poprzedniego planu z progresją.

DOSTĘPNE ĆWICZENIA Z BIBLIOTEKI:
${libraryStr}

POPRZEDNI PLAN (JSON):
${previousPlanJson}

STATYSTYKI POPRZEDNIEGO CYKLU:
- Czas trwania: ${previousCycle.durationWeeks} tygodni
- Ukończone treningi: ${previousCycle.stats.totalWorkouts}
- Tonaż: ${(previousCycle.stats.totalTonnage / 1000).toFixed(1)}t
- Frekwencja: ${previousCycle.stats.completionRate}%
${previousStatsStr}

ZASADY:
1. Na bazie POPRZEDNIEGO PLANU stwórz plan z PROGRESJĄ:
   - Zwiększ objętość (więcej serii lub ćwiczeń) jeśli frekwencja > 80%
   - Zamień ćwiczenia na warianty jeśli plateau (ten sam ciężar)
   - Zachowaj ćwiczenia które działały (wysoki 1RM)
2. Używaj DOKŁADNYCH nazw z biblioteki ćwiczeń.
3. Uwzględnij cel użytkownika i kontuzje.
4. Każdy dzień: 5-8 ćwiczeń.
5. planDurationWeeks: 8-12 tygodni.
6. Odpowiadaj TYLKO w formacie JSON.

FORMAT (identyczny):
{
  "planDurationWeeks": 12,
  "days": [
    {
      "id": "day-1",
      "dayName": "Poniedziałek",
      "weekday": "monday",
      "focus": "Klatka / Triceps",
      "exercises": [
        { "id": "ex-1-1", "name": "Wyciskanie sztangi na ławce płaskiej", "sets": "4x6-8" }
      ]
    }
  ]
}

Dni: ${daysInfo.map(d => `${d.name} (${d.weekday})`).join(', ')}
ID format: day-1, day-2... ; ćwiczenia: ex-1-1, ex-1-2...`;

  const userMessage = `Wygeneruj NOWY plan z progresją na bazie poprzedniego cyklu.

CEL: ${answers.goal}
DOŚWIADCZENIE: ${answers.experience}
DNI W TYGODNIU: ${answers.daysPerWeek}
DOSTĘPNY SPRZĘT: ${answers.equipment.join(', ')}
KONTUZJE/OGRANICZENIA: ${answers.injuries || 'Brak'}

Dodatkowe uwagi: Zachowaj ćwiczenia bazowe które dobrze działały, dodaj progresję w seriach/powtórzeniach, zamień akcesoria na warianty.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const days: unknown[] = Array.isArray(parsed) ? parsed : parsed.days;
      const planDurationWeeks: number = !Array.isArray(parsed) && parsed.planDurationWeeks
        ? Math.min(16, Math.max(4, parsed.planDurationWeeks))
        : 12;

      if (!Array.isArray(days)) throw new Error('Odpowiedź nie zawiera tablicy dni');

      for (const day of days) {
        const d = day as Record<string, unknown>;
        if (!d.id || !d.dayName || !d.weekday || !d.focus || !Array.isArray(d.exercises)) {
          throw new Error(`Nieprawidłowy format dnia: ${JSON.stringify(day)}`);
        }
        for (const ex of d.exercises as Record<string, unknown>[]) {
          if (!ex.id || !ex.name || !ex.sets) {
            throw new Error(`Nieprawidłowy format ćwiczenia: ${JSON.stringify(ex)}`);
          }
        }
      }

      return { days: days as TrainingDay[], planDurationWeeks };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Nieznany błąd');
    }
  }

  throw lastError || new Error('Nie udało się wygenerować planu');
}

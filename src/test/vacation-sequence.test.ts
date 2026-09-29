import { describe, expect, it, vi } from 'vitest';
import { mapReminderPlanDoc, runDailyReminder, type DailyReminderDeps } from '../../functions/src/daily-reminder';
import { runReducedModeEndingPush, VACATION_TEXTS } from '../../functions/src/reduced-mode-push';
import { buildVacationMode, vacationToAdviceWindow } from '@/lib/vacation-mode';
import { isPlannedDateBlocked } from '@/lib/plan-date-block';
import { DEFAULT_PROGRESSION } from '@/lib/progression-engine';
import { buildPrefillForExercise, resolveSessionTargets } from '@/lib/session-targets';
import { addCalendarDays } from '@/lib/utils';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

// F2+F3 (2026-09-29), zasada 5: SEKWENCJA, nie pojedynczy ekran.
// ustaw urlop -> dni urlopu bez pushy (i zablokowane w UI) -> endDate: push
// kończący "~85%, potem ~92%" -> dzień po: push "Czas na trening" -> start:
// prefill 85% -> zakończenie -> następna sesja 92% -> potem normalnie.

const EX = { id: 'tpl-ex-3', name: 'Wyciskanie hantli na ławce skośnej', sets: '3 x 8', instructions: [] };
const DAYS: TrainingDay[] = [
  { id: 'd1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Push', exercises: [EX] },
  { id: 'd2', dayName: 'Środa', weekday: 'wednesday', focus: 'Pull', exercises: [] },
  { id: 'd3', dayName: 'Piątek', weekday: 'friday', focus: 'Nogi', exercises: [] },
];

const completedSession = (date: string, weight: number): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'd1',
  date,
  completed: true,
  exercises: [{ exerciseId: EX.id, name: EX.name, sets: [1, 2, 3].map(() => ({ reps: 8, weight, completed: true })) }],
});

describe('sekwencja urlopu: pushe -> prefill 85% -> 92% -> normalnie', () => {
  it('pełna ścieżka na danych w kształcie produkcyjnym', async () => {
    // 1. User ustawia urlop (ta sama funkcja co VacationDialog -> setVacation).
    const vacation = buildVacationMode('2026-09-22', 6, 'none');
    expect(vacation).toEqual({ startDate: '2026-09-22', endDate: '2026-09-27', activity: 'none', extendedWeeks: 1 });
    const planDoc = {
      days: DAYS,
      startDate: '2026-08-31',
      scheduleOverrides: { '2026-09-22': 'd1' },
      vacation,
      status: 'active',
    };

    const reminderDeps = (dateISO: string): DailyReminderDeps => ({
      listTokenRegistrations: vi.fn(async () => [{ id: 'r1', userId: 'u1', token: 't1' }]),
      getUsers: vi.fn(async () => new Map([['u1', { displayName: 'Grzegorz' }]])),
      getPlanDays: vi.fn(async () => new Map([['u1', mapReminderPlanDoc(planDoc)]])),
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: tokens.length,
        failureCount: 0,
        responses: tokens.map(() => ({ success: true })),
      })),
      deleteRegistrations: vi.fn(async () => undefined),
      getTodayWorkout: vi.fn(async () => null),
      now: new Date(`${dateISO}T05:00:00Z`),
    });

    // 2. Dni urlopu: zero pushy "Czas na trening" i każdy dzień zablokowany w UI.
    for (let offset = 0; offset < 6; offset += 1) {
      const dateISO = addCalendarDays('2026-09-22', offset);
      const deps = reminderDeps(dateISO);
      await runDailyReminder(deps);
      expect(deps.sendMulticast, dateISO).not.toHaveBeenCalled();
      expect(isPlannedDateBlocked(dateISO, { vacation })).toBe(true);
    }

    // 3. endDate wieczorem: push kończący urlop z obietnicą rampy.
    const endingSend = vi.fn(async (tokens: string[]) => ({
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(() => ({ success: true })),
    }));
    await runReducedModeEndingPush({
      getUsersWithModeEndingToday: async () => (planDoc.vacation.endDate === '2026-09-27' ? ['u1'] : []),
      listTokenRegistrations: async () => [{ id: 'r1', userId: 'u1', token: 't1' }],
      getUsers: async () => new Map([['u1', { displayName: 'Grzegorz' }]]),
      sendMulticast: endingSend,
      deleteRegistrations: async () => undefined,
    }, VACATION_TEXTS);
    expect(endingSend).toHaveBeenCalledWith(['t1'], VACATION_TEXTS.title.pl, VACATION_TEXTS.body.pl);
    expect(VACATION_TEXTS.body.pl).toContain('~85%');

    // 4. Dzień po urlopie: push wraca, dzień nie jest zablokowany.
    const mondayDeps = reminderDeps('2026-09-28');
    await runDailyReminder(mondayDeps);
    expect(mondayDeps.sendMulticast).toHaveBeenCalledTimes(1);
    expect(isPlannedDateBlocked('2026-09-28', { vacation })).toBe(false);

    // 5. Start treningu 28.09: prefill = 85% bazy sprzed urlopu (40 -> 34).
    const window = vacationToAdviceWindow(vacation);
    const prefillOn = (workouts: WorkoutSession[], dateISO: string, week: number) => {
      const targets = resolveSessionTargets({
        day: DAYS[0],
        workouts,
        progression: DEFAULT_PROGRESSION,
        week,
        deloadApplied: false,
        isAdhocDay: false,
        reducedMode: window,
        sessionDateISO: dateISO,
        trackingByName: { [EX.name]: 'weight_reps' },
      });
      const last = [...workouts].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
      return { target: targets?.[EX.id], sets: buildPrefillForExercise(EX, targets?.[EX.id], last.exercises[0].sets, false) };
    };
    const workouts: WorkoutSession[] = [completedSession('2026-09-21', 40)];
    const first = prefillOn(workouts, '2026-09-28', 5);
    expect(first.sets.map((s) => s.weight)).toEqual([34, 34, 34]);

    // 6. Zakończenie sesji (tym, co wpisał prefill) -> następna sesja 92% (37).
    workouts.push(completedSession('2026-09-28', 34));
    const second = prefillOn(workouts, '2026-10-05', 6);
    expect(second.sets.map((s) => s.weight)).toEqual([37, 37, 37]);

    // 7. Po dwóch sesjach rampy: normalna progresja (bez celu trybu).
    workouts.push(completedSession('2026-10-05', 37));
    const third = prefillOn(workouts, '2026-10-12', 7);
    expect(third.target?.kind).toBe('progress');
    expect(third.target?.reasonKey).toBe('progression.reason.progress');
    expect(third.sets[0].weight).toBeGreaterThan(37);
  });
});

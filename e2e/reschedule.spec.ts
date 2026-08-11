// Przełożenie treningu (spec 2026-08-11, krok 7): hak e2e seeduje
// scheduleOverrides — Dashboard liczy dzień przez resolver, hero-karta pokazuje
// PRZEŁOŻONY dzień, dzień źródłowy znika z tygodnia, wejście w trening działa.
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  localToday,
  navigateAndWait,
  setE2EPlanMeta,
} from './helpers';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const localWeekday = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return WEEKDAYS[d.getDay()];
};

// Poniedziałek bieżącego tygodnia (jak getStartOfPlanWeek).
const localMonday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const planDay = (id: string, dayName: string, weekday: string, exerciseName: string) => ({
  id,
  dayName,
  weekday,
  focus: 'Full body',
  exercises: [{ id: `${id}-ex-1`, name: exerciseName, sets: '3 x 8', instructions: [] }],
});

test.describe('Przełożenie treningu (scheduleOverrides w mock E2E)', () => {
  test('override podmienia dzisiejszy dzień: hero i ekran treningu = przełożony day-b', async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));

    const today = localToday();
    // day-a normalnie DZIŚ; day-b normalnie za 3 dni. Override: dziś gra day-b.
    const days = [
      planDay('day-a', 'Dzień A E2E', localWeekday(0), 'Wyciskanie E2E'),
      planDay('day-b', 'Dzień B E2E', localWeekday(3), 'Przysiad E2E'),
    ];
    await setE2EPlanMeta(page, {
      days,
      durationWeeks: 8,
      startDate: localMonday(),
      scheduleOverrides: { [today]: 'day-b' },
    });

    await navigateAndWait(page, '/');
    await expectPageRendered(page);

    // Hero dzisiejszego treningu = przełożony day-b.
    await expect(page.getByText('Dzień B E2E').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rozpocznij trening' })).toBeVisible();

    // Wejście przez hero DOWODZI, że dziś gra day-b: ekran treningu ma ćwiczenie
    // day-b, a ćwiczenia dnia źródłowego (day-a) nie ma wcale.
    await page.getByRole('button', { name: 'Rozpocznij trening' }).click();
    await expect(page.locator('.exercise-card').first()).toBeVisible();
    await expect(page.getByText('Przysiad E2E').first()).toBeVisible();
    await expect(page.getByText('Wyciskanie E2E')).toHaveCount(0);
  });
});

// Repro zgłoszenia usera z builda 92 (2026-08-12): przełożenie piątek->sobota
// przez UI. Oczekiwane: sobota pojawia się na Dashboardzie, piątek znika,
// a po zamknięciu sheeta apka pozostaje INTERAKTYWNA (body bez pointer-events:
// none / scroll-locka od Radix Sheet).
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  navigateAndWait,
  setE2EPlanMeta,
} from './helpers';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const localDate = (offsetDays: number): { iso: string; weekday: string } => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return {
    iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    weekday: WEEKDAYS[d.getDay()],
  };
};

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

test.describe('Przełożenie treningu przez UI (repro builda 92)', () => {
  test('jutrzejszy dzień -> pojutrze: sheet zamyka się czysto, apka klikalna, tydzień przerysowany', async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));

    // Trening JUTRO (zawsze w horyzoncie karty tygodnia gdy jutro>=poniedziałku,
    // a akcja przełożenia jest niezależnie od tygodnia widoczna na karcie).
    const tomorrow = localDate(1);
    const dayAfter = localDate(2);
    await setE2EPlanMeta(page, {
      days: [planDay('day-src', 'Dzień Źródłowy E2E', tomorrow.weekday, 'Wyciskanie E2E')],
      durationWeeks: 8,
      startDate: localMonday(),
    });

    // D-T3: karty dni tygodnia (i akcja przełożenia) mieszkają na Planie.
    await navigateAndWait(page, '/plan');
    await expectPageRendered(page);

    // Karta jutrzejszego dnia z akcją przełożenia.
    const rescheduleBtn = page.getByRole('button', { name: 'Przełóż trening' }).first();
    await expect(rescheduleBtn).toBeVisible();
    await rescheduleBtn.click();

    // Sheet otwarty: wybór daty pojutrze.
    await expect(page.getByRole('heading', { name: 'Przełóż trening' })).toBeVisible();
    const targetRow = page.locator('button').filter({ hasText: new RegExp(`, ${Number(dayAfter.iso.slice(8, 10))} `) }).first();
    await targetRow.click();

    // (a) Sheet znika i body NIE zostaje z blokadą Radix (zwiecha z builda 92).
    await expect(page.getByRole('heading', { name: 'Przełóż trening' })).toBeHidden();
    await expect.poll(async () => page.evaluate(() => ({
      pointerEvents: document.body.style.pointerEvents,
      scrollLocked: document.body.hasAttribute('data-scroll-locked'),
      overlays: document.querySelectorAll('[data-radix-focus-guard], [data-state="open"][role="dialog"]').length,
    }))).toEqual({ pointerEvents: '', scrollLocked: false, overlays: 0 });

    // (b) Zapis widoczny w seamie e2e (localStorage jak dokument planu).
    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('fittracker_e2e_plan') ?? '{}'));
    expect(stored.scheduleOverrides).toEqual({ [tomorrow.iso]: null, [dayAfter.iso]: 'day-src' });

    // (c) Apka NADAL interaktywna: nawigacja tapnięciem działa.
    await page.getByRole('link', { name: /Plan/i }).or(page.getByText('PLAN', { exact: true })).first().click();
    await expectPageRendered(page);
  });
});

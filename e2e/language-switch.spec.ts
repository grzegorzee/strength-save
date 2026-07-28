import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
} from './helpers';

// X21 (Z163-Z166): w trybie EN żaden ekran nie może pokazywać polskich stringów.
// Sprawdzamy trzy miejsca wskazane w planie: rozgrzewka, panel admina, ekran treningu.

const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();
const POLISH_CHARS = /[ąćęłńóśźż]/i;

const setLanguage = async (page: Page, lang: 'pl' | 'en') => {
  await page.addInitScript((value) => localStorage.setItem('app-language', value), lang);
};

test.describe('przełączenie języka: zero mieszanych stringów (X21)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
  });

  test('EN: rozgrzewka bez polskich nazw, PL: bez angielskich wtrąceń', async ({ page }) => {
    await setLanguage(page, 'en');
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Start workout/i }).click();
    await page.getByRole('button', { name: /Warm-?up/i }).first().click();

    const enDialog = page.getByRole('dialog');
    await expect(enDialog).toBeVisible();
    await expect(enDialog.getByText('Jumping Jacks', { exact: true })).toBeVisible();
    // Lista pozycji (nazwy + czasy) musi być w 100% EN. Opis dialogu niesie focus dnia,
    // czyli DANE planu — tłumaczone tokenowo, patrz tech debt w PLAN-X21 (ODŁOŻONE).
    const enItems = await enDialog.locator('button:has(.h-6.w-6)').allInnerTexts();
    expect(enItems.length).toBeGreaterThan(5);
    expect(enItems.filter((textContent) => POLISH_CHARS.test(textContent))).toEqual([]);
    await page.keyboard.press('Escape');

    await setLanguage(page, 'pl');
    await page.reload();
    await expectPageRendered(page);
    await page.getByRole('button', { name: /Rozgrzewka/i }).first().click();

    const plDialog = page.getByRole('dialog');
    await expect(plDialog).toBeVisible();
    await expect(plDialog.getByText('Pajacyki', { exact: true })).toBeVisible();
    const plText = (await plDialog.locator('button:has(.h-6.w-6)').allInnerTexts()).join('\n');
    // Angielskie nazwy zniknęły z polskiego słownika (Z163).
    expect(plText).not.toMatch(/Jumping Jacks|Child's Pose|Pigeon Pose|Hip Circles/i);
    await page.keyboard.press('Escape');
  });

  test('EN: panel admina bez polskich stringów', async ({ page }) => {
    await setLanguage(page, 'en');
    await navigateAndWait(page, '/admin');
    await expectPageRendered(page);

    const body = (await page.locator('body').innerText()) ?? '';
    // Treści wpisane przez userów (notatki waitlisty, nazwy kont) to DANE, nie interfejs.
    const polishLines = body
      .split('\n')
      .filter((line) => POLISH_CHARS.test(line))
      .filter((line) => !/invite do testów/i.test(line));
    expect(polishLines).toEqual([]);
  });

  test('EN: ekran treningu bez polskich stringów interfejsu', async ({ page }) => {
    await setLanguage(page, 'en');
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);

    const body = (await page.locator('body').innerText()) ?? '';
    // Nazwy ćwiczeń/dni są kanonicznie PL w danych planu e2e — wykluczamy je,
    // sprawdzamy wyłącznie chrom interfejsu.
    const uiLines = body
      .split('\n')
      .filter((line) => POLISH_CHARS.test(line))
      .filter((line) => !/Wyciskanie|Wiosłowanie|Przysiad|Podciąganie|Martwy|Uginanie|Prostowanie|Wznosy|Poniedziałek|Wtorek|Środa|Czwartek|Piątek|Sobota|Niedziela|Góra|Dół|Nogi|Klatka|Plecy|Barki|Ramiona|Brzuch|Pośladki|Łydki/i.test(line));
    expect(uiLines).toEqual([]);
  });
});

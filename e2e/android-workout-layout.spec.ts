import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { blockFirebase, navigateAndWait, readWorkoutDraftDb, setE2EPlanMeta, skipPreStartWarmup } from './helpers';

const name = 'Wyciskanie hantli nad głowę (Siedząc)';
const output = 'audit/feedback-2026-09-09/android50-layout';

// Feature-isolation test: an older engine ignores every @container rule. This
// removes those rules from real CSSOM, not just CSS.supports()'s reported value.
// It does not emulate all bugs/features of a specific Huawei WebView version.
const ignoreContainerQueries = async (page: Page) => page.evaluate(() => {
  let removed = 0;
  const strip = (sheet: CSSStyleSheet | CSSGroupingRule) => {
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
      const rule = sheet.cssRules[i];
      if (rule.cssText.startsWith('@container')) { sheet.deleteRule(i); removed++; }
      else if ('cssRules' in rule) strip(rule as CSSGroupingRule);
    }
  };
  for (const sheet of document.styleSheets) { try { strip(sheet); } catch { /* Cross-origin fonts are unrelated. */ } }
  return removed;
});

const seed = async (page: Page) => {
  await blockFirebase(page);
  await page.route('**/cloudfunctions.net/**', (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-09-11T10:00:00+02:00'));
  await setE2EPlanMeta(page, {
    startDate: '2026-08-31', durationWeeks: 10,
    days: [{ id: 'android-day', dayName: 'Piątek', weekday: 'friday', focus: 'Full Body C', exercises: [
      { id: 'android-ohp', name, sets: '3 x 8-12', instructions: [] },
      { id: 'android-rdl', name: 'Martwy Ciąg Rumuński (RDL)', sets: '3 x 8-10', instructions: [] },
    ] }],
  });
  await page.addInitScript(() => {
    localStorage.setItem('app-language', 'pl');
    localStorage.setItem('fittracker_e2e_cloud_writes', 'true');
    if (!localStorage.getItem('fittracker_e2e_workouts')) localStorage.setItem('fittracker_e2e_workouts', JSON.stringify([{
      id: 'android-history', userId: 'e2e-test-user', dayId: 'android-day', date: '2026-09-04', completed: true,
      exercises: [{ exerciseId: 'android-ohp', name: 'Wyciskanie hantli nad głowę (Siedząc)',
        sets: Array.from({ length: 3 }, () => ({ reps: 6, weight: 40, completed: true })),
      }],
    }]));
  });
};

for (const width of [360, 375, 393]) for (const legacy of [false, true]) {
  test(`standard text ${width}px, ${legacy ? 'without container queries' : 'modern engine'}: compact complete workout`, async ({ page }, info) => {
    await seed(page);
    await page.setViewportSize({ width, height: 800 });
    await navigateAndWait(page, '/workout/android-day?date=2026-09-11');
    const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(card.locator('.exercise-set-row')).toHaveCount(3);
    if (legacy) expect(await ignoreContainerQueries(page)).toBeGreaterThan(0);
    const previewRowHeight = await card.locator('.exercise-set-row').first().evaluate(element => element.getBoundingClientRect().height);
    expect(previewRowHeight).toBeLessThanOrEqual(legacy ? 88 : 64);
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
    await expect(page.getByTestId('prestart-sheet')).toBeVisible({ timeout: 10000 });
    await skipPreStartWarmup(page);
    await expect(page.getByText('Trening rozpoczęty!', { exact: true })).toBeVisible();
    await page.locator('[toast-close]').first().click();
    await expect(page.getByText('Trening rozpoczęty!', { exact: true })).toBeHidden();
    await expect(page.locator('.exercise-card')).toHaveCount(2);
    await expect(card.locator('.exercise-set-row')).toHaveCount(3);
    const facts = await card.evaluate((element) => {
      const table = element.querySelector('[data-testid="set-table"]')!;
      const row = table.querySelector('.exercise-set-row')!;
      const rowBounds = row.getBoundingClientRect();
      const previous = row.querySelector('[data-field-label="Poprz."]')!;
      return {
        rootFont: getComputedStyle(document.documentElement).fontSize,
        rowHeight: rowBounds.height,
        tableOverflow: table.scrollWidth - table.clientWidth,
        previous: previous.textContent,
        previousOverflow: previous.scrollWidth - previous.clientWidth,
        controls: [...row.querySelectorAll('input, button')].map((control) => {
          const bounds = control.getBoundingClientRect();
          return { label: control.getAttribute('aria-label'), width: bounds.width, height: bounds.height,
            contained: bounds.left >= rowBounds.left && bounds.right <= rowBounds.right };
        }),
      };
    });
    expect(facts.rootFont).toBe('16px');
    expect(facts.rowHeight).toBeLessThanOrEqual(legacy ? 88 : 64);
    expect(facts.tableOverflow).toBeLessThanOrEqual(0);
    expect(facts.previous).toBe('40×6');
    expect(facts.previousOverflow).toBeLessThanOrEqual(0);
    expect(facts.controls).toHaveLength(4);
    for (const control of facts.controls) {
      expect(control.contained).toBe(true);
      expect(control.width).toBeGreaterThanOrEqual(control.label?.endsWith(', kg') ? 56 : 44);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    await card.evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 8, behavior: 'instant' }));
    const directory = `${output}/${info.project.name}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/workout-${width}-${legacy ? 'legacy' : 'modern'}.png` });
    await card.getByRole('textbox', { name: /Set 1, kg/ }).fill('42.5');
    await card.getByRole('textbox', { name: /Set 1, kg/ }).blur();
    await card.getByRole('spinbutton', { name: /Set 1, Powt\./ }).fill('11');
    await expect(card.getByTestId('set-grid-header')).toContainText('0/3');
    await expect.poll(async () => {
      const draft = await readWorkoutDraftDb(page, 'e2e-test-user') as {
        exerciseSets?: Record<string, Array<{ weight: number; reps: number }>>;
      } | null;
      return draft?.exerciseSets?.['android-ohp']?.[0];
    }).toMatchObject({ weight: 42.5, reps: 11 });
    await page.reload();
    await expect(card.getByRole('textbox', { name: /Set 1, kg/ })).toHaveValue('42.5');
    await expect(card.getByRole('spinbutton', { name: /Set 1, Powt\./ })).toHaveValue('11');
    await expect(page.locator('.exercise-card')).toHaveCount(2);
    await expect(card.locator('.exercise-set-row')).toHaveCount(3);
    await writeFile(`${directory}/workout-${width}-${legacy ? 'legacy' : 'modern'}.json`, JSON.stringify({ previewRowHeight, ...facts }, null, 2));
  });
}

test('without container queries: all tracking types retain every usable field and remove action at 360px', async ({ page }, info) => {
  await blockFirebase(page);
  await page.route('**/cloudfunctions.net/**', route => route.abort());
  await page.setViewportSize({ width: 360, height: 800 });
  await page.clock.setFixedTime(new Date('2026-09-11T10:00:00+02:00'));
  const exercises = [
    { name: 'Martwy Ciąg Rumuński (RDL)', sets: '1 x 8-10' },
    { name: 'Podciąganie na drążku podchwytem', sets: '1 x 8-10' },
    { name: 'Podciąganie wspomagane na maszynie', sets: '1 x 8-10' },
    { name: 'Plank', sets: '1 x 45s' },
    { name: "Spacer farmera (Farmer's Walk)", sets: '1 x 45s' },
  ];
  await setE2EPlanMeta(page, { startDate: '2026-08-31', durationWeeks: 10,
    days: [{ id: 'legacy-tracking-day', dayName: 'Piątek', weekday: 'friday', focus: 'Full Body',
      exercises: exercises.map((exercise, index) => ({ ...exercise, id: `legacy-${index}`, instructions: [] })),
    }],
  });
  await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
  await navigateAndWait(page, '/workout/legacy-tracking-day?date=2026-09-11');
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
  await expect(page.getByTestId('prestart-sheet')).toBeVisible({ timeout: 10000 });
  await skipPreStartWarmup(page);
  for (const close of await page.locator('[toast-close]').all()) await close.click();
  expect(await ignoreContainerQueries(page)).toBeGreaterThan(0);
  await expect(page.locator('.exercise-card')).toHaveCount(5);
  const facts = [];
  for (const exercise of exercises) {
    const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: exercise.name, exact: true }) });
    const row = card.locator('.exercise-set-row');
    await expect(row).toHaveCount(1);
    const controls = row.locator('input, button');
    for (const control of await controls.all()) {
      await control.scrollIntoViewIfNeeded();
      const bounds = await control.evaluate(element => {
        const box = element.getBoundingClientRect();
        const row = element.closest('.exercise-set-row')!.getBoundingClientRect();
        return { width: box.width, height: box.height, contained: box.left >= row.left && box.right <= row.right };
      });
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.contained).toBe(true);
      facts.push({ exercise: exercise.name, label: await control.getAttribute('aria-label'), ...bounds });
    }
    expect(await card.getByTestId('set-table').evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
    const firstInput = row.locator('input').first();
    await firstInput.fill('12');
    await firstInput.blur();
    await expect(firstInput).toHaveValue('12');
    await row.getByRole('button', { name: 'Usuń serię', exact: true }).click();
    await expect(page.getByTestId('remove-set-confirm')).toBeVisible();
    await page.getByTestId('remove-set-cancel').click();
    await expect(card.getByTestId('set-grid-header')).toContainText('0/1');
    await expect(firstInput).toHaveValue('12');
  }
  const directory = `${output}/${info.project.name}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/legacy-tracking.json`, JSON.stringify(facts, null, 2));
});

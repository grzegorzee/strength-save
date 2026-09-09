import { test, expect, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { blockFirebase, navigateAndWait, setE2EPlanMeta, skipPreStartWarmup } from './helpers';

const exerciseName = 'Martwy Ciąg Rumuński (RDL)';
const noteKey = 'martwy-ciag-rumunski-rdl';
const outputDir = 'audit/feedback-2026-09-09/exercise-card';

const assertTouchTarget = async (control: Locator) => {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
};

for (const scenario of [
  { width: 393, height: 852, rootFontPx: 16, suffix: '393x852' },
  { width: 320, height: 852, rootFontPx: 20, suffix: '320x852-text125' },
  { width: 320, height: 852, rootFontPx: 32, suffix: '320x852-text200' },
]) {
  test(`RDL target, pinned note and working sets remain readable and editable: ${scenario.suffix}`, async ({ page }, testInfo) => {
    await blockFirebase(page);
    await page.route('**/cloudfunctions.net/**', (route) => route.abort());
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.clock.setFixedTime(new Date('2026-09-09T10:00:00+02:00'));
    await setE2EPlanMeta(page, {
      startDate: '2026-08-31', durationWeeks: 10,
      progression: { enabled: true, deloadEveryWeeks: 5 },
      days: [{ id: 'density-day', dayName: 'Środa', weekday: 'wednesday', focus: 'Full Body', exercises: [
        { id: 'density-rdl', name: exerciseName, sets: '3 x 8-10', instructions: [] },
      ] }],
    });
    const initialWorkouts = [{
      id: 'density-previous', userId: 'e2e-test-user', dayId: 'density-day', date: '2026-09-02',
      completed: true, durationSec: 3600, revision: 1,
      exercises: [{ exerciseId: 'density-rdl', name: exerciseName,
        sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 60, completed: true })),
      }],
    }];
    await page.addInitScript(({ exerciseName, noteKey, rootFontPx, initialWorkouts }) => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('fittracker_e2e_cloud_writes', 'true');
      if (!localStorage.getItem('fittracker_e2e_workouts')) {
        localStorage.setItem('fittracker_e2e_workouts', JSON.stringify(initialWorkouts));
      }
      if (!localStorage.getItem('fittracker_e2e_exercise_notes')) localStorage.setItem('fittracker_e2e_exercise_notes', JSON.stringify({
        [noteKey]: { userId: 'e2e-test-user', exerciseName, note: 'Pin nr6', updatedAt: 1 },
      }));
      // Browser approximation of enlarged text; this is not an iOS Dynamic Type test.
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${rootFontPx}px`; });
    }, { exerciseName, noteKey, rootFontPx: scenario.rootFontPx, initialWorkouts });

    await navigateAndWait(page, '/workout/density-day');
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
    await skipPreStartWarmup(page);
    await page.locator('[toast-close]').first().click();
    await expect(page.getByText('Trening rozpoczęty!', { exact: true })).toBeHidden();
    const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: exerciseName, exact: true }) });
    await expect(card).toHaveCount(1);
    const name = card.getByRole('heading', { name: exerciseName, exact: true });
    const target = card.getByTestId('exercise-card-target');
    const note = card.getByTestId('pinned-note-text');
    const firstWeight = card.getByRole('textbox', { name: /Set 1, kg/ });
    const tableHeader = card.getByTestId('set-grid-header');
    await expect(target).toContainText('Cel tygodnia');
    await expect(target).toContainText('62.5 kg');
    await expect(target).toContainText('×8');
    await expect(note).toHaveText('Pin nr6');
    await expect(tableHeader).toContainText('0/3');
    await expect(firstWeight).toBeEnabled();
    await expect(firstWeight).toHaveValue('62.5');

    // Align the card below the actual app header, as after an ordinary scroll.
    await card.evaluate((element) => {
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - header - 8, behavior: 'instant' });
    });
    await expect(name).toBeInViewport();
    await expect(target).toBeInViewport();
    await expect(note).toBeInViewport();
    if (scenario.rootFontPx <= 20) await expect(firstWeight).toBeInViewport();

    const facts = await card.evaluate((element) => {
      const top = element.getBoundingClientRect().top;
      const heading = element.querySelector('h2')!;
      const table = element.querySelector('[data-testid="set-table"]')!;
      const target = element.querySelector('[data-testid="exercise-card-target"]')!;
      const note = element.querySelector('[data-testid="pinned-note-section"]')!;
      const cardBounds = element.getBoundingClientRect();
      const header = element.querySelector('.exercise-card-header')!;
      const headerStyle = getComputedStyle(header);
      const targetStyle = getComputedStyle(target);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        rootFontPx: getComputedStyle(document.documentElement).fontSize,
        headingFontPx: getComputedStyle(heading).fontSize,
        headingFullText: heading.textContent,
        headingOverflow: heading.scrollWidth - heading.clientWidth,
        headingWidth: heading.getBoundingClientRect().width,
        headingAvailableWidth: header.getBoundingClientRect().width - parseFloat(headerStyle.paddingLeft) - parseFloat(headerStyle.paddingRight),
        targetTextWidth: target.querySelector('p')!.getBoundingClientRect().width,
        targetAvailableWidth: target.getBoundingClientRect().width - parseFloat(targetStyle.paddingLeft) - parseFloat(targetStyle.paddingRight),
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        cardTop: top,
        cardHeaderHeight: element.querySelector('.exercise-card-header')!.getBoundingClientRect().height,
        targetHeight: target.getBoundingClientRect().height,
        targetText: target.textContent,
        noteHeight: note.getBoundingClientRect().height,
        tableOffsetFromCardTop: table.getBoundingClientRect().top - top,
        counter: element.querySelector('[data-testid="set-grid-header"]')!.textContent,
        controlsOutsideCard: [...element.querySelectorAll('button')].flatMap((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.width > 0 && (bounds.left < cardBounds.left - 1 || bounds.right > cardBounds.right + 1)
            ? [{ name: button.getAttribute('aria-label') || button.textContent?.trim(), left: bounds.left, right: bounds.right }]
            : [];
        }),
      };
    });
    expect(facts.headingFullText).toBe(exerciseName);
    expect(facts.headingOverflow).toBeLessThanOrEqual(1);
    expect(facts.horizontalOverflow).toBeLessThanOrEqual(1);
    if (scenario.rootFontPx === 32) {
      expect(facts.headingFontPx).toBe('32px');
      expect(facts.headingWidth).toBeGreaterThanOrEqual(facts.headingAvailableWidth - 1);
      expect(facts.targetTextWidth).toBeGreaterThanOrEqual(facts.targetAvailableWidth - 1);
    }
    if (scenario.rootFontPx <= 20) expect(facts.tableOffsetFromCardTop).toBeLessThan(scenario.rootFontPx === 16 ? 240 : 340);

    const directory = `${outputDir}/${testInfo.project.name}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/rdl-${scenario.suffix}.png` });

    const explanation = target.getByRole('button', { name: 'Wyjaśnienie celu' });
    const edit = card.getByTestId('pinned-note-edit');
    await assertTouchTarget(explanation);
    await assertTouchTarget(edit);
    await explanation.click();
    await expect(explanation).toHaveAttribute('aria-expanded', 'true');
    const reasonId = await explanation.getAttribute('aria-controls');
    const reason = page.locator(`[id="${reasonId}"]`);
    await expect(reason).toBeVisible();
    expect((await reason.innerText()).trim().length).toBeGreaterThan(10);
    await edit.click();
    await expect(reason).toBeVisible();
    await expect(card.getByTestId('pinned-note-input')).toHaveValue('Pin nr6');
    await expect(firstWeight).toHaveValue('62.5');
    await expect(tableHeader).toContainText('0/3');
    await card.getByTestId('pinned-note-machine-input').fill('Ustawienie maszyny: siedzisko 4, oparcie 2');
    await card.getByTestId('pinned-note-input').fill('Pin nr6 — pas na trzeciej dziurce, spokojne opuszczanie i pełny zakres ruchu.');
    await assertTouchTarget(card.getByTestId('pinned-note-save'));
    await card.getByTestId('pinned-note-save').click();
    await expect(note).toHaveText('Pin nr6 — pas na trzeciej dziurce, spokojne opuszczanie i pełny zakres ruchu.');
    await expect(card.getByTestId('pinned-note-machine')).toContainText('siedzisko 4, oparcie 2');
    await explanation.click();
    await expect(explanation).toHaveAttribute('aria-expanded', 'false');
    await expect(reason).toHaveCount(0);
    await expect(tableHeader).toContainText('0/3');
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem('fittracker_e2e_exercise_notes')!)[key], noteKey);
    expect(saved.note).toContain('Pin nr6 — pas na trzeciej dziurce');
    expect(saved.machineSettings).toBe('Ustawienie maszyny: siedzisko 4, oparcie 2');
    await page.reload();
    await expect(target).toContainText('62.5 kg');
    await expect(target).toContainText('×8');
    await expect(firstWeight).toHaveValue('62.5');
    await expect(note).toHaveText(saved.note);
    await expect(tableHeader).toContainText('0/3');
    await expect(page.getByTestId('prestart-skip')).toHaveCount(0);
    let removalHitbox = null;
    if (scenario.rootFontPx > 16) {
      const table = card.getByTestId('set-table');
      expect(await table.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      const remove = card.getByRole('button', { name: 'Usuń serię', exact: true }).first();
      // Cold resume restores the window scroll after rendering the draft. Re-align
      // until restoration settles before measuring the real, unobscured hitbox.
      await expect.poll(async () => {
        await remove.evaluate((button) => button.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        removalHitbox = await remove.evaluate((button) => {
          const box = button.getBoundingClientRect();
          const clip = button.closest('[data-testid="set-table"]')!.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;
          return {
            width: Math.min(box.right, clip.right, innerWidth) - Math.max(box.left, clip.left, 0),
            height: box.height,
            centerReceivesTap: button.contains(document.elementFromPoint(x, y)),
          };
        });
        return removalHitbox.centerReceivesTap;
      }).toBe(true);
      expect(removalHitbox.width).toBeGreaterThanOrEqual(44);
      expect(removalHitbox.height).toBeGreaterThanOrEqual(44);
      expect(removalHitbox.centerReceivesTap).toBe(true);
      // An unfinished set is removed immediately; confirmation protects completed sets.
      await remove.click();
      await expect(tableHeader).toContainText('0/2');
      await expect(target).toContainText('62.5 kg');
      await expect(firstWeight).toHaveValue('62.5');
      const calculator = card.getByTestId('plate-calculator-open');
      await calculator.scrollIntoViewIfNeeded();
      const contained = await calculator.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const card = button.closest('.exercise-card')!.getBoundingClientRect();
        return box.left >= card.left && box.right <= card.right;
      });
      expect(contained).toBe(true);
      await calculator.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
    await writeFile(`${directory}/rdl-${scenario.suffix}.json`, JSON.stringify({ ...facts, targetExplanation: 'PASS', pinnedEditAndSave: 'PASS', coldResume: 'PASS', initialWorkingSets: '0/3', removalHitbox }, null, 2));
  });
}

for (const rootFontPx of [20, 32]) {
  test(`all tracking fields and actions fit without horizontal scrolling at ${rootFontPx}px text`, async ({ page }, testInfo) => {
    await blockFirebase(page);
    await page.route('**/cloudfunctions.net/**', (route) => route.abort());
    await page.setViewportSize({ width: 320, height: 852 });
    const exercises = [
      { name: exerciseName, sets: '1 x 8-10' },
      { name: 'Podciąganie na drążku podchwytem', sets: '1 x 8-10' },
      { name: 'Podciąganie wspomagane na maszynie', sets: '1 x 8-10' },
      { name: 'Plank', sets: '1 x 45s' },
      { name: "Spacer farmera (Farmer's Walk)", sets: '1 x 45s' },
    ];
    await setE2EPlanMeta(page, {
      startDate: '2026-08-31', durationWeeks: 10,
      days: [{ id: 'reflow-day', dayName: 'Środa', weekday: 'wednesday', focus: 'Full Body',
        exercises: exercises.map((exercise, index) => ({ ...exercise, id: `reflow-${index}`, instructions: [] })),
      }],
    });
    await page.addInitScript((fontSize) => {
      localStorage.setItem('app-language', 'pl');
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${fontSize}px`; });
    }, rootFontPx);
    await navigateAndWait(page, '/workout/reflow-day');
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click();
    await skipPreStartWarmup(page);
    for (const toastClose of await page.locator('[toast-close]').all()) await toastClose.click();
    const measurements = [];
    for (const exercise of exercises) {
      const card = page.locator('.exercise-card').filter({ has: page.getByRole('heading', { name: exercise.name, exact: true }) });
      const table = card.getByTestId('set-table');
      await expect(card).toBeVisible();
      expect(await table.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      const row = card.locator('.exercise-set-row').first();
      const controls = row.locator('input, button');
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const bounds = await control.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const row = element.closest('.exercise-set-row')!.getBoundingClientRect();
          return { width: box.width, height: box.height, contained: box.left >= row.left && box.right <= row.right };
        });
        expect(bounds.contained).toBe(true);
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        measurements.push({ exercise: exercise.name, label: await control.getAttribute('aria-label'), ...bounds });
      }
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
    const directory = `${outputDir}/${testInfo.project.name}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/reflow-tracking-${rootFontPx}.json`, JSON.stringify(measurements, null, 2));
  });
}

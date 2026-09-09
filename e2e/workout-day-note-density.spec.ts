import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { blockFirebase, navigateAndWait, setE2EPlanMeta } from './helpers';

const output = 'audit/feedback-2026-09-09/android50-layout';

for (const width of [360, 375, 393]) {
  test(`future workout note ${width}px: compact explanation and editable complete note`, async ({ page }, info) => {
    await blockFirebase(page);
    await page.route('**/cloudfunctions.net/**', route => route.abort());
    await page.setViewportSize({ width, height: 800 });
    await page.clock.setFixedTime(new Date('2026-09-09T10:00:00+02:00'));
    await setE2EPlanMeta(page, { startDate: '2026-08-31', durationWeeks: 10,
      days: [{ id: 'future-note-day', dayName: 'Piątek', weekday: 'friday', focus: 'Full Body C', exercises: [
        { id: 'note-ohp', name: 'Wyciskanie hantli nad głowę (Siedząc)', sets: '3 x 8-12', instructions: [] },
      ] }],
    });
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await navigateAndWait(page, '/workout/future-note-day?date=2026-09-11');
    const section = page.getByTestId('workout-day-note-section');
    const title = section.getByRole('heading', { name: 'Notatka do tego treningu', exact: true });
    const explanation = section.getByText('(zobaczysz ją przy starcie treningu)', { exact: true });
    const edit = section.getByTestId('workout-day-note-edit');
    await expect(title).toBeVisible();
    await expect(explanation).toBeVisible();
    const facts = await section.evaluate(element => {
      const box = element.getBoundingClientRect();
      const heading = element.querySelector('h3')!.getBoundingClientRect();
      const explanation = element.querySelector('p')!.getBoundingClientRect();
      const edit = element.querySelector('button')!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { height: box.height, headingWidth: heading.width, headingBottom: heading.bottom,
        explanationTop: explanation.top, explanationWidth: explanation.width,
        availableWidth: box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        editWidth: edit.width, editHeight: edit.height, overflow: element.scrollWidth - element.clientWidth };
    });
    expect(facts.height).toBeLessThanOrEqual(100);
    expect(facts.headingWidth).toBeGreaterThanOrEqual(150);
    expect(facts.explanationTop).toBeGreaterThanOrEqual(facts.headingBottom);
    expect(facts.explanationWidth).toBe(facts.availableWidth);
    expect(facts.editWidth).toBeGreaterThanOrEqual(44);
    expect(facts.editHeight).toBeGreaterThanOrEqual(44);
    expect(facts.overflow).toBe(0);
    const directory = `${output}/${info.project.name}`;
    await mkdir(directory, { recursive: true });
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${directory}/future-note-${width}.png` });
    await edit.click();
    const note = 'Wziąć pas. Ustawienie maszyny: Pin nr6.\nPierwsza seria spokojnie, pełny zakres ruchu.';
    await section.getByTestId('workout-day-note-input').fill(note);
    const save = section.getByTestId('workout-day-note-save');
    const saveBox = await save.boundingBox();
    expect(saveBox!.height).toBeGreaterThanOrEqual(44);
    expect(saveBox!.width).toBeGreaterThanOrEqual(44);
    await save.click();
    await expect(section.getByTestId('workout-day-note-text')).toHaveText(note);
    await page.reload();
    await expect(section.getByTestId('workout-day-note-text')).toHaveText(note);
    await edit.click();
    await expect(section.getByTestId('workout-day-note-input')).toHaveValue(note);
    await section.getByRole('button', { name: 'Anuluj', exact: true }).click();
    await expect(section.getByTestId('workout-day-note-text')).toHaveText(note);
    await writeFile(`${directory}/future-note-${width}.json`, JSON.stringify(facts, null, 2));
  });
}

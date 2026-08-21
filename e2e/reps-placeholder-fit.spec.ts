// Naprawa r3 (2026-08-21, sędzia struktury fali 2): placeholder zakresu
// powtórzeń z planu ("10-12", "12-15" — 5 znaków) musi mieścić się W CAŁOŚCI
// w polu POWT. na viewport 390 px. Wcześniej kolumna 0.85fr obcinała ostatnią
// cyfrę ("10-1"), a plan session.md poz. 59 wymaga zachowania placeholderów.
import { test, expect } from '@playwright/test';
import { blockFirebase, expectPageRendered, navigateAndWait } from './helpers';

const START = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
})();

const day = {
  id: 'day-1',
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Nogi',
  exercises: [
    // Najdłuższe zakresy z szablonów planów (planTemplates.ts): 5 znaków mono.
    { id: 'ex-1', name: 'Uginanie nóg na maszynie', sets: '3 x 10-12', instructions: [] },
    { id: 'ex-2', name: 'Modlitewnik (Cable Crunch)', sets: '3 x 12-15', instructions: [] },
  ],
};

test('placeholder zakresu powtórzeń mieści się w polu POWT. (390 px)', async ({ page }) => {
  await blockFirebase(page);
  await page.addInitScript(({ plan }) => {
    window.localStorage.setItem('app-language', 'pl');
    window.localStorage.setItem('fittracker_e2e_plan', JSON.stringify(plan));
  }, { plan: { days: [day], durationWeeks: 8, startDate: START } });

  await navigateAndWait(page, '/workout/day-1');
  await expectPageRendered(page);

  const rangeInput = page.locator('input[placeholder="10-12"]').first();
  await expect(rangeInput).toBeVisible();

  const results = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
      .filter((el) => /^\d+-\d+$/.test(el.placeholder));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    return inputs.map((el) => {
      // Placeholder ma własny stopień (placeholder:text-[13px]) — mierzymy
      // fontem pseudoelementu, szerokość porównujemy z wnętrzem pola.
      const ps = getComputedStyle(el, '::placeholder');
      const base = getComputedStyle(el);
      ctx.font = `${ps.fontWeight || base.fontWeight} ${ps.fontSize || base.fontSize} ${base.fontFamily}`;
      const textWidth = ctx.measureText(el.placeholder).width;
      const innerWidth = el.clientWidth
        - parseFloat(base.paddingLeft || '0')
        - parseFloat(base.paddingRight || '0');
      return { placeholder: el.placeholder, textWidth, innerWidth };
    });
  });

  expect(results.length).toBeGreaterThan(0);
  for (const r of results) {
    expect(r.textWidth, `"${r.placeholder}" nie mieści się w polu POWT. (${r.textWidth}px > ${r.innerWidth}px)`)
      .toBeLessThanOrEqual(r.innerWidth);
  }
});

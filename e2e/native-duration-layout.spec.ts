import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EPlanMeta } from './helpers';

for (const platform of ['ios', 'android']) test(`${platform}: duration fields retain whole seconds and usable touch targets`, async ({ page }) => {
  await blockFirebase(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await setE2EPlanMeta(page, { startDate: '2026-08-31', durationWeeks: 10,
    days: [{ id: 'duration-layout', dayName: 'Sobota', weekday: 'saturday', focus: 'Czas',
      exercises: ['Plank', "Spacer farmera (Farmer's Walk)", 'Podciąganie wspomagane na maszynie'].map((name, index) => ({
        id: `duration-${index}`, name, sets: index === 2 ? '1 x 8-10' : '1 x 45s', instructions: [],
      })),
    }],
  });
  await navigateAndWait(page, '/workout/duration-layout?date=2026-09-12');
  await expect(page.locator('.exercise-card')).toHaveCount(3);
  // CSS contract only. Actual native text scaling is verified on both simulators.
  await page.evaluate(platform => { document.documentElement.dataset.platform = platform;
    document.querySelectorAll<HTMLInputElement>('.exercise-set-row input').forEach(el => { el.style.fontSize = '21.6px'; }); }, platform);
  for (const input of await page.locator('.exercise-set-row input').all()) {
    const facts = await input.evaluate(el => {
      const box = el.getBoundingClientRect();
      const group = el.closest('[role="group"]')?.getBoundingClientRect() ?? box;
      const css = getComputedStyle(el);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return { width: box.width, height: box.height,
        contained: box.left >= group.left && box.right <= group.right,
        textFits: context.measureText(el.value || el.placeholder).width <= box.width,
      };
    });
    expect(facts.width).toBeGreaterThanOrEqual(44);
    expect(facts.height).toBeGreaterThanOrEqual(44);
    expect(facts.contained).toBe(true);
    expect(facts.textFits).toBe(true);
  }
});

for (const width of [360, 390]) test(`iOS plank keeps time and actions aligned at ${width}px`, async ({ page }) => {
  await blockFirebase(page);
  await page.setViewportSize({ width, height: 844 });
  await setE2EPlanMeta(page, { startDate: '2026-08-31', durationWeeks: 10,
    days: [{ id: 'plank', dayName: 'Piątek', weekday: 'friday', focus: 'Brzuch',
      exercises: [{ id: 'plank', name: 'Plank', sets: '3 x 65s', instructions: [] }],
    }],
  });
  await navigateAndWait(page, '/workout/plank?date=2026-09-20&autostart=true');
  await expect(page.getByTestId('prestart-skip')).toBeVisible();
  await page.getByTestId('prestart-skip').click();
  await expect(page.getByTestId('prestart-sheet')).toBeHidden();
  await expect(page.locator('.exercise-card')).toHaveCount(1);
  await page.evaluate(() => { document.documentElement.dataset.platform = 'ios'; });
  const row = page.locator('.exercise-set-row').first();
  const assertAligned = async () => {
    const boxes = await row.locator('[role="group"], [role="timer"], button').evaluateAll(elements =>
      elements.map(el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y+r.height/2, right:r.right, width:r.width, height:r.height }; }));
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(2);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    for (let i=1;i<boxes.length;i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].right);
  };
  await assertAligned();
  await row.getByTestId('set-countdown-start').click();
  await expect(row.getByRole('timer')).toBeVisible();
  await assertAligned();
  await row.getByTestId('set-countdown-stop').click();
  await assertAligned();
});

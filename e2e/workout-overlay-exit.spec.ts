import { expect, test } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  setE2EAuthScenario,
} from './helpers';

const E2E_UID = 'e2e-test-user';
const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();

const expectNoOrphanedModalLayer = async (page: import('@playwright/test').Page) => {
  await expect.poll(() => page.evaluate(() => ({
    overlays: document.querySelectorAll('[data-app-overlay]').length,
    pointerEvents: document.body.style.pointerEvents,
    overflow: document.body.style.overflow,
    scrollLocked: document.body.hasAttribute('data-scroll-locked'),
  }))).toEqual({
    overlays: 0,
    pointerEvents: '',
    overflow: '',
    scrollLocked: false,
  });
};

test.describe('wyjście z treningu przy otwartym popupie (blackout)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await setE2EAuthScenario(page, 'active-admin');
    await blockFirebase(page);
    await navigateAndWait(page, '/plan');
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expectPageRendered(page);
    await clearWorkoutDraftDb(page, E2E_UID);
    await page.reload();
    await expectPageRendered(page);
  });

  test('route change podczas otwartego dialogu rozgrzewki nie zostawia czarnej warstwy ani martwego body', async ({ page }) => {
    await page.getByRole('button', { name: /Rozpocznij trening/ }).click();
    await expect(page.getByTestId('prestart-sheet')).toBeVisible();
    await expect(page.locator('[data-app-overlay][data-state="open"]')).toHaveCount(1);

    await page.evaluate(() => { window.location.hash = '#/plan'; });
    await expect(page).toHaveURL(/#\/plan$/);
    await expectPageRendered(page);
    await expectNoOrphanedModalLayer(page);

    // To jest zachowanie widoczne dla usera: po wyjściu da się od razu wejść
    // w pierwszy trening, zamiast zostać pod czarną, nieklikalną warstwą.
    // X70 (B2): tytul karty = focus; dzien zyje w aria-label karty.
    await page.getByRole('button', { name: 'Poniedziałek', exact: true }).click();
    await expect(page).toHaveURL(/#\/workout\/day-1/);
  });

  test('Instrukcje → Szczegóły najpierw zamyka dialog, potem wychodzi z treningu', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('button', { name: 'Więcej akcji' }).click();
    await page.getByRole('menuitem', { name: 'Instrukcje' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Rejestrujemy kolejność na poziomie DOM. Twarda nawigacja z otwartym
    // Rootem Radixa nie emituje state=closed — od razu unmountuje portal.
    // Bezpieczny przepływ musi zamknąć warstwę przed zmianą hasha trasy.
    await page.evaluate(() => {
      const events: string[] = [];
      Object.assign(window, { __blackoutExitEvents: events });
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          if (
            record.type === 'attributes'
            && record.attributeName === 'data-state'
            && record.target instanceof Element
            && record.target.matches('[data-app-overlay], [role="dialog"]')
            && record.target.getAttribute('data-state') === 'closed'
          ) {
            events.push('overlay-closed');
          }
        });
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
      const initialHash = window.location.hash;
      const watchRoute = () => {
        if (window.location.hash !== initialHash) {
          events.push('route-changed');
          observer.disconnect();
          return;
        }
        window.requestAnimationFrame(watchRoute);
      };
      window.requestAnimationFrame(watchRoute);
    });

    await dialog.getByRole('button', { name: 'Szczegóły ćwiczenia' }).click();
    await expect(page).toHaveURL(/#\/exercise\//);
    await expectPageRendered(page);
    await expectNoOrphanedModalLayer(page);

    const events = await page.evaluate(() => (
      (window as typeof window & { __blackoutExitEvents?: string[] }).__blackoutExitEvents ?? []
    ));
    expect(events).toContain('overlay-closed');
    expect(events.indexOf('overlay-closed')).toBeLessThan(events.indexOf('route-changed'));
  });
});

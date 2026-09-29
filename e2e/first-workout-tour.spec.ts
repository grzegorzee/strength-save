// Przewodnik nowego konta (2026-09-29, przebudowa WP-E X37). SEKWENCJE, nie
// ekrany (zasada 5): nowe konto -> Dashboard (legenda zakładek, start jako
// akcja) -> pierwszy trening (wpis, REALNE odhaczenie, celebracja + przerwa,
// menu, Zakończ) -> "co dalej" -> reload bez przewodnika. Warianty: Pomiń na
// każdym etapie, wyjście z treningu w połowie i powrót, 320 px EN, Dynamic Type
// 112/135% (proxy), konto z historią, stary klucz urządzenia, desktop, replay
// z Profilu, "Tak, rozgrzewka".
//
// playwright.config seeduje stary klucz "widziane" (fittracker_first_workout_tour_v1),
// więc w innych specach przewodnika nie ma (zgodność wstecz = ten sam seed). Tu
// czyścimy go RAZ na kontekst (sessionStorage przeżywa reload).
//
// Mock e2e: finalny zapis do Firestore wisi, więc zakończenie treningu idzie
// sesją offline (wzorzec workout-milestone.spec): silnik syncu kończy lokalnie.
// Zrzuty kroków (PL/EN, 390 px, jasny motyw): tmp/tour-shots/ (niecommitowane).
import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  navigateAndWait,
  openProfileSection,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

const E2E_UID = 'e2e-test-user';
const LEGACY_KEY = 'fittracker_first_workout_tour_v1';
const LOCAL_KEY = `fittracker_app_tour_v2:${E2E_UID}`;
const MONDAY = '2026-07-20';
const MONDAY_MS = new Date(`${MONDAY}T10:00:00`).getTime();

type Lang = 'pl' | 'en';
const TXT = {
  pl: {
    legendPlan: 'Plan: Twój tydzień treningów',
    start: 'Tu zaczynasz trening',
    inputs: 'Tu wpisujesz ciężar i powtórzenia.',
    check: 'Skończysz serię? Tapnij podświetlony ptaszek.',
    celebrate: 'Pierwsza seria zaliczona!',
    rest: 'możesz zgasić ekran',
    menu: 'zamienisz ćwiczenie',
    finish: 'zakończ trening tutaj',
    done: 'Gotowe',
    confirmFinish: 'Tak, zakończ',
    whatsNext: 'Co dalej?',
    kg: /Set 1, kg/,
    reps: /Set 1, Powt\./,
    checkSet: /Zaznacz serię jako zrobioną/,
    startWorkout: /Rozpocznij trening/,
    replay: 'Pokaż przewodnik ponownie',
  },
  en: {
    legendPlan: 'Plan: your training week',
    start: 'Start your workout here',
    inputs: 'Enter the weight and reps here.',
    check: 'Finished the set? Tap the highlighted check.',
    celebrate: 'First set done!',
    rest: 'you can lock the screen',
    menu: 'Swap an exercise',
    finish: 'finish your workout here',
    done: 'Done',
    confirmFinish: /Yes, finish/,
    whatsNext: 'What next?',
    kg: /Set 1, kg/,
    reps: /Set 1, Reps/,
    checkSet: /Mark set as done|Check set/,
    startWorkout: /Start workout/,
    replay: 'Show the guide again',
  },
} as const;

const shot = async (page: Page, lang: Lang, name: string) => {
  await page.waitForTimeout(250); // animacja wejścia dymka (200 ms)
  await page.screenshot({ path: `tmp/tour-shots/${lang}-${name}.png` });
};

const prepareNewAccount = async (page: Page, lang: Lang = 'pl') => {
  await page.clock.install({ time: MONDAY_MS });
  await blockFirebase(page);
  await page.addInitScript((l) => {
    localStorage.setItem('app-language', l);
    if (!sessionStorage.getItem('e2e-tour-seed-cleared')) {
      localStorage.removeItem('fittracker_first_workout_tour_v1');
      sessionStorage.setItem('e2e-tour-seed-cleared', '1');
    }
  }, lang);
  await setE2EAuthScenario(page, 'active-user');
  await setE2EWorkouts(page, []);
};

const localTour = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), LOCAL_KEY);

/** Zero zawieszonych blokad po przewodniku (scroll-lock / pointer-events / overflow-x). */
const expectNoStuckOverlay = async (page: Page) => {
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  const state = await page.evaluate(() => ({
    pointer: getComputedStyle(document.body).pointerEvents,
    overflow: document.body.style.overflow,
    scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(state.pointer).not.toBe('none');
  expect(state.overflow).not.toBe('hidden');
  expect(state.scrollX).toBeLessThanOrEqual(1);
};

/** Dymek w całości w viewport, bez poziomego scrolla, akcje widoczne. */
const expectBubbleFits = async (page: Page) => {
  const box = await page.locator('[data-testid^="tour-step-"]').boundingBox();
  const vp = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 0.5);
  await expect(page.getByTestId('tour-skip')).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

/** Dialog pomiarów po kreatorze nie może wisieć nad przewodnikiem (kolejność warstw). */
const expectNoMeasurePromptOverTour = async (page: Page) => {
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
};

const firstCard = (page: Page) => page.locator('.exercise-card').first();

/** Wpis ciężaru i powtórzeń w AKTYWNEJ serii, potem realne odhaczenie
 *  (pusta seria nie daje się odhaczyć: produkt pokazuje błąd, przewodnik czeka). */
const fillAndCheckActiveSet = async (page: Page) => {
  const row = page.locator('[data-tour="set-inputs"]').first();
  await row.locator('input').nth(0).fill('40');
  await row.locator('input').nth(1).fill('8');
  await row.locator('[data-tour="set-check"]').click();
};

/** Pełna sekwencja nowego konta w danym języku, z opcjonalnymi zrzutami. */
const runFullSequence = async (page: Page, lang: Lang, shots: boolean) => {
  const T = TXT[lang];
  await navigateAndWait(page, '/');
  await expectPageRendered(page);

  // Dashboard 1/2: legenda zakładek, pasek zablokowany na czas kroku.
  const nav = page.getByTestId('tour-step-nav');
  await expect(nav).toBeVisible();
  await expect(page.getByTestId('tour-legend')).toContainText(T.legendPlan);
  await expect(page.getByTestId('tour-legend').locator('li')).toHaveCount(4);
  await expectBubbleFits(page);
  if (shots) await shot(page, lang, '01-dashboard-nav');
  await page.getByTestId('tour-next').click();

  // Dashboard 2/2: start jako AKCJA (brak "Dalej").
  await expect(page.getByTestId('tour-step-start')).toContainText(T.start);
  await expect(page.getByTestId('tour-next')).toHaveCount(0);
  if (shots) await shot(page, lang, '02-dashboard-start');
  await page.locator('[data-tour="start-workout"]').first().click();
  await expect(page).toHaveURL(/#\/workout\//);
  expect((await localTour(page))?.stage).toBe('workout');

  // Arkusz rozgrzewki ZAWSZE pierwszy; przewodnik czeka pod nim, nie zużywa się.
  await expect(page.getByTestId('prestart-sheet')).toBeVisible();
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  await page.getByTestId('prestart-skip').click();

  // Trening 1/2: wpis.
  const inputs = page.getByTestId('tour-step-set-inputs');
  await expect(inputs).toContainText(T.inputs);
  await expectBubbleFits(page);
  if (shots) await shot(page, lang, '03-workout-inputs');
  await firstCard(page).getByRole('textbox', { name: T.kg }).first().fill('40');
  await firstCard(page).getByRole('spinbutton', { name: T.reps }).first().fill('8');
  await page.getByTestId('tour-next').click();

  // Trening 2/2: czeka na REALNE odhaczenie (brak "Dalej").
  await expect(page.getByTestId('tour-step-set-check')).toContainText(T.check);
  await expect(page.getByTestId('tour-next')).toHaveCount(0);
  if (shots) await shot(page, lang, '04-workout-check');
  await page.locator('[data-tour="set-check"]').first().click();

  // Moment WOW: celebracja + przerwa, która właśnie ruszyła.
  const celebrate = page.getByTestId('tour-step-first-set-done');
  await expect(celebrate).toContainText(T.celebrate);
  await expect(celebrate).toContainText(T.rest);
  await expect(page.getByTestId('rest-bar')).toBeVisible();
  await expectBubbleFits(page);
  if (shots) await shot(page, lang, '05-first-set-celebration');
  await page.getByTestId('tour-next').click();

  await expect(page.getByTestId('tour-step-exercise-menu')).toContainText(T.menu);
  if (shots) await shot(page, lang, '06-exercise-menu');
  await page.getByTestId('tour-next').click();

  await expect(page.getByTestId('tour-step-finish')).toContainText(T.finish);
  await expect(page.getByTestId('finish-workout')).toBeInViewport();
  if (shots) await shot(page, lang, '07-finish');
  await expect(page.getByTestId('tour-next')).toHaveText(T.done);
  await page.getByTestId('tour-next').click();
  await expectNoStuckOverlay(page);
  expect((await localTour(page))?.stage).toBe('after-finish');

  // Zakończenie (offline, patrz nagłówek) -> celebracja -> karta "co dalej".
  await page.context().setOffline(true);
  await page.getByTestId('finish-workout').click();
  await page.getByRole('button', { name: T.confirmFinish }).click();
  const whatsNext = page.getByTestId('tour-whats-next');
  await expect(whatsNext).toBeVisible({ timeout: 15_000 });
  await expect(whatsNext).toContainText(T.whatsNext);
  expect(await localTour(page)).toMatchObject({ stage: 'done', outcome: 'done' });
  // Celebracja 1. treningu (baner, 2,5 s) schodzi sama; karta zostaje (nie znika sama).
  await expect(page.getByTestId('workout-milestone-banner')).toHaveCount(0, { timeout: 10_000 });
  await expect(whatsNext).toBeVisible();
  if (shots) {
    await whatsNext.scrollIntoViewIfNeeded();
    await shot(page, lang, '08-whats-next');
  }
  await page.context().setOffline(false);

  // Reload: przewodnik nie wraca (ani Dashboard, ani trening).
  await navigateAndWait(page, '/');
  await page.reload();
  await expectPageRendered(page);
  await page.waitForTimeout(800);
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
};

test.describe('Przewodnik nowego konta: pełna sekwencja', () => {
  test.afterEach(async ({ page }) => {
    await page.context().setOffline(false);
    await clearWorkoutDraftDb(page, E2E_UID).catch(() => undefined);
  });

  for (const lang of ['pl', 'en'] as const) {
    test(`${lang.toUpperCase()} 390 px: Dashboard -> start -> odhaczenie -> celebracja -> Zakończ -> co dalej -> reload bez przewodnika`, async ({ page }, info) => {
      await prepareNewAccount(page, lang);
      await runFullSequence(page, lang, info.project.name === 'chromium');
    });
  }
});

test.describe('Przewodnik nowego konta: Pomiń i przerwania', () => {
  test.beforeEach(async ({ page }) => {
    await prepareNewAccount(page);
  });
  test.afterEach(async ({ page }) => {
    await clearWorkoutDraftDb(page, E2E_UID).catch(() => undefined);
  });

  test('Pomiń na legendzie Dashboardu: koniec przewodnika, trening bez spotlightów, reload bez', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect(await localTour(page)).toMatchObject({ stage: 'done', outcome: 'skipped' });
    await page.getByTestId('dashboard-primary-action').click();
    await page.getByTestId('prestart-skip').click();
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    await page.reload();
    await expectPageRendered(page);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('Pomiń na kroku startu Dashboardu też kończy przewodnik', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-start')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect((await localTour(page))?.outcome).toBe('skipped');
  });

  for (const step of ['set-inputs', 'set-check', 'first-set-done', 'exercise-menu', 'finish'] as const) {
    test(`Pomiń w treningu na kroku ${step}: overlay znika, sesja działa dalej`, async ({ page }) => {
      await navigateAndWait(page, '/');
      await page.getByTestId('tour-next').click();
      await page.locator('[data-tour="start-workout"]').first().click();
      await page.getByTestId('prestart-skip').click();
      await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
      if (step !== 'set-inputs') {
        await page.getByTestId('tour-next').click();
        if (step !== 'set-check') {
          await fillAndCheckActiveSet(page);
          await expect(page.getByTestId('tour-step-first-set-done')).toBeVisible();
          if (step !== 'first-set-done') {
            await page.getByTestId('tour-next').click();
            if (step === 'finish') await page.getByTestId('tour-next').click();
          }
        }
      }
      await expect(page.getByTestId(`tour-step-${step}`)).toBeVisible();
      await page.getByTestId('tour-skip').click();
      await expectNoStuckOverlay(page);
      expect((await localTour(page))?.outcome).toBe('skipped');
      // Sesja nie ucierpiała: odhaczenie kolejnej serii działa, zero dymków.
      const before = await page.locator('[aria-label^="Odznacz"]').count();
      await fillAndCheckActiveSet(page);
      await expect(page.locator('[aria-label^="Odznacz"]')).toHaveCount(before + 1);
      await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    });
  }

  test('wyjście z treningu w połowie przewodnika i powrót: brak zawieszonego overlayu, krok wraca, ćwiczenia komplet', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await page.locator('[data-tour="start-workout"]').first().click();
    await page.getByTestId('prestart-skip').click();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-check')).toBeVisible();
    const cardsBefore = await page.locator('.exercise-card').count();
    const workoutUrl = page.url();

    // Wyjście: Dashboard bez przewodnika (etap treningu, nie Dashboardu) i bez blokad.
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.waitForTimeout(600);
    await expectNoStuckOverlay(page);
    await page.getByRole('link', { name: /Plan/ }).first().click();
    await expect(page).toHaveURL(/#\/plan/);
    await expectNoStuckOverlay(page);

    // Powrót do treningu (resume): ten sam krok, wszystkie ćwiczenia na miejscu.
    await page.goto(workoutUrl.replace('&autostart=true', ''));
    await expectPageRendered(page);
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await expect(page.getByTestId('tour-step-set-check')).toBeVisible();
    await expect(page.locator('.exercise-card')).toHaveCount(cardsBefore);
    await fillAndCheckActiveSet(page);
    await expect(page.getByTestId('tour-step-first-set-done')).toBeVisible();
  });

  test('po kreatorze (?welcome=1): karta planu + przewodnik; start z karty -> krok startu na ekranie treningu -> pierwsza seria', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('fittracker_post_plan_guide_v1_e2e-test-user'));
    await navigateAndWait(page, '/?welcome=1');
    await expect(page.getByTestId('post-plan-guide')).toBeVisible();
    await expect(page.getByTestId('tour-step-nav')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-start')).toBeVisible();
    // Cel startu = CTA karty planu (pierwszy widoczny start), nie drugi przycisk pod nią.
    const target = page.locator('[data-tour="start-workout"]').first();
    await expect(target).toHaveAttribute('data-testid', 'post-plan-primary-action');
    await target.click();
    await expect(page).toHaveURL(/#\/workout\//);
    // Wejście bez autostartu: jeden krok-akcja na pasku startu.
    await expect(page.getByTestId('tour-step-workout-start')).toBeVisible();
    await expectBubbleFits(page);
    await page.locator('[data-tour="workout-start"]').click();
    await page.getByTestId('prestart-skip').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await expectNoMeasurePromptOverTour(page);
  });

  test('Pomiń na kroku startu ekranu treningu kończy przewodnik, start działa', async ({ page }) => {
    await navigateAndWait(page, `/workout/day-1?date=${MONDAY}`);
    await expect(page.getByTestId('tour-step-workout-start')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect((await localTour(page))?.outcome).toBe('skipped');
    await page.locator('[data-tour="workout-start"]').click();
    await page.getByTestId('prestart-skip').click();
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('"Tak, rozgrzewka": przewodnik czeka na zamknięcie dialogu rozgrzewki i nie jest zużyty', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await page.locator('[data-tour="start-workout"]').first().click();
    await page.getByTestId('prestart-yes').click();
    await expect(page.getByTestId('warmup-item').first()).toBeVisible();
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('warmup-item')).toHaveCount(0);
    expect((await localTour(page))?.stage).toBe('workout');
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
  });
});

test.describe('Przewodnik nowego konta: szerokości, język, Dynamic Type', () => {
  test.afterEach(async ({ page }) => {
    await clearWorkoutDraftDb(page, E2E_UID).catch(() => undefined);
  });

  for (const width of [320, 430] as const) {
    test(`EN ${width} px: legenda, start i pierwsza seria mieszczą się bez poziomego scrolla`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
      await prepareNewAccount(page, 'en');
      await navigateAndWait(page, '/');
      await expect(page.getByTestId('tour-step-nav')).toBeVisible();
      await expectBubbleFits(page);
      await page.getByTestId('tour-next').click();
      await expect(page.getByTestId('tour-step-start')).toBeVisible();
      await expectBubbleFits(page);
      await page.locator('[data-tour="start-workout"]').first().click();
      await page.getByTestId('prestart-skip').click();
      await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
      await expectBubbleFits(page);
      await page.getByTestId('tour-next').click();
      await fillAndCheckActiveSet(page);
      await expect(page.getByTestId('tour-step-first-set-done')).toBeVisible();
      await expectBubbleFits(page);
    });
  }

  for (const scale of [112, 135] as const) {
    test(`Dynamic Type ${scale}% (proxy) na 320 px PL: dymek bez obcięć, akcje dostępne`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await prepareNewAccount(page, 'pl');
      await navigateAndWait(page, '/');
      await page.getByTestId('tour-next').click();
      await page.locator('[data-tour="start-workout"]').first().click();
      await page.getByTestId('prestart-skip').click();
      await page.getByTestId('tour-next').click();
      await fillAndCheckActiveSet(page);
      const bubble = page.getByTestId('tour-step-first-set-done');
      await expect(bubble).toBeVisible();
      // Proxy jak accessibility-font-scale.spec: skalujemy font elementów z tekstem.
      await page.evaluate((pct) => {
        const root = document.querySelector('[data-app-tour]');
        root?.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if ([...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) {
            el.style.fontSize = `${Number.parseFloat(getComputedStyle(el).fontSize) * (pct / 100)}px`;
          }
        });
      }, scale);
      await expectBubbleFits(page);
      const clipped = await bubble.evaluate((b) => [...b.querySelectorAll<HTMLElement>('p, span, button')]
        .filter((el) => el.scrollWidth - el.clientWidth > 1).map((el) => el.textContent));
      expect(clipped).toEqual([]);
      await page.getByTestId('tour-next').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('tour-next')).toBeInViewport();
    });
  }
});

test.describe('Przewodnik nowego konta: kto go NIE dostaje, replay', () => {
  test('konto z ukończonym treningiem: brak przewodnika na Dashboardzie i w treningu', async ({ page }) => {
    await prepareNewAccount(page);
    await setE2EWorkouts(page, [{
      id: 'w-done-1',
      userId: E2E_UID,
      dayId: 'day-2',
      dayName: 'Wtorek',
      date: '2026-07-14',
      completed: true,
      durationSec: 3600,
      exercises: [{ exerciseId: 'ex-2-1', name: 'Przysiad ze sztangą', sets: [{ reps: 5, weight: 80, completed: true }] }],
    }]);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.waitForTimeout(800);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    await page.getByTestId('dashboard-primary-action').click();
    await page.getByTestId('prestart-skip').click();
    await expect(page.getByTestId('session-stats')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    await clearWorkoutDraftDb(page, E2E_UID);
  });

  test('stary klucz urządzenia X37 = widziany (seed configu działa jak dotąd)', async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EAuthScenario(page, 'active-user');
    await setE2EWorkouts(page, []);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await page.evaluate((k) => localStorage.getItem(k), LEGACY_KEY)).toBe('1');
    await page.waitForTimeout(800);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('desktop md+: bez przewodnika', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await prepareNewAccount(page);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.waitForTimeout(800);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('replay z Profilu: "Pokaż przewodnik ponownie" uruchamia go od Dashboardu (także przy starym kluczu)', async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await openProfileSection(page, 'account');
    await page.getByText(TXT.pl.replay).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId('tour-step-nav')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
  });
});

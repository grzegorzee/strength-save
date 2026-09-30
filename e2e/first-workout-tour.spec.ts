// Przewodnik nowego konta v2 (2026-09-30): Dashboard zaprasza do TRENINGU
// PRÓBNEGO (/practice, zero zapisów), tam wpis, REALNE odhaczenie, celebracja
// + przerwa, menu ćwiczenia (zamiana), Zakończ, ekran „co dalej”, potem
// rozdział zakładek (Plan, Historia, Postępy, Profil) i koniec.
// Stany kont (dzień wolny, urlop, brak planu, trening dziś ukończony, trening
// w toku, start w przyszłym tygodniu): app-tour-states.spec.ts.
//
// playwright.config seeduje stary klucz "widziane" (fittracker_first_workout_tour_v1),
// więc w innych specach przewodnika nie ma. Tu czyścimy go RAZ na kontekst.
// Zrzuty kroków (PL/EN, 375 i 430 px): tmp/tour-shots-v2/ (niecommitowane).
import { test, expect, type Page } from '@playwright/test';
import {
  blockFirebase,
  expectPageRendered,
  navigateAndWait,
  openProfileSection,
  setE2EAuthScenario,
  setE2EWorkouts,
} from './helpers';

const E2E_UID = 'e2e-test-user';
const LEGACY_KEY = 'fittracker_first_workout_tour_v1';
const LOCAL_KEY = `fittracker_app_tour_v2:${E2E_UID}`;
const MONDAY_MS = new Date('2026-07-20T10:00:00').getTime();

type Lang = 'pl' | 'en';
const TXT = {
  pl: {
    welcome: 'Pokażę Ci, jak to działa',
    tryPractice: 'Wypróbuj trening próbny',
    banner: 'Trening próbny · nic się nie zapisze',
    inputs: 'Tu wpisujesz ciężar i powtórzenia.',
    check: 'Skończysz serię? Tapnij podświetlony ptaszek.',
    celebrate: 'Pierwsza seria zaliczona!',
    rest: 'możesz zgasić ekran',
    menu: 'zamienisz albo pominiesz',
    finish: 'tapnij Zakończ trening',
    doneTitle: 'Tak wygląda każdy trening',
    counter12: 'Krok 1 z 2',
    tabPlan: 'Tapnij Plan',
    tabsDone: 'Wszystko jasne!',
    swapTitle: 'Zamień ćwiczenie',
    swapMenu: 'Zamień ćwiczenie',
    emailStep: 'wyślesz trenerowi mailem',
    emailHint: 'Tak to działa: w prawdziwym treningu podsumowanie trafi na ten adres.',
    showTabs: 'Teraz pokażę Ci, gdzie co jest',
  },
  en: {
    welcome: 'Let me show you how it works',
    tryPractice: 'Try a practice workout',
    banner: 'Practice workout · nothing is saved',
    inputs: 'Enter the weight and reps here.',
    check: 'Finished the set? Tap the highlighted check.',
    celebrate: 'First set done!',
    rest: 'you can lock the screen',
    menu: 'Swap or skip an exercise',
    finish: 'tap Finish workout',
    doneTitle: 'That is every workout',
    counter12: 'Step 1 of 2',
    tabPlan: 'Tap Plan',
    tabsDone: 'You are all set!',
    swapTitle: 'Swap exercise',
    swapMenu: 'Swap exercise',
    emailStep: 'Email the summary to your coach',
    emailHint: 'That is how it works: in a real workout the summary goes to this address.',
    showTabs: 'Now let me show you where everything is',
  },
} as const;

const shot = async (page: Page, dir: string, name: string) => {
  await page.waitForTimeout(300); // animacja wejścia dymka (200 ms)
  await page.screenshot({ path: `tmp/tour-shots-v2/${dir}/${name}.png` });
};

const prepareNewAccount = async (page: Page, lang: Lang = 'pl', opts: { reducedMotion?: boolean } = {}) => {
  if (opts.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
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

/** Zero zawieszonych blokad (scroll-lock / pointer-events / overflow-x / overlay). */
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

/**
 * Geometria kroku: dymek w viewport, nie zasłania celu, strzałka wskazuje cel,
 * wycięcie ma promień celu (+6 px) i nie wystaje poza ekran bardziej niż odstęp.
 */
const expectStepGeometry = async (page: Page) => {
  // Krok z przewinięciem (Zakończ) mierzymy po zakończeniu smooth scrollu.
  await expect.poll(async () => {
    const a = await page.locator('[data-testid^="tour-step-"]').boundingBox();
    await page.waitForTimeout(120);
    const b = await page.locator('[data-testid^="tour-step-"]').boundingBox();
    return !!a && !!b && Math.abs(a.y - b.y) < 0.5;
  }, { timeout: 5000 }).toBe(true);
  const vp = page.viewportSize()!;
  const bubble = await page.locator('[data-testid^="tour-step-"]').boundingBox();
  expect(bubble).not.toBeNull();
  expect(bubble!.x).toBeGreaterThanOrEqual(0);
  expect(bubble!.x + bubble!.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(bubble!.y).toBeGreaterThanOrEqual(0);
  expect(bubble!.y + bubble!.height).toBeLessThanOrEqual(vp.height + 0.5);
  await expect(page.getByTestId('tour-skip')).toBeInViewport();
  const cutout = page.getByTestId('tour-cutout');
  // Jednolite przyciemnienie na KAŻDYM kroku (próba i zakładki): jeden czarny
  // cień 66% wokół wycięcia albo pełny panel 66% przy dymku na środku.
  const dim = await page.evaluate(() => {
    const cut = document.querySelector<HTMLElement>('[data-testid="tour-cutout"]');
    if (cut) return cut.style.boxShadow;
    const panel = document.querySelector<HTMLElement>('[data-app-tour] > div');
    return panel ? getComputedStyle(panel).backgroundColor : 'brak';
  });
  expect(dim).toMatch(/rgba\(0, 0, 0, 0\.66\)/);
  if (await cutout.count()) {
    const cut = (await cutout.boundingBox())!;
    const overlap = !(bubble!.y >= cut.y + cut.height || bubble!.y + bubble!.height <= cut.y);
    expect(overlap, 'dymek zasłania podświetlony cel').toBe(false);
    const arrow = (await page.getByTestId('tour-arrow').boundingBox())!;
    const arrowCenter = arrow.x + arrow.width / 2;
    const clampedCenter = Math.min(Math.max(cut.x + cut.width / 2, bubble!.x + 24), bubble!.x + bubble!.width - 24);
    expect(Math.abs(arrowCenter - clampedCenter), 'strzałka nie wskazuje celu').toBeLessThan(8);
    const radii = await page.evaluate(() => {
      const cutEl = document.querySelector<HTMLElement>('[data-testid="tour-cutout"]')!;
      return Number.parseFloat(cutEl.style.borderRadius);
    });
    expect(radii).toBeGreaterThanOrEqual(6);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

/** Pełna sekwencja nowego konta, opcjonalnie ze zrzutami do tmp/tour-shots-v2/<dir>/. */
const runFullSequence = async (page: Page, lang: Lang, shotsDir: string | null) => {
  const T = TXT[lang];
  const snap = async (name: string) => { if (shotsDir) await shot(page, shotsDir, name); };
  await navigateAndWait(page, '/');
  await expectPageRendered(page);

  // Dashboard: jedno zaproszenie, bez spotlightu na hero ani prawdziwą sesję.
  const welcome = page.getByTestId('tour-step-welcome');
  await expect(welcome).toContainText(T.welcome);
  await expect(page.getByTestId('tour-cutout')).toHaveCount(0);
  await expectStepGeometry(page);
  await snap('01-welcome');
  await expect(page.getByTestId('tour-next')).toHaveText(T.tryPractice);
  await page.getByTestId('tour-next').click();

  // Trening próbny: stały pasek trybu, prawdziwe komponenty sesji.
  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByTestId('practice-banner')).toContainText(T.banner);
  const inputs = page.getByTestId('tour-step-set-inputs');
  await expect(inputs).toContainText(T.inputs);
  await expect(page.getByTestId('tour-progress')).toHaveText(T.counter12);
  await expectStepGeometry(page);
  await snap('02-practice-inputs');
  await page.getByTestId('tour-next').click();

  // Czeka na REALNE odhaczenie: brak „Dalej”, nieklikalna podpowiedź.
  await expect(page.getByTestId('tour-step-set-check')).toContainText(T.check);
  await expect(page.getByTestId('tour-next')).toHaveCount(0);
  await expect(page.getByTestId('tour-action-hint')).toBeVisible();
  expect(await page.getByTestId('tour-action-hint').evaluate((el) => el.tagName)).toBe('P');
  await expectStepGeometry(page);
  await snap('03-practice-check');
  await page.locator('[data-tour="set-check"]').first().click();

  // Moment wow: celebracja + przerwa, która właśnie ruszyła.
  const celebrate = page.getByTestId('tour-step-first-set-done');
  await expect(celebrate).toContainText(T.celebrate);
  await expect(celebrate).toContainText(T.rest);
  await expect(page.getByTestId('rest-bar')).toBeVisible();
  await expectStepGeometry(page);
  await snap('04-first-set-celebration');
  await page.getByTestId('tour-next').click();

  await expect(page.getByTestId('tour-step-exercise-menu')).toContainText(T.menu);
  await expectStepGeometry(page);
  await snap('05-exercise-menu');
  // Zamiana DZIAŁA w próbie (tylko lokalnie): przewodnik chowa się pod menu i dialogiem.
  await page.locator('[data-tour="exercise-menu"]').first().click();
  await page.getByRole('menuitem', { name: T.swapMenu }).click();
  await expect(page.getByTestId('practice-swap')).toBeVisible();
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  await snap('05b-practice-swap');
  await page.getByTestId('practice-swap').getByRole('button').first().click();
  await expect(page.getByTestId('tour-step-exercise-menu')).toBeVisible();
  await page.getByTestId('tour-next').click();

  await expect(page.getByTestId('tour-step-finish')).toContainText(T.finish);
  await expect(page.getByTestId('practice-finish')).toBeInViewport();
  await expectStepGeometry(page);
  await snap('06-finish');
  await page.getByTestId('practice-finish').click();
  await expectNoStuckOverlay(page);
  await page.getByTestId('practice-confirm-finish').click();
  await expect(page.getByTestId('practice-done')).toContainText(T.doneTitle);

  // Po treningu: podsumowanie mailem (prawdziwy dialog, wysyłka symulowana).
  await expect(page.getByTestId('tour-step-send-email')).toContainText(T.emailStep);
  await expect(page.getByTestId('tour-next')).toHaveCount(0);
  await expectStepGeometry(page);
  await snap('07-practice-done');
  await page.getByTestId('practice-email').click();
  const dialog = page.getByTestId('email-workout-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  await dialog.locator('input').fill('trener@example.com');
  await snap('13-email-dialog');
  await page.getByTestId('email-workout-send').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(T.emailHint).first()).toBeVisible();
  // Dialog zamknięty czysto: bez scroll-locka i pointer-events na body.
  const body = await page.evaluate(() => ({
    pointer: getComputedStyle(document.body).pointerEvents,
    overflow: document.body.style.overflow,
  }));
  expect(body.pointer).not.toBe('none');
  expect(body.overflow).not.toBe('hidden');
  await expect(page.getByTestId('save-trainer-name')).toHaveCount(0);
  await expect(page.getByTestId('tour-step-show-tabs')).toContainText(T.showTabs);
  await expectStepGeometry(page);
  await snap('14-email-sent-show-tabs');
  await page.getByTestId('practice-show-tabs').click();

  // Rozdział zakładek: tap w podświetloną zakładkę przenosi dalej.
  await expect(page).toHaveURL(/#\/$/);
  for (const [id, path, name] of [
    ['plan', '/plan', '08-tab-plan'],
    ['history', '/history', '09-tab-history'],
    ['progress', '/achievements', '10-tab-progress'],
    ['profile', '/profile', '11-tab-profile'],
  ] as const) {
    await expect(page.getByTestId(`tour-step-tab-${id}`)).toBeVisible();
    if (id === 'plan') await expect(page.getByTestId('tour-step-tab-plan')).toContainText(T.tabPlan);
    await expectStepGeometry(page);
    await snap(name);
    await page.locator(`[data-tour="nav-${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${path}$`));
  }
  await expect(page.getByTestId('tour-step-tabs-done')).toContainText(T.tabsDone);
  await snap('12-tabs-done');
  await page.getByTestId('tour-next').click();
  await expectNoStuckOverlay(page);
  expect(await localTour(page)).toMatchObject({ stage: 'done', outcome: 'done' });

  // Reload: przewodnik nie wraca.
  await navigateAndWait(page, '/');
  await page.reload();
  await expectPageRendered(page);
  await page.waitForTimeout(800);
  await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
};

test.describe('Przewodnik nowego konta v2: pełna sekwencja', () => {
  for (const lang of ['pl', 'en'] as const) {
    for (const width of [375, 390, 430] as const) {
      test(`${lang.toUpperCase()} ${width} px: zaproszenie -> trening próbny -> zakładki -> koniec, reload bez przewodnika`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width === 430 ? 932 : 812 });
        await prepareNewAccount(page, lang);
        const shots = info.project.name === 'chromium' && width !== 390 ? `${lang}-${width}` : null;
        await runFullSequence(page, lang, shots);
      });
    }
  }

  test('reduced motion: bez animacji pierścienia, pop i szturchnięcia, sekwencja przechodzi', async ({ page }) => {
    await prepareNewAccount(page, 'pl', { reducedMotion: true });
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    expect(await page.locator('.tour-ring-pulse').count()).toBe(0);
    await page.getByTestId('tour-next').click();
    expect(await page.locator('.tour-hint-nudge').count()).toBe(0);
    await page.locator('[data-tour="set-check"]').first().click();
    await expect(page.getByTestId('tour-celebration')).toBeVisible();
    expect(await page.locator('.tour-check-pop').count()).toBe(0);
  });
});

test.describe('Przewodnik v2: Pomiń, wyjścia, przerwania', () => {
  test.beforeEach(async ({ page }) => {
    await prepareNewAccount(page);
  });

  test('Pomiń na zaproszeniu: koniec, trening próbny bez przewodnika, reload bez', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect(await localTour(page)).toMatchObject({ stage: 'done', outcome: 'skipped' });
    await page.reload();
    await expectPageRendered(page);
    await page.waitForTimeout(600);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('krok maila: „Pomiń ten krok” przechodzi dalej bez wysyłki, „Pomiń przewodnik” kończy', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await page.locator('[data-tour="set-check"]').first().click();
    await expect(page.getByTestId('tour-step-first-set-done')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-exercise-menu')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-finish')).toBeVisible();
    await page.getByTestId('practice-finish').click();
    await page.getByTestId('practice-confirm-finish').click();
    await expect(page.getByTestId('tour-step-send-email')).toBeVisible();
    await page.getByTestId('tour-skip-step').click();
    await expect(page.getByTestId('tour-step-show-tabs')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect((await localTour(page))?.outcome).toBe('skipped');
  });

  for (const step of ['set-inputs', 'set-check', 'first-set-done', 'exercise-menu', 'finish'] as const) {
    test(`Pomiń w treningu próbnym na kroku ${step}: overlay znika, próba działa dalej`, async ({ page }) => {
      await navigateAndWait(page, '/');
      await page.getByTestId('tour-next').click();
      await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
      if (step !== 'set-inputs') {
        await page.getByTestId('tour-next').click();
        if (step !== 'set-check') {
          await page.locator('[data-tour="set-check"]').first().click();
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
      const before = await page.locator('[aria-label^="Odznacz"]').count();
      await page.locator('[data-tour="set-check"]').first().click();
      await expect(page.locator('[aria-label^="Odznacz"]')).toHaveCount(before + 1);
      await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
    });
  }

  test('Pomiń w rozdziale zakładek kończy przewodnik', async ({ page }) => {
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem('e2e-tabs-seeded')) {
        localStorage.setItem(key, JSON.stringify({ stage: 'tabs', step: 'tab-history' }));
        sessionStorage.setItem('e2e-tabs-seeded', '1');
      }
    }, LOCAL_KEY);
    await navigateAndWait(page, '/plan');
    // Wznowienie rozdziału od zapamiętanego kroku.
    await expect(page.getByTestId('tour-step-tab-history')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
    expect((await localTour(page))?.outcome).toBe('skipped');
  });

  test('„Zakończ próbę” w trakcie: bez overlayu, przewodnik idzie do zakładek', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await page.getByTestId('practice-exit').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId('tour-step-tab-plan')).toBeVisible();
  });

  test('systemowe wstecz z próby i reload w próbie: brak zawieszonych blokad, zaproszenie wraca', async ({ page }) => {
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-check')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId('tour-step-welcome')).toBeVisible();
    // „Zabicie apki” w próbie: stan próby żyje tylko w pamięci.
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await page.reload();
    await expectPageRendered(page);
    await expect(page.getByTestId('practice-workout')).toBeVisible();
    await expect(page.locator('[aria-label^="Odznacz"]')).toHaveCount(0);
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
  });
});

test.describe('Przewodnik v2: 320 px, Dynamic Type 135%', () => {
  test('EN 320 px: każdy krok próby mieści się bez poziomego scrolla', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await prepareNewAccount(page, 'en');
    await navigateAndWait(page, '/');
    await expectStepGeometry(page);
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await expectStepGeometry(page);
    await page.getByTestId('tour-next').click();
    await expectStepGeometry(page);
    await page.locator('[data-tour="set-check"]').first().click();
    await expect(page.getByTestId('tour-step-first-set-done')).toBeVisible();
    await expectStepGeometry(page);
  });

  test('Dynamic Type 135% (proxy) na 375 px PL: dymek bez obcięć, akcje dostępne', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await prepareNewAccount(page, 'pl');
    await navigateAndWait(page, '/');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-check')).toBeVisible();
    await page.locator('[data-tour="set-check"]').first().click();
    const bubble = page.getByTestId('tour-step-first-set-done');
    await expect(bubble).toBeVisible();
    await page.evaluate(() => {
      const root = document.querySelector('[data-app-tour]');
      root?.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if ([...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) {
          el.style.fontSize = `${Number.parseFloat(getComputedStyle(el).fontSize) * 1.35}px`;
        }
      });
    });
    await expectStepGeometry(page);
    const clipped = await bubble.evaluate((b) => [...b.querySelectorAll<HTMLElement>('p, button')]
      .filter((el) => el.scrollWidth - el.clientWidth > 1).map((el) => el.textContent));
    expect(clipped).toEqual([]);
    await page.getByTestId('tour-next').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('tour-next')).toBeInViewport();
  });
});

test.describe('Przewodnik v2: kto go NIE dostaje sam, replay', () => {
  test('konto z ukończonym treningiem: brak auto-startu', async ({ page }) => {
    await prepareNewAccount(page);
    await setE2EWorkouts(page, [{
      id: 'w-done-1', userId: E2E_UID, dayId: 'day-2', dayName: 'Wtorek', date: '2026-07-14', completed: true, durationSec: 3600,
      exercises: [{ exerciseId: 'ex-2-1', name: 'Przysiad ze sztangą', sets: [{ reps: 5, weight: 80, completed: true }] }],
    }]);
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    await page.waitForTimeout(800);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });

  test('stary klucz urządzenia X37 = widziany', async ({ page }) => {
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

  test('replay z Profilu startuje od początku (zaproszenie)', async ({ page }) => {
    await page.clock.install({ time: MONDAY_MS });
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await openProfileSection(page, 'account');
    await page.getByText('Pokaż przewodnik ponownie').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId('tour-step-welcome')).toBeVisible();
    await page.getByTestId('tour-skip').click();
    await expectNoStuckOverlay(page);
  });
});

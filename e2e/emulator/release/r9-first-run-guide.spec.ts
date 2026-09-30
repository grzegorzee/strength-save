import { test, expect, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  PASSWORD, WEEKDAY_VALUES, addDays, completeWizard, createInviteCode, dashboardGreeting, grantProComp,
  queryDocs, readDoc, todayIso, uidForEmail, verificationCodeFrom, waitForEmail, weekdayOf, workoutsOf,
} from './support';

// Release e2e 9 (kryterium akceptacji nr 1 właściciela, 2026-09-30): NOWE KONTO
// od zera na prawdziwym backendzie. Rejestracja -> kod -> zgody -> kreator ->
// plan z PIERWSZYM treningiem w PRZYSZŁYM tygodniu (dziś brak dnia planu) ->
// PRO comp -> Dashboard -> przewodnik startuje sam -> trening próbny w całości
// (wpis, odhaczenie, celebracja, przerwa, zamiana, zakończenie, co dalej) ->
// przegląd zakładek -> koniec. Firestore po przewodniku: 0 treningów/szkiców,
// plan i cykl bez zmian, flaga „przewodnik ukończony” w profilu. Wariant EN.

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const L = {
  pl: {
    email: 'Kontynuuj z emailem', toRegister: 'Nie masz konta? Zarejestruj się', password: 'Hasło',
    repeat: 'Powtórz hasło', create: 'Załóż konto i wyślij kod', gate: 'Potwierdź adres email',
    code: 'Kod 6-cyfrowy', verify: 'Potwierdź kod', swap: 'Zamień ćwiczenie', banner: 'Trening próbny · nic się nie zapisze',
  },
  en: {
    email: 'Continue with email', toRegister: "Don't have an account? Sign up", password: 'Password',
    repeat: 'Repeat password', create: 'Create account and send code', gate: 'Confirm your email address',
    code: '6-digit code', verify: 'Confirm code', swap: 'Swap exercise', banner: 'Practice workout · nothing is saved',
  },
} as const;

async function registerAndVerify(page: Page, email: string, lang: 'pl' | 'en'): Promise<string> {
  const inviteCode = await createInviteCode();
  if (lang === 'en') await page.addInitScript(() => localStorage.setItem('app-language', 'en'));
  await page.goto(`./#/?invite=${inviteCode}`);
  await page.waitForLoadState('domcontentloaded');
  const t = L[lang];
  await page.getByRole('button', { name: t.email }).click();
  await page.getByRole('button', { name: t.toRegister }).click();
  await page.getByPlaceholder('Email').first().fill(email);
  await page.getByPlaceholder(t.password, { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder(t.repeat).fill(PASSWORD);
  const startedAt = new Date().toISOString();
  await page.getByRole('button', { name: t.create }).click();
  await expect(page.getByRole('heading', { name: t.gate })).toBeVisible({ timeout: 20_000 });
  const uid = await uidForEmail(email);
  expect(uid).not.toBeNull();
  const mail = await waitForEmail(email, /\d{6}/, startedAt);
  await page.getByPlaceholder(t.code).fill(verificationCodeFrom(mail));
  await page.getByRole('button', { name: t.verify }).click();
  await expect(page.getByTestId('plan-wizard-root')).toBeVisible({ timeout: 20_000 });
  return uid!;
}

/** Plan bez dnia dziś: trzy dni tygodnia różne od dzisiejszego, start od najbliższego poniedziałku. */
const futureWeekPlan = () => {
  const today = todayIso();
  const todayWeekday = weekdayOf(today);
  const dow = WEEKDAY_VALUES.indexOf(todayWeekday);
  const nextMonday = addDays(today, ((8 - dow) % 7) || 7);
  const weekdays = ['monday', 'wednesday', 'friday', 'tuesday', 'thursday']
    .filter((d) => d !== todayWeekday)
    .slice(0, 3);
  if (!weekdays.includes('monday')) weekdays[0] = 'monday';
  return { weekdays, firstWorkout: nextMonday };
};

for (const lang of ['pl', 'en'] as const) {
  test(`R9 ${lang.toUpperCase()}: nowe konto -> przewodnik sam -> trening próbny w całości -> zakładki -> koniec, zero zapisów treningowych`, async ({ page }) => {
    test.slow();
    const email = `r9-${lang}-${Date.now()}@e2e.test`;
    const uid = await registerAndVerify(page, email, lang);
    await grantProComp(uid);
    const plan = futureWeekPlan();
    await completeWizard(page, { ...plan, lang });

    // Dziś nie ma dnia planu (start w przyszłym tygodniu).
    const planBefore = await readDoc(`training_plans/${uid}`);
    expect((planBefore as { startDate?: string }).startDate).toBe(plan.firstWorkout);
    const cyclesBefore = await queryDocs('plan_cycles', 'userId', uid);
    expect(await workoutsOf(uid)).toHaveLength(0);

    // Przewodnik startuje SAM na Dashboardzie nowego konta.
    await expect(dashboardGreeting(page)).toBeVisible();
    await expect(page.getByTestId('tour-step-welcome')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('tour-next').click();

    // Trening próbny: prawdziwy UI sesji, dane przykładowe.
    await expect(page).toHaveURL(/#\/practice$/);
    await expect(page.getByTestId('practice-banner')).toContainText(L[lang].banner);
    await expect(page.getByTestId('tour-step-set-inputs')).toBeVisible();
    // Wpis ciężaru (akcja usera, nie tylko czytanie).
    const row = page.locator('[data-tour="set-inputs"]').first();
    await row.locator('input').nth(0).fill('22.5');
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-set-check')).toBeVisible();
    await page.locator('[data-tour="set-check"]').first().click();
    await expect(page.getByTestId('tour-celebration')).toBeVisible();
    await expect(page.getByTestId('rest-bar')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-exercise-menu')).toBeVisible();
    // Zamiana w próbie.
    await page.locator('[data-tour="exercise-menu"]').first().click();
    await page.getByRole('menuitem', { name: L[lang].swap }).click();
    await page.getByTestId('practice-swap').getByRole('button').first().click();
    await expect(page.getByTestId('tour-step-exercise-menu')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-step-finish')).toBeVisible();
    await page.getByTestId('practice-finish').click();
    await page.getByTestId('practice-confirm-finish').click();
    await expect(page.getByTestId('practice-done')).toBeVisible();
    await page.getByTestId('practice-show-tabs').click();

    // Przegląd zakładek.
    for (const [id, path] of [['plan', '/plan'], ['history', '/history'], ['progress', '/achievements'], ['profile', '/profile']] as const) {
      await expect(page.getByTestId(`tour-step-tab-${id}`)).toBeVisible();
      await page.locator(`[data-tour="nav-${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${path}$`));
    }
    await expect(page.getByTestId('tour-step-tabs-done')).toBeVisible();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);

    // Firestore: flaga „przewodnik ukończony” per konto; zero treningów i szkiców;
    // plan i cykle bez zmian (bajt w bajt), agregat nie powstał z próby.
    await expect.poll(async () => ((await readDoc(`users/${uid}`))?.preferences as { appTour?: { status?: string } } | undefined)?.appTour?.status, {
      timeout: 15_000,
    }).toBe('done');
    expect(await workoutsOf(uid)).toHaveLength(0);
    expect(await readDoc(`training_plans/${uid}`)).toEqual(planBefore);
    expect(await queryDocs('plan_cycles', 'userId', uid)).toEqual(cyclesBefore);
    const aggregate = await readDoc(`users/${uid}/aggregates/allTime`);
    expect((aggregate as { totals?: { workoutCount?: number } } | null)?.totals?.workoutCount ?? 0).toBe(0);

    // Po przeładowaniu przewodnik nie wraca (flaga z profilu).
    await page.evaluate((key) => localStorage.removeItem(key), `fittracker_app_tour_v2:${uid}`);
    await page.goto('./#/');
    await page.reload();
    await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('first-workout-tour')).toHaveCount(0);
  });
}

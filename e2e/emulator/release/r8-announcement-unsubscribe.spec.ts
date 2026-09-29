import { test, expect } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import { openProfileSection } from '../../helpers';
import {
  addDays, adminClient, completeWizard, loginThroughUi, outboxFor, provisionVerifiedProUser,
  readDoc, todayIso, waitForEmail, weekdayOf,
} from './support';

// Release e2e 8: wypis z ogłoszeń e-mail linkiem z maila. Broadcast admina
// (adminBroadcastEmail) → mail w skrzynce emulatora z nagłówkiem
// List-Unsubscribe → GET linku niczego nie zmienia (skanery) → POST
// (one-click, emailUnsubscribe z tokenem HMAC) → notificationPrefs.
// announcementEmails = false → przełącznik w Profil → Powiadomienia wyłączony
// → kolejny broadcast pomija usera (kontrolny user z tej samej grupy dostaje).

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

const PROD_ENDPOINT = 'https://us-central1-fittracker-workouts.cloudfunctions.net/emailUnsubscribe';
const EMULATOR_ENDPOINT = 'http://127.0.0.1:5001/fittracker-workouts/us-central1/emailUnsubscribe';

test('R8: wypis z ogłoszeń linkiem → przełącznik w Profilu wyłączony → broadcast pomija usera', async ({ page }) => {
  test.setTimeout(120_000);
  const cohort = `rel-${Date.now()}`;
  const user = await provisionVerifiedProUser('r8-unsub', 'pl', [cohort]);
  const control = await provisionVerifiedProUser('r8-control', 'pl', [cohort]);
  const admin = await adminClient();

  // 1. Pierwszy broadcast: oba konta dostają mail z linkiem wypisu.
  const first = await admin.call<{ sent: number; total: number; skippedUnsubscribed: number }>(
    'adminBroadcastEmail', { target: cohort, subject: `Nowości ${cohort} #1`, body: 'Pierwsze ogłoszenie.' },
  );
  expect(first).toMatchObject({ sent: 2, total: 2, skippedUnsubscribed: 0 });
  const mail = await waitForEmail(user.email, new RegExp(`${cohort} #1`));
  const header = mail.headers?.find((h) => h.name === 'List-Unsubscribe')?.value ?? '';
  expect(mail.headers).toEqual(expect.arrayContaining([{ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' }]));
  const link = header.replace(/^<|>$/g, '');
  expect(link.startsWith(`${PROD_ENDPOINT}?u=${encodeURIComponent(user.uid)}&t=`)).toBe(true);
  expect(link).toContain('&s=announcements');
  const emulatorLink = link.replace(PROD_ENDPOINT, EMULATOR_ENDPOINT);

  // 2. Zły token = 400 i brak zmiany; GET z dobrym tokenem = tylko strona z przyciskiem.
  const forged = await fetch(emulatorLink.replace(/&t=[^&]+/, '&t=forged'), { method: 'POST' });
  expect(forged.status).toBe(400);
  const get = await fetch(emulatorLink);
  expect(get.status).toBe(200);
  expect(await get.text()).toContain('method="post"');
  expect(((await readDoc(`users/${user.uid}`))?.notificationPrefs as Record<string, unknown> | undefined)?.announcementEmails)
    .not.toBe(false);

  // 3. POST (one-click) wypisuje tylko z ogłoszeń e-mail.
  const post = await fetch(emulatorLink, { method: 'POST' });
  expect(post.status).toBe(200);
  expect(await post.text()).toContain('Ogłoszenia e-mail są wyłączone');
  const prefs = (await readDoc(`users/${user.uid}`))?.notificationPrefs as Record<string, unknown>;
  expect(prefs.announcementEmails).toBe(false);
  expect(prefs.weeklyDigest).not.toBe(false);

  // 4. UI: Profil → Powiadomienia pokazuje wyłączone ogłoszenia e-mail, digest włączony.
  const today = todayIso();
  await loginThroughUi(page, user.email);
  await completeWizard(page, { weekdays: [weekdayOf(today), weekdayOf(addDays(today, 3))], firstWorkout: today });
  await page.goto('./#/profile');
  await openProfileSection(page, 'notifications');
  await expect(page.getByRole('switch', { name: 'Ogłoszenia e-mail od zespołu' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('notif-pref-weeklyDigest').getByRole('switch')).toHaveAttribute('aria-checked', 'true');

  // 5. Drugi broadcast: wypisany pominięty, kontrolny dostaje.
  const before = new Date().toISOString();
  const second = await admin.call<{ sent: number; total: number; skippedUnsubscribed: number }>(
    'adminBroadcastEmail', { target: cohort, subject: `Nowości ${cohort} #2`, body: 'Drugie ogłoszenie.' },
  );
  expect(second).toMatchObject({ sent: 1, total: 1, skippedUnsubscribed: 1 });
  await waitForEmail(control.email, new RegExp(`${cohort} #2`), before);
  expect((await outboxFor(user.email)).filter((m) => m.subject.includes(`${cohort} #2`))).toHaveLength(0);
});

// Ten sam root cause od strony UI: wyłączony w Profilu przełącznik musi zostać
// wyłączony po ponownym otwarciu apki (wcześniej mapper profilu gubił notificationPrefs).
test('R8b: przełącznik powiadomień wyłączony w Profilu zostaje wyłączony po ponownym uruchomieniu', async ({ page }) => {
  const user = await provisionVerifiedProUser('r8b-toggle');
  const today = todayIso();
  await loginThroughUi(page, user.email);
  await completeWizard(page, { weekdays: [weekdayOf(today), weekdayOf(addDays(today, 3))], firstWorkout: today });
  await page.goto('./#/profile');
  await openProfileSection(page, 'notifications');
  const daily = page.getByTestId('notif-pref-dailyReminder').getByRole('switch');
  await expect(daily).toHaveAttribute('aria-checked', 'true');
  await daily.click();
  await expect(daily).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => ((await readDoc(`users/${user.uid}`))?.notificationPrefs as Record<string, unknown> | undefined)?.dailyReminder, {
    timeout: 10_000,
  }).toBe(false);

  await page.reload();
  await page.goto('./#/profile');
  await openProfileSection(page, 'notifications');
  await expect(page.getByTestId('notif-pref-dailyReminder').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('notif-pref-weeklyDigest').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});

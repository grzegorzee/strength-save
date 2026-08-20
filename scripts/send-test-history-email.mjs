#!/usr/bin/env node

// J-T4: realny test wysyłki maili historii (week + last30) z załącznikiem CSV
// przez SES (Content.Raw). Fixtures SYNTETYCZNE — zero czytania realnych kont.
// Odbiorca NA SZTYWNO g.jasionowicz@gmail.com (zasada testów wysyłek).
//
// Wymaga: npm run build w functions/ + zmienne STRENGTHSAVE_SES_* w env
// (source ~/FIRMA/_secrets/projekty/strengthsave-ses.env). Wartości sekretów
// nigdy nie trafiają do outputu.
//
// Użycie: node scripts/send-test-history-email.mjs

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { runEmailHistory } = require('../functions/lib/email-workout.js');
const { buildRawEmail } = require('../functions/lib/email-mime.js');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const TO = 'g.jasionowicz@gmail.com';
const region = process.env.STRENGTHSAVE_SES_REGION;
const accessKeyId = process.env.STRENGTHSAVE_SES_ACCESS_KEY_ID;
const secretAccessKey = process.env.STRENGTHSAVE_SES_SECRET_ACCESS_KEY;
const from = process.env.STRENGTHSAVE_SES_FROM;
if (!region || !accessKeyId || !secretAccessKey || !from) {
  console.error('Brak zmiennych STRENGTHSAVE_SES_* w env');
  process.exit(1);
}
const client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// Syntetyczny trening PL (kanonicznie) — nazwy ze słownika + nazwa własna.
const fixture = (id, date, dayName, weight) => ({
  id,
  userId: 'test-user',
  date,
  dayName,
  dayFocus: 'Góra B',
  completed: true,
  durationSec: 3600 + weight,
  notes: 'Dobra energia, ostatnia seria ciężka',
  sessionRating: 'up',
  exercises: [
    {
      exerciseId: 'ex-1',
      name: 'Wyciskanie sztangi na skosie',
      rpe: 8,
      sets: [
        { reps: 10, weight: 40, completed: true, isWarmup: true },
        { reps: 5, weight, completed: true },
        { reps: 5, weight, completed: true },
      ],
    },
    {
      exerciseId: 'ex-2',
      name: 'Moje własne cudo',
      notes: 'wąski chwyt, "pełen zakres"',
      sets: [{ reps: 12, weight: 30, completed: true }],
    },
  ],
});

const weekFixtures = [
  fixture('w-a', daysAgo(1), 'Wtorek', 102.5),
  fixture('w-b', daysAgo(3), 'Niedziela', 100),
  fixture('w-c', daysAgo(5), 'Piątek', 97.5),
];
const last30Fixtures = Array.from({ length: 8 }, (_, i) =>
  fixture(`l-${i + 1}`, daysAgo(2 * i + 1), ['Poniedziałek', 'Środa', 'Piątek'][i % 3], 90 + 2.5 * i));
const baselineFixtures = [fixture('w-old', daysAgo(40), 'Czwartek', 90)];

const sendViaSes = async (to, subject, html, attachments = []) => {
  const content = attachments.length > 0
    ? { Raw: { Data: buildRawEmail({ from, to, subject, html, attachments }) } }
    : { Simple: { Subject: { Data: subject }, Body: { Html: { Data: html } } } };
  const response = await client.send(new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: content,
  }));
  console.log(`  attachments: ${attachments.map((a) => a.filename).join(', ') || 'brak'}`);
  return { transport: 'ses', ...(response.MessageId ? { sesMessageId: response.MessageId } : {}) };
};

const makeDeps = (rangeFixtures, language) => ({
  getWorkout: async () => null,
  listWorkoutsInRange: async (_uid, opts) => (opts.beforeDate ? baselineFixtures : rangeFixtures),
  getUserContext: async () => ({ language, displayName: 'Test' }),
  consumeQuota: async () => true,
  sendEmail: sendViaSes,
  logEmail: async (entry) => {
    console.log(`  email_log: status=${entry.status} transport=${entry.transport} sesMessageId=${entry.sesMessageId ?? '-'}`);
  },
});

console.log('== week (lang=en, pełne sekcje + CSV) ==');
const week = await runEmailHistory(makeDeps(weekFixtures, 'en'), { uid: 'test-user', to: TO, today, range: 'week' });
console.log('  result:', JSON.stringify(week));

console.log('== last30 (lang=pl, przegląd + CSV, 8 sesji) ==');
const last30 = await runEmailHistory(makeDeps(last30Fixtures, 'pl'), { uid: 'test-user', to: TO, today, range: 'last30' });
console.log('  result:', JSON.stringify(last30));

if (!week.ok || !last30.ok) process.exit(1);

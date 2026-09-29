// Podgląd szablonów maili na fikcyjnych danych (bez wysyłki, bez Firestore).
// Użycie: npm --prefix functions run build && node scripts/email-previews.mjs <katalog_wyjściowy>
// Zapisuje <nazwa>.html, <nazwa>.txt i index.json (temat, rozmiar). Zrzuty robi
// scripts/email-screenshots.mjs.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lib = (name) => require(`../functions/lib/${name}.js`);
const {
  accessChangedEmailHtml,
  accessChangedSubject,
  adminMessageEmailHtml,
  inviteEmailHtml,
  passwordResetEmailHtml,
  passwordResetSubject,
  verificationEmailHtml,
  verificationSubject,
  welcomeEmailHtml,
  welcomeSubject,
} = lib("email-templates");
const { buildWeeklyDigest } = lib("weekly-digest-html");
const { buildHistoryEmailHtml, buildWorkoutEmailHtml, historyEmailSubject, localizeEmailWorkout, workoutEmailSubject } = lib("email-workout");
const { htmlToPlainText } = lib("ses-email");

const outDir = process.argv[process.argv.length - 1];
if (!outDir || outDir.endsWith(".mjs")) throw new Error("Podaj katalog wyjściowy");
mkdirSync(outDir, { recursive: true });

const RESET_LINK = "https://auth.strengthsave.app/__/auth/action?mode=resetPassword&oobCode=FAKE_CODE_123&apiKey=FAKE&lang=pl";

const workout = (lang) => localizeEmailWorkout({
  id: "w1",
  userId: "u1",
  date: "2026-09-24",
  dayName: "Czwartek",
  dayFocus: "Góra B",
  completed: true,
  durationSec: 3900,
  notes: "Dobra energia, bark bez bólu.",
  exercises: [
    {
      exerciseId: "bench",
      name: lang === "en" ? "Barbell bench press" : "Wyciskanie sztangi na ławce płaskiej",
      sets: [
        { reps: 10, weight: 40, completed: true, isWarmup: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 4, weight: 100, completed: false },
      ],
    },
    {
      exerciseId: "row",
      name: lang === "en" ? "Barbell row" : "Wiosłowanie sztangą",
      sets: [
        { reps: 8, weight: 80, completed: true },
        { reps: 8, weight: 80, completed: true },
      ],
      notes: "Chwyt nachwytem",
    },
  ],
}, lang);

const entries = [];
for (const lang of ["pl", "en"]) {
  entries.push({ name: `verification-${lang}`, subject: verificationSubject("482913", lang), html: verificationEmailHtml("482913", "jan.kowalski@example.com", lang) });
  entries.push({ name: `password-reset-${lang}`, subject: passwordResetSubject(lang), html: passwordResetEmailHtml(RESET_LINK, "jan.kowalski@example.com", lang) });
  entries.push({ name: `welcome-${lang}`, subject: welcomeSubject(lang), html: welcomeEmailHtml("Jan", lang) });
  entries.push({ name: `invite-${lang}`, subject: lang === "en" ? "Your Strength Save invite" : "Zaproszenie do Strength Save", html: inviteEmailHtml("K7Q2MZ", "https://app.strengthsave.app/?invite=K7Q2MZ", lang === "en" ? "See you in the gym." : "Do zobaczenia na siłowni.", lang) });
  entries.push({ name: `access-changed-${lang}`, subject: accessChangedSubject(lang), html: accessChangedEmailHtml(false, lang) });
  entries.push({
    name: `weekly-digest-${lang}`,
    ...buildWeeklyDigest({
      stats: { sessions: 4, workingSets: 62, reps: 410, tonnageKg: 18450, durationSec: 17400, topExercises: [{ name: "Przysiad ze sztangą", tonnageKg: 6200 }, { name: "Martwy ciąg", tonnageKg: 5100 }, { name: "Wyciskanie sztangi na ławce płaskiej", tonnageKg: 3900 }] },
      comparison: { sessionsDelta: 1, tonnageDeltaKg: 2300 },
      prs: [{ exerciseName: "Przysiad ze sztangą", type: "weight", newValue: 140, oldValue: 135 }],
      strava: { runCount: 2, totalRunKm: 12.4, bestRun: { name: "Poranny bieg", km: 5.2 }, longestRun: { name: "Długie wybieganie", km: 7.2 } },
      lang,
      unit: "kg",
      displayName: "Jan",
      rangeLabel: lang === "en" ? "September 21 - September 27, 2026" : "21 września - 27 września 2026",
    }),
  });
  entries.push({ name: `workout-${lang}`, subject: workoutEmailSubject(workout(lang), lang, "Jan"), html: buildWorkoutEmailHtml(workout(lang), lang, { trainerName: "Marek", prs: [{ exerciseId: "bench", exerciseName: workout(lang).exercises[0].name, type: "weight", newValue: 100, oldValue: 97.5 }] }) });
  entries.push({ name: `history-${lang}`, subject: historyEmailSubject([workout(lang), { ...workout(lang), id: "w2", date: "2026-09-22" }], lang, "Jan"), html: buildHistoryEmailHtml([workout(lang), { ...workout(lang), id: "w2", date: "2026-09-22" }], lang, { trainerName: "Marek" }) });
}
entries.push({ name: "admin-message-pl", subject: "Nowa wersja Strength Save", html: adminMessageEmailHtml("Cześć,\n\nw nowej wersji poprawiliśmy zapis serii offline.\n\nZespół Strength Save") });

const index = entries.map((entry) => {
  writeFileSync(join(outDir, `${entry.name}.html`), entry.html);
  const text = htmlToPlainText(entry.html);
  writeFileSync(join(outDir, `${entry.name}.txt`), text);
  return { name: entry.name, subject: entry.subject, htmlBytes: Buffer.byteLength(entry.html), textBytes: Buffer.byteLength(text) };
});
writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2));
console.log(index.map((i) => `${i.name}\t${i.htmlBytes} B\t${i.subject}`).join("\n"));

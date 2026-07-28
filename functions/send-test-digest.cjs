// Z160 krok 5: RĘCZNY, JEDNORAZOWY test digestu — wysyłka WYŁĄCZNIE na adres
// z TARGET_EMAIL (zatwierdzone: g.jasionowicz@gmail.com). Używa DOKŁADNIE tej
// samej ścieżki co poniedziałkowy harmonogram (buildWeeklyDigestDeps).
// Firestore: tylko odczyty. DRY_RUN=1 wypisuje temat/statystyki bez wysyłki.
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { runWeeklyDigest, buildWeeklyDigestDeps } = require("./lib/weekly-digest");

const TARGET_EMAIL = process.env.TARGET_EMAIL;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!TARGET_EMAIL) {
  console.error("Brak TARGET_EMAIL");
  process.exit(1);
}

admin.initializeApp({ projectId: "fittracker-workouts" });

const main = async () => {
  const resendKey = process.env.RESEND_API_KEY || "dry-run-key";
  const deps = buildWeeklyDigestDeps(admin.firestore(), new Resend(resendKey));

  const targetDeps = {
    ...deps,
    listUsers: async () => {
      const users = await deps.listUsers();
      const target = users.filter((u) => u.email === TARGET_EMAIL);
      console.log(`Odbiorcy po filtrze (${TARGET_EMAIL}): ${target.length}`);
      return target;
    },
    sendEmail: async (to, subject, html) => {
      if (to !== TARGET_EMAIL) {
        console.error(`ODMOWA: próba wysyłki na ${to} (dozwolony tylko ${TARGET_EMAIL})`);
        return { error: { message: "blocked-by-test-guard" } };
      }
      console.log(`SUBJECT: ${subject}`);
      console.log(`HTML length: ${html.length}`);
      if (DRY_RUN) {
        require("node:fs").writeFileSync("/tmp/digest-preview.html", html);
        console.log("DRY_RUN: bez wysyłki, podgląd w /tmp/digest-preview.html");
        return {};
      }
      return deps.sendEmail(to, subject, html);
    },
  };

  const result = await runWeeklyDigest(targetDeps);
  console.log("RESULT:", JSON.stringify(result));
  process.exit(0);
};

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});

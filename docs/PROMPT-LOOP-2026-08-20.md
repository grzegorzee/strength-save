# PROMPT PĘTLI — wydania E (bugi) i F (feature'y), 2026-08-20

Pracuj autonomicznie nad `docs/PLAN-BUGI-2026-08-20.md` (wydanie E, pierwszeństwo),
potem `docs/PLAN-FEATURES-2026-08-20.md` (wydanie F). W każdej iteracji:

1. Znajdź pierwszy nieodhaczony task (E przed F).
2. TDD: test RED odtwarzający problem/kontrakt → implementacja → GREEN.
3. Bramki po tasku: vitest (dotknięte pliki + pełny przed release), typecheck,
   lint; e2e dotknięte specy.
4. Commit stage-per-plik (nigdy `git add -A`, bez wyciszania stderr),
   `git show HEAD --name-status` przed pushem, push po każdym domkniętym tasku.
5. Odhacz task w trackerze z dowodem (commit, wyniki bramek), push.
6. Po wszystkich taskach wydania: X-RELEASE (bramki + pełne e2e po świeżym vite
   [pkill vite + rtree node_modules/.vite] + weryfikacja natywna iOS na koncie
   demo + release train 5 powierzchni + DECYZJE.md + pamięć projektu).

## Weryfikacja natywna iOS (obowiązkowa przed każdym release)

Świeży build: `npm run mobile:sync` + `npx cap run ios --target <booted>`.
Konto demo na emulatorach Auth/Firestore (warsztat A-T5 w pamięci projektu:
seed `functions/tmp-seed-watch-at5.mjs`, JAVA_HOME openjdk21, firestore port
8081; emulator w pamięci = restart kasuje seed). Przyklikać realne flow
zgłoszone przez właściciela (share, zapis, plan, historia, profil).
NIGDY na realnym koncie.

## Twarde zasady

- Dane realnych userów święte. QA tylko demo/emulatory.
- Wersje marketingowe 1.0.0; bump tylko CURRENT_PROJECT_VERSION (iOS)
  i versionCode (Android). NASTĘPNY iOS = 108, versionCode = 23.
- dist-offline wymaga builda WEB (build:mobile bez SW = wieczny hang).
- Nigdy force-push/reset --hard. Bez pauz typograficznych w tekstach PL.
- Nowe pole w users doc = sprawdź mapper mapAppUserProfile + rules.
- Nowe klucze i18n do OBU locales (pl.ts + en.ts).
- Radix: nie unmountować otwartych Sheet/Dialog; exclusive-overlay
  (AlertDialog announce:false).
- E2e masowo czerwone = najpierw świeży vite, nie debug kodu.
- Warunek zatrzymania: oba plany odhaczone z dowodami, wydania E i F na
  wszystkich powierzchniach w zasięgu, raport końcowy z krokami właściciela.

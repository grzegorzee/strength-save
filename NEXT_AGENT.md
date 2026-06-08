# Prompt dla następnego agenta — Strength Save (FitTracker)

Pracujesz nad aplikacją fitness **Strength Save** w
`/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`. PWA (React 18 + TS + Vite 5 +
Firebase 12 + Tailwind + shadcn) opakowana w Capacitor 8 jako natywna iOS/Android.
Live web: https://grzegorzee.github.io/strength-save/ (gh-pages). Repo: github.com/grzegorzee/strength-save.
**Status: 0.0.1, w TestFlight (internal), build 9.**

## Zasady pracy
- Język odpowiedzi: PL (polskie znaki, BEZ em-dash/en-dash). Karpathy: prostota, surgical changes, weryfikuj zanim ogłosisz sukces.
- Design ŚCIŚLE "Kinetic Precision" (`docs/DESIGN.md`): Void #0e0e0e, lime #cefc22 (primary/akcje), cyan #00e3fd (`fitness-cyan`, dane wtórne), No-Line (granice przez surface shifts, nie bordery), Space Grotesk (`font-heading`) + Inter, surface-low/high/highest. **Cała apka jest już w tym stylu** (tokeny zamiast hardcoded kolorów). Nowy UI: TYLKO tokeny palety (primary/fitness-cyan/fitness-success/fitness-warning/destructive/surface-*/muted-foreground). Główne nagłówki sekcji = `font-heading font-bold uppercase italic tracking-tight`. Karty list = wzorzec z `ExerciseLibrary.tsx` (rounded-xl bg-surface-low, nazwa uppercase, chip lime). Celowe wyjątki (NIE ruszaj): Strava (pomarańczowy brand + jego wykresy), flame rozgrzewki, koszty admina, toast destructive.
- i18n PL/EN pełne. `useTranslation()` → `{ t, lang }`, `t('klucz', {param})`. Poza Reactem: `translate(lang, key, params)`. Dane (ćwiczenia/dni/focus) KANONICZNE po PL; lokalizuje się TYLKO wyświetlanie (`localizeExerciseName`/`localizeCategory` z @/data/exercise-i18n, `localizeDayName`/`localizeFocus` z @/lib/plan-i18n, `dateLocale(lang)`).

## 🔴 KRYTYCZNA PUŁAPKA BUILDU iOS (biały ekran)
- `vite.config.ts`: `base: isMobileBuild ? './' : '/strength-save/'`. iOS WYMAGA `npm run build:mobile` (base `./`). Webowy build = assety 404 = biały ekran w WKWebView.
- `npm run deploy` ma predeploy `vite build` (WEB) — NADPISUJE `dist` buildem webowym. **Nigdy `cap sync ios` zaraz po `npm run deploy`.** Pipeline iOS sam robi `build:mobile` najpierw.
- RTK hook przepisuje `npx cap` → `npm cap` (błąd) — używaj `./node_modules/.bin/cap`.
- Symulator iPhone 17 UDID: `8F8734A8-5063-41DE-B465-1697B8F4771C`. Screenshot: `xcrun simctl io <UDID> screenshot /tmp/x.png`.

## 🚀 Wgrywanie buildu do TestFlight (w pełni z CLI, bez Xcode GUI)
Cały pipeline gotowy i powtarzalny. Klucz API (Admin) + dane w `_secrets/oauth/appstore-connect.env` (+ `AuthKey_UD43687FB9.p8`).
```bash
cd /Users/grzegorzjasionowicz/FIRMA/projekty/strength_save
# 1. bump build number (CURRENT_PROJECT_VERSION w pbxproj), commit
sed -i '' 's/CURRENT_PROJECT_VERSION = 9;/CURRENT_PROJECT_VERSION = 10;/g' ios/App/App.xcodeproj/project.pbxproj
# 2. odpal pipeline (build:mobile → cap sync → archive UNSIGNED → export manual → altool upload)
set -a; source /Users/grzegorzjasionowicz/FIRMA/_secrets/oauth/appstore-connect.env; set +a
scripts/ios-testflight.sh
# 3. po "UPLOAD SUCCEEDED" — poll aż VALID, potem podepnij do grupy "Wewnętrzni":
uv run scripts/asc_api.py builds       # status przetwarzania
uv run scripts/asc_api.py internal-setup   # podpina najnowszy VALID build
```
Narzędzia: `scripts/asc_api.py` (bundleId, builds, groups, internal-setup, add-tester), `scripts/ios_signing.py` (cert+profil+keychain — JUŻ zrobione, nie powtarzaj chyba że cert wygaśnie), `scripts/ios-testflight.sh`.
**Pułapki signing rozwiązane (patrz DECYZJE.md):** archive UNSIGNED + manual export, p12 `-legacy`, rekord apki TYLKO przez GUI (Apple blokuje API).

## Weryfikacja wizualna (Playwright, bo WKWebView nie pipuje konsoli)
Playwright jest w node_modules, dev server z `VITE_E2E_MODE=true` (playwright.config webServer ustawia). Spec: `setE2EAuthScenario(page, 'active-admin')` + `blockFirebase` + goto `./#/<trasa>` + screenshot. Scenariusze: `new-user` (onboarding), `active-admin` (reszta). E2E-seed cykli: `setE2ECycles`. Po teście usuń tymczasowy spec.

## Po sprawdzeniu kodu (przed ogłoszeniem gotowe)
`npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npx vitest run` (222 testy) + `npm run build:mobile`.

## Co ZROBIONE w ostatniej sesji (2026-06-06 → 08, build 1-9)
- **TestFlight 0.0.1** wgrany w pełni z CLI (App ID, cert, profil, 9 buildów). Firebase Storage + `storage.rules` wdrożone.
- **UX treningu:** czas trwania (`durationSec`+`startedAt`/`completedAt`), scroll-restore po wygaszeniu, timer haptics bez migania, pre-fill ostatniej wagi (nie auto+1), premium podsumowanie (badge kg stały kształt), checkbox widoczny, pełnoekranowy replan, avatar object-cover.
- **Cykle:** PR prawdziwe rekordy (nie top-10), przycisk closeout tylko gdy wygasł, "Powtórz plan" + auto-przedłużenie >7 dni (`lib/cycle-actions.ts`).
- **Design:** Kinetic Precision w CAŁEJ apce (23 pliki), italic nagłówki, kolejność nawigacji.
- Szczegóły: DECYZJE.md (wpis v0.0.1) + PLAN.md (M30-M34).

## Co DALEJ (backlog, PLAN.md) — priorytetowo
1. **Spójna nawigacja wstecz** — z każdego ekranu prosta strzałka ← (powrót). Dziś niespójne. Ujednolicić wzorzec (np. back-button w Layout/AppHeader dla tras nie-root).
2. **Achievements premium** (makieta KINETIC IRON w `~/Downloads/stitch_github_design_analysis (3)/`): PR życiowe duże + delta, karta plateau z CTA, siatka odznak/milestones, Wilks score, trend 6 mies. Baza w `Achievements.tsx` (`exerciseRecords`, 1RM) + `detectNewPRs` (pr-utils).
3. **Historia premium** — grupowanie po miesiącach + filtry-chipy.
4. **Email weryfikacyjny (Resend)** — `from: onboarding@resend.dev` (sandbox) dociera tylko na adres właściciela konta Resend. Zweryfikuj domenę apki w Resend + zmień `from` w `functions/src/registration.ts:195` + `weekly-digest.ts:222` + `firebase deploy --only functions`.
5. **Android Google Play**, **Apple/Google Sign-In**, **App Store release**.

## Pułapki dodatkowe
- Brak admin-dostępu do Firestore z CLI (ADC PERMISSION_DENIED) — naprawy danych usera rób jako narzędzia w apce (user uruchamia, ma dostęp przez security rules).
- ExerciseCard/WorkoutDay = krytyczny zapis serii — nie ruszaj handlerów setData/onSetsChange/sync.
- Stare treningi (sprzed build 2) nie mają zapisanego czasu → pokażą "—". To OK.
- Sekrety: `.env` → symlink `_secrets` (gitignore). `build/` w .gitignore (prywatny klucz dist!).
- Pamięć agenta: `~/.claude/projects/-Users-grzegorzjasionowicz-FIRMA-projekty-strength-save/memory/` (MEMORY.md + project_publikacja_status.md + i18n_architecture.md + deploy_and_build_gotchas.md).

Zacznij od `docs/DESIGN.md` + DECYZJE.md (wpis v0.0.1). Powodzenia!

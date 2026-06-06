# Prompt dla następnego agenta — Strength Save (FitTracker) mobile → TestFlight

Pracujesz nad aplikacją fitness **Strength Save / FitTracker** w
`/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`. To PWA (React 18 +
TypeScript + Vite + Firebase + Tailwind + shadcn/ui) opakowana w **Capacitor 8**
jako natywna apka **iOS + Android**. Cel: dopracować i wdrożyć na **TestFlight**.

Stack: React 18, Vite 5, Firebase JS SDK 12 (Auth + Firestore + Storage),
Capacitor 8 (SPM, nie CocoaPods), @capacitor-firebase/authentication (natywny
Google login), Tailwind + shadcn. Live web: https://grzegorzee.github.io/strength-save/
(GitHub Pages, branch gh-pages). Repo: github.com/grzegorzee/strength-save.

## Jak pracujemy — Karpathy Andrew rules (OBOWIĄZKOWE)
1. **Think before coding** — założenia jawnie, pytaj gdy niejasne, pokazuj trade-offy.
2. **Simplicity first** — minimum kodu, zero spekulatywnych abstrakcji.
3. **Surgical changes** — dotykaj tylko tego co trzeba, nie refaktoruj przy okazji, trzymaj styl.
4. **Goal-driven** — kryteria sukcesu + weryfikacja: typecheck + lint + build + test + screenshot symulatora.
- Język: PL (polskie znaki, BEZ em-dash/en-dash).
- Design: ŚCIŚLE wg `docs/DESIGN.md` ("Kinetic Precision"): Void #0e0e0e, lime
  #cefc22 (oszczędnie — akcje główne), cyan #00e3fd (dane wtórne/in-progress),
  **No-Line** (ZAKAZ 1px borderów do sekcjonowania — granice przez surface shifts /
  tonal layering), Space Grotesk + Inter, ekstremalna skala, wyrównanie do lewej.

## Workflow buildu iOS (KRYTYCZNE)
- `npm run dev` — web podgląd (localhost:8080).
- `npm run build:mobile` — build web (mode mobile) → dist.
- **`npm run mobile:sync` NIE wystarcza** do zobaczenia zmian na symulatorze —
  aktualizuje tylko źródła. Trzeba `./node_modules/.bin/cap run ios --target=<UDID>`
  (xcodebuild przebudowuje .app). Bez tego symulator odpala STARY build.
- Symulator iPhone 17 UDID: `8F8734A8-5063-41DE-B465-1697B8F4771C` (sprawdź `xcrun simctl list devices`).
- Hook RTK przepisuje `npx cap` → `npm cap` (błąd "Missing script"). Używaj `./node_modules/.bin/cap`.
- Weryfikacja wizualna: `xcrun simctl io booted screenshot /tmp/x.png` + odczyt.
  Tapowanie z CLI zawodne (deep-link openurl nieobsługiwany; cliclick niecelny) —
  proś usera o tap, albo testuj web przez Chrome MCP.
- Po zmianie kodu: `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint <pliki>` +
  `npm run build:mobile` + commit. Testy: `npx vitest run`.

## Co ZROBIONE w poprzedniej sesji (commity a44bba5..294e23e)
- ✅ **Natywny Google Sign-In iOS** — `initializeAuth` zamiast `getAuth` (getAuth wisiał w
  WKWebView, onAuthStateChanged nie strzelał); plugin @capacitor-firebase/authentication;
  iOS app w Firebase + GoogleService-Info.plist + URL scheme; konfiguracja warunkowa
  native/web w `src/lib/firebase.ts`.
- ✅ **Safe-area iPhone** — @capacitor/status-bar `overlay=false` w `src/lib/native-setup.ts`;
  bottom nav nad home indicatorem (AppNavigation, Layout).
- ✅ **Closeout cyklu** — banner tylko po zakończeniu planu (`src/lib/plan-next-step.ts`, `cycle-insights.ts`).
- ✅ **YouTube usunięty** (Error 153) → warstwa animacji (`src/lib/exercise-media.ts`:
  slugifyExercise + getExerciseAnimationUrl, CDN `store.gjasionowicz.pl/exercises/<slug>.mp4`;
  mapa ANIMATION_FILES PUSTA — user wrzuca pliki). `videoUrl` @deprecated w typach.
- ✅ **Redesign "Kinetic Precision" A→E**: tokeny+komponenty `src/components/kinetic/*`
  (SectionCard, SettingRow, Chip, StatCard, TierBadge); **Profil** `src/pages/Profile.tsx`
  + **Unit kg/lbs** (`src/contexts/UnitContext.tsx`, `src/lib/units.ts`) + **Tier** (`src/lib/tier.ts`);
  **biblioteka ćwiczeń** (chipy grup, lista, licznik); **szczegóły ćwiczenia**
  `src/pages/ExerciseDetail.tsx` (/exercise/:slug) + `src/components/MuscleMap.tsx`;
  **tabela serii treningu** (ExerciseCard: kolumna PREVIOUS, aktywna seria w lime ringu,
  kg/lbs, reps pre-fill) + timer sesji + karty volume/duration w WorkoutDay.
- ✅ **Dane AI dla 106 ćwiczeń** — `src/data/exercise-details.ts` (steps/proTip/targetMuscles/primaryMuscle/equipment, PL).
- ✅ **i18n CORE** — `src/i18n/{index,locales/pl,locales/en}`, `src/contexts/LanguageContext.tsx`
  (useTranslation, t(key)). Przełącznik w Profilu DZIAŁA. Pokryte: nawigacja, Profil,
  biblioteka i szczegóły ćwiczeń. Dodanie języka = 1 plik locale + wpis w LANGUAGES.
- ✅ **Pomiary ciała** → osobna strona `/measurements` (`src/pages/Measurements.tsx`) + menu
  (usunięte z zakładki Analityki).
- ✅ **Edycja avatara** w Profilu — upload do Firebase Storage `avatars/{uid}/`.
- ✅ **Narzędzie naprawy cykli** — Settings → "Połącz przerwane cykle"
  (`mergeContinuousCycles` w `usePlanCycles`): scala zakończone ciągłe cykle tego samego
  planu, remapuje treningi (cycleId), przelicza statystyki, usuwa nadmiarowe.
- ✅ **Globalny styl Badge** wg ekranu Ćwiczenia (lime/cyan chip, uppercase, No-Line).

## Co ZOSTAŁO do zrobienia (priorytet)
1. **i18n PEŁNE PL/EN** (goal usera: PL → WSZYSTKO po PL, EN → WSZYSTKO po EN, łącznie z
   ćwiczeniami). Brakuje: Dashboard, Login, WorkoutDay, Settings, Analytics, Cykle, Historia,
   NewPlan, Onboarding, Achievements + WSZYSTKIE toasty. ORAZ **ćwiczenia po EN**:
   `exerciseLibrary.ts` (nazwy PL → znajdź angielskie odpowiedniki), `exercise-details.ts`
   (kroki/proTip/mięśnie/sprzęt → warianty EN). Wzorzec: useTranslation + t('key'),
   klucze w `locales/{pl,en}.ts`. Dla ćwiczeń rozważ słownik lokalizowany / pole name_en.
2. **Etap E dodatki**: BEST-badge (cyan + gwiazdka, `getExerciseBest1RM` z `src/lib/pr-utils.ts`)
   w nagłówku ćwiczenia w treningu; kołowy rest-timer (`src/components/RestTimer.tsx` JUŻ
   istnieje) po odhaczeniu serii (Default Rest Timer z localStorage 'rest-timer-default').
3. **Fonty (dokończyć)**: Badge zrobiony globalnie. Zostają NAGŁÓWKI h1/h2 (Settings,
   Analytics, Cykle, Historia, Dashboard, NewPlan) → `font-heading uppercase tracking`.
4. **Deploy na web**: `npm run deploy` (gh-pages) — OBOWIĄZKOWY po zmianach (sam push na main
   nie aktualizuje live).
5. **Cykle — przyczyna**: narzędzie naprawy działa, ale KOD auto-tworzący "fantomowe" cykle
   gdy plan wygasa bez wyboru nowego (`usePlanCycles`) — napraw, by problem nie wracał.

## Droga do TestFlight (czego brakuje)
- **Konto Apple Developer** ($99/rok) — user NIE ma → BLOCKER #1 (bez niego brak podpisu/uploadu).
- **Signing**: Xcode (`ios/App/App.xcworkspace`) → target App → Signing & Capabilities → Team,
  automatic signing. Bundle ID `com.grzegorzjasionowicz.strengthsave` (już ustawiony, zarejestruj w Apple Developer).
- **Ikony + splash**: wygeneruj komplet (np. `@capacitor/assets` z logo) → `ios/App/App/Assets.xcassets`.
- **Wersja/build**: MARKETING_VERSION + CURRENT_PROJECT_VERSION (Xcode/capacitor.config).
- **App Store Connect**: utwórz rekord apki, podłącz bundle ID.
- **Archive + upload**: Xcode → Product → Archive (Generic iOS Device, NIE symulator) →
  Distribute → App Store Connect (lub Transporter).
- **TestFlight**: po uploadzie → App Store Connect → TestFlight → testerzy; compliance
  (encryption/privacy), opis testu.
- **Apple Sign-In** (odłożony): wymaga Apple Dev + Service ID + .p8 + provider w Firebase
  Console. Kod-wzorzec: jak Google flow w `useAuth` (OAuthProvider 'apple.com' + rawNonce +
  signInWithCredential), provider 'apple.com' w capacitor.config, capability w Xcode.
- **Storage rules**: sprawdź reguły Firebase Storage dla `avatars/{uid}/` (authd write) —
  inaczej upload avatara pada.
## Android (stan)
- ✅ Zsynchronizowany (`cap sync` — UWAGA: rób `cap sync` BEZ argumentu albo osobno `cap sync android`,
  wcześniej leciało tylko `cap sync ios` i android był pomijany). Aktualne web assets + 2 pluginy.
- ✅ Android app w Firebase + `android/app/google-services.json` + debug SHA-1 (90:9D:56...) → Google login działa na debug.
- ✅ `gradle assembleDebug` → BUILD SUCCESSFUL, APK w `android/app/build/outputs/apk/debug/`.
- ⬜ Test na emulatorze/urządzeniu: `adb` poza PATH (`~/Library/Android/sdk/platform-tools`); użyj Android Studio albo `cap run android`.
- ⬜ Release: keystore produkcyjny + jego SHA-1 w Firebase; Google Play Developer ($25) + Play Console.

## Pułapki
- Firebase Auth Web SDK wiesza się w WKWebView z getAuth — używaj initializeAuth (zrobione).
- ExerciseCard/WorkoutDay = KRYTYCZNY zapis serii do Firestore — SetData bez zmian, zachowuj handlery.
- Sekrety: `.env` → symlink do `_secrets` (gitignore). GoogleService-Info.plist commitowany (standard iOS).
- Brak admin-dostępu do Firestore z CLI (ADC PERMISSION_DENIED) — naprawy danych usera rób
  jako narzędzia w apce (user uruchamia, ma dostęp przez security rules).

Zacznij od `docs/DESIGN.md`, `START.md`, `DOCUMENTATION.md`. Powodzenia!

---

# 🔄 AKTUALIZACJA 2026-06-06 (sesja: i18n pełne, katalog 241, 10 planów, onboarding redesign, replan, fixy)

# Prompt dla następnego agenta — Strength Save (FitTracker)

Pracujesz nad aplikacją fitness **Strength Save** w
`/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save`. PWA (React 18 + TS + Vite 5 +
Firebase 12 + Tailwind + shadcn) opakowana w Capacitor 8 jako natywna iOS/Android.
Live web: https://grzegorzee.github.io/strength-save/ (gh-pages). Repo: github.com/grzegorzee/strength-save.

## Zasady pracy
- Język odpowiedzi: PL (polskie znaki, BEZ em-dash/en-dash). Karpathy rules: prostota, surgical changes, weryfikuj.
- Design ŚCIŚLE wg `docs/DESIGN.md` ("Kinetic Precision"): Void #0e0e0e, lime #cefc22 (akcje główne),
  cyan #00e3fd / token `fitness-cyan` (dane wtórne), No-Line (granice przez surface shifts, nie bordery),
  Space Grotesk (font-heading) + Inter, surface-low/high/highest do warstwowania.
- i18n: pełne PL/EN. `useTranslation()` → `const { t, lang } = ...`, `t('klucz', {param})`. Poza Reactem:
  `translate(lang, key, params)` z `@/i18n`. Dane (nazwy ćwiczeń/dni/focus) są KANONICZNE po PL; lokalizuje się
  TYLKO wyświetlanie przez helpery: `localizeExerciseName`/`localizeCategory` (@/data/exercise-i18n),
  `localizeDayName`/`localizeFocus`/`localizeWeekdayShort` (@/lib/plan-i18n), `dateLocale(lang)` dla dat.
  Wartości PL w locale dla kluczy asertowanych w testach MUSZĄ być 1:1 z oryginałem.

## 🔴 KRYTYCZNA PUŁAPKA BUILDU (przyczyna białego ekranu na iOS)
- `vite.config.ts` ma `base: isMobileBuild ? './' : '/strength-save/'`.
- **iOS WYMAGA `npm run build:mobile`** (base `./`). WEBowy `vite build` (base `/strength-save/`) wgrany do
  WKWebView = assety 404 = BIAŁY EKRAN.
- `npm run deploy` ma predeploy `vite build` (WEB) — NADPISUJE `dist` buildem webowym.
- **DLATEGO: nigdy `cap sync ios` zaraz po `npm run deploy` lub `npm run build`.**
  Poprawna kolejność dla iOS: `npm run build:mobile && ./node_modules/.bin/cap sync ios && ./node_modules/.bin/cap run ios --target=8F8734A8-5063-41DE-B465-1697B8F4771C`.
- Weryfikacja: `grep 'src="' ios/App/App/public/index.html` musi pokazać `./assets/...` (NIE `/strength-save/assets/...`).
- Symulator iPhone 17 UDID: `8F8734A8-5063-41DE-B465-1697B8F4771C`. Screenshot: `xcrun simctl io <UDID> screenshot /tmp/x.png`.
- RTK hook przepisuje `npx cap` → `npm cap` (błąd) — używaj `./node_modules/.bin/cap`.
- Po zmianie kodu: `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npm run build:mobile` + `npx vitest run` (219 testów).

## Weryfikacja wizualna onboardingu/wizarda (gdy trzeba)
WKWebView nie pipuje konsoli JS; Chrome-extension MCP bywa offline. Działa **Playwright** (jest w node_modules):
headless chromium + dev server z `.env.local` zawierającym `VITE_E2E_MODE=true`, `addInitScript` ustawia
`localStorage fittracker_e2e_auth_state={"scenario":"new-user"|"active-admin"}` i `app-language`. PO TEŚCIE
USUŃ `.env.local` (inaczej E2E-bypass trafi na produkcję). Onboarding pokazuje się tylko nowemu userowi
(new-user); replan `/new-plan` wymaga active-admin.

## Co ZROBIONE i zweryfikowane (tsc/eslint/219 testów/build zielone, commity na main)
- **Pełne i18n PL/EN** — wszystkie strony, komponenty, lib (plan-next-step, cycle-insights, next-set-advice,
  strava, share, ai-coach), dane (trainingRules, warmup), daty, dni/focus, admin, hooki, AccessGate. Coach AI
  odpowiada w języku UI. Zostają świadomie PL: prompty wejściowe LLM, lookup-keys (np. 'Półmaraton'), komentarze.
- **Katalog ćwiczeń 241** (było 106, +135: maszyny/wolne ciężary/BW), każde z PL+EN (kroki, mięśnie, sprzęt, proTip).
  Pliki: exerciseLibrary.ts, exercise-details.ts, exercise-i18n.ts, exercise-details-en.ts.
- **10 planów** (bez nazwisk) + pole `objective` + `getRecommendedPlan(objective, level, days)` w planTemplates.ts.
- **Onboarding 5-krokowy** (Welcome→Baseline→Objective→Protocol→Precision + przeglądaj 10 + ułóż własny) wg makiet
  Kinetic. Wspólny komponent `src/components/PlanWizard.tsx`; Onboarding.tsx = cienki wrapper. Zweryfikowany Playwrightem.
- **Spójny replan** (D6): `/new-plan` (NewPlan.tsx) = closeout zakończonego cyklu (fromCycle) → PlanWizard pre-fill
  z `trainingProfile` (zapisywany przy onboardingu do users/{uid}) startAtPrecision + "Zmień ustawienia" →
  preview+swap → `archiveCurrentPlan` + `savePlan` + `createActiveCycle`. Wyzwalacze: Dashboard expiry card, Cykle, CycleDetail.
- **BEST-badge + kołowy rest-timer** (ExerciseCard) + fonty nagłówków (font-heading uppercase) na stronach.
- **Cykle root-cause** fantomów (Cycles.tsx auto-repair: guard per planStartDate + localStorage zamiast ref).
- **Historia**: tonaż zaokrąglony + separator + staty font-heading/tabular-nums (mobile).
- **Cykle porównanie**: tonaż liczony NA TRENING (averageTonnagePerWorkout), nie sumę (naprawia absurdalny minus).
  Dodane **usuwanie cyklu** (CycleDetail → "Usuń cykl", odtagowuje cycleId, nie kasuje treningów) — `deleteCycle` w usePlanCycles.
- **Branding iOS**: ikona on-brand (hantel lime na Void) + splash; DEVELOPMENT_TEAM=J4CRD2SA6D; Info.plist
  ITSAppUsesNonExemptEncryption=false.

## Co JESZCZE do sprawdzenia / zrobienia
1. **Branding "FitTracker" → "Strength Save"**: app-header i ekran logowania nadal pokazują "FitTracker" (stara nazwa).
   W onboardingu/replanie widać podwójny brand (FitTracker w app-shell + STRENGTH SAVE w kreatorze). Ujednolicić.
   Szukaj literału 'FitTracker' w src (AppHeader, Login, toasty, manifest, capacitor.config appName='StrengthSave').
2. **Closeout (podsumowanie cyklu) — wizualnie NIEpotwierdzony**: ekran w NewPlan.tsx (phase 'closeout') zbudowany,
   tsc/build OK, ale nie sprawdzony na żywych danych cyklu (mock e2e ich nie ma). Zweryfikuj realnie kończąc plan.
3. **Replan-wizard renderuje się w app-shellu** (z dolną nawigacją + nagłówkiem) — onboarding jest full-screen.
   Rozważyć ukrycie nawigacji/nagłówka appki na trasie /new-plan dla spójności (Layout/AppHeader, route gating).
4. **TestFlight** (BLOKER = akcja usera w Xcode): otwórz `ios/App/App.xcworkspace` → konto Apple jest dodane →
   Product → Archive (Any iOS Device, NIE symulator) → Distribute → App Store Connect. Wcześniej utwórz rekord apki
   w App Store Connect dla bundle ID `com.grzegorzjasionowicz.strengthsave`. Wersja 1.0/build 1.
5. **Android (Google Play)**: cap run android (adb z ~/Library/Android/sdk/platform-tools do PATH), release keystore
   + SHA-1 w Firebase (debug już jest), Google Play Developer ($25) + Play Console. Ikony Android już wygenerowane.
6. **Firebase Storage rules** dla `avatars/{uid}/` (upload zdjęcia profilowego) — zweryfikować authd write.
7. **Apple Sign-In** (odłożone) — wymaga Service ID + .p8 + provider w Firebase.

## Pułapki dodatkowe
- Brak admin-dostępu do Firestore z CLI (ADC PERMISSION_DENIED) — naprawy danych usera rób jako narzędzia w apce
  (user uruchamia, ma dostęp przez security rules). Przykład: usuwanie błędnego cyklu = przycisk w CycleDetail.
- ExerciseCard/WorkoutDay = KRYTYCZNY zapis serii do Firestore — nie ruszaj handlerów setData/onSetsChange.
- Sekrety: `.env` → symlink do `_secrets` (gitignore). `.env.local` z VITE_E2E_MODE jest TYLKO do lokalnej diagnozy — usuń po użyciu.
- Pamięć agenta: `~/.claude/projects/-Users-grzegorzjasionowicz-FIRMA-projekty-strength-save/memory/` (MEMORY.md +
  i18n_architecture.md + deploy_and_build_gotchas.md).

Zacznij od `docs/DESIGN.md`. Powodzenia!

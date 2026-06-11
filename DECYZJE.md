# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-06-10 (audyt 20 agentów, 13 HIGH fixes, 9 funkcji UX, v6.12.0)

---

## DECYZJE

### 2026-06-08 (cz. 6) — Przełącznik jednostek kg ↔ lbs działa w CAŁEJ aplikacji

Cel: przełącznik kg/lbs (Profil) zmienia KAŻDĄ wagę w apce (wyświetlanie, pola wpisywania, wykresy, tonaż, rekordy, podpowiedzi, pomiary, share, onboarding). Wcześniej działał tylko w 4 plikach. **NIE wdrożone** (commit/push/deploy odłożone na życzenie usera — zmiany w working tree).

**Zasada (bez zmiany modelu danych):** kg KANONICZNE w Firestore, konwersja wyłącznie na warstwie UI. Wyświetlanie przez `fmt(kg)`/`toDisplay(kg)`, wpisywanie przez `fromInput(value)` (→ kg przy zapisie), tonaż przez `fmtTonnage(kg)`. Zero twardego "kg" w kontekstach wagi.

**Infrastruktura rozszerzona:** `units.ts` +`formatTonnage` (kg→"12.3 t" / lbs→"27.1 k lbs", tysiące funtów) +`weightUnitLabel`. `UnitContext` +`fmtTonnage`. Nowy `src/test/units.test.ts` (14 testów: round-trip kgToLbs/lbsToKg, formatWeight, formatTonnage, fromInput/toDisplay, brak zaokrąglenia kg przy zapisie).

**Naprawione (~17 plików):**
- **Wpisywanie:** `ExerciseCard` (serie — bez ruszania `setData`/`onSetsChange`, tylko konwersja), `MeasurementsForm` (waga ciała: pre-fill `toDisplay`, zapis `fromInput`; obwody w cm NIE ruszane).
- **Strony:** `Dashboard` (kafelek tonażu `fmtTonnage`, trend +suffix konwertowany, waga ciała, PR), `Analytics` (3 komponenty: schowek, kafelki, wykresy tonaż/waga/per-ćwiczenie z konwersją danych PRZED Recharts + oś/tooltip, weekly summaries), `Achievements` (kafelki, life-PR +delta, wykres trendu 6 mies., milestones, lista rekordów+1RM, dialog historii), `WorkoutHistory`, `Cycles`, `CycleDetail`, `Measurements`, `NewPlan`, `WorkoutDay` (badge tonażu per-ćwiczenie, prompt AI coach, dane share).
- **Komponenty:** `RzaMetricsCard`, `ExerciseProgressionDialog` (wykres+statystyki; bodyweight=powtórzenia bez konwersji przez helper `dispVal`), `ShareWorkoutDialog`+`share-utils` (obrazek share: `generateWorkoutImage` +param `unit`, tonaż przez `formatTonnage`), `PlanWizard` (onboarding "kg/mies" → jednostka usera).
- **Liby z podpowiedziami:** `next-set-advice` (`getNextSetAdvice` +param `unit`, formatowanie wag w `reason`) i `exercise-utils` (`getProgressionAdvice` +param `unit`). Oba `unit: UnitSystem = 'kg'` (default = output identyczny jak wcześniej → 287 testów bez zmian; testy asertujące `'↑ +2.5kg'` i `reason` nietknięte).
- **i18n:** 24 klucze (12 PL + 12 EN) sparametryzowane `{unit}` zamiast twardego "kg": nsadvice.*, progress.increaseWeight, cycles.kgTonnage/kgPerWorkout/est1RM, achievements.totalTonnageSub/ms.tonnage, comp.progression.maxKg, analytics.copy.tonnage/weight, measurements.field.weight, ob.precision.kgMonth.

**Pułapki rozwiązane:** tonaż w lbs (duże liczby) → `formatTonnage` ("t"/"k lbs") zamiast surowego fmt. Progi/milestones: logika `achieved` zostaje na kg, konwertowany TYLKO label. Brak podwójnej konwersji. Nie zaokrąglamy kg przy zapisie (100 lbs = 45.359 kg, zaokrąglenie tylko przy wyświetlaniu).

**Weryfikacja:** `tsc` OK, `eslint` czysty na zmienionych plikach (pozostałe 2 błędy pre-existing: `build/` artefakt iOS + `functions/src/registration.ts`), 287/287 testów, `build:mobile` OK. Playwright (tymczasowy spec, usunięty): `unit-system='lbs'` → nagłówek WorkoutDay "lbs"/zero "kg", label Measurements "Weight (lbs)", Dashboard renderuje bez crashu.

**Świadomie POZA zakresem:** proza generowana przez AI w cotygodniowym podsumowaniu (`generateWeeklySummary` Cloud Function, server-side) nadal cytuje kg — pełna konwersja wymaga zmiany backendu + przekazania `unit` + deploy funkcji. Kafelki liczbowe tego podsumowania (tonaż, PR) JUŻ konwertowane. Strava (km/pace) = dystans, poza zakresem przełącznika wagi. `generateWorkoutSummary` (ai-coach) — nieużywany w UI, pominięty.

---

### 2026-06-08 (cz. 5) — Zgoda na push + poranne przypomnienie o treningu (build 14)

- **Zgoda (Settings → Powiadomienia, `NotificationSettings.tsx`):** przycisk "Włącz powiadomienia" (świadoma akcja → systemowy prompt iOS + rejestracja tokenu) + status + toggle porannego przypomnienia (`notificationPrefs.dailyReminder`). `push-notifications.ts` rozdzielony: `registerPushForUser` (przy starcie, BEZ promptu — tylko gdy zgoda już jest) vs `requestPushPermission` (z Ustawień, prompt).
- **Cron `dailyTrainingReminder` (functions/daily-reminder.ts, deployed):** `onSchedule every day 07:00 Europe/Warsaw`. Push TYLKO w dni gdy user ma dziś zaplanowany dzień treningowy (czyta training_plans/{uid}.days, dopasowanie po weekday; dni wolne pomija). Spersonalizowane: imię + focus dnia. Respektuje dailyReminder + dostęp + token. i18n settings.notif.* (PL/EN). 267 testów. Build 14 VALID+podpięty.
- APNs key skonfigurowany przez usera w tej sesji (Apple Developer → Keys → upload do Firebase Cloud Messaging) — push iOS gotowy do testu.

---

### 2026-06-08 (cz. 4) — Panel admina Faza 1-3 + powiadomienia push (build 13)

Cel: rozbudowa panelu admina (wgląd, kontrola per user, broadcast, flagi) + push do userów/grup. Admin tylko `g.jasionowicz@gmail.com`, BEZ ról (nikt nie nadaje sobie admina).

**Backend (registration.ts + index.ts, deployed):** `adminGetUserLogs` (notification_logs + auth_audit per uid, bez composite indexu), `adminSendUserEmail`, `adminResendVerification`, `adminBroadcastEmail` (all/cohort), `adminSendPush` (FCM sendEachForMulticast, tokeny z users.fcmTokens), `adminDeleteUser` (Auth + Firestore, blokada usunięcia siebie). `updateUserAccess` +reason (zawieszenie → audyt). **AI gate per user**: `assertAiEnabled` w proxyOpenAI/streamOpenAI (features.ai!==false, admin zawsze, domyślnie ON). firestore.rules: `config/feature_flags` (auth read, admin write).

**Frontend (AdminDashboard + 3 karty modularne):** Puls aplikacji (10 metryk, getCountFromServer dla treningów+cykli). Lista userów: szukaj + filtry (aktywni/zawieszeni/bez dostępu/niezweryf.) + sort. Karta usera: logi per-user (Maile/Logowania), koszt AI per user, AI on/off + Strava per user, zawieś z powodem, akcje (mail, kod, reset onboardingu, cohorty, usuń 2x). AdminCommsCard (broadcast mail + push do all/cohort), AdminFeatureFlagsCard (config/feature_flags).

**Push (FCM):** `@capacitor-firebase/messaging`, `lib/push-notifications.ts` (registerPushForUser/listenPushTokenRefresh → users.fcmTokens), `PushRegistrar` w App (native). iOS: aps-environment=production w App.entitlements, capability PUSH_NOTIFICATIONS na App ID (ASC API), profil regen z push (UUID c85f25b1). Build 13 VALID+podpięty.

⚠️ **DOSTARCZANIE PUSH NA iOS WYMAGA KROKU ZEWNĘTRZNEGO:** klucz APNs (.p8) w Apple Developer (Certificates → Keys → Apple Push Notifications service) → upload do Firebase Console → Project Settings → Cloud Messaging → Apple app configuration → APNs Authentication Key. Bez tego iOS nie wygeneruje tokenu FCM ani nie dostarczy push. Backend/klient/UI gotowe.

**Decyzje:** wgląd głównie client-side (reguły admina pozwalają na users/workouts/cycles/ai_usage; logi notification_logs/auth wymagają funkcji bo rules=false). Bez systemu ról. AI domyślnie ON (toggle zapisuje features.ai). 246 testów, tsc/eslint czyste.

---

### 2026-06-08 (cz. 3) — Fixy onboardingu (build 11) + nawigacja (build 12)
Backlog 1-5 onboardingu (404 redirect, walidacja PlanBuilder, banner grace/kickoff, frekwencja rekomendacji, PL nazwy planów, wyszukiwarka bez-diakrytyczna, spójność nagłówków, confetti) + dolny pasek (pigułka pod ikoną) + boczne menu (sekcje GŁÓWNE/POSTĘPY/KONTO). Patrz commity a987c55..1039e42.

---

### 2026-06-08 (cz. 2) — DOKOŃCZENIE: email działa + Apple Sign-In live (build 10) + branding Google + email-gate UX

Z tokenami usera (Cloudflare + pełny klucz Resend, użyte tylko w pamięci sesji) dokończono blokady zewnętrzne z cz. 1:

- **Email z strengthsave.app — DZIAŁA.** Domena dodana w Resend (id 75a2bd1b), 3 rekordy DNS wpisane do Cloudflare przez API (DKIM TXT, SPF MX, SPF TXT) + DMARC (`v=DMARC1; p=none; rua=mailto:grzegorzee@gmail.com`). Domena **verified**. Klucz funkcji (re_Matw, send-only) jest w tym samym koncie → probe wysyłki zwrócił `id`, mail dotarł. `firebase deploy --only functions` wykonany — 24 funkcje live z `from: noreply@strengthsave.app`. Kody rejestracji dochodzą do każdego.
- **Apple Sign-In — LIVE w TestFlight (build 10).** Capability `APPLE_ID_AUTH` włączona na App ID przez ASC API (`scripts/_enable_apple_signin.py`, settings `APPLE_ID_AUTH_APP_CONSENT/PRIMARY_APP_CONSENT`). Provider Apple włączony w Firebase Console (user). Stary profil usunięty + nowy `Strength Save App Store` z capability (UUID 50cc6fd9, `scripts/_regen_apple_profile.py`, reuse cert F52LLKV85G). `CODE_SIGN_ENTITLEMENTS=App/App.entitlements` wpięty do pbxproj (Debug+Release), build 9→10. Pipeline TestFlight: ARCHIVE+EXPORT+UPLOAD SUCCEEDED, build 10 VALID, podpięty do grupy "Wewnętrzni". Do testu na urządzeniu: TestFlight → update build 10 → "Zaloguj przez Apple".
- **Branding logowania Google** (user w konsolach): OAuth consent screen App name "Strength Save" + logo + authorized domain strengthsave.app; authorized domain dodany w Firebase Auth. Fix "logowania do randomowego projektu".
- **Email-gate UX** (build 10): przyciski "Otwórz [provider]" (detekcja domeny maila, `lib/inbox-links.ts`) pod polem kodu + cooldown 60s na ponowne wysłanie kodu.

Build 10 zawiera CAŁOŚĆ sesji (nav, Achievements, Historia, Apple Sign-In, email-gate). 237 testów, tsc/eslint czyste.

---

### 2026-06-08 — Backlog 1-5 (nawigacja, Achievements, Historia, email, Apple Sign-In)

**Kontekst:** realizacja celu "zrobić 1-5 z backlogu + maile z domeny strengthsave.app".

1. **Nawigacja wstecz (spójna).** Decyzja: jeden wzorzec — `AppHeader` dostaje `onBack` dla tras NIE-root; trasy root (bottom nav: `/`, `/plan`, `/history`, `/exercises`, `/profile`) bez strzałki. `Layout.handleBack` = `navigate(-1)` z fallbackiem na `/` gdy brak historii (deep link, `window.history.state.idx`). Usunięto zdublowane in-content back-arrows (Settings, PlanEditor, AdminDashboard, UserPlanEditor, WorkoutHistory) — dublowały tytuł z AppHeader. Focused flow (Workout/Exercise) i fullscreen (NewPlan) zostają z własnym back.

2. **Achievements premium.** Nowy `lib/achievements-utils.ts` (testowalne; 10 testów): `getExercise1RMProgress` (rekord + delta vs poprzedni najlepszy), `getMonthlyTonnage` (6 mies., `refDate` param — sandbox blokuje `new Date()` w testach), `detectPlateaus` (rekord starszy niż ostatnie 3 z min. 4 sesji), `computeMilestones` (progi workouts/tonnage/records). UI: karty top-3 życiowych 1RM z przyrostem, wykres tonażu 6 mies. (Recharts), siatka odznak achieved/locked, karta zastoju z CTA do progresji. Usunięto zdublowaną kartę "Tonaż" (zastąpiona trendem). **Wilks ODŁOŻONY** — brak pola płci + niejednoznaczne mapowanie big-3 (High/Low Bar, Hack Squat); ryzyko mylących liczb sprzeczne z tylko_fakty.

3. **Historia premium.** Filtry statusu i dnia planu jako chipy (Kinetic: aktywny `fitness-cyan`, nieaktywny `surface-highest`) zamiast Select. Grupowanie sesji po miesiącach z nagłówkiem (miesiąc rok + liczba sesji + tonaż). Search + zakres dat zostają.

4. **Email z domeny strengthsave.app (KOD).** `from: Strength Save <noreply@strengthsave.app>` w `registration.ts` + `weekly-digest.ts` (było `onboarding@resend.dev`). ⚠️ **NIE deployować funkcji** zanim domena nie jest zweryfikowana w Resend (DNS SPF/DKIM) — inaczej kody rejestracji przestaną dochodzić. Klucz Resend (sekret Firebase) jest send-only → dodanie/weryfikacja domeny to krok w dashboardzie Resend + DNS u rejestratora.

5. **Apple Sign-In (KOD).** Google Sign-In był już zrobiony. Apple wymagany przez App Store skoro jest Google. Dodano `appleProvider` (firebase.ts), `useAuth.signInWithApple` (mirror Google, `skipNativeAuth:true` globalnie → `rawNonce` z plugina), przycisk iOS w Login (logo Apple SVG, czarny per HIG), `capacitor.config` providers +`apple.com`, `ios/App/App/App.entitlements` (gotowy, NIE wpięty do pbxproj). **Decyzja: nie wpinać entitlementu do pbxproj teraz** — bez capability w profilu provisioning zepsułoby pipeline TestFlight (signing mismatch). Aktywacja = kroki zewnętrzne (portal Apple → profil/pbxproj → Firebase provider Apple → test → nowy build).

**Weryfikacja:** tsc clean, eslint clean, 232 testy (222+10), `build:mobile` OK, screenshoty Playwright (nav, achievements, history, login). Commity per zadanie.

**Stan zadania 5 (Android/App Store):** kod gotowy. Android projekt OK (google-services.json, applicationId, versionCode 1) — brak release keystore (sekret) + Play Console. App Store release = submission/review. Wszystko poza CLI (kroki zewnętrzne).

---

### v0.0.1 build 1-9 (2026-06-06 → 2026-06-08) — TestFlight + redesign całej apki + naprawa cykli

**Publikacja iOS (TestFlight, w pełni przez API/CLI, bez Xcode GUI ani fastlane):**
- App ID, certyfikat Distribution, profil App Store utworzone przez App Store Connect API (`scripts/asc_api.py`, `scripts/ios_signing.py`). Pipeline `scripts/ios-testflight.sh` (build:mobile → cap sync → archive UNSIGNED → export manual → altool upload). Klucz API (Admin) w `_secrets/oauth/AuthKey_UD43687FB9.p8` + `appstore-connect.env`.
- Pułapki: (1) automatic cloud signing wymaga roli Admin klucza → obejście: ręczny cert+profil przez API + manual signing; (2) p12 z openssl 3 → `MAC verification failed` → `openssl pkcs12 -export -legacy`; (3) archive z automatic signing chce Development profil (wymaga device) → `CODE_SIGNING_ALLOWED=NO`, podpis przy eksporcie; (4) rekord apki — Apple BLOKUJE create przez API (`403 apps does not allow CREATE`), jedyny krok GUI; (5) `build/` w .gitignore (prywatny klucz dist). Internal testing: grupa "Wewnętrzni" + tester przez API. Wersja 0.0.1 (start, nie 1.0).
- Firebase Storage zainicjalizowany + `storage.rules` (avatars/{uid}: write tylko właściciel, obrazy <5MB) wdrożone.

**Naprawy UX treningu/podsumowania:**
- Pre-fill wagi bierze OSTATNIĄ wagę bez auto-progresji (+1/+2.5) — była regresja 14→15; sugestia podbicia w badge CEL. Sygnatura `createPrefilledSets` uproszczona.
- Czas trwania treningu: `WorkoutSession.durationSec` + `startedAt`/`completedAt` (backup, liczone w `syncDraftToFirebase` final przez `batchSaveWorkout`). Stare treningi pokażą "—".
- Scroll-restore po wygaszeniu (iOS WKWebView reload w tle) — `window.scrollY` do localStorage przy hidden/pagehide, restore po remount (TTL 15 min).
- RestTimer: `@capacitor/haptics` (navigator.vibrate martwy na iOS) + bez `animate-pulse`. Checkbox serii: obrys gdy niezaznaczony. Autosave badge chowany (tylko błąd). Usunięty zdublowany górny stoper.

**Naprawa cykli (lifecycle):**
- PR-y w `computeCycleStats` = RZECZYWISTE rekordy (`detectNewPRs` vs historia sprzed cyklu), nie top-10 → koniec "10 i 10".
- `buildCycleRecommendation.canCloseout` — przycisk "Domknij cykl" tylko gdy wygasł (`isExpired` z planowanego końca startDate+durationWeeks, NIE endDate=dziś z preview).
- Helper `lib/cycle-actions.ts startCycleWithPlan` — "Powtórz plan" (Cykle+Dashboard, wagi z historii), "Zmień plan", auto-przedłużenie (>7 dni bez decyzji → auto nowy cykl + toast).

**Design — Kinetic Precision w CAŁEJ apce (23 pliki):** indigo/blue/violet → lime/cyan; emerald → fitness-success; amber → fitness-warning/lime; sky → cyan; semantyczne badge → tokeny; hex+white-opacity → surface/muted. Karta podsumowania premium (badge kg stały kształt). Avatar object-cover. Italic na nagłówkach sekcji. Nawigacja: Dashboard/Plan/Historia/Ćwiczenia/Profil. Celowo zostają: Strava (brand+wykresy), flame rozgrzewki, koszty admina, toast.

**ODŁOŻONE:** Email weryfikacyjny (Resend) — `from: onboarding@resend.dev` (sandbox) dociera tylko na adres właściciela konta Resend. Naprawa: zweryfikować domenę apki w Resend + zmienić `from` w `functions/src/registration.ts:195` + `weekly-digest.ts:222` + `firebase deploy --only functions`.

### v6.11.4 (2026-05-30) — Final sync bez utraty treningu

**Decyzja:** Finalny zapis treningu jest teraz potwierdzany odczytem z serwera przed
usunięciem lokalnego draftu. IndexedDB pozostaje źródłem bezpieczeństwa do momentu, gdy
Firestore zwróci `completed=true` oraz te same ćwiczenia, serie i ciężary.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Walidacja final sync | `batchSaveWorkout` nie wystarcza jako dowód. Po finalnym zapisie `WorkoutDay` i `SyncCenter` robią read-back z serwera i walidują payload przez `workout-final-sync.ts` | ✅ |
| Brak kasowania draftu przy częściowym zapisie | Jeśli chmura nie potwierdzi kompletnego treningu, draft zostaje lokalnie, wraca do kolejki i pokazuje status final sync pending | ✅ |
| Eksport awaryjny | Sync Center ma przycisk eksportu lokalnego draftu do JSON | ✅ |
| Widoczna wersja PWA | Podbicie do `v6.11.4` pozwala sprawdzić, że użytkownik działa na nowym buildzie | ✅ |


### v6.11.0 (2026-05-29) — Coach następnej serii (1. funkcja AI dająca wartość)

**Decyzja:** Pierwszy z 3 pomysłów AI. Rdzeń deterministyczny (darmowy), AI tylko on-demand
(zero kosztu w tle — lekcja z usunięcia AI z planów). Odpowiada na pytanie „ile dziś nałożyć".

| Element | Szczegóły | Status |
|---------|-----------|--------|
| `src/lib/next-set-advice.ts` | `getNextSetAdvice` — konkretny cel (ciężar×powt.) z TRENDU całej historii (`getExerciseHistory` + `detectPlateau`), nie tylko ostatniego treningu. Kind: progress / hold / deload | ✅ |
| Deload przy plateau | Zastój ≥4 sesje → sugestia -10% ciężaru zamiast forsowania | ✅ |
| `ExerciseCard` badge "🎯 Cel: X kg × Y" | Zastępuje ogólne "↑ +2.5kg" gdy jest historia; fallback do starego badge dla 1 treningu. Plus jednozdaniowe uzasadnienie | ✅ |
| Przycisk "Coach AI" (on-demand) | `callOpenAI` z kontekstem (5 ostatnich sesji, sugestia, notatki) → 1-2 zdania porady w toaście. Koszt tylko po kliknięciu, limit $5 pilnuje `proxyOpenAI` | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 209/209 ✓ (7 nowych), playwright 99/99 ✓, build ✓.

**Pozostałe 2 pomysły AI (backlog):** asystent doboru ćwiczeń w kreatorze planu; wykrywanie plateau + deload na poziomie całego planu (proaktywny sygnał na Dashboard).


### v6.10.0 (2026-05-29) — Koniec AI w tworzeniu planów + własny builder

**Decyzja:** Usunięto generowanie planów przez AI (nieprzewidywalne, kosztowne, zależne od
OpenAI). Tworzenie planu = gotowe szablony (`planTemplates`) albo ręczny kreator od zera.
AI zostaje tam, gdzie analizuje realne dane (Coach, Chat, podsumowania) — nie zgaduje planu.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Usunięto AI z `NewPlan` | Tryb 'ai' (quiz + `generateTrainingPlan`) wycięty. Toggle: Gotowe plany / Własny plan | ✅ |
| Usunięto AI z `Onboarding` | 5-krokowy quiz + AI generate → wybór gotowego szablonu | ✅ |
| Nowy `src/components/PlanBuilder.tsx` | Ręczny kreator: dni (weekday+focus), ćwiczenia z biblioteki, serie, czas trwania. Walidacja: dzień = focus + min 1 ćwiczenie | ✅ |
| `fromCycle` bez AI | Kreator prefilluje dni skopiowane ze starego cyklu (zamiast AI-regeneracji) | ✅ |
| Usunięto `src/lib/ai-onboarding.ts` | Osierocony po wycięciu AI (Karpathy: czyść własny bałagan). `ai-coach.ts` zostaje (Coach/Chat) | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓ (1 test E2E zaktualizowany pod nowy onboarding), build ✓.

**Backlog AI (do realizacji osobno, używa realnych danych):** progresja per ćwiczenie,
wykrywanie plateau/deload, asystent doboru ćwiczeń w kreatorze, analiza dysbalansu objętości,
predykcja celów, normalizacja nazw ćwiczeń, analiza ryzyka przeciążenia (TRIMP).


### v6.9.4 (2026-05-29) — Naprawa historii po zmianie planu + snapshot (prewencja)

**Problem:** Po odpaleniu nowego planu (FBW → push/pull, start 1 czerwca) historyczne
treningi przestały się poprawnie wyświetlać: ukończony trening pokazywał pustą strukturę
nowego planu, znikały nazwy ćwiczeń, rekordy, osiągnięcia; plan startujący w przyszłości
pokazywał 8% i przyszły tydzień; cykle miały ujemne wartości. Dane w Firestore były
bezpieczne — to był bug warstwy odczytu (kod resolwował historię przez aktualny plan,
a `dayId`/`exerciseId` są niestabilne między planami).

| Decyzja | Kontekst | Status |
|---------|----------|--------|
| Wspólny resolver nazw `src/lib/exercise-name-resolver.ts` | Priorytet: snapshot w treningu → zarchiwizowany cykl → aktualny plan → defaultPlan → id. Reużyty w WorkoutDay, WorkoutHistory, Achievements, Analytics, cycle-insights | ✅ |
| `WorkoutDay` renderuje historię z ZAPISANEGO treningu, nie z planu | Snapshot dnia odbudowany z `workoutForDate.exercises`, gdy oglądamy ukończony/przeszły trening | ✅ |
| Snapshot w modelu: `ExerciseProgress.name`, `WorkoutSession.dayName/dayFocus` | Opcjonalne, wstecznie zgodne. Zapisywane od teraz przy każdym treningu → odporność na przyszłe zmiany planu | ✅ |
| `currentWeek=0` i guard `computeCycleStats` dla planu startującego w przyszłości | Eliminuje fałszywe 8% i NaN; plan tygodnia pokazuje pierwszy tydzień planu | ✅ |
| `buildCycleComparison` zwraca null dla świeżego cyklu (0 treningów) | Koniec mylących ujemnych delt (np. -50000 kg) | ✅ |
| Przycisk „Napraw dane historyczne" (Ustawienia) + `backfillHistoricalWorkouts` | Jednorazowe dotagowanie cycleId + snapshot nazw ze zarchiwizowanych cykli; idempotentne, ręczne (po eksporcie backupu) | ✅ |
| Auto-dotagowanie przy zmianie planu (`NewPlan.handleApprove`) | Po archiwizacji starego planu untagged treningi dostają cycleId — zapobiega powtórce problemu | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓, build ✓.
**Globalnie wdrożone:** zasady Karpathy (`~/.claude/karpathy-guidelines.md`) jako pierwszy krok każdego developmentu.


### v6.8.0 (2026-04-03)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-03 | **IndexedDB jako source of truth dla aktywnego treningu** — local-first draft + periodic/background sync | `React state + localStorage` nie wystarczał przy ubijaniu karty / przejściu telefonu w tło. Draft treningu ma być trwały lokalnie, a Firebase tylko warstwą checkpoint/final sync. | AKTYWNA |
| 2026-04-03 | **Offline-first start treningu** — provisional session bez wymaganego dokumentu w Firebase | Użytkownik ma móc zacząć trening bez internetu. Zdalna sesja jest tworzona dopiero po odzyskaniu połączenia i promocji lokalnej sesji. | AKTYWNA |
| 2026-04-03 | **Sync Center** — jawny stan kolejek syncu, retry i discard lokalnych sesji | Warstwa synchronizacji przestała być ukryta. Użytkownik i admin muszą widzieć, co jest tylko lokalne, co czeka na sync i co się nie udało. | AKTYWNA |
| 2026-04-03 | **CycleId jako źródło prawdy dla nowych treningów** — dual-read dla starych danych | Statystyki cyklu nie mogą opierać się tylko na zakresie dat. Nowe sesje są przypinane do `cycleId`, stare dane dalej działają przez fallback. | AKTYWNA |
| 2026-04-03 | **Access control po stronie backendu** — `access.enabled` i `status` egzekwowane w rules/functions | Sam client-side guard był za słaby. Dostęp użytkownika do danych i callable functions ma być blokowany też po backendzie. | AKTYWNA |
| 2026-04-03 | **Auth model: Google + email/password + kod mailowy** | Rejestracja ma być dostępna dla zwykłego usera bez admin handoff. Email verification jest obsłużony przez Functions + Resend, nie przez passwordless email-link. | AKTYWNA |
| 2026-04-03 | **Invite i waitlista jako warstwa operacyjna, nie bramka wejścia** | User po weryfikacji dostaje dostęp od razu. Invite i waitlista służą do cohort, onboarding contextu, flag i operacji admina, a nie do blokowania podstawowego wejścia. | AKTYWNA |
| 2026-04-03 | **Role tylko `admin` + `user`** — reszta przez statusy, cohorty i feature flags | Nie dokładamy nowych ról typu coach/staff. Produktowo wystarczą role bazowe plus metadata konta. | AKTYWNA |
| 2026-04-03 | **Osobne strony `/#/login` i `/#/register`** + redirect zalogowanego usera z auth routes | Rozdzielenie intencji upraszcza UX. Po zalogowaniu user nie może zostać na ekranie auth i ma być przeniesiony na dashboard lub onboarding. | AKTYWNA |
| 2026-04-03 | **Admin auth ops** — invite, waitlista, audit auth, suspend/restore, access toggle | Panel admina ma obsługiwać nie tylko plan i feature flags, ale też pełny lifecycle wejścia użytkownika do aplikacji. | AKTYWNA |
| 2026-04-03 | **Playwright jako realny gate dla flow auth i offline** — 83 scenariusze | Krytyczne scenariusze productowe muszą być testowane E2E, nie tylko smoke. Dotyczy to auth, offline startu, Sync Center i admin operations. | AKTYWNA |

### v6.7.0 (2026-04-02)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-02 | **Bodyweight exercises** — `isBodyweight` flag w exerciseLibrary, ukrycie pola kg w ExerciseCard, PR na reps | Dead Bug, Plank, Reverse Crunch itd. nie mają obciążenia. Pole kg było wymagane i bezużyteczne. Teraz grid 3-kolumnowy, progresja "+powt.", `getExerciseBestReps()`. | AKTYWNA |
| 2026-04-02 | **Batch save** — localStorage draft + Firestore writeBatch zamiast debounced autosave | Każda zmiana reps/weight powodowała zapis do Firebase (debounce 500ms). Teraz dane zapisywane TYLKO przy "Zakończ trening". `workout-draft.ts` jako backup. Draft recovery po crash/reload. `beforeunload` warning. | AKTYWNA |
| 2026-04-02 | **Dashboard "Rozpocznij trening"** — karta z 3 stanami na górze Dashboard | Użytkownik musiał nawigować do Plan dnia lub Plan treningowy żeby zacząć. Teraz: training day → przycisk start, completed → "Ukończony!", rest day → "Dzisiaj wolne" + info o następnym. | AKTYWNA |
| 2026-04-02 | **Nawigacja 8→6 zakładek** — usunięto "Plan dnia" i "AI Coach" z sidebar | Plan dnia zbędny z Dashboard start button. AI Coach nieużywany. Trasy dostępne przez URL. | AKTYWNA |
| 2026-04-02 | **Analytics per-exercise** — grid osobnych wykresów zamiast jednego overlapping | 30kg ćwiczenie obok 150kg na wspólnej osi Y = nieczytelne. Teraz każde ćwiczenie ma własny chart 150px z własną skalą Y. Bodyweight = reps na osi Y. | AKTYWNA |
| 2026-04-02 | **PR dates** — `bestDate` w ExerciseBest + wyświetlanie w Achievements | Rekordy nie miały daty. Teraz "80kg × 5 rep · 15 mar". | AKTYWNA |
| 2026-04-02 | **Cycles aktualny plan** — karta na górze z progress bar, tydzień X z Y | Cycles pokazywał tylko historyczne cykle, nie aktualny plan. | AKTYWNA |
| 2026-04-02 | **Playwright E2E** — VITE_E2E_MODE, 60 testów (smoke, nav, features, edge cases) | Brak E2E testów. Krytyczne dla weryfikacji batch save. | AKTYWNA |
| 2026-04-02 | **Security audit — 5 agentów równolegle** — CRITICAL: Strava auth fix, role escalation block, useAIChat userId fix | Audyt bezpieczeństwa znalazł 2 CRITICAL (Strava bez auth, role escalation), 3 HIGH, 7 MEDIUM. Wszystkie naprawione. | AKTYWNA |
| 2026-04-02 | **Usunięcie AI Chat/Coach** — useAIChat, useAICoach, useChatMessages, AIChat.tsx, ai-chat.ts | Nieużywane moduły. Usunięcie zmniejsza attack surface i kod (-815 linii). ai-coach.ts zostaje (callOpenAI, getSwapSuggestions). | AKTYWNA |
| 2026-04-02 | **Input validation** — clampSet() 0-999, notes cap 2000/5000, importData schema validation | Audit znalazł brak walidacji zakresów. Dodano server-side clamping i whitelist pól przy imporcie. | AKTYWNA |
| 2026-04-02 | **OpenAI hardening** — model allowlist, maxTokens cap 4000, max 50 messages | Audit: user mógł wybrać dowolny model i maxTokens. Teraz tylko gpt-5-mini/gpt-4.1-mini. | AKTYWNA |
| 2026-04-02 | **Cleanup /simplify** — formatLocalDate→utils, E2E helpers, callback refs, draft debounce, latestPR limit | Audyt /simplify: 20 findings, naprawiono top 11. -50 linii, lepsza memoizacja, mniej re-renderów. | AKTYWNA |

### v6.6.0 (2026-04-01)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-01 | **One-Click Autostart** — `?autostart=true` query param + useEffect auto-start + scrollIntoView | Użytkownik musiał kliknąć 2-3 razy żeby rozpocząć trening (Dashboard → WorkoutDay → "Rozpocznij"). Teraz jedno kliknięcie z Dashboard startuje sesję i scrolluje do pierwszego ćwiczenia. `autostartDone` ref zapobiega podwójnemu odpaleniu. | AKTYWNA |
| 2026-04-01 | **Pre-fill z progresją** — `createPrefilledSets()` w exercise-utils.ts, wywoływane przy tworzeniu nowej sesji | Sety startowały od 0/0 mimo że mamy dane z poprzedniego treningu. Teraz kopiuje reps + weight + increment z getProgressionAdvice (+2.5kg compound, +1kg isolation). completed=false — user potwierdza ✓. Fallback do createEmptySets() przy braku historii. | AKTYWNA |
| 2026-04-01 | **Skip exercise = tylko na dziś** — `skippedExercises?: string[]` w WorkoutSession, NIE modyfikuje planu | User chciał pomijać ćwiczenia bez wpływu na plan. skippedExercises zapisywane w Firebase per-sesja. Ćwiczenie filtrowane w aktywnym widoku, widoczne z badge "Pominięte" w podsumowaniu. | AKTYWNA |
| 2026-04-01 | **Dynamiczne serie** — handleAddSet/handleRemoveSet w ExerciseCard, max 10, min 1 | Stała liczba serii (z planu) nie pozwalała na elastyczność. Nowa seria kopiuje dane z ostatniej. Firebase już przechowuje dynamiczną tablicę SetData[], więc brak zmian modelu. | AKTYWNA |

### v6.5.0 (2026-03-24)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-24 | **Plan Cycles w osobnej kolekcji** — `plan_cycles/{autoId}` zamiast subcollection pod `training_plans` | Niezależne query, prostsze indeksy, brak limitu zagnieżdżenia. Każdy cykl ma pełny snapshot planu + statystyki. | AKTYWNA |
| 2026-03-24 | **Archiwizacja przy tworzeniu nowego planu** — `archiveCurrentPlan()` przed `savePlan()` | `training_plans/{userId}` przechowuje tylko JEDEN aktywny plan (setDoc nadpisuje). Archiwizacja zapobiega utracie historii. | AKTYWNA |
| 2026-03-24 | **Stats obliczane przy archiwizacji** — snapshot statystyk (tonaż, PRy, frekwencja) w dokumencie cyklu | Unikamy kosztownych retrospektywnych query. Stats frozen at cycle end. | AKTYWNA |
| 2026-03-24 | **generatePlanFromCycle** — osobna funkcja AI z kontekstem starego planu + PRów | AI dostaje pełny kontekst progresji: stary plan JSON, rekordy, frekwencję. Generuje plan z progresją. | AKTYWNA |
| 2026-03-24 | **Żółty banner ≤2 tygodnie** — `weeksRemaining` w useTrainingPlan, osobny od `isPlanExpired` | Proaktywne przypomnienie zamiast reaktywnego "plan się skończył". User ma czas zaplanować nowy cykl. | AKTYWNA |
| 2026-03-24 | **Share z photo — FileReader + brightness filter** — zdjęcie jako tło z `filter: brightness(0.4)` | Nie uploadujemy zdjęcia nigdzie — base64 w pamięci, renderowane przez html2canvas-pro. Prywatność preserved. | AKTYWNA |
| 2026-03-24 | **cycleId opcjonalne w WorkoutSession** — backward compatible, stare workouty bez cycleId | Brak migration wymagana. Nowe workouty dostają cycleId, stare działają bez zmian. | AKTYWNA |

### v6.4.1 (2026-03-17)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-17 | **savePlan zachowuje startDate/durationWeeks** — always-include zamiast optional spread | `setDoc` nadpisywał cały dokument, kasując metadata planu przy każdej edycji ćwiczenia. Dashboard pokazywał "Tydzień 1/12" zamiast prawidłowego tygodnia. | AKTYWNA |
| 2026-03-17 | **Auto-repair missing startDate** — query earliest workout → Monday → updateDoc | One-time self-healing: jeśli plan nie ma startDate, odtwarza go z historii treningów. Zapobiega konieczności ręcznej naprawy w Firebase. | AKTYWNA |

### v6.4.0 (2026-03-13)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-13 | **Streaming AI Chat (SSE)** — streamOpenAI onRequest + callOpenAIStream na froncie | Token-by-token UX zamiast czekania na pełną odpowiedź. onRequest zamiast onCall bo onCall nie wspiera SSE. | AKTYWNA |
| 2026-03-13 | **Per-user chat w Firestore** — chat_messages collection z userId isolation | Zastępuje localStorage (max 50 msg, ginęły po wylogowaniu) i legacy chat_conversations (brak per-user isolation). One-time migration z localStorage. | AKTYWNA |
| 2026-03-13 | **$5/user/miesiąc AI limit** — ai_usage/{userId_YYYY-MM} z FieldValue.increment() | Ochrona przed nadużyciami. Atomowe inkrementy (concurrent-safe). checkUsageLimit() przed każdym callem. | AKTYWNA |
| 2026-03-13 | **Cost tracking we wszystkich AI functions** — proxyOpenAI, generateWeeklySummary, streamOpenAI | Pełny obraz kosztów per user. Admin widzi global + per-user. | AKTYWNA |
| 2026-03-13 | **Manual auth w streamOpenAI** — Authorization: Bearer {idToken} zamiast onCall auth | onRequest nie ma wbudowanego auth jak onCall. verifyIdToken() ręcznie. | AKTYWNA |
| 2026-03-13 | **chat_conversations DEPRECATED** — zakomentowane w firestore.rules | Zastąpione przez chat_messages z per-user isolation. Legacy collection. | AKTYWNA |

### v6.3.0 (2026-03-12)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-12 | **Resend zamiast SendGrid** — Weekly Digest używa Resend API | User wybrał Resend, prostsze API, darmowy tier wystarczający | AKTYWNA |
| 2026-03-12 | **Auto-detect emaili z Firebase Auth** — `listUsers()` zamiast hardcoded secret | Digest wysyłany do każdego użytkownika z kontem, bez ręcznej konfiguracji | AKTYWNA |
| 2026-03-12 | **Per-user digest** — osobne query workouts + strava per userId | Każdy user dostaje swoje statystyki, nie globalne | AKTYWNA |
| 2026-03-12 | **Kompaktowe karty Strava w TrainingPlan** — inline rows zamiast pełnych StravaActivityCard | Na mobile pełne karty zajmowały za dużo miejsca, rozjeżdżały layout | AKTYWNA |
| 2026-03-12 | **Grupowanie po dacie w timeline** — Strava + trening z tego samego dnia razem | Czystszy layout, data wyświetlana raz, elementy logicznie powiązane | AKTYWNA |

### v6.1.0 (2026-03-11)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-11 | **Exercise Timeline z Recharts** — LineChart (est. 1RM primary + max weight dashed) | Wizualizacja progresji per ćwiczenie, reuse calculate1RM z pr-utils | AKTYWNA |
| 2026-03-11 | **Plateau detection** — brak progresu max weight w ostatnich N sesjach | Prosta heurystyka (domyślnie 4 sesje), alert w dialogu | AKTYWNA |
| 2026-03-11 | **Smart Rest Timer (intensity-based)** — czas odpoczynku zależy od typu ćwiczenia i % 1RM | Compound 90s base, isolation 60s, +30s >80% 1RM, +60s >90% 1RM. Superset first 15s, non-first 60s | AKTYWNA |
| 2026-03-11 | **lookupExerciseType** — lookup compound/isolation z exerciseLibrary | Reuse istniejącej biblioteki, fallback 'compound' dla nieznanych | AKTYWNA |
| 2026-03-11 | **Warmup Routine UI z timerami** — checklist + inline 30s countdown | Dane z warmupStretching.ts (już istniały), focus-based stretching | AKTYWNA |
| 2026-03-11 | **Training Heatmap (GitHub-style)** — grid 53×7 z 5 poziomami intensywności | Łączy workouts + Strava w jedną wizualizację, year selector | AKTYWNA |
| 2026-03-11 | **Share Workout via html2canvas-pro** — generowanie PNG 540×960 (IG story) | Ciemny gradient, stats grid, lista ćwiczeń, navigator.share + download fallback | AKTYWNA |
| 2026-03-11 | **Race Predictor (Riegel formula)** — T2 = T1 × (D2/D1)^1.06 | Predykcje 5K/10K/HM/Marathon z najlepszego effort w Strava | AKTYWNA |
| 2026-03-11 | **Training Load (TRIMP/Banister)** — CTL 42d EWMA, ATL 7d EWMA, TSB = CTL - ATL | Wymaga aktywności z HR, default restHR=60, maxHR z connection | AKTYWNA |
| 2026-03-11 | **Weekly Digest (Cloud Function)** — onSchedule Monday 08:00 Warsaw | HTML email inline CSS, stats grid + Strava highlights, per-user | AKTYWNA |
| 2026-03-11 | **escapeHtml w share-utils** — XSS protection przy innerHTML | Pre-commit hook złapał innerHTML bez sanityzacji, dodano escapeHtml() | AKTYWNA |

### v5.1.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Auto-detect istniejących użytkowników** — w `ensureUserDoc()` sprawdzamy czy user ma workouty → auto `onboardingCompleted: true` | Bug v5.0: istniejący użytkownicy widzieli onboarding i tracili swój plan | AKTYWNA |
| 2026-03-08 | **Przywracanie domyślnego planu** — jeśli existing user nie miał `onboardingCompleted`, przywracamy defaultPlan | Bug v5.0 nadpisywał plany istniejących użytkowników | AKTYWNA |
| 2026-03-08 | **Rozszerzony Weekday type (7 dni)** — `'monday' \| 'tuesday' \| ... \| 'sunday'` | Plany 2-5 dni/tydzień wymagają mappingu na dowolny dzień | AKTYWNA |
| 2026-03-08 | **Dynamiczny getTrainingSchedule()** — akceptuje `weeks` i `days` params | Plany AI mają różną liczbę dni i tygodni | AKTYWNA |
| 2026-03-08 | **Plan duration tracking** — `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired` | Plany mają czas trwania (8-16 tygodni), po upływie → nowy plan | AKTYWNA |
| 2026-03-08 | **Banner expired plan** — Dashboard pokazuje banner "Twój plan się zakończył!" z linkiem do /new-plan | UX: jasna komunikacja + call-to-action | AKTYWNA |
| 2026-03-08 | **NewPlan.tsx** — oddzielna strona generowania nowego planu (cel, dni, AI, review, save) | Oddzielony od onboardingu: mniejszy, prostszy, podsumowuje stary plan | AKTYWNA |
| 2026-03-08 | **Review planu po AI generation** — onboarding i NewPlan pokazują plan z "Zamień" buttonsami | User widzi plan PRZED zapisem, może zamienić ćwiczenia | AKTYWNA |
| 2026-03-08 | **ExerciseSwapDialog** — dialog zamiany ćwiczenia z filtrami po kategorii | Filtruje bibliotekę, ukrywa już użyte, zachowuje oryginalne sety | AKTYWNA |
| 2026-03-08 | **GeneratedPlan interface** — `{ days, planDurationWeeks }` zamiast plain array | AI zwraca czas trwania planu (8-12 tygodni) | AKTYWNA |
| 2026-03-08 | **Strava 365 dni lookback** — pierwszy sync pobiera rok wstecz (zamiast 30 dni) | Użytkownicy chcieli widzieć starsze aktywności | AKTYWNA |
| 2026-03-08 | **Strava w planie tygodnia** — Dashboard, TrainingPlan, Analytics, AIChat | Strava aktywności widoczne obok treningów siłowych | AKTYWNA |
| 2026-03-08 | **AI "Podsumuj tydzień" z Strava** — quick action w AIChat buduje prompt z treningami + Strava | Pełny obraz tygodnia: siłownia + bieganie/rower/etc. | AKTYWNA |
| 2026-03-08 | **Klikalne ukończone treningi w Analytics** — `<button>` zamiast `<div>` z navigate | UX: użytkownik może przejść do szczegółów treningu | AKTYWNA |

### v5.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **AI-powered onboarding** — 5-krokowy wizard → AI generuje plan | Nowi użytkownicy dostają spersonalizowany plan zamiast domyślnego | AKTYWNA |
| 2026-03-08 | **Exercise library (60+ ćwiczeń)** — `exerciseLibrary.ts` z kategoriami i video URL | AI używa nazw z biblioteki (priorytet), swap dialog filtruje po kategoriach | AKTYWNA |
| 2026-03-08 | **AI Coach na Dashboard** — insights: plateau, progress, consistency, suggestion, warning | Analiza treningów po 3+ ukończonych, cache 24h | AKTYWNA |
| 2026-03-08 | **OpenAI integration** — `callOpenAI()` w `ai-coach.ts`, `VITE_OPENAI_API_KEY` | Generowanie planów i AI coaching przez API | AKTYWNA |
| 2026-03-08 | **onboardingCompleted flag** — pole w `users/{uid}` decyduje o onboarding vs Dashboard | Kontrola flow nowych użytkowników | AKTYWNA |

### v4.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** — każdy hook przyjmuje userId, dane izolowane per-user | Dodanie drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** — `VITE_ALLOWED_EMAILS` (comma-separated) | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** — `role: 'admin' \| 'user'`, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** — `training_plans/{userId}` z days, durationWeeks, startDate | Każdy użytkownik ma własny plan z czasem trwania | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** — stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** — `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** — userId ASC + date DESC na workouts, measurements, strava_activities | Zapytania z `where('userId')` + `orderBy('date')` | AKTYWNA |
| 2026-03-08 | **Firestore security rules** — użytkownicy czytają/piszą tylko swoje dane, admin read all | Bezpieczeństwo danych multi-user | AKTYWNA |

### v3.1.0 (2026-02-23)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-02-23 | **Strict TypeScript** — `strict: true` w tsconfig.app.json, zero błędów | Jakość — strictNullChecks, noImplicitAny | AKTYWNA |
| 2026-02-23 | **Testy Vitest** — 25 testów dla exercise-utils i trainingPlan | Pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** — wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność — utility w oddzielnym pliku | AKTYWNA |
| 2026-02-23 | **Strona Postępy** — wykresy recharts: progresja ciężarów + pomiary ciała | Wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** — circular progress, presety, wibracja | Timer dostępny w trakcie treningu (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** — ThemeProvider (next-themes) + toggle Sun/Moon | CSS variables, class strategy | AKTYWNA |
| 2026-02-23 | **Error Boundary** — class component owijający App | Fallback UI zamiast białej strony | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** — getThisWeekDates() zamiast getLatestWorkout() | Plan tygodnia nie pokazywał starych treningów | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** — credentials przeniesione do VITE_* | Bezpieczeństwo — klucze poza źródłami | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** — zapobiega re-renderom | Skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) — mniej zapisów do Firebase | Rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** — "Poprzednio: 8×40kg" | User nie musi pamiętać ciężarów | AKTYWNA |

### v3.0.0 (2026-01-28)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** — pierwsza seria, pomarańczowa, ikona płomienia | Oddzielenie rozgrzewki od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** — opcjonalne pole tekstowe pod seriami | Zapisywanie odczuć, uwag technicznych | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** — `handleSetsChangeLocal` modyfikuje tylko lokalny state | Auto-save powodował "mryganie" UI | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** — wszystkie nawigacje do workout przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** | Wcześniej pokazywał następny tydzień | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** — nie fixed | Fixed button skakał na mobile przy klawiaturze | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth, darmowy tier | AKTYWNA |
| 2026-01 | **Multi-email whitelist** | VITE_ALLOWED_EMAILS (comma-separated) | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined` | AKTYWNA |
| 2026-02 | **OpenAI API client-side** | VITE_OPENAI_API_KEY, bezpośrednie wywołania | AKTYWNA |
| 2026-03 | **Strava OAuth server-side** | Firebase Cloud Functions (callable) | AKTYWNA |
| 2026-03 | **Per-user data isolation** | Firestore security rules + composite indexes | AKTYWNA |
| 2026-03 | **AI plan duration (8-16 weeks)** | AI decyduje na podstawie celu/doświadczenia | AKTYWNA |
| 2026-03 | **SSE streaming via onRequest** | onCall nie wspiera streaming, onRequest + manual Bearer auth | AKTYWNA |
| 2026-03 | **AI cost tracking per-user per-month** | FieldValue.increment() atomowe, $5 limit, ai_usage collection |
| 2026-03 | **Plan Cycles (osobna kolekcja)** | plan_cycles/{autoId} z snapshot planu + stats, archiwizacja przy nowym planie |
| 2026-03 | **Photo share (client-side only)** | FileReader base64, brightness filter, html2canvas-pro, zero upload | AKTYWNA |

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | "Mryganie" i zbędne zapisy Firebase |
| 2026-01-28 | Fixed button na dole (tryb edycji) | Skakał przy klawiaturze na mobile |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |
| 2026-03 | Strava OAuth client-side | Wymaga server-side dla token exchange |
| 2026-03 | Natychmiastowy zapis planu z onboardingu | Użytkownik nie mógł zweryfikować/zamienić ćwiczeń |
| 2026-03 | 30 dni lookback Strava (pierwszy sync) | Za mało aktywności widocznych dla nowych użytkowników |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce 500ms
- `handleSetsChangeLocal` → tryb edycji, TYLKO lokalny state
- `handleFinishEditing` → zapis wszystkiego na raz po edycji

### Struktura SetData
```typescript
interface SetData {
  reps: number;       // Zawsze number, nigdy undefined
  weight: number;     // Zawsze number, nigdy undefined
  completed: boolean; // Zawsze boolean
  isWarmup?: boolean; // Opcjonalne, true tylko dla warmup
}
```

### Nawigacja z datą
```typescript
navigate(`/workout/${dayId}?date=${targetDate}`)
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```

### Onboarding detection
```typescript
// UserContext.tsx
const workoutsSnap = await getDocs(
  query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
);
const isExistingUser = !workoutsSnap.empty;
// isExistingUser → auto onboardingCompleted: true
```

### Plan expiration
```typescript
// useTrainingPlan.ts
const currentWeek = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isPlanExpired = currentWeek > planDurationWeeks;
```

---

## SESJA 2026-06-05/06 — i18n pełne, katalog 241, 10 planów, onboarding redesign, replan, fixy

### Decyzje produktowe (z ankiet z userem)
- **Plany:** zostawić istniejące, dać lepsze nazwy (bez nazwisk — "Jeremy Ethier" → "Balanced Builder"), dobić do **10** (6 rename + 4 flagowce pod cele onboardingu). Nazwy brandowe Kinetic (Iron Foundation, Push Pull Legs Engine, Upper/Lower Forge, Hypertrophy Split, Tension Protocol; Foundational Strength 5x5, Powerbuilding Protocol, Lean Engine, Kinetic Athlete).
- **Custom ćwiczenia (dodawanie własnych do bazy):** ODPUSZCZONE — katalog 241 wystarczy, user wybiera z katalogu zamiast dodawać. (Firestore per-user custom exercises pominięte.)
- **Katalog:** "idziemy na grubo" — +135 ćwiczeń (maszyny popularnych siłowni + wolne ciężary + BW), nie tylko top 30. Każde komplet PL+EN.
- **Onboarding:** pełny 5-krokowy kreator wg makiet usera (Welcome → Baseline/poziom → Objective/cel → Protocol/dni+harmonogram+data → Precision/rekomendacja). Rekomendacja + przeglądanie 10 + ułóż własny.
- **Replan (po skończeniu planu):** spójny z onboardingiem przez wspólny `PlanWizard`. Start od rekomendacji (pre-fill z profilu) + "Zmień ustawienia". Closeout (świętowanie wyników cyklu) PRZED wyborem. Preview + swap ćwiczeń przed zatwierdzeniem.

### Decyzje techniczne / architektura
- **i18n:** PL pozostaje KANONICZNE w danych (nazwy ćwiczeń/dni/focus = slug CDN, lookup szczegółów, zapis Firestore, resolver historii). Lokalizuje się TYLKO wyświetlanie. Czysta funkcja `translate(lang,key,params)` w `@/i18n` używana też w lib/ (poza Reactem; funkcje lib biorą `lang` z domyślnym 'pl' by testy przeszły). Helpery: localizeExerciseName/Instruction/Category, localizeDayName/Focus/WeekdayShort, dateLocale. Wartości PL w locale dla kluczy asertowanych w testach = 1:1 z oryginałem.
- **Focusy planów** muszą być tokenizowalne przez localizeFocus (mapa słów PL→EN word-by-word) — nowe plany używają prostego słownictwa (Nogi/Klatka/Plecy/Barki, Całe ciało A, Dół/Góra/Kondycja, Siła A), nie wielowyrazowych fraz.
- **PlanWizard** (`src/components/PlanWizard.tsx`) = jedno źródło prawdy dla wyboru planu. Props: showWelcome, initial (pre-fill), startAtPrecision, confirmLabelKey, onConfirm(choice), onExitBack. Onboarding.tsx i NewPlan.tsx = cienkie wrappery (różnią się tylko zapisem: onboarding→completed, replan→archive+cycle).
- **Porównanie cykli:** tonaż liczony NA TRENING (averageTonnagePerWorkout), nie suma — suma świeżego cyklu vs zakończonego zawsze dawała absurdalny minus (-69978 kg).
- **Naprawy danych usera (np. fantomowy cykl):** robione jako narzędzia W APCE (user uruchamia, ma dostęp przez security rules), bo z CLI brak admin-dostępu do Firestore (ADC PERMISSION_DENIED). Przykład: "Usuń cykl" w CycleDetail (deleteCycle odtagowuje cycleId, nie kasuje treningów).
- **Root-cause fantomowych cykli:** auto-repair w Cycles.tsx tworzył duplikaty bo guard na ref żył tylko w jednym mountcie. Fix: guard per planStartDate + localStorage zamiast ref.

### 🔴 WNIOSKI ZE WSZYSTKICH BUILDÓW (kluczowe — biały ekran iOS)
- **Base path = przyczyna białego ekranu na iOS.** `vite.config.ts`: `base: isMobileBuild ? './' : '/strength-save/'`. iOS WKWebView serwuje z roota → WYMAGA builda mobilnego (base `./`). Build webowy (base `/strength-save/`) wgrany do iOS = assety 404 = biały ekran (bez ErrorBoundary, bo bundle się nie ładuje).
- **`npm run deploy` ma predeploy `vite build` (WEB) i NADPISUJE `dist`.** Jeśli po deployu zrobisz `cap sync ios`, skopiujesz build WEBowy do iOS → biały ekran. **Zawsze:** `npm run build:mobile && ./node_modules/.bin/cap sync ios && ./node_modules/.bin/cap run ios --target=<UDID>`. Weryfikacja: `grep 'src="' ios/App/App/public/index.html` musi pokazać `./assets/...`, NIE `/strength-save/assets/...`.
- **`cap sync` NIE wystarcza** do zobaczenia zmian na uruchomionej apce iOS — trzeba `cap run` (xcodebuild przebudowuje .app). Sam `cap sync` tylko kopiuje pliki.
- **Service worker NIE był przyczyną** białego ekranu (fresh uninstall+reinstall też był biały) — to czysto base path. (Ale SW PWA w WKWebView to potencjalne źródło problemów z cache przy update.)
- **RTK hook** przepisuje `npx cap` → `npm cap` (błąd "Missing script") — używaj `./node_modules/.bin/cap`.
- **Weryfikacja wizualna bez urządzenia:** Chrome-extension MCP bywa offline; WKWebView nie pipuje konsoli JS do stdout (OSLog = systemowy szum). Działa **Playwright** (headless chromium) + dev server z `.env.local` `VITE_E2E_MODE=true` + `addInitScript` ustawiający localStorage `fittracker_e2e_auth_state={"scenario":"new-user"|"active-admin"}`. PO TEŚCIE USUŃ `.env.local` (E2E-bypass nie może trafić na produkcję). `waitUntil:'domcontentloaded'` (NIE 'networkidle' — HMR websocket wisi). Onboarding = new-user; replan `/new-plan` = active-admin.
- **Multi-plik scalanie danych (i18n/ćwiczenia):** agenci piszą fragmenty (JSON/klucze), główny agent scala deterministycznie skryptem ze sprawdzeniem dup/parity/kolizji — zero równoległej edycji wspólnych plików. tsc waliduje komplet (en typowany `Record<keyof typeof pl,string>`).
- **Każdy etap weryfikowany:** `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npm run build:mobile` + `npx vitest run` (219 testów). Build/testy NIE łapią błędu base-path (to runtime iOS) — dlatego potrzebny screenshot symulatora po `cap run`.

---

## SESJA 2026-06-10 — audyt 20 agentów + naprawa 13 HIGH + 9 funkcji UX (v6.12.0)

**Audyt:** 20 agentów (po jednym na obszar) + adwersaryjna weryfikacja każdego critical/high. Wynik: 141 znalezisk, 140 potwierdzonych (0 critical, 13 high, 74 medium, 53 low). Pełny raport: `audit/AUDYT_KOMPLETNY_2026-06-10.md`.

**Naprawione wszystkie 13 HIGH:**
1. `VITE_OPENAI_API_KEY` usunięty z CI (deploy.yml) i z sekretów repo — klient go nie używał. UWAGA: klucz był publiczny w bundlu do 2026-03-09 → wymaga ROTACJI w OpenAI dashboard (manualnie).
2. Konflikt dwóch urządzeń: seed `cloudUpdatedAt` (cloudMetaRef) + kolejka sync nie wycina już pól + dialog "Zachowaj moją / Pobierz z chmury" zamiast cichego nadpisania.
3. `savePlan`: guard na `isLoaded` + `merge: true` (zapis przed snapshotem kasował custom plan).
4. Swap w podglądzie NewPlan przez `swapExerciseIdentity` (videoUrl: undefined wywalał setDoc).
5. Powrót preview→wizard przywraca stan (prop `resume` w PlanWizard + initialDays w PlanBuilder).
6. Reset planu (PlanEditor) za AlertDialogiem.
7. Pre-fill wag: fallback po nazwie ćwiczenia z całej historii (id zmieniają się między cyklami).
8. Reconnect Strava kasuje aktywności TYLKO przy zmianie konta (athleteId); to samo konto zachowuje historię >365 dni.
9. Disconnect Strava z potwierdzeniem (ostrzeżenie o utracie).
10. Flagi admina (config/feature_flags) faktycznie egzekwowane: aiEnabled w assertAiEnabled, registrationOpen w syncUserProfile (kill switch na cost abuse); generateWeeklySummary ma bramkę AI.
11. Streak: parseLocalDate zamiast new Date('YYYY-MM-DD') — poniedziałki liczone w UTC+ (test regresyjny).
12. Self-service usunięcie konta (Apple 5.1.1(v)): callable deleteOwnAccount + wspólny purgeUserData (też avatary Storage i app_telemetry_daily) + dialog z wpisaniem USUŃ w Profilu.
13. Import backupu z dialogiem podsumowania (data, liczby, nadpisania) zamiast natychmiastowego wykonania.

**Funkcje UX (1-6, 8-10; 7 pominięta na życzenie):**
- AutoSyncOnReconnect: zaległe final-synci domykane po powrocie online; wskaźnik zapisu 2 stany ("na telefonie"/"w chmurze HH:MM").
- Pełny backup (plan+cykle, schemaVersion 2), import batchami bez limitu 500, updatedAt/revision zachowane.
- ConfirmDialog (wspólny) wpięty w cleanup/merge/reset admina/API keys.
- Szkice kreatora planu w localStorage (builder + preview) z bannerem "kontynuować?".
- PreferenceSync: users/{uid}.preferences (jednostki, język, timer, dźwięk) między web i iOS; users.language pisany dla push/digest.
- Dashboard: planEnded (wygasły LUB zakończony wcześniej), odliczanie "startuje za X dni", karta przedłużenia ZAMIAST cichego auto-startu cyklu.
- Odznaki z paskiem postępu (%), podpowiedź "zrób jeszcze N treningów, aby utrzymać serię".
- Profil linkuje do sekcji Ustawień (?section= + scroll), wykres tonażu z zakresem 8/12 tyg/Wszystko (domyślnie 12).

**Wcześniej w tej sesji:** zawsze ciemny motyw (forcedTheme, usunięty toggle) + licznik ukończonych treningów w nagłówku; iOS build 25 na TestFlight.

**Do zrobienia ręcznie:** rotacja klucza OpenAI w dashboardzie OpenAI (sekret w Secret Manager: openai-api-key) — stary był publiczny w bundlu GH Pages do 2026-03-09.

---

## SESJA 2026-06-11 — grywalizacja: tarcza serii, odznaki specjalne, medale sezonów

- **Tarcza serii (streak freeze):** `calculateStreakDetails` w `summary-utils.ts`. Tydzień bez 2 treningów nie zeruje serii, jeśli starszy tydzień jest zaliczony i poprzednia tarcza była >=4 tyg. wcześniej (max ~1/mies.). Bieżący tydzień nigdy nie łamie serii (naprawia reset w poniedziałek). Notka na Dashboardzie gdy tarcza uratowała zeszły tydzień.
- **Odznaki specjalne:** `computeSpecialBadges` (achievements-utils): Ranny ptaszek (<7:00), Comeback (21+ dni przerwy), Niedzielny wojownik, Konsekwentny (4 tyg. z kompletem planu). Sekcja w Achievements.
- **Medale sezonów:** `season-medals.ts` (złoto >=85%, srebro >=65%, brąz >=40% frekwencji). Chip na closeout cyklu + sekcja "Półka medali" w Achievements.
- Wdrożone: web (GH Pages) + iOS TestFlight build 27.
- **UWAGA build 27 z czystego worktree:** w repo trwa równoległa praca nad Apple Watch (useWatchWorkoutSync, watch-bridge, target StrengthWatch w pbxproj — NIEZACOMMITOWANE). Deploy i build iOS zrobione z czystego HEAD, żeby nie wypuścić WIP. Numer buildu 27 podbity TYLKO w worktree — pbxproj w repo dalej ma 26; przy commitowaniu pracy nad Watch ustawić CURRENT_PROJECT_VERSION >= 28.

# Strength Save — audyt gotowości do publicznego wydania (2026-08-27)

Stan roboczy. Dokument nie jest zgodą na deploy, push, TestFlight ani Play Store.
Wersje marketingowe pozostają `1.0.0`. Audyt nie przywraca RTK, hooków RTK ani
`SessionStart`.

## Stan wejściowy i metoda

- Przeczytano `AGENTS.md`, `START.md`, `DOCUMENTATION.md`, `DECYZJE.md`, `PLAN.md`
  oraz cały `RAPORT-BUG-HUNT-strength-save-2026-08-24.md` (54 potwierdzone
  problemy i 3 zgłoszenia odrzucone).
- HEAD na początku: `30c34780`; gałąź `main`. Zachowano wszystkie zastane zmiany.
  Trzy zmodyfikowane pliki natywne były wynikiem wcześniejszej rejestracji
  `@capacitor/network`; nie wykonano reset/checkout/stash ani usuwania.
- Bazowy `npm run test`: 3346/3347 testów przeszło, ale bramka była czerwona przez
  1 timeout i 42 nieobsłużone rejectiony. Root cause: mocki Dashboardu po X38 nie
  miały nowej metody `workoutSyncQueue.list()`. Po czerwonym teście uzupełniono
  wyłącznie kontrakt mocków; celowane 10 plików / 43 testy są zielone bez errors.
- Niezależny audyt raportu uruchomił 53 pliki / 714 testów frontendu i 5 plików /
  85 testów Functions — zielone. Nie zastępuje to końcowej pełnej bramki.

## Wynik raportu bug-hunt

Stan po realizacji E2: **54 naprawione, 0 częściowo naprawionych, 0 nadal
występujących**. Wszystkie 8 problemów oznaczonych w raporcie jako high ma
implementację naprawczą i test regresji. Nie oznacza to jeszcze gotowości do
wydania — pozostałe blockery są wyszczególnione na końcu dokumentu.

| # | Problem | Status | Dowód w kodzie | Istniejący test | Brakujący test | Ryzyko release | Proponowana poprawka |
|---:|---|---|---|---|---|---|---|
| 1 | Withdraw health zapętla ConsentGate | naprawiony | `legal-versions.ts`: `healthGranted=false` spełnia gate | `consent-gate.test.tsx` | pełny Settings→snapshot→router | niskie | test integracyjny wycofania |
| 2 | Frekwencja ignoruje przełożenia | naprawiony | `cycle-insights.ts`: schedule overrides w resolverze | `cycle-insights.test.ts` | RescheduleSheet→Cycles, także swap | niskie | test integracyjny swapu |
| 3 | AutoSync promuje sesję za ekranem, final no-op | naprawiony | `workout-sync-engine.ts` zwraca `missingDraft`; `WorkoutDay.tsx` rozwiązuje tombstone i ponawia | `workout-sync-engine.test.ts`, `workout-draft-db.test.ts` | WorkoutDay: promocja zewnętrzna→final→remote | średnie | test sekwencji final retry |
| 4 | Draft adhoc przysłania plan | naprawiony | `loadDraftForDay(dayId,date)` w DB/WorkoutDay/Dashboard | `workout-draft-db.test.ts`, `dashboard-active-session.test.tsx`; E2E plan→wyjście→adhoc→powrót→final→remote | cold-restart wariantu urządzeniowego | niskie po automatycznej regresji | smoke force-kill iOS/Android |
| 5 | Hydracja obcina typed-set fields | naprawiony | `firestore-doc-guards.ts` zachowuje pola typed set | `firestore-doc-guards.test.ts`, `workout-day-view.test.ts` | round-trip listener drugiego urządzenia | niskie | test store round-trip |
| 6 | Przecinek dystansu zapisuje 0 | naprawiony | `ExerciseCard.tsx`: `DecimalInput` | `exercise-card-decimal-input.test.tsx`, E2E | paste `20,5` iOS/Android | niskie | smoke device |
| 7 | Comp zasłania płatny store state | naprawiony | `revenuecat.ts` przechowuje `storeSubscription`; revoke odtwarza | `revenuecat.test.ts`, `garmin-entitlement.test.ts` | reconciliacja legacy | średnie | read-only audyt prod przed migracją |
| 8 | Podwójny sygnał przerwy | naprawiony | `RestBar.tsx` uzbraja; `rest-notification.ts` planuje tylko w tle | `rest-timer-controller.test.tsx`, `rest-notification.test.ts` | ekran on/off na iOS/Android | średnie | obowiązkowy smoke device |
| 9 | Email verification nie domyka stanu | naprawiony | `EmailVerificationGate.tsx`: awaiting refresh / already verified | `email-verification-gate.test.tsx` | brak snapshotu + reconnect | niskie | network smoke |
| 10 | Surowe błędy/cancel social login | naprawiony | `useAuth.ts`: `mapAuthErrorMessage` | `auth-errors.test.ts` | native Apple/Google cancel/collision | niskie | provider smoke |
| 11 | Reminder/digest w złej strefie | naprawiony | `functions/src/local-time.ts`, reminders/digest i sync timezone | testy `local-time`, `daily-reminder`, `weekly-digest`, `time-zone-sync` | scheduler staging skrajne TZ/DST | średnie | staging LA/NY/NZ |
| 12 | Numer tygodnia zaniżony przez DST | naprawiony | UTC-safe obliczenia w `plan-schedule.ts` | `plan-week-number.test.ts` | brak | niskie | bez zmiany |
| 13 | Fallback draftu gubi metryki/nazwy/writeId | naprawiony | `workout-draft-db.ts` zachowuje additive fields i pending write | `workout-draft-db.test.ts` | brak | niskie | bez zmiany |
| 14 | Import planCycles bez walidacji | naprawiony | sanitizer w `useFirebaseWorkouts.ts` | `workout-import-restore.test.ts` | export→import z rules emulator | niskie | test emulatora |
| 15 | getCycleById/backfill bez sanitizera | naprawiony | sanitizacja w `usePlanCycles.ts` i backfill | `plan-cycles-sanitize.test.ts` | route z uszkodzonym doc | niskie | route integration |
| 16 | Merge/delete cykli pomija >500 sesji | naprawiony | query po cycleId i pełny zakres | `plan-cycles-merge-window.test.ts` | emulator >500 + resume | średnie | test paginacji emulatora |
| 17 | Aktywny cykl z pustym endDate | naprawiony | `history-cycles.ts`: zakres otwarty | `history-cycles.test.ts` | UI imported session | niskie | test ekranu |
| 18 | Zmiana gryfa kasuje unit | naprawiony | `PlateCalculatorSheet.tsx` zachowuje unit | `plate-calculator-sheet.test.tsx` | remount storage | niskie | opcjonalny remount |
| 19 | Własny gryf zawsze kg | naprawiony | konwersja lbs→kg przed limitem | `plate-inventory-settings.test.tsx` | brak | niskie | bez zmiany |
| 20 | redirectDraftSave gubi pola | naprawiony | `workout-draft-db.ts` przenosi swap/warmup/activity | `workout-draft-db.test.ts` | kill podczas promocji | średnie | device kill smoke |
| 21 | Garmin comp ignoruje expiresAt | naprawiony | `garmin-entitlement.ts` waliduje datę i fallback store | `garmin-entitlement.test.ts` | capability snapshot po expiry | niskie | staging Garmin |
| 22 | BILLING_ISSUE kasuje grace | naprawiony | `revenuecat.ts` zachowuje max expiration/grace | `revenuecat.test.ts` | RC sandbox webhook | średnie | billing retry smoke |
| 23 | Webhook no-user zwraca 200 | naprawiony | aktywny entitlement bez usera zwraca 503 | `revenuecat.test.ts` | HTTP retry/dedupe integration | średnie | emulator HTTP |
| 24 | Cichy fail backupu JSON | naprawiony | `DataManagement.tsx`: wynik, telemetry, destructive toast | `data-management-export.test.tsx` | native share fail | niskie | smoke eksportu |
| 25 | Telemetria urywa handler serii | naprawiony | `app-telemetry.ts`: storage best-effort w try/catch | `app-telemetry.test.ts` | brak | niskie | bez zmiany |
| 26 | Fałszywy sukces CSV | naprawiony | wynik helpera propagowany, toasty bramkowane | testy CSV/toast/history | native share fail oba wejścia | niskie | smoke CSV |
| 27 | Resume walczy ze świadomym wyjściem | naprawiony | resume tylko gdy background rozpoczął się na workout route | `active-workout-resume.test.tsx`, `workout-resume.test.ts` | suspend po wyjściu | niskie | lifecycle smoke |
| 28 | Gong po późnym resume | naprawiony | 3 s grace w `RestBar.tsx` | `rest-bar.test.tsx` | warm resume po kilku minutach | średnie | background smoke |
| 29 | Swipe-back nad modalem | naprawiony | overlay guard w `IosSwipeBack.tsx` | `ios-swipe-back.test.tsx` | realne Radix Sheet/Dialog | niskie | iOS swipe smoke |
| 30 | Race generacji share image | naprawiony | generation ref odrzuca stary run | `share-dialog.test.tsx` | real html2canvas rapid taps | niskie | weak-device smoke |
| 31 | Celebration timer reset | naprawiony | callback refs w completion/confetti | `workout-completion-sequence-timer.test.tsx` | real onSnapshot rerender | niskie | opcjonalny integration |
| 32 | ConsentGate bez logout | naprawiony | logout przekazany i widoczny | `consent-gate.test.tsx` | router + real logout | niskie | router integration |
| 33 | Invite kasowany przed redeem | naprawiony | kod czyszczony dopiero po success/permanent error | `user-provider-bootstrap.test.tsx` | social login offline→reconnect | niskie | reconnect integration |
| 34 | Consent callable bez timeoutu/ochrony | naprawiony | `callProtectedFunction`, timeout 10 s | `consents-api.test.ts`, `protected-callable.test.ts` | captive portal/App Attest | niskie | device network smoke |
| 35 | Web App Check cold-start race | naprawiony | backend zwraca `details.reason`; `protected-callable` klasyfikuje fail-closed; `UserContext` zachowuje cache aktywnego usera lub pokazuje recoverable `AccessRestrictedView` | `protected-callable.test.ts`, `user-provider-bootstrap.test.tsx`, `access-restricted-view.test.tsx`, emulator Functions | real reCAPTCHA/App Attest blocked→retry | niskie po fixie | smoke providerów na urządzeniu; rollout klient+Functions jako jedna zależność |
| 36 | Legacy duration omija clamp | naprawiony | `computeLegacyTimestampDurationSec` odrzuca lukę >12 h; `WorkoutDay` nie mutuje rekordu | `workout-duration.test.ts` | real legacy tile z Firestore | niskie | read-only smoke legacy historii |
| 37 | Retry bez backoffu | naprawiony | retry metadata/backoff/jitter i triggery X38 | `workout-sync-entries.test.ts`, `auto-sync-provisional.test.ts` | flapping network po restarcie | niskie | device soak |
| 38 | Tombstone race wskrzesza orphan | naprawiony | ponowny odczyt tombstone w queued closure | `workout-draft-db.test.ts` | real IDB scheduler resume | niskie | suspend race smoke |
| 39 | currentWeek nie zmienia się po północy | naprawiony | `useToday` + lifecycle/focus/timer | `use-training-plan-week.test.tsx` | niedziela→poniedziałek suspend | niskie | device clock smoke |
| 40 | Measurement listener error niewidoczny | naprawiony | osobny `measurementError` i `retryMeasurements`; `MeasurementReadError` w Measurements i Analytics | `workout-read-store.test.ts`, `measurements-photo-only.test.tsx` | real permission/offline listener | niskie | device network/permission smoke |
| 41 | Invalid page zatrzymuje pagination | naprawiony | cursor z surowego ogona strony | `workout-history-pagination.test.ts` | real orderBy/startAfter emulator | niskie | emulator integration |
| 42 | Health weight zawsze kg | naprawiony | `HealthWeightSuggestion`: `toDisplay` + unit | `health-weight-suggestion.test.tsx` | native sample lbs | niskie | health smoke |
| 43 | Backfill nadpisuje równoległą edycję | naprawiony | transakcja z revision precondition | `workout-import-restore.test.ts` | concurrent emulator writer | niskie | concurrency integration |
| 44 | Import planu nie alignuje IDs | naprawiony | sanitizer + resolve days względem cykli | `workout-import-restore.test.ts` | legacy backup round-trip | niskie | rules/emulator integration |
| 45 | CSV cycle pusty endDate | naprawiony | `endDate || today` | `workout-export-range.test.ts` | UI/future imported workout | niskie | dialog test |
| 46 | Legacy access restore → pending | naprawiony | Functions security/registration legacy handling | `functions-security.test.ts` | callable + rules legacy doc | niskie | emulator integration |
| 47 | Zakup bez entitlementu = cisza | naprawiony | refresh + informacyjny toast w Paywall | `paywall-purchase-feedback.test.tsx` | RC sandbox misconfig | niskie | purchase smoke |
| 48 | Consent CSV obcięty 10k | naprawiony | pełna paginacja `startAfter` | `consents-csv.test.ts` | emulator >page size | niskie | admin integration |
| 49 | Trainer email case-sensitive | naprawiony | trim/lowercase compare/save | `email-workout-dialog.test.tsx` | brak | niskie | bez zmiany |
| 50 | SyncCenter ignoruje wynik eksportu | naprawiony | wynik, telemetry i toast w `SyncCenterCard` | `sync-center-export-draft.test.tsx` | native iOS share fail | niskie | export smoke |
| 51 | Throwing parseLocalDate | naprawiony | bezpieczne guardy i importer odrzuca złą datę | `weekly-local.test.ts`, `workout-import-parser.test.ts` | invalid Strava w UI | niskie | UI test aktywności |
| 52 | Rest state z innej sesji | naprawiony | stabilny scope `dayId:date`, mismatch cleanup | `rest-timer-controller.test.tsx` | plan A→Dashboard→adhoc B device | niskie | sequence smoke |
| 53 | Tap notification nie wraca do treningu | naprawiony | action listener + continuable target | `rest-notification.test.ts`, `active-workout-resume-notification-tap.test.tsx` | cold start z tapu iOS/Android | średnie | obowiązkowy device test |
| 54 | Cichy błąd custom exercise | naprawiony | `ExercisePicker` trzyma jedną pending Promise, po 8 s pokazuje status i sprawdza ten sam zapis; cancel wychodzi bez duplikatu | `exercise-picker.test.tsx` (pending, późny success, reject i stary flow) | real Firestore offline→online | niskie | device airplane-mode smoke |

Trzy zgłoszenia odrzucone w raporcie pozostają odrzucone: Apple button ma
`disabled`, gradient nawigacji nie przecina interaktywnej zawartości, a Analytics
Weekly nie tworzy efektywnie listenera ograniczonego do `recent`.

## Mapa obejść: eksport, storage i synchronizacja

### Eksport przed migracją

- Centralny `share-export.ts`: na webie `File` + Web Share API albo object URL i
  `<a download>`; na native również używał Web Share API. Gdy
  `navigator.canShare({files})` zwracał false, schodził do martwego downloadu w
  WKWebView.
- JSON: `DataManagement`; draft JSON: `SyncCenterCard`; CSV:
  `workout-csv-download`; PNG: workout/cycle/body compare.
- PDF miał dwie osobne implementacje Web Share/download w `Analytics.tsx` i
  `HistoryExportSheet.tsx`.
- Admin consent CSV nadal jest web/admin-only wyjątkiem z bezpośrednim downloadem;
  przed użyciem admina native wymaga przepięcia do helpera.

### Eksport po etapie E1

- Native: `@capacitor/filesystem` zapisuje odtwarzalny plik base64 wyłącznie w
  `Directory.Cache/strength-save-exports`, a `@capacitor/share` udostępnia URI
  `file://`. Stare pliki tego dedykowanego katalogu są sprzątane best-effort przy
  następnym eksporcie; źródłowe dane nie są modyfikowane.
- Web zachowuje dotychczasowy Web Share/download. Oficjalny Share Web ignoruje
  `files`, dlatego nie zastępuje tej gałęzi.
- JSON/CSV/PDF/PNG korzystają z jednego helpera; cancel nie daje sukcesu, błąd ma
  telemetry i widoczną ścieżkę wyjścia. Dodano FileTimestamp `C617.1` do iOS
  Privacy Manifest.

### Storage i synchronizacja

- Firestore web cache: IndexedDB (`persistentLocalCache`).
- Krytyczny draft: `strength-save-db/workoutDrafts` w IndexedDB oraz scoped
  localStorage fallback. Fallback zachowuje pełną tożsamość sesji, snapshot dnia,
  flagi finalizacji i `updatedEventId`; po odzyskaniu IDB nowsza intencja finalna
  nie jest cofana. Odczyty po resume wykonują jedną ponowną próbę na świeżym
  połączeniu, a druga porażka schodzi do fallbacku bez pętli.
- Sync queue: referencyjne wpisy w localStorage; treść pozostaje w drafcie. Utrata
  queue nie kasuje treningu, lecz może skasować retry/permanent-error metadata.
- Promotion tombstones mają pomocniczy cache w pamięci/localStorage, ale kanoniczny
  alias `provisional → remote` jest zapisany w tej samej transakcji IDB co promocja.
  Późny zapis i `missingDraft` recovery nie zależą już od trwałości localStorage.
- `AutoSyncOnReconnect`: startup, online, app-active, Capacitor Network, jawne
  żądanie WorkoutDay i timer 45 s foreground; timeout, blokada równoległości,
  backoff+jitter.
- Lekkie ustawienia są rozproszone w localStorage, część mirroruje
  `PreferenceSync` do Firestore.

## Audyt pięciu integracji Capacitor

| Plugin | Wersja zgodna z core 8.4 | Web | iOS / Android | Ryzyko danych | Decyzja i kolejność |
|---|---:|---|---|---|---|
| `@capacitor/share` | 8.0.1 | Web implementation nie przenosi `files`; zachować obecny fallback | natywny share `file://` | niskie dla źródła, średnie privacy temp | wdrożyć E1 razem z Filesystem |
| `@capacitor/filesystem` | 8.1.3 | web to IDB, nie Downloads — nie używać do web export | Cache bez storage permissions; Android FileProvider | niskie dla źródła, średnie memory/privacy | wdrożyć E1, tylko Cache; test dużych plików |
| `@capacitor/preferences` | 8.0.1 | prefixowany localStorage, nie widzi obecnych kluczy bez migracji | UserDefaults/SharedPreferences, string-only | średnie przy migracji | E4 canary tylko lekkie prefs, dual-read/write; nigdy draft/queue |
| `@capacitor/background-runner` | 3.0.0 | niedostępny | osobny JS bez DOM/IDB/LS; iOS harmonogram niegwarantowany | wysokie | **nie wdrażać** bez dowodu; najpierw instrumentacja resume |
| `@capacitor/screen-orientation` | 8.0.1 | lock bywa unavailable | runtime lock ma otwarte ryzyko safe-area i ograniczenia tabletów | niskie dane, średnie UX | nie wdrażać przed polityką orientacji i QA landscape |

Źródła oficjalne: [Share](https://capacitorjs.com/docs/apis/share),
[Filesystem](https://capacitorjs.com/docs/apis/filesystem),
[Preferences](https://capacitorjs.com/docs/apis/preferences),
[Background Runner](https://capacitorjs.com/docs/apis/background-runner),
[Screen Orientation](https://capacitorjs.com/docs/apis/screen-orientation).

### Kolejne fale pluginów 6–13

Pełny research, zachowanie platform, testy i scenariusze urządzeniowe:
`docs/RESEARCH-UX-TYPOGRAPHY-CAPACITOR-2026-08-27.md`.

- **Wdrożone w ograniczonym zakresie:** `@capacitor/camera` 8.2.3 jako natywne źródło
  pojedynczego screenshotu zgłoszenia błędu, z `appRestoredResult`, prywatnym recovery
  IDB i ponownym kodowaniem JPEG. Migracja zdjęć sylwetki z zachowaniem
  `PhotoCropDialog` pozostaje osobną falą; nie oddawać przycinania pluginowi bez
  parytetu UX.
- **Przed skalowaniem 1.0:** `@capacitor-firebase/crashlytics`, ale tylko razem z
  consentem, aktualizacją privacy disclosures, uploadem symboli i testem
  kontrolowanego crashu. Uzupełnia `client_errors`, nie zastępuje go.
- **Fala eksperymentalna:** Motion wyłącznie foreground PoC „telefon leży na
  ławce”; liczenie powtórzeń odrzucone jako niewiarygodne bez walidacji sprzętowej.
  TTS wyłącznie opt-in; nie gwarantuje cue po suspendzie JS, więc timer nadal
  opiera się na local notifications. BLE HR jako osobny produktowy PoC z privacy.
- **Odłożone/odrzucone przed launch:** Text Zoom nie może wymuszać 100% kosztem
  dostępności; Remote Config nie jest potrzebny bez pilnej flagi runtime;
  własny most HealthKit/Health Connect pozostaje; Background Runner nadal wymaga
  telemetrycznego dowodu, że foreground resume nie wystarcza.

## Plan etapowy, zależności i kryteria akceptacji

### E0 — wiarygodna baza i audyt (przed każdym fixem)

Zależności: brak. Kryteria: pełna macierz 54/54; zachowany dirty worktree;
wersje 1.0.0; brak RTK/SessionStart; czerwony test bazowej regresji i zielony test
celowany. Status: **ukończony**, pełna bramka zostaje do ponowienia po zmianach.

### E1 — bezpieczny eksport natywny (Share + Filesystem)

Zależności: E0. Kryteria automatyczne: jeden helper dla JSON/CSV/PDF/PNG; web bez
zmiany; native nigdy nie wywołuje anchor download; poprawne mapowanie
shared/aborted/failed; telemetry nie blokuje flow; cleanup dotyczy tylko własnego
katalogu Cache; Privacy Manifest lint; typecheck i testy eksportu zielone; `cap
sync` obie platformy. Kryteria urządzeniowe: iPhone i Android otwierają poprawny
JSON/CSV/PDF/PNG w Files/Drive/Mail; cancel milczy; powtórny share działa; chooser
resume nie gubi trasy/draftu. Status: **implementacja i bramki automatyczne
ukończone**; pozostaje smoke na fizycznym iOS/Android.

### E2 — trzy częściowe problemy i legacy clamp

Zależności: E1 stabilne. Kolejność: #40 (error + retry), #54 (offline pending bez
duplikatu), #35 (App Check recoverable UX), #36 (test legacy clamp i minimalny
helper). Każdy osobno: czerwony test → fix → zielony → stary flow → regresja.
Kryteria: każdy stan błędu ma akcję; brak mutacji historycznych danych; App Check
nie jest obchodzony; retry custom exercise jest idempotentny. Status:
**ukończony automatycznie** — #35/#36/#40/#54 mają testy czerwony→zielony i
regresje starego przepływu; App Check przeszedł również emulator Functions.

### E3 — trwałość queue/markerów i sekwencja treningowa

Zależności: E2. Kryteria: plan bazowy tylko rozszerzany przez draft; draft i sync
survive IDB reconnect, background, cold restart; queue/marker hardening nie usuwa
danych; automatyczny test całej sekwencji plan→wyjście→adhoc→powrót→zakończenie
→potwierdzony sync; wariant offline/resume oraz force-kill. Status: test sekwencji
do remote confirmation jest zielony w Chromium i WebKit. Wykrył i naprawił
dodatkowy blocker poza raportem: ACK checkpointu pozostawiał `pendingWriteId`, więc
final tej samej wersji był no-opem `already-applied` i chmura zachowywała
`completed:false`. `markDraftSynced` czyści teraz wyłącznie identyfikator
potwierdzonej próby; 178 testów draft/sync i oba E2E są zielone. Nadal pozostają
warianty device offline/force-kill. Trwały alias promocji jest zapisany atomowo
w IDB i ma regresje utraty localStorage, late-save oraz fresh-connection retry.

### E4 — Preferences canary (opcjonalny przed launch, bez danych krytycznych)

Zależności: E3 i backup QA. Kryteria: tylko język/unit/accent/timery i inne małe
prefs; native-value-wins, legacy fallback, dual-write przez co najmniej jeden
release; żadnego `Preferences.clear`; web legacy keys bez zmiany; upgrade bez
uninstall zachowuje prefs, draft i queue byte-for-byte. Jeżeli nie daje mierzalnej
korzyści przed launch, odłożyć bez ryzyka release.

### E5 — product audit i końcowe bramki

Zależności: E1–E3. Kryteria automatyczne: aktualny audyt 390×844 dla active/new/
admin i landscape; `npm run test`, typecheck, lint, build; Functions i rules; E2E
Chromium i WebKit po świeżym Vite/cache; świeży build iOS/Android. Kryteria manualne:
smoke obu platform, background/resume, przerwanie treningu, eksport wszystkich
formatów, restart/recovery, notification tap cold start. Dopiero finalny raport
może rekomendować wydanie; nadal bez automatycznego deploy/push/publikacji.

Status automatyczny po ostatniej zmianie: **ukończony**. Root Vitest 394 pliki /
3454 testy, typecheck, lint (0 błędów, 15 zastanych warningów), build, bundle,
dist smoke i pełny kontrakt offline są zielone. Functions: 453/453 (+12 świadomie
pominiętych), integracja emulatora Functions 12/12; Firestore Rules 275/275 i
Storage Rules 11/11. Po restarcie Vite i świeżym cache E2E Chromium+WebKit:
536/536. Świeży bundle mobile skopiowano do obu platform; Android debug zbudowano,
zainstalowano i uruchomiono na API 35, a iOS Debug zbudowano, zainstalowano i
uruchomiono na symulatorze iPhone 17 Pro. Te wyniki nie zastępują fizycznych
scenariuszy suspendu, powiadomień, Health ani systemowego share sheetu.

### E6 — Background Runner wyłącznie warunkowo

Zależności: telemetry resume i okres obserwacji. Próg: aktualny build ma sieć i
co najmniej dwa `app-active`, a final nadal pending >15 min bez permanent error.
Brak takich dowodów oznacza pozostawienie foreground resume. Runner wymagałby
nowego idempotentnego protokołu serwerowego; nie może czytać obecnego IDB/LS.

## Testy automatyczne wymagane do finalnej bramki

- Pełny Vitest, typecheck, lint, build.
- Functions: wszystkie testy, w tym reminder/digest/RevenueCat/security.
- Firestore/Storage rules na emulatorze, import/export i legacy access.
- Sekwencja plan→wyjście→adhoc→powrót→finish→remote confirmation.
- Draft: IDB fail/reconnect, fallback freshness, restart, tombstone race.
- Sync: resume/network/timer/cold restart/flapping, timeout, concurrency,
  idempotencja i permanent error exit.
- Eksport: byte-for-byte UTF-8 JSON/CSV, `%PDF-`, PNG magic, duży backup, cancel,
  write/share fail, cleanup scope, guard przeciw native anchor fallback.
- Regresje #35/#40/#54 i legacy #36 oraz ACK checkpoint→final tej samej wersji.
- E2E Chromium i WebKit w portrait i landscape; przed diagnozą masowych faili:
  restart Vite i usunięcie wyłącznie `node_modules/.vite`.

## Scenariusze realnego urządzenia

1. Plan→wyjście→szybki trening→powrót (pełna lista)→finish→sync.
2. Offline trening, ekran zgaszony, JS wstrzymany, sieć wraca, unlock→auto-sync.
3. Force-kill z aktywnym draftem i pending final, restart w airplane mode.
4. Timer/rest: foreground/background, silent switch, notification tap i cold start.
5. JSON/CSV/PDF/PNG: share/save/open/validate, cancel, ponowienie, brak success po
   błędzie; Android receiver czyta URI.
6. Obrót 844×390 na WorkoutDay/Dashboard/dialogach/share; safe-area, keyboard,
   scroll i RestBar; iPad multitasking i Android 16 tablet/foldable.
7. Social auth cancel/collision, email verification reconnect, App Check blocked.
8. RevenueCat sandbox billing issue/retry i Garmin expiry.
9. Zgłoszenie błędu na iOS/Android: klawiatura nie zasłania X/CTA, Photo Picker cancel,
   wybór zdjęcia, Android process death/restart, offline retry, odbiór e-maila i triage
   w panelu; zweryfikować brak EXIF/GPS w pobranym pliku.

## Jednoznaczne blockery publicznego wydania

1. Brak fizycznego smoke iOS/Android: eksport JSON/CSV/PDF/PNG, share cancel/retry,
   screen-off→network-return→resume, notification tap, przerwanie treningu i
   odzyskanie danych po force-kill/restarcie. Emulator potwierdza cold launch, nie
   potwierdza prawdziwego suspendu WKWebView ani systemowych odbiorców share.
2. Lokalny kod wyprzedza produkcję: brakuje Functions zgłoszeń, cleanupu/rekonsyliacji
   SES oraz nowych Firestore/Storage rules. Wymagany jest kontrolowany deploy z
   weryfikacją braku runtime `RESEND_API_KEY`, następnie syntetyczny smoke
   `accepted → SEND/DELIVERY event → admin triage` bez danych realnego użytkownika.
3. Subskrypcja e-mail alarmów reputacji SNS dla `contact@strengthsave.app` ma status
   `PendingConfirmation`; same alarmy bounce 5% i complaint 0,1% są utworzone.
4. Ujawniony wcześniej sekret Stravy musi zostać zrotowany u dostawcy, a po deployu
   należy potwierdzić, że Strava/OpenAI nie występują jako zwykłe environment variables.
5. Typografia i układ mają zielony audyt automatyczny, ale wymagają device QA przy
   systemowym rozmiarze tekstu 100/150/200%, klawiaturze, landscape i safe-area.
6. Następny TestFlight wymaga podniesienia wyłącznie sześciu wystąpień
   `CURRENT_PROJECT_VERSION` z 128 do 129 i ponownego podpisanego preflightu. Build 128
   jest VALID/APPROVED, ale nie zawiera bieżących zmian. HealthKit/Health Connect,
   Camera process recovery, Google/Apple auth return i billing sandbox nadal wymagają
   realnego urządzenia.

Naprawy #35/#36/#40/#54, trwały alias promocji oraz pełny test remote confirmation
nie są już blockerami. Formularz/panel zgłoszeń ma 30/30 testów, Functions kontrakt
16/16, emulator 10/10, Firestore 275/275 i Storage 11/11. Product audit 15/15 i
pełne E2E 536/536 są wykonane. Audyt zależności root/Functions ma 0 findings;
`audit fix --force` pozostaje zakazany. Androidowy kontrast pasków systemowych po
API 35 został naprawiony przez wbudowane Capacitor 8 `SystemBars` i potwierdzony
testem kontraktu oraz screenshotem po świeżej reinstalacji APK.

Publiczna polityka prywatności 2.1 jest już wdrożona na `strengthsave.app` i opisuje
avatar, screenshoty, administratora, Amazon SES, OPEN/CLICK, IP/user-agent/link oraz
retencję 180 dni/24 miesiące. SES ma production access, DKIM `SUCCESS`, SPF/DMARC,
TLS `REQUIRE`, domyślny i jawny configuration set, quota 50 000/dzień i 14/s oraz
least-privilege IAM. DMARC `p=none` i brak custom MAIL FROM są kontrolowanym
hardeningiem po okresie obserwacji, nie ukrytym brakiem konfiguracji.

# Strength Save — audit release-readiness (2026-06-24)

## Executive summary

**Release nie jest możliwy.** Wykryto **1 P0, 14 P1, 8 P2 i 2 P3**. Nawet po
usunięciu błędów aplikacyjnych release nadal blokują obowiązkowe bramki lokalne:
testy Firestore Rules i emulatorowe E2E nie wystartowały (JDK 20, wymagany JDK
21+), a WebKit nie wystartował (brak binarium Playwright). Definicja
release-ready z `docs/PLAN_NAPRAWY_2026-06-24.md` wymaga tych bramek.

Najpoważniejszy problem jest w zapisie treningu: transakcja inkrementuje
`revision`, ale warunek konfliktu porównuje `updatedAt` generowane przez zegar
klienta, a nie oczekiwaną rewizję. Rozjechany zegar dwóch urządzeń pozwala na
ciche nadpisanie udanej interakcji. Dodatkowo ACK starszego zapisu może oznaczyć
nowszy draft jako `dirty: false`.

### Co zostało wykonane

Stan początkowy: `main`, bez zmian w `git status --short` i bez diffu. Wszystkie
polecenia shellowe uruchomiono przez `rtk`. Bez requestów do produkcji, deployów,
zmian sekretów, commitów lub poprawek kodu.

| Bramka | Wynik | Dowód / blocker |
|---|---|---|
| `rtk npm run typecheck` | PASS | TypeScript bez błędów. |
| `rtk npm run lint` | PASS | ESLint bez błędów. |
| `rtk npm test` | PASS z ostrzeżeniami | 42 pliki, 381 testów; warningi React Router i Node `punycode`. |
| `rtk npm --prefix functions test` | PASS | 8 plików, 66 testów. |
| `rtk npm run test:rules` | BLOCKED | Firebase CLI wymaga Java 21+, lokalnie jest Temurin 20.0.1. |
| `rtk npm run e2e` | PASS | Chromium mock E2E przeszedł; to nie jest test backendu. |
| `rtk npm run e2e:emulator` | BLOCKED | Ten sam JDK 20; emulator Auth/Firestore nie wystartował. |
| `rtk npm run e2e:webkit` | FAIL / nieuruchomione | Brak `webkit-2272/pw_run.sh`; Playwright wskazuje `npx playwright install`. |
| `rtk npm run build` | PASS z warningiem | Build przechodzi; dwa chunki po minifikacji mają 559.71 kB i 729.61 kB (warning limitu 500 kB). |
| `rtk npm --prefix functions run build` | PASS | `tsc` Functions bez błędów. |
| `rtk npm run ios:simulator:smoke` | PASS | Build, instalacja i launch w lokalnym iPhone Simulator przeszły. To nie jest test Watch ani zakupu sandbox. |

Odblokowanie brakujących lokalnych bramek, bez instalowania czegokolwiek w
ramach tego audytu:

```bash
# Precondition: JAVA_HOME/PATH wskazuje JDK >= 21, potem:
rtk npm run test:rules
rtk npm run e2e:emulator

# Precondition: zainstalowany lokalnie browser Playwright WebKit, potem:
rtk npm run e2e:webkit
```

Uruchomione E2E WebKit zmieniło śledzony artefakt
`test-results/.last-run.json`; nie został cofnięty, zgodnie z zakazem resetu,
checkoutu i nadpisywania istniejących zmian. Ten raport jest jedyną celową
zmianą audytu.

## Problemy wymagające naprawy

| ID | Sev. | Etap | Komponenty / pliki | Dowód i reprodukcja | Wpływ | Minimalna naprawa | Test regresyjny | Ryzyko migracji / blocker / decyzja |
|---|---|---|---|---|---|---|---|---|
| RR-001 | P0 | M2 | `src/lib/workout-final-sync.ts:29-36`, `src/hooks/useFirebaseWorkouts.ts:607-654` | `hasWorkoutWriteConflict` używa `current.updatedAt > expectedUpdatedAt`; `batchSaveWorkout` zapisuje `Date.now()` klienta. Reprodukcja: A i B czytają `updatedAt=10000`; B ma zegar `5000` i zapisuje (warunek `10000 > 10000` jest false); A nadal ma `expected=10000` i zapisuje, bo `5000 > 10000` jest false. Obie edycje odnoszą sukces, B zostaje nadpisane. `revision` jest tylko inkrementowane, nigdy nie jest precondition. | Cicha utrata serii/notatek/ukończenia z drugiego urządzenia. | `expectedRevision` wymagane w każdym mutującym zapisie; transakcja wymaga ścisłej równości i zapisuje `revision + 1`. Czas tylko jako metadane serwera. | Dwa urządzenia, zegary +/- 24 h; równoczesne edycje różnych ćwiczeń; druga transakcja musi dostać `WORKOUT_CONFLICT`. | Stare dokumenty bez `revision`: jawna kompatybilność (np. pierwsza transakcja inicjuje 0) i telemetry migracji. |
| RR-002 | P1 | M2 | `src/lib/workout-draft-db.ts:418-430`, `src/pages/WorkoutDay.tsx:589-610` | `markDraftSynced` ładuje aktualny rekord i bez warunku wersji ustawia `dirty:false`. Reprodukcja: wysłać snapshot v1, przed ACK zapisać lokalnie v2, następnie obsłużyć ACK v1; helper oznaczy v2 jako czysty. Periodic checkpoint (`WorkoutDay.tsx:887-902`) zostanie zatrzymany. | Nowsza lokalna edycja może nigdy nie trafić do chmury. | Przekazywać `expectedDraftVersion`/content hash z wysłanego snapshotu; ACK zmienia `dirty` tylko przy zgodności. | Opóźniony ACK v1 + lokalna edycja v2; po ACK v2 nadal jest `dirty` i zostaje wysłane. | Additive pole wersji; normalizacja starych draftów już ma `version`, ale wymaga testu upgrade. |
| RR-003 | P1 | M2 | `src/lib/workout-draft-db.ts:296-354,401-415`, `src/pages/WorkoutDay.tsx:376-412` | Każde `saveActiveDraft` otwiera niezależną transakcję; brak kolejki per `(userId, sessionId)` i odrzucenia starego wyniku. `saveDraftSnapshot` celowo nie czeka na wywołujących. Dwa zapisy v1/v2 mogą zakończyć się w odwrotnej kolejności i v1 pozostanie w IndexedDB. Test fake IndexedDB używa `setTimeout(..., 0)` (`src/test/workout-draft-db.test.ts:22-57`) i nie symuluje odwrotnego completion. | Po reloadzie użytkownik odzyskuje starsze serie/notatki. | Jedna serializowana kolejka zapisów per klucz, monotoniczna wersja i ignorowanie ukończonych wyników starszych niż zapisany snapshot. | Kontrolowany IndexedDB: v1 blokuje completion, v2 kończy się pierwsze; odczyt musi zwrócić v2. Test quota/fallback osobno. | Bez zmiany schematu; rollout musi zachować istniejące rekordy v1/v2. |
| RR-004 | P1 | M2 | `src/pages/WorkoutDay.tsx:460-500`, `src/lib/workout-draft-db.ts:401-456` | Produkcyjna promocja zapisuje `promotedDraft` przez `saveActiveDraft` (linia 491), które nie usuwa starego klucza provisional. Helper `markPromotedToRemote`, który usuwa stary klucz (`runWrite(..., oldSessionId)`), istnieje, ale nie jest użyty w tej ścieżce. Po finalnym syncu kasowany jest tylko remote ID (`WorkoutDay.tsx:569-578`), więc provisional może odżyć po reloadzie. | Stary trening może pojawić się ponownie jako lokalny draft lub zostać ponownie promowany. | Jeden atomowy helper promotion: zapisz remote snapshot, usuń provisional key, zachowaj cloud revision/metadane; użyć w WorkoutDay, AutoSync i Sync Center. | Offline → promotion → final sync → reload: brak local ID i brak aktywnego draftu. Awaria między krokami ma wznowić operation. | Wymaga cleanupu osieroconych local IDs przy odczycie; nie usuwać automatycznie bez rozpoznania user/session. |
| RR-005 | P1 | M5 | `ios/App/App/WatchBridge/PhoneWatchSessionManager.swift:48-64`, `WatchBridgePlugin.swift:10-59`, `src/hooks/useWatchWorkoutSync.ts:76-120`, `ios/App/WatchApp/WorkoutModels.swift:65-96` | Protokół nie ma `eventId` ani `ack`. `drainEvents()` usuwa całą kolejkę przed `onSetLogged`, który dopiero asynchronicznie mutuje React/draft. Crash/reload między liniami 102 i 103 gubi event. Kolejka cicho usuwa najstarsze eventy po 500 (`PhoneWatchSessionManager.swift:50-54`). Deduplikacja opiera się na `at`, nie stabilnym ID. | Utrata lub duplikacja serii i zakończenia z Watch; nieodwracalna rozbieżność telefonu i zegarka. | Event envelope `{id,payload}`; `peek` + trwały zapis do draftu + `ack(ids)` dopiero po commit; idempotentne ID po stronie telefonu; brak cichego trimowania (backpressure/stan błędu). | Dostarcz ten sam event live+transfer, fail przed/po draft commit, relaunch telefonu i Watch; dokładnie jedna seria po ACK. Test >500 zachowuje niepotwierdzone eventy. | Format kolejki UserDefaults wymaga kompatybilnego dekodera dla starych stringów. Ręczny test na urządzeniu WatchOS obowiązkowy. |
| RR-006 | P1 | M1 | `functions/src/registration.ts:1088-1134,1138-1190` | `purgeUserData` ignoruje błędy usunięcia direct-doc (`.catch(() => {})`, 1109-1112) i Storage (1114-1119), a następnie usuwa Auth (1121-1132). Jeśli końcowe `users/{uid}.delete()` padnie po Auth delete, klient nie ma już tożsamości do ponowienia callable. Nie istnieje worker/operation ID zdolny do dokończenia purge bez Auth. | Trwałe resztki danych osobowych, niedokończone usunięcie konta i brak bezpiecznego retry. | `deletionPending` jako trwała, idempotentna operacja w zaufanej kolejce; każde podzadanie zapisuje postęp; Auth usuwać dopiero po potwierdzeniu wszystkich danych albo mieć worker dokańczający po Auth. Nie połykać błędów. | Symulacja błędu każdego kroku (w tym Storage i finalnego user doc) + retry; końcowy stan: Auth i wszystkie kolekcje/avatary usunięte dokładnie raz. | Potrzebna polityka retencji sanitized audit log oraz inwentaryzacja starszych kolekcji. |
| RR-007 | P1 | M1 | `functions/src/registration.ts:633-652`, `src/lib/push-notifications.ts:31-41`, `src/hooks/useAuth.ts:155-162`, `src/App.tsx:119` | Token jest bezgraniczną tablicą `users/{uid}.fcmTokens`. `unregisterPushForUser` połyka failure; potem B może zarejestrować ten sam token. `adminSendPush` deduplikuje token globalnie i wyśle go, gdy doc A nadal go zawiera (`registration.ts:1013-1067`). Bezpośredni logout w gate `App.tsx:119` omija unregister. | Powiadomienie dla A może zostać wyświetlone urządzeniu zalogowanemu jako B; rosną koszty i dokumenty. | Kolekcja rejestracji tokenów z ownerem, urządzeniem i `lastSeen`; reassign atomowo, revoke przed switch/logout, retry worker. Zablokować direct `signOut` bez wspólnej ścieżki. | Logout A/login B przy wymuszonym błędzie unregister; wysyłka do A nie może trafić B. Test limitu/cleanup nieaktywnych tokenów. | Migracja tablic tokenów do dokumentów; wymaga decyzji o okresie retencji i device identity. |
| RR-008 | P1 | M3 | `src/lib/cycle-actions.ts:44-86,89-110`, `src/hooks/usePlanCycles.ts:142-166` | Onboarding i start cyklu to kilka niezależnych writeów: save plan → `addDoc` active cycle → oznacz onboarding/archive. `addDoc` tworzy nowy losowy ID na retry. Błąd po create cycle i przed `markOnboardingComplete` zwraca failure, a retry tworzy drugi active cycle. | Duplikaty active cycles i niespójny onboarding/plan. | Deterministyczny cycle ID lub operation ID; stan workflow i retry kroków; transakcja/batch gdzie mieści się w limicie. | Fail po każdym kroku, retry; dokładnie jeden active cycle i spójny profil/plan. | Należy zdefiniować reconciliation dla istniejących wielu `status:active`. |
| RR-009 | P1 | M3 | `src/hooks/useTrainingPlan.ts:122-160` | `savePlan` wykonuje `setDoc(..., {merge:true})` bez revision/read precondition. Dwa urządzenia mogą zapisać różne `days` na tym samym snapshotcie; ostatni zapis wygrywa bez konfliktu. Aktualizacja aktywnych cykli jest kolejną nieatomową fazą (`143-152`). | Cicha utrata zmian planu i drift plan/cycle. | Pole `revision`, transakcja expectedRevision oraz jawny konflikt UI; plan + snapshot aktywnego cyklu jako jedna logiczna operation. | Równoległe edycje dnia/ćwiczenia na dwóch klientach: druga dostaje konflikt, nie overwrite. | Stare plany wymagają default revision i obsługi importu. |
| RR-010 | P1 | M3 | `src/hooks/usePlanCycles.ts:189-252` | `mergeContinuousCycles` remapuje workouts pojedynczo, potem aktualizuje primary i usuwa cycles; `deleteCycle` też odtagowuje pojedynczo. Przy błędzie po N zapisach stan jest częściowy; >500 dokumentów nie ma podziału na wznawialne batch operations ani operation state. | Historia może być częściowo przypisana do skasowanego/nieprawidłowego cyklu. | Batch ≤450 z checkpointem operation, lub backendowy job z idempotentnym cursor. Usuń cycle dopiero po potwierdzeniu wszystkich remapów. | 501 workoutów; błąd po pierwszym batchu; retry kończy bez osieroconych `cycleId`. | Migracja historycznych cycleId wymaga backupu i miernika postępu. |
| RR-011 | P1 | M5 | `src/lib/ai-coach.ts:164-200`, `functions/src/index.ts:745-921` | Klient ma zahardkodowany produkcyjny `STREAM_URL` (`fittracker-workouts`), mimo emulator override dla Firebase SDK. `streamOpenAI` nie tworzy `AbortController`, nie przekazuje `signal` do `fetch` i nie wiąże `req`/`res.close` z upstream. Anulowanie klienta kończy połączenie klienta, ale backend nadal może pobierać tokeny. | Staging/emulator może używać produkcji; koszty i dane AI mogą trwać po rozłączeniu użytkownika. | URL z konfiguracji Functions/projektu z jawnym emulator/staging override; controller per request, abort upstream na `req.aborted`/`res.close`; pojedyncza, idempotentna finalizacja usage. | Test URL dla emulatora/staging; test disconnect sprawdza `signal.aborted` i jedno rozliczenie reservation/usage. | Wymaga określenia dopuszczonych originów i nazw środowisk. |
| RR-012 | P1 | M0 | `scripts/test-firestore-rules.mjs:1-153`, `package.json:20-29` | Obowiązkowe testy Rules i emulatorowe E2E nie są obecnie wykonane: Firebase CLI kończy przed emulatorem, bo `java --version` pokazuje 20.0.1, a CLI wymaga ≥21. Definicja release-ready wymaga obu. | Niezweryfikowane kontrakty access/subscription/owner na prawdziwym Rules backendzie oraz krytyczny flow na emulatorze. | Zapewnić hermetyczny JDK 21 w lokalnym/CI harnessie, bez zmiany kontraktu aplikacji; gate ma failować, gdy runtime brak. | Po spełnieniu precondition uruchomić wskazane bramki; rozszerzyć rules przypadki owner/subscription/private collections. | Blocker środowiska, nie diagnoza błędu reguł. Nie można stwierdzić, że obecne testy Rules przechodzą. |
| RR-013 | P1 | M5/M7 | `ios/App/App/Info.plist:21-24`, `ios/App/App.xcodeproj/project.pbxproj:435,448,576,584,600,608`, `package.json:4`, `src/lib/purchases.ts:12-24`, `scripts/release-ios.sh:5-26` | Web ma version `6.12.0`, iOS/Watch marketing version `0.0.1`; release script wymaga ręcznego build number i nie waliduje marketing version ani RevenueCat Apple key. W native brak `VITE_REVENUECAT_APPLE_API_KEY` tylko loguje warning i wyłącza zakupy. | Artefakt iOS może wyjść z błędną wersją lub paywallem bez zakupów. | Jeden source of truth version/release tag; preflight porównujący wszystkie targety i wymagający Apple RevenueCat key przed archive. | Test preflight: mismatch oraz brak key kończą się non-zero; matching package/tag przechodzi. | Wymaga decyzji, czy wersja iOS ma zawsze równać się semver web/release tag. |
| RR-014 | P1 | M7 | `.github/workflows/deploy.yml:1-108`, `firebase.json:1-22`, `functions/package.json:2-8` | Jedyny workflow deployuje GitHub Pages. Nie ma chronionego joba `firebase deploy --only functions,firestore:rules,firestore:indexes,storage`, checksum/revision artefaktów ani `functions.predeploy`. Web publish może więc dostać klienta oczekującego niewdrożonych Functions/rules; deploy Functions ręczny może użyć starego `functions/lib`. CI używa Node 20, podczas gdy Functions deklarują Node 22. | Niespójny frontend/backend i nieweryfikowalne wdrożenie kontraktów Firebase. | Osobny chroniony job Firebase: clean checkout, Node 22, build/test Functions, deploy wszystkich kontraktów, zapis SHA/checksum w artefakcie/release. `functions.predeploy` musi wymuszać build/typecheck/test. | Test skryptu deploy/preflight na fixture: brak świeżego builda lub env kończy non-zero; CI używa Node 22. | Wymaga zewnętrznej zgody na poświadczenia/deploy, poza tym audytem. |
| RR-015 | P1 | M0 | `package.json:27`, `playwright.config.ts:18-36`, wynik `rtk npm run e2e:webkit` | Wszystkie 9 testów WebKit failują przed pierwszą asercją: brak executable `webkit-2272/pw_run.sh`. To obowiązkowy smoke z definicji release-ready. | Brak dowodu działania Safari/WebKit. | Provisioning browsera w obrazie CI/lokalnym setupie i fail-fast preflight, nie „zielony” skip. | `rtk npm run e2e:webkit` zielone po precondition; dodać retry only dla testów, nie dla brakującego runtime. | Blocker środowiska. Audyt nie instaluje browserów. |
| RR-016 | P2 | M4 | `src/lib/pr-utils.ts:19-64,74-154`, `src/lib/cycle-insights.ts:44-71` | `getExerciseBest1RM` i `getExerciseBestReps` nie filtrują `workout.completed`; `detectNewPRs` nie odrzuca nieukończonego current workout. Wystarczy przekazać trening `completed:false` z ukończoną ciężką serią, aby ustawić historyczny best. Testy `pr-utils.test.ts` używają wyłącznie `completed:true`. | Fałszywe PR/progres/insights. | Wspólny predykat `completed workout && completed non-warmup set`, użyty przez PR, tonnage, achievements i insights. | Nieukończony ciężki trening i warmup nie dają PR; ukończony working set daje. | Brak migracji danych; możliwa korekta widocznych historycznych statystyk. |
| RR-017 | P2 | M4 | `src/lib/heatmap-utils.ts:19-54` | Mapa buduje tylko `date -> tonnage`; `hasWorkout = strengthTonnage > 0`. Ukończony trening bodyweight ma tonaż 0, więc znika z heatmapy. | Zaniżona aktywność i streak/raportowanie. | Osobny set completed workout dates niezależny od tonażu. | Completed bodyweight jest `hasWorkout:true`, `strengthTonnage:0`; warmup/incomplete nie jest. | Brak migracji. |
| RR-018 | P2 | M4 | `src/components/MeasurementsForm.tsx:40-54`, `src/hooks/useFirebaseWorkouts.ts:314-327` | Formularz przekazuje `Number(...)` bez `finite`, dodatniości lub zakresu; `addMeasurement` kopiuje wszystkie nie-undefined wartości. Wywołanie programowe może zapisać `NaN`, wartości ujemne lub skrajne (a frontendowy `type=number` nie jest granicą zaufania). | Błędne wykresy, trend i eksport danych. | Walidacja kanonicznych kg/cm w UI i write action/import; finite, >0, fizjologiczne maksimum. | `NaN`, infinity, ujemne i skrajne wartości odrzucone przez write action; kg/lbs/cm/inch round-trip bez edycji. | Istniejące dane niepoprawne wymagają reportu/quarantine, nie cichej normalizacji. |
| RR-019 | P2 | M4 | `src/lib/utils.ts:15-23`, `src/lib/cycle-insights.ts:110-117,148-164`, `src/lib/plan-cycle-utils.ts:90-95`, `src/hooks/usePlanCycles.ts:24-27,194-197` | `parseLocalDate('2026-02-31')` tworzy datę marcową; dla nie-`YYYY-MM-DD` zwraca dowolne `new Date(value)`. Kilka obliczeń dzieli różnicę lokalnych midnight przez stałe `86_400_000`, co daje 23/25 h przy DST. Expected workouts liczy `planDays.length * weeks`, nie faktyczne dni kalendarzowe od startu. | Nieprawidłowe daty są akceptowane; completion/missed/cycle expiration może być błędne koło DST lub startu w środę. | Rygorystyczny parser z round-trip składników; date-only/calendar arithmetic (`setDate`, schedule range) zamiast ms; expected sessions policzyć z kalendarza. | `2026-02-31` reject; leap day; DST 2026-03-29; start cyklu w środę. | Import istniejących invalid date wymaga decyzji: reject, quarantine lub manual repair. |
| RR-020 | P2 | M4 | `src/lib/training-load.ts:20-31,43-48`, `src/lib/hr-zones.ts:19-29` | `calculateTRIMP` akceptuje `avgHR > maxHR`, więc HRR >1 zwiększa wykładniczo obciążenie; brak finite checks. `computeDailyLoad` przekazuje dane Strava bez clampa. | Niewiarygodne load/CTL/ATL i decyzje treningowe. | Reject/clamp `avgHR` do `(restHR, maxHR]`, walidować skończone duration/rest/max. | HR ponad max, NaN, zero/ujemny duration i granice dokładnie na max. | Brak migracji; historyczne wykresy mogą się skorygować. |
| RR-021 | P2 | M5 | `functions/src/daily-reminder.ts:27-96`, `functions/src/weekly-digest.ts:36-50,105-240` | Daily reminder pobiera wszystkie `users` (`.get()`, l.39), dla każdego robi odczyt planu i wysyła sekwencyjnie; timeout to 300 s. Weekly digest również listuje wszystkie konta Auth, wykonuje kilka query na usera i tylko batchuje po 10. | Przy wzroście kont job może kończyć timeoutem, generować nieograniczone odczyty i pomijać przypomnienia/digest. | Paginacja kandydatów, selekcja po opt-in/statusie, bounded concurrency; przed skalą Cloud Tasks z resumable cursor. | Fake 1k użytkowników: maksymalna równoległość i paginacja; assert brak globalnego scan w pojedynczym invocation. | Wymaga decyzji o SLA, retry oraz limicie kosztów. |
| RR-022 | P2 | M6 | `src/hooks/useFirebaseWorkouts.ts:56-115`, `src/hooks/useStrava.ts:29-64`, `src/pages/admin/AdminDashboard.tsx:172-254`, build output | Każdy consumer `useFirebaseWorkouts` zakłada listener całej historii użytkownika, `useStrava` całej historii aktywności, a admin ma globalne realtime listenery `users`, `ai_usage` i telemetry. Build zgłasza główne chunki 559.71/729.61 kB. | Rosnące koszty odczytu, pamięć, wolny start i admin nie skaluje się. | Read store współdzielony, query window/paginacja i agregaty backendowe; lazy-load charts/Strava; ustalić bundle budget. | Fixture 1k–5k workoutów i 10k Strava; assert limitów dokumentów/listenerów i budżetu bundle. | Wymaga uzgodnienia retencji, UX historii i budżetu wydajności. |
| RR-023 | P2 | M0/M7 | `e2e/critical.spec.ts:4-104`, `playwright.config.ts:3-5`, `src/test/workout-draft-db.test.ts:13-135`, `src/test/workout-final-sync.test.ts:112-116` | Mock E2E blokuje Firebase (`blockFirebase`) i sprawdza shell/routing, nie zapis treningu lub kontrakt Rules/Functions. Fake IndexedDB opiera się na timerach. Test konfliktu sprawdza tylko monotoniczne timestampy, nie clocks skew/revision. Zielone 381+66 testów nie obejmuje P0 scenariusza. | Fałszywa pewność release gate. | Oddzielić mock UI od emulator-critical; testować real Auth/Rules/Firestore i deterministyczne controllable promises zamiast sleepów. | Obowiązkowe testy z RR-001–RR-005, M1 Rules oraz lifecycle. | Brak migracji; konieczne odblokowanie JDK/WebKit. |
| RR-024 | P3 | M1 | `firestore.rules:33-47,49-193`, `functions/src/revenuecat.ts:95-155`, `functions/src/registration.ts:587-630` | Kontrola aktualnego kodu potwierdza pozytywną allowlistę profilu, immutable `userId` dla workouts/measurements/summaries/cycles/telemetry, private collections `false`, `status:active` access, App Check + transaction rate limit waitlist oraz idempotencję/out-of-order RevenueCat w transakcji. Rules test runner jest jednak zablokowany (RR-012). | To nie jest wykryta luka; brak wykonanej bramki pozostawia dowód emulatorowy niepełny. | Nie zmieniać tych kontrol; uruchomić Rules i dodać cases coverage. | Rules: subscription, owner immutability, private collections, active/pending/suspended. | Nie potwierdzono runtime deploymentu reguł (patrz RR-014). |
| RR-025 | P3 | M5 | `ios/App/WatchApp/WorkoutSessionManager.swift:22-76`, `StrengthWatchApp.swift:3-13` | `activate()` wywołuje `syncHealthSession`, ale brak `WKExtensionDelegate`/recovery handler i kodu odzyskania `HKWorkoutSession` po relaunchu extension. Build iPhone smoke nie wykonuje tego flow. | Sesja HealthKit i telemetry HR mogą nie wrócić po ubiciu Watch extension. | Dodać lifecycle/recovery API HealthKit i ręczny device validation. | Ręczny test: rozpocznij, ubij/relaunch extension, potwierdź recovery, HR i finalizację. | Wymaga fizycznego Watch oraz polityki obsługi nieodtwarzalnej sesji. |

## Braki testów i testy niewiarygodne

1. Rules suite ma dobre intencje (owner/subscription/status), ale nie uruchomiła się. Nie jest obecnie dowodem działania `firestore.rules` na emulatorze.
2. Emulator E2E nie uruchomiło się. Zatem nie ma wykonanej ścieżki real Auth + Firestore dla krytycznego zapisu treningu.
3. `e2e/critical.spec.ts` jawnie blokuje Firebase i testuje głównie widoczność komponentów. Nie może potwierdzić authz, reguł, transakcji, offline, RevenueCat ani Functions.
4. WebKit wszystkie przypadki failują przed testem przez brak executable; wynik nie mówi nic o kompatybilności WebKit.
5. `workout-final-sync.test.ts` potwierdza tylko porównanie timestampów; nie ma testu revision, clock skew, konfliktu dwóch urządzeń ani finalizacji po conflict.
6. `workout-draft-db.test.ts` używa fake IndexedDB z `setTimeout(0)` i nie kontroluje kolejności completion; nie wykrywa stale-write ani ACK race.
7. Brak testu promotion użytej w produkcyjnym `WorkoutDay`; istniejący test sprawdza inny helper `markPromotedToRemote`.
8. Brak testu Watch native queue: event ID, ACK, crash między drain a persist, duplikat live/transfer, >500 i relaunch.
9. Brak testu retry deletion dla błędu Storage/direct doc/Auth/user doc oraz cleanupu danych GDPR.
10. Brak testu tokenu FCM przy logout/switch konta i niepowodzeniu unregister.
11. Brak fail-point tests dla onboarding/start cycle/merge/delete >500 i plan revision conflict.
12. Brak testów: incomplete workout w PR, bodyweight heatmap, measurements validation, invalid date/leap/DST oraz HR > max.
13. Brak testów stream URL środowiska, upstream abort i exactly-once usage.
14. iOS simulator smoke tylko buduje/instaluje/launchuje. Nie testuje loginu, permissions, RevenueCat sandbox, Watch bridge ani recovery HealthKit.

## Plan naprawy w kolejności M0 → M7

Każdy punkt jest osobną, atomową zmianą/PR. Nie łączyć etapów. Przed każdym
etapem: `rtk git status --short` i review diffu plików etapu.

### M0 — harness i wiarygodne bramki

1. Zdefiniować i udokumentować JDK 21 oraz Playwright WebKit jako precondition CI/local; dodać fail-fast script bez automatycznej instalacji.
   - Akceptacja: `rtk npm run test:rules`, `rtk npm run e2e:emulator`, `rtk npm run e2e:webkit` uruchamiają testy, nie kończą się na runtime.
2. Rozdzielić mock UI i emulator-critical w raportowaniu CI; mock suite nie może być nazwana integracyjną.
   - Akceptacja: osobne required jobs i jednoznaczne nazwy.
3. Zastąpić fake/sleep race harness controllable promises; dodać testy RR-001–RR-004 i zapisywany workout emulatorowy.
   - Akceptacja: każdy test wymusza kolejność A/B/ACK przez kontrolowany deferred promise.

Weryfikacja:

```bash
rtk npm run typecheck
rtk npm run lint
rtk npm test
rtk npm run test:rules
rtk npm run e2e
rtk npm run e2e:emulator
rtk npm run e2e:webkit
```

### M1 — auth, prywatność i płatności

1. Zastąpić FCM array token registry z ownerem, device markerem i `lastSeen`; zunifikować logout w jednym helperze, który próbuje revoke przed `signOut` i ma retry.
   - Akceptacja: token nie jest własnością A i B równocześnie; direct gate logout używa helpera.
2. Przebudować delete account jako trwałą idempotentną operation z postępem i workerem/retry; nie ignorować błędów purge.
   - Akceptacja: retry po dowolnym fail-point kończy pełne usunięcie, także gdy Auth już nie istnieje.
3. Po odblokowaniu emulatora poszerzyć Rules testy dla subscription, wszystkich owner fields i private collections.
   - Akceptacja: testy zawierają pozytywne i negatywne przypadki oraz przechodzą na emulatorze.

Weryfikacja:

```bash
rtk npm --prefix functions test
rtk npm --prefix functions run build
rtk npm run test:rules
rtk npm run e2e:emulator
```

### M2 — trening, offline i konflikty

1. Zmienić kontrakt `batchSaveWorkout` na `expectedRevision` i przeprowadzić transakcję z equality check; usuwać timestamp jako warunek konfliktu.
   - Akceptacja: clocks skew nie zmienia rezultatu konfliktu.
2. Zserializować persist drafów per session oraz rozwiązać ACK po version/hash.
   - Akceptacja: stale write i stale ACK nie cofają/nie czyszczą nowszego stanu.
3. Wprowadzić jedną promotion operation provisional→remote, używaną przez WorkoutDay i AutoSync; usuwać local ID atomowo logicznie.
   - Akceptacja: reload po promotion/finalization nie pokazuje provisional draftu.
4. Przenieść durable final queue z localStorage do odpornego store albo jasno obsłużyć quota error w UI z retry; zachować revision w każdym retry.
   - Akceptacja: quota/IndexedDB failure nie daje fałszywego „saved”.

Weryfikacja:

```bash
rtk npm test -- workout-draft workout-draft-db workout-final-sync workout-sync-queue sync-center-payload
rtk npm run test:rules
rtk npm run e2e:emulator
rtk npm run build
```

### M3 — plany, onboarding i cykle

1. Dodać operation ID/deterministyczne cycle ID do onboarding i start/repeat; retry kontynuuje stan, nie tworzy drugi cycle.
   - Akceptacja: fail po save/create/mark i retry daje dokładnie jeden active cycle.
2. Dodać revision precondition dla planu oraz atomowy contract active-cycle snapshot.
   - Akceptacja: dwa urządzenia widzą konflikt zamiast last-writer-wins.
3. Zmienić merge/delete na batches ≤450 z persistent cursor i recovery.
   - Akceptacja: 501+ workoutów, partial fail i retry nie zostawiają niespójnych cycleId.
4. Zastąpić ms arithmetic calendar arithmetic i liczyć expected sessions z rzeczywistego schedule.
   - Akceptacja: Wednesday start i DST 2026-03-29 są poprawne.

Weryfikacja:

```bash
rtk npm test -- cycle-actions plan-cycle-utils cycle-insights trainingPlan
rtk npm run typecheck
rtk npm run e2e:emulator
```

### M4 — poprawność domenowa

1. Ujednolicić predykat statystyk zakończonych treningów/working sets.
2. Rozdzielić event ukończonego treningu od tonażu heatmapy.
3. Walidować pomiary na wejściu/write/import i zachować canonical kg/cm.
4. Wprowadzić strict date-only parser oraz date-calendar utility.
5. Walidować/clampować HR/TRIMP.

Akceptacja: wszystkie przypadki RR-016–RR-020 mają test pozytywny i negatywny.

Weryfikacja:

```bash
rtk npm test -- pr-utils heatmap-utils units date-utils training-load cycle-insights
rtk npm run typecheck
rtk npm run build
```

### M5 — AI, schedulery i Watch/iOS

1. Konfiguracja stream URL per environment i upstream abort/usage finalizer.
2. Paginacja/reminder candidate selection, bounded concurrency i plan Cloud Tasks.
3. Watch event ID + peek/persist/ack protocol, recovery HealthKit i device test matrix.
4. Wspólny version source oraz iOS RevenueCat preflight.

Akceptacja: staging/emulator AI nie dotyka production; abort zatrzymuje upstream;
1k-user scheduler ma bounded concurrency; Watch nie gubi eventu po crash/relaunch;
archive blokuje mismatch/missing key.

Weryfikacja:

```bash
rtk npm --prefix functions test
rtk npm --prefix functions run build
rtk npm test -- watch-event-router
rtk npm run build:mobile
rtk npm run ios:simulator:smoke
```

oraz ręczny test na fizycznym Watch/iPhone: permissions, login, purchase sandbox,
Watch offline → relaunch → ACK → finalization.

### M6 — wydajność i skalowanie

1. Wydzielić shared workout read store i zakresy/paginację historii.
2. Paginować Strava i admin; zastąpić globalne listenery agregatami backendu.
3. Zdefiniować fixture 1k/5k workouts, 10k activities i budżet bundle/TTI.
4. Lazy-load chart/Strava i dodać CI size check.

Akceptacja: udokumentowane limity listenerów i rozmiarów, bez globalnego history
listenera na dashboardzie.

Weryfikacja:

```bash
rtk npm test
rtk npm run build
rtk npm run e2e
```

### M7 — release engineering i obserwowalność

1. Ustawić Node 22 dla Functions w CI; `functions.predeploy` wymusza build/typecheck/test.
2. Dodać chroniony deploy Firebase dla Functions, Rules, Indexes i Storage po quality gates; publish revision/checksum.
3. Walidować wymagane env dla web i mobile build, w tym RevenueCat i Firebase.
4. Dodać metryki/alerty: conflicts, failed final sync, stale drafts, webhook drops, FCM failures, deletion operations, AI errors.

Akceptacja: brak env/stale artifact blokuje release; deployed revision jest zapisana;
release job nie używa Node 20 dla Node 22 Functions.

Weryfikacja (w bezpiecznym, nieprodukcyjnym dry-run/harnessie):

```bash
rtk npm run typecheck
rtk npm run lint
rtk npm test
rtk npm --prefix functions test
rtk npm run test:rules
rtk npm run e2e
rtk npm run e2e:emulator
rtk npm run e2e:webkit
rtk npm run build
rtk npm --prefix functions run build
rtk npm run ios:simulator:smoke
```

## Release checklist

### Automatyczna

- [ ] Node 22 Functions, typecheck, lint, root tests i Functions tests są zielone.
- [ ] Rules i emulator-critical E2E są zielone z JDK 21+.
- [ ] Chromium mock E2E i WebKit smoke są zielone.
- [ ] Web/mobile/Functions build są zielone z pełnym wymaganym env.
- [ ] Testy P0/P1: revision conflict, ACK race, serialized draft, promotion reload, Watch ACK, deletion retry, FCM account switch, plan/cycle retries.
- [ ] Firebase deploy artifact includes fresh Functions build plus Rules/Indexes/Storage revision/checksum.
- [ ] Bundle budget i fixture-scale checks spełnione.

### Manualna

- [ ] iOS Simulator: cold launch, login, logout/switch, push permission, trening offline/reload/final retry.
- [ ] Fizyczny iPhone + Watch: paired/unpaired, set logging offline, event duplicate, crash/relaunch recovery, HealthKit recovery.
- [ ] Sandbox RevenueCat: purchase, renewal, cancellation, expiration; sprawdzić receipt → webhook → access state.
- [ ] Ręczna weryfikacja deletion retry po zasymulowanym partial failure oraz brak avatar/data residue w testowym projekcie.
- [ ] Staging AI: streaming cancel, no upstream continuation, jedno usage record.

### Wymagająca zewnętrznej zgody

- [ ] Właściciel produktu zatwierdza politykę migracji starych drafów, planów, cycle duplicates i niepoprawnych dates/measurements.
- [ ] Właściciel bezpieczeństwa zatwierdza retencję deletion/audit/FCM device registry i App Check production enforcement.
- [ ] Właściciel release zatwierdza Firebase credentials, chroniony deploy i zapisaną revision artefaktów.
- [ ] Apple/RevenueCat owner zatwierdza wersję marketingową, key preflight, sandbox purchase i TestFlight/App Review submission.
- [ ] Właściciel operacyjny zatwierdza limity schedulerów, Cloud Tasks/alerts oraz SLO kosztów.

## Nie potwierdzono / wymaga decyzji

- Nie potwierdzono, które Rules/Functions/Indexes są faktycznie wdrożone w Firebase: lokalny audyt nie wykonywał deployu ani requestów do produkcji, a CI nie ma Firebase deploy joba.
- Nie potwierdzono produkcyjnego App Check enforcement, sekretów, RevenueCat webhook configuration ani sandbox entitlement. Kod może deklarować kontrolę, ale konfiguracja zewnętrzna jest poza workspace.
- Nie potwierdzono zachowania istniejących produkcyjnych dokumentów bez `revision`, z legacy `updatedAt`, osieroconych provisional drafts, wielu active cycles oraz invalid dates/measurements. Przed migracją potrzebny read-only inventory w zatwierdzonym środowisku.
- Nie ma podstaw do samodzielnego wyboru polityki dla: reconciliation duplikatów cycle, retention tokenów/auditów, exact version source oraz obsługi legacy invalid data. Warianty muszą zatwierdzić odpowiedni właściciel.
- iOS simulator smoke potwierdza kompilację/launch, nie realne native permissions, Apple purchase, Watch connectivity ani HealthKit recovery na urządzeniu.

## Potwierdzone pozytywne kontrole

Nie są one podstawą do release, ale aktualny kod zawiera istotne poprawne elementy:

- Rules ograniczają update profilu allowlistą i blokują klientowi `subscription` (`firestore.rules:33-47`), a owner `userId` jest zachowany dla głównych prywatnych kolekcji.
- Callable access wymaga active statusu (`functions/src/security.ts:76-88`), waitlist ma App Check i transakcyjny limit (`registration.ts:587-630`).
- RevenueCat wykorzystuje transaction, event ID/timestamp i odrzuca duplikaty/starsze eventy (`functions/src/revenuecat.ts:95-155`).
- Resend verification zapisuje `pending_send` i usuwa kod po błędzie provider (`registration.ts:456-482`).
- Web build używa PWA prompt bez `skipWaiting` (`vite.config.ts:54-106`).

Kontrole te wymagają nadal wykonania emulatorowych i zewnętrznych bramek z checklisty.

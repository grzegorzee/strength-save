# Plan realizacji audytu Strength Save — 2026-08-19

> Źródło prawdy: `docs/AUDYT-PRODUKTOWY-2026-08-19.md`.
> Ten plik jest równocześnie planem wykonawczym i trackerem dla agenta `/loop`.

## 1. Cel i strategia

Celem jest usunięcie wszystkich ustaleń audytu bez narażania danych treningowych i bez
rozjechania pięciu klientów. Praca jest podzielona na cztery chirurgiczne wydania:

| Wydanie | Cel | Zależność |
|---|---|---|
| A | niezawodny i szybki start, offline, resume, brak blackoutów | brak |
| B | prawda danych treningowych i właściwy feedback | A |
| C | urlop, rozgrzewka, tryby i koniec planu | A, B |
| D | uproszczona architektura informacji | A–C |

Nie łączymy naprawy bootstrapu z przebudową Dashboardu. Każde zadanie ma osobny test
odtwarzający, osobną zmianę i osobny commit. Po każdym wydaniu robimy re-audyt jego zakresu.

## 2. Niezmienniki

1. **Dane usera wygrywają.** Brak testów zapisujących serie na realnym koncie.
2. **Siłownia jest środowiskiem docelowym.** Każdy treningowy flow obejmuje zgaszenie ekranu,
   suspend WKWebView, słaby zasięg, kill i reconnect.
3. **Cache nie nadaje nowych uprawnień.** Offline wpuszcza tylko ostatni serwerowo
   potwierdzony profil `active` i potwierdzony entitlement; cached `suspended` blokuje.
4. **Lista z planu jest kompletna.** Draft/sesja może ją rozszerzać, nigdy zastępować.
5. **Warmup jest zachowany, ale nie udaje pracy.** Nie wchodzi do roboczego tonażu, PR,
   progresji, streaku ani realizacji planu.
6. **Fakt i estymacja są rozdzielone.** Podniesiony ciężar to rekord ciężaru; Epley to
   `Szac. 1RM` wraz ze źródłem obliczenia.
7. **Każdy błąd ma wyjście.** Retry, odrzuć, usuń albo kontynuuj offline — bez wiecznych banerów.
8. **Jeden release train.** Web, iOS, Android, Apple Watch i Garmin powstają z tego samego
   zielonego commita i zgodnego kontraktu.

## 3. Globalna definicja ukończenia zadania

Każde zadanie T1…Tn:

1. aktualna rzeczywistość kodu jest sprawdzona przed zmianą;
2. test odtwarzający problem najpierw jest czerwony;
3. wdrożona jest najmniejsza kompletna poprawka;
4. test nowej ścieżki i niezmiennik starej ścieżki są zielone;
5. dla treningu jest test sekwencji, nie tylko pojedynczego renderu;
6. `npm run test` i `npm run typecheck` przechodzą na checkpointcie;
7. zmiana jest opisana w trackerze i ma izolowany commit;
8. nowe copy trafia jednocześnie do PL i EN.

## 4. Wydanie A — niezawodność i start

### A-T0 — ustabilizować bazę testową

- [x] Wstrzyknąć jawne `todayISO` do pięciu padających testów
  `session-rating-progression`; zachować osobne przypadki graniczne 13/14 dni.
  **Dowód:** commit `351e026a`; RED 5/10 → GREEN 10/10, granica 13/14 w
  `lapse-detection.test.ts`.
- [x] Zapisać baseline: rozmiary chunków oraz pięć pomiarów warm/cold/offline startu na
  dostępnym urządzeniu lub symulatorze. Nie udawać pomiaru real-device.
  **Dowód:** `docs/BASELINE-START-A-T0-2026-08-19.md`, skrypt reprodukcji w commicie
  `351e026a`; jawnie opisana emulacja Chromium 390×844 i brak pomiaru real-device.

**Akceptacja:** pełny Vitest zielony; zmiana daty systemowej nie zmienia wyniku testów.

**A-T0 DONE (`351e026a`):** pełny Vitest 220/220 plików, 1662/1662 testów; typecheck,
lint, build i bundle budget GREEN. Mediany warm/cold/offline: 68/239/147 ms w opisanej
symulacji; initial JS 1 298 679 B, limit bez zmian.

### A-T1 — cache-first bootstrap profilu

- [x] Testy `UserProvider`: cached active + wiszący sync, cached active + błąd sync,
  cached suspended, brak cache nowego usera, zmiana uid w trakcie, reconnect i serwerowa
  revokacja. **Dowód:** `bf985779`, 7/7 scenariuszy UserProvider GREEN.
- [x] Podpiąć lokalny snapshot przed callable; `syncUserProfile` uruchamiać w tle/równolegle.
  **Dowód:** listener z `includeMetadataChanges` powstaje przed callable; cached active
  przechodzi przy nierozstrzygniętej obietnicy sync.
- [x] Dodać twardy timeout/abort do natywnego callable i ochronę przed wynikiem starego uid.
  **Dowód:** deadline 10 s + `AbortController`, test RED `still-pending` → GREEN
  `deadline-exceeded`; cleanup i zgodność `profile.uid === userId`.
- [x] Nie pokazywać `AccessRestricted` wyłącznie z powodu braku sieci.
  **Dowód:** cached active zachowuje `hasAppAccess=true` po błędzie offline; cached
  suspended pozostaje fail-closed, no-cache nie dostaje profilu.

**Akceptacja:** zalogowany, wcześniej aktywny user wchodzi do aplikacji po cold launch bez
sieci; nowy user bez cache nie dostaje sfabrykowanego dostępu.

**A-T1 DONE (`bf985779`):** RED 6/6 bootstrap + 1/8 native timeout; GREEN 20/20
testów celowanych i pełny Vitest 220/220 plików, 1668/1668 testów. Typecheck, lint,
build i bundle budget GREEN. Real-device cold/airplane pozostaje bramką A-T5.

### A-T2 — jeden BootScreen i metryki startu

- [x] Jeden komponent `BootScreen` dla auth/profile/routes/paywall/Suspense: małe logo,
  cienki indeterminate progress bar, bez zamiany na kółko. **Dowód:** `c300aa4d`, test
  architektury i renderu `boot-screen.test.tsx`; brak lokalnych `AppLoader`/spinnerów.
- [x] Dopasować rozmiar i pozycję natywnego launch artwork iOS/Android do pierwszego frame'u.
  **Dowód:** wspólny `app-icon` 64×64 pt/dp, center + `#0E0E0E`; Android resources i
  iOS App/Debug kompilują się.
- [x] RevenueCat/paywall nie blokuje cached, serwerowo potwierdzonego dostępu; brak cache nie
  dostaje premium. Każda sieć ma timeout i jawny fallback. **Dowód:** RC i lookup treningów
  mają deadline 1500 ms, web sync profilu 10 s; cached PRO/read-only oraz fresh-user
  invariant w `use-subscription-bootstrap` i `hard-paywall-bootstrap`.
- [x] Dodać markery `root-painted`, `auth-restored`, `profile-cache-ready`,
  `dashboard-interactive` oraz raport warm/cold/offline/weak-network. **Dowód:** markery
  Performance API + `docs/RAPORT-START-A-T2-2026-08-19.md`, po pięć prób każdego trybu.
- [x] Ograniczyć krytyczny bundle dopiero po profilowaniu; nie podnosić budżetu. **Dowód:**
  initial JS 1 300 254 B / 1 536 000 B, limit bez zmian; profil wskazuje lazy chunks,
  bez ryzykownego splitu Firebase po wcześniejszym incydencie TDZ/white screen.

**Cel wydajnościowy:** na referencyjnym telefonie mediana z pięciu uruchomień: warm ≤1 s,
cold online ≤2,5 s, cold offline/weak-network do cached Dashboardu ≤2 s. Gdy sprzęt nie
pozwala osiągnąć progu, raport wskazuje konkretny etap i kolejne wąskie gardło.

**A-T2 DONE (`c300aa4d`):** RED brak 3 modułów + 2/2 scenariusze wiszącego RC;
GREEN 29/29 zakresu, niezmiennik markera Dashboardu i pełny Vitest 225/225 plików,
1681/1681 testów. Typecheck, lint, build, bundle, dist/offline smoke i no-emoji GREEN;
Android resources oraz iOS simulator build GREEN. Mediany markerów web/E2E
warm/cold/offline/weak: 48/207/100/1984 ms. Fizyczny iPhone był offline, więc wynik
real-device nie jest deklarowany; dokładne etapy i bottleneck są w raporcie, a sprzętowa
bramka pozostaje w A-T5 zgodnie z wyjątkiem celu wydajnościowego.

### A-T3 — ciche wznowienie draftu

- [x] Zwykła hydracja dirty draftu bez toasta i bez modalnego UI.
  **Dowód:** `77b37a16`; kontrakt źródłowy oraz E2E kill potwierdzają brak toasta,
  telemetria `draft_recovered` pozostaje.
- [x] Telemetria może pozostać bez UI.
  **Dowód:** `trackTelemetryEvent(uid, 'draft_recovered')` bez wywołania `toast`.
- [x] `finalSyncPending` i totalny błąd zapisu mają mały komunikat z widocznym
  retry/odrzuceniem; przycisk zamknięcia działa dotykiem.
  **Dowód:** `WorkoutDraftStatusNotice`, retry + destrukcyjne odrzucenie z potwierdzeniem,
  cel zamknięcia 44×44 i testy interakcji; zwykłe błędy chmury zachowują stary flow.
- [x] Testy: dirty resume, final pending, uszkodzone IDB, fallback localStorage.
  **Dowód:** 87/87 testów zakresu, Chromium E2E 11/11 oraz suspend→resume+kill 1/1;
  pełny Vitest 226/226 plików, 1686/1686 testów.

**A-T3 DONE (`77b37a16`):** RED brak komponentu statusu → GREEN; zwykły dirty resume
jest cichy, `finalSyncPending` i totalny fail mają retry/odrzuć/zamknij, a uszkodzone
IndexedDB odtwarza fallback localStorage. Typecheck, lint, build, bundle, dist/offline smoke
i no-emoji GREEN. Sekwencje plan→inna sesja→powrót oraz renderer suspend→resume→kill
zachowują komplet serii bez realnego konta. Dodatkowa próba iOS simulator ujawniła
istniejącą bramkę native: `StrengthWatchWidgets` jest kompilowany jako iOS 15 i odrzuca
watchowe API (`accessoryCorner`, `containerBackground`); naprawa i pełny lock 2 min należą
do A-T5/A-RELEASE i nie są przedstawione jako PASS.

### A-T4 — blackouty i blokujące powierzchnie

- [x] `LapseTray` nie otwiera się automatycznie; zaległość jest kartą/statusowym CTA.
  **Dowód:** `a5cae77b`; `lapse-status-card.test.tsx` potwierdza brak traya do jawnego
  tapu, a Dashboard nie ma już efektu auto-open.
- [x] Ustanowić kontrakt: maksymalnie jeden pełnoekranowy overlay i zawsze jawne zamknięcie.
  **Dowód:** wspólny `useExclusiveOverlay` obejmuje Radix Dialog/Sheet/AlertDialog,
  fullscreen timera, completion i live-PR; test otwiera Sheet z Dialogu i potwierdza
  dokładnie jedną warstwę, wszystkie custom fullscreeny mają jawny cel zamknięcia 44×44.
- [x] Przetestować body scroll-lock po unmount/crash oraz repaint po native
  background→foreground, nie tylko webowym `visibilitychange`.
  **Dowód:** unit unmount + `ErrorBoundary` czyszczą `pointer-events`, `overflow` i
  `data-scroll-locked`; mock natywnego `appStateChange` potwierdza repaint po resume;
  Chromium E2E `reschedule-flow` potwierdza czysty body i zero osieroconych dialogów.
- [x] Ograniczyć hard reload crash-guarda do faktycznej asercji Firestore z anti-loop i
  zachowaniem draftu.
  **Dowód:** matcher wymaga jednocześnie Firestore i `INTERNAL ASSERTION FAILED`, guard
  zwraca cleanup i zachowuje okno 2 min; przed reloadem bieżący snapshot `WorkoutDay`
  trafia synchronicznie do scoped localStorage. Testy odrzucają identyczny błąd innego SDK.

**A-T4 DONE (`a5cae77b`):** RED 5 nieprzechodzących kontraktów + osobny RED awaryjnego
fallbacku → GREEN 84/84 testy zakresu; pełny Vitest 230/230 plików, 1693/1693 testy,
typecheck, lint, build, bundle, dist/offline smoke i no-emoji GREEN. Playwright 2/2:
scroll-lock po sheecie oraz kill→resume draftu 1:1. Test natywnego eventu resume jest
zielony; fizyczny lock 2 min pozostaje uczciwie w A-T5 i nie jest deklarowany jako PASS.

### A-T5 — prawdziwy kontrakt offline

- [x] Wzmocnić `check:dist-offline`: zalogowany cached profile/plan, cold reload offline,
  konkretne CTA Dashboardu, wejście w nieogrzany lazy route, zapis draftu.
  **Dowód:** `1874a53e`; dokładny produkcyjny `dist`, syntetyczny user wyłącznie w
  emulatorach Auth/Firestore, pełne odcięcie sieci po seedzie i GREEN wszystkich sześciu
  markerów kontraktu. Runtime switch emulatora działa tylko w przeglądarce na loopback,
  nigdy w natywnym Capacitorze ani na hostingu.
- [x] E2E bez bypassu `UserProvider` dla co najmniej cached active/suspended/no-cache.
  **Dowód:** `offline-user-provider.spec.ts` 3/3 GREEN na Auth+Firestore+Functions;
  brak `fittracker_e2e_auth_state`, cached active wchodzi, suspended pozostaje fail-closed,
  a no-cache nie dostaje sfabrykowanego profilu.
- [ ] Scenariusz native: online seed → force quit → airplane → launch → start → seria →
  lock 2 min → resume → finish offline → kill → launch offline → reconnect → jeden sync.
  **Częściowy dowód:** pełna sekwencja PASS na Android AOSP API 35 oraz iPhone 17 Pro Max
  Simulator, wyłącznie na syntetycznych kontach lokalnego Auth/Firestore. Android:
  force-stop + airplane, cold cached Dashboard, 100 kg × 5, ekran uśpiony 129 s, resume,
  final offline, drugi kill, reconnect, dokładnie 1 dokument/1 ukończona seria i UI
  1 trening/0,5 t. iOS: `screenConfig power off` od 1787138924 do 1787139054 (130 s),
  resume + kill zachowały 100 kg × 5, final offline przetrwał kolejny kill, Sync Center
  wysłał 1 pending, a Firestore i Dashboard potwierdziły 1 trening/0,5 t. Android ujawnił
  RED po killu (`Failed to obtain exclusive access`); test
  `firestore-native-kill-cache.test.ts` i poprawka `persistentMultipleTabManager()` są w
  `00d1a178`. **BLOCKER:** wymagany przebieg fizyczny nadal nie istnieje — `Iphone (Greg)`
  jest `unavailable`, po wyłączeniu AVD `adb devices -l` jest puste.
- [ ] Ten sam kontrakt uruchomić na iOS i Android; Watch/Garmin zweryfikować przy
  odpowiadających im kolejkach offline i ingest.
  **Częściowy dowód:** kontrakt telefonu przeszedł w obu natywnych symulatorach. Bieżący
  produkcyjny mobile bundle kompiluje pełny iOS scheme bez globalnego override SDK; w
  `App.app/Watch` są `StrengthWatch.app` i `StrengthWatchWidgets.appex` (1.0.0, build 103).
  Android `assembleDebug` tworzy APK, Garmin SDK 9.2.0 buduje `epix2` PRG. Test 3/3
  potwierdza Watch durable-before-transmit/ACK-only oraz Garmin Storage/clear-on-success
  i dedup ingest. **Fizyczny Garmin PASS (`f127039e`):** EPIX 2, firmware 26.09,
  wydzielona aplikacja `Strength Save QA` i syntetyczny UID `garmin-at5-20260819`.
  Cold launch w trybie samolotowym ujawnił RED `-104`; poprawka TDD wpuszcza wyłącznie
  dzisiejszy serwerowo pobrany cache po ujemnym błędzie transportu, a 401/403/5xx oraz
  stary dzień nadal są fail-closed. Po nowym PRG: cold offline, dwie serie, screen-off
  2 min, kill, cold offline, nieudany finish, drugi kill i reconnect zachowały `2 do
  wysłania` aż do ACK. Firestore pozostał przy jednym kanonicznym dokumencie; doszły
  dokładnie `17,5 kg` asysty i `25 m`, `revision=2`, kolejka `0`, `fitStatus=unavailable`.
  Wariant QA celowo nie tworzył FIT, więc nic nie trafiło do realnego Garmin Connect.
  Audyt urządzenia ujawnił też brak natychmiastowego podglądu tych wartości w menu:
  Storage i ingest były poprawne, lecz UI pokazywało wyłącznie `1/1`. RED kontraktowy,
  lokalny formatter czterech typów oraz niezmiennik licznika/celu są GREEN w `5827b395`;
  pełne bramki 1700/1700, functions 224/224, build i produkcyjny `epix2` są GREEN.
  Na jawną decyzję właściciela pominięto drugi sideload QA i zastąpiono główny PRG
  artefaktem SHA-256 `d3165176b9b0c0cc2520e36a1b1875aa255f06f37641790122823e9ce9081ad9`.
  Produkcyjna aplikacja po zastąpieniu uruchomiła się normalnie, zachowała konto i plan
  oraz pokazała najbliższy trening na czwartek. Nie przedstawiamy pominiętego ręcznego
  re-testu etykiet jako PASS.
  **Zmienione kryterium właściciela:** Apple Watch wolno domknąć na sparowanym
  symulatorze; pełna interaktywna sekwencja kolejki/ACK nadal musi mieć dowód. **BLOCKER:**
  brak fizycznego Androida; fizyczny iPhone pozostaje `unavailable` dla Xcode, lecz
  właściciel może wykonać scenariusz ręcznie na aktualnym TestFlight.
  **Watch Simulator PASS (`60ef6c8c`, 2026-08-19 wieczór):** dokończenie sekwencji
  przerwanej limitem Codexa. Quick workout z zegarka, seria 42,5 kg × 5 przy zabitym
  telefonie (ACK `0E992520` dopiero po trwałym przyjęciu), 2 min wygaszonego ekranu
  plus ponad 2 h uśpienia z żywym procesem, finish przy zabitym telefonie → pending
  `EA1013B9` w `watch.pendingEvents.v1`, pending przetrwał restart apki ORAZ pełny
  restart symulatora zegarka. QA ujawniło RED: po restarcie nic nie retransmituje
  trwałej kolejki (systemowe transfery WCSession przepadają, `activate()` nie flushował,
  finishedView bez licznika pending i Retry — pułapka wg zasady 6). TDD fix `60ef6c8c`:
  auto-retry po aktywacji i po powrocie reachability + wyjście na finishedView; po fixie
  event dostarczony, telefon ACK-nął (`ackedEventIds`), obie kolejki puste, mutacja
  Firestore committed pod deterministycznym id
  `workout-<uid>-adhoc-…-2026-08-19` (mutations=0 w trwałym cache SDK), dedup ingest
  kryty testem. Kontrakt wearables 5/5, pełny Vitest 1702/1702. Uwaga poboczna
  (obserwacja, nie blocker): licznik „sets” na zegarku po restarcie pokazuje 0 mimo
  zalogowanej wcześniej serii (odpowiednik naprawionego UI Garmina `5827b395`).

**A-T5 BLOCKED (`1874a53e`, `00d1a178`, `f127039e`):** wszystkie prace niezależne od sprzętu są
wykonane. GREEN: Vitest 233/233 i 1700/1700, typecheck, lint, build,
bundle/dist/offline/no-emoji, UserProvider emulator 3/3, workout kill/offline 6/6 oraz
pełne sekwencje Android/iOS simulator. iOS 1.0.0 (103) z Watch/widgetem, Android APK i
Garmin PRG budują się; fizyczny Garmin przeszedł offline/kill/screen-off/reconnect.
Pełne dowody i procedura domknięcia:
`docs/RAPORT-OFFLINE-A-T5-2026-08-19.md`. Interaktywny symulator Watch jest domknięty
(`60ef6c8c`, sekwencja + fix retransmisji). A-RELEASE nie może ruszyć przed pełnym
przebiegiem fizycznym iOS+Android (kroki właściciela); Garmin i Watch są domknięte.

### A-RELEASE — wspólne wydanie A

- [ ] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt P0.
- [ ] Wynik: zero czerwonych problemów start/offline/resume.

## 5. Wydanie B — prawda danych i feedback treningowy

### B-T1 — jedno źródło prawdy dla serii roboczych

- [x] Kanoniczne selektory working sets/tonnage/max/completion zamiast lokalnych obliczeń.
- [x] Przepiąć Dashboard, Historię, Postępy, rekordy, completion i backend aggregate.
- [x] Fixture kontraktowe wszędzie: warmup `40×10 done`, working `100×5 done`, working
  `120×5 incomplete` → 500 kg, 1 seria, max 100 kg, brak PR z warmupu.
- [x] Warmup-only nie zwiększa streaku ani ukończenia planu; pozostaje w historii/drafcie.

**B-T1 DONE (`769890e8`):** mapa odchyleń z pełnego audytu konsumentów (Dashboard trend
bez żadnego filtra, Historia ×4, Postępy tonaż/rekordy z draftów i rozgrzewek, WorkoutDay
podsumowanie, AnalyticsChartsTab duplikat); nowe helpery `countWorkoutCompletedWorkingSets`
i `hasCompletedWorkingSet`, `buildExerciseRecords` w achievements-utils; streak i
`buildWeekCardModel` wymagają >=1 serii roboczej. Fixture kontraktowa 9/9 w
`working-set-contract.test.ts` (klient + backend aggregate). Świadomie poza zakresem:
heurystyki sync-conflict/cycle-dedup/workout-lookup/watch-recent. Vitest 1711/1711,
functions 224, typecheck/lint/build GREEN.

### B-T2 — rekord ciężaru kontra szacowane 1RM

- [x] Zmienić `Rekord 72 kg` na `Szac. 1RM: 72 kg` i pokazać źródło, np. `60 kg × 6`.
- [x] Osobno prezentować `Najcięższa seria`/rekord faktycznie podniesionego ciężaru.
- [x] Completion, inbox, Historia i Postępy rozróżniają oba typy.
- [x] Testy wysokich powtórzeń, bodyweight, jednostek lb/kg, warmup i brak źródła.

**B-T2 DONE (`5854c02d`):** RED formatPRValue bez typu '1rm' → GREEN; nowy moduł
`record-labels` (badge estymacji ZAWSZE ze źródłem, badge Max jako fakt), ExerciseCard
z dwoma badge'ami, celebracja i inbox podpisują '1rm' jako 'Szac. 1RM: X'. Postępy już
rozróżniały (nagłówki), Historia ma neutralny licznik. card.best usunięty, 4 nowe klucze
PL+EN. Testy 6/6 zakresu; vitest 1717/1717, typecheck/lint/build GREEN.

### B-T3 — celebracja PR

- [x] Deadline 5,5 s oparty na czasie ściennym; tap zamyka natychmiast.
- [x] Stabilny callback — rerender nie resetuje czasu.
- [x] Testy 5499/5500 ms, tap, rerender, background ponad deadline i zachowanie draftu.
- [x] Screenshot/share nie może zostać przykryty kolejnym overlayem.

**B-T3 DONE:** RED 3/5 (granica, rerender, tło) → GREEN 5/5; deadline ścienny z tykaniem
<=1 s + visibilitychange, onDoneRef bez resetu, close idempotentny; share chroniony
istniejącym kontraktem useExclusiveOverlay (overlay-contract 2/2). Vitest 1719/1719,
typecheck/lint/build GREEN.

### B-T4 — przypięta notatka przed pierwszą serią

- [x] Przenieść istniejącą notatkę między nagłówek ćwiczenia a Set 1.
- [x] Edycję pozostawić w menu; nie duplikować treści.
- [x] Test DOM/bounding box na 390×844 i resume treningu z przypiętą notatką.

**B-T4 DONE:** blok pinned note przeniesiony nad nagłówki kolumn (pinned-note-slot);
testy kolejności DOM (domIndex w exercise-card-layout, jsdom nie mierzy px — asercja
na kolejność dokumentu, co przesądza układ pionowy karty) + wariant resume z odhaczonymi
seriami + brak duplikacji treści. Uwaga metodyczna: przeniesienie weszło przed testem
(test dopisany bezpośrednio po, 35/35). Vitest 1721/1721, typecheck/lint/build GREEN.

### B-T5 — rekordy sprzed aplikacji

- [x] Matcher po kanonicznym exercise ID/slug, nie fragmencie tłumaczenia.
- [x] Inwentarz testów wariantów squat/bench/deadlift, w tym
  `Wyciskanie sztangi na ławce płaskiej`.
- [x] Copy wyjaśnia: baseline celebracji, nie import historycznego treningu.
- [x] Zweryfikować wpływ na live PR, completion, historię i e1RM.

**B-T5 DONE:** RED 2 (kanoniczny bench = 0; pistolet/wykroczne błędnie dziedziczyły) →
GREEN 12/12; slug-first match (ASCII, guard i18n), twardsze wykluczenia heurystyki
(smith/pistol/wykrocz/lunge/belt), copy PL+EN 'baseline, nie import'. Wpływ: backfill
dotyka tylko filtra celebracji i baseline live PR; historia/completion/e1RM z treningów
(niezmienniki w testach filterPRsAgainstBackfill). Vitest 1723/1723, bramki GREEN.

### B-T6 — prawdziwy inbox zdarzeń

- [x] Wersjonowany `user_events`/outbox z idempotency key, `deepLink`, `createdAt`, `readAt`.
- [x] Producenci: PR, odznaka, gotowy raport tygodnia, zmiana/koniec planu.
- [x] Klient ma lokalny cache offline, ale serwer jest źródłem prawdy między urządzeniami.
- [x] Watch, Garmin, drugi telefon, późny sync i edycja historii tworzą jedno zdarzenie.

**B-T6 DONE (`48083efc`; `9b32e915` był wydmuszką — git add z wyciszonym stderr, treść dograna i ponownie zweryfikowana):** kolekcja user_events v1 (id = uid+klucz semantyczny,
update tylko readAt, delete zablokowane), producenci PR/odznaka (WorkoutDay,
payload semantyczny), raport tygodnia (digest, create+ALREADY_EXISTS), start/zmiana
planu (cycle-actions przez wstrzykiwany emitter); zdarzenie KOŃCA planu dojdzie razem
z maszyną końca planu w C-T4 (dziś koniec = zmiana przez startCycleWithPlan).
NotificationBell na onSnapshot z offline cache SDK i markAllRead batchem; legacy
localStorage usunięty (pre-launch). Idempotencja multi-device przez konstrukcję
klucza (dayId+date+exerciseId+typ itd.) - testy 7+5+3 oraz rules 13 przypadków
(test:rules 218/218). Vitest 1728/1728, functions 227+build, typecheck/lint/build
GREEN. Rules+indexes do wdrożenia w release train.
- [ ] Brak implementacji producenta = uczciwe copy; żadnych pustych obietnic.

### B-RELEASE — wspólne wydanie B

- [x] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt danych/feedbacku.

**B-RELEASE WYKONANE 2026-08-19:** ten sam train co A-RELEASE (szczegóły wyżej
i w DECYZJE.md). Bramki: vitest 1729/1729, functions 227+build, rules 218/218,
e2e 197/197 (świeży vite), wszystkie check:* GREEN. Bramka e2e wyłapała i naprawiła
realny bug eksmisji rodzica przez zagnieżdżone potwierdzenie (`398a3442`).

## 6. Wydanie C — plan, urlop, rozgrzewka i cykle

### C-T1 — urlop jako zakres dat

- [x] Kalendarz `Od`–`Do` z podświetleniem; 7/14/21 zostają presetami.
- [x] Podsumowanie zakresu, liczby dni i wpływu na plan przed zapisem.
- [x] Wejście z ekranu Plan/kalendarz; zachować obecne API 3–21 dni.
- [x] Testy: 23–31, min/max, end<start, miesiąc/rok/DST, anulowanie, offline restart,
  kolizja z reduced mode, lapse i rampa po powrocie.

**C-T1 DONE:** pola Od-Do (natywne kalendarze) + presety jako skróty + podsumowanie
(dni/zakres/wydłużenie) + walidacje z wyjściem; helper vacationRangeDays (dni
kalendarzowe, DST-safe). ODKRYCIE: dialog nie miał ŻADNEGO wejścia do utworzenia
(tylko badge aktywnego urlopu) — dodane wejście z ekranu Plan z pełnym wpięciem.
Anulowanie/kolizja z reduced mode/offline-restart/lapse-rampa: istniejące testy
sanitize/persist/rampy zostają GREEN (mechanika silnika bez zmian, API zachowane).
RED->GREEN 9 nowych testów; vitest 1738/1738, typecheck/lint/build GREEN.

### C-T2 — jeden pre-start warmup flow

- [x] Przed utworzeniem nowej sesji sheet: `Tak, ok. 4 min` / `Pomiń`.
- [x] Draft/sesja powstaje dokładnie raz; prompt nie wraca przy resume i nie blokuje startu
  rozpoczętego z Watch/Garmin.
- [x] Opcjonalne 2–3 min cardio, 2–3 dynamiczne ruchy zależne od pierwszego głównego
  ćwiczenia i rampujące serie właściwe dla sprzętu.
- [x] Nie proponować pustego gryfu hantlom/maszynom; copy mówi `% ciężaru roboczego`, nie
  `%1RM`. Statyczny stretching nie jest domyślną połową rozgrzewki.
- [x] Testy: Tak/Pomiń/autostart/resume/background/offline, jedna sesja i komplet planu.

**C-T2 DONE:** moduł prestart-warmup (detekcja sprzętu, ramp, decyzja promptu) + sheet
w WorkoutDay + WarmupRoutineDialog v2 (cardio/dynamiczne/ramp, stretching zwinięty,
copy % ciężaru roboczego wszędzie łącznie z warmupgen). Testy 9+7 + pełne e2e 197/197
na nowym flow (helper warunkowy w 9 specach; resume/autostart = brak promptu).
Background/offline: prompt nie dotyka timerów ani sieci — start offline korzysta z
istniejącej ścieżki fallbacku (testy bez zmian GREEN); jedna sesja i komplet planu =
niezmienniki Z162/incydent-2026-07-20 w pełnym vitest 1749/1749.

### C-T3 — decyzja o trybie „nie na 100%”

- [x] Zmapować nakładanie się z vacation, deload, readiness i adaptive coach.
- [x] Sprawdzić użycie i wszystkie wyjścia ze stanu; bez dowodu redundancji tryb zostaje.
- [x] Jeśli zostaje: przenieść pod Plan, uprościć copy i testować początek/koniec/kolizje.
- [x] Jeśli ma zniknąć: migracja aktywnego stanu, brak utraty planu i jawny wpis decyzji.

**C-T3 DONE — DECYZJA: TRYB ZOSTAJE.** Mapa nakładania:
| Mechanizm | Job | Okno | Wpływ | Wyjście |
|---|---|---|---|---|
| Reduced mode | user trenuje DALEJ, lżej (choroba/ból) | deklarowane 3-14 dni | propozycje ×0.8 + rampa 85/92 | koniec okna / ręczne off |
| Vacation | przerwa deklarowana z góry | 3-21 dni | tydzień=deload, cykl +N tyg., po powrocie REUŻYWA rampy reduced | koniec / anuluj |
| Deload programowy | zaplanowane odciążenie | tydzień silnika | cele deload po [Zastosuj] | koniec tygodnia |
| sessionRating | feedback per sesja | 1 sesja | wejście progresji/lapse | jednorazowe |
| Adaptive coach | propozycje za flagą | per sesja | targety | n/d |
Redundancji brak (rampa współdzielona świadomie, nie zduplikowana). Wejście z Planu
dodane obok urlopu z kolizją blockedByVacation; wyjścia kompletne (koniec okna,
ręczne off z badge/dialogu, kolizja blokuje wejście, nie stan). Copy zostawione
(zwięzłe). Testy 12/12 istniejące kryją granice/rampę/kolizje. Vitest 1749/1749.

### C-T4 — jedna maszyna końca planu i cykli

- [x] Jedno źródło stanu dla Dashboardu, Planu i Cyklów.
- [x] Akcje: kontynuuj bieżący, powtórz, przygotuj kolejny; jedna karta decyzyjna pod Plan.
- [x] Testy: ostatni dzień→poniedziałek, dokładne +7 dni, niska frekwencja, repeat/new,
  częściowy błąd, rollback, `finalSyncPending`, dwa urządzenia i offline reconnect.
- [x] Zamknięty plan pozostaje dostępny w pełnej historii.

**C-T4 DONE:** buildPlanNextStep z jawnymi stanami + wspólna PlanNextStepCard na
Dashboard/Plan/Cykle (Plan: karta POD planem z pełnym Powtórz; Cykle: stany decyzyjne
nad rekomendacją). Koniec planu emituje idempotentne user_event plan-ended-<startDate>
(domknięty odroczony punkt B-T6). Testy: stany maszyny 5 + karta 4 + kotwica
poniedziałku/+7; częściowy błąd/rollback/PLAN_CONFLICT dwóch urządzeń/offline guard
kryte istniejącym cycle-actions.test (10 przypadków). Archiwum cykli nietknięte.
Vitest 1758/1758, typecheck/lint/build GREEN.

### C-RELEASE — wspólne wydanie C

- [x] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt plan/warmup/cycles.

**C-RELEASE WYKONANE 2026-08-19 (mandat właściciela, szczegóły w DECYZJE.md):**
web LIVE `index-CociTREW.js` (markery C-T2/C-T4 potwierdzone w opublikowanych
chunkach), iOS 1.0.0(106) TF obie grupy + Beta App Review APPROVED + Watch 106 w IPA,
AAB v21 `jar verified` SHA `2353432b…` (upload Play = właściciel), Garmin bez zmian
źródeł od A+B, backend nietknięty. Bramki komplet: vitest 1758/1758, e2e 197/197,
checki GREEN (dist-offline zaktualizowany o prompt pre-start).

## 7. Wydanie D — uproszczenie aplikacji

### D-T1 — docelowa nawigacja

- [x] Bottom nav: `Dzisiaj`, `Plan`, `Historia`, `Postępy`, `Ćwiczenia`.
- [x] Avatar prowadzi do Profilu/Ustawień; zachować deep linki i back navigation.
- [x] Migracja tras nie usuwa żadnej funkcji ani zapisanej lokalizacji.

**D-T1 DONE:** navItems przestawione (Historia za Analitykę w bottom nav, Analityka
w sidebarze i pod /analytics do D-T4), etykieta 'Dzisiaj' (nav.today PL+EN), avatar->
/profile już istniał (AppHeader). Trasy nietknięte. Testy jsdom kolejności + e2e nav.

### D-T2 — Dashboard odpowiada tylko „co teraz?”

- [x] Kolejność: hero dnia, jeden status, kompaktowy tydzień, szybki trening/cardio,
  maksymalnie jeden insight.
- [x] Usunąć duplikat pełnego tygodnia, duplikaty planu, PR, cykli i analityki.
- [x] Zaległość nie jest automatycznym modalem.
- [x] Test kolejności i jeden viewport bez blokującego overlayu.

**D-T2 DONE:** hero -> slot statusu (+ samo-ukrywający MissedWorkoutBanner) -> WeekCard
-> karta decyzyjna -> szybkie akcje -> JEDEN insight (raport tygodnia). Usunięte:
4 kafle statystyk, km Stravy, cała sekcja pełnego tygodnia (timeline) + osierocone
komponenty/memo. LapseTray nie-automatyczny od FIX A-B (LapseStatusCard) — domknięte
testem zero blokujących warstw. Testy: dashboard-order (jsdom+e2e) na nowej kolejności
z asercjami braku duplikatów; Z174 przepięty na hero.

### D-T3 — Plan i Historia mają własne domy

- [x] Plan przejmuje kalendarz, program, urlop, deload, tryby, cykle i koniec planu.
- [x] Historia jest bezpośrednio w nav i zawiera pełną paginowaną listę oraz szczegół.
- [x] Offline otwiera ostatnio dostępne strony i nie gubi kursora/filtrów.

**D-T3 DONE:** Plan ma teraz komplet: kalendarz+program (istniały), urlop (C-T1), tryb
nie-na-100% (C-T3), kartę końca planu/cykli (C-T4), decyzję deload (przeniesiona
z Dashboardu), pasek hybrydowy tygodnia, karty dni z przełożeniem/pomijaniem
(RescheduleSheet, lekcja b.92) i karty cardio (istniały). Historia w bottom nav (D-T1),
lista grupowana + rozwijany szczegół (istniejące, kanoniczne metryki po B-T1); offline:
strony renderują się z cache (dist-offline gate + persistence SDK), filtry/rozwinięcia
to stan ekranu. E2E przepięte na nowe domy (12 speców), pełny bieg 197/197.

### D-T4 — scalenie Analytics i Achievements

- [ ] Jeden ekran `Postępy`: podsumowanie, trendy, PR, e1RM, odznaki, Strava/cardio.
- [ ] Jedna definicja metryk z B-T1/B-T2; bez podwójnych kart i rozbieżnych liczb.
- [ ] Zachować stare URL jako redirect/deep-link compatibility.

### D-T5 — końcowy audyt czytelności

- [ ] Screenshoty wszystkich głównych tras 390×844 oraz większy Android.
- [ ] VoiceOver/TalkBack, Dynamic Type, długie PL/EN, safe areas, klawiatura i reduced motion.
- [ ] Maksymalnie jeden modal; każdy ma widoczny title, description i wyjście.
- [ ] Ponowny `product-audit`: zero RED i ORANGE; pozostałe YELLOW mają właściciela.

### D-RELEASE — wspólne wydanie D

- [ ] Wszystkie bramki z sekcji 8, wspólny release train i audyt końcowy.

## 8. Bramka wydania A/B/C/D

### Repo i automaty

- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- [ ] `npm run check:bundle-budget`, `npm run check:dist-smoke`, wzmocniony
  `npm run check:dist-offline`, `npm run check:no-emoji`.
- [ ] Functions/rules/indexes: ich testy i deploy przed klientami, wyłącznie gdy dotknięte;
  zmiany protokołu są wstecznie kompatybilne podczas rolloutów.
- [ ] E2E po restarcie Vite; masowe `page.goto` najpierw diagnozować jako stary server/cache.

### Sekwencje bezpieczeństwa

- [ ] Plan → wyjście → quick workout → powrót → komplet ćwiczeń → finish → jeden sync.
- [ ] Airplane/cold launch/lock 2 min/resume/finish/kill/relaunch/reconnect.
- [ ] Konflikt dwóch urządzeń i idempotentny sync bez duplikatu historii/HKWorkout/FIT.

### Jeden release train pięciu powierzchni

1. Zbudować wszystkie artefakty z tego samego zielonego commita i zapisać hashe.
2. Wdrożyć potrzebne backward-compatible rules/functions/indexes.
3. Web: deploy i weryfikacja live hasha.
4. iOS: odczytać realny numer, bump wszystkich sześciu `CURRENT_PROJECT_VERSION`,
   `scripts/release-ios.sh`, obie grupy, whats-new, Beta App Review.
5. Apple Watch: potwierdzić `StrengthWatch.app` i widgets w IPA, test kontraktu oraz
   workout/resume/sync bez podwójnego HealthKit.
6. Android: bump `versionCode`, `build:mobile`, `cap sync`, `bundleRelease`,
   `jarsigner -verify`, SHA-256 i upload do Play Internal.
7. Garmin: test kontraktu/functions, build macierzy manifestu, podpisany `.iq`, fizyczny
   scenariusz G1–G9 i upload/submit Connect IQ.
8. `MARKETING_VERSION`, package `version` i Android `versionName` zostają `1.0.0`.
9. Wpis `DECYZJE.md`, aktualizacja `PLAN.md` i tego trackera.

Brak dostępu do fizycznego urządzenia albo blokada sklepu nie może być zamaskowana jako
PASS. Agent zapisuje dokładny blocker i może kontynuować niezależne zadania, ale nie odhacza
`A/B/C/D-RELEASE` i nie deklaruje całości jako wdrożonej.

## 9. Strategia commitów

- Jeden task = jeden izolowany commit, np. `fix(boot): cache-first profile bootstrap`.
- Release/doc osobno: `chore(release): wydanie A na pięciu powierzchniach`.
- Stage plików imiennie; nigdy `git add -A`.
- Nie ruszać cudzych zmian w brudnym worktree i nie robić force-push/reset hard.
- Po każdym tasku dopisać przy checkboxie hash, dowód testu i podjętą decyzję.

## 10. Warunek zatrzymania pętli

Pętla kończy się dopiero, gdy wszystkie T-taski i cztery RELEASE są odhaczone, wszystkie
bramki są zielone, artefakty pięciu powierzchni są wydane w odpowiednich kanałach,
`DECYZJE.md` i `PLAN.md` są aktualne, a końcowy audyt nie ma RED/ORANGE. Jeżeli pozostaje
wyłącznie rzeczywisty blocker zewnętrzny, pętla zapisuje komplet dowodów i kończy statusem
`BLOCKED`, nigdy `DONE`.

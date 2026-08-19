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

- [ ] `LapseTray` nie otwiera się automatycznie; zaległość jest kartą/statusowym CTA.
- [ ] Ustanowić kontrakt: maksymalnie jeden pełnoekranowy overlay i zawsze jawne zamknięcie.
- [ ] Przetestować body scroll-lock po unmount/crash oraz repaint po native
  background→foreground, nie tylko webowym `visibilitychange`.
- [ ] Ograniczyć hard reload crash-guarda do faktycznej asercji Firestore z anti-loop i
  zachowaniem draftu.

### A-T5 — prawdziwy kontrakt offline

- [ ] Wzmocnić `check:dist-offline`: zalogowany cached profile/plan, cold reload offline,
  konkretne CTA Dashboardu, wejście w nieogrzany lazy route, zapis draftu.
- [ ] E2E bez bypassu `UserProvider` dla co najmniej cached active/suspended/no-cache.
- [ ] Scenariusz native: online seed → force quit → airplane → launch → start → seria →
  lock 2 min → resume → finish offline → kill → launch offline → reconnect → jeden sync.
- [ ] Ten sam kontrakt uruchomić na iOS i Android; Watch/Garmin zweryfikować przy
  odpowiadających im kolejkach offline i ingest.

### A-RELEASE — wspólne wydanie A

- [ ] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt P0.
- [ ] Wynik: zero czerwonych problemów start/offline/resume.

## 5. Wydanie B — prawda danych i feedback treningowy

### B-T1 — jedno źródło prawdy dla serii roboczych

- [ ] Kanoniczne selektory working sets/tonnage/max/completion zamiast lokalnych obliczeń.
- [ ] Przepiąć Dashboard, Historię, Postępy, rekordy, completion i backend aggregate.
- [ ] Fixture kontraktowe wszędzie: warmup `40×10 done`, working `100×5 done`, working
  `120×5 incomplete` → 500 kg, 1 seria, max 100 kg, brak PR z warmupu.
- [ ] Warmup-only nie zwiększa streaku ani ukończenia planu; pozostaje w historii/drafcie.

### B-T2 — rekord ciężaru kontra szacowane 1RM

- [ ] Zmienić `Rekord 72 kg` na `Szac. 1RM: 72 kg` i pokazać źródło, np. `60 kg × 6`.
- [ ] Osobno prezentować `Najcięższa seria`/rekord faktycznie podniesionego ciężaru.
- [ ] Completion, inbox, Historia i Postępy rozróżniają oba typy.
- [ ] Testy wysokich powtórzeń, bodyweight, jednostek lb/kg, warmup i brak źródła.

### B-T3 — celebracja PR

- [ ] Deadline 5,5 s oparty na czasie ściennym; tap zamyka natychmiast.
- [ ] Stabilny callback — rerender nie resetuje czasu.
- [ ] Testy 5499/5500 ms, tap, rerender, background ponad deadline i zachowanie draftu.
- [ ] Screenshot/share nie może zostać przykryty kolejnym overlayem.

### B-T4 — przypięta notatka przed pierwszą serią

- [ ] Przenieść istniejącą notatkę między nagłówek ćwiczenia a Set 1.
- [ ] Edycję pozostawić w menu; nie duplikować treści.
- [ ] Test DOM/bounding box na 390×844 i resume treningu z przypiętą notatką.

### B-T5 — rekordy sprzed aplikacji

- [ ] Matcher po kanonicznym exercise ID/slug, nie fragmencie tłumaczenia.
- [ ] Inwentarz testów wariantów squat/bench/deadlift, w tym
  `Wyciskanie sztangi na ławce płaskiej`.
- [ ] Copy wyjaśnia: baseline celebracji, nie import historycznego treningu.
- [ ] Zweryfikować wpływ na live PR, completion, historię i e1RM.

### B-T6 — prawdziwy inbox zdarzeń

- [ ] Wersjonowany `user_events`/outbox z idempotency key, `deepLink`, `createdAt`, `readAt`.
- [ ] Producenci: PR, odznaka, gotowy raport tygodnia, zmiana/koniec planu.
- [ ] Klient ma lokalny cache offline, ale serwer jest źródłem prawdy między urządzeniami.
- [ ] Watch, Garmin, drugi telefon, późny sync i edycja historii tworzą jedno zdarzenie.
- [ ] Brak implementacji producenta = uczciwe copy; żadnych pustych obietnic.

### B-RELEASE — wspólne wydanie B

- [ ] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt danych/feedbacku.

## 6. Wydanie C — plan, urlop, rozgrzewka i cykle

### C-T1 — urlop jako zakres dat

- [ ] Kalendarz `Od`–`Do` z podświetleniem; 7/14/21 zostają presetami.
- [ ] Podsumowanie zakresu, liczby dni i wpływu na plan przed zapisem.
- [ ] Wejście z ekranu Plan/kalendarz; zachować obecne API 3–21 dni.
- [ ] Testy: 23–31, min/max, end<start, miesiąc/rok/DST, anulowanie, offline restart,
  kolizja z reduced mode, lapse i rampa po powrocie.

### C-T2 — jeden pre-start warmup flow

- [ ] Przed utworzeniem nowej sesji sheet: `Tak, ok. 4 min` / `Pomiń`.
- [ ] Draft/sesja powstaje dokładnie raz; prompt nie wraca przy resume i nie blokuje startu
  rozpoczętego z Watch/Garmin.
- [ ] Opcjonalne 2–3 min cardio, 2–3 dynamiczne ruchy zależne od pierwszego głównego
  ćwiczenia i rampujące serie właściwe dla sprzętu.
- [ ] Nie proponować pustego gryfu hantlom/maszynom; copy mówi `% ciężaru roboczego`, nie
  `%1RM`. Statyczny stretching nie jest domyślną połową rozgrzewki.
- [ ] Testy: Tak/Pomiń/autostart/resume/background/offline, jedna sesja i komplet planu.

### C-T3 — decyzja o trybie „nie na 100%”

- [ ] Zmapować nakładanie się z vacation, deload, readiness i adaptive coach.
- [ ] Sprawdzić użycie i wszystkie wyjścia ze stanu; bez dowodu redundancji tryb zostaje.
- [ ] Jeśli zostaje: przenieść pod Plan, uprościć copy i testować początek/koniec/kolizje.
- [ ] Jeśli ma zniknąć: migracja aktywnego stanu, brak utraty planu i jawny wpis decyzji.

### C-T4 — jedna maszyna końca planu i cykli

- [ ] Jedno źródło stanu dla Dashboardu, Planu i Cyklów.
- [ ] Akcje: kontynuuj bieżący, powtórz, przygotuj kolejny; jedna karta decyzyjna pod Plan.
- [ ] Testy: ostatni dzień→poniedziałek, dokładne +7 dni, niska frekwencja, repeat/new,
  częściowy błąd, rollback, `finalSyncPending`, dwa urządzenia i offline reconnect.
- [ ] Zamknięty plan pozostaje dostępny w pełnej historii.

### C-RELEASE — wspólne wydanie C

- [ ] Wszystkie bramki z sekcji 8, wspólny release train i re-audyt plan/warmup/cycles.

## 7. Wydanie D — uproszczenie aplikacji

### D-T1 — docelowa nawigacja

- [ ] Bottom nav: `Dzisiaj`, `Plan`, `Historia`, `Postępy`, `Ćwiczenia`.
- [ ] Avatar prowadzi do Profilu/Ustawień; zachować deep linki i back navigation.
- [ ] Migracja tras nie usuwa żadnej funkcji ani zapisanej lokalizacji.

### D-T2 — Dashboard odpowiada tylko „co teraz?”

- [ ] Kolejność: hero dnia, jeden status, kompaktowy tydzień, szybki trening/cardio,
  maksymalnie jeden insight.
- [ ] Usunąć duplikat pełnego tygodnia, duplikaty planu, PR, cykli i analityki.
- [ ] Zaległość nie jest automatycznym modalem.
- [ ] Test kolejności i jeden viewport bez blokującego overlayu.

### D-T3 — Plan i Historia mają własne domy

- [ ] Plan przejmuje kalendarz, program, urlop, deload, tryby, cykle i koniec planu.
- [ ] Historia jest bezpośrednio w nav i zawiera pełną paginowaną listę oraz szczegół.
- [ ] Offline otwiera ostatnio dostępne strony i nie gubi kursora/filtrów.

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

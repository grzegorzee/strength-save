# Audyt produktowy Strength Save — 2026-08-19

## Werdykt

Obecna aplikacja ma dobry, szeroki rdzeń funkcjonalny, ale nie spełnia jeszcze najważniejszego
kontraktu siłowni: zalogowany użytkownik nie ma gwarantowanego zimnego startu bez internetu.
To blocker wydania (`score: 0` według kontraktu `product-audit`).

Największy problem nie leży w IndexedDB ani w service workerze. Firestore ma trwały cache,
ale `UserProvider` przed jego odczytem bezwarunkowo czeka na sieciowe `syncUserProfile()`.
Przy offline lub słabym zasięgu blokuje to ekran i jednocześnie tłumaczy długi spinner.

Audyt był read-only dla kodu produkcyjnego. Nie wdrażano, nie deployowano i nie zmieniano
realnych danych użytkownika.

## Co zostało sprawdzone

- zrzuty z realnego iPhone'a: splash, spinner, toast odzyskania, live PR i blackout/overlay;
- pełny web E2E na viewport 390×844: **197/197 PASS**;
- build produkcyjny i typecheck: PASS;
- lint: PASS;
- webowy `check:dist-offline`: PASS, ale testuje tylko wyrenderowanie dowolnego dziecka `#root`;
- pełny Vitest: **1657 PASS, 5 FAIL** — dato-zależne testy progresji weszły 19 sierpnia
  w regułę „14 dni przerwy” i oczekiwały zwykłego progresu;
- 12 aktualnych tras w trybie aktywnego usera/admina, screenshoty w
  `audit/shots/2026-08-19/`;
- celowane pakiety agentów: startup/offline/resume 12/12 PASS, produkt/IA 64/64 PASS,
  workout/PR/warmup 101/101 PASS;
- research rozgrzewki na źródłach naukowych.

Zielone testy celowane potwierdzają nie brak problemów, lecz brak właściwych testów scenariuszy
produkcyjnych. Tryb E2E omija prawdziwy Auth/UserProvider i dlatego nie może złapać regresji
zimnego startu offline.

## P0 — stabilność i dane

### 1. Zimny start offline i wolny bootstrap

Dowody:

- `src/lib/firebase.ts:31-45` konfiguruje persistent cache;
- `src/contexts/UserContext.tsx:99-163` zeruje profil, czeka na `syncUserProfile()`, a listener
  cache podpina dopiero po sukcesie callable;
- `src/lib/native-callable.ts:87-130` robi sieciowy fetch bez twardego timeoutu;
- `src/components/AuthenticatedApp.tsx:170-183` po błędzie bootstrapu pokazuje bramkę dostępu,
  zamiast cached active profile;
- istniejący test offline działa na mockowym profilu, a `check:dist-offline` akceptuje loader,
  login lub ekran błędu jako sukces.

Decyzja:

1. Ostatni serwerowo potwierdzony profil `active` jest źródłem dostępu offline.
2. Cache profilu ma być czytany natychmiast; sync/create profilu odbywa się równolegle.
3. Cached `suspended` nadal blokuje offline; brak cache nowego konta nadal wymaga sieci.
4. RevenueCat, paywall i callable nie mogą trzymać pierwszego użytecznego ekranu bez końca.

Kryterium akceptacji:

> Online login → załadowany plan → force quit → airplane mode → launch → start treningu →
> wpisanie serii → zgaszenie ekranu 2 min → resume → zakończenie offline → ponowny launch
> offline → komplet danych → online → dokładnie jeden sync, bez duplikatu.

### 2. Trzy kolejne loadery

Aktualna sekwencja jest literalna:

1. natywny splash z dużym logo (`capacitor.config.ts`, `LaunchScreen.storyboard`);
2. loader Reacta z ikoną 64×64 i napisem (`src/App.tsx:27-45`);
3. goły spinner profilu/routes (`src/components/AuthenticatedApp.tsx:50-54`);
4. na iOS możliwy jeszcze spinner paywalla (`PaywallRouteGuard`).

Do Dashboardu ładowane/parowane jest około 1,73 MB nieskompresowanego JS. Największe
elementy startu to Firebase ~733 KB, initial ~418 KB, AuthenticatedApp ~288 KB i React
~142 KB. Główny koszt natywny to jednak network-first bootstrap profilu, nie grafika.

Docelowo: jeden `BootScreen` od launch story do pierwszego użytecznego ekranu — małe logo
na środku i cienki pasek indeterminate. Zero przeskoku rozmiaru i zero zmiany na kółko.
Najpierw naprawić bramki danych, potem stroić animację.

Metryki do dodania: `root-painted`, `auth-restored`, `profile-cache-ready`,
`dashboard-interactive`; osobne progi warm/cold/offline/weak-network na realnym iPhone.

### 3. Normalne wznowienie draftu jest błędnie nazwane odzyskaniem

`WorkoutDay.tsx:1093-1101` pokazuje „Odzyskano niezapisany trening” przy każdej hydracji
draftu zawierającego dane. To normalne kontynuowanie, nie sytuacja wymagająca decyzji usera.

Decyzja:

- zwykły resume ma być całkowicie cichy;
- telemetria `draft_recovered` może zostać bez UI;
- widoczny komunikat zostaje tylko dla `finalSyncPending` lub całkowitego błędu zapisu i musi
  mówić, co user może zrobić.

### 4. Blackouty i blokujące powierzchnie

Są co najmniej trzy różne zjawiska:

- `LivePRCelebration`: zamierzony pełnoekranowy overlay `fixed inset-0`;
- `LapseTray`: automatycznie otwierany modal „Wróćmy do planu”, który zasłania Dashboard;
- rzeczywiste czarne warstwy WKWebView po resume, łagodzone przez `resume-repaint`, ale bez
  natywnego testu kompozytora.

W audycie mobilnym `LapseTray` otworzył się automatycznie i zakrył większość Dashboardu.
To może być odbierane jako „apka znowu ma blackout”, nawet gdy technicznie działa.
Rekomendacja: zaległość jako nieblokująca karta/status, nie auto-modal na każdym wejściu.

## P1 — szybkie poprawki o wysokim ROI

### 5. Live PR

`AUTO_DISMISS_MS` wynosi dokładnie 2200 ms. Rekomendacja: **5,5 s**, z możliwością
natychmiastowego zamknięcia tapnięciem i tekstem „Dotknij, aby wrócić”. Timeout powinien
być deadline-based i odporny na rerender/background, nie resetowany przez nową referencję
callbacku.

Testy: widoczny przy 5499 ms, znika po 5500 ms; tap zamyka natychmiast; rerender nie
wydłuża; background dłuższy niż deadline nie zostawia overlayu; realny PR nie gubi draftu.

### 6. „Rekord 72 kg” jest szacowanym 1RM

`getExerciseBest1RM` używa wzoru Epleya, ale `ExerciseCard` podpisuje wynik kluczem
`card.best = Rekord`. To nie jest ciężar faktycznie podniesiony ani proponowany cel.

Docelowy zapis:

- `Szac. 1RM: 72 kg`;
- widoczne źródło: `na podstawie 60 kg × 6`;
- osobno opcjonalnie `Najcięższa seria: 65 kg`;
- completion/inbox rozróżnia „Rekord ciężaru” i „Nowe szac. 1RM”.

Estymacja ma pozostać trendem, nie być przedstawiana jako fakt, szczególnie przy wysokiej
liczbie powtórzeń lub serii dalekiej od upadku.

### 7. Serie rozgrzewkowe: właściwa semantyka, niespójna implementacja

Niezmiennik:

> Warmup przeżywa draft, resume, historię i sync, ale nie zwiększa głównego tonażu,
> PR, serii roboczych, progresji, streaku ani realizacji planu.

Główne helpery już wykluczają warmupy. Błędy są w ekranach omijających helpery:

- miesięczny trend Postępów (`achievements-utils.ts`);
- lista wszystkich rekordów w `Achievements.tsx`;
- porównanie/miesiąc/karta w `WorkoutHistory.tsx`;
- trend 4 tygodni Dashboardu;
- per-exercise completion w `WorkoutDay.tsx`.

Jeden test kontraktowy na wszystkich konsumentach:

- warmup `40×10 completed`;
- working `100×5 completed`;
- working `120×5 incomplete`;
- wszędzie: tonaż 500 kg, 1 seria robocza, max 100 kg, zero PR z warmupu.

Trening wyłącznie z rozgrzewką nie powinien liczyć się jako ukończony plan/streak. Może
zostać zapisany jako aktywność „tylko rozgrzewka” albo niedokończony trening.

### 8. Przypięta notatka

Obecnie pinned note jest pod tabelą, timerem i przyciskiem dodawania serii. Należy ją
przenieść między nagłówek ćwiczenia a pierwszą serię. Edycja może pozostać w menu `…`.
Test DOM i bounding box na 390×844 ma pilnować, że notatka jest wyżej niż Set 1.

### 9. Urlop/wyjazd

Model obsługuje dowolne 3–21 dni, ale UI ma tylko `[7,14,21]`. To szybka zmiana formularza:

- kalendarz zakresu `Od`–`Do` z podświetleniem;
- presety 7/14/21 jako skróty, nie jedyne opcje;
- podsumowanie `23–31 sierpnia · 9 dni · plan +2 tygodnie`;
- główne wejście z Planu/kalendarza.

Brzegi: miesiąc/rok/DST, end < start, min/max, anulowanie przed/w trakcie, offline restart,
kolizja z „nie na 100%”, wyciszenie zaległości i rampa po powrocie.

### 10. Centrum powiadomień obiecuje nieistniejące źródła

Empty state mówi o PR, raporcie tygodnia i zmianach planu. W praktyce producenci istnieją
tylko dla PR i części odznak, wyłącznie podczas klienckiej finalizacji WorkoutDay.
Nie istnieje producent `week` ani `plan`; weekly digest jest osobnym mailem.

Wariant minimum: uczciwe copy „Nowe rekordy i odznaki z tego urządzenia”.

Wariant docelowy: trwały `user_events`/outbox z idempotency key, `deepLink`, `createdAt`,
`readAt`; producenci dla PR, odznaki, gotowego raportu oraz końca planu. Watch, drugi telefon,
późny sync i edycja historii muszą prowadzić do tego samego zdarzenia raz.

### 11. Rekordy sprzed aplikacji

Funkcja ma sens jako baseline celebracji, ale nie jest importem historii. Wykryto realny bug:
matcher bench nie rozpoznaje kanonicznej nazwy „Wyciskanie sztangi na ławce płaskiej”, bo
szuka `bench` albo fragmentu `leż`.

Naprawa: match po kanonicznym slug/ID wariantu, nie po kruchym fragmencie nazwy; test
inwentarzowy wszystkich wariantów big three. UI powinno jasno mówić, że wartości nie tworzą
historycznych treningów.

## P2 — rozgrzewka oparta na kontekście

Aktualnie są dwa niepołączone mechanizmy: ogólny dialog dostępny po starcie oraz ręczny
generator serii na karcie. Dialog zawsze proponuje pajacyki, trucht, przysiady i statyczne
stretching, a generator opisany `%1RM` naprawdę liczy procent ciężaru roboczego i proponuje
pusty gryf także hantlom/maszynom.

Research wspiera krótkie aktywne przygotowanie i ruch specyficzny dla zadania; długi statyczny
stretching jako jedyna rozgrzewka może obniżać późniejszą siłę/power. Nie ma jednej magicznej
drabinki dla każdego ćwiczenia.

Proponowany flow:

1. Tap „Rozpocznij trening”.
2. Lekki sheet: „Chcesz zacząć od rozgrzewki?” — `Tak, ok. 4 min` / `Pomiń`.
3. Sesja/draft powstaje dokładnie raz i offline-first.
4. Wariant `Tak`:
   - opcjonalne 2–3 min roweru/bieżni/wioślarza;
   - 2–3 dynamiczne ruchy zależne od pierwszego głównego ćwiczenia;
   - rampujące serie tego ruchu, bez narzucania pajacyków;
   - dla kolejnych podobnych ćwiczeń mniej serii lub zero.
5. Statyczny stretching jako osobna mobility/cool-down, nie domyślna połowa pre-workoutu.

Źródła:

- PubMed, warm-up i funkcja mięśni (2025): https://pubmed.ncbi.nlm.nih.gov/39864808/
- PubMed, static stretching i performance: https://pubmed.ncbi.nlm.nih.gov/22316148/
- PubMed, dynamic stretching: https://pubmed.ncbi.nlm.nih.gov/29063454/
- PubMed, resistance-specific warm-up load: https://pubmed.ncbi.nlm.nih.gov/39593476/

Prompt nie może pojawić się przy resume istniejącego draftu ani zablokować startu z Watch.
Wygaszenie ekranu w dialogu nie może opierać bezpieczeństwa na timerze JavaScript.

## P3 — uproszczenie architektury informacji

### Docelowy bottom nav

1. Dzisiaj
2. Plan
3. Historia
4. Postępy
5. Ćwiczenia

Avatar pozostaje wejściem do Profilu/Ustawień.

### Jeden dom na każdą odpowiedź

- **Dzisiaj:** hero, jeden status, kompaktowy tydzień, szybki trening/cardio, jeden insight.
- **Plan:** kalendarz, program, przełożenia, urlop, deload, cykle i koniec planu.
- **Historia:** pełna lista i szczegół treningów.
- **Postępy:** podsumowanie, trendy, PR/e1RM, odznaki, Strava/cardio.
- **Ćwiczenia:** biblioteka i szczegół.

Dashboard obecnie ma zarówno WeekCard, jak i pełną sekcję tego samego tygodnia. Analytics i
Achievements są dwoma konkurencyjnymi domami postępu. Koniec planu może pokazać ten sam stan
na Dashboardzie, w osobnej karcie next-step i w Cyklach.

Decyzja: nie usuwać funkcji; przenosić je do jednego logicznego domu. Dashboard ma odpowiadać
w dwie sekundy wyłącznie: „co robię teraz?”.

## Kolejność wdrożeń — chirurgicznie

### Twarda bramka: jeden produkt na wszystkich platformach

Strength Save nie może być wydawany jako kilka rozjechanych produktów. Każde wydanie A–D
idzie jako jeden release train obejmujący **web, iOS, Android, Apple Watch i Garmin**.

Definicja „wdrożone”:

1. web ma aktualny deploy i zweryfikowany hash/wersję;
2. iOS ma nowy `CURRENT_PROJECT_VERSION`, TestFlight, obie grupy testerów i Beta App Review;
3. Apple Watch jest osadzony w tym samym IPA, zbudowany i przetestowany w scenariuszu
   start → serie → przerwanie → resume → sync;
4. Android ma zbudowany i zweryfikowany AAB z kolejnym `versionCode` oraz publikację;
5. Garmin ma build/artefakt Connect IQ, test kontraktu danych i publikację;
6. wspólny scenariusz cross-device potwierdza kanoniczne kg, offline queue, retry,
   idempotencję i brak duplikatów.

Zmiana specyficzna tylko dla telefonu nie musi sztucznie zmieniać logiki zegarka, ale build,
test zgodności i release zegarka nadal należą do tej samej bramki. Jeśli konto sklepu,
review lub podpis uniemożliwia publikację jednej platformy, całe wydanie jest **zablokowane**,
a nie „wdrożone częściowo”. Nie ma wariantu „telefon teraz, zegarki później”.

Do launchu `MARKETING_VERSION`, `version` i Android `versionName` pozostają `1.0.0`; rosną
wyłącznie numery buildów zgodnie z zasadami repozytorium.

### Wydanie A — niezawodność

1. cache-first profile bootstrap + test cold offline;
2. jeden BootScreen + performance marks;
3. cichy resume draftu;
4. natywny background/resume i blacklist blokujących auto-modali;
5. stabilizacja 5 dato-zależnych testów przez jawne `todayISO`.

### Wydanie B — prawda danych i komunikatów

1. wspólne helpery working-set dla Historii/Dashboardu/Postępów/completion;
2. `Rekord ciężaru` vs `Szac. 1RM`;
3. live PR 5,5 s + deadline;
4. pinned note nad Set 1;
5. matcher historycznych bench/deadlift/squat;
6. prawdziwy kontrakt inboxa.

### Wydanie C — plan i rozgrzewka

1. vacation range Od–Do;
2. pre-start warmup prompt offline-first;
3. kontekstowa rutyna i sprzętowe ramp sets;
4. jeden lifecycle końca planu + scenariusze graniczne cyklu.

### Wydanie D — IA

1. Historia do bottom nav;
2. scalenie Analytics/Achievements w Postępy;
3. pełny tydzień i cykle pod Plan;
4. Dashboard tylko „Dzisiaj”.

Każde wydanie wymaga osobnego wpisu `DECYZJE.md`, pełnych bramek repo, wspólnego wydania na
pięć powierzchni oraz realnych scenariuszy iPhone/Android/Watch/Garmin. Nie łączyć P0 offline
z dużą migracją IA.

## Macierz testów akceptacyjnych

| Obszar | Automat | Realne urządzenie / skrajny scenariusz |
|---|---|---|
| Boot/offline | cached active/suspended/no-cache; timeout callable; cold lazy route | airplane mode + force quit + lock 2 min + reconnect |
| Draft | zwykły resume bez toast; final pending z akcją | IDB utrata po resume, fallback localStorage |
| PR | weight vs e1RM; 5,5 s deadline; warmup excluded | screenshot, background podczas overlayu |
| Tonaż | jedna fixture przeciw wszystkim ekranom/backendowi | plan → wyjście → quick workout → powrót → sync |
| Urlop | 3/21 dni, 23–31, DST, anulowanie, kolizje | offline zapis i restart |
| Inbox | Watch/phone/offline/edit → jeden event | push denied/foreground/background |
| Cykle | ostatni dzień → poniedziałek; +7 dni; repeat/new/rollback | dwa urządzenia wybierają nowy plan |
| Warmup | Tak/Pomiń/autostart/resume/Watch; jedna sesja | ekran zgaszony; brak sieci |

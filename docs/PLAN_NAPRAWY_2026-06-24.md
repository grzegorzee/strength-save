# Plan naprawy Strength Save — 2026-06-24

## Cel i stan wejściowy

Cel: doprowadzić aplikację web + Capacitor iOS/Watch + Firebase Functions do stanu, w którym dane treningowe nie giną ani nie są cicho nadpisywane, dostęp płatny i konto są egzekwowane po stronie zaufanej, a wydanie jest odtwarzalne i testowane na rzeczywistym backendzie.

Plan jest oparty na audycie 10 obszarów z 2026-06-23: architektura, synchronizacja, UI, bezpieczeństwo, testy, wydajność, iOS/Watch, poprawność domenowa, integracje i release engineering.

Aktualne baseline:

- `npm run typecheck`, `npm run lint`, testy aplikacji (380) i Functions (64) przechodzą.
- Build web i Functions przechodzą.
- Istnieje **dirty worktree** zawierający trwające poprawki synchronizacji/push. Nie wolno go resetować, checkoutować ani nadpisywać bez świadomego scalenia.
- Zielone testy nie są dowodem jakości release: CI nie uruchamia wszystkich krytycznych suites i nie wdraża artefaktów Firebase.

## Zasady wykonania

1. Pracuj małymi, atomowymi etapami. Jeden commit/PR nie miesza bezpieczeństwa, synchronizacji i refaktoryzacji UI.
2. Najpierw napisz test reprodukujący błąd, potem minimalną zmianę. Wyjątkiem są wyłącznie zmiany konfiguracji release.
3. Nie zmieniaj schematu danych bez ścieżki zgodności dla istniejących dokumentów i draftów IndexedDB.
4. Nie wdrażaj do produkcji ani nie zmieniaj RevenueCat, Firebase Console, App Store Connect lub sekretów bez osobnej zgody użytkownika.
5. Każdy etap kończy się wskazanymi testami. Błąd blokuje przejście do kolejnego etapu.
6. Nie usuwaj niezwiązanych lokalnych zmian. Przed każdym etapem sprawdź `rtk git status --short` i diff plików w zakresie etapu.

## Kolejność prac

### M0 — kontrola stanu i brakujące test harnessy

**Cel:** mieć wiarygodną bazę do dalszych zmian.

- Zidentyfikuj, które obecne zmiany lokalne są częścią synchronizacji i uruchom ich testy celowane przed edycją.
- Napraw testy `watch-event-router`: użyj `act`/`waitFor`, usuń stałe `50 ms` sleepy i doprowadź run do braku ostrzeżeń React.
- Uczyń test interakcji startu treningu obligatoryjnym; nie może warunkowo pomijać wszystkich asercji.
- Dodaj do CI osobne wymagane kroki: testy Functions, testy reguł Firestore oraz emulatorowe E2E. Mock E2E pozostaje szybkim testem UI, nie testem integracyjnym.
- Dodaj WebKit smoke dla web oraz iOS simulator smoke dla zmian natywnych.

**Akceptacja:** CI wykonuje wszystkie powyższe kroki; test watch-router nie emituje ostrzeżeń; krytyczny workout flow ma przynajmniej jeden emulatorowy test zapisu.

### M1 — P0/P1: autoryzacja, płatności i prywatność

**Cel:** klient nie może sam nadać sobie uprawnień ani zmienić właściciela danych.

1. Zablokuj klientowi zapis `users/{uid}.subscription` w `firestore.rules`. Najlepiej wprowadź pozytywną allowlistę pól profilowych modyfikowalnych przez użytkownika, zamiast rozszerzać denylistę.
2. Dla update kolekcji z `userId` (`workouts`, `measurements`, `weekly_summaries`, `plan_cycles`, telemetry) wymagaj, aby `request.resource.data.userId == resource.data.userId`.
3. Usuń z autoryzacji rejestracji zaufanie do `request.data.platform`. Mobile open-registration wymaga weryfikowalnego App Check/attestation; w przeciwnym razie rejestracja pozostaje invite-only.
4. Uczyń webhook RevenueCat idempotentnym i odpornym na kolejność: zapisz ID eventu i timestamp zdarzenia, przetwarzaj w transakcji, ignoruj duplikaty i starsze eventy.
5. Uczyń usuwanie konta wznawialnym: marker `deletionPending`, idempotentna kolejka/purge danych oraz usunięcie Firebase Auth na końcu. Awaria po częściowym czyszczeniu musi dać się bezpiecznie wznowić.
6. Usuń bieżący token FCM z profilu przed logoutem/switch konta. Docelowo modeluj rejestracje tokenów z właścicielem i `lastSeen`, nie jako bezgraniczną tablicę.
7. Przy błędzie Resend resetuj stan kodu weryfikacyjnego albo użyj stanu `pending_send`; użytkownik nie może dostać cooldownu za niewysłany email.
8. Zabezpiecz publiczną waitlistę App Check + rate limiting; anonimowy request nie może nadpisać istniejącego wpisu.

**Testy obowiązkowe:** emulator rules dla subskrypcji i niezmienności ownera; test RevenueCat renewal(T2) → expiration(T1); test logout A/login B bez push A; test awarii usuwania konta i retry; test awarii Resend i natychmiastowego retry; test rejestracji bez invite z fałszywym platform.

### M2 — P0/P1: integralność treningów, offline i konflikty

**Cel:** żadna udana interakcja użytkownika nie jest tracona, a dwa urządzenia nie nadpisują się po cichu.

1. Zamień warunek konfliktu oparty o `updatedAt` klienta na `expectedRevision`. Transakcja zapisu wymaga równości rewizji i atomowo inkrementuje `revision`; czas jest wyłącznie metadanymi.
2. Wprowadź lokalną wersję draftu/snapshotu. Po ACK oznacz `dirty: false` tylko, jeżeli ACK dotyczy tej samej wersji; nowsza lokalna edycja pozostaje dirty.
3. Wszystkie mutacje `WorkoutDay` aktualizują źródłowy ref synchronicznie lub przechodzą przez jeden reducer. Nie buduj kolejnej zmiany z refa aktualizowanego dopiero przez effect.
4. Serializuj zapisy IndexedDB i odrzucaj spóźnione wyniki. Nie pozwól staremu `persistDraftSnapshot` odtworzyć stanu po nowszym zapisie.
5. Promocja provisional → remote musi być jedną operacją helpera: zapisz docelowy draft, przenieś revision/metadane i usuń stary local ID. Użyj jej w `WorkoutDay`, Sync Center i AutoSync.
6. Sync Center/AutoSync zachowują `cloudRevision` i `cloudUpdatedAt` istniejącej sesji. Nie wolno ustawiać precondition na `null` po promocji.
7. Finalizacja treningu jest idempotentna: stabilne `finalizedAt`, identyczny payload retry i precondition revision. Porównanie treści nie może omijać konfliktu z cudzą, nowszą rewizją.
8. Dodaj ograniczenie liczby aktywnych draftów albo jawny flow wyboru. IndexedDB kluczuje co najmniej `(userId, sessionId)`.

**Testy obowiązkowe:** dwa szybkie edity różnych ćwiczeń; opóźniony ACK A + edycja B; symulacja dwóch urządzeń z rozjechanymi zegarami; offline promotion + reload; retry finalizacji; konflikt w Sync Center; quota/IndexedDB failure.

### M3 — plany, onboarding i cykle

**Cel:** cykle są jednoznaczne, a workflow wieloetapowe można bezpiecznie ponowić.

1. Onboarding zapisuje plan, tworzy active cycle i oznacza profil jako onboarded przez idempotentny workflow. Użyj deterministycznego ID cycle lub trwałego operation ID; retry po ostatnim błędzie nie tworzy duplikatu.
2. Dodaj rewizję planu/precondition zapisu, by edycje na dwóch urządzeniach nie działały last-writer-wins.
3. Merge/delete cycles wykonuj batchowo (≤500) albo przez wznawialną operację ze stanem. Nie zostawiaj części treningów przepiętych, a części starych.
4. PlanBuilder generuje kolizyjnie bezpieczne ID po odtworzeniu draftu (`crypto.randomUUID` lub generator zainicjalizowany istniejącymi ID).
5. Expected/missed sessions licz po kalendarzu od faktycznej daty startu, nie `daysPerWeek * elapsedWeeks`; używaj date-only/calendar arithmetic, nie stałych milisekund doby.

**Testy obowiązkowe:** fail po utworzeniu cycle + retry; równoległe zapisy planu; częściowy fail merge; reload PlanBuilder + add day/exercise; start cyklu w środę; przejście DST 2026-03-29.

### M4 — poprawność domenowa i dane użytkownika

**Cel:** liczby widoczne użytkownikowi są spójne i nie można utrwalić błędnych danych.

1. Wprowadź wspólny predykat historycznych statystyk: wyłącznie ukończony workout i ukończona seria robocza (bez warmup). Zastosuj w PR, achievements, tonnage, trendach i insights.
2. Heatmapa ma oznaczać ukończony trening bodyweight jako workout, nawet gdy zewnętrzny tonnage wynosi 0.
3. Formularz Measurements trzyma wartości kanoniczne kg/cm albo atomowo przelicza wszystkie pola podczas przełączania unit. Waliduj `finite`, dodatnie i rozsądne zakresy również w akcji zapisu/importu.
4. `parseLocalDate` rygorystycznie odrzuca niepoprawne daty; import/migracja nie może normalizować `2026-02-31` do marca.
5. Clampuj/odrzucaj HR > maxHR przed liczeniem TRIMP.

**Testy obowiązkowe:** nieukończony ciężki trening/warmup nie daje PR; completed bodyweight w heatmapie; kg↔lbs bez edycji wartości; ujemne/NaN measurement; leap day i błędne date-only; HR powyżej max.

### M5 — integracje i platformy mobilne

**Cel:** zewnętrzne systemy nie powodują wycieku, kosztów ani trwałej utraty zdarzeń.

1. Wyprowadz URL AI streaming z konfiguracji Firebase/Functions, z jawnym emulator/staging override. Nie może być zahardkodowany production project.
2. Powiąż disconnect HTTP klienta z `AbortController` dla streamu OpenAI; rozlicz usage raz.
3. Daily reminder i Strava scheduler: paginacja + bounded concurrency teraz; przed większą skalą Cloud Tasks i selekcja kandydatów, nie skan całej populacji/historii.
4. Watch bridge używa event IDs i `peek/ack`; nie usuwa zdarzeń przed trwałym zapisem do draftu. Kolejka nie może po cichu trimować niepotwierdzonych danych po 500.
5. Dodaj recovery aktywnej sesji HealthKit po relaunchu extension (`WKExtensionDelegate` / recovery handler).
6. Spójrz na iOS/Android marketing version: wyprowadzaj z `package.json`/release tagu i waliduj w preflight.

**Testy obowiązkowe:** emulator/staging AI URL; upstream abort po disconnect; 1k-user reminder test double z limitem concurrency; Watch fail/restart/ack; test wersji artefaktów; ręczny test watchOS recovery na urządzeniu.

### M6 — wydajność i skalowanie

**Cel:** wzrost historii użytkownika i liczby kont nie degraduje startu ani nie powoduje nieograniczonych kosztów.

1. Rozdziel `useFirebaseWorkouts` na współdzielony read store i write actions. Ekrany mają pobierać tylko potrzebny zakres; historia/analytics są stronicowane.
2. Strava UI pobiera okres/paginę, nie całą historię aktywności. Globalne statystyki korzystają z agregatów.
3. Admin dashboard używa paginacji i backendowych agregatów zamiast globalnych realtime listenerów.
4. Zastąp polling IndexedDB co 2 s stanem synchronizacji opartym o provider/eventy.
5. Ogranicz eager bundle: lazy-load ciężkie chart/Strava moduly i mierz rozmiar/TTI.

**Akceptacja:** emulatorowe fixture 1k–5k workouts i 10k Strava activities; udokumentowany limit listenerów; brak okresowych odczytów IndexedDB w bezczynności; budżet rozmiaru bundle ustalony i monitorowany.

### M7 — release engineering i obserwowalność

**Cel:** wydanie nie może przejść z brakującą konfiguracją lub starym backendem.

1. Dodaj chroniony Firebase deploy job dla `functions, firestore:rules, firestore:indexes, storage`; zapisuj revision/checksum wdrożonych artefaktów.
2. Dodaj `functions.predeploy` build/typecheck/test. Nigdy nie wdrażaj śledzonego, potencjalnie starego `functions/lib` bez świeżej kompilacji.
3. Waliduj wymagane Firebase env dla każdego produkcyjnego builda, nie tylko mobile mode.
4. Mobile release preflight wymaga RevenueCat Apple key; brak klucza ma failować przed archiwizacją, zamiast zostawiać użytkownika na paywallu.
5. Dodaj alerty/metryki: konflikty synchronizacji, failed final sync, stale drafts, webhook drops, FCM send failures, partial deletion jobs i błędy streamu AI.

**Akceptacja:** build bez dowolnego wymaganego env kończy się błędem; standardowy deploy buduje Functions; release job deployuje wszystkie kontrakty Firebase; sandbox purchase smoke przechodzi.

## Definicja „gotowe do release”

Wydanie jest gotowe dopiero, gdy:

- wszystkie punkty M1–M4 są wdrożone i mają testy regresyjne;
- `typecheck`, lint, root/Functions tests, Firestore rules tests, mock E2E i emulator E2E są zielone;
- iOS simulator smoke i WebKit smoke są zielone dla zmienionych flow;
- build web, mobile i Functions przechodzą z pełną walidacją env;
- testy konfliktów, offline promotion i nieukończonych workoutów potwierdzają zachowanie;
- deploy pipeline ma potwierdzony Firebase artifact revision;
- otwarte ryzyka z M5/M6 są albo rozwiązane, albo jawnie wpisane do release exception z właścicielem i terminem.

## Poza zakresem tego planu

Nowe funkcje, redesign, zmiana cennika, migracja bazy danych bez potrzeby wynikającej z powyższych fixów i produkcyjne deploye. Nie należy ich dołączać do tych napraw.

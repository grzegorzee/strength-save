# Retrospektywa serii release-readiness — 2026-06-27

## Zakres

Dokument zapisuje wnioski z realizacji M0–M7, napraw synchronizacji i statystyk
cyklu, wdrożenia Firebase oraz publikacji builda iOS do TestFlight.

Nie zastępuje checklisty
`PLAN_WDROZENIA_RELEASE_READINESS_2026-06-24.md`. Otwarte checkboxy w tamtym
planie pozostają otwarte do czasu uzyskania odpowiadających im dowodów.

## Stan faktyczny po tej serii

- Zmiany release-readiness są w commicie `1aede0f` (`main`, `origin/main`).
- Functions, Firestore Rules/Indexes i Storage Rules zostały wdrożone do projektu
  `fittracker-workouts`.
- Do App Store Connect wysłano build `6.12.0 (43)`. Apple oznaczyło artefakt jako
  `VALID`; build został przypisany do grup testerów, a zewnętrzna beta oczekuje na
  review.
- Wersja marketingowa `6.12.0` była spójna pomiędzy `package.json`,
  `Info.plist` i ustawieniami targetów Xcode, ale nie była zamierzoną wersją
  produktu. Oczekiwana wersja iOS to `1.0.1`.
- Poprawny następny artefakt powinien mieć wersję `1.0.1` i build number większy
  niż `43`, czyli co najmniej `1.0.1 (44)`. Numeru builda nie wolno cofać.
- Nie wykonano ręcznej modyfikacji danych konta użytkownika w produkcji.
  Wdrożono mechanizmy naprawiające retry/finalizację synchronizacji i obliczanie
  opuszczonych sesji; skuteczność dla istniejącego lokalnego draftu musi zostać
  potwierdzona na urządzeniu po instalacji poprawnego builda.

## Co zadziałało

1. Błędy synchronizacji zostały potraktowane jako problem integralności danych,
   a nie tylko komunikatu UI. Naprawa objęła revision, stabilny payload retry,
   promocję draftu lokalnego do zdalnego oraz ochronę przed spóźnionym ACK.
2. Fałszywe „opuszczone treningi” zostały powiązane z kalendarzowym wyliczaniem
   oczekiwanych sesji cyklu, datą startu i DST, zamiast prostego mnożenia liczby
   tygodni.
3. Krytyczne testy backendowe zostały oddzielone od testów z zamockowanym
   backendem. Emulator E2E i Rules stanowią osobne bramki.
4. Wdrożenie Firebase wykonano dopiero po jawnej zgodzie i ze świeżym buildem
   Functions.
5. App Store Connect API pozwoliło potwierdzić stan artefaktu, przypisanie do
   grup oraz stan Beta App Review zamiast opierać się wyłącznie na widoku
   aplikacji TestFlight.

## Co poszło źle

### 1. Preflight sprawdzał spójność, ale nie intencję wydania

`scripts/release-ios-preflight.mjs` potwierdził wyłącznie, że wszystkie źródła
zawierają tę samą wartość. Wszystkie zgodnie zawierały błędne `6.12.0`, więc
kontrola przeszła.

Wniosek: spójna wartość nie jest dowodem, że jest to właściwa wersja produktu.
Preflight musi porównywać artefakt z jawnym kontraktem bieżącego release, np.
`RELEASE_MARKETING_VERSION=1.0.1`, zatwierdzonym manifestem release albo tagiem.

### 2. Pomieszano dwa niezależne numery Apple

- `CFBundleShortVersionString` / `MARKETING_VERSION` oznacza wersję widoczną dla
  użytkownika, np. `1.0.1`.
- `CFBundleVersion` / `CURRENT_PROJECT_VERSION` oznacza rosnący numer builda,
  np. `44`.

Wniosek: bump samego build number nie może być traktowany jako kompletne
wersjonowanie wydania. Raport przed archiwizacją musi zawsze pokazać pełną parę,
np. `1.0.1 (44)`, i wymagać jej jawnego potwierdzenia w kontrakcie release.

### 3. Zielone M0–M7 nie oznaczały automatycznie „release-ready”

Fazy implementacyjne zostały oznaczone jako wykonane, ale końcowa checklista
nadal zawiera otwarte pozycje: brak P0/P1, pełna walidacja env, manualny
iPhone/Watch smoke, sandbox purchase, potwierdzona revision wdrożenia i decyzje
migracyjne.

Wniosek: status fazy implementacyjnej i decyzja o wydaniu to dwa różne stany.
Nie wolno raportować „wszystkie M zakończone” jako synonimu „release-ready”, gdy
końcowa checklista zawiera otwarte bramki.

### 4. Upload do TestFlight nie oznacza widoczności dla użytkownika

Po uploadzie występują osobne stany: processing, `VALID`, przypisanie do grupy,
Beta App Review oraz propagacja w aplikacji TestFlight. Dodatkowo użytkownik
może być zalogowany innym Apple ID niż tester przypisany do grupy.

Wniosek: wydanie TestFlight kończy dopiero raport zawierający:

- wersję marketingową i build number;
- processing state;
- grupy testerów;
- stan Beta App Review;
- tester Apple ID w formie zanonimizowanej;
- informację, czy stary build został pozostawiony, wygaszony czy zastąpiony.

### 5. Wyjątek RevenueCat został potraktowany operacyjnie, a nie formalnie

Właściciel zaakceptował pominięcie `VITE_REVENUECAT_APPLE_API_KEY`, ponieważ
aplikacji używa obecnie jedna osoba. Jest to świadomy release exception, a nie
dowód przejścia pełnego preflightu zakupowego.

Wniosek: wyjątek musi być zapisany z zakresem i terminem wygaśnięcia. Nie wolno
jednocześnie raportować sandbox purchase ani pełnej walidacji env jako
potwierdzonych.

### 6. Skrypt release zawiera nieaktualne założenia

Komentarz w `scripts/release-ios.sh` mówi o dwóch wystąpieniach
`CURRENT_PROJECT_VERSION`, podczas gdy projekt zawiera ich sześć. Skrypty
dodające targety Watch nadal zawierają historyczne wersje `0.0.1`.

Wniosek: liczba wystąpień nie może być zaszyta w instrukcji. Narzędzie powinno
wykrywać wszystkie konfiguracje/targety, odrzucać rozbieżności i drukować
macierz target → marketing version → build number.

## Obowiązkowe zabezpieczenia dla kolejnego release

1. Utworzyć jeden jawny manifest bieżącego wydania iOS z polami
   `marketingVersion`, `buildNumber`, `gitSha` oraz `releaseException`.
2. Przed archiwizacją wyświetlić i zweryfikować pełną parę wersji dla każdego
   targetu: App, Watch App, Watch Extension i Widget.
3. Pobrać najwyższy build number z App Store Connect i wymusić
   `newBuildNumber > latestBuildNumber`.
4. Rozszerzyć preflight o porównanie z manifestem/tagiem release, nie tylko o
   zgodność z `package.json`.
5. Po uploadzie odpytać App Store Connect i sprawdzić dokładnie oczekiwane
   `marketingVersion`, `buildNumber`, stan `VALID` i przypisanie do grup.
6. Nie wygaszać poprzedniego builda automatycznie bez jawnej decyzji. Wyjątkiem
   jest wcześniej uzgodnione zastąpienie błędnego artefaktu.
7. Nie zamykać końcowej checklisty M7 bez artifact revision/checksum i ręcznego
   smoke na urządzeniu.
8. Dla błędu zależnego od danych użytkownika zapisać osobno:
   naprawę kodu, migrację/naprawę istniejących danych oraz dowód z urządzenia.

## Otwarte działania po retrospektywie

- [ ] Zmienić marketing version wszystkich targetów na `1.0.1`.
- [ ] Ustawić następny build number na co najmniej `44`.
- [ ] Wzmocnić preflight o jawny kontrakt wersji release.
- [ ] Zbudować i wysłać do TestFlight artefakt `1.0.1 (44)` lub nowszy.
- [ ] Potwierdzić na fizycznym iPhonie finalizację oczekującej sesji i zniknięcie
  komunikatu Sync Center.
- [ ] Potwierdzić na danych bieżącego cyklu, że liczba opuszczonych sesji wynosi
  `0`.
- [ ] Formalnie zamknąć lub przedłużyć wyjątek RevenueCat.
- [ ] Uzupełnić dowód artifact revision/checksum Firebase w końcowej checkliście.


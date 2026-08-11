# Przełożenie treningu + krok marketingowy w onboardingu (spec)

Data: 2026-08-11 · Status: zatwierdzony przez usera (czat, wieczór) · Zakres: web + functions + rules + iOS + Android (Watch i Garmin przez kontrakty, bez zmian ich kodu)

Motywacja usera: "dzisiaj nie byłem na treningu, chcę go zrobić jutro" (wzorzec Runna: przeciągnięcie treningu na inny dzień w kalendarzu) oraz dedykowany, ładny krok zgody marketingowej w onboardingu (wzorzec Runna "Be the first to know") zamiast czwartego checkboxa na jednym ekranie zgód.

---

## FEATURE A: Przełożenie treningu na inny dzień

### Cel

User przenosi zaplanowany trening z jego domyślnej daty na inną datę. Po przeniesieniu WSZYSTKIE powierzchnie (Dashboard, WorkoutDay, podgląd Watch, `garminDay` dla zegarka Garmin) pokazują trening w nowym dniu. Historia sesji, drafty i definicje dni pozostają nietknięte.

### Model danych: jedno źródło prawdy

Nowe pole na dokumencie planu usera (tam gdzie dziś żyją dni planu; agent weryfikuje dokładną ścieżkę w kodzie):

```
scheduleOverrides: Record<dateISO, dayId | null>
```

- Klucz: konkretna data `YYYY-MM-DD`. Wartość: `dayId` który ma obowiązywać tego dnia, albo `null` (tego dnia nic, bo domyślny trening przeniesiono).
- Przeniesienie z daty A na datę B to JEDEN atomowy zapis: `{A: null, B: dayId}`.
- Kolizja (B ma już swój trening): SWAP, czyli `{A: dayIdB, B: dayIdA}`. Symetryczny i odwracalny, zero utraty danych.
- Override dotyczy KONKRETNEJ daty, nie weekday: kolejne tygodnie i cykle bez zmian.
- Pruning przy każdym zapisie: wpisy z datą starszą niż 28 dni wylatują (dokument nie rośnie bez końca).

### Kanoniczny resolver (kontrakt między serwisami)

Czysta funkcja `resolvePlannedDay(dateISO, planDays, scheduleOverrides)`:

1. Jest wpis w `scheduleOverrides[dateISO]`: użyj go (`null` = dzień wolny; nieistniejący `dayId` = ignoruj wpis i spadnij do reguły 2, odporność na osierocone wpisy po zmianie planu).
2. Brak wpisu: dotychczasowa reguła po `weekday`.

Resolver żyje w JEDNYM module web (używają go Dashboard, WorkoutDay, useWatchPlanPreview) i ma LUSTRZANĄ kopię w `functions/src/garmin-day.ts` (dziś linia ~276: `planDays.find(d => d.weekday === weekday)`). Zgodności pilnuje test parity na WSPÓLNYM fixture (wzorzec `cross-platform-contract-fixture.test.ts`): ta sama tabela przypadków przechodzi przez resolver webowy i funkcyjny, wyniki identyczne.

### Niezmiennik (zasada #5 z CLAUDE.md)

Przeniesienie zmienia WYŁĄCZNIE mapowanie data → dzień dla przyszłych dat. Nie dotyka: historii sesji (ukończony trening zostaje przy dacie wykonania), draftów w toku, listy ćwiczeń dnia, progresji, cykli (elapsed-based), id dni cyklu (niezmiennik X19).

### UI: punkty wejścia (v1 bez drag&drop, świadomie)

Drag&drop jak w Runnie NIE wchodzi w v1: touch DnD w WKWebView to wysokie ryzyko regresji scrolla i gestów (lekcje background/resume z CLAUDE.md). Te same możliwości dają tapnięcia:

1. **Karta dnia** (Dashboard, widok tygodnia): akcja "Przełóż trening" (menu karty albo ikona) otwiera bottom sheet z listą najbliższych 14 dni; każdy wiersz pokazuje datę, dzień tygodnia i zajętość ("wolne" / nazwa treningu, który tam siedzi, z dopiskiem "zamieni się miejscami"). Wybór = zapis + toast z cofnięciem? NIE: bez undo-toastu w v1, cofnięcie = ponowne przełożenie (mniej stanów).
2. **Baner niezrobionego treningu**: jeśli ostatni planowany dzień minął bez ukończonej sesji, Dashboard pokazuje pasek "Trening X z [data] niezrobiony" z CTA [Zrób dziś] (przenosi na dziś) i [Przełóż] (otwiera sheet). Pasek znika po przeniesieniu, ukończeniu albo jawnym odrzuceniu (krzyżyk = zapamiętane odrzucenie dla tej daty, reguła #6: stan ma wyjście).
3. **Wejście w dzień**: WorkoutDay na dacie z overridem pokazuje przełożony trening normalnie (przez resolver), bez specjalnych ścieżek.

### Przypadki brzegowe (każdy z testem)

1. Kolizja dat: swap obu dni, komunikat w sheet przed zapisem.
2. Żywy draft dnia źródłowego: przełożenie ZABLOKOWANE (komunikat "najpierw dokończ albo odrzuć rozpoczęty trening"). Draft nigdy nie może wskazywać dnia, który "zniknął" ze swojej daty.
3. Trening ukończony w dacie źródłowej: akcja przełożenia niedostępna (nie ma czego przenosić).
4. Kierunek: tylko na dziś i do przodu (horyzont 14 dni). Nie do tyłu.
5. Granica tygodnia/cyklu: przeniesienie na datę w następnym tygodniu nie zmienia numeru tygodnia, progresji ani deloadu; test sekwencji przez granicę.
6. Dwa urządzenia: pole jedzie istniejącym mechanizmem zapisu planu (LWW, offline: localStorage/kolejka jak reszta planu).
7. Zmiana albo reset planu: `scheduleOverrides` czyszczone razem z planem; resolver i tak ignoruje osierocone `dayId`.
8. Sekwencja pełna (obowiązkowy test przerwań z CLAUDE.md): plan → przełóż jutrzejszy dzień na dziś → start treningu → wyjście → szybki trening → powrót → dokończenie → sync; wszystkie ćwiczenia na miejscu, historia z datą wykonania.
9. e2e-mock: hak seeda (`fittracker_e2e_*`) umie ustawić overrides; niezmiennik align id dni (X19) utrzymany także z overrides.

### Serwisy

- **Web**: resolver, UI, zapis, testy.
- **functions**: `garmin-day.ts` czyta `scheduleOverrides` z dokumentu planu i stosuje ten sam resolver; testy w `garmin-day.test.ts` + parity fixture. Aplikacja CIQ na zegarku: ZERO zmian (protokół `garminDay` bez zmian, zegarek dostaje po prostu właściwy dzień).
- **Watch (iOS)**: `useWatchPlanPreview` liczy po stronie telefonu, więc dostaje override przez wspólny resolver; test w `watch-plan-preview.test.tsx`. Zero zmian w Swift.
- **firestore.rules**: dokument planu ma `hasOnly` na kluczach; dopisać `scheduleOverrides` + walidacja kształtu (mapa, klucze YYYY-MM-DD, wartości string|null) + testy rules (`test:rules`, JDK21).

---

## FEATURE B: Dedykowany krok marketingowy w onboardingu

### Cel

Zgoda marketingowa wychodzi z ekranu checkboxów (dziś 4 na jednym ekranie w `ConsentCheckboxes`) na własny krok w stylu Runna: nagłówek ("Bądź pierwszy w kolejce" / "Be the first to know"), 1-2 zdania korzyści (nowe funkcje, materiały treningowe, zniżki), wizual: mock karty powiadomienia zbudowany w HTML/CSS w stylu apki (ZERO nowych assetów binarnych), przyciski [Jasne, wchodzę!] (primary) i [Nie, dzięki] (ghost). Ekran zgód prawnych zostaje z 3 wymaganymi checkboxami.

### Zasady twarde (RODO + consent engine, nie negocjowalne)

1. Zapis przez ISTNIEJĄCY `recordConsent`: typ `marketing`, `granted`/`declined`, ta sama wersja dokumentu co dziś, kanał odróżnialny w logu (np. `onboarding-marketing-step`). ODMOWA też trafia do logu (dowód rozliczalności).
2. Krok NIE blokuje onboardingu: obie ścieżki idą dalej. Systemowy "wstecz" wraca do poprzedniego kroku BEZ zapisu; zapis wyłącznie przy jawnym wyborze jednego z dwóch przycisków.
3. Zero dark patterns: "Nie, dzięki" widoczne od razu (bez scrolla), bez wymuszonego opóźnienia, bez pre-selekcji. Copy bez ściemy: żadnych zmyślonych zniżek ani fałszywych liczb (tylko_fakty).
4. `ConsentCheckboxes` jest używany w 3 miejscach (onboarding/PlanWizard, ConsentGate, ConsentSettings): usunięcie checkboxa marketingowego wyłącznie w wariancie onboardingu (parametr/prop), Gate i Settings BEZ zmian zachowania. ConsentSettings nadal pozwala włączyć/wyłączyć marketing w obie strony (reguła #6).
5. ConsentGate (re-consent istniejących userów) NIE pokazuje nowego kroku: marketing jest opcjonalny, jego brak nie wymusza re-consentu.
6. Pozycja kroku: po krokach konfiguracji planu, przedostatni przed ekranem zgód prawnych (user widział już wartość apki; dokładny indeks wg realnej struktury `Onboarding.tsx`, user sugerował okolice kroku 2, decyzja finalna po odczycie struktury: ma być SPÓJNIE z istniejącym flow, bez rozbijania kroków wymaganych).
7. i18n: wszystkie teksty w OBU plikach (`pl.ts`, `en.ts`).
8. e2e: seedowani userzy omijają krok tak samo jak resztę zgód (`VITE_E2E_MODE`).

### Przypadki brzegowe (każdy z testem)

1. [Jasne, wchodzę!] → `recordConsent(marketing, granted)` + mirror w profilu; onboarding idzie dalej.
2. [Nie, dzięki] → `recordConsent(marketing, declined)`; onboarding idzie dalej; user NIGDY więcej nie widzi tego kroku (odpowiedź zapamiętana).
3. Wstecz z kroku → brak zapisu, powrót na krok, wybór nadal wymagany przy przejściu w przód.
4. Awaria zapisu zgody (offline): wybór nie ginie, zapis ponawiany jak w istniejącym mechanizmie zgód z onboardingu (agent weryfikuje jak dziś robi to krok Welcome i robi TAK SAMO); onboarding się nie wywraca.
5. Ekran zgód prawnych w onboardingu ma DOKŁADNIE 3 checkboxy; ConsentGate i ConsentSettings: istniejące testy zielone bez modyfikacji ich asercji (regres = stop).
6. Parity wersji dokumentów web↔functions bez zmian (istniejący test).

---

## Bramki i wdrożenie (WSZYSTKIE serwisy, pre-autoryzowane)

User zatwierdził deploy z góry w sesji planowania 2026-08-11 ("zaplanuj razem z testami i wdrożeniem na wszystkie serwisy"). Kolejność wdrożenia po zielonych bramkach:

1. `firestore.rules` (deploy rules) — najpierw, żeby klienci mogli pisać nowe pole.
2. functions: `garminDay` (deploy funkcji).
3. Web: `npm run deploy` + weryfikacja live hash.
4. iOS: pgrep (brak równoległego release), bump `CURRENT_PROJECT_VERSION` ODCZYTANY z pbxproj (+1; spodziewany 92), `scripts/release-ios.sh` (robi też auto-dystrybucję obu grup + Beta App Review).
5. Android: bump `versionCode` (+1; spodziewany 8), `build:mobile` + `cap sync android` + `gradlew bundleRelease`, weryfikacja `jar verified` + SHA-256. Upload do Play Console POZA zakresem (konto czeka na weryfikację Google).
6. Watch: jedzie w archiwum iOS; Garmin CIQ: zero zmian, dzień naprawia się po stronie `garminDay`.

Bramki przed deployem: `npm run test`, `typecheck`, `lint`, `build`, `build:mobile` + `check:dist-smoke`, testy functions, `test:rules`, `e2e:mock`. Testy urządzeniowe usera po wydaniu: scenariusz przełożenia (pkt 8 z brzegowych) + przejście onboardingu na TestFlight.

## Poza zakresem

- Drag&drop kalendarza (v2, po walidacji v1).
- Widok pełnego kalendarza tygodni jak w Runnie (dziś wystarczą istniejące powierzchnie).
- Jakiekolwiek maile marketingowe (krok zbiera zgodę; wysyłka to osobny projekt).
- Upload AAB do Play (blokada po stronie Google).
